# Mis juegos en el navegador

Esta carpeta tiene tres partes:

- **inigames (la web):** el catálogo donde están todos tus juegos. Ya trae **Re-Volt Barrio** y **Apex 25**.
- **Parte 1:** convierte tus propios discos (ISO) de PS2 y PSP en páginas que se juegan en el navegador, con los motores open source [ps2-web-recomp](https://github.com/snuri00/ps2-web-recomp) y [psp-web-recomp](https://github.com/snuri00/psp-web-recomp). Funciona seguro con los 4 juegos que los autores probaron; con el resto depende.
- **Parte 2 (a medio armar):** un servidor de salas y un cliente de netplay para jugar de a dos por internet.

No incluye ningún juego. Necesitás tus propios discos, copiados a ISO desde tus originales.

## inigames: la web con todos tus juegos

Está en la carpeta `inigames/`. Es un solo archivo (`index.html`), así que funciona en cualquier hosting estático.

**Verla en tu PC:**

```bash
./inigames.sh        # abrí http://localhost:8700/
```

**Publicarla:** arrastrá la carpeta `inigames/` a Netlify (o subila a Vercel). Publicada, muestra solo tus juegos propios.

**Sumar un juego tuyo:** abrí `inigames/index.html`, buscá la lista `JUEGOS` y copiá uno de los bloques. Cambiás `titulo`, `url`, `desc`, los colores y las etiquetas.

**Tus discos (PS2 y PSP):** al correr `./agregar-juego.sh nombre juegos/archivo.iso "Título"`, el juego se anota solo en `inigames/biblioteca-local.json`. La sección **Mis discos** aparece únicamente cuando abrís la web en tu propia PC (`localhost`, o con `?local` al final de la dirección). Ahí tenés **Copiar comando** y **Abrir**, y un acceso a la sala de amigos.

Esos juegos corren desde tu computadora y con tus ISO, por eso no aparecen en la versión publicada. Los propios motores piden no publicar los juegos generados.

## Antes de empezar: qué dicen los dos motores

Leí los README de [ps2-web-recomp](https://github.com/snuri00/ps2-web-recomp) y [psp-web-recomp](https://github.com/snuri00/psp-web-recomp). Lo importante:

- **Solo hay 4 juegos confirmados:** Gran Turismo 4 y God of War II (PS2), God of War: Chains of Olympus y Ghost of Sparta (PSP). El propio autor avisa que otro juego "con mucha probabilidad" se va a frenar en una función del sistema que nadie implementó todavía, o va a usar algo de los gráficos que el motor no maneja.
- **Para FIFA Street, Tekken, NFS y compañía no hay garantía.** Hacer que arranquen es trabajo de programación sobre el motor (agregar funciones faltantes, corregir bugs), no solo correr el script. Los sitios que viste seguramente hicieron ese trabajo, y no está en el repositorio.
- **Linux x86-64:** es donde se probó todo. En Windows usá WSL2 (no verificado por los autores). macOS está sin probar.
- **No publiques lo que generan.** El código C++ y el WebAssembly resultantes son traducciones del juego, así que pertenecen a sus dueños: guardalos en tu PC y no los subas a Netlify, Vercel ni a ningún hosting. Por eso inigames solo publica tus juegos propios.
- **WebGPU en Linux:** en Chrome hay que activar `chrome://flags/#enable-unsafe-webgpu` y `chrome://flags/#enable-vulkan` y reiniciar. En Windows y macOS ya viene activado.

## Subir la web a GitHub, Netlify o Vercel

El repositorio incluye `.gitignore` para que **nunca se suban** tus ISO, los motores ni los juegos generados (`engine/`, `engine-psp/`, `juegos/`). Antes de cada commit, revisá con `git status` que no aparezca nada de eso.

`netlify.toml` y `vercel.json` hacen que, al conectar el repositorio, se publique solo la carpeta `inigames/`.

Si trabajás desde Windows con WSL, la primera vez corré `chmod +x *.sh` dentro de la carpeta (Windows no guarda el permiso de ejecución). Conviene que el motor se descargue en el disco de WSL y no en `/mnt/c/...`, que es mucho más lento.

## Qué necesitás

- **Chrome o Edge actualizados.**
- Herramientas: git, cmake, ninja, python3, node (18 o más) y un compilador C++20 (clang). `./setup.sh` revisa todo y te dice qué falta.
- **PS2:** unos 300 MB por juego, y 7-Zip si tu ISO viene en .7z.
- **PSP:** unos 2 GB por juego, más una herramienta que desencripte el `EBOOT.BIN` (por ejemplo pspdecrypt o DecEboot; PPSSPP también puede volcar uno ya desencriptado). Además, `libegl-dev` y `libgles-dev` en Ubuntu/Debian.

## Parte 1: jugar solo

### Juegos de PS2

```bash
./setup.sh                                          # descarga el motor
cp /ruta/a/tu/juego.iso juegos/
./agregar-juego.sh gt4 juegos/juego.iso "Gran Turismo 4"    # unos minutos
./jugar.sh gt4                                      # abre http://localhost:8620/
```

### Juegos de PSP

```bash
./setup-psp.sh                                      # descarga el motor de PSP y sus herramientas
cp /ruta/a/tu/juego.iso juegos/
PSP_DECRYPT=/ruta/a/pspdecrypt ./agregar-psp.sh gow-chains juegos/juego.iso "God of War: Chains of Olympus"
./jugar.sh gow-chains                               # abre http://localhost:8613/
```

### Comandos útiles

- `./jugar.sh` sin nombre lista los juegos que ya agregaste (marcados PS2 o PSP).
- El nombre corto solo puede tener minúsculas, números, `-` y `_`.
- Se juega de a un juego por vez en cada plataforma (PS2 usa el puerto 8620 y PSP el 8613).
- Cada juego se anota solo en la web inigames (sección **Mis discos**).

### Controles (según los autores)

Teclado en PS2: Z = cruz, X = círculo, A = cuadrado, S = triángulo, Q W 1 2 = gatillos, Enter = start, Backspace = select, flechas = cruceta, I J K L = stick izquierdo. Los mandos funcionan por el gamepad del navegador, en celular hay controles táctiles y **F** activa pantalla completa.

### Partidas guardadas

En PS2 el progreso se guarda en una tarjeta de memoria dentro del navegador, para la dirección desde la que jugás (`localhost:8620`). Con **Export card** la bajás como archivo `.ps2` y con **Import card** la volvés a cargar.

### Si un juego no arranca

- En PS2 buscá en la salida del motor líneas como `[sys] unhandled syscall` o `[iop] missing <biblioteca> #<n>`. En PSP, `[hle] unimplemented ...`.
- `engine/games/<nombre>/shots` guarda capturas de la última corrida: es la forma más rápida de ver hasta dónde llega.
- En PSP, `engine-psp/docs/internals.md` explica cómo averiguar qué falta.
- Si me pegás el error, te ayudo a interpretarlo.

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

El servidor y el cliente funcionan, pero **todavía no están conectados al motor**. Yo no pude abrir el código fuente del motor (GitHub bloquea el acceso automático al árbol de archivos), así que esta parte la tenés que hacer vos tras correr `./setup.sh` y abrir `engine/`. Según el README del motor, los mandos entran por el teclado, el gamepad del navegador y los controles táctiles, y la emulación corre en un *worker*; ahí es donde hay que buscar. Los pasos:

1. **Encontrar dónde el motor lee los mandos.** Buscá en `engine/host/` y `engine/web/` el código que lee el teclado o el gamepad y se lo pasa a la consola en cada fotograma (probablemente algo con `gamepad`, `pad` o `input`).
2. **Intercalar el cliente.** Antes de avanzar un fotograma:
   ```js
   net.submitLocal(frame, misBotones);
   const pads = net.inputsFor(frame);
   if (!pads) return;               // esperar al rival
   setPad(0, pads.p1); setPad(1, pads.p2);
   ```
3. **Hacer el motor determinista.** Para que los dos vean el mismo partido, el motor debe dar resultados idénticos con las mismas entradas. Dos datos del README ayudan y uno complica. A favor: en PSP el tiempo del juego avanza por fotogramas, a 60 Hz constantes sin importar qué tan rápida sea la PC; los cálculos de punto flotante de la PS2 se emulan con precisión bit a bit. En contra: en PS2 la unidad vectorial 1 corre en un worker propio, en paralelo, y eso puede introducir diferencias entre una PC y otra. Con `net.reportState(frame, hash)` cada ~60 fotogramas el cliente avisa cuando se desincronizan.
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
├── setup.sh            descarga el motor de PS2 y revisa herramientas
├── setup-psp.sh        descarga el motor de PSP (opcional)
├── agregar-juego.sh    ISO de PS2 -> página web local
├── agregar-psp.sh      ISO de PSP -> página web local
├── jugar.sh            abre un juego
├── inigames.sh         abre la web inigames en tu PC
├── inigames/           la web (index.html + biblioteca-local.json)
├── juegos/             poné acá tus ISO
├── engine/             motor de PS2 (lo crea setup.sh)
├── engine-psp/         motor de PSP (lo crea setup-psp.sh)
├── tools/              registra los juegos en la web
└── online/             servidor de salas, cliente y lobby
```

## Nota

El código de este proyecto es tuyo para usar. El motor tiene su propia licencia (MIT). Los juegos pertenecen a sus dueños; usalos solo desde discos que tengas legítimamente.
