# Phantom

> **Ghostty-style high-performance web terminal stack** powered by [ttyd](https://github.com/tsl0922/ttyd) and [Zellij](https://zellij.dev/).

---

## ✨ Features

- **⚡ Zero-Lag Input:** C-based `ttyd` (libwebsockets) direct PTY engine.
- **🎨 Ghostty Dark Aesthetic:** Custom ANSI color palette, block cursor, and modern dark backdrop (`#121212`).
- **🚀 WebGL Accelerated:** Hardware-accelerated rendering powered by browser GPU.
- **🪟 Multiplexer (Zellij):** Native tabs, split panes (horizontal & vertical), floating terminals, and mouse-clickable navigation.
- **🔄 Session Resilience:** Automatic session persistence. Reconnecting or refreshing the browser retains all open tabs and commands.
- **📦 Single Self-Contained Stack:** Easy deployment via Docker Compose with non-root user mapping (`PUID`/`PGID`).

---

## 🚀 Quick Start

### 1. Clone repository
```bash
git clone git@github.com:kuhaniff/phantom.git
cd phantom
```

### 2. Run with Docker Compose
```bash
docker compose up -d
```

### 3. Access
Open your browser and navigate to:
```
http://<server-ip>:8090
```

---

## ⌨️ Zellij Keybindings Quick Reference

| Action | Shortcut |
| :--- | :--- |
| **New Tab** | `Ctrl` + `t`, then `n` |
| **Switch Tabs** | Click tab with mouse OR `Ctrl` + `t`, then `←` / `→` |
| **Close Tab** | `Ctrl` + `t`, then `x` |
| **Split Vertical** | `Ctrl` + `p`, then `r` |
| **Split Horizontal** | `Ctrl` + `p`, then `d` |
| **Toggle Floating Pane** | `Ctrl` + `p`, then `w` |
| **Detach Session** | `Ctrl` + `o`, then `d` |

---

## 🛠️ Stack Structure

```
phantom/
├── Dockerfile          # Debian-slim + ttyd + Zellij (musl)
├── compose.yaml        # Service definition and volume mounts
├── entrypoint.sh       # User mapping & ttyd startup with WebGL options
├── config/
│   └── config.kdl      # Zellij Ghostty-theme configuration
└── README.md
```

## 📄 License
MIT
