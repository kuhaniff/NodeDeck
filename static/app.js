// Phantom Terminal - Termius Style Frontend Logic
(function() {
  'use strict';

  const THEME = {
    background: '#0f1115',
    foreground: '#d8dce4',
    cursor: '#7aa2f7',
    cursorAccent: '#0f1115',
    selectionBackground: 'rgba(122, 162, 247, 0.35)',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5'
  };

  // DOM Elements
  const tabsContainer = document.getElementById('tabs-container');
  const terminalContainer = document.getElementById('terminal-container');
  const btnNewTab = document.getElementById('btn-new-tab');
  const hostDropdown = document.getElementById('host-dropdown');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('sidebar');
  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  const btnQuickAddHost = document.getElementById('btn-quick-add-host');
  const btnAddHost = document.getElementById('btn-add-host');

  // Sidebar Views & Host / FS DOM
  const navTabs = document.querySelectorAll('.sidebar-nav .nav-tab');
  const viewHosts = document.getElementById('view-hosts');
  const viewFiles = document.getElementById('view-files');
  const hostSearch = document.getElementById('host-search');
  const hostList = document.getElementById('host-list');

  // FS DOM
  const fsCurrentPath = document.getElementById('fs-current-path');
  const fsBtnUp = document.getElementById('fs-btn-up');
  const fsBtnRefresh = document.getElementById('fs-btn-refresh');
  const fsBtnMkdir = document.getElementById('fs-btn-mkdir');
  const fsFileInput = document.getElementById('fs-file-input');
  const fileList = document.getElementById('file-list');

  // Modal DOM
  const modalHost = document.getElementById('modal-host');
  const modalHostClose = document.getElementById('modal-host-close');
  const btnCancelHost = document.getElementById('btn-cancel-host');
  const formHost = document.getElementById('form-host');
  const hostInputType = document.getElementById('host-input-type');

  let tabs = [];
  let activeTabId = null;
  let savedHosts = [];
  let currentFsPath = '/home/hermes';
  let currentFsParent = '/home';
  let deferredPrompt = null;

  // Font verification
  async function ensureFontLoaded() {
    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load('400 14px "JetBrainsMono Nerd Font"'),
          document.fonts.load('700 14px "JetBrainsMono Nerd Font"'),
          document.fonts.ready
        ]);
      }
    } catch (e) {
      console.warn('Font loading wait skipped:', e);
    }
  }

  // --- 1. Hosts Management ---
  async function fetchHosts() {
    try {
      const res = await fetch('/api/hosts');
      if (res.ok) {
        savedHosts = await res.json();
        renderHostList();
        renderHostDropdown();
      }
    } catch (err) {
      console.error('Failed to load hosts:', err);
    }
  }

  function renderHostList(filter = '') {
    hostList.innerHTML = '';
    const filtered = savedHosts.filter(h => 
      h.name.toLowerCase().includes(filter.toLowerCase()) || 
      h.host.toLowerCase().includes(filter.toLowerCase()) ||
      h.user.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      hostList.innerHTML = '<div style="padding:15px;text-align:center;color:#66738c;font-size:11px;">Tiada hos dijumpai</div>';
      return;
    }

    filtered.forEach(h => {
      const card = document.createElement('div');
      card.className = 'host-card';
      const meta = h.type === 'local' ? `Local Shell (${h.user})` : `${h.user}@${h.host}:${h.port || 22}`;
      
      card.innerHTML = `
        <span class="host-dot" style="background:${h.color || '#7aa2f7'}"></span>
        <div class="host-info">
          <div class="host-name">${escapeHtml(h.name)}</div>
          <div class="host-meta">${escapeHtml(meta)}</div>
        </div>
        <button class="host-del" title="Padam Hos">&times;</button>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('host-del')) {
          e.stopPropagation();
          deleteHost(h.id);
        } else {
          openTabForHost(h);
        }
      });

      hostList.appendChild(card);
    });
  }

  function renderHostDropdown() {
    hostDropdown.innerHTML = '';
    savedHosts.forEach(h => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.innerHTML = `
        <span class="tab-badge" style="background:${h.color || '#7aa2f7'}"></span>
        <span>${escapeHtml(h.name)}</span>
      `;
      item.addEventListener('click', () => {
        hostDropdown.classList.remove('show');
        openTabForHost(h);
      });
      hostDropdown.appendChild(item);
    });

    const divider = document.createElement('div');
    divider.className = 'dropdown-divider';
    hostDropdown.appendChild(divider);

    const addOpt = document.createElement('div');
    addOpt.className = 'dropdown-item';
    addOpt.innerHTML = `<span>➕ Tambah Sambungan...</span>`;
    addOpt.addEventListener('click', () => {
      hostDropdown.classList.remove('show');
      openAddHostModal();
    });
    hostDropdown.appendChild(addOpt);
  }

  async function deleteHost(id) {
    if (!confirm('Padam sambungan hos ini?')) return;
    try {
      await fetch(`/api/hosts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await fetchHosts();
    } catch (err) {
      alert('Gagal memadam hos: ' + err.message);
    }
  }

  function openAddHostModal() {
    formHost.reset();
    document.getElementById('host-input-id').value = '';
    document.getElementById('modal-host-title').textContent = 'Tambah Sambungan Hos';
    updateModalFormFields('ssh');
    modalHost.classList.add('show');
  }

  function updateModalFormFields(type) {
    const isLocal = type === 'local';
    document.getElementById('group-host-address').style.display = isLocal ? 'none' : 'block';
    document.getElementById('group-host-port').style.display = isLocal ? 'none' : 'block';
    document.getElementById('group-host-auth').style.display = isLocal ? 'none' : 'block';
    document.getElementById('group-host-key').style.display = isLocal ? 'none' : 'block';
  }

  hostInputType.addEventListener('change', (e) => {
    updateModalFormFields(e.target.value);
  });

  formHost.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = hostInputType.value;
    const selectedColor = formHost.querySelector('input[name="host-color"]:checked')?.value || '#7aa2f7';

    const payload = {
      id: document.getElementById('host-input-id').value || undefined,
      name: document.getElementById('host-input-name').value.trim(),
      type: type,
      host: type === 'local' ? 'localhost' : document.getElementById('host-input-address').value.trim(),
      user: document.getElementById('host-input-user').value.trim(),
      port: type === 'local' ? 22 : parseInt(document.getElementById('host-input-port').value, 10) || 22,
      auth: type === 'local' ? 'local' : document.getElementById('host-input-auth').value,
      key_path: type === 'local' ? '' : document.getElementById('host-input-keypath').value.trim(),
      color: selectedColor,
      desc: type === 'local' ? `Local shell as ${document.getElementById('host-input-user').value}` : `SSH to ${document.getElementById('host-input-address').value}`
    };

    try {
      const res = await fetch('/api/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        modalHost.classList.remove('show');
        await fetchHosts();
      } else {
        alert('Gagal menyimpan hos');
      }
    } catch (err) {
      alert('Ralat simpan hos: ' + err.message);
    }
  });

  modalHostClose.addEventListener('click', () => modalHost.classList.remove('show'));
  btnCancelHost.addEventListener('click', () => modalHost.classList.remove('show'));
  btnAddHost.addEventListener('click', openAddHostModal);
  btnQuickAddHost.addEventListener('click', openAddHostModal);

  hostSearch.addEventListener('input', (e) => {
    renderHostList(e.target.value);
  });

  // Toggle Dropdown for [+] Button
  btnNewTab.addEventListener('click', (e) => {
    e.stopPropagation();
    hostDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    hostDropdown.classList.remove('show');
  });

  // --- 2. Files / SFTP Explorer ---
  async function loadFiles(path = '/home/hermes') {
    fileList.innerHTML = '<div style="padding:15px;text-align:center;color:#66738c;font-size:11px;">Memuatkan fail...</div>';
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      currentFsPath = data.current;
      currentFsParent = data.parent;
      fsCurrentPath.textContent = data.current;
      renderFileList(data.items);
    } catch (err) {
      fileList.innerHTML = `<div style="padding:15px;color:#f7768e;font-size:11px;">Ralat: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderFileList(items) {
    fileList.innerHTML = '';
    if (!items || items.length === 0) {
      fileList.innerHTML = '<div style="padding:15px;text-align:center;color:#66738c;font-size:11px;">Folder ini kosong</div>';
      return;
    }

    // Sort folders first, then alphabetical
    items.sort((a, b) => {
      if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
      return a.is_dir ? -1 : 1;
    });

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'file-row';
      const icon = item.is_dir ? '📁' : '📄';
      const sizeStr = item.is_dir ? '' : formatBytes(item.size);

      row.innerHTML = `
        <span class="file-icon">${icon}</span>
        <span class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="file-size">${sizeStr}</span>
        ${!item.is_dir ? `<button class="file-action-btn btn-dl" title="Muat Turun Fail">⬇️</button>` : ''}
        <button class="file-action-btn btn-del" title="Padam Fail">&times;</button>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-dl')) {
          e.stopPropagation();
          downloadFile(item.path);
        } else if (e.target.classList.contains('btn-del')) {
          e.stopPropagation();
          deleteFile(item.path);
        } else if (item.is_dir) {
          loadFiles(item.path);
        } else {
          downloadFile(item.path);
        }
      });

      fileList.appendChild(row);
    });
  }

  function downloadFile(path) {
    const a = document.createElement('a');
    a.href = `/api/fs/download?path=${encodeURIComponent(path)}`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function deleteFile(path) {
    if (!confirm(`Padam '${path}'?`)) return;
    try {
      const res = await fetch(`/api/fs/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
      if (res.ok) {
        loadFiles(currentFsPath);
      } else {
        alert('Gagal memadam fail: ' + (await res.text()));
      }
    } catch (err) {
      alert('Ralat padam fail: ' + err.message);
    }
  }

  fsBtnUp.addEventListener('click', () => {
    if (currentFsParent && currentFsParent !== currentFsPath) {
      loadFiles(currentFsParent);
    }
  });

  fsBtnRefresh.addEventListener('click', () => {
    loadFiles(currentFsPath);
  });

  fsBtnMkdir.addEventListener('click', async () => {
    const name = prompt('Nama folder baru:');
    if (!name || !name.trim()) return;
    const newPath = currentFsPath + '/' + name.trim();
    try {
      const res = await fetch(`/api/fs/mkdir?path=${encodeURIComponent(newPath)}`, { method: 'POST' });
      if (res.ok) {
        loadFiles(currentFsPath);
      } else {
        alert('Gagal buat folder: ' + (await res.text()));
      }
    } catch (err) {
      alert('Ralat: ' + err.message);
    }
  });

  fsFileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
    fsFileInput.value = '';
  });

  async function uploadFiles(fileListToUpload) {
    const formData = new FormData();
    for (let i = 0; i < fileListToUpload.length; i++) {
      formData.append('files', fileListToUpload[i]);
    }
    try {
      const res = await fetch(`/api/fs/upload?path=${encodeURIComponent(currentFsPath)}`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        loadFiles(currentFsPath);
      } else {
        alert('Muat naik gagal: ' + (await res.text()));
      }
    } catch (err) {
      alert('Ralat muat naik: ' + err.message);
    }
  }

  // Drag & drop upload in files view
  viewFiles.addEventListener('dragover', (e) => {
    e.preventDefault();
    viewFiles.style.borderColor = '#7aa2f7';
  });

  viewFiles.addEventListener('dragleave', () => {
    viewFiles.style.borderColor = '';
  });

  viewFiles.addEventListener('drop', async (e) => {
    e.preventDefault();
    viewFiles.style.borderColor = '';
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  });

  // --- 3. Sidebar Navigation & Collapse ---
  navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      navTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      if (view === 'hosts') {
        viewHosts.classList.add('active');
        viewFiles.classList.remove('active');
      } else {
        viewHosts.classList.remove('active');
        viewFiles.classList.add('active');
        loadFiles(currentFsPath);
      }
    });
  });

  function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    setTimeout(() => {
      refitActiveTerminal();
    }, 220);
  }

  btnToggleSidebar.addEventListener('click', toggleSidebar);

  // --- 4. Terminal & Tab Management ---
  function openTabForHost(hostItem) {
    const newId = 'tab-' + Math.random().toString(36).substring(2, 8);
    createTab(newId, hostItem.name, hostItem.id, hostItem.color || '#7aa2f7', true);
  }

  function createTab(id, name, hostId = 'node01-hermes', color = '#7aa2f7', activate = true) {
    if (tabs.find(t => t.id === id)) return;

    // Tab DOM
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.id = id;

    const badge = document.createElement('span');
    badge.className = 'tab-badge';
    badge.style.backgroundColor = color;

    const titleEl = document.createElement('span');
    titleEl.className = 'tab-title';
    titleEl.textContent = name || 'shell';

    const closeEl = document.createElement('span');
    closeEl.className = 'tab-close';
    closeEl.innerHTML = '&times;';
    closeEl.title = 'Tutup tab';

    tabEl.appendChild(badge);
    tabEl.appendChild(titleEl);
    tabEl.appendChild(closeEl);
    tabsContainer.appendChild(tabEl);

    // Terminal Panel DOM
    const panelEl = document.createElement('div');
    panelEl.className = 'terminal-panel';
    panelEl.dataset.id = id;
    terminalContainer.appendChild(panelEl);

    // Xterm Instance
    const term = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrainsMono Nerd Font', 'Cascadia Code', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      convertEol: true,
      scrollback: 10000,
      scrollSensitivity: 2,
      fastScrollSensitivity: 5,
      scrollOnUserInput: true,
      smoothScrollDuration: 0,
      rightClickSelectsWord: false
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(panelEl);

    try {
      if (typeof WebglAddon !== 'undefined' && WebglAddon.WebglAddon) {
        const webgl = new WebglAddon.WebglAddon();
        webgl.onContextLoss(() => webgl.dispose());
        term.loadAddon(webgl);
      }
    } catch (e) {
      console.warn('WebGL fallback to canvas:', e);
    }

    // Auto-copy on text selection
    term.onSelectionChange(() => {
      const selection = term.getSelection();
      if (selection && selection.length > 0) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(selection).catch(() => {});
        }
      }
    });

    const tabObj = {
      id,
      name: name || 'shell',
      hostId,
      color,
      tabEl,
      titleEl,
      panelEl,
      term,
      fitAddon,
      ws: null,
      closing: false
    };
    tabs.push(tabObj);

    // Windows Terminal Keyboard Handling
    term.attachCustomKeyEventHandler((e) => {
      // Ctrl + C (copy if selected, else SIGINT)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        if (e.type === 'keydown' && term.hasSelection()) {
          const text = term.getSelection();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
          term.clearSelection();
          return false;
        }
        return true;
      }

      // Ctrl + Shift + C
      if (e.ctrlKey && e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        if (e.type === 'keydown') {
          const text = term.getSelection();
          if (text && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
          term.clearSelection();
        }
        return false;
      }

      // Ctrl + V or Ctrl + Shift + V (Paste via term.paste API)
      if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
        if (e.type === 'keydown') {
          if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then((text) => {
              if (text) term.paste(text);
            }).catch(() => {});
          }
        }
        return false;
      }

      return true;
    });

    // Right-Click (Paste / Copy)
    panelEl.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      if (term.hasSelection()) {
        const text = term.getSelection();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text).catch(() => {});
        }
        term.clearSelection();
      } else {
        if (navigator.clipboard && navigator.clipboard.readText) {
          try {
            const text = await navigator.clipboard.readText();
            if (text) term.paste(text);
          } catch (err) {}
        }
      }
    });

    connectWs(tabObj);

    tabEl.addEventListener('click', (e) => {
      if (e.target === closeEl) {
        closeTab(id);
      } else {
        switchTab(id);
      }
    });

    if (activate) {
      switchTab(id);
    }
  }

  function connectWs(tabObj) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws?id=${encodeURIComponent(tabObj.id)}&host=${encodeURIComponent(tabObj.hostId)}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    tabObj.ws = ws;

    ws.onopen = () => {
      tabObj.fitAddon.fit();
      sendResize(tabObj);
      tabObj.term.focus();
    };

    ws.onmessage = (evt) => {
      if (evt.data instanceof ArrayBuffer) {
        tabObj.term.write(new Uint8Array(evt.data));
      } else {
        tabObj.term.write(evt.data);
      }
    };

    tabObj.term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    ws.onclose = () => {
      if (!tabObj.closing) {
        if (tabs.length > 1) {
          closeTab(tabObj.id, false);
        } else {
          tabObj.term.write('\r\n\x1b[33m[Sesi ditamatkan. Pilih sambungan di sidebar atau klik [+]]\x1b[0m\r\n');
        }
      }
    };
  }

  function sendResize(tabObj) {
    if (tabObj && tabObj.ws && tabObj.ws.readyState === WebSocket.OPEN) {
      const { cols, rows } = tabObj.term;
      tabObj.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }

  function switchTab(id) {
    const tabObj = tabs.find(t => t.id === id);
    if (!tabObj) return;

    activeTabId = id;
    tabs.forEach(t => {
      const isActive = t.id === id;
      t.tabEl.classList.toggle('active', isActive);
      t.panelEl.classList.toggle('active', isActive);
    });

    setTimeout(() => {
      tabObj.fitAddon.fit();
      sendResize(tabObj);
      tabObj.term.focus();
    }, 10);
  }

  function closeTab(id, notifyBackend = true) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    const tabObj = tabs[idx];
    tabObj.closing = true;

    if (tabObj.ws) tabObj.ws.close();
    tabObj.term.dispose();
    tabObj.tabEl.remove();
    tabObj.panelEl.remove();

    if (notifyBackend) {
      fetch(`/api/close?id=${encodeURIComponent(id)}`, { method: 'POST' }).catch(() => {});
    }

    tabs.splice(idx, 1);

    if (tabs.length === 0) {
      const defaultHost = savedHosts[0] || { id: 'node01-hermes', name: 'node01 (hermes)' };
      openTabForHost(defaultHost);
    } else {
      if (activeTabId === id) {
        const nextIdx = Math.max(0, idx - 1);
        switchTab(tabs[nextIdx].id);
      }
    }
  }

  function refitActiveTerminal() {
    const active = tabs.find(t => t.id === activeTabId);
    if (active) {
      active.fitAddon.fit();
      sendResize(active);
    }
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refitActiveTerminal, 50);
  });

  // Global Shortcuts
  window.addEventListener('keydown', (e) => {
    // Alt + B : Toggle Sidebar
    if (e.altKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
      return;
    }
    // Alt + T : New tab (opens dropdown)
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      btnNewTab.click();
      return;
    }
    // Alt + W : Close active tab
    if (e.altKey && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      if (activeTabId) closeTab(activeTabId);
      return;
    }
    // Alt + [1-9] : Switch tab
    if (e.altKey && e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < tabs.length) {
        e.preventDefault();
        switchTab(tabs[idx].id);
        return;
      }
    }
  });

  // PWA Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBtn) pwaInstallBtn.style.display = 'inline-flex';
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          pwaInstallBtn.style.display = 'none';
        }
        deferredPrompt = null;
      }
    });
  }

  // Helpers
  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // App Init
  async function init() {
    await ensureFontLoaded();
    await fetchHosts();

    // Default open first host (node01 hermes)
    if (savedHosts.length > 0) {
      openTabForHost(savedHosts[0]);
    } else {
      createTab('main', 'node01 (hermes)', 'node01-hermes', '#7aa2f7', true);
    }
  }

  init();
})();
