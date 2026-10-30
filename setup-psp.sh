#!/usr/bin/env bash
# Instala el motor de PSP (psp-web-recomp). Hacelo solo si vas a usar juegos de PSP.
set -euo pipefail
cd "$(dirname "$0")"

for c in git cmake ninja python3; do
  command -v "$c" >/dev/null 2>&1 || { echo "Te falta: $c  (corré primero ./setup.sh para ver cómo instalar todo)"; exit 1; }
done

if [ ! -d engine-psp ]; then
  git clone https://github.com/snuri00/psp-web-recomp.git engine-psp
else
  git -C engine-psp pull --ff-only || true
fi

echo "Preparando PSPRecomp y Emscripten (puede tardar y descarga varios archivos)..."
( cd engine-psp && scripts/setup.sh )

echo
echo "Listo. Los discos de PSP vienen encriptados: necesitás una herramienta que los"
echo "desencripte (por ejemplo pspdecrypt o DecEboot) y pasar su ruta en PSP_DECRYPT."
echo "Después:  PSP_DECRYPT=/ruta/a/la/herramienta ./agregar-psp.sh nombre juegos/MiJuego.iso"
