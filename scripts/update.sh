#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔄 Обновление NaiveProxy Panel..."

cd "$PROJECT_ROOT"
git pull || echo "⚠️ Не удалось выполнить git pull (возможно, вы копировали файлы вручную)"

echo "📦 Сборка Frontend..."
cd "$PROJECT_ROOT/frontend"
npm install
npm run build
rm -rf /var/www/react/*
cp -r dist/* /var/www/react/
chmod -R 755 /var/www/react

echo "🛡️ Проверка установки TrustTunnel..."
if [ ! -d /opt/trusttunnel ]; then
  echo "Устанавливаем TrustTunnel..."
  curl -fsSL https://raw.githubusercontent.com/TrustTunnel/TrustTunnel/refs/heads/master/scripts/install.sh | sh -s -- -a y || true
  
  if [ -d /opt/trusttunnel ]; then
    cd /opt/trusttunnel && rm -f vpn.toml hosts.toml credentials.toml rules.toml || true
    
    # Пытаемся получить DOMAIN из .env
    DOMAIN="localhost"
    if [ -f /root/naiveproxy.env ]; then
        source /root/naiveproxy.env
    fi
    
    ./setup_wizard -m non-interactive -a 0.0.0.0:8443 -c admin:adminpass -n $DOMAIN --cert-type self-signed --lib-settings vpn.toml --hosts-settings hosts.toml || true
    
    cat <<EOF > /etc/systemd/system/trusttunnel.service
[Unit]
Description=TrustTunnel Endpoint Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/trusttunnel
ExecStart=/opt/trusttunnel/trusttunnel_endpoint /opt/trusttunnel/vpn.toml /opt/trusttunnel/hosts.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable --now trusttunnel
  fi
fi

echo "⚙️ Обновление Backend..."
cd "$PROJECT_ROOT/backend"
if [ -d ".venv" ]; then
    source .venv/bin/activate
    pip install -r requirements.txt
    deactivate
fi

echo "🚀 Перезапуск сервисов..."
systemctl restart naiveproxy-backend
systemctl reload caddy
systemctl restart trusttunnel || true

echo "✅ Обновление успешно завершено!"
