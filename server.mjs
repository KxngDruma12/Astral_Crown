import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { handleMultiplayerApi, cleanupMultiplayerMatches } from './multiplayer.mjs';

const root = path.resolve(process.argv[2] || '.');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    if (url.pathname.startsWith('/api/')) {
      await handleMultiplayerApi(req, res, url);
      return;
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    if (pathname === '/multiplayer') pathname = '/multiplayer.html';
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    } catch {
      // The static app intentionally falls back to its home page for unknown paths.
      file = path.join(root, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': mime[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    res.end(body);
  } catch (error) {
    console.error(error);
    if (!res.headersSent && !res.destroyed) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      const body = JSON.stringify({ error: status === 500 ? 'internal server error' : error.message });
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(body);
    }
  }
});

setInterval(cleanupMultiplayerMatches, 60_000).unref();

const port = Number(process.env.PORT) || 4173;
server.listen(port, '0.0.0.0', () => {
  console.log(`ASTRACROWN running at http://localhost:${port}`);
  console.log(`Online arena: http://localhost:${port}/multiplayer`);
});
