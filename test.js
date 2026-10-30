'use strict';
// node online/test.js  -> prueba salas, controles, chat, sala llena y desconexión.
const assert = require('assert');
const { start } = require('./server');
const { NetplayClient } = require('./netplay-client');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { server, port } = await start(0);
  const url = `ws://localhost:${port}`;

  const a = new NetplayClient(url);
  const b = new NetplayClient(url);
  const c = new NetplayClient(url);
  await Promise.all([a.connect(), b.connect(), c.connect()]);

  // Crear y unirse
  const peerJoined = new Promise((r) => a.on('peer-joined', r));
  const created = await a.createRoom();
  assert.strictEqual(created.player, 1);
  assert.match(created.room, /^[A-Z2-9]{5}$/);
  const joined = await b.joinRoom(created.room.toLowerCase());
  assert.strictEqual(joined.player, 2);
  await peerJoined;
  console.log('ok  sala creada y rival conectado:', created.room);

  // Sala llena y sala inexistente
  await assert.rejects(c.joinRoom(created.room), /room-full/);
  await assert.rejects(c.joinRoom('ZZZZZ'), /no-room/);
  console.log('ok  sala llena y sala inexistente rechazadas');

  // Ping
  const rtt = await a.ping();
  assert.ok(rtt >= 0 && rtt < 1000);
  console.log('ok  ping', rtt, 'ms');

  // Lockstep: los dos simulan 30 fotogramas con botones distintos
  const BTN_A = 0x0010, BTN_B = 0x0200;
  const seenA = [], seenB = [];
  for (let f = 0; f < 30; f++) {
    a.submitLocal(f, BTN_A);
    b.submitLocal(f, BTN_B);
  }
  await wait(100);
  for (let f = 0; f < 30; f++) {
    const pa = a.inputsFor(f), pb = b.inputsFor(f);
    assert.ok(pa && pb, `faltan datos en el fotograma ${f}`);
    seenA.push(pa); seenB.push(pb);
  }
  // Ambos deben ver exactamente lo mismo (P1 = creador de la sala)
  assert.deepStrictEqual(seenA, seenB);
  assert.deepStrictEqual(seenA[10], { p1: BTN_A, p2: BTN_B });
  assert.deepStrictEqual(seenA[0], { p1: 0, p2: 0 }); // calentamiento
  console.log('ok  lockstep: ambos jugadores ven los mismos controles en 30 fotogramas');

  // Si el rival no mandó nada, el juego debe esperar
  a.submitLocal(100, 1);
  assert.strictEqual(a.inputsFor(103), null);
  console.log('ok  sin input del rival -> espera');

  // Desincronización
  const desync = new Promise((r) => b.on('desync', r));
  a.reportState(60, 'aaaa');
  b.reportState(60, 'bbbb');
  const d = await desync;
  assert.strictEqual(d.frame, 60);
  console.log('ok  desincronización detectada');

  // Chat
  const chat = new Promise((r) => b.on('chat', r));
  a.chat('hola');
  assert.strictEqual((await chat).text, 'hola');
  console.log('ok  chat');

  // Desconexión
  const left = new Promise((r) => a.on('peer-left', r));
  b.ws.close();
  await left;
  console.log('ok  aviso de rival desconectado');

  a.ws.close(); c.ws.close();
  server.close();
  console.log('\nTodo bien.');
  process.exit(0);
})().catch((e) => { console.error('FALLÓ:', e); process.exit(1); });
