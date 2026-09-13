import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
const compress = promisify(gzip);
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.json': 'application/json' };
Object.assign(types, { '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' });
const redirects = { '/work.html': '/case-studies.html', '/index.html': '/', '/llm.txt': '/llms.txt' };
createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    const url = new URL(req.url, 'http://localhost');
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath === '/games/berlin-combat' || decodedPath.startsWith('/games/berlin-combat/')) { res.writeHead(410, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }).end(req.method === 'HEAD' ? undefined : 'This game is no longer available.'); return; }
    if (redirects[url.pathname]) { res.writeHead(301, { Location: redirects[url.pathname] + url.search }).end(); return; }
    if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }).end(req.method === 'HEAD' ? '' : 'ok'); return; }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let body = await readFile(path);
    const type = types[extname(path)] || 'application/octet-stream';
    const immutable = /\/assets\/[^/]+-[\w-]{8,}\.(js|css)$/.test(url.pathname) || (/^[a-f0-9]{10,64}$/.test(url.searchParams.get('v') || '') && /\.(js|css|glb)$/.test(path));
    const headers = { 'Content-Type': type, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff', Vary: 'Accept-Encoding' };
    const acceptsGzip = (req.headers['accept-encoding'] || '').split(',').some(item => /^\s*gzip\s*(?:;\s*q=(?:1(?:\.0*)?|0?\.[0-9]*[1-9][0-9]*))?\s*$/.test(item));
    if (body.length > 1024 && /^(text\/|application\/(json|xml)|image\/svg)/.test(type) && acceptsGzip) {
      body = await compress(body);
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(Number(process.env.PORT || 4173), process.env.HOST || '127.0.0.1', () => console.log(`Listening on ${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 4173}`));
