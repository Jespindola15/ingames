#!/usr/bin/env bash
# Uso: PSP_DECRYPT=/ruta/a/herramienta ./agregar-psp.sh <nombre-corto> <ruta-a-tu.iso> ["Título"]
# Para juegos de PSP (usa psp-web-recomp). Ocupa unos 2 GB por juego.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ $# -lt 2 ] || [ $# -gt 3 ]; then
  echo "Uso: PSP_DECRYPT=/ruta/a/herramienta $0 <nombre-corto> <ruta-a-tu.iso> [\"Título\"]"
  exit 1
fi
NOMBRE="$1"; TITULO="${3:-}"
ISO="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"

case "$NOMBRE" in
  *[!a-z0-9_-]*) echo "El nombre solo puede tener minúsculas, números, - y _"; exit 1;;
esac
[ -d "$ROOT/engine-psp" ] || { echo "Primero corré ./setup-psp.sh"; exit 1; }
[ -f "$ISO" ] || { echo "No encuentro el archivo: $ISO"; exit 1; }
[ -n "${PSP_DECRYPT:-}" ] || { echo "Falta PSP_DECRYPT: la ruta de la herramienta que desencripta el EBOOT.BIN (pspdecrypt, DecEboot...)."; exit 1; }

cd "$ROOT/engine-psp"
echo "Procesando '$NOMBRE' desde $ISO ..."
PSP_DECRYPT="$PSP_DECRYPT" scripts/port.sh "$NOMBRE" "$ISO"

cd "$ROOT"
touch juegos/lista-psp.txt
grep -qx "$NOMBRE" juegos/lista-psp.txt || echo "$NOMBRE" >> juegos/lista-psp.txt
node tools/registrar.js "$ROOT/inigames/biblioteca-local.json" "$NOMBRE" "$TITULO" psp

echo
echo "Listo: ./jugar.sh $NOMBRE"
echo "Si se cuelga o falla, el motor lo registra como '[hle] unimplemented ...':"
echo "falta implementar una función del sistema de la PSP (mirá engine-psp/docs/internals.md)."
