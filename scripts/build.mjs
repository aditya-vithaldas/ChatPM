import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'design-system.html', 'work.html', 'projects', 'assets']) {
  await cp(path, `dist/${path}`, { recursive: true });
}
const versions = {};
for (const name of ['styles.css', 'motion.js', 'concepts.js']) {
  versions[name] = createHash('sha256').update(await readFile(`assets/${name}`)).digest('hex').slice(0, 10);
}
async function versionPages(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await versionPages(path);
    else if (entry.name.endsWith('.html')) {
      const html = (await readFile(path, 'utf8')).replace(/(assets\/(styles\.css|motion\.js|concepts\.js))(?:\?v=[^"\s]+)?/g, (_, url, name) => `${url}?v=${versions[name]}`);
      await writeFile(path, html);
    }
  }
}
await versionPages('dist');
console.log('Built site, work index, and case studies with versioned assets. Archive excluded.');
