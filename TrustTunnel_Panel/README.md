# TrustTunnel Web Panel & API

A beautiful, premium, dark-themed Web Panel and REST API written in Node.js to manage the **TrustTunnel** obfuscated VPN protocol. It operates seamlessly alongside other proxy servers (like NaiveProxy) by utilizing separate, configurable ports (e.g. `8443`) and features instant credentials synchronization, client configuration TOML downloads, and native `tt://` deep-link QR codes.

---

## Key Features

1. **Dashboard & Analytics**: Real-time status indicators, user counts, and current system configuration details.
2. **User & Device Management**: Full CRUD operations for tunnels, allowing you to add, edit, disable, or delete users instantly.
3. **Advanced Settings Control**: Customize your server endpoint host, listen ports, custom SNI (for stealth web-mimicry), DNS upstreams, and skip verification.
4. **Pure JS RFC 9000 VarInt & TLV Deep-Link Encoder**: Generates client configuration links (`tt://?...`) and visual QR codes on-the-fly that are fully compliant with the official TrustTunnel client applications.
5. **No-Dependency Config Syncer**: Generates and rewrites TrustTunnel's `credentials.toml` dynamically, containing only active (enabled) credentials.
6. **System Integration Diagnostics**: An embedded console box that runs real-time restart trials on your Linux service and reports stdout/stderr logs.
7. **REST API Control**: Fully programmable REST API for all actions, making it easy to automate user management.

---

## Technology Stack

- **Backend**: Node.js & Express (Ultra-lightweight, 0 heavy dependencies).
- **Frontend**: Single Page Application using clean Semantic HTML5, Vanilla CSS3 (HSL colors, glassmorphism, responsive grid, smooth animations), and pure JavaScript.
- **Client Library**: Lucide Icons, QRCode.js (fully client-side).

---

## Directory Structure

```text
TrustTunnel_Panel/
├── public/                 # Frontend Static Assets
│   ├── index.html          # Main SPA Dashboard Layout
│   ├── index.css           # Premium Glassmorphism Design
│   └── app.js              # Core UI Controller & API Bridge
├── db.json                 # Panel Settings & User Database (Source of Truth)
├── credentials.toml        # TrustTunnel synchronized credentials
├── package.json            # Node.js project manifest
├── server.js               # Express API, Deep-Link Encoder & System Integrator
└── README.md               # Setup and Deployment Guide
```

---

## Installation & Setup

### 1. Prerequisites
- **Node.js**: Ensure Node.js (v16+) is installed on your server.
- **TrustTunnel Endpoint**: Have TrustTunnel server installed (typically located under `/opt/trusttunnel/` or `/usr/local/bin/`).

### 2. Install Panel Dependencies
Clone or copy the panel files to your server directory (e.g., `/opt/trusttunnel-panel/`), then install Express:
```bash
npm install --production
```

### 3. Run the Panel
You can launch the panel server in development or production modes:
```bash
# Start Panel
npm start
```
The panel operates on port `3000` by default. You can access it via: `http://your-server-ip:3000`

---

## TrustTunnel Integration

To connect the Web Panel to your TrustTunnel server, follow these steps:

### Step 1: Configure TrustTunnel Port
Ensure that your TrustTunnel main configuration (`vpn.toml`) points to port `8443` (or any port other than `443` if NaiveProxy is already using it):
```toml
# /opt/trusttunnel/vpn.toml
listen_address = "0.0.0.0:8443"
credentials_file = "/opt/trusttunnel/credentials.toml"
# ... other configurations
```

### Step 2: Configure Web Panel Paths
Open the panel interface, click on **Settings**, and populate the following settings:
- **Public Domain / IP**: Your server domain name (e.g. `vpn.yourserver.com`).
- **Listen Port**: `8443` (matches TrustTunnel port).
- **Credentials TOML Path**: `/opt/trusttunnel/credentials.toml` (points to the TrustTunnel credentials file).
- **Service Restart Command**: `sudo systemctl restart trusttunnel` (the command to restart the TrustTunnel service).
- **DNS Upstreams**: `1.1.1.1, 8.8.8.8`

### Step 3: Permissions for Reloading (Sudoers)
Because the Web Panel needs to restart the TrustTunnel systemd service when credentials change, you must allow the user running the panel (e.g., `www-data` or a dedicated user) to run `systemctl restart trusttunnel` without entering a password.

Add the following line to your `/etc/sudoers` file (using `sudo visudo`):
```text
www-data ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart trusttunnel
```
*(Replace `www-data` with the system user running your node server).*

---

## REST API Reference

The Web Panel exposes a clean, fully functional REST API. All requests/responses use JSON format.

### 1. Retrieve Tunnels List
- **Endpoint**: `GET /api/users`
- **Response**: Array of users with connection metadata and pre-generated deep links.

### 2. Create User Tunnel
- **Endpoint**: `POST /api/users`
- **Request Body**:
  ```json
  {
    "username": "alex_iphone",
    "password": "secure_password", // Optional (auto-generated if empty)
    "notes": "Alex's main mobile client" // Optional
  }
  ```
- **Response**: Details of the newly created tunnel, pre-generated deep link, and service restart diagnostics.

### 3. Toggle Tunnel Status (Enable/Disable)
- **Endpoint**: `POST /api/users/:username/toggle`
- **Response**: Toggles active status and immediately synchronizes `credentials.toml`, triggering service restart.

### 4. Delete Tunnel Credentials
- **Endpoint**: `DELETE /api/users/:username`
- **Response**: Permanently deletes credentials, updates TOML, and restarts service.

### 5. Fetch Connection Configuration Details
- **Endpoint**: `GET /api/users/:username/config`
- **Response**: Credentials details, `tt://` deep link, and pre-formatted `.toml` client configuration.

### 6. Download Client TOML
- **Endpoint**: `GET /api/users/:username/toml`
- **Response**: Attachment file `trusttunnel_username.toml` fully configured and ready for import.

---

## Production Deployment (Recommended)

To run the panel persistently in production, use a process manager like **pm2**:

```bash
# Install PM2 globally
npm install pm2 -g

# Start panel inside PM2
pm2 start server.js --name "trusttunnel-panel"

# Save list for server reboots
pm2 save
pm2 startup
```

---

*Designed and engineered with care by Antigravity.*
