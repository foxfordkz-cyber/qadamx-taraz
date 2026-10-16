import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Box3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const manifest = JSON.parse(await readFile(new URL('../public/venue-assets.json',import.meta.url),'utf8'));
for (const venue of manifest.venues) {
  const bytes = await readFile(new URL('../public'+venue.model_url,import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const bounds = new Box3().setFromObject(gltf.scene);
  let triangles=0,meshes=0;
  gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    meshes++;triangles+=(object.geometry.index?.count || object.geometry.attributes.position.count)/3;
    assert.ok(object.material,'Renderable material');
    object.geometry.dispose();
    for(const material of [object.material].flat()) material.dispose();
  });
  assert.ok(bytes.length<=1500000 && triangles<=30000);
  for (const [index,axis] of ['x','y','z'].entries()) {
    assert.ok(Math.abs(bounds.min[axis]-venue.bounds_min[index])<.05,`${venue.slug} minimum ${axis}`);
    assert.ok(Math.abs(bounds.max[axis]-venue.bounds_max[index])<.05,`${venue.slug} maximum ${axis}`);
  }
  console.log(JSON.stringify({slug:venue.slug,bytes:bytes.length,triangles,meshes,boundsMin:bounds.min.toArray(),boundsMax:bounds.max.toArray()}));
}
