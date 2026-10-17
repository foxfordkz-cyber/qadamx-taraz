import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Vector3, PerspectiveCamera } from "three";
import type { Business, VenueAsset } from "./types";
import { resolveHotspots } from "./hotspots";
import { useT } from "./i18n";

class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function Model({ asset }: { asset: VenueAsset }) {
  const { scene } = useGLTF(asset.model_url);
  return <primitive object={scene} />;
}
function Fit({ asset }: { asset: VenueAsset }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const c = camera as PerspectiveCamera,
      target = new Vector3(...asset.camera_target),
      min = new Vector3(...asset.bounds_min),
      max = new Vector3(...asset.bounds_max);
    let radius = 0;
    for (const x of [min.x, max.x])
      for (const y of [min.y, max.y])
        for (const z of [min.z, max.z])
          radius = Math.max(radius, new Vector3(x, y, z).distanceTo(target));
    const half = Math.min(
      (c.fov * Math.PI) / 360,
      Math.atan((Math.tan((c.fov * Math.PI) / 360) * size.width) / size.height),
    );
    c.position.copy(
      new Vector3(...asset.camera_position)
        .sub(target)
        .normalize()
        .multiplyScalar((radius / Math.sin(half)) * 1.08)
        .add(target),
    );
    c.lookAt(target);
    c.updateProjectionMatrix();
    invalidate();
  }, [asset, camera, size.width, size.height, invalidate]);
  return null;
}
export default function VenueScene({
  asset,
  businesses,
  selectedId,
  hoverId,
  onSelect,
}: {
  asset?: VenueAsset;
  businesses: Business[];
  selectedId?: string | null;
  hoverId?: string | null;
  onSelect: (slug: string) => void;
}) {
  const { t } = useT(),
    [lost, setLost] = useState(false),
    [enabled, setEnabled] = useState(false);
  const [supported] = useState(() => {
    try {
      const c = document.createElement("canvas"),
        gl = c.getContext("webgl2");
      if (!gl) return false;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  });
  if (!asset) return <p role="status">{t("scene_off")}</p>;
  const markers = resolveHotspots(asset, businesses);
  const fallback = (
    <div className="venue-fallback">
      <img
        className="venue-poster"
        src={asset.poster_url}
        alt={t("conceptual")}
      />
      <p role="status">{t("scene_off")}</p>
    </div>
  );
  return (
    <>
      <Boundary fallback={fallback}>
        {!supported || lost ? (
          fallback
        ) : (
          <div className={`scene${enabled ? "" : " scene--locked"}`}>
            <Canvas
              frameloop="demand"
              dpr={[1, 1.5]}
              camera={{ fov: asset.camera_fov_degrees, near: 0.1, far: 2000 }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener(
                  "webglcontextlost",
                  () => setLost(true),
                  { once: true },
                );
              }}
            >
              <color attach="background" args={["#dfeceb"]} />
              <ambientLight intensity={1.6} />
              <directionalLight position={[30, 70, 50]} intensity={2.3} />
              <Suspense fallback={null}>
                <Model asset={asset} />
              </Suspense>
              <Fit asset={asset} />
              <OrbitControls
                target={asset.camera_target}
                enabled={enabled}
                enablePan={false}
                minDistance={20}
                maxDistance={400}
                maxPolarAngle={Math.PI / 2 - 0.04}
              />
              {markers.map((h) => (
                <Html key={h.id} position={h.position} center>
                  <button
                    className="hotspot"
                    aria-label={h.name}
                    title={h.name}
                    aria-pressed={
                      selectedId === h.business_slug ||
                      hoverId === h.business_slug
                    }
                    data-hotspot={h.business_slug}
                    onClick={() => onSelect(h.business_slug)}
                  >
                    {asset.hotspots.findIndex((marker) => marker.id === h.id) +
                      1}
                  </button>
                </Html>
              ))}
            </Canvas>
            <div className="scene-bar">
              <button onClick={() => setEnabled((v) => !v)}>
                {t(enabled ? "disable_3d" : "enable_3d")}
              </button>
            </div>
          </div>
        )}
      </Boundary>
      <span className="badge badge--warn">{t("conceptual")}</span>
    </>
  );
}
