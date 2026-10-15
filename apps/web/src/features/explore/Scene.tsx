import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useT } from './i18n';
import type { Block } from './layout';

type Props = {
  blocks: Block[];
  selectedId?: string | null; // камера фокусируется на нём
  hoverId?: string | null;    // только подсветка
  onSelect: (id: string) => void;
  modelUrl?: string | null;   // подробная GLB, грузится только когда передан
};

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
};

class Boundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function BlockMesh({ b, active, onSelect }: { b: Block; active: boolean; onSelect: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  const color = active ? '#d7f36a' : hover ? '#f0a94b' : '#164c3e';
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[b.w + 0.34, 0.14, b.d + 0.34]} />
        <meshStandardMaterial color="#b8c8b4" roughness={0.86} />
      </mesh>
      <mesh
        position={[0, b.h / 2 + 0.14, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      >
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial
          color={color}
          emissive={active ? '#8ba83e' : '#000000'}
          emissiveIntensity={active ? 0.16 : 0}
          roughness={0.62}
          flatShading
        />
      </mesh>
      <mesh position={[0, b.h + 0.22, 0]}>
        <boxGeometry args={[b.w + 0.1, 0.12, b.d + 0.1]} />
        <meshStandardMaterial color={active ? '#f8ffe0' : '#f2e5c8'} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// Плавная камера; при reduced motion — мгновенно. Рендер по требованию: invalidate только пока едем.
function Rig({
  focus,
  overviewTarget,
  overviewDistance,
  reduced,
}: {
  focus: THREE.Vector3 | null;
  overviewTarget: THREE.Vector3;
  overviewDistance: number;
  reduced: boolean;
}) {
  const { camera, controls, invalidate } = useThree();
  const goal = useRef({ pos: new THREE.Vector3(0, 11, 13), tgt: new THREE.Vector3() });
  const moving = useRef(false);
  const key = focus
    ? `${focus.x},${focus.z}`
    : `${overviewTarget.x},${overviewTarget.z},${overviewDistance}`;

  useEffect(() => {
    const c = controls as (typeof controls & { target: THREE.Vector3; update: () => void });
    if (!c) return;
    const t = focus ? focus.clone() : overviewTarget.clone();
    goal.current.tgt.copy(t);
    const offset = focus
      ? new THREE.Vector3(5, 5, 7)
      : new THREE.Vector3(0.5, 0.62, 1).normalize().multiplyScalar(overviewDistance);
    goal.current.pos.copy(t).add(offset);
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
  }, [key, reduced, controls]);

  useFrame((_, dt) => {
    const c = controls as (typeof controls & { target: THREE.Vector3; update: () => void });
    if (!moving.current || !c) return;
    const k = 1 - Math.pow(0.001, dt);
    camera.position.lerp(goal.current.pos, k);
    c.target.lerp(goal.current.tgt, k);
    c.update();
    if (camera.position.distanceTo(goal.current.pos) < 0.02) moving.current = false;
    else invalidate();
  });
  return null;
}

export default function Scene({ blocks, selectedId, hoverId, onSelect, modelUrl }: Props) {
  const { t } = useT();
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const coarse = useMemo(() => matchMedia('(pointer: coarse)').matches, []);
  const [gl] = useState(hasWebGL);
  const [overview, setOverview] = useState(true);
  const [touchOn, setTouchOn] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);

  const sel = blocks.find((b) => b.id === selectedId);
  const focus = useMemo(() => (sel ? new THREE.Vector3(sel.x, sel.h / 2, sel.z) : null), [sel]);
  const cameraFocus = overview ? null : focus;
  const bounds = useMemo(() => {
    if (blocks.length === 0) return { target: new THREE.Vector3(), distance: 16 };
    const minX = Math.min(...blocks.map((b) => b.x - b.w / 2));
    const maxX = Math.max(...blocks.map((b) => b.x + b.w / 2));
    const minZ = Math.min(...blocks.map((b) => b.z - b.d / 2));
    const maxZ = Math.max(...blocks.map((b) => b.z + b.d / 2));
    const width = maxX - minX;
    const depth = maxZ - minZ;
    return {
      target: new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2),
      distance: THREE.MathUtils.clamp(Math.max(width, depth) * 0.95 + 7, 8.5, 24),
    };
  }, [blocks]);

  useEffect(() => {
    if (selectedId) setOverview(false);
  }, [selectedId]);

  if (!gl) return <p className="scene-note" role="status">{t('scene_off')}</p>;

  const interactive = !coarse || touchOn; // на телефоне вертикальный скролл важнее жестов камеры

  return (
    <div className={`scene${interactive ? '' : ' scene--locked'}`} role="region" aria-label={t('scene_label')}>
      <Boundary fallback={<p className="scene-note" role="alert">{t('scene_error')}</p>}>
        <Canvas
          frameloop="demand"
          dpr={[1, coarse ? 1.5 : 2]}
          camera={{ position: [0, 11, 13], fov: 45 }}
          gl={{ antialias: !coarse, powerPreference: 'low-power' }}
        >
          <color attach="background" args={['#e7eee2']} />
          <ambientLight intensity={0.72} />
          <hemisphereLight args={['#fff9e9', '#8ba78d', 0.62]} />
          <directionalLight position={[8, 16, 7]} intensity={1.15} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[38, 38]} />
            <meshStandardMaterial color="#e1e9dc" roughness={0.96} />
          </mesh>
          <gridHelper args={[30, 30, '#b9cbb7', '#d0ddca']} position={[0, 0.015, 0]} />
          {modelUrl && !modelFailed && (
            <Boundary fallback={null} onError={() => setModelFailed(true)}>
              <Suspense fallback={null}><Model url={modelUrl} /></Suspense>
            </Boundary>
          )}
          {blocks.map((b) => (
            <BlockMesh
              key={b.id}
              b={b}
              active={b.id === selectedId || b.id === hoverId}
              onSelect={(id) => { setOverview(false); onSelect(id); }}
            />
          ))}
          <OrbitControls
            makeDefault
            enabled={interactive}
            enablePan={false}
            minDistance={4}
            maxDistance={28}
            maxPolarAngle={Math.PI / 2 - 0.08} /* не уходим под землю */
          />
          <Rig
            focus={cameraFocus}
            overviewTarget={bounds.target}
            overviewDistance={bounds.distance}
            reduced={reduced}
          />
        </Canvas>
      </Boundary>

      <div className="scene-bar">
        <button type="button" onClick={() => setOverview(true)}>{t('overview')}</button>
        {coarse && (
          <button type="button" aria-pressed={touchOn} onClick={() => setTouchOn((v) => !v)}>
            {touchOn ? t('disable_3d') : t('enable_3d')}
          </button>
        )}
      </div>
      <span className="badge badge--warn">{t('conceptual')}</span>
      {modelFailed && <p className="scene-note scene-note--over" role="status">{t('model_error')}</p>}
    </div>
  );
}
