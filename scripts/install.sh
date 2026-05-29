#!/usr/bin/env bash

set -Eeuo pipefail

STATE_FILE="/root/naiveproxy.env"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

log() {
  printf '\033[1;32m[+]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[!]\033[0m %s\n' "$*" >&2
}

die() {
  printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2
  exit 1
}

trap 'echo "[x] Command failed: $BASH_COMMAND (line $LINENO)"; exit 1' ERR

require_root() {
  [[ "$EUID" -eq 0 ]] || die "Запусти скрипт от root"
}

check_system() {
  [[ -f /etc/os-release ]] || die "Не удалось определить ОС"

  # shellcheck disable=SC1091
  source /etc/os-release

  case "${ID:-}" in
    ubuntu|debian)
      ;;
    *)
      warn "Скрипт тестировался на Debian/Ubuntu"
      ;;
  esac

  ARCH="$(uname -m)"

  case "$ARCH" in
    x86_64)
      GO_ARCH="amd64"
      ;;
    aarch64|arm64)
      GO_ARCH="arm64"
      ;;
    *)
      die "Unsupported arch: $ARCH"
      ;;
  esac
}

check_ports() {
  for port in 80 443; do
    if ss -tln "( sport = :$port )" | tail -n +2 | grep -q .; then
      die "Порт $port уже используется"
    fi
  done
}

