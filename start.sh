#!/usr/bin/env bash
# start.sh — levanta el sistema dental sin Docker
# Requisitos: node, npm, psql (postgresql), curl
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"
FRONTEND="$SCRIPT_DIR/frontend"
DATA_DIR="$SCRIPT_DIR/.data/minio"
BIN_DIR="$SCRIPT_DIR/.bin"

PG_USER=dental
PG_PASS=dental
PG_DB=dental
PG_HOST=localhost
PG_PORT=5432

MINIO_USER=dentalminio
MINIO_PASS=dentalminio
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=dental-media

PIDS=()

# ── utilidades ────────────────────────────────────────────────────────────────

log()  { echo -e "\033[1;36m▶ $*\033[0m"; }
ok()   { echo -e "\033[1;32m✔ $*\033[0m"; }
warn() { echo -e "\033[1;33m⚠ $*\033[0m"; }
die()  { echo -e "\033[1;31m✖ $*\033[0m" >&2; exit 1; }

cleanup() {
  echo ""
  log "Deteniendo procesos..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null || true
  done
  ok "Sistema detenido."
}
trap cleanup EXIT INT TERM

# Comprueba si un puerto TCP acepta conexiones, usando el /dev/tcp nativo de bash
# (sin depender de `nc`, que puede no estar instalado).
port_open() {
  (exec 3<>"/dev/tcp/$PG_HOST/$1") 2>/dev/null && exec 3>&- && return 0
  return 1
}

wait_for_port() {
  local name=$1 port=$2 tries=30
  while ! port_open "$port"; do
    tries=$((tries - 1))
    [[ $tries -le 0 ]] && die "$name no levantó en el puerto $port"
    sleep 1
  done
  ok "$name disponible en :$port"
}

# ── PostgreSQL ────────────────────────────────────────────────────────────────

log "Verificando PostgreSQL..."
if ! port_open "$PG_PORT"; then
  if command -v systemctl &>/dev/null && systemctl list-unit-files postgresql.service &>/dev/null; then
    log "Iniciando postgresql.service..."
    sudo systemctl start postgresql || die "No se pudo iniciar postgresql.service"
    wait_for_port "PostgreSQL" "$PG_PORT"
  else
    die "PostgreSQL no está corriendo en :$PG_PORT y no se encontró postgresql.service"
  fi
else
  ok "PostgreSQL ya está corriendo en :$PG_PORT"
fi

log "Asegurando usuario y base de datos '$PG_DB'..."
if PGPASSWORD="$PG_PASS" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc "SELECT 1" &>/dev/null; then
  ok "Base de datos accesible como '$PG_USER' (no se requiere sudo)"
elif sudo -n true 2>/dev/null; then
  # Solo usamos sudo si está disponible sin contraseña; si no, evitamos colgar el script.
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'" \
    | grep -q 1 || sudo -u postgres psql -c "CREATE ROLE $PG_USER LOGIN PASSWORD '$PG_PASS';"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" \
    | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE $PG_DB OWNER $PG_USER;"
  ok "Base de datos lista"
else
  die "No se puede conectar a la BD como '$PG_USER' y sudo requiere contraseña. Crea el rol/BD manualmente o ejecuta el script en una terminal interactiva."
fi

# ── MinIO ─────────────────────────────────────────────────────────────────────

log "Verificando MinIO..."
MINIO_BIN=""
if command -v minio &>/dev/null; then
  MINIO_BIN="minio"
elif [[ -x "$BIN_DIR/minio" ]]; then
  MINIO_BIN="$BIN_DIR/minio"
else
  warn "minio no encontrado — descargando binario en .bin/minio ..."
  mkdir -p "$BIN_DIR"
  curl -fsSL "https://dl.min.io/server/minio/release/linux-amd64/minio" -o "$BIN_DIR/minio"
  chmod +x "$BIN_DIR/minio"
  MINIO_BIN="$BIN_DIR/minio"
  ok "minio descargado"
fi

mkdir -p "$DATA_DIR"
# MinIO (single-drive) reconoce un directorio bajo su data dir como bucket. Crearlo
# antes de arrancar garantiza el bucket sin necesidad de `mc`/`aws`.
mkdir -p "$DATA_DIR/$MINIO_BUCKET"
MINIO_ROOT_USER=$MINIO_USER MINIO_ROOT_PASSWORD=$MINIO_PASS \
  "$MINIO_BIN" server "$DATA_DIR" \
    --address ":$MINIO_PORT" \
    --console-address ":$MINIO_CONSOLE_PORT" \
    &>"$SCRIPT_DIR/.data/minio.log" &
