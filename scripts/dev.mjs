#!/usr/bin/env node
/**
 * 实时本地预览 — 监听 companies/ 变化自动重建 + 启动 HTTP 服务器
 *
 * 用法：npm run dev
 *  - 端口可通过 PORT 环境变量修改（默认 8080）
 *  - 监听 companies/、template/、static/、i18n/ 下的变化
 *  - 重建完成后在终端打印 "✓ rebuilt in Xms"
 *  - Ctrl+C 退出
 */

import { spawn } from 'node:child_process';
import { STATUS_CODES } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { watch as fsWatch } from 'node:fs';
import { createServer } from 'node:net';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');
const CONFIG = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));
const PORT = parseInt(process.env.PORT || CONFIG.devServer.port, 10);
const HOST = process.env.HOST || CONFIG.devServer.host;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json',
  '.txt':  'text/plain; charset=utf-8',
};

let building = false;
let pending = false;
let lastBuildMs = 0;

async function build() {
  if (building) { pending = true; return; }
  building = true;
  const t0 = Date.now();
  await new Promise((resolve) => {
    const p = spawn(process.execPath, [join(ROOT, 'scripts/build.mjs')], {
      stdio: 'inherit',
      cwd: ROOT,
    });
    p.on('exit', (code) => {
      lastBuildMs = Date.now() - t0;
      if (code === 0) {
        process.stdout.write(`\x1b[32m✓ rebuilt in ${lastBuildMs}ms\x1b[0m\n`);
        process.stdout.write(`→ http://${HOST}:${PORT}/\n`);
      } else {
        process.stdout.write(`\x1b[31m✗ build failed (exit ${code})\x1b[0m\n`);
      }
      resolve();
    });
  });
  building = false;
  if (pending) { pending = false; await build(); }
}

function serveFile(req, res) {
  // 1) Map URL to a file under DIST. Block any path traversal.
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = normalize(join(DIST, urlPath));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  readFile(filePath).then((data) => {
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      // Disable ETag/Last-Modified so the browser always re-fetches after rebuild
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(data);
  }).catch(async () => {
    // Try 404.html first, then fallback to index.html (for SPA routing)
    try {
      const data = await readFile(join(DIST, '404.html'));
      res.writeHead(404, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
      res.end(data);
    } catch {
      // No 404 page yet, serve index.html as last resort
      try {
        const data = await readFile(join(DIST, 'index.html'));
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
        res.end(data);
      } catch {
        res.writeHead(404); res.end('Not found');
      }
    }
  });
}

// --- Raw TCP server (bypass Node's HTTP parser rejection of raw UTF-8 in URLs) ---
const server = createServer((socket) => {
  let buf = Buffer.alloc(0);
  function onData(chunk) {
    buf = Buffer.concat([buf, chunk]);
    if (buf.indexOf('\r\n\r\n') < 0) return; // wait for full headers
    socket.removeListener('data', onData);

    const headerEnd = buf.indexOf('\r\n\r\n');
    const headBuf = buf.subarray(0, headerEnd);
    const bodyBuf = buf.subarray(headerEnd + 4);
    const firstCrlf = headBuf.indexOf('\r\n');
    const reqLine = headBuf.subarray(0, firstCrlf).toString('utf8');
    const parts = reqLine.split(' ');
    const rawUrl = parts[1] || '/';
    const method = parts[0] || 'GET';

    // Percent-encode non-ASCII bytes in URL path (NOT in query string — that's user data)
    const qi = rawUrl.indexOf('?');
    const pathPart = qi < 0 ? rawUrl : rawUrl.slice(0, qi);
    const queryPart = qi < 0 ? '' : rawUrl.slice(qi);
    let encodedPath = '';
    for (let i = 0; i < pathPart.length; i++) {
      const c = pathPart.charCodeAt(i);
      if (c > 127) {
        for (const b of Buffer.from(pathPart[i])) {
          encodedPath += '%' + b.toString(16).toUpperCase();
        }
      } else {
        encodedPath += pathPart[i];
      }
    }
    const fixedUrl = encodedPath + queryPart;

    // Parse headers (just content-length for body alignment)
    const headerLines = headBuf.subarray(firstCrlf + 2).toString('utf8').split('\r\n');
    const headers = {};
    for (const line of headerLines) {
      const ci = line.indexOf(':');
      if (ci > 0) headers[line.slice(0, ci).toLowerCase()] = line.slice(ci + 2);
    }

    // Build minimal req/res
    const req = { url: fixedUrl, method, headers };
    const res = {
      _headers: {},
      _written: false,
      writeHead(code, head) {
        if (this._written) return;
        this._written = true;
        this._code = code;
        this._head = head;
      },
      end(data) {
        if (this._ended) return;
        this._ended = true;
        const code = this._code || 200;
        const head = this._head || { 'Content-Type': 'text/html; charset=utf-8' };
        head['Content-Length'] = head['Content-Length'] || (data ? Buffer.byteLength(data) : 0);
        let resp = `HTTP/1.1 ${code} ${STATUS_CODES[code]}\r\n`;
        for (const [k, v] of Object.entries(head)) resp += `${k}: ${v}\r\n`;
        resp += '\r\n';
        socket.end(resp + (data || ''));
      }
    };

    serveFile(req, res);
  }
  socket.on('data', onData);
});
server.listen(PORT, HOST, async () => {
  process.stdout.write(`\n\x1b[1m▶ Company Reputation — live preview\x1b[0m\n`);
  process.stdout.write(`  Dist: ${DIST}\n`);
  process.stdout.write(`  URL:  http://${HOST}:${PORT}/\n\n`);
  // Initial build (no watch spam on cold start)
  await build();
});

// --- Watch sources ---
const watchTargets = [
  join(ROOT, 'companies'),
  join(ROOT, 'template'),
  join(ROOT, 'static'),
  join(ROOT, 'i18n'),
  join(ROOT, 'images'),
  join(ROOT, 'scripts'),
  join(ROOT, 'config.json'),
];

let debounceTimer = null;
function scheduleRebuild(changedPath) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    process.stdout.write(`\n\x1b[36m⏵ change detected: ${changedPath}\x1b[0m\n`);
    build();
  }, 120);
}

for (const target of watchTargets) {
  try {
    await stat(target);
  } catch { continue; }
  // recursive: true watches nested dirs (e.g. companies/华为/终端业务部/positions/)
  fsWatch(target, { recursive: true }, (event, filename) => {
    if (!filename) return;
    // Skip hidden files / editor temp / dist regeneration byproducts
    if (filename.startsWith('.') || filename.endsWith('~') || filename.endsWith('.swp')) return;
    scheduleRebuild(join(target, filename));
  });
  process.stdout.write(`  \x1b[90m· watching ${target.replace(ROOT + '/', '')}\x1b[0m\n`);
}

// Graceful shutdown
let exiting = false;
function shutdown() {
  if (exiting) return;
  exiting = true;
  process.stdout.write('\n\x1b[33m⏹ shutting down\x1b[0m\n');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
