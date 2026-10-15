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
  const color = active ? '#f2b134' : hover ? '#2fb3ab' : '#0b7a75';
  return (
    <mesh
      position={[b.x, b.h / 2, b.z]}
      onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
    >
      <boxGeometry args={[b.w, b.h, b.d]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// Плавная камера; при reduced motion — мгновенно. Рендер по требованию: invalidate только пока едем.
function Rig({ focus, resetKey, reduced }: { focus: THREE.Vector3 | null; resetKey: number; reduced: boolean }) {
  const { camera, controls, invalidate } = useThree();
  const goal = useRef({ pos: new THREE.Vector3(0, 14, 18), tgt: new THREE.Vector3() });
  const moving = useRef(false);
  const key = focus ? `${focus.x},${focus.z}` : '';

  useEffect(() => {
    const c = controls as any;
    if (!c) return;
    const t = focus ? focus.clone() : new THREE.Vector3();
    goal.current.tgt.copy(t);
    goal.current.pos.copy(t).add(focus ? new THREE.Vector3(5, 5, 7) : new THREE.Vector3(0, 14, 18));
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
  }, [key, resetKey, reduced, controls]);

  useFrame((_, dt) => {
    const c = controls as any;
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
  const [reset, setReset] = useState(0);
  const [touchOn, setTouchOn] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);

  const sel = blocks.find((b) => b.id === selectedId);
  const focus = useMemo(() => (sel ? new THREE.Vector3(sel.x, sel.h / 2, sel.z) : null), [sel]);

  if (!gl) return <p className="scene-note" role="status">{t('scene_off')}</p>;

  const interactive = !coarse || touchOn; // на телефоне вертикальный скролл важнее жестов камеры

  return (
    <div className={`scene${interactive ? '' : ' scene--locked'}`} role="img" aria-label={t('scene_label')}>
      <Boundary fallback={<p className="scene-note" role="alert">{t('scene_error')}</p>}>
        <Canvas
          frameloop="demand"
          dpr={[1, coarse ? 1.5 : 2]}
          camera={{ position: [0, 14, 18], fov: 45 }}
          gl={{ antialias: !coarse, powerPreference: 'low-power' }}
        >
          <color attach="background" args={['#dfeceb']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[8, 14, 6]} intensity={1.1} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#c4d6d3" />
          </mesh>
          {modelUrl && !modelFailed && (
            <Boundary fallback={null} onError={() => setModelFailed(true)}>
              <Suspense fallback={null}><Model url={modelUrl} /></Suspense>
            </Boundary>
          )}
          {blocks.map((b) => (
            <BlockMesh key={b.id} b={b} active={b.id === selectedId || b.id === hoverId} onSelect={onSelect} />
          ))}
          <OrbitControls
            makeDefault
            enabled={interactive}
            enablePan={false}
            minDistance={6}
            maxDistance={28}
            maxPolarAngle={Math.PI / 2 - 0.08} /* не уходим под землю */
          />
          <Rig focus={focus} resetKey={reset} reduced={reduced} />
        </Canvas>
      </Boundary>

      <div className="scene-bar">
        <button type="button" onClick={() => { setReset((r) => r + 1); }}>{t('overview')}</button>
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
