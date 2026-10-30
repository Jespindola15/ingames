/**
 * Cliente de netplay por "lockstep".
 *
 * Idea: los dos jugadores ejecutan el juego completo y solo se intercambian los
 * botones de cada fotograma. Ninguna PC avanza al fotograma N hasta tener los
 * botones de AMBOS jugadores para ese fotograma.
 *
 * Para esconder la latencia se usa "input delay": lo que apretás en el fotograma
 * F se aplica en F + inputDelay, y mientras tanto el mensaje ya viajó.
 *
 * Uso típico dentro del motor (ver README, sección "Conectar el motor"):
 *
 *   const net = new NetplayClient('wss://tu-servidor');
 *   await net.connect();
 *   const { room } = await net.createRoom();     // o: await net.joinRoom('ABCDE')
 *   ...
 *   // en cada fotograma, ANTES de leer el mando:
 *   net.submitLocal(frame, miMascaraDeBotones);
 *   const pads = net.inputsFor(frame);           // { p1, p2 } o null si falta el rival
 *   if (!pads) return;                           // esperar: no avanzar el juego
 *   emulador.setPad(0, pads.p1); emulador.setPad(1, pads.p2);
 *   avanzarUnFotograma();
 */
(function (root) {
  class NetplayClient {
    constructor(url, opts = {}) {
      this.url = url;
      this.ws = null;
      this.player = 0;          // 1 = creador de la sala, 2 = invitado
      this.room = null;
      this.inputDelay = opts.inputDelay ?? 3; // fotogramas (~50 ms a 60 fps)
      this.neutral = opts.neutral ?? 0;       // máscara de botones "sin apretar"
      this.local = new Map();   // fotograma -> botones propios
      this.remote = new Map();  // fotograma -> botones del rival
      this.localState = new Map();
      this.remoteState = new Map();
      this.handlers = {};
    }

    on(ev, fn) { (this.handlers[ev] ||= []).push(fn); return this; }
    _emit(ev, data) { (this.handlers[ev] || []).forEach((fn) => fn(data)); }

    _once(types) {
      return new Promise((resolve, reject) => {
        const off = [];
        const done = (fn, v) => { off.forEach((f) => f()); fn(v); };
        for (const t of types) {
          const h = (m) => done(t === 'error' ? reject : resolve, t === 'error' ? new Error(m.code) : m);
          (this.handlers[t] ||= []).push(h);
          off.push(() => { this.handlers[t] = this.handlers[t].filter((x) => x !== h); });
        }
      });
    }

    connect() {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(this.url);
        this.ws = ws;
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('No se pudo conectar al servidor'));
        ws.onclose = () => this._emit('closed', {});
        ws.onmessage = (e) => this._onMessage(e.data);
      });
    }

    _send(obj) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); }

    _onMessage(text) {
      let m;
      try { m = JSON.parse(text); } catch { return; }
      switch (m.t) {
        case 'created': case 'joined':
          this.room = m.room; this.player = m.player; break;
        case 'input':
          this.remote.set(m.f, m.b); break;
        case 'state': {
          this.remoteState.set(m.f, m.h);
          this._checkDesync(m.f);
          break;
        }
        case 'peer-left':
          this.room = null; break;
      }
      this._emit(m.t, m);
    }

    async createRoom() { this._send({ t: 'create' }); return this._once(['created', 'error']); }
    async joinRoom(code) { this._send({ t: 'join', room: code }); return this._once(['joined', 'error']); }
    leave() { this._send({ t: 'leave' }); this.room = null; this.local.clear(); this.remote.clear(); }
    chat(text) { this._send({ t: 'chat', text }); }

    /** Milisegundos de ida y vuelta al servidor. */
    ping() {
      return new Promise((resolve) => {
        const t0 = performance.now();
        this._once(['pong']).then(() => resolve(Math.round(performance.now() - t0)));
        this._send({ t: 'ping', c: t0 });
      });
    }

    /** Guarda y envía tus botones del fotograma `frame` (se aplican en frame + inputDelay). */
    submitLocal(frame, buttons) {
      const target = frame + this.inputDelay;
      this.local.set(target, buttons);
      this._send({ t: 'input', f: target, b: buttons });
    }

    /**
     * Botones de ambos jugadores para `frame`, ordenados como P1/P2 de la consola.
     * Devuelve null si todavía falta el input del rival (el juego debe esperar).
     */
    inputsFor(frame) {
      // Los primeros `inputDelay` fotogramas no tienen datos de nadie: se usan botones neutros.
      const warmup = frame < this.inputDelay;
      const mine = warmup ? this.neutral : this.local.get(frame);
      const theirs = warmup ? this.neutral : this.remote.get(frame);
      if (mine === undefined || theirs === undefined) return null;
      this._prune(frame);
      return this.player === 1 ? { p1: mine, p2: theirs } : { p1: theirs, p2: mine };
    }

    /** Cada ~60 fotogramas enviá un hash del estado para detectar desincronización. */
    reportState(frame, hash) {
      this.localState.set(frame, hash);
      this._send({ t: 'state', f: frame, h: hash });
      this._checkDesync(frame);
    }

    _checkDesync(frame) {
      const a = this.localState.get(frame);
      const b = this.remoteState.get(frame);
      if (a === undefined || b === undefined) return;
      if (a !== b) this._emit('desync', { frame, local: a, remote: b });
      this.localState.delete(frame); this.remoteState.delete(frame);
    }

    _prune(frame) {
      for (const map of [this.local, this.remote]) {
        for (const k of map.keys()) if (k < frame - 5) map.delete(k);
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { NetplayClient };
  else root.NetplayClient = NetplayClient;
})(typeof window !== 'undefined' ? window : globalThis);
