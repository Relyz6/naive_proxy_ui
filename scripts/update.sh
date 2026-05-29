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

echo "✅ Обновление успешно завершено!"
