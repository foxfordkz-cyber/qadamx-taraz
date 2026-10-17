import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import { useT } from "./i18n";
import type { Block } from "./layout";
import { readSceneColors, type SceneColors } from "./sceneTokens";
import { Projector, type ScreenPoints } from "./SceneAnchors";

type Props = {
  blocks: Block[];
  selectedId?: string | null; // камера фокусируется на нём
  hoverId?: string | null; // только подсветка
  onSelect: (id: string) => void;
  modelUrl?: string | null; // подробная GLB, грузится только когда передан
};

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

class Boundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// Venue identity tints from the team's reference-based models (assets/venues/README.md).
const TINT: Record<string, { body: string; accent: string; roof: string }> = {
  mart: { body: "#9a5a43", accent: "#6f3a2b", roof: "#e6e2d6" },
  kaikarmet: { body: "#4f7fae", accent: "#2f5a86", roof: "#d6ddd8" },
  "auyl-bereke": { body: "#e4ddc9", accent: "#3f6b5a", roof: "#a9bcae" },
};
const FALLBACK_TINT = { body: "#b8c5b6", accent: "#5f8053", roof: "#e6e2d6" };

type Part = {
  p: [number, number, number];
  s: [number, number, number];
  c: "body" | "accent" | "roof";
};

// Recognisable silhouettes from a few boxes; proportions come from the manifest bounds.
function parts(id: string, w: number, d: number, h: number): Part[] {
  if (id === "mart")
    return [
      {
        p: [0.08 * w, 0.32 * h, 0],
        s: [0.84 * w, 0.64 * h, 0.8 * d],
        c: "body",
      },
      {
        p: [-0.36 * w, 0.5 * h, 0.06 * d],
        s: [0.2 * w, h, 0.72 * d],
        c: "accent",
      },
      {
        p: [0.08 * w, 0.66 * h, 0],
        s: [0.86 * w, 0.06 * h, 0.82 * d],
        c: "roof",
      },
    ];
  if (id === "kaikarmet")
    return [
      { p: [0, 0.22 * h, 0.22 * d], s: [w, 0.44 * h, 0.42 * d], c: "body" },
      { p: [0, 0.47 * h, 0.22 * d], s: [w, 0.06 * h, 0.44 * d], c: "accent" },
      { p: [0, 0.3 * h, -0.2 * d], s: [0.8 * w, 0.6 * h, 0.5 * d], c: "roof" },
    ];
  if (id === "auyl-bereke")
    return [
      {
        p: [-0.42 * w, 0.42 * h, 0.36 * d],
        s: [0.06 * w, 0.84 * h, 0.08 * d],
        c: "body",
      },
      {
        p: [-0.18 * w, 0.42 * h, 0.36 * d],
        s: [0.06 * w, 0.84 * h, 0.08 * d],
        c: "body",
      },
      {
        p: [-0.3 * w, 0.88 * h, 0.36 * d],
        s: [0.32 * w, 0.1 * h, 0.1 * d],
        c: "accent",
      },
      {
        p: [0.28 * w, 0.36 * h, 0.12 * d],
        s: [0.44 * w, 0.72 * h, 0.5 * d],
        c: "body",
      },
      {
        p: [-0.1 * w, 0.14 * h, -0.28 * d],
        s: [0.8 * w, 0.28 * h, 0.12 * d],
        c: "roof",
      },
      {
        p: [-0.1 * w, 0.14 * h, -0.08 * d],
        s: [0.8 * w, 0.28 * h, 0.12 * d],
        c: "roof",
      },
    ];
  return [{ p: [0, h / 2, 0], s: [w, h, d], c: "body" }];
}

