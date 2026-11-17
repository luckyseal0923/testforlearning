import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 3000);
const version = process.env.APP_VERSION || '1.0.0';
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必須是 1 到 65535 之間的整數。');
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'");

  const send = (status, type, body) => {
    response.writeHead(status, { 'Content-Type': type });
    response.end(request.method === 'HEAD' ? undefined : body);
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    send(405, 'text/plain; charset=utf-8', 'Method not allowed');
    return;
  }

  const path = new URL(request.url, 'http://localhost').pathname;

  if (path === '/api/status' || path === '/health') {
    const data = path === '/health'
      ? { status: 'ok' }
      : { version, time: new Date().toISOString(), uptime: Math.floor(process.uptime()) };
    send(200, 'application/json; charset=utf-8', JSON.stringify(data));
    return;
  }

  const file = files.get(path);
  if (!file) {
    send(404, 'text/plain; charset=utf-8', '找不到這個頁面');
    return;
  }

  try {
    const content = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    send(200, file[1], content);
  } catch (error) {
    console.error(error);
    send(500, 'text/plain; charset=utf-8', '無法載入網頁');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `連接埠 ${port} 已被其他程式使用，請更換 PORT。` : error.message);
  process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
  console.log(`部署練習網頁：http://localhost:${port}`);
});
