import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Vector3, PerspectiveCamera } from "three";
import type { Business, VenueAsset } from "./types";
import { useT } from "./i18n";
import { readSceneColors } from "./sceneTokens";
import { Projector, type ScreenPoints } from "./SceneAnchors";

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
// Fit sets the orbit target and size-based zoom limits through this ref.
type Orbit = ComponentRef<typeof OrbitControls>;
function Fit({
  asset,
  resetKey,
  orbit,
}: {
  asset: VenueAsset;
  resetKey: number;
  orbit: RefObject<Orbit | null>;
}) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const c = camera as PerspectiveCamera,
      target = new Vector3(...asset.camera_target),
      min = new Vector3(...asset.bounds_min),
      max = new Vector3(...asset.bounds_max);
    // Fit the eight bounds corners into both view axes along the manifest direction.
    // A bounding sphere left wide, low venues at about a third of the frame.
    const toCamera = new Vector3(...asset.camera_position)
      .sub(target)
      .normalize();
    const right = new Vector3(0, 1, 0).cross(toCamera).normalize();
    const up = toCamera.clone().cross(right).normalize();
    const tanV = Math.tan((c.fov * Math.PI) / 360);
    const tanH = (tanV * size.width) / Math.max(size.height, 1);
    let distance = 0;
    for (const x of [min.x, max.x])
      for (const y of [min.y, max.y])
        for (const z of [min.z, max.z]) {
          const v = new Vector3(x, y, z).sub(target);
          const depthOffset = v.dot(toCamera);
          distance = Math.max(
            distance,
            depthOffset + Math.abs(v.dot(right)) / tanH,
            depthOffset + Math.abs(v.dot(up)) / tanV,
          );
        }
    c.position.copy(
      toCamera
        .clone()
        .multiplyScalar(distance * 1.12)
        .add(target),
    );
    c.lookAt(target);
    c.updateProjectionMatrix();
    const controls = orbit.current;
    if (controls) {
      // Zoom limits follow the venue size instead of fixed metres.
      controls.target.copy(target);
      controls.minDistance = distance * 0.35;
      controls.maxDistance = distance * 1.6;
      controls.update();
    }
    invalidate();
  }, [asset, camera, orbit, resetKey, size.width, size.height, invalidate]);
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
    [enabled, setEnabled] = useState(false),
    [resetKey, setResetKey] = useState(0),
    [colors] = useState(readSceneColors),
    orbit = useRef<Orbit>(null),
    [screen, setScreen] = useState<ScreenPoints>({});
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
  // A mismatched marker is omitted, never redirected to a different shop.
  const markers = asset.hotspots.flatMap((h) => {
    const b = businesses.find(
      (b) => b.id === h.business_id && b.slug === h.business_slug,
    );
    return b ? [{ ...h, name: b.name }] : [];
  });
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
              <color attach="background" args={[colors.sky]} />
              <ambientLight intensity={0.7} />
              <hemisphereLight args={[colors.paper, colors.bounce, 1.2]} />
              <directionalLight position={[30, 70, 50]} intensity={2} />
              <Suspense fallback={null}>
                <Model asset={asset} />
              </Suspense>
              <OrbitControls
                ref={orbit}
                target={asset.camera_target}
                enabled={enabled}
                enablePan={false}
                maxPolarAngle={Math.PI / 2 - 0.04}
              />
              <Fit asset={asset} resetKey={resetKey} orbit={orbit} />
              <Projector
                anchors={markers.map((h) => ({
                  id: h.id,
                  position: h.position,
                }))}
                onChange={setScreen}
              />
            </Canvas>
            <div className="scene-anchors">
              {markers.map((h) => {
                const point = screen[h.id];
                if (!point?.visible) return null;
                const active =
                  selectedId === h.business_slug || hoverId === h.business_slug;
                return (
                  <span
                    key={h.id}
                    className="hotspot-wrap"
                    style={{ left: point.x, top: point.y }}
                  >
                    <button
                      className="hotspot"
                      aria-label={h.name}
                      title={h.name}
                      aria-pressed={active}
                      data-hotspot={h.business_slug}
                      onClick={() => onSelect(h.business_slug)}
                    >
                      {asset.hotspots.findIndex((m) => m.id === h.id) + 1}
                    </button>
                    {active && (
                      <span className="hotspot-label" aria-hidden="true">
                        {h.name}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            <div className="scene-bar">
              <button onClick={() => setEnabled((v) => !v)}>
                {t(enabled ? "disable_3d" : "enable_3d")}
              </button>
              <button onClick={() => setResetKey((k) => k + 1)}>
                {t("overview")}
              </button>
            </div>
          </div>
        )}
      </Boundary>
      <span className="badge badge--warn">{t("conceptual")}</span>
    </>
  );
}
