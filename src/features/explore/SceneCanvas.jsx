import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Html, OrbitControls} from '@react-three/drei';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Vector3} from 'three';
import {Link, useNavigate} from 'react-router-dom';
import {useLocale} from './locale.jsx';
import {shopHref, venueHref} from './publicApi.js';

const colors = ['#ae6445', '#397c86', '#c29a50'];
function dispose(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene?.traverse(object => {if (object.geometry) geometries.add(object.geometry); for (const m of object.material ? [object.material].flat() : []) {materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v)}});
  geometries.forEach(x => x.dispose()); textures.forEach(x => x.dispose()); materials.forEach(x => x.dispose());
}
function Blocks({index = 0, ...props}) {
  const [hover, setHover] = useState(false);
  return <group {...props} onPointerOver={e => {e.stopPropagation();setHover(true)}} onPointerOut={() => setHover(false)} scale={hover ? 1.04 : 1}>
    <mesh position={[0, -.12, 0]}><boxGeometry args={[8.8,.25,7]}/><meshStandardMaterial color="#cad8bb"/></mesh>
    {(index === 0 ? [[0,1.2,0,7,2.4,4],[-2,2.2,1,1.5,4.4,2]] : index === 1 ? [[0,.9,-1.2,7,1.8,2],[0,.9,1.4,7,1.8,2]] : [[-2,.6,0,1.4,1.2,5],[0,.6,0,1.4,1.2,5],[2,.6,0,1.4,1.2,5]]).map(([x,y,z,w,h,d],i) => <mesh key={i} position={[x,y,z]}><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={colors[index]} roughness={.85}/></mesh>)}
    <mesh position={[0,.1,3]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[7,1]}/><meshStandardMaterial color="#f5e9cf"/></mesh>
  </group>;
}
function Camera({target, position, reset, reduced, controls}) {
  const {camera, invalidate} = useThree(), moving = useRef(true);
  const to = useMemo(() => new Vector3(...position), [position.join(',')]);
  const look = useMemo(() => new Vector3(...target), [target.join(',')]);
  useEffect(() => {moving.current = true; invalidate()}, [to, look, reset, invalidate]);
  useFrame((_, delta) => {
    if (!moving.current || !controls.current) return;
    const alpha = reduced ? 1 : 1 - Math.exp(-Math.min(delta,.1)*8);
    camera.position.lerp(to, alpha); controls.current.target.lerp(look, alpha); controls.current.update();
    if (camera.position.distanceTo(to) < .02 && controls.current.target.distanceTo(look) < .02) moving.current = false;
    else invalidate();
  });
  useEffect(() => {const c = controls.current; const stop = () => {moving.current = false}; c?.addEventListener('start', stop); return () => c?.removeEventListener('start', stop)}, [controls]);
  return null;
}
function World({venues, venue, shops, selected, manifest, reset, interactive, report}) {
  const {invalidate} = useThree(), controls = useRef(), navigate = useNavigate();
  const [model, setModel] = useState(null);
  const asset = manifest?.venues.find(v => v.slug === venue?.slug);
  const scale = asset ? 15 / Math.max(asset.bounds_max[0]-asset.bounds_min[0], asset.bounds_max[2]-asset.bounds_min[2]) : 1;
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  useEffect(() => {
    let active = true, loaded;
    setModel(null);
    if (!asset) return;
    report('loading');
    new GLTFLoader().load(asset.model_url, gltf => {
      if (!active) {dispose(gltf.scene);return}
      loaded = gltf.scene; setModel(loaded); report('ready'); invalidate();
    }, undefined, () => {if (active) report('error')});
    return () => {active = false; dispose(loaded)};
  }, [asset, invalidate, report]);
  const hotspot = reset === 0 ? asset?.hotspots.find(h => h.business_slug === selected) : null;
  const target = hotspot ? hotspot.position.map(v => v*scale) : venue ? [0,1,0] : [0,0,0];
  const position = hotspot ? [target[0]+5,8,target[2]+12] : venue ? [10,12,22] : [21,24,34];
  return <>
    <color attach="background" args={['#e9eee2']}/><ambientLight intensity={1.8}/><directionalLight position={[8,20,10]} intensity={2.5}/><hemisphereLight args={['#ffffff','#8b9a7b',1]}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.3,0]}><circleGeometry args={[40,64]}/><meshStandardMaterial color="#dce5ce"/></mesh>
    {venue ? <>
      {model ? <primitive object={model} scale={scale} dispose={null}/> : <Blocks index={Math.max(0,venues.findIndex(v => v.id === venue.id))}/>}
      {asset?.hotspots.map((h,index) => {const shop = shops.find(s => s.id === h.business_id && s.slug === h.business_slug); return shop && <Html key={h.id} position={h.position.map(v => v*scale)} center zIndexRange={[30,0]}><Link className={'hotspot' + (selected === shop.slug ? ' selected' : '')} to={shopHref(shop)} aria-label={shop.name} title={shop.name}>{index+1}</Link></Html>})}
    </> : venues.map((v,index) => <group key={v.id} position={[(index-1)*11,0,index===1?-2:1]} onClick={event => {event.stopPropagation();if(event.delta<5)navigate(venueHref(v))}}>
      <Blocks index={index}/><Html position={[0,4,0]} center zIndexRange={[30,0]}><Link className="venue-pin" to={venueHref(v)}>{v.name}<span>↗</span></Link></Html>
    </group>)}
    <OrbitControls ref={controls} makeDefault enabled={interactive} enablePan={false} enableZoom={interactive} enableRotate={interactive} minDistance={venue?10:26} maxDistance={venue?38:60} minPolarAngle={.2} maxPolarAngle={Math.PI/2-.12} enableDamping={!reduced}/>
    <Camera target={target} position={position} controls={controls} reduced={reduced} reset={reset}/>
  </>;
}
export default function SceneCanvas(props) {
  const {t} = useLocale(), [manifest, setManifest] = useState(null), [status, report] = useState('ready'), [reset, setReset] = useState(0), [lost, setLost] = useState(false);
  useEffect(() => {const controller = new AbortController(); fetch('/venue-assets.json',{signal:controller.signal}).then(r => {if(!r.ok)throw Error(); return r.json()}).then(setManifest).catch(e => {if(e.name !== 'AbortError') report('error')}); return () => controller.abort()}, []);
  if (lost) return <div className="scene-fallback" role="status">{t('3D тоқтады. Карточкалардан таңдаңыз.', '3D остановлен. Выберите карточку ниже.')}</div>;
  return <>
    <Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:[21,24,34],fov:45,near:.1,far:250}} gl={{antialias:true,powerPreference:'low-power'}} onCreated={({gl}) => {gl.domElement.addEventListener('webglcontextlost', e => {e.preventDefault();setLost(true)}, {once:true})}}>
      <World {...props} manifest={manifest} reset={reset} report={report}/>
    </Canvas>
    <button className="scene-reset" onClick={() => setReset(n => n+1)}>{t('Жалпы көрініс', 'Общий вид')} ↺</button>
    <span className="scene-state" role="status">{status === 'loading' ? t('Модель жүктелуде…', 'Загрузка модели…') : status === 'error' ? t('Модель ашылмады · блоктық схема', 'Модель недоступна · блоковая схема') : props.selected ? t('Таңдалған нүкте', 'Выбранная точка') : props.venue?.name || t('Алаңды таңдаңыз', 'Выберите площадку')}</span>
  </>;
}
