import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'design-system.html', 'assets']) {
  await cp(path, `dist/${path}`, { recursive: true });
}
console.log('Built portfolio and design system. Archive excluded from public output.');
