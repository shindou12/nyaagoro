// にゃごろ！ room server
// - serves the static game
// - WebSocket relay for invite-only rooms (4-letter room IDs, 2 cats per room)
// The game logic runs on the room host's browser; this server only relays.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8080);
const CODE_CHARS = 'ACDEFHJKMNPRTWXY34679'; // no look-alikes (0/O, 1/I/L, 5/S, 8/B...)
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};
const PUBLIC = ['index.html', 'css', 'js', 'assets', 'vendor', 'tools', 'favicon.svg'];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, rooms: rooms.size })); return; }
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (rel === '') rel = 'index.html';
  const top = rel.split('/')[0];
  const file = path.resolve(ROOT, rel);
  if (!PUBLIC.includes(top) || !file.startsWith(ROOT + path.sep)) { res.writeHead(404); res.end('not found'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': /\.(mp3|woff2)$/.test(file) ? 'public, max-age=86400' : 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
});

// ------------------------------------------------------------------ rooms
/** @type {Map<string, {host: any, guest: any, created: number}>} */
const rooms = new Map();

function newCode() {
  for (let tries = 0; tries < 1000; tries++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
  throw new Error('no free room codes');
}

const send = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const other = (room, ws) => (room.host === ws ? room.guest : room.host);

function leave(ws) {
  const code = ws.room;
  if (!code) return;
  const room = rooms.get(code);
  ws.room = null;
  if (!room) return;
  if (room.host === ws) {
    // host gone -> room closes
    send(room.guest, { t: 'peer', state: 'left', reason: 'host-left' });
    if (room.guest) room.guest.room = null;
    rooms.delete(code);
  } else if (room.guest === ws) {
    room.guest = null;
    send(room.host, { t: 'peer', state: 'left' });
  }
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (buf) => {
    let m;
    try { m = JSON.parse(buf.toString()); } catch { return; }
    switch (m.t) {
      case 'create': {
        leave(ws);
        const code = newCode();
        rooms.set(code, { host: ws, guest: null, created: Date.now() });
        ws.room = code;
        send(ws, { t: 'created', code });
        break;
      }
      case 'join': {
        leave(ws);
        const code = String(m.code || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { send(ws, { t: 'error', reason: 'not-found' }); break; }
        if (room.guest) { send(ws, { t: 'error', reason: 'full' }); break; }
        room.guest = ws;
        ws.room = code;
        send(ws, { t: 'joined', code });
        send(room.host, { t: 'peer', state: 'joined' });
        break;
      }
      case 'leave': leave(ws); break;
      case 'relay': {
        const room = rooms.get(ws.room);
        if (room) send(other(room, ws), { t: 'relay', data: m.data });
        break;
      }
      case 'ping': send(ws, { t: 'pong', at: m.at }); break;
    }
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

// Drop dead sockets so the other cat learns quickly.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* noop */ }
  }
  const now = Date.now();
  for (const [code, r] of rooms) if (!r.host && !r.guest && now - r.created > 60000) rooms.delete(code);
}, 5000);

server.listen(PORT, () => {
  console.log(`\n  にゃごろ！ server  →  http://localhost:${PORT}\n`);
});
