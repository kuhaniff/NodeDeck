# Phantom

> **Termius-style modern minimalist web terminal & SFTP manager** powered by Go, [xterm.js](https://xtermjs.org/), and JetBrains Mono Nerd Font.

---

## ✨ Features

- **⚡ Lightweight Micro-Stack:** Single static Go binary (`creack/pty` + `gorilla/websocket`) serving assets, managing PTY sessions, and serving SFTP REST endpoints.
- **🎨 Modern Dark Aesthetic:** Clean flat dark backdrop (`#0f1115`), thin tab bar, collapsible sidebar, blue accent highlights, and bundled JetBrains Mono Nerd Font.
- **🖥️ Termius-Style Host Manager:** Switch between hosts (`node01 (hermes)`, `node01 (aneep)`, `node02`, or custom SSH targets) with one click. Manage connection profiles stored in `data/hosts.json`.
- **📂 Built-in SFTP / File Explorer:** Browse server files, upload files via drag-and-drop, download files, create folders, and delete files directly from the collapsible sidebar.
- **🖱️ Native Terminal UX:** Direct PTY architecture with 10,000-line scrollback buffer, smooth mouse wheel scrolling, automatic highlight-to-copy, and seamless clipboard paste (`Ctrl+Shift+V` / right-click).
- **📑 Full Tab Control:** Dedicated `[+]` button to open tabs and explicit `(x)` button on each tab to close with mouse. Double-click tab to rename.
- **🚀 Native Starship Prompt:** Full interactive Bash login shell with Starship prompt (`hermes@node01 ~`) showing exact working directory and Git status.
- **📱 PWA (Progressive Web App):** Installable standalone desktop / mobile app with offline shell, custom icons, and web app manifest.
- **📖 Built-in Help:** Type `phantom`, `-help`, `--help`, or `help-phantom` directly in the terminal for quick keyboard shortcuts and features guide.

---

## 🚀 Quick Start

### 1. Clone repository
```bash
git clone git@github.com:kuhaniff/phantom.git
cd phantom
```

### 2. Configure environment (optional)
```bash
cp .env.example .env
```

### 3. Run with Docker Compose
```bash
docker compose up -d --build
```

### 4. Access
Open your browser and navigate to:
```
http://127.0.0.1:8090
```
Or your configured Cloudflare Access / reverse proxy domain.

---

## 🔒 Security

> [!WARNING]
> Never expose Phantom directly to the public internet without authentication and TLS.

- **Localhost Bound by Default:** Published on `127.0.0.1:8090` to prevent unintended LAN/WAN exposure.
- **Reverse Proxy / Cloudflare Tunnel:** When exposing remotely, route through an HTTPS reverse proxy or Cloudflare Access tunnel with origin checking.
- **Opt-in Sudo:** Container runs unprivileged by default; passwordless sudo is disabled unless explicitly enabled via `ENABLE_SUDO=true`.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PHANTOM_BIND_IP` | `127.0.0.1` | Host interface IP to bind port |
| `PHANTOM_PORT` | `8090` | Host port to publish |
| `PUID` | `1001` | User ID inside the container |
| `PGID` | `1001` | Group ID inside the container |
| `USER_NAME` | `hermes` | Shell username |
| `ENABLE_SUDO` | `false` | Enable passwordless sudo for user |
| `STACKS_DIR` | `/home/aneep/stacks` | Host directory mounted to `/home/aneep/stacks` |

---

## ⌨️ Shortcuts & Controls

| Action | Control / Shortcut |
| :--- | :--- |
| **Toggle Sidebar** | Klik ikon menu `☰` atau tekan `Alt` + `b` |
| **New Tab** | Klik butang `[+]` atau tekan `Alt` + `t` |
| **Close Tab** | Klik butang `(x)` pada tab atau tekan `Alt` + `w` |
| **Close Shell** | Taip `exit` atau tekan `Ctrl` + `d` |
| **Rename Tab** | Dwi-klik pada tajuk tab |
| **Switch Tab** | Klik tab atau `Alt` + `1` .. `Alt` + `9` |
| **Next / Prev Tab** | `Alt` + `Right` / `Alt` + `Left` |
| **Copy Text** | Pilih / highlight teks (automatik salin ke papan keratan) |
| **Paste Text** | `Ctrl` + `Shift` + `v` atau klik kanan tetikus |
| **Install PWA** | Klik butang `Install` di sebelah kanan tab bar |
| **CLI Help** | Taip `phantom` atau `-help` dalam terminal |

---

## 🛠️ Stack Structure

```
phantom/
├── Dockerfile              # Multi-stage build (Go builder + minimal Debian 13 runtime)
├── compose.yaml            # Docker Compose service definition
├── entrypoint.sh           # User permissions and container entrypoint
├── main.go                 # Go WebSocket server + PTY bridge + SFTP REST API
├── go.mod / go.sum         # Go dependencies (creack/pty, gorilla/websocket)
├── data/                   # Persistent runtime data
│   └── hosts.json          # Termius connection host list
├── static/                 # Static web assets
│   ├── index.html          # Web terminal UI + sidebar + SFTP explorer
│   ├── style.css           # Modern dark styling, sidebar & tab bar
│   ├── app.js              # Tab management, host manager, SFTP & xterm.js orchestration
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # PWA service worker
│   ├── favicon.svg         # App SVG icon
│   ├── icon-192.png        # PWA 192px icon
│   ├── icon-512.png        # PWA 512px icon
│   └── vendor/             # Vendored xterm.js, addons & JetBrains Mono Nerd Font
├── LICENSE                 # MIT License
└── README.md
```

---

## 📄 License
MIT
