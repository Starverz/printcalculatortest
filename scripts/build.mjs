import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const skipNames = new Set(['.git', 'dist', 'node_modules']);

async function copyRecursive(source, target) {
  const sourceStat = await stat(source);

  if (sourceStat.isDirectory()) {
    await mkdir(target, { recursive: true });
    const entries = await readdir(source);
    await Promise.all(entries.map(async (entry) => {
      if (skipNames.has(entry)) return;
      await copyRecursive(path.join(source, entry), path.join(target, entry));
    }));
    return;
  }

  const contents = await readFile(source);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const rootEntries = await readdir(rootDir);
await Promise.all(rootEntries.map(async (entry) => {
  if (skipNames.has(entry)) return;
  await copyRecursive(path.join(rootDir, entry), path.join(distDir, entry));
}));

console.log(`Build complete: ${distDir}`);
