import { readFile, writeFile } from 'node:fs/promises';
const origin = 'https://decisionos.me';
const pages = JSON.parse(await readFile(new URL('./seo-pages.json', import.meta.url), 'utf8'));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const organization = { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'decisionos', url: `${origin}/`, email: 'aditya@decisionos.me' };
for (const page of pages) {
  const url = origin + page.path;
  let html = await readFile(`dist/${page.file}`, 'utf8');
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escape(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escape(page.description)}">`);
  const entity = { '@type': page.type, '@id': url + '#page', url, name: page.title, description: page.description, inLanguage: 'en', ...(page.image ? { image: origin + '/' + page.image } : {}), publisher: { '@id': organization['@id'] } };
  const graph = [organization, entity];
  if (page.type === 'Article') {
    Object.assign(entity, { headline: page.title, author: { '@id': organization['@id'] }, mainEntityOfPage: url });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'decisionos', item: origin + '/' },
      { '@type': 'ListItem', position: 2, name: 'Case studies', item: origin + '/case-studies.html' },
      { '@type': 'ListItem', position: 3, name: page.title.split(' — ')[0], item: url }
    ] });
  }
  if (page.type === 'CollectionPage') entity.mainEntity = { '@type': 'ItemList', itemListElement: pages.filter(p => p.type === 'Article').map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: origin + p.path })) };
  const tags = `<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="${page.type === 'Article' ? 'article' : 'website'}">
<meta property="og:site_name" content="decisionos">
<meta property="og:title" content="${escape(page.title)}">
<meta property="og:description" content="${escape(page.description)}">
<meta property="og:url" content="${url}">
${page.image ? `<meta property="og:image" content="${origin}/${page.image}">
<meta property="og:image:alt" content="${escape(page.title)}">` : ''}
<meta name="twitter:card" content="${page.image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${escape(page.title)}">
<meta name="twitter:description" content="${escape(page.description)}">
${page.image ? `<meta name="twitter:image" content="${origin}/${page.image}">` : ''}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c')}</script>`;
  await writeFile(`dist/${page.file}`, html.replace('</head>', tags + '</head>'));
}
const design = await readFile('dist/design-system.html', 'utf8');
await writeFile('dist/design-system.html', design.replace('</head>', '<meta name="robots" content="noindex,follow"></head>'));
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /archive/\n\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${origin}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
await writeFile('dist/llms.txt', `# decisionos\n\n> Fractional product building: market validation, product management, design, and development from concept to launch.\n\n## Case studies\n\nThe published case studies explore voice-first ecommerce discovery with Loop, photo-first resale shortlisting with Shelf to Sell, and focused conversational shopping screens with Surface. Catalog content and resale estimates are illustrative. Neither concept processes purchases or publishes seller listings.\n\n${pages.map(p => `- [${p.title}](${origin}${p.path}): ${p.description}`).join('\n')}\n\n## Contact\n\nEmail: aditya@decisionos.me\n`);
console.log(`SEO metadata, structured data, sitemap, robots.txt, and llms.txt generated for ${pages.length} pages.`);
