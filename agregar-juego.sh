#!/usr/bin/env bash
# Uso: ./agregar-juego.sh <nombre-corto> <ruta-a-tu.iso> ["Título para mostrar"]
# Ejemplo: ./agregar-juego.sh fifastreet2 juegos/FIFA_Street_2.iso "FIFA Street 2"
#
# Para juegos de PS2. (Para PSP usá ./agregar-psp.sh)
# Convierte tu disco en una página web local. Tarda un rato (compila el juego)
# y ocupa unos 300 MB por juego.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ $# -lt 2 ] || [ $# -gt 3 ]; then
  echo "Uso: $0 <nombre-corto> <ruta-a-tu.iso> [\"Título para mostrar\"]"
  exit 1
fi

NOMBRE="$1"
TITULO="${3:-}"
ISO="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"

case "$NOMBRE" in
  *[!a-z0-9_-]*) echo "El nombre solo puede tener minúsculas, números, - y _"; exit 1;;
esac

[ -d "$ROOT/engine" ] || { echo "Primero corre ./setup.sh"; exit 1; }
[ -f "$ISO" ] || { echo "No encuentro el archivo: $ISO"; exit 1; }

cd "$ROOT/engine"
echo "Procesando '$NOMBRE' desde $ISO ..."
scripts/port.sh "$NOMBRE" "$ISO"

# Registrar en la biblioteca local (la lee la web inigames)
cd "$ROOT"
touch juegos/lista.txt
grep -qx "$NOMBRE" juegos/lista.txt || echo "$NOMBRE" >> juegos/lista.txt
node "$ROOT/tools/registrar.js" "$ROOT/inigames/biblioteca-local.json" "$NOMBRE" "$TITULO" ps2

echo
echo "Listo: ./jugar.sh $NOMBRE"
echo "Si el juego no arranca bien, no es un error tuyo: la recompilación se"
echo "ajusta juego por juego. Corré ./jugar.sh $NOMBRE y mirá la consola del navegador (F12)."
