#!/usr/bin/env bash
# Uso: ./jugar.sh <nombre-corto>     (sin nombre, lista los juegos que agregaste)
# Abre el juego en http://localhost:8620/  -> usá Chrome o Edge actualizados.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ $# -lt 1 ]; then
  echo "Juegos disponibles:"
  if [ -f "$ROOT/juegos/lista.txt" ]; then sed 's/^/  - /' "$ROOT/juegos/lista.txt"; else echo "  (ninguno todavía, usá ./agregar-juego.sh)"; fi
  exit 0
fi

NOMBRE="$1"
cd "$ROOT/engine"
[ -d "build/web-$NOMBRE" ] || { echo "'$NOMBRE' no está procesado. Corré ./agregar-juego.sh primero."; exit 1; }

echo "Abrí http://localhost:8620/ en Chrome o Edge (Ctrl+C para cerrar)"
exec python3 scripts/serve.py "build/web-$NOMBRE" "games/$NOMBRE/disc.iso"
