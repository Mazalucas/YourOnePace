#!/bin/bash
# Your One Pace — instala la app Tizen en tu Samsung TV.
# Uso interactivo:  ./tv/instalar.sh
# Uso rápido:       ./tv/instalar.sh 192.168.1.35
#                   TIZEN_PROFILE=MiPerfil ./tv/instalar.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
CONFIG="$ROOT/.tv-config"
GUIDE="docs/TV_INSTALL.md"
APP="OnePaceTv1.OnePace"
TIZEN_HOME="${TIZEN_HOME:-$HOME/tizen-studio}"
SDB="$TIZEN_HOME/tools/sdb"
TIZEN="$TIZEN_HOME/tools/ide/bin/tizen"

die() {
  echo "" >&2
  echo "$1" >&2
  echo "→ Ver $GUIDE" >&2
  exit 1
}

step() {
  echo "[$1/$TOTAL] $2..."
}

ok() {
  echo "    OK"
}

TOTAL=5

echo ""
echo "Your One Pace — instalación en Samsung TV"
echo "----------------------------------------"

step 1 "Revisando requisitos"
if ! command -v node >/dev/null 2>&1; then
  die "Falta Node.js. Instalá Node 18+ (brew install node) y volvé a intentar. (${GUIDE}, paso 1)"
fi
if ! command -v zip >/dev/null 2>&1; then
  die "Falta zip. En macOS suele venir con el sistema. (${GUIDE}, paso 1)"
fi
if [[ ! -x "$TIZEN" ]]; then
  die "No encontré Tizen Studio en $TIZEN_HOME. Instalá Tizen Studio con TV Extensions. (${GUIDE}, paso 1)"
fi
if [[ ! -x "$SDB" ]]; then
  die "No encontré sdb en $SDB. Reinstalá las TV Extensions en Tizen Studio. (${GUIDE}, paso 1)"
fi
ok

step 2 "Datos de tu tele"
SAVED_TV=""
SAVED_PROFILE=""
if [[ -f "$CONFIG" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG" 2>/dev/null || true
  SAVED_TV="${TV_IP:-}"
  SAVED_PROFILE="${TIZEN_PROFILE:-}"
fi

if [[ -n "${1:-}" ]]; then
  TV="$1"
elif [[ -n "$SAVED_TV" ]]; then
  read -r -p "IP de la tele [$SAVED_TV]: " TV_INPUT
  TV="${TV_INPUT:-$SAVED_TV}"
else
  read -r -p "IP de la tele: " TV
fi
TV="${TV//[[:space:]]/}"
if [[ ! "$TV" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
  die "IP inválida: \"$TV\". Anotala desde Ajustes → Red en la tele. (${GUIDE}, paso 3)"
fi

PROFILE="${TIZEN_PROFILE:-}"
if [[ -z "$PROFILE" ]]; then
  if [[ -n "$SAVED_PROFILE" ]]; then
    read -r -p "Perfil de certificado Samsung [$SAVED_PROFILE]: " PROFILE_INPUT
    PROFILE="${PROFILE_INPUT:-$SAVED_PROFILE}"
  else
    read -r -p "Nombre del perfil de certificado en Tizen Studio: " PROFILE
  fi
fi
PROFILE="${PROFILE//[[:space:]]/}"
if [[ -z "$PROFILE" ]]; then
  die "El perfil de certificado no puede estar vacío. Creá uno en Certificate Manager. (${GUIDE}, paso 4)"
fi

{
  echo "TV_IP=$TV"
  echo "TIZEN_PROFILE=$PROFILE"
} >"$CONFIG"
echo "    Tele: $TV · Perfil: $PROFILE"
SER="$TV:26101"

step 3 "Armando paquete"
node --check app/tv.js
mkdir -p dist && rm -rf dist/signed dist/OnePace-unsigned.wgt
(cd app && zip -qr ../dist/OnePace-unsigned.wgt config.xml index.html tv.js tv.css icon.png)
OUT=$("$TIZEN" package -t wgt -s "$PROFILE" -o "$ROOT/dist/signed" -- "$ROOT/dist/OnePace-unsigned.wgt" 2>&1) || true
if ! echo "$OUT" | grep -q "created successfully"; then
  echo "$OUT" >&2
  die "La firma falló. Revisá el perfil \"$PROFILE\" y el certificado Samsung. (${GUIDE}, paso 4)"
fi
mv dist/signed/OnePace-unsigned.wgt dist/OnePace.wgt
rmdir dist/signed 2>/dev/null || true
ok

step 4 "Conectando a la tele"
"$SDB" disconnect "$SER" >/dev/null 2>&1 || true
if ! "$SDB" connect "$SER" 2>&1 | grep -qiE 'connected|already'; then
  CONNECT_OUT=$("$SDB" connect "$SER" 2>&1 || true)
  if ! "$SDB" devices 2>/dev/null | grep -q "$TV"; then
    echo "$CONNECT_OUT" >&2
    die "La tele no responde en $SER. ¿Está encendida y en modo desarrollador? (${GUIDE}, paso 2)"
  fi
fi
ok

step 5 "Instalando y abriendo"
R="/home/owner/share/tmp/sdk_tools/OnePace-$(date +%s).wgt"
"$SDB" -s "$SER" push dist/OnePace.wgt "$R" >/dev/null
OUT=$("$SDB" -s "$SER" shell 0 vd_appinstall "$APP" "$R" 2>&1)
if ! echo "$OUT" | grep -q "install completed"; then
  echo "$OUT" >&2
  die "La instalación en la tele falló. (${GUIDE}, paso 5)"
fi
curl -s -m 8 -X POST "http://$TV:8001/api/v2/applications/$APP" >/dev/null 2>&1 && echo "    Abierta en la tele." || echo "    Instalada. Abrila desde el menú Apps de la tele."

echo ""
echo "Listo. Para actualizar más adelante, corré de nuevo: ./tv/instalar.sh"
echo ""