handle_inputs() {

  if [[ -z "${DOMAIN:-}" ]]; then
    while true; do
      read -rp "Proxy domain: " DOMAIN

      [[ "$DOMAIN" =~ ^([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$ ]] && break

      warn "Неверный домен"
    done
  fi

  if [[ -z "${EMAIL:-}" ]]; then
    while true; do
      read -rp "TLS email: " EMAIL

      [[ "$EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] && break

      warn "Неверный email"
    done
  fi

  read -rp "UI domain (Enter = skip): " UI_DOMAIN

  ADMIN_PASSWORD=""

  if [[ -n "${UI_DOMAIN:-}" ]]; then
    while true; do
      read -rp "Admin password: " ADMIN_PASSWORD

      [[ -n "$ADMIN_PASSWORD" ]] && break

      warn "Пароль не может быть пустым"
    done
  fi

  export DOMAIN
  export EMAIL
  export UI_DOMAIN
  export ADMIN_PASSWORD
}

check_dns() {
  local IP
  IP="$(curl -4 -fsSL https://api.ipify.org)"

  local DOMAIN_IP
  DOMAIN_IP="$(dig +short "$DOMAIN" A | tail -n1)"

  [[ "$IP" == "$DOMAIN_IP" ]] || die "DOMAIN не указывает на сервер"
}

save_state() {
  cat > "$STATE_FILE" <<EOF
DOMAIN=$DOMAIN
EMAIL=$EMAIL
LOGIN=$LOGIN
PASSWORD=$PASSWORD
UI_DOMAIN=$UI_DOMAIN
EOF

  chmod 600 "$STATE_FILE"
}

install_packages() {

  export DEBIAN_FRONTEND=noninteractive

  apt-get update -y

  apt-get install -y \
    git \
    build-essential \
    curl \
    wget \
    tar \
    unzip \
    openssl \
    ca-certificates \
    ufw \
    iproute2 \
    python3 \
    python3-pip \
    python3-venv
}

configure_firewall() {
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true

  ufw --force enable >/dev/null 2>&1 || true

  log "UFW configured"
}

enable_bbr() {

  cat > /etc/sysctl.d/99-naiveproxy-bbr.conf <<EOF
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
EOF

  sysctl --system >/dev/null 2>&1 || true

  log "BBR enabled"
}

install_go() {

  if command -v go >/dev/null 2>&1; then
    log "Go already installed: $(go version)"
  else
    local GO_VERSION
    GO_VERSION="$(curl -fsSL https://go.dev/VERSION?m=text | head -n1)"

    [[ "$GO_VERSION" =~ ^go ]] || die "Не удалось получить версию Go"

    log "Installing Go $GO_VERSION"

    curl -fsSL "https://go.dev/dl/${GO_VERSION}.linux-${GO_ARCH}.tar.gz" \
      -o /tmp/go.tar.gz

    rm -rf /usr/local/go

    tar -C /usr/local -xzf /tmp/go.tar.gz
  fi


  export PATH="/usr/local/go/bin:/usr/local/bin:$PATH"
  export GOPATH="/opt/go"
  export GOCACHE="/var/cache/go-build"
  export GOMODCACHE="/opt/go/pkg/mod"
  export GOBIN="/usr/local/bin"

  mkdir -p "$GOPATH" "$GOCACHE" "$GOBIN"

  log "Go ready: $(go version)"
}

install_node() {

  [[ -z "${UI_DOMAIN:-}" ]] && return 0

  if command -v node >/dev/null 2>&1; then
    log "Node already installed: $(node -v)"
    return 0
  fi

  log "Installing Node.js"

  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

  apt-get install -y nodejs

  node -v
  npm -v
}

build_caddy() {

  export PATH="/usr/local/go/bin:$PATH"
  export GOPATH="/opt/go"
  export GOCACHE="/var/cache/go-build"

  mkdir -p "$GOPATH" "$GOCACHE"

  if ! command -v xcaddy >/dev/null 2>&1; then
    go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
  fi

  if [[ -f /usr/bin/caddy ]]; then
    log "Caddy already exists"
    return 0
  fi

  log "Building Caddy"

  xcaddy build \
    --output /usr/bin/caddy \
    --with github.com/caddyserver/forwardproxy=github.com/klzgrad/forwardproxy@naive

  chmod +x /usr/bin/caddy

  /usr/bin/caddy version
}

create_web_root() {

  mkdir -p /var/www/html
  mkdir -p /var/www/react

  if [[ -f "${PROJECT_ROOT}/index.html" ]]; then
    cp "${PROJECT_ROOT}/index.html" /var/www/html/index.html
  else
    echo "Loading..." > /var/www/html/index.html
  fi

  chmod 644 /var/www/html/index.html
}

gen_token() {
  openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"
}

cleanup_root_traces() {

  log "Cleaning root leftovers..."

  rm -rf /root/go
  rm -rf /root/snap
  rm -rf /root/.cache/go-build
  rm -rf /usr/local/go-work/pkg/mod

  log "Root traces cleaned"
}

create_users_file() {

  mkdir -p /etc/caddy/users

  LOGIN="u_$(gen_token 6)"
  PASSWORD="$(gen_token 24)"

  cat > "/etc/caddy/users/${LOGIN}.conf" <<EOF
basic_auth $LOGIN $PASSWORD
EOF

  chmod 600 "/etc/caddy/users/${LOGIN}.conf"

  export LOGIN
  export PASSWORD

  save_state
}

create_env_file() {

  [[ -z "${UI_DOMAIN:-}" ]] && return 0

  local ENV_EXAMPLE="${PROJECT_ROOT}/backend/.env.example"
  local ENV_FILE="${PROJECT_ROOT}/backend/.env"

  [[ -f "$ENV_EXAMPLE" ]] || die ".env.example not found"

  cp "$ENV_EXAMPLE" "$ENV_FILE"

  sed -i "s|DOMAIN=.*|DOMAIN=${DOMAIN}|g" "$ENV_FILE"
  sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|g" "$ENV_FILE"

  log ".env created"
}

build_frontend() {

  [[ -z "${UI_DOMAIN:-}" ]] && return 0

  local FRONTEND_DIR="${PROJECT_ROOT}/frontend"

  [[ -d "$FRONTEND_DIR" ]] || die "frontend folder not found"

  pushd "$FRONTEND_DIR" >/dev/null

  npm install
  npm run build

  popd >/dev/null

  rm -rf /var/www/react/*
  cp -r "${FRONTEND_DIR}/dist/"* /var/www/react/

  chmod -R 755 /var/www/react

  log "Frontend built"
}

setup_backend() {

  [[ -z "${UI_DOMAIN:-}" ]] && return 0

  local BACKEND_DIR="${PROJECT_ROOT}/backend"

  [[ -d "$BACKEND_DIR" ]] || die "backend folder not found"

  pushd "$BACKEND_DIR" >/dev/null

  if [[ ! -d ".venv" ]]; then
    python3 -m venv .venv
  fi

  # shellcheck disable=SC1091
  source .venv/bin/activate

  pip install --upgrade pip

  pip install -r requirements.txt

  deactivate

  popd >/dev/null

  log "Backend prepared"
}

create_backend_service() {

  [[ -z "${UI_DOMAIN:-}" ]] && return 0

  cat > /etc/systemd/system/naiveproxy-backend.service <<EOF
[Unit]
Description=NaiveProxy Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_ROOT}/backend

ExecStart=${PROJECT_ROOT}/backend/.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000

Restart=always
RestartSec=5

User=root
Group=root

Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload

  systemctl enable naiveproxy-backend

  systemctl restart naiveproxy-backend

  log "Backend systemd service created"
}

create_caddyfile() {

  mkdir -p /etc/caddy

  cat > /etc/caddy/Caddyfile <<EOF
{
    order forward_proxy before file_server
}
EOF

  if [[ -n "${UI_DOMAIN:-}" ]]; then

cat >> /etc/caddy/Caddyfile <<EOF

${UI_DOMAIN} {

    tls ${EMAIL}

    handle_path /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    root * /var/www/react

    file_server
}
EOF

  fi

cat >> /etc/caddy/Caddyfile <<EOF

:443, ${DOMAIN} {

    tls ${EMAIL}

    forward_proxy {
        import /etc/caddy/users/*
        hide_ip
        hide_via
        probe_resistance
    }

    file_server {
        root /var/www/html
    }
}
EOF

  caddy fmt --overwrite /etc/caddy/Caddyfile
}

create_caddy_service() {

  cat > /etc/systemd/system/caddy.service <<EOF
[Unit]
Description=Caddy
After=network-online.target
Wants=network-online.target

[Service]
Type=notify

ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile

Restart=always
RestartSec=5

LimitNOFILE=1048576

AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
}


start_services() {

  caddy validate --config /etc/caddy/Caddyfile

  systemctl enable caddy
  systemctl restart caddy

  if [[ -n "${UI_DOMAIN:-}" ]]; then
    systemctl restart naiveproxy-backend
  fi
}


main() {

  require_root

  check_system
  check_ports

  handle_inputs

  install_packages
  check_dns

  enable_bbr
  configure_firewall

  install_go
  install_node

  build_caddy

  create_web_root
  create_users_file
  create_env_file

  build_frontend
  setup_backend

  create_backend_service
  create_caddyfile
  create_caddy_service

  start_services

  cleanup_root_traces

  echo
  log "Установка завершена"
  echo

  echo "NaiveProxy:"
  echo "naive+https://${LOGIN}:${PASSWORD}@${DOMAIN}:443"

  if [[ -n "${UI_DOMAIN:-}" ]]; then
    echo
    echo "UI:"
    echo "https://${UI_DOMAIN}"
  fi
}

main "$@"
