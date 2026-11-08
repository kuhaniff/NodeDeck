# Phantom

> **Ghostty-style minimalist web terminal stack** powered by Go, [xterm.js](https://xtermjs.org/), and [tmux](https://github.com/tmux/tmux).

---

## ✨ Features

- **⚡ Lightweight Micro-Stack:** Single Go binary (`creack/pty` + `gorilla/websocket`) serving static assets and managing PTY sessions.
- **🎨 Ghostty Dark Aesthetic:** Clean flat dark backdrop (`#0f1115`), thin tab bar on top, blue accent highlights, and JetBrains Mono monospace typography.
- **📑 Full Tab Control:** Dedicated `[+]` button to open tabs and explicit `(x)` button on each tab to close with mouse. Double-click tab to rename.
- **🚀 Native Starship Prompt:** Full interactive Bash login shell with Starship prompt (`hermes@node01 ~`) showing exact working directory and Git status.
- **📱 PWA (Progressive Web App):** Installable standalone desktop / mobile app with offline shell, custom icons, and web app manifest.
- **🔄 Headless Session Persistence:** Each tab connects to a dedicated headless `tmux` session with status bar hidden (`status off`). Reconnecting or refreshing the browser restores running sessions automatically.
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
| **New Tab** | Klik butang `[+]` atau tekan `Alt` + `t` |
| **Close Tab** | Klik butang `(x)` pada tab atau tekan `Alt` + `w` |
| **Close Shell** | Taip `exit` atau tekan `Ctrl` + `d` |
| **Rename Tab** | Dwi-klik pada tajuk tab |
| **Switch Tab** | Klik tab atau `Alt` + `1` .. `Alt` + `9` |
| **Next / Prev Tab** | `Alt` + `Right` / `Alt` + `Left` |
| **Copy Text** | Pilih / highlight teks (automatik salin ke papan keratan) |
| **Paste Text** | `Ctrl` + `Shift` + `v` |
| **Install PWA** | Klik butang `Install` di sebelah kanan tab bar |
| **CLI Help** | Taip `phantom` atau `-help` dalam terminal |

---

## 🛠️ Stack Structure

```
phantom/
├── Dockerfile              # Multi-stage build (Go builder + minimal Debian 13 runtime)
├── compose.yaml            # Docker Compose service definition
├── entrypoint.sh           # User permissions and container entrypoint
├── main.go                 # Go WebSocket server + PTY bridge
├── go.mod / go.sum         # Go dependencies (creack/pty, gorilla/websocket)
├── static/                 # Static web assets
│   ├── index.html          # Web terminal UI
│   ├── style.css           # Ghostty dark styling & tab bar
│   ├── app.js              # Tab management & xterm.js orchestration
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # PWA service worker
│   ├── favicon.svg         # App SVG icon
│   ├── icon-192.png        # PWA 192px icon
│   ├── icon-512.png        # PWA 512px icon
│   └── vendor/             # Vendored xterm.js & addons
├── LICENSE                 # MIT License
└── README.md
```

---

## 📄 License
MIT
