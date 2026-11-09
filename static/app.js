// NodeDeck Terminal - Modern Web SSH & SFTP Manager
(function() {
  'use strict';

  // Professional Slate / OLED Palette
  const THEME = {
    background: '#0a0c10',
    foreground: '#d8dce4',
    cursor: '#3b82f6',
    cursorAccent: '#0a0c10',
    selectionBackground: 'rgba(59, 130, 246, 0.35)',
    black: '#15161e',
    red: '#f7768e',
    green: '#10b981',
    yellow: '#e0af68',
    blue: '#3b82f6',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#10b981',
    brightYellow: '#e0af68',
    brightBlue: '#60a5fa',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5'
  };

  // DOM Elements - Header & Global
  const tabsContainer = document.getElementById('tabs-container');
  const terminalContainer = document.getElementById('terminal-container');
  const btnDashboard = document.getElementById('btn-dashboard');
  const btnNewTab = document.getElementById('btn-new-tab');
  const hostDropdown = document.getElementById('host-dropdown');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('sidebar');
  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  const btnQuickAddHost = document.getElementById('btn-quick-add-host');
  const btnAddHost = document.getElementById('btn-add-host');

  // Dashboard DOM
  const dashboardView = document.getElementById('dashboard-view');
  const dashHostsGrid = document.getElementById('dash-hosts-grid');
  const dashBtnAddHost = document.getElementById('dash-btn-add-host');
  const formQuickConnect = document.getElementById('form-quick-connect');
  const qcHost = document.getElementById('qc-host');
  const qcPort = document.getElementById('qc-port');
  const qcUser = document.getElementById('qc-user');
  const qcAuth = document.getElementById('qc-auth');
  const qcPassword = document.getElementById('qc-password');
  const qcKeypath = document.getElementById('qc-keypath');
  const qcGroupPassword = document.getElementById('qc-group-password');
  const qcGroupKey = document.getElementById('qc-group-key');
  const qcBtnEye = document.getElementById('qc-btn-eye');

  // Sidebar DOM
  const navTabs = document.querySelectorAll('.sidebar-nav .nav-tab');
  const viewHosts = document.getElementById('view-hosts');
  const viewFiles = document.getElementById('view-files');
  const hostSearch = document.getElementById('host-search');
  const hostList = document.getElementById('host-list');

  // SFTP DOM
  const fsConnectView = document.getElementById('fs-connect-view');
  const fsActiveView = document.getElementById('fs-active-view');
  const fsCurrentPath = document.getElementById('fs-current-path');
  const fsBtnUp = document.getElementById('fs-btn-up');
  const fsBtnRefresh = document.getElementById('fs-btn-refresh');
  const fsBtnDisconnect = document.getElementById('fs-btn-disconnect');
  const fsBtnMkdir = document.getElementById('fs-btn-mkdir');
  const fsFileInput = document.getElementById('fs-file-input');
  const fileList = document.getElementById('file-list');
  const fsPresetBtns = document.querySelectorAll('.fs-preset-btn');
  const fsCustomPathForm = document.getElementById('fs-custom-path-form');
  const fsCustomInput = document.getElementById('fs-custom-input');

  // Modal 1: Host Add / Edit DOM
  const modalHost = document.getElementById('modal-host');
  const modalHostClose = document.getElementById('modal-host-close');
  const btnCancelHost = document.getElementById('btn-cancel-host');
  const formHost = document.getElementById('form-host');
  const hostInputType = document.getElementById('host-input-type');
  const hostInputAuth = document.getElementById('host-input-auth');
  const hostInputPassword = document.getElementById('host-input-password');
  const groupHostPassword = document.getElementById('group-host-password');
  const groupHostKey = document.getElementById('group-host-key');
  const hostBtnEye = document.getElementById('host-btn-eye');

  // Modal 2: Create Folder DOM
  const modalMkdir = document.getElementById('modal-mkdir');
  const modalMkdirClose = document.getElementById('modal-mkdir-close');
  const btnCancelMkdir = document.getElementById('btn-cancel-mkdir');
  const formMkdir = document.getElementById('form-mkdir');
  const mkdirParentPath = document.getElementById('mkdir-parent-path');
  const mkdirInputName = document.getElementById('mkdir-input-name');

  // Modal 3: Confirm Delete DOM
  const modalDelete = document.getElementById('modal-delete');
  const modalDeleteClose = document.getElementById('modal-delete-close');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const deletePromptMsg = document.getElementById('delete-prompt-msg');

  let tabs = [];
  let activeTabId = null;
  let savedHosts = [];
  let sftpConnected = false;
  let currentFsPath = '';
  let currentFsParent = '';
  let deferredPrompt = null;
  let pendingDeleteAction = null;

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

  // --- 1. Sidebar Management ---
  function setSidebarOpen(open) {
    if (open) {
      sidebar.classList.remove('collapsed');
      if (btnToggleSidebar) btnToggleSidebar.classList.add('active');
    } else {
      sidebar.classList.add('collapsed');
      if (btnToggleSidebar) btnToggleSidebar.classList.remove('active');
    }
    try {
      localStorage.setItem('nodedeck_sidebar_open', open ? 'true' : 'false');
    } catch (e) {}

    setTimeout(() => {
      refitActiveTerminal();
    }, 240);
  }

  function toggleSidebar() {
    const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
    setSidebarOpen(isCurrentlyCollapsed);
  }

  function initSidebar() {
    let shouldOpen = false;
    try {
      const saved = localStorage.getItem('nodedeck_sidebar_open') || localStorage.getItem('phantom_sidebar_open');
      if (saved !== null) {
        shouldOpen = (saved === 'true');
      } else {
        shouldOpen = (window.innerWidth >= 900);
      }
    } catch (e) {}

    setSidebarOpen(shouldOpen);

    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      });
    }
  }

  // Segmented Sidebar Navigation (Hosts vs SFTP Files)
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
        // Manual SFTP check: do not auto-connect to hermes!
        if (sftpConnected && currentFsPath) {
          fsConnectView.style.display = 'none';
          fsActiveView.style.display = 'flex';
          loadFiles(currentFsPath);
        } else {
          fsConnectView.style.display = 'flex';
          fsActiveView.style.display = 'none';
        }
      }
    });
  });

  // --- 2. Dashboard & View Switching ---
  function showDashboard() {
    activeTabId = null;
    tabs.forEach(t => {
      t.tabEl.classList.remove('active');
      t.panelEl.classList.remove('active');
    });

    if (dashboardView) {
      dashboardView.style.display = 'block';
    }
    if (btnDashboard) {
      btnDashboard.classList.add('active');
    }
  }

  function hideDashboard() {
    if (dashboardView) {
      dashboardView.style.display = 'none';
    }
    if (btnDashboard) {
      btnDashboard.classList.remove('active');
    }
  }

  if (btnDashboard) {
    btnDashboard.addEventListener('click', (e) => {
      e.preventDefault();
      showDashboard();
    });
  }

  // --- 3. Hosts Management ---
  async function fetchHosts() {
    try {
      const res = await fetch('/api/hosts');
      if (res.ok) {
        savedHosts = await res.json();
        renderHostList();
        renderHostDropdown();
        renderDashboardHosts();
      }
    } catch (err) {
      console.error('Failed to load hosts:', err);
    }
  }

  function renderDashboardHosts() {
    if (!dashHostsGrid) return;
    dashHostsGrid.innerHTML = '';

    if (!savedHosts || savedHosts.length === 0) {
      dashHostsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 24px 16px; text-align: center; color: var(--text-dim); font-size: 13px;">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px; opacity:0.4;">
            <rect x="2" y="2" width="20" height="8" rx="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2"/>
          </svg>
          <div>Tiada hos tersimpan.</div>
          <p style="font-size:11px; margin-top:4px; opacity:0.8;">Gunakan <b>Sambungan Pantas</b> di atas atau klik <b>[+ Tambah Hos]</b> untuk menambah profil sambungan manual.</p>
        </div>
      `;
      return;
    }

    savedHosts.forEach(h => {
      const item = document.createElement('div');
      item.className = 'dash-host-item';
      const color = h.color || '#3b82f6';
      const meta = h.type === 'local' ? `Local Shell (${h.user})` : `${h.user}@${h.host}:${h.port || 22}`;

      item.innerHTML = `
        <span class="host-status-dot" style="background:${color}; color:${color}"></span>
        <div class="host-info">
          <div class="host-name">${escapeHtml(h.name)}</div>
          <div class="host-meta">${escapeHtml(meta)}</div>
        </div>
        <button class="dash-connect-btn" title="Sambung Sesi">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
      `;

      item.addEventListener('click', () => {
        openTabForHost(h);
      });

      dashHostsGrid.appendChild(item);
    });
  }

  function renderHostList(filter = '') {
    if (!hostList) return;
    hostList.innerHTML = '';

    if (!savedHosts || savedHosts.length === 0) {
      hostList.innerHTML = `
        <div style="padding: 28px 12px; text-align: center; color: var(--text-dim); font-size: 12px;">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px; opacity:0.5;">
            <rect x="2" y="2" width="20" height="8" rx="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2"/>
          </svg>
          <div>Tiada hos tersimpan</div>
          <p style="font-size:11px; margin-top:4px; opacity:0.8;">Klik [+ Tambah Sambungan] di bawah.</p>
        </div>
      `;
      return;
    }

    const filtered = savedHosts.filter(h => 
      (h.name || '').toLowerCase().includes(filter.toLowerCase()) || 
      (h.host || '').toLowerCase().includes(filter.toLowerCase()) ||
      (h.user || '').toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      hostList.innerHTML = `
        <div style="padding: 28px 12px; text-align: center; color: var(--text-dim); font-size: 12px;">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px; opacity:0.5;">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div>Tiada sambungan dijumpai</div>
        </div>
      `;
      return;
    }

    filtered.forEach(h => {
      const card = document.createElement('div');
      card.className = 'host-card';
      const meta = h.type === 'local' ? `Local Shell (${h.user})` : `${h.user}@${h.host}:${h.port || 22}`;
      const color = h.color || '#3b82f6';
      
      card.innerHTML = `
        <span class="host-status-dot" style="background:${color}; color:${color}"></span>
        <div class="host-info">
          <div class="host-name">${escapeHtml(h.name)}</div>
          <div class="host-meta">${escapeHtml(meta)}</div>
        </div>
        <div class="host-actions">
          <button class="host-action-btn host-del" title="Padam Sambungan">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.host-del')) {
          e.stopPropagation();
          promptDeleteHost(h);
        } else {
          openTabForHost(h);
        }
      });

      hostList.appendChild(card);
    });
  }

  function renderHostDropdown() {
    if (!hostDropdown) return;
    hostDropdown.innerHTML = '';

    if (savedHosts && savedHosts.length > 0) {
      savedHosts.forEach(h => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `
          <span class="tab-badge" style="background:${h.color || '#3b82f6'}"></span>
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
    }

    const addOpt = document.createElement('div');
    addOpt.className = 'dropdown-item';
    addOpt.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:2px;">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Tambah Sambungan...</span>
    `;
    addOpt.addEventListener('click', () => {
      hostDropdown.classList.remove('show');
      openAddHostModal();
    });
    hostDropdown.appendChild(addOpt);
  }

  function promptDeleteHost(hostItem) {
    showDeleteModal(`Padam sambungan hos '${hostItem.name}'?`, async () => {
      try {
        await fetch(`/api/hosts?id=${encodeURIComponent(hostItem.id)}`, { method: 'DELETE' });
        await fetchHosts();
      } catch (err) {
        alert('Gagal memadam hos: ' + err.message);
      }
    });
  }

  // Eye toggle helper
  function setupPasswordEyeToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isPwd = (input.type === 'password');
      input.type = isPwd ? 'text' : 'password';
      btn.style.color = isPwd ? 'var(--accent-blue)' : 'var(--text-dim)';
    });
  }

  setupPasswordEyeToggle(qcBtnEye, qcPassword);
  setupPasswordEyeToggle(hostBtnEye, hostInputPassword);

  // Quick Connect Auth switcher
  if (qcAuth) {
    qcAuth.addEventListener('change', () => {
      const val = qcAuth.value;
      if (val === 'password') {
        qcGroupPassword.style.display = 'block';
        qcGroupKey.style.display = 'none';
      } else if (val === 'key') {
        qcGroupPassword.style.display = 'none';
        qcGroupKey.style.display = 'block';
      } else {
        qcGroupPassword.style.display = 'none';
        qcGroupKey.style.display = 'none';
      }
    });
  }

  // Quick Connect Form Submit
  if (formQuickConnect) {
    formQuickConnect.addEventListener('submit', async (e) => {
      e.preventDefault();
      const host = qcHost.value.trim();
      const port = parseInt(qcPort.value, 10) || 22;
      const user = qcUser.value.trim();
      const auth = qcAuth.value;
      const password = qcPassword ? qcPassword.value : '';
      const keyPath = qcKeypath ? qcKeypath.value.trim() : '';

      if (!host || !user) return;

      const payload = {
        name: `${user}@${host}`,
        type: 'ssh',
        host,
        port,
        user,
        auth,
        password: auth === 'password' ? password : '',
        key_path: auth === 'key' ? keyPath : '',
        color: '#3b82f6'
      };

      try {
        const res = await fetch('/api/session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          const newId = 'tab-' + Math.random().toString(36).substring(2, 8);
          createTab(newId, payload.name, payload.name, '#3b82f6', true, data.session_id);
        } else {
          alert('Gagal memulakan sesi: ' + (await res.text()));
        }
      } catch (err) {
        alert('Ralat sambungan: ' + err.message);
      }
    });
  }

  // Host Modal View Updates
  function openAddHostModal() {
    formHost.reset();
    document.getElementById('host-input-id').value = '';
    document.getElementById('modal-host-title').textContent = 'Tambah Sambungan Hos';
    updateModalFormFields();
    modalHost.classList.add('show');
  }

  function updateModalFormFields() {
    const type = hostInputType.value;
    const auth = hostInputAuth.value;
    const isLocal = (type === 'local');

    document.getElementById('group-host-address').style.display = isLocal ? 'none' : 'block';
    document.getElementById('group-host-port').style.display = isLocal ? 'none' : 'block';
    document.getElementById('group-host-auth').style.display = isLocal ? 'none' : 'block';

    if (isLocal) {
      groupHostPassword.style.display = 'none';
      groupHostKey.style.display = 'none';
    } else {
      if (auth === 'password') {
        groupHostPassword.style.display = 'block';
        groupHostKey.style.display = 'none';
      } else if (auth === 'key') {
        groupHostPassword.style.display = 'none';
        groupHostKey.style.display = 'block';
      } else {
        groupHostPassword.style.display = 'none';
        groupHostKey.style.display = 'none';
      }
    }
  }

  hostInputType.addEventListener('change', updateModalFormFields);
  hostInputAuth.addEventListener('change', updateModalFormFields);

  formHost.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = hostInputType.value;
    const name = document.getElementById('host-input-name').value.trim();
    const address = document.getElementById('host-input-address').value.trim();
    const user = document.getElementById('host-input-user').value.trim();
    const port = parseInt(document.getElementById('host-input-port').value, 10) || 22;
    const auth = hostInputAuth.value;
    const password = hostInputPassword ? hostInputPassword.value : '';
    const keyPath = document.getElementById('host-input-keypath').value.trim();
    const colorEl = document.querySelector('input[name="host-color"]:checked');
    const color = colorEl ? colorEl.value : '#3b82f6';
    const id = document.getElementById('host-input-id').value;

    const payload = {
      id: id || undefined,
      name,
      type,
      host: type === 'local' ? 'localhost' : address,
      port,
      user,
      auth,
      password: auth === 'password' ? password : '',
      key_path: auth === 'key' ? keyPath : '',
      color
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
        alert('Gagal simpan sambungan: ' + (await res.text()));
      }
    } catch (err) {
      alert('Ralat simpan hos: ' + err.message);
    }
  });

  modalHostClose.addEventListener('click', () => modalHost.classList.remove('show'));
  btnCancelHost.addEventListener('click', () => modalHost.classList.remove('show'));
  btnAddHost.addEventListener('click', openAddHostModal);
  btnQuickAddHost.addEventListener('click', openAddHostModal);
  if (dashBtnAddHost) dashBtnAddHost.addEventListener('click', openAddHostModal);

  hostSearch.addEventListener('input', (e) => {
    renderHostList(e.target.value);
  });

  // Dropdown toggle (+)
  btnNewTab.addEventListener('click', (e) => {
    e.stopPropagation();
    hostDropdown.classList.toggle('show');
  });

  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-wrapper')) {
      hostDropdown.classList.remove('show');
    }
  });

  // --- 4. SFTP / File Explorer (Manual Connection Only) ---
  function connectSftp(path) {
    if (!path || !path.trim()) return;
    currentFsPath = path.trim();
    sftpConnected = true;
    fsConnectView.style.display = 'none';
    fsActiveView.style.display = 'flex';
    loadFiles(currentFsPath);
  }

  function disconnectSftp() {
    sftpConnected = false;
    currentFsPath = '';
    currentFsParent = '';
    fsActiveView.style.display = 'none';
    fsConnectView.style.display = 'flex';
  }

  if (fsBtnDisconnect) {
    fsBtnDisconnect.addEventListener('click', (e) => {
      e.preventDefault();
      disconnectSftp();
    });
  }

  fsPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.path;
      if (p) connectSftp(p);
    });
  });

  if (fsCustomPathForm) {
    fsCustomPathForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = fsCustomInput.value.trim();
      if (p) connectSftp(p);
    });
  }

  async function loadFiles(path) {
    if (!path) return;
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        currentFsPath = data.current;
        currentFsParent = data.parent;
        fsCurrentPath.textContent = currentFsPath;
        fsCurrentPath.title = currentFsPath;
        renderFiles(data.items);
      } else {
        alert('Gagal memuat fail: ' + (await res.text()));
      }
    } catch (err) {
      console.error('FS list error:', err);
    }
  }

  function renderFiles(items) {
    fileList.innerHTML = '';
    if (!items || items.length === 0) {
      fileList.innerHTML = `
        <div style="padding: 28px 12px; text-align: center; color: var(--text-dim); font-size: 12px;">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px; opacity:0.5;">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <div>Folder ini kosong</div>
        </div>
      `;
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
      const isDir = item.is_dir;
      const sizeStr = isDir ? '' : formatBytes(item.size);

      const folderIcon = `
        <svg class="file-icon folder" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      `;

      const fileIcon = `
        <svg class="file-icon file" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      `;

      row.innerHTML = `
        ${isDir ? folderIcon : fileIcon}
        <span class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="file-size">${sizeStr}</span>
        ${!isDir ? `
          <button class="file-action-btn btn-dl" title="Muat Turun Fail">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        ` : ''}
        <button class="file-action-btn btn-del" title="Padam Fail">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-dl')) {
          e.stopPropagation();
          downloadFile(item.path);
        } else if (e.target.closest('.btn-del')) {
          e.stopPropagation();
          promptDeleteFile(item.path);
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

  // Delete Modal Trigger
  function showDeleteModal(message, onConfirm) {
    deletePromptMsg.textContent = message;
    pendingDeleteAction = onConfirm;
    modalDelete.classList.add('show');
  }

  btnConfirmDelete.addEventListener('click', async () => {
    modalDelete.classList.remove('show');
    if (pendingDeleteAction) {
      await pendingDeleteAction();
      pendingDeleteAction = null;
    }
  });

  btnCancelDelete.addEventListener('click', () => modalDelete.classList.remove('show'));
  modalDeleteClose.addEventListener('click', () => modalDelete.classList.remove('show'));

  function promptDeleteFile(path) {
    showDeleteModal(`Padam fail atau folder '${path}'?`, async () => {
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
    });
  }

  fsBtnUp.addEventListener('click', () => {
    if (currentFsParent && currentFsParent !== currentFsPath) {
      loadFiles(currentFsParent);
    }
  });

  fsBtnRefresh.addEventListener('click', () => {
    if (currentFsPath) loadFiles(currentFsPath);
  });

  // Folder creation via custom modal
  fsBtnMkdir.addEventListener('click', () => {
    mkdirParentPath.textContent = currentFsPath || '/';
    mkdirInputName.value = '';
    modalMkdir.classList.add('show');
    setTimeout(() => mkdirInputName.focus(), 50);
  });

  formMkdir.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = mkdirInputName.value.trim();
    if (!name || !currentFsPath) return;
    const targetDir = currentFsPath.replace(/\/+$/, '') + '/' + name;
    try {
      const res = await fetch(`/api/fs/mkdir?path=${encodeURIComponent(targetDir)}`, { method: 'POST' });
      if (res.ok) {
        modalMkdir.classList.remove('show');
        loadFiles(currentFsPath);
      } else {
        alert('Gagal cipta folder: ' + (await res.text()));
      }
    } catch (err) {
      alert('Ralat cipta folder: ' + err.message);
    }
  });

  btnCancelMkdir.addEventListener('click', () => modalMkdir.classList.remove('show'));
  modalMkdirClose.addEventListener('click', () => modalMkdir.classList.remove('show'));

  fsFileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentFsPath) return;
    await uploadFiles(files);
    fsFileInput.value = '';
  });

  async function uploadFiles(fileListToUpload) {
    if (!currentFsPath) return;
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
    viewFiles.style.borderColor = '#3b82f6';
  });

  viewFiles.addEventListener('dragleave', () => {
    viewFiles.style.borderColor = '';
  });

  viewFiles.addEventListener('drop', async (e) => {
    e.preventDefault();
    viewFiles.style.borderColor = '';
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0 && currentFsPath) {
      await uploadFiles(e.dataTransfer.files);
    }
  });

  // --- 5. Terminal & Tab Management ---
  function openTabForHost(hostItem) {
    const newId = 'tab-' + Math.random().toString(36).substring(2, 8);
    createTab(newId, hostItem.name, hostItem.id, hostItem.color || '#3b82f6', true);
  }

  function createTab(id, name, hostId = '', color = '#3b82f6', activate = true, sessionId = null) {
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

    // Xterm Instance with Native Buffer & Scrollback
    const term = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrainsMono Nerd Font', 'Cascadia Code', monospace",
      fontSize: 14,
      lineHeight: 1.25,
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
      console.warn('WebGL fallback to standard canvas:', e);
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
      sessionId,
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

    // Keyboard & Selection Handling
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

      // Ctrl + V or Ctrl + Shift + V (Native paste)
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

    // Right-click paste
    panelEl.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      if (term.hasSelection()) {
        const text = term.getSelection();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
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
    let wsUrl = `${proto}//${window.location.host}/ws?id=${encodeURIComponent(tabObj.id)}`;
    if (tabObj.sessionId) {
      wsUrl += `&session=${encodeURIComponent(tabObj.sessionId)}`;
    } else {
      wsUrl += `&host=${encodeURIComponent(tabObj.hostId)}`;
    }

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
        tabObj.term.write('\r\n\x1b[33m[Sesi ditamatkan. Sila pilih sambungan di tab bar atau dashboard]\x1b[0m\r\n');
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

    hideDashboard();
    activeTabId = id;
    tabs.forEach(t => {
      const isActive = (t.id === id);
      t.tabEl.classList.toggle('active', isActive);
      t.panelEl.classList.toggle('active', isActive);
    });

    setTimeout(() => {
      tabObj.fitAddon.fit();
      sendResize(tabObj);
      tabObj.term.focus();
    }, 15);
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
      showDashboard();
    } else {
      if (activeTabId === id) {
        const nextIdx = Math.max(0, idx - 1);
        switchTab(tabs[nextIdx].id);
      }
    }
  }

  function refitActiveTerminal() {
    if (!activeTabId) return;
    const active = tabs.find(t => t.id === activeTabId);
    if (active) {
      try {
        active.fitAddon.fit();
        sendResize(active);
      } catch (e) {}
    }
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refitActiveTerminal, 60);
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

  // App Initialization
  async function init() {
    initSidebar();
    await ensureFontLoaded();
    await fetchHosts();

    // Default: Show Dashboard on initial start (do not auto-enter SSH shell)
    showDashboard();
  }

  init();
})();
