# 🚀 NaiveProxy Full Stack Server

Production-ready deployment system for:

- NaiveProxy
- Caddy
- React Admin Panel
- FastAPI Backend
- Automatic TLS
- systemd services
- Full server automation

---

# ✨ Features

## 🔐 NaiveProxy Core

- Caddy + forwardproxy (NaiveProxy)
- Automatic HTTPS via Let's Encrypt
- Probe resistance
- Per-user authentication
- Secure TLS proxy endpoint
- User config generation

---

## 🌐 Web Admin Panel

Modern React frontend for managing proxy users.

Features:

- Create users
- Delete users
- Copy proxy links
- Show / hide passwords
- Admin authorization
- Fast static frontend via Caddy

---

## ⚙️ Backend API

FastAPI backend running as a dedicated `systemd` service.

Features:

- REST API
- User management
- Proxy config generation
- Admin authentication
- Automatic integration with Caddy users

---

## 🛠 Automation

Installer automatically configures:

- Go
- xcaddy
- Caddy build
- Node.js
- Python venv
- Frontend build
- Backend dependencies
- systemd services
- Firewall
- BBR TCP optimization

---

# 🧱 Architecture

```text
                    ┌────────────────────┐
                    │    React Frontend  │
                    │   Admin Dashboard  │
                    └─────────┬──────────┘
                              │ HTTPS
                              ▼
                    ┌────────────────────┐
                    │       Caddy        │
                    │ TLS + ReverseProxy │
                    │   NaiveProxy Core  │
                    └───────┬─────┬──────┘
                            │     │
                            │     ▼
                            │   FastAPI Backend
                            │   systemd service
                            │   localhost:8000
                            │
                            ▼
                     NaiveProxy Clients
```

---

# 📦 Requirements

- Ubuntu 22.04+ / Debian
- Root access
- Open ports:
  - `80`
  - `443`

---

# ⚡ Before Installation

Update Ubuntu packages and install Git:

```bash
apt update && apt upgrade -y
apt install git -y
```

---

# 📥 Installation

## Clone repository

```bash
git clone <repo>
cd naiveproxy
```

---

## Run installer

```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

---

# 🧭 Installation Flow

Installer will ask for:

## Proxy domain

Example:

```text
proxy.example.com
```

Used for NaiveProxy endpoint.

---

## TLS email

Example:

```text
admin@example.com
```

Used for Let's Encrypt certificates.

---

## UI domain (optional)

Example:

```text
ui.example.com
```

If skipped:

- frontend will not be installed
- backend will not be installed

---

## Admin password

Required only if UI is enabled.

Used for backend API authorization.

---

# 🌍 Access After Installation

## NaiveProxy

```text
naive+https://LOGIN:PASSWORD@proxy.example.com:443
```

---

## Web UI

```text
https://ui.example.com
```

---

## Backend API

```text
https://ui.example.com/api/users
```

---

# 👤 User Storage

Users are stored inside:

```bash
/etc/caddy/users/
```

Each file contains:

- username
- password
- Caddy forward_proxy auth

---

# ⚙️ systemd Services

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

# 📁 Project Structure

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

Backend runs through `systemd`.

## Service name

```bash
naiveproxy-backend
```

---

## Start

```bash
systemctl start naiveproxy-backend
```

---

## Restart

```bash
systemctl restart naiveproxy-backend
```

---

## Logs

```bash
journalctl -u naiveproxy-backend -f
```

---

# 🌐 Frontend

Frontend automatically builds during installation.

## Build directory

```bash
/var/www/react
```

---

## Manual rebuild

```bash
cd frontend

npm install
npm run build
```

---

# 🔐 Security

## Admin Authentication

Backend API uses:

```text
x-admin-password
```

header.

---

## TLS

HTTPS certificates are automatically issued by Caddy.

---

## Firewall

Installer configures:

```text
80/tcp
443/tcp
```

through UFW.

---

## BBR Optimization

TCP BBR congestion control is enabled automatically.

---

# 📄 Configuration Files

## Caddy

```bash
/etc/caddy/Caddyfile
```

---

## Proxy users

```bash
/etc/caddy/users/
```

---

## Installer state

```bash
/root/naiveproxy.env
```

Contains:

```text
DOMAIN
EMAIL
LOGIN
PASSWORD
UI_DOMAIN
```

---

# 🧹 Uninstall

Run:

```bash
chmod +x scripts/uninstall.sh
./scripts/uninstall.sh
```

---

# 🧰 Uninstaller Features

Supports:

- Remove Caddy
- Remove backend service
- Remove frontend
- Remove Go
- Remove xcaddy
- Remove configs
- Remove firewall rules
- Remove frontend build
- Full cleanup mode

---

# 🚀 Performance

Optimizations included:

- HTTP/2 + HTTP/3
- TLS acceleration
- BBR
- Static frontend serving
- Reverse proxy caching benefits from Caddy
- Lightweight FastAPI backend

---

# 🔮 Future Plans

Planned improvements:

- Docker support
- PostgreSQL / Redis
- Rate limiting
- Traffic analytics
- Multi-admin support
- Auto-update system
- Multi-domain support
- API tokens
- User expiration dates
- WebSocket support

---

# 📚 Technologies

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

## Infrastructure

- Caddy
- NaiveProxy
- systemd
- UFW

---

# 💡 Summary

This project provides a complete self-hosted proxy management platform with:

- Secure NaiveProxy server
- Automatic HTTPS
- Modern admin panel
- Fast backend API
- Automated deployment
- systemd integration
- Production-ready architecture
