#!/usr/bin/env bash
# Abre la web inigames en tu PC (con la sección "Mis discos" visible).
# Uso: ./inigames.sh   ->  http://localhost:8700/
set -euo pipefail
cd "$(dirname "$0")/inigames"
echo "inigames en http://localhost:8700/  (Ctrl+C para cerrar)"
exec python3 -m http.server 8700 --bind 127.0.0.1
