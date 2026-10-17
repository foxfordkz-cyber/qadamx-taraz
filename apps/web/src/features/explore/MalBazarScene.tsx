import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState, type ComponentRef } from "react";
import { useT } from "./i18n";
import { readSceneColors } from "./sceneTokens";
import { Projector, type ScreenPoints } from "./SceneAnchors";
import type { Vec3 } from "./types";

// «Мал базар — демонстрационная схема»: the market location is not confirmed, so this is a
// conceptual layout built from primitives (no GLB, no textures, no animals, no listings).

const PEN = { w: 3, d: 2.4, fence: 0.55, rail: 0.06 };
const COLS = 3;
const ROWS = 2;
const GAP = 0.6;
const WOOD = "#9c7a52"; // fence rails: illustration colour, not a UI token

function Fence({ x, z }: { x: number; z: number }) {
  const sides: { p: Vec3; s: Vec3 }[] = [
    { p: [x, PEN.fence / 2, z - PEN.d / 2], s: [PEN.w, PEN.fence, PEN.rail] },
    { p: [x, PEN.fence / 2, z + PEN.d / 2], s: [PEN.w, PEN.fence, PEN.rail] },
    { p: [x - PEN.w / 2, PEN.fence / 2, z], s: [PEN.rail, PEN.fence, PEN.d] },
    { p: [x + PEN.w / 2, PEN.fence / 2, z], s: [PEN.rail, PEN.fence, PEN.d] },
  ];
  return (
    <>
      {sides.map((side, i) => (
        <mesh key={i} position={side.p}>
          <boxGeometry args={side.s} />
          <meshStandardMaterial color={WOOD} />
        </mesh>
      ))}
    </>
  );
}

export default function MalBazarScene({ onLost }: { onLost: () => void }) {
  const { t } = useT();
  const [colors] = useState(readSceneColors);
  const [enabled, setEnabled] = useState(false);
  const [labels, setLabels] = useState<ScreenPoints>({});
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null);

  const pens = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        out.push({
          x: (c - (COLS - 1) / 2) * (PEN.w + GAP),
          z: (r - (ROWS - 1) / 2) * (PEN.d + 2.2),
        });
    return out;
  }, []);
  const anchors = useMemo(
    () => [
      { id: "gate", position: [0, 2.6, 5.6] as Vec3 },
      { id: "pens", position: [PEN.w + GAP, 1, 2.3] as Vec3 },
      { id: "canopy", position: [0, 2.7, 0] as Vec3 },
    ],
    [],
  );
  const text: Record<string, string> = {
    gate: t("mal_gate"),
    pens: t("mal_pens"),
    canopy: t("mal_canopy"),
  };

  return (
    <div className={`scene mal-scene${enabled ? "" : " scene--locked"}`}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [10, 8, 13], fov: 40 }}
        gl={{ powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", onLost, {
            once: true,
          });
        }}
      >
        <color attach="background" args={[colors.sky]} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={[colors.paper, colors.bounce, 1.1]} />
        <directionalLight position={[8, 14, 6]} intensity={1.6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color={colors.ground} />
        </mesh>
        {/* Yard */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[COLS * (PEN.w + GAP) + 1.6, 0.04, 12.4]} />
          <meshStandardMaterial color={colors.subtle} />
        </mesh>
        {pens.map((p, i) => (
          <Fence key={i} x={p.x} z={p.z} />
        ))}
        {/* Shade canopy over the aisle between the two pen rows */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 5, 1.1, sz * 0.9]}>
              <boxGeometry args={[0.12, 2.2, 0.12]} />
              <meshStandardMaterial color={colors.rule} />
            </mesh>
          )),
        )}
        <mesh position={[0, 2.25, 0]}>
          <boxGeometry args={[COLS * (PEN.w + GAP), 0.08, 2.1]} />
          <meshStandardMaterial color={colors.green} />
        </mesh>
        {/* Gate */}
        {[-1.6, 1.6].map((x) => (
          <mesh key={x} position={[x, 1.2, 5.6]}>
            <boxGeometry args={[0.24, 2.4, 0.24]} />
            <meshStandardMaterial color={colors.green} />
          </mesh>
        ))}
        <mesh position={[0, 2.35, 5.6]}>
          <boxGeometry args={[3.7, 0.3, 0.26]} />
          <meshStandardMaterial color={colors.selected} />
        </mesh>
        <OrbitControls
          ref={orbit}
          enabled={enabled}
          enablePan={false}
          minDistance={8}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2 - 0.08}
        />
        <Projector anchors={anchors} onChange={setLabels} />
      </Canvas>
      <div className="scene-anchors" aria-hidden="true">
        {anchors.map((a) =>
          labels[a.id]?.visible ? (
            <span
              key={a.id}
              className="scene-label"
              style={{ left: labels[a.id].x, top: labels[a.id].y }}
            >
              {text[a.id]}
            </span>
          ) : null,
        )}
      </div>
      <div className="scene-bar">
        <button type="button" onClick={() => setEnabled((v) => !v)}>
          {t(enabled ? "disable_3d" : "enable_3d")}
        </button>
        <button
          type="button"
          onClick={() => {
            const c = orbit.current;
            if (!c) return;
            c.reset();
          }}
        >
          {t("overview")}
        </button>
      </div>
    </div>
  );
}
