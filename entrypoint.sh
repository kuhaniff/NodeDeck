#!/usr/bin/env bash
set -e

USER_ID=${PUID:-1001}
GROUP_ID=${PGID:-1001}
USERNAME=${USER_NAME:-hermes}

# 1. Setup docker group (matching host GID 989 if mounted)
if ! getent group docker >/dev/null; then
    groupadd -g 989 docker 2>/dev/null || groupadd docker 2>/dev/null || true
fi

# 2. Setup hermes group and user
if ! getent group "$USERNAME" >/dev/null; then
    groupadd -g "$GROUP_ID" "$USERNAME" 2>/dev/null || groupadd "$USERNAME" 2>/dev/null || true
fi

if ! id -u "$USERNAME" >/dev/null 2>&1; then
    useradd -u "$USER_ID" -g "$GROUP_ID" -G docker,sudo -s /bin/bash -m "$USERNAME" 2>/dev/null || true
else
    usermod -aG docker,sudo "$USERNAME" 2>/dev/null || true
fi

# 3. Setup aneep user (UID 1000) for owner access
if ! getent group aneep >/dev/null; then
    groupadd -g 1000 aneep 2>/dev/null || groupadd aneep 2>/dev/null || true
fi

if ! id -u aneep >/dev/null 2>&1; then
    useradd -u 1000 -g 1000 -G docker,sudo -s /bin/bash -m -d /home/aneep aneep 2>/dev/null || true
else
    usermod -aG docker,sudo aneep 2>/dev/null || true
fi
mkdir -p /home/aneep && chown -R 1000:1000 /home/aneep 2>/dev/null || true

# 4. Opt-in passwordless sudo (default enabled for smooth homelab terminal use)
if [ "${ENABLE_SUDO}" = "true" ] || [ -z "${ENABLE_SUDO}" ]; then
    echo "ALL ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/99-all-nopasswd
    chmod 0440 /etc/sudoers.d/99-all-nopasswd
else
    rm -f /etc/sudoers.d/99-all-nopasswd
fi

# Fix sudo audit/coredump noise in containers
if ! grep -q "disable_coredump" /etc/sudo.conf 2>/dev/null; then
    echo 'Set disable_coredump false' >> /etc/sudo.conf
fi

export HOME="/home/$USERNAME"
cd "$HOME"

# Ensure starship prompt and ergonomic helpers in interactive bash shells
if ! grep -q "starship init bash" /etc/bash.bashrc 2>/dev/null; then
    echo 'eval "$(starship init bash)"' >> /etc/bash.bashrc
fi

if ! grep -q "sudo()" /etc/bash.bashrc 2>/dev/null; then
cat << 'BASHRC' >> /etc/bash.bashrc

# Sudo & user switching ergonomics
sudo() {
  if [ "$1" = "-ui" ]; then
    shift
    local target="$1"
    shift
    command sudo -u "$target" -i "$@"
  elif [ "$1" = "-iu" ]; then
    shift
    local target="$1"
    shift
    command sudo -u "$target" -i "$@"
  else
    command sudo "$@"
  fi
}
alias su='sudo su'
BASHRC
fi

# Provide nodedeck-help CLI command
cat << 'HELPEOF' > /usr/local/bin/nodedeck-help
#!/usr/bin/env bash
cat << 'TXT'

========================================================================
                   NODEDECK WEB TERMINAL - PANDUAN PANTAS
========================================================================

 [TABS & SESI]
   Klik [+]              : Cipta tab baru (atau tekan Alt + T)
   Klik (x) pada tab     : Tutup tab tersebut (atau tekan Alt + W)
   Klik tab              : Pilih / tukar tab aktif
   Dwi-klik tajuk tab    : Namakan semula tab (Rename tab)
   Taip 'exit' / Ctrl+D  : Keluar shell dan tutup tab secara automatik
   Alt + 1 .. Alt + 9    : Lompat terus ke Tab 1 hingga Tab 9
   Alt + Left / Right    : Pergi ke tab sebelumnya / seterusnya

 [TETIKUS & PAPAN KERAT (WINDOWS TERMINAL STYLE)]
   Pilih / drag tetikus  : Highlight & salin automatik ke Clipboard
   Klik-Kanan            : Tampal (Paste) jika tiada teks dipilih,
                           atau Salin (Copy) jika ada pilihan teks
   Ctrl + C              : Salin pilihan (jika teks dipilih),
                           atau hantar interrupt SIGINT (jika tiada teks)
   Ctrl + V              : Tampal (Paste) dari papan keratan
   Roda Tetikus (Scroll) : Skrol lancar ke atas / bawah (10,000 baris)

 [PWA (PROGRESSIVE WEB APP)]
   Klik butang 'Install' di bahagian kanan tab bar untuk memasang
   NodeDeck sebagai aplikasi desktop / telefon mudah alih yang berasingan.

========================================================================
TXT
HELPEOF
chmod +x /usr/local/bin/nodedeck-help

# Create symlinks for all help command variants
ln -sf /usr/local/bin/nodedeck-help /usr/local/bin/nodedeck
ln -sf /usr/local/bin/nodedeck-help /usr/local/bin/phantom
ln -sf /usr/local/bin/nodedeck-help /usr/local/bin/-help
ln -sf /usr/local/bin/nodedeck-help /usr/local/bin/--help
ln -sf /usr/local/bin/nodedeck-help /usr/local/bin/help-nodedeck

# Profile aliases & ergonomics
cat << 'PROFILEEOF' > /etc/profile.d/nodedeck.sh
alias nodedeck='nodedeck-help'
alias phantom='nodedeck-help'
alias help-nodedeck='nodedeck-help'
alias -- -help='nodedeck-help'
alias -- --help='nodedeck-help'
alias su='sudo su'

sudo() {
  if [ "$1" = "-ui" ]; then
    shift
    command sudo -u "$1" -i "${@:2}"
  elif [ "$1" = "-iu" ]; then
    shift
    command sudo -u "$1" -i "${@:2}"
  else
    command sudo "$@"
  fi
}
PROFILEEOF

exec gosu "$USERNAME" /usr/local/bin/nodedeck-server -port 8090 -static /usr/share/nodedeck/static -data /usr/share/nodedeck/data
