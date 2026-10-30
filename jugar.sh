#!/usr/bin/env bash
# Uso: ./jugar.sh <nombre-corto>     (sin nombre, lista los juegos que agregaste)
# PS2 -> http://localhost:8620/     PSP -> http://localhost:8613/
# Usá Chrome o Edge actualizados.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ $# -lt 1 ]; then
  echo "Juegos disponibles:"
  [ -f "$ROOT/juegos/lista.txt" ]     && sed 's/^/  - (PS2) /' "$ROOT/juegos/lista.txt"
  [ -f "$ROOT/juegos/lista-psp.txt" ] && sed 's/^/  - (PSP) /' "$ROOT/juegos/lista-psp.txt"
  [ -f "$ROOT/juegos/lista.txt" ] || [ -f "$ROOT/juegos/lista-psp.txt" ] || echo "  (ninguno todavía, usá ./agregar-juego.sh o ./agregar-psp.sh)"
  exit 0
fi

NOMBRE="$1"
if [ -f "$ROOT/juegos/lista-psp.txt" ] && grep -qx "$NOMBRE" "$ROOT/juegos/lista-psp.txt"; then
  cd "$ROOT/engine-psp"
  echo "Abrí http://localhost:8613/ en Chrome o Edge (Ctrl+C para cerrar)"
  exec scripts/serve.sh "$NOMBRE"
fi

cd "$ROOT/engine"
[ -d "build/web-$NOMBRE" ] || { echo "'$NOMBRE' no está procesado. Corré ./agregar-juego.sh o ./agregar-psp.sh primero."; exit 1; }
echo "Abrí http://localhost:8620/ en Chrome o Edge (Ctrl+C para cerrar)"
exec python3 scripts/serve.py "build/web-$NOMBRE" "games/$NOMBRE/disc.iso"