function BlockMesh({
  b,
  active,
  colors,
  onSelect,
}: {
  b: Block;
  active: boolean;
  colors: SceneColors;
  onSelect: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  const tint = TINT[b.id] ?? FALLBACK_TINT;
  const lifted = active || hover;
  return (
    <group
      position={[b.x, 0, b.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(b.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
    >
      {/* Plinth marks the plot; it turns lime for the selected or hovered venue. */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[b.w + 0.7, 0.06, b.d + 0.7]} />
        <meshStandardMaterial color={lifted ? colors.selected : colors.plot} />
      </mesh>
      {parts(b.id, b.w, b.d, b.h).map((part, i) => (
        <mesh key={i} position={[part.p[0], part.p[1] + 0.06, part.p[2]]}>
          <boxGeometry args={part.s} />
          <meshStandardMaterial color={tint[part.c]} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

type Orbit = ComponentRef<typeof OrbitControls>;
// Closer overview than before so the three silhouettes read at phone width.
const OVERVIEW: [number, number, number] = [0, 8, 12.5];

// Плавная камера; при reduced motion — мгновенно. Рендер по требованию: invalidate только пока едем.
function Rig({
  focus,
  reduced,
  orbit,
}: {
  focus: THREE.Vector3 | null;
  reduced: boolean;
  orbit: RefObject<Orbit | null>;
}) {
  const { camera, invalidate } = useThree();
  const goal = useRef({
    pos: new THREE.Vector3(...OVERVIEW),
    tgt: new THREE.Vector3(),
  });
  const moving = useRef(false);
  const key = focus ? `${focus.x},${focus.z}` : "";

  useEffect(() => {
    const c = orbit.current;
    if (!c) return;
    const t = focus ? focus.clone() : new THREE.Vector3();
    goal.current.tgt.copy(t);
    goal.current.pos
      .copy(t)
      .add(focus ? new THREE.Vector3(5, 5, 7) : new THREE.Vector3(...OVERVIEW));
    if (reduced) {
      camera.position.copy(goal.current.pos);
      c.target.copy(t);
      c.update();
      invalidate();
    } else {
      moving.current = true;
      invalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  useFrame((_, dt) => {
    const c = orbit.current;
    if (!moving.current || !c) return;
    const k = 1 - Math.pow(0.001, dt);
    camera.position.lerp(goal.current.pos, k);
    c.target.lerp(goal.current.tgt, k);
    c.update();
    if (camera.position.distanceTo(goal.current.pos) < 0.02)
      moving.current = false;
    else invalidate();
  });
  return null;
}

export default function Scene({
  blocks,
  selectedId,
  hoverId,
  onSelect,
  modelUrl,
}: Props) {
  const { t } = useT();
  const reduced = useMemo(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const coarse = useMemo(() => matchMedia("(pointer: coarse)").matches, []);
  const [gl] = useState(hasWebGL);
  const [overview, setOverview] = useState(true);
  const [touchOn, setTouchOn] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const [colors] = useState(readSceneColors);
  const orbit = useRef<Orbit>(null);
  const [labels, setLabels] = useState<ScreenPoints>({});
  const anchors = useMemo(
    () =>
      blocks.map((b) => ({
        id: b.id,
        position: [b.x, b.h + 0.9, b.z] as [number, number, number],
      })),
    [blocks],
  );

  const sel = blocks.find((b) => b.id === selectedId);
  const focus = useMemo(
    () => (sel ? new THREE.Vector3(sel.x, sel.h / 2, sel.z) : null),
    [sel],
  );
  const cameraFocus = overview ? null : focus;

  useEffect(() => {
    if (selectedId) setOverview(false);
  }, [selectedId]);

  if (!gl)
    return (
      <p className="scene-note" role="status">
        {t("scene_off")}
      </p>
    );

  const interactive = !coarse || touchOn; // на телефоне вертикальный скролл важнее жестов камеры

  return (
    <div
      className={`scene${interactive ? "" : " scene--locked"}`}
      role="region"
      aria-label={t("scene_label")}
    >
      <Boundary
        fallback={
          <p className="scene-note" role="alert">
            {t("scene_error")}
          </p>
        }
      >
        <Canvas
          frameloop="demand"
          dpr={[1, coarse ? 1.5 : 2]}
          camera={{ position: OVERVIEW, fov: 45 }}
          gl={{ antialias: !coarse, powerPreference: "low-power" }}
        >
          <color attach="background" args={[colors.sky]} />
          <ambientLight intensity={0.6} />
          <hemisphereLight args={[colors.paper, colors.bounce, 1.1]} />
          <directionalLight position={[8, 14, 6]} intensity={1.6} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color={colors.ground} />
          </mesh>
          {modelUrl && !modelFailed && (
            <Boundary fallback={null} onError={() => setModelFailed(true)}>
              <Suspense fallback={null}>
                <Model url={modelUrl} />
              </Suspense>
            </Boundary>
          )}
          {blocks.map((b) => (
            <BlockMesh
              key={b.id}
              b={b}
              active={b.id === selectedId || b.id === hoverId}
              colors={colors}
              onSelect={(id) => {
                setOverview(false);
                onSelect(id);
              }}
            />
          ))}
          <OrbitControls
            ref={orbit}
            enabled={interactive}
            enablePan={false}
            minDistance={6}
            maxDistance={28}
            maxPolarAngle={Math.PI / 2 - 0.08} /* не уходим под землю */
          />
          <Rig focus={cameraFocus} reduced={reduced} orbit={orbit} />
          <Projector anchors={anchors} onChange={setLabels} />
        </Canvas>
        {/* Venue names over the silhouettes; the card list below stays the accessible source. */}
        <div className="scene-anchors" aria-hidden="true">
          {blocks.map((b) =>
            labels[b.id]?.visible ? (
              <span
                key={b.id}
                className={`scene-label${b.id === selectedId || b.id === hoverId ? " scene-label--active" : ""}`}
                style={{ left: labels[b.id].x, top: labels[b.id].y }}
              >
                {b.label}
              </span>
            ) : null,
          )}
        </div>
      </Boundary>

      <div className="scene-bar">
        <button type="button" onClick={() => setOverview(true)}>
          {t("overview")}
        </button>
        {coarse && (
          <button
            type="button"
            aria-pressed={touchOn}
            onClick={() => setTouchOn((v) => !v)}
          >
            {touchOn ? t("disable_3d") : t("enable_3d")}
          </button>
        )}
      </div>
      <span className="badge badge--warn">{t("conceptual")}</span>
      {modelFailed && (
        <p className="scene-note scene-note--over" role="status">
          {t("model_error")}
        </p>
      )}
    </div>
  );
}
