#!/usr/bin/env bash
# Uso: ./agregar-juego.sh <nombre-corto> <ruta-a-tu.iso>
# Ejemplo: ./agregar-juego.sh fifastreet2 juegos/FIFA_Street_2.iso
#
# Convierte tu disco en una página web local. Tarda un rato (compila el juego)
# y ocupa unos 300 MB por juego.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ $# -ne 2 ]; then
  echo "Uso: $0 <nombre-corto> <ruta-a-tu.iso>"
  exit 1
fi

NOMBRE="$1"
ISO="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"

case "$NOMBRE" in
  *[!a-z0-9_-]*) echo "El nombre solo puede tener minúsculas, números, - y _"; exit 1;;
esac

[ -d "$ROOT/engine" ] || { echo "Primero corre ./setup.sh"; exit 1; }
[ -f "$ISO" ] || { echo "No encuentro el archivo: $ISO"; exit 1; }

cd "$ROOT/engine"
echo "Procesando '$NOMBRE' desde $ISO ..."
scripts/port.sh "$NOMBRE" "$ISO"

# Registrar en la biblioteca local
cd "$ROOT"
touch juegos/lista.txt
grep -qx "$NOMBRE" juegos/lista.txt || echo "$NOMBRE" >> juegos/lista.txt

echo
echo "Listo: ./jugar.sh $NOMBRE"
echo "Si el juego no arranca bien, no es un error tuyo: la recompilación se"
echo "ajusta juego por juego. Corré ./jugar.sh $NOMBRE y mirá la consola del navegador (F12)."
