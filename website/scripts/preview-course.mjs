import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { localCourseDatabase } from './course-local-db.mjs';
import worker from '../dist/server/index.js';

const port = Number(process.env.COURSE_PREVIEW_PORT || 8787);
const db = localCourseDatabase('/tmp/whiteeye-course-preview.sqlite');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ttf': 'font/ttf' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (!url.pathname.startsWith('/api/')) {
      let path = url.pathname;
      if (/^\/course(?:-2)?(?:\/(?:graph|lesson\/\d{2}\.\d{2}|module\/\d{2}|resource\/[a-z0-9-]+)?)?\/?$/.test(path)) path = path.startsWith('/course-2') ? '/course-2/index.html' : '/course/index.html';
      if (path === '/' || path === '/conversation') path = '/index.html';
      const root = resolve('public');
      const file = resolve(root, '.' + decodeURIComponent(path));
      if (file.startsWith(root + '/')) {
        try {
          const body = await readFile(file);
          res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
          res.end(req.method === 'HEAD' ? undefined : body); return;
        } catch { /* Worker supplies production 404 behavior. */ }
      }
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(url, { method: req.method, headers: req.headers, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) });
    const response = await worker.fetch(request, { DB: db }, {});
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { res.writeHead(500); res.end('Preview request failed.'); console.error(error.message); }
}).listen(port, '127.0.0.1', () => console.log(`WhiteEye course preview: http://localhost:${port}/course/`));
