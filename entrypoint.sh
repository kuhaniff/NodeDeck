#!/usr/bin/env bash
set -e

USER_ID=${PUID:-1001}
GROUP_ID=${PGID:-1001}
USERNAME=${USER_NAME:-hermes}

# Create group if not exists
if ! getent group "$USERNAME" >/dev/null; then
    groupadd -g "$GROUP_ID" "$USERNAME" 2>/dev/null || groupadd "$USERNAME"
fi

# Create user if not exists
if ! id -u "$USERNAME" >/dev/null 2>&1; then
    useradd -u "$USER_ID" -g "$GROUP_ID" -s /bin/bash -m "$USERNAME"
fi

# Passwordless sudo for convenience inside container if needed
echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/99-"$USERNAME"
chmod 0440 /etc/sudoers.d/99-"$USERNAME"

export HOME="/home/$USERNAME"
cd "$HOME"

# Zellij default setup
mkdir -p "$HOME/.config/zellij/layouts"
cp -f /etc/zellij/config.kdl "$HOME/.config/zellij/config.kdl" 2>/dev/null || true
cp -rf /etc/zellij/layouts/* "$HOME/.config/zellij/layouts/" 2>/dev/null || true
chown -R "$USER_ID:$GROUP_ID" "$HOME/.config/zellij" 2>/dev/null || true

# Kill old sessions
gosu "$USERNAME" zellij delete-all-sessions -y 2>/dev/null || true

# Launch ttyd with custom index.html; xterm theme matches config/config.kdl
exec gosu "$USERNAME" ttyd \
    --port 8090 \
    --writable \
    -I /usr/share/ttyd/index.html \
    -t rendererType=webgl \
    -t disableLeaveAlert=true \
    -t fontSize=15 \
    -t fontFamily="'JetBrains Mono', 'Geist Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace" \
    -t titleFixed=phantom \
    -t disableResizeOverlay=true \
    -t theme='{"background": "#0f1115", "foreground": "#d8dce4", "cursor": "#7aa2f7", "cursorAccent": "#0f1115", "selectionBackground": "#2a3350", "black": "#1a1d23", "red": "#f7768e", "green": "#9ece6a", "yellow": "#e0af68", "blue": "#7aa2f7", "magenta": "#bb9af7", "cyan": "#7dcfff", "white": "#c5cad6", "brightBlack": "#7a8299", "brightRed": "#ff8fa3", "brightGreen": "#b4e07f", "brightYellow": "#f0c27e", "brightBlue": "#94b8ff", "brightMagenta": "#cdb0ff", "brightCyan": "#9be0ff", "brightWhite": "#ffffff"}' \
    zellij --layout phantom attach --create phantom
