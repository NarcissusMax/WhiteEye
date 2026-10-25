import { createServer } from 'node:http';
import { loadEnvFile } from 'node:process';
import { mkdir, chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { localCourseDatabase } from './course-local-db.mjs';
import worker from '../dist/server/index.js';

const root = fileURLToPath(new URL('..', import.meta.url));
try {
  loadEnvFile(resolve(root, process.env.WHITEEYE_ENV_FILE || '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw new Error('Could not load the local .env configuration.');
}
const port = Number(process.env.PORT || 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const stateRoot = process.env.XDG_STATE_HOME || join(process.env.HOME || root, '.local', 'state');
const dataDirectory = resolve(root, process.env.WHITEEYE_DATA_DIR || join(stateRoot, 'whiteeye'));
await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
const databasePath = join(dataDirectory, 'course.sqlite');
const db = localCourseDatabase(databasePath);
await chmod(databasePath, 0o600);
const environment = {
  DB: db,
  MODEL_BASE_URL: process.env.MODEL_BASE_URL,
  MODEL_NAME: process.env.MODEL_NAME,
  MODEL_API_KEY: process.env.MODEL_API_KEY,
  WHITEEYE_ACCESS_TOKEN: process.env.WHITEEYE_ACCESS_TOKEN,
};
const loopback = new Set(['127.0.0.1', 'localhost', '[::1]']);
const server = createServer(async (req, res) => {
  const abort = new AbortController();
  const onClose = () => { if (!res.writableEnded) abort.abort(); };
  res.on('close', onClose);
  req.on('aborted', () => abort.abort());
  try {
    const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);
    if (!loopback.has(url.hostname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Use the local WhiteEye address.');
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    headers.set('cf-connecting-ip', req.socket.remoteAddress || '127.0.0.1');
    const hasBody = !['GET', 'HEAD'].includes(req.method) && chunks.length > 0;
    const request = new Request(url, {
      method: req.method,
      headers,
      signal: abort.signal,
      ...(hasBody ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await worker.fetch(request, environment, {});
    for (const [name, value] of response.headers) {
      if (name !== 'set-cookie') res.setHeader(name, value);
    }
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.writeHead(response.status);
    if (req.method === 'HEAD' || !response.body) res.end();
    else await pipeline(Readable.fromWeb(response.body), res);
  } catch (error) {
    if (abort.signal.aborted || error.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
    console.error('Local request failed.');
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('The local request could not be completed.');
    } else res.destroy();
  } finally {
    res.off('close', onClose);
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Stop the existing WhiteEye service or choose another PORT.`
    : 'The local server could not start.');
  db.close();
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`WhiteEye: http://127.0.0.1:${port}/`);
  console.log(`Course data: ${databasePath}`);
});
let closing = false;
const stop = () => {
  if (closing) return;
  closing = true;
  server.close(() => db.close());
  server.closeAllConnections();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
