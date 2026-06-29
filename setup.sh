#!/usr/bin/env bash
# setup.sh — instala dependencias del sistema y arranca el sistema dental
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { echo -e "\033[1;36m▶ $*\033[0m"; }
ok()   { echo -e "\033[1;32m✔ $*\033[0m"; }
warn() { echo -e "\033[1;33m⚠ $*\033[0m"; }
die()  { echo -e "\033[1;31m✖ $*\033[0m" >&2; exit 1; }

# ── Paquetes del sistema ──────────────────────────────────────────────────────

MISSING=()
command -v node  &>/dev/null || MISSING+=(nodejs)
command -v npm   &>/dev/null || MISSING+=(npm)
command -v psql  &>/dev/null || MISSING+=(postgresql)

if [[ ${#MISSING[@]} -gt 0 ]]; then
  log "Instalando paquetes faltantes: ${MISSING[*]}"
  sudo pacman -S --noconfirm --needed "${MISSING[@]}"
  ok "Paquetes instalados"
else
  ok "node, npm y psql ya están instalados"
fi

# ── PostgreSQL ────────────────────────────────────────────────────────────────

PG_DATA=/var/lib/postgres/data

if [[ ! -f "$PG_DATA/PG_VERSION" ]]; then
  log "Inicializando clúster PostgreSQL en $PG_DATA ..."
  sudo -u postgres initdb --locale=C --encoding=UTF8 -D "$PG_DATA"
  ok "Clúster inicializado"
fi

if ! systemctl is-active --quiet postgresql; then
  log "Habilitando e iniciando postgresql.service ..."
  sudo systemctl enable --now postgresql
  # esperar hasta 15 s a que acepte conexiones
  for i in $(seq 1 15); do
    (exec 3<>/dev/tcp/localhost/5432) 2>/dev/null && exec 3>&- && break
    sleep 1
  done
fi
ok "PostgreSQL activo"

# ── Arrancar el sistema ───────────────────────────────────────────────────────

log "Lanzando start.sh ..."
exec bash "$SCRIPT_DIR/start.sh"
