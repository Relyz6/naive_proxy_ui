# 🚀 NaiveProxy Полноценный сервер (Full Stack)

Production-ready система развёртывания:

- NaiveProxy
- Caddy
- React админ-панель
- FastAPI backend
- Автоматический TLS
- systemd сервисы
- Полная автоматизация установки и удаления

---

# ✨ Возможности

## 🔐 Ядро прокси (NaiveProxy)

- Caddy + forwardproxy (NaiveProxy модуль)
- Автоматический HTTPS (Let’s Encrypt)
- Защита от probe detection
- Пользовательская авторизация
- Безопасный TLS прокси endpoint
- Генерация пользователей

---

## 🌐 Веб-панель (React)

Современная админ-панель для управления пользователями.

Возможности:

- Создание пользователей
- Удаление пользователей
- Копирование proxy ссылок
- Показ / скрытие паролей
- Авторизация администратора
- Быстрая статическая раздача через Caddy

---

## ⚙️ Backend API (FastAPI)

Backend работает как отдельный `systemd` сервис.

Функции:

- REST API
- Управление пользователями
- Генерация proxy конфигураций
- Авторизация администратора
- Интеграция с Caddy users

---

## 🛠 Автоматизация

Установщик автоматически настраивает:

- Go
- xcaddy
- Сборку Caddy
- Node.js
- Python venv
- Сборку frontend
- Зависимости backend
- systemd сервисы
- Firewall (UFW)
- Оптимизацию TCP (BBR)

---

# 🧱 Архитектура

```text
                    ┌────────────────────┐
                    │   React Frontend   │
                    │   Админ-панель     │
                    └─────────┬──────────┘
                              │ HTTPS
                              ▼
                    ┌────────────────────┐
                    │       Caddy        │
                    │ TLS + ReverseProxy │
                    │  NaiveProxy core   │
                    └─────────┬──────────┘
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
     FastAPI Backend (systemd)        NaiveProxy endpoint
        localhost:8000                 forwardproxy module
```

---

# 📦 Требования

- Ubuntu 22.04+ / Debian
- Root доступ
- Открытые порты:
  - 80
  - 443

---

# ⚡ Перед установкой

Обязательно обновить систему и установить git:

```bash
apt update && apt upgrade -y
apt install git -y
```

---

# 📥 Установка

## Клонирование проекта

```bash
git clone https://github.com/Relyz6/naive_proxy_ui
cd naive_proxy_ui
```

---

## Запуск установщика

```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

---

# 🧭 Процесс установки

Во время установки будут запрошены:

## Домен прокси

Пример:

```text
proxy.example.com
```

Используется для NaiveProxy endpoint.

---

## Email для TLS

Пример:

```text
admin@example.com
```

Используется для сертификатов Let’s Encrypt.

---

## Домен панели (опционально)

Пример:

```text
ui.example.com
```

Если не указан:

- UI не устанавливается
- Backend не запускается

---

## Пароль администратора

Требуется только если включён UI.

---

# 🌍 Доступ после установки

## NaiveProxy

```text
naive+https://LOGIN:PASSWORD@proxy.example.com:443
```

---

## Веб-панель

```text
https://ui.example.com
```

---

## API Backend

```text
https://ui.example.com/api/users
```

---

# 👤 Пользователи

Пользователи хранятся в:

```bash
/etc/caddy/users/
```

Каждый файл содержит:

- логин
- пароль
- конфигурацию Caddy forwardproxy

---

# ⚙️ systemd сервисы

## Caddy

```bash
systemctl status caddy
```

---

## Backend

```bash
systemctl status naiveproxy-backend
```

---

## Перезапуск backend

```bash
systemctl restart naiveproxy-backend
```

---

## Логи backend

```bash
journalctl -u naiveproxy-backend -f
```

---

# 📁 Структура проекта

```text
naiveproxy/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   └── .venv/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── dist/
│
├── scripts/
│   ├── install.sh
│   └── uninstall.sh
│
├── index.html
└── README.md
```

---

# 🔧 Backend

Backend работает как systemd сервис.

## Имя сервиса

```text
naiveproxy-backend
```

---

## Управление

Запуск:

```bash
systemctl start naiveproxy-backend
```

---

Перезапуск:

```bash
systemctl restart naiveproxy-backend
```

---

Логи:

```bash
journalctl -u naiveproxy-backend -f
```

---

# 🌐 Frontend

Frontend собирается автоматически при установке.

## Папка результата

```bash
/var/www/react
```

---

## Ручная сборка

```bash
cd frontend
npm install
npm run build
```

---

# 🔐 Безопасность

## Авторизация API

Backend использует заголовок:

```text
x-admin-password
```

---

## TLS

Сертификаты автоматически выдаются через Caddy (Let’s Encrypt).

---

## Firewall

Настраиваются порты:

- 80
- 443

через UFW

---

## BBR

Включается TCP оптимизация BBR автоматически.

---

# 📄 Конфигурация

## Caddy

```bash
/etc/caddy/Caddyfile
```

---

## Пользователи

```bash
/etc/caddy/users/
```

---

## Состояние установки

```bash
/root/naiveproxy.env
```

Содержит:

```text
DOMAIN
EMAIL
LOGIN
PASSWORD
UI_DOMAIN
```

---

# 🧹 Удаление

Запуск:

```bash
chmod +x scripts/uninstall.sh
./scripts/uninstall.sh
```

---

# 🧰 Возможности удаления

Можно удалить:

- Caddy
- backend systemd сервис
- frontend
- Go
- xcaddy
- конфигурации
- firewall правила
- собранный frontend
- полная очистка системы

---

# 🚀 Производительность

Оптимизации:

- HTTP/2 и HTTP/3
- TLS ускорение
- BBR
- статическая раздача frontend
- reverse proxy через Caddy
- лёгкий FastAPI backend

---

# 🔮 Планы развития

Будущие улучшения:

- Docker версия
- PostgreSQL / Redis
- rate limiting пользователей
- аналитика трафика
- multi-admin поддержка
- автообновления
- мультидоменность
- API tokens
- TTL пользователей
- WebSocket поддержка

---

# 📚 Технологии

## Backend

- Python
- FastAPI
- Uvicorn

---

## Frontend

- React
- TypeScript
- Vite

---

## Инфраструктура

- Caddy
- NaiveProxy
- systemd
- UFW

---

# 💡 Итог

Это не просто установщик.

Это полноценная система управления прокси:

- безопасный NaiveProxy сервер
- автоматический HTTPS
- современная админ-панель
- backend API
- systemd интеграция
- полностью автоматическое развёртывание
```
