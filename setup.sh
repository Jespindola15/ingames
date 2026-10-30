#!/usr/bin/env bash
# Paso 1: descarga el motor (ps2-web-recomp) y revisa que tengas todo lo necesario.
set -euo pipefail
cd "$(dirname "$0")"

faltan=()
need() { command -v "$1" >/dev/null 2>&1 || faltan+=("$1"); }

need git
need cmake
need ninja
need python3
need node
# compilador C++20: clang es el recomendado por el proyecto
if ! command -v clang++ >/dev/null 2>&1 && ! command -v g++ >/dev/null 2>&1; then
  faltan+=("clang++ (o g++)")
fi

if [ ${#faltan[@]} -gt 0 ]; then
  echo "Te faltan estas herramientas: ${faltan[*]}"
  echo
  echo "Ubuntu/Debian:  sudo apt install git cmake ninja-build python3 nodejs clang p7zip-full"
  echo "macOS (brew):   brew install git cmake ninja python node llvm p7zip"
  echo "Windows:        usa WSL2 con Ubuntu y corre el comando de Ubuntu de arriba"
  exit 1
fi

if [ ! -d engine ]; then
  echo "Descargando el motor..."
  git clone https://github.com/snuri00/ps2-web-recomp.git engine
else
  echo "El motor ya está descargado, lo actualizo..."
  git -C engine pull --ff-only || true
fi

mkdir -p juegos
echo
echo "Listo. Siguiente paso:"
echo "  1) Copia tu ISO a la carpeta juegos/"
echo "  2) ./agregar-juego.sh fifastreet2 juegos/MiJuego.iso"
echo "  3) ./jugar.sh fifastreet2"
