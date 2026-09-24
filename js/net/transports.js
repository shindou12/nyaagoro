// Transports carry opaque JSON between the two cats of a room.
//  - WsTransport:   our tiny room server (server/server.js)
//  - PeerTransport: WebRTC via PeerJS public broker (works on static hosting)
// Both expose: create() -> code, join(code), send(obj), leave(),
// and callbacks onPeer(state), onData(obj), onClose(reason).

const CODE_CHARS = 'ACDEFHJKMNPRTWXY34679';
const noop = () => {};

export class WsTransport {
  constructor(url) {
    this.url = url || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    this.label = 'ルームサーバー接続';
    this.onPeer = noop; this.onData = noop; this.onClose = noop;
    this.ws = null;
    this.waiters = [];
  }
  static probe(ms = 1500) {
    return new Promise((res) => {
      if (location.protocol === 'file:') { res(false); return; }
      let ws;
      const done = (v) => { clearTimeout(tm); try { ws && ws.close(); } catch { /* */ } res(v); };
      const tm = setTimeout(() => done(false), ms);
      try {
        ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
        ws.onopen = () => done(true);
        ws.onerror = () => done(false);
      } catch { done(false); }
    });
  }
  open() {
    if (this.ws && this.ws.readyState === 1) return Promise.resolve();
    return new Promise((res, rej) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      const tm = setTimeout(() => rej(new Error('timeout')), 5000);
      ws.onopen = () => { clearTimeout(tm); res(); };
      ws.onerror = () => { clearTimeout(tm); rej(new Error('connect')); };
      ws.onclose = () => { if (this.ws === ws) { this.ws = null; this.onClose('server'); } };
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.t === 'relay') this.onData(m.data);
        else if (m.t === 'peer') this.onPeer(m.state, m.reason);
        else { const w = this.waiters.shift(); if (w) w(m); }
      };
    });
  }
  request(msg) {
    return new Promise((res) => { this.waiters.push(res); this.ws.send(JSON.stringify(msg)); });
  }
  async create() {
    await this.open();
    const m = await this.request({ t: 'create' });
    if (m.t !== 'created') throw new Error(m.reason || 'create');
    return m.code;
  }
  async join(code) {
    await this.open();
    const m = await this.request({ t: 'join', code });
    if (m.t !== 'joined') throw new Error(m.reason || 'join');
    return m.code;
  }
  send(data) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'relay', data })); }
  leave() {
    const ws = this.ws; this.ws = null;
    if (ws) { try { ws.send(JSON.stringify({ t: 'leave' })); } catch { /* */ } try { ws.close(); } catch { /* */ } }
  }
}

export class PeerTransport {
  constructor() {
    this.label = 'P2P接続（PeerJS）';
    this.onPeer = noop; this.onData = noop; this.onClose = noop;
    this.peer = null; this.conn = null;
  }
  static available() { return typeof window.Peer === 'function'; }
  pid(code) { return 'nyagoro-room-' + code.toLowerCase(); }
  create() {
    return new Promise((res, rej) => {
      let tries = 0;
      const attempt = () => {
        let code = '';
        for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
        const peer = new window.Peer(this.pid(code), { debug: 0 });
        const tm = setTimeout(() => { peer.destroy(); rej(new Error('timeout')); }, 9000);
        peer.on('open', () => { clearTimeout(tm); this.peer = peer; this.listen(); res(code); });
        peer.on('error', (err) => {
          clearTimeout(tm);
          if (err.type === 'unavailable-id' && tries++ < 5) { peer.destroy(); attempt(); }
          else if (!this.peer) rej(err);
          else if (err.type === 'network' || err.type === 'server-error') this.onClose('broker');
        });
      };
      attempt();
    });
  }
  listen() {
    this.peer.on('connection', (conn) => {
      if (this.conn && this.conn.open) { conn.on('open', () => { conn.send({ __full: true }); setTimeout(() => conn.close(), 300); }); return; }
      this.bindConn(conn, true);
    });
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch { /* */ } });
  }
  bindConn(conn, asHost) {
    this.conn = conn;
    conn.on('open', () => { if (asHost) this.onPeer('joined'); });
    conn.on('data', (d) => { if (d && d.__full) return; this.onData(d); });
    conn.on('close', () => { if (this.conn === conn) { this.conn = null; this.onPeer('left'); } });
    conn.on('error', () => {});
  }
  join(code) {
    return new Promise((res, rej) => {
      const peer = new window.Peer(undefined, { debug: 0 });
      this.peer = peer;
      const tm = setTimeout(() => rej(new Error('not-found')), 10000);
      peer.on('open', () => {
        const conn = peer.connect(this.pid(code), { reliable: true, serialization: 'json' });
        conn.on('open', () => { clearTimeout(tm); this.bindConn(conn, false); res(code); });
        conn.on('data', (d) => { if (d && d.__full) { clearTimeout(tm); rej(new Error('full')); } });
      });
      peer.on('error', (err) => {
        clearTimeout(tm);
        if (err.type === 'peer-unavailable') rej(new Error('not-found'));
        else rej(err);
      });
    });
  }
  send(data) { if (this.conn && this.conn.open) this.conn.send(data); }
  leave() {
    try { this.conn && this.conn.close(); } catch { /* */ }
    try { this.peer && this.peer.destroy(); } catch { /* */ }
    this.conn = null; this.peer = null;
  }
}

/** Pick the best available transport: our server if present, else P2P. */
export async function pickTransport() {
  if (await WsTransport.probe()) return new WsTransport();
  if (PeerTransport.available()) return new PeerTransport();
  return null;
}
