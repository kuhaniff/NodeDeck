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

# Zellij default setup if config missing
mkdir -p "$HOME/.config/zellij/layouts"
cp -f /etc/zellij/config.kdl "$HOME/.config/zellij/config.kdl" 2>/dev/null || true
cp -rf /etc/zellij/layouts/* "$HOME/.config/zellij/layouts/" 2>/dev/null || true
chown -R "$USER_ID:$GROUP_ID" "$HOME/.config/zellij" 2>/dev/null || true

# Kill any stale zellij sessions on fresh container boot if needed
gosu "$USERNAME" zellij delete-all -y 2>/dev/null || true

# Launch ttyd with WebGL, Ghostty theme, custom title, JetBrains Mono font
exec gosu "$USERNAME" ttyd \
    --port 8090 \
    --writable \
    -t rendererType=webgl \
    -t disableLeaveAlert=true \
    -t fontSize=15 \
    -t fontFamily="'JetBrains Mono', 'Geist Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace" \
    -t theme='{"background": "#121212", "foreground": "#e0e0e0", "cursor": "#f8f8f2", "cursorAccent": "#121212", "selectionBackground": "#3e4451", "black": "#1c1c1c", "red": "#ff5555", "green": "#50fa7b", "yellow": "#f1fa8c", "blue": "#bd93f9", "magenta": "#ff79c6", "cyan": "#8be9fd", "white": "#f8f8f2", "brightBlack": "#6272a4", "brightRed": "#ff6e6e", "brightGreen": "#69ff94", "brightYellow": "#ffffa5", "brightBlue": "#d6acff", "brightMagenta": "#ff92df", "brightCyan": "#a4ffff", "brightWhite": "#ffffff"}' \
    zellij --layout phantom attach --create phantom
