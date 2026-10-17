import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('../../assets/venues', { recursive: true });
await build({ entryPoints: ['viewer.js'], bundle: true, minify: true, format: 'iife',
  target: ['chrome100', 'safari15'], outfile: '../../assets/venues/renderer.js', legalComments: 'eof' });
await copyFile('node_modules/three/LICENSE', '../../assets/venues/THREE-LICENSE.txt');