PIDS+=($!)
ok "MinIO arrancado (PID $!)"
wait_for_port "MinIO" "$MINIO_PORT"

# Crear bucket con mc o con curl (API S3)
log "Creando bucket '$MINIO_BUCKET'..."
MC_BIN=""
if command -v mc &>/dev/null; then
  MC_BIN="mc"
elif [[ -x "$BIN_DIR/mc" ]]; then
  MC_BIN="$BIN_DIR/mc"
fi

if [[ -n "$MC_BIN" ]]; then
  "$MC_BIN" alias set local "http://localhost:$MINIO_PORT" "$MINIO_USER" "$MINIO_PASS" &>/dev/null
  "$MC_BIN" mb -p "local/$MINIO_BUCKET" 2>/dev/null || true
  "$MC_BIN" anonymous set none "local/$MINIO_BUCKET" 2>/dev/null || true
else
  # Crear bucket vía API S3 con curl + HMAC (método simple: PUT con auth v4 no es trivial;
  # usamos aws-cli si existe, si no avisamos)
  if command -v aws &>/dev/null; then
    AWS_ACCESS_KEY_ID=$MINIO_USER AWS_SECRET_ACCESS_KEY=$MINIO_PASS \
      aws --endpoint-url "http://localhost:$MINIO_PORT" s3 mb "s3://$MINIO_BUCKET" 2>/dev/null || true
  else
    warn "mc y aws-cli no encontrados. Si el bucket '$MINIO_BUCKET' no existe, las subidas fallarán."
    warn "Instala mc: https://dl.min.io/client/mc/release/linux-amd64/mc"
  fi
fi
ok "Bucket '$MINIO_BUCKET' listo"

# ── .env files ────────────────────────────────────────────────────────────────

[[ -f "$BACKEND/.env" ]]  || { log "Copiando backend/.env.example → .env"; cp "$BACKEND/.env.example" "$BACKEND/.env"; }
[[ -f "$FRONTEND/.env" ]] || { log "Copiando frontend/.env.example → .env"; cp "$FRONTEND/.env.example" "$FRONTEND/.env"; }

# ── Backend ───────────────────────────────────────────────────────────────────

log "Instalando dependencias del backend..."
(cd "$BACKEND" && npm install --silent)

log "Aplicando migraciones Prisma..."
(cd "$BACKEND" && npm run prisma:deploy 2>&1 | tail -5) || \
  warn "prisma:deploy falló — puede que necesites ejecutar 'npm run prisma:migrate -- --name init' la primera vez"

# Leer el puerto real del backend desde su .env (por defecto 3000)
BACKEND_PORT="$(grep -E '^PORT=' "$BACKEND/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '[:space:]')"
BACKEND_PORT="${BACKEND_PORT:-3000}"

log "Iniciando backend en :$BACKEND_PORT..."
(cd "$BACKEND" && npm run dev) &>"$SCRIPT_DIR/.data/backend.log" &
PIDS+=($!)
ok "Backend arrancado (PID $!)"
wait_for_port "Backend" "$BACKEND_PORT"

# ── Frontend ──────────────────────────────────────────────────────────────────

log "Instalando dependencias del frontend..."
(cd "$FRONTEND" && npm install --silent)

log "Iniciando frontend en :5173..."
(cd "$FRONTEND" && npm run dev) &>"$SCRIPT_DIR/.data/frontend.log" &
PIDS+=($!)
ok "Frontend arrancado (PID $!)"
wait_for_port "Frontend" 5173

# ── Listo ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "\033[1;32m╔══════════════════════════════════════╗"
echo -e "║   Sistema dental en marcha           ║"
echo -e "╠══════════════════════════════════════╣"
echo -e "║  Frontend   →  http://localhost:5173 ║"
echo -e "║  Backend    →  http://localhost:$BACKEND_PORT ║"
echo -e "║  MinIO UI   →  http://localhost:9001 ║"
echo -e "║                                      ║"
echo -e "║  Credenciales seed:                  ║"
echo -e "║    admin@dental.local / admin123     ║"
echo -e "╚══════════════════════════════════════╝\033[0m"
echo ""
echo "Logs en .data/backend.log  y  .data/frontend.log"
echo "Presiona Ctrl+C para detener todo."
echo ""

wait
