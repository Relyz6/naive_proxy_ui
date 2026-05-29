#!/usr/bin/env bash

set -Eeuo pipefail

STATE_FILE="/root/naiveproxy.env"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log()  { printf '[+] %s\n' "$*"; }
warn() { printf '[!] %s\n' "$*" >&2; }
die()  { printf '[x] %s\n' "$*" >&2; exit 1; }

require_root() {
  [[ "$EUID" -eq 0 ]] || die "Запусти от root"
}

confirm() {
  read -r -p "$1 [y/N]: " ans
  [[ "${ans,,}" == "y" || "${ans,,}" == "yes" ]]
}

remove_caddy_service() {

  systemctl stop caddy 2>/dev/null || true
  systemctl disable caddy 2>/dev/null || true

  rm -f /etc/systemd/system/caddy.service

  systemctl daemon-reload

  log "Caddy service removed"
}

remove_backend_service() {

  systemctl stop naiveproxy-backend 2>/dev/null || true
  systemctl disable naiveproxy-backend 2>/dev/null || true

  rm -f /etc/systemd/system/naiveproxy-backend.service

  systemctl daemon-reload

  log "Backend service removed"
}

remove_caddy_binary() {

  if [[ -f /usr/bin/caddy ]]; then
    rm -f /usr/bin/caddy
    log "Caddy removed"
  fi
}

remove_xcaddy() {

  rm -f /usr/local/bin/xcaddy 2>/dev/null || true

  if [[ -d /root/go ]]; then
    if confirm "Удалить /root/go ?"; then
      rm -rf /root/go
    fi
  fi

  log "xcaddy removed"
}

remove_go() {

  if [[ -d /usr/local/go ]]; then
    rm -rf /usr/local/go
    log "Go removed"
  fi
}

remove_caddy_config() {

  rm -rf /etc/caddy

  log "/etc/caddy removed"
}

remove_state() {

  rm -f "$STATE_FILE" 2>/dev/null || true

  log "State removed"
}

remove_web_root() {

  rm -rf /var/www/html

  log "/var/www/html removed"
}

remove_react_build() {

  rm -rf /var/www/react

  log "/var/www/react removed"
}

remove_backend() {

  if [[ -d "$PROJECT_ROOT/backend" ]]; then
    if confirm "Удалить backend directory?"; then
      rm -rf "$PROJECT_ROOT/backend"
      log "Backend removed"
    fi
  fi
}

remove_frontend() {

  if [[ -d "$PROJECT_ROOT/frontend" ]]; then
    if confirm "Удалить frontend directory?"; then
      rm -rf "$PROJECT_ROOT/frontend"
      log "Frontend removed"
    fi
  fi
}

remove_node_modules() {

  if [[ -d "$PROJECT_ROOT/frontend/node_modules" ]]; then
    if confirm "Удалить node_modules?"; then
      rm -rf "$PROJECT_ROOT/frontend/node_modules"
      log "node_modules removed"
    fi
  fi
}

remove_firewall() {

  ufw delete allow 80/tcp 2>/dev/null || true
  ufw delete allow 443/tcp 2>/dev/null || true

  if confirm "Disable UFW completely?"; then
    ufw disable || true
  fi

  log "Firewall cleaned"
}

full_cleanup() {

  remove_backend_service
  remove_caddy_service

  remove_caddy_binary
  remove_xcaddy
  remove_go

  remove_caddy_config

  remove_backend
  remove_frontend

  remove_react_build
  remove_web_root

  remove_state

  remove_firewall
}

menu() {

  echo
  echo "=== UNINSTALL MENU ==="
  echo "1) Remove Caddy service"
  echo "2) Remove Backend service"
  echo "3) Remove Caddy binary"
  echo "4) Remove xcaddy"
  echo "5) Remove Go"
  echo "6) Remove /etc/caddy"
  echo "7) Remove state"
  echo "8) Remove /var/www/html"
  echo "9) Remove /var/www/react"
  echo "10) Remove backend"
  echo "11) Remove frontend"
  echo "12) Remove node_modules"
  echo "13) Remove firewall rules"
  echo "14) FULL CLEANUP"
  echo "0) Exit"
  echo
}

main() {

  require_root

  while true; do

    menu

    read -r -p "Choice: " choice

    case "$choice" in

      1)
        remove_caddy_service
        ;;

      2)
        remove_backend_service
        ;;

      3)
        remove_caddy_binary
        ;;

      4)
        remove_xcaddy
        ;;

      5)
        remove_go
        ;;

      6)
        remove_caddy_config
        ;;

      7)
        remove_state
        ;;

      8)
        remove_web_root
        ;;

      9)
        remove_react_build
        ;;

      10)
        remove_backend
        ;;

      11)
        remove_frontend
        ;;

      12)
        remove_node_modules
        ;;

      13)
        remove_firewall
        ;;

      14)
        if confirm "Удалить ВСЁ?"; then
          full_cleanup
        fi
        ;;

      0)
        exit 0
        ;;

      *)
        warn "Invalid choice"
        ;;

    esac
  done
}

main "$@"
