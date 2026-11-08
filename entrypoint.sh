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

# Opt-in passwordless sudo
if [ "${ENABLE_SUDO}" = "true" ]; then
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/99-"$USERNAME"
    chmod 0440 /etc/sudoers.d/99-"$USERNAME"
else
    rm -f /etc/sudoers.d/99-"$USERNAME"
fi

export HOME="/home/$USERNAME"
cd "$HOME"

# Ensure starship prompt is enabled in interactive bash shells
if ! grep -q "starship init bash" /etc/bash.bashrc 2>/dev/null; then
    echo 'eval "$(starship init bash)"' >> /etc/bash.bashrc
fi

# Provide phantom-help CLI command
cat << 'HELPEOF' > /usr/local/bin/phantom-help
#!/usr/bin/env bash
cat << 'TXT'

========================================================================
                   PHANTOM WEB TERMINAL - PANDUAN PANTAS
========================================================================

 [TABS & SESI]
   Klik [+]              : Cipta tab baru (atau tekan Alt + T)
   Klik (x) pada tab     : Tutup tab tersebut (atau tekan Alt + W)
   Klik tab              : Pilih / tukar tab aktif
   Dwi-klik tajuk tab    : Namakan semula tab (Rename tab)
   Taip 'exit' / Ctrl+D  : Keluar shell dan tutup tab secara automatik
   Alt + 1 .. Alt + 9    : Lompat terus ke Tab 1 hingga Tab 9
   Alt + Left / Right    : Pergi ke tab sebelumnya / seterusnya

 [PENGURUSAN SESI]
   Sesi terminal kekal hidup di latar belakang menggunakan tmux.
   Bila anda refresh atau buka semula browser, semua tab akan
   reconnect secara automatik ke sesi kerja yang sama.

 [TETIKUS & PAPAN KERAT]
   Pilih / highlight teks: Salin automatik ke papan keratan (Clipboard)
   Ctrl + Shift + V      : Tampal (Paste) teks dari papan keratan

 [PWA (PROGRESSIVE WEB APP)]
   Klik butang 'Install' di bahagian kanan tab bar untuk memasang
   Phantom sebagai aplikasi desktop / telefon mudah alih yang berasingan.

========================================================================
TXT
HELPEOF
chmod +x /usr/local/bin/phantom-help

# Create symlinks for all help command variants
ln -sf /usr/local/bin/phantom-help /usr/local/bin/phantom
ln -sf /usr/local/bin/phantom-help /usr/local/bin/-help
ln -sf /usr/local/bin/phantom-help /usr/local/bin/--help
ln -sf /usr/local/bin/phantom-help /usr/local/bin/help-phantom

# Profile aliases
cat << 'PROFILEEOF' > /etc/profile.d/phantom.sh
alias phantom='phantom-help'
alias help-phantom='phantom-help'
alias -- -help='phantom-help'
alias -- --help='phantom-help'
PROFILEEOF

exec gosu "$USERNAME" /usr/local/bin/phantom-server -port 8090 -static /usr/share/phantom/static
