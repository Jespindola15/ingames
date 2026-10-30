# Mis juegos en el navegador

Esta carpeta tiene dos partes:

- **Parte 1 (lista para usar):** convierte tus propios discos (ISO) de PS2 en páginas que se juegan en el navegador, usando el motor open source [ps2-web-recomp](https://github.com/snuri00/ps2-web-recomp).
- **Parte 2 (a medio armar):** un servidor de salas y un cliente de netplay para jugar de a dos por internet.

No incluye ningún juego. Necesitás tus propios discos, copiados a ISO desde tus originales.

## Qué necesitás

- Una PC con **Chrome o Edge actualizados** (hace falta WebGPU).
- Linux, macOS o Windows con **WSL2**.
- Herramientas: git, cmake, ninja, python3, node (18 o más), un compilador C++20 (clang) y 7-Zip si tu ISO viene en .7z.
- Unos 300 MB libres por juego.

`./setup.sh` revisa todo y te dice qué falta.

## Parte 1: jugar solo

```bash
./setup.sh                                          # descarga el motor
cp /ruta/a/tu/FIFA_Street_2.iso juegos/
./agregar-juego.sh fifastreet2 juegos/FIFA_Street_2.iso   # tarda un rato
./jugar.sh fifastreet2                              # abre http://localhost:8620/
```

- `./jugar.sh` sin nombre lista los juegos que ya agregaste.
- Cada juego tiene su nombre corto (solo minúsculas, números, `-` y `_`).
- El servidor de `jugar.sh` usa el puerto 8620, así que se juega de a un juego por vez.

**Qué esperar.** El motor está probado con Gran Turismo 4 y God of War II. Con otros juegos puede haber fallas de imagen, sonido o directamente que no arranquen: la recompilación se ajusta juego por juego. Si falla, abrí la consola del navegador (F12) y mirá el último error. Los juegos de PSP usan otro proyecto, [psp-web-recomp](https://github.com/snuri00/psp-web-recomp), que no está integrado acá todavía.

## Parte 2: jugar online con un amigo

### Cómo funciona

```
 Tu PC                     Servidor de salas                  PC de tu amigo
 juego completo  ──botones──▶  (solo reenvía)  ◀──botones──  juego completo
```

Cada uno ejecuta el juego entero. Por internet viajan solo los botones de cada fotograma. Ninguna PC avanza hasta tener los botones de las dos. Eso se llama *lockstep* y es lo que usa el sitio que viste.

**Tu amigo también necesita el juego en su PC**, procesado con su propio ISO. No se sube el juego a ningún servidor.

### Qué está hecho (y probado)

| Archivo | Para qué sirve |
|---|---|
| `online/server.js` | Servidor de salas: crea salas con código de 5 letras, reenvía controles, chat y chequeos de sincronía. Sin dependencias. |
| `online/netplay-client.js` | Cliente lockstep con retraso de controles, espera si falta el rival y detección de desincronización. |
| `online/lobby.html` | Página para crear o entrar a una sala, ver la latencia y chatear. |
| `online/test.js` | Prueba automática de todo lo anterior. |

Probalo:

```bash
node online/test.js          # debe terminar con "Todo bien."
node online/server.js        # abrí http://localhost:8787 en dos pestañas
```

### Qué falta (el trabajo difícil)

El servidor y el cliente funcionan, pero **todavía no están conectados al motor**. Yo no pude ver el código fuente del motor desde acá, así que esta parte tenés que hacerla tras correr `./setup.sh` y abrir `engine/`. Los pasos:

1. **Encontrar dónde el motor lee los mandos.** Buscá en `engine/host/` y `engine/web/` el código que lee el teclado o el gamepad y se lo pasa a la consola en cada fotograma (probablemente algo con `gamepad`, `pad` o `input`).
2. **Intercalar el cliente.** Antes de avanzar un fotograma:
   ```js
   net.submitLocal(frame, misBotones);
   const pads = net.inputsFor(frame);
   if (!pads) return;               // esperar al rival
   setPad(0, pads.p1); setPad(1, pads.p2);
   ```
3. **Hacer el motor determinista.** Para que los dos vean el mismo partido, el motor debe dar resultados idénticos con las mismas entradas. Hay que revisar las fuentes de azar y de tiempo (reloj, números aleatorios, sincronización de audio) y fijarlas al número de fotograma. Si no, el partido se desincroniza. Con `net.reportState(frame, hash)` cada ~60 fotogramas el cliente avisa cuando pasa.
4. **Que el menú lo maneje el jugador 1.** El sitio de referencia hace así: el creador de la sala maneja los menús y cada jugador elige su lado. En el jugador 2 hay que ignorar los botones locales de menú o mapearlos al segundo mando.
5. **Fijar condiciones iguales:** mismo ISO, misma versión del motor, mismo navegador y resolución 1x.

Es la parte más trabajosa y no tiene garantía de éxito en todos los juegos. Si te trabás, mostrame el código de lectura de mandos y lo vemos juntos.

### Que tu amigo se conecte desde afuera

El servidor tiene que ser alcanzable por los dos. Opciones, de más fácil a más estable:

- **Túnel gratuito** desde tu PC: `cloudflared tunnel --url http://localhost:8787` (te da una dirección `https://...`; en el lobby se usa como `wss://...`).
- **Un VPS barato** con `node online/server.js`, detrás de un proxy con HTTPS.
- **Misma red** (o VPN tipo Tailscale): usás la IP local, por ejemplo `ws://192.168.1.20:8787`.

Variable útil: `ALLOWED_ORIGINS="https://mi-sitio.com"` limita qué páginas pueden usar el servidor.

### Latencia

El retraso de controles está en 3 fotogramas (unos 50 ms) en `new NetplayClient(url, { inputDelay: 3 })`. Si hay saltos, subilo a 4 o 5. Si tenés buena conexión con tu amigo, podés bajarlo a 2.

## Estructura

```
mis-juegos/
├── setup.sh            descarga el motor y revisa herramientas
├── agregar-juego.sh    ISO -> página web local
├── jugar.sh            abre un juego
├── juegos/             poné acá tus ISO
├── engine/             el motor (lo crea setup.sh)
└── online/             servidor de salas, cliente y lobby
```

## Nota

El código de este proyecto es tuyo para usar. El motor tiene su propia licencia (MIT). Los juegos pertenecen a sus dueños; usalos solo desde discos que tengas legítimamente.
