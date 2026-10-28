import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const outputDirectory = resolve(projectRoot, 'dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(resolve(projectRoot, 'public'), outputDirectory, { recursive: true });
await cp(resolve(projectRoot, 'src/ui/popup.css'), resolve(outputDirectory, 'popup.css'));

const entries = [
  ['src/runtime/background.ts', 'background.js'],
  ['src/runtime/content.ts', 'content.js'],
  ['src/runtime/offscreen.ts', 'offscreen.js'],
  ['src/ui/popup.ts', 'popup.js'],
];

for (const [entryPoint, outputFile] of entries) {
  await build({
    entryPoints: [resolve(projectRoot, entryPoint)],
    outfile: resolve(outputDirectory, outputFile),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome116',
    sourcemap: true,
    legalComments: 'none',
  });
}

console.log(`Built Chrome extension in ${outputDirectory}`);
