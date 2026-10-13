#!/usr/bin/env sh
set -eu

if ! command -v pkg >/dev/null 2>&1; then
  printf '%s\n' 'Este instalador debe ejecutarse dentro de Termux.' >&2
  exit 1
fi

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$PROJECT_DIR"

if [ ! -f package.json ] || [ ! -f .env.example ]; then
  printf '%s\n' 'No encuentro package.json o .env.example. Clona el repositorio completo e inténtalo de nuevo.' >&2
  exit 1
fi

printf '%s\n' 'Actualizando índice de paquetes de Termux...'
pkg update
pkg install -y git nodejs-lts ffmpeg nano

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
case "$NODE_MAJOR" in
  ''|*[!0-9]*)
    printf '%s\n' 'No pude determinar la versión de Node.js.' >&2
    exit 1
    ;;
esac
if [ "$NODE_MAJOR" -lt 20 ]; then
  printf 'Baileys requiere Node.js 20 o superior; se detectó %s.\n' "$(node --version)" >&2
  exit 1
fi

printf '\n%s\n' 'Configuración privada del propietario.'
printf '%s' 'Número de WhatsApp con código de país (puedes incluir +, espacios o guiones): '
IFS= read -r OWNER_INPUT
OWNER_NUMBER=$(printf '%s' "$OWNER_INPUT" | tr -cd '0-9')
OWNER_LENGTH=${#OWNER_NUMBER}
if [ "$OWNER_LENGTH" -lt 8 ] || [ "$OWNER_LENGTH" -gt 15 ]; then
  printf '%s\n' 'Número no válido: introduce entre 8 y 15 dígitos, incluido el código de país.' >&2
  exit 1
fi

umask 077
if [ ! -f .env ]; then
  cp .env.example .env
fi
ENV_TEMP=".env.tmp.$$"
awk -v owner="$OWNER_NUMBER" '
  /^BOT_OWNERS=/ { print "BOT_OWNERS=" owner; found=1; next }
  { print }
  END { if (!found) print "BOT_OWNERS=" owner }
' .env > "$ENV_TEMP"
chmod 600 "$ENV_TEMP"
mv "$ENV_TEMP" .env

printf '\n%s\n' 'Instalando dependencias npm...'
npm install

printf '\n%s\n' 'Ejecutando pruebas...'
npm test

printf '\n%s\n' 'Instalación lista. Se iniciará el bot; escanea el QR desde WhatsApp > Dispositivos vinculados.'
exec npm start