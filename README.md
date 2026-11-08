# Phantom

> **Ghostty-style high-performance web terminal stack** powered by [ttyd](https://github.com/tsl0922/ttyd) and [Zellij](https://zellij.dev/).

---

## ✨ Features

- **⚡ Zero-Lag Input:** C-based `ttyd` (libwebsockets) direct PTY engine.
- **🎨 Ghostty Dark Aesthetic:** Custom ANSI & component color palette, block cursor, and modern flat dark backdrop (`#0f1115`).
- **🚀 WebGL Accelerated:** Hardware-accelerated rendering powered by browser GPU with loaded font re-measurement.
- **🪟 Multiplexer (Zellij):** Thin tab bar on top, flat tabs without powerline arrows, split panes, floating terminals, and mouse-clickable navigation.
- **🔄 Session Resilience:** Automatic session persistence. Reconnecting or restarting the container preserves all open tabs and running processes.
- **🔒 Hardened Security:** Loopback bind by default, opt-in sudo, WebSocket origin checking (`-O`), ping interval (`-P 30`), and optional basic authentication.

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

---

## 🔒 Security

> [!WARNING]
> Never expose Phantom directly to the public internet without authentication and TLS.

- **Localhost Bound by Default:** Published on `127.0.0.1:8090` to prevent unintended LAN/WAN exposure.
- **Basic Auth:** Set `TTYD_USER` and `TTYD_PASS` in your `.env` file to require credentials before accessing the shell.
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
| `TTYD_USER` | *(empty)* | Username for HTTP basic auth |
| `TTYD_PASS` | *(empty)* | Password for HTTP basic auth |

---

## ⌨️ Browser-Safe Keybindings

In web browsers, standard shortcuts like `Ctrl+t` and `Ctrl+w` are captured by the browser to open/close browser tabs. Phantom configures dedicated **Alt-based** shortcuts:

| Action | Shortcut |
| :--- | :--- |
| **New Tab** | `Alt` + `t` |
| **Close Tab** | `Alt` + `w` |
| **Next Tab** | `Alt` + `Right` or `Alt` + `l` |
| **Previous Tab** | `Alt` + `Left` or `Alt` + `h` |
| **New Pane** | `Alt` + `n` |
| **Toggle Floating Pane** | `Alt` + `f` |
| **Switch Mode** | `Ctrl` + `p` (Pane), `Ctrl` + `o` (Session), `Ctrl` + `g` (Locked) |

*Note for macOS users:* `macOptionIsMeta=true` is enabled in `ttyd` so the `Option` (⌥) key functions as `Alt`/`Meta`.

---

## 🛠️ Stack Structure

```
phantom/
├── Dockerfile              # Debian-slim + ttyd + Zellij (musl)
├── compose.yaml            # Service definition, init process, and volume mounts
├── entrypoint.sh           # User mapping, security hardening, and ttyd startup
├── .env.example            # Sample configuration values
├── config/
│   ├── config.kdl          # Zellij Ghostty-theme & Alt-keybind configuration
│   └── layouts/
│       └── phantom.kdl     # Layout template: single thin top tab-bar, borderless
├── web/
│   └── index.html          # Customized ttyd bundle with Google Fonts & font re-measurement
├── LICENSE                 # MIT License
└── README.md
```

### Maintenance Note: Regenerating `web/index.html`
`web/index.html` is patched from stock `ttyd 1.7.7`. If upgrading `ttyd`:
1. Fetch the stock page from the new ttyd container: `curl -s http://localhost:8090/ > web/index.html`
2. Re-apply the Google Fonts `<link>` (JetBrains Mono 400;700), slim scrollbar styles, and the `document.fonts.load` re-measurement `<script>` before `</body>`.

---

## 📄 License
MIT
