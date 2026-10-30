'use strict';
/**
 * Servidor de salas para jugar de a dos.
 * No ejecuta el juego: solo arma salas con código y retransmite mensajes
 * (controles por fotograma, chat, chequeos de sincronía) entre los dos jugadores.
 *
 * Sin dependencias: necesita solo Node 18+.   node online/server.js
 * Variables: PORT (8787), ALLOWED_ORIGINS="https://midominio.com,http://localhost:8620"
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD = 64 * 1024;
const MAX_MSGS_PER_SEC = 400; // 60 fps de controles + margen
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STATIC = {
  '/': ['lobby.html', 'text/html; charset=utf-8'],
  '/lobby.html': ['lobby.html', 'text/html; charset=utf-8'],
  '/netplay-client.js': ['netplay-client.js', 'text/javascript; charset=utf-8'],
};

function frame(op, payload) {
  const len = payload.length;
  let header;
  if (len < 126) header = Buffer.from([0x80 | op, len]);
  else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | op; header[1] = 126; header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | op; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function send(sock, obj) {
  if (!sock || sock.destroyed || !sock.writable) return;
  sock.write(frame(0x1, Buffer.from(JSON.stringify(obj))));
}

/** Lee frames WebSocket de un socket crudo y entrega mensajes de texto. */
function attach(sock, onMessage, onClose) {
  let buf = Buffer.alloc(0);
  let frags = [];
  let fragBytes = 0;
  let fragOp = 0;

  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const op = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2); off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2)); off = 10;
      }
      if (!masked || len > MAX_PAYLOAD) return sock.destroy();
      if (buf.length < off + 4 + len) return;
      const mask = buf.subarray(off, off + 4);
      off += 4;
      const payload = Buffer.from(buf.subarray(off, off + len));
      for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
      buf = buf.subarray(off + len);

      if (op === 0x8) { sock.end(frame(0x8, Buffer.alloc(0))); return; }
      if (op === 0x9) { sock.write(frame(0xA, payload)); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x2) { fragOp = op; frags = [payload]; fragBytes = len; }
      else if (op === 0x0) { frags.push(payload); fragBytes += len; }
      if (fragBytes > MAX_PAYLOAD) return sock.destroy();
      if (fin && fragOp === 0x1) {
        const text = Buffer.concat(frags).toString('utf8');
        frags = []; fragBytes = 0;
        onMessage(text);
      }
    }
  });
  sock.on('close', onClose);
  sock.on('error', () => sock.destroy());
}

function start(port = process.env.PORT || 8787) {
  const rooms = new Map(); // codigo -> { host, guest }
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

  function newCode() {
    for (;;) {
      let c = '';
      const bytes = crypto.randomBytes(5);
      for (const b of bytes) c += ALPHABET[b % ALPHABET.length];
      if (!rooms.has(c)) return c;
    }
  }

  function leave(sock) {
    const code = sock.room;
    if (!code) return;
    sock.room = null;
    const room = rooms.get(code);
    if (!room) return;
    const peer = room.host === sock ? room.guest : room.host;
    if (peer) { send(peer, { t: 'peer-left' }); peer.room = null; }
    rooms.delete(code);
  }

  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
    const entry = STATIC[url];
    if (!entry) { res.writeHead(404); return res.end('No encontrado'); }
    fs.readFile(path.join(__dirname, entry[0]), (err, data) => {
      if (err) { res.writeHead(500); return res.end('Error'); }
      res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });

  server.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key'];
    const origin = req.headers.origin;
    if (!key || (allowed.length && origin && !allowed.includes(origin))) {
      sock.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      return sock.destroy();
    }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    sock.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    sock.setNoDelay(true); // baja latencia: no juntar paquetes chicos
    sock.room = null;

    let count = 0;
    const timer = setInterval(() => { count = 0; }, 1000);

    attach(sock, (text) => {
      if (++count > MAX_MSGS_PER_SEC) return sock.destroy();
      let m;
      try { m = JSON.parse(text); } catch { return send(sock, { t: 'error', code: 'bad-message' }); }
      if (!m || typeof m.t !== 'string') return send(sock, { t: 'error', code: 'bad-message' });

      switch (m.t) {
        case 'create': {
          leave(sock);
          const code = newCode();
          rooms.set(code, { host: sock, guest: null });
          sock.room = code;
          return send(sock, { t: 'created', room: code, player: 1 });
        }
        case 'join': {
          const code = String(m.room || '').toUpperCase().trim();
          const room = rooms.get(code);
          if (!room) return send(sock, { t: 'error', code: 'no-room' });
          if (room.guest) return send(sock, { t: 'error', code: 'room-full' });
          leave(sock);
          room.guest = sock;
          sock.room = code;
          send(sock, { t: 'joined', room: code, player: 2 });
          return send(room.host, { t: 'peer-joined' });
        }
        case 'ping':
          return send(sock, { t: 'pong', c: m.c });
        case 'input':   // { t, f: fotograma, b: botones }
        case 'state':   // { t, f: fotograma, h: hash del estado }  (detectar desincronización)
        case 'chat': {  // { t, text }
          const room = rooms.get(sock.room);
          if (!room) return;
          const peer = room.host === sock ? room.guest : room.host;
          if (!peer) return;
          if (m.t === 'chat') {
            return send(peer, { t: 'chat', text: String(m.text || '').slice(0, 300) });
          }
          return send(peer, m);
        }
        case 'leave':
          return leave(sock);
        default:
          return send(sock, { t: 'error', code: 'unknown-type' });
      }
    }, () => { clearInterval(timer); leave(sock); });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, rooms, port: server.address().port }));
  });
}

module.exports = { start };

if (require.main === module) {
  start().then(({ port }) => {
    console.log(`Servidor de salas escuchando en http://localhost:${port}`);
    console.log('Lobby de prueba: abrí esa dirección en el navegador.');
  });
}
