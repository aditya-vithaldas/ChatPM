import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'design-system.html', 'case-studies.html', 'thanks.html', 'assets', 'toptal-application.html', 'toptal-application.css', 'toptal-application.js', 'images']) {
  await cp(path, `dist/${path}`, { recursive: true });
}
// Publish registered detail pages; unlisted source pages stay available for later.
const pages = JSON.parse(await readFile('scripts/seo-pages.json', 'utf8'));
await mkdir('dist/projects', { recursive: true });
for (const page of pages.filter(page => page.file.startsWith('projects/') || page.file.startsWith('services/'))) {
  await mkdir(dirname(`dist/${page.file}`), { recursive: true });
  await cp(page.file, `dist/${page.file}`);
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
