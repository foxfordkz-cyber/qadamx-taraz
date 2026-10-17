import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// This renderer has no auth, HTTP, links or form. Flutter supplies only the
// accepted embedded GLB and API-matched public markers, never tokens or PII.
const send = (value) => window.QadamVenue?.postMessage(JSON.stringify(value));
let renderer, scene, camera, controls, model, frame, alive = true, disposed = false, markers = [];
window.qadamChunks = [];
function fail() { send({type:'error'}); window.disposeVenue(); }
const disposeModel = (root) => {
  root?.traverse((o) => { o.geometry?.dispose();
    for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose();
    }
  });
};
window.disposeVenue = () => {
  disposed = true; alive = false; cancelAnimationFrame(frame); controls?.dispose();
  disposeModel(model); renderer?.dispose(); markers.forEach(m => m.button.remove()); markers = [];
  window.qadamChunks = [];
};
window.resetVenue = () => { controls?.reset(); };
window.pauseVenue = () => { alive = false; cancelAnimationFrame(frame); };
window.resumeVenue = () => { if (!disposed && !alive) { alive = true; if (model) draw(); } };
function draw() {
  if (!alive) return;
  const width = innerWidth, height = innerHeight;
  if (renderer.domElement.clientWidth !== width || renderer.domElement.clientHeight !== height) {
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  controls.update(); renderer.render(scene, camera);
  for (const m of markers) {
    const v = m.position.clone().project(camera);
    m.button.style.display = v.z < -1 || v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1 ? 'none' : 'block';
    m.button.style.left = `${(v.x + 1) * width / 2}px`;
    m.button.style.top = `${(1 - v.y) * height / 2}px`;
  }
  frame = requestAnimationFrame(draw);
}
window.setVenue = (asset, businesses, kk) => {
  try {
    const encoded = window.qadamChunks.join(''); window.qadamChunks = [];
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    scene = new THREE.Scene(); scene.background = new THREE.Color('#f5f3eb');
    const dimensions = new THREE.Vector3().fromArray(asset.bounds_max).sub(new THREE.Vector3().fromArray(asset.bounds_min));
    const extent = dimensions.length();
    camera = new THREE.PerspectiveCamera(asset.camera_fov_degrees || 45, innerWidth/innerHeight, 0.1, extent * 20);
    camera.position.fromArray(asset.camera_position);
    // Fit the accepted scene into a narrow portrait viewport without cropping.
    const target = new THREE.Vector3().fromArray(asset.camera_target);
    const distance = camera.position.distanceTo(target);
    const fit = Math.max(dimensions.y, dimensions.x / camera.aspect) / (2 * Math.tan(camera.fov * Math.PI / 360)) * 1.15;
    if (distance < fit) camera.position.sub(target).multiplyScalar(fit/distance).add(target);
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.append(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });
    controls = new OrbitControls(camera, renderer.domElement); controls.target.copy(target);
    controls.enableDamping = true; controls.enablePan = false;
    controls.minDistance = extent * .4; controls.maxDistance = Math.max(fit * 2, extent * 4);
    controls.maxPolarAngle = Math.PI * .49; controls.update(); controls.saveState();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x64705c, 2.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(60,120,100); scene.add(sun);
    new GLTFLoader().parse(bytes.buffer, '', (gltf) => {
      if (disposed) { disposeModel(gltf.scene); return; }
      model = gltf.scene; scene.add(model);
      asset.hotspots.forEach((h, index) => {
        const b = businesses.find(b => b.id === h.business_id && b.slug === h.business_slug);
        if (!b) return;
        const button = document.createElement('button'); button.className = 'marker';
        button.textContent = String(index + 1); button.setAttribute('aria-label', `${index+1}. ${b.name}`);
        button.title = b.name;
        button.onclick = () => send({type:'select', id:h.id});
        document.body.append(button); markers.push({button, position: new THREE.Vector3().fromArray(h.position)});
      });
      send({type:'loaded'}); draw();
    }, fail);
  } catch (_) { fail(); }
};
send({type:'ready'});
