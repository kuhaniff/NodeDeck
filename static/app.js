// NodeDeck Terminal - Modern Web SSH & SFTP Manager
(function() {
  'use strict';

  // Terminal Themes (including Windows Terminal specs: coolnight, CutiePro, Fahrenheit, Monokai Remastered)
  const THEMES = {
    'nodedeck': {
      id: 'nodedeck',
      name: 'NodeDeck Slate',
      shortName: 'Slate',
      swatch: ['#0a0c10', '#3b82f6', '#10b981', '#f7768e'],
      xterm: {
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
      }
    },
    'coolnight': {
      id: 'coolnight',
      name: 'Coolnight',
      shortName: 'Coolnight',
      swatch: ['#010B17', '#1376F8', '#52FFCF', '#FF5DD4'],
      xterm: {
        background: '#010B17',
        foreground: '#EBDDF4',
        cursor: '#52FFCF',
        cursorAccent: '#010B17',
        selectionBackground: 'rgba(56, 255, 156, 0.3)',
        black: '#0B3B61',
        red: '#FF3A3A',
        green: '#52FFCF',
        yellow: '#FFF383',
        blue: '#1376F8',
        magenta: '#AE81FF',
        cyan: '#FF5DD4',
        white: '#15FCA2',
        brightBlack: '#62686C',
        brightRed: '#FF54B0',
        brightGreen: '#73FFD8',
        brightYellow: '#FCF4AD',
        brightBlue: '#378DFE',
        brightMagenta: '#8F4673',
        brightCyan: '#FF69D7',
        brightWhite: '#5FFBBE'
      }
    },
    'cutiepro': {
      id: 'cutiepro',
      name: 'CutiePro',
      shortName: 'CutiePro',
      swatch: ['#181818', '#42D9C5', '#BEC975', '#F56E7F'],
      xterm: {
        background: '#181818',
        foreground: '#D5D0C9',
        cursor: '#EFC4CD',
        cursorAccent: '#181818',
        selectionBackground: 'rgba(66, 217, 197, 0.3)',
        black: '#000000',
        red: '#F56E7F',
        green: '#BEC975',
        yellow: '#F58669',
        blue: '#42D9C5',
        magenta: '#D286B7',
        cyan: '#37CB8A',
        white: '#D5C3C3',
        brightBlack: '#88847F',
        brightRed: '#E5A1A3',
        brightGreen: '#E8D6A7',
        brightYellow: '#F1BB79',
        brightBlue: '#80C5DE',
        brightMagenta: '#B294BB',
        brightCyan: '#9DCCBB',
        brightWhite: '#FFFFFF'
      }
    },
    'fahrenheit': {
      id: 'fahrenheit',
      name: 'Fahrenheit',
      shortName: 'Fahrenheit',
      swatch: ['#191919', '#5E8D87', '#6CA64D', '#D95454'],
      xterm: {
        background: '#191919',
        foreground: '#A6A6A6',
        cursor: '#E5BE5E',
        cursorAccent: '#191919',
        selectionBackground: 'rgba(112, 180, 172, 0.3)',
        black: '#262626',
        red: '#D95454',
        green: '#6CA64D',
        yellow: '#E5BE5E',
        blue: '#5E8D87',
        magenta: '#B25E7B',
        cyan: '#70B4AC',
        white: '#D9D9D9',
        brightBlack: '#555555',
        brightRed: '#FF6B6B',
        brightGreen: '#8CC864',
        brightYellow: '#FFD166',
        brightBlue: '#70B4AC',
        brightPurple: '#D47395',
        brightMagenta: '#D47395',
        brightCyan: '#95D1C9',
        brightWhite: '#E5E5E5'
      }
    },
    'monokai-remastered': {
      id: 'monokai-remastered',
      name: 'Monokai Remastered',
      shortName: 'Monokai',
      swatch: ['#1a1a1a', '#9d65ff', '#98e024', '#f4005f'],
      xterm: {
        background: '#1a1a1a',
        foreground: '#c4c5b5',
        cursor: '#fd971f',
        cursorAccent: '#1a1a1a',
        selectionBackground: 'rgba(98, 94, 76, 0.45)',
        black: '#1a1a1a',
        red: '#f4005f',
        green: '#98e024',
        yellow: '#fd971f',
        blue: '#9d65ff',
        magenta: '#f4005f',
        cyan: '#58d1eb',
        white: '#c4c5b5',
        brightBlack: '#625e4c',
        brightRed: '#f4005f',
        brightGreen: '#98e024',
        brightYellow: '#e0d561',
        brightBlue: '#9d65ff',
        brightMagenta: '#f4005f',
        brightCyan: '#58d1eb',
        brightWhite: '#f6f6ef'
      }
    }
  };

  let activeThemeId = 'nodedeck';

  function getActiveTheme() {
    return THEMES[activeThemeId] || THEMES['nodedeck'];
  }

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
  const btnThemeSelector = document.getElementById('btn-theme-selector');
  const themeDropdown = document.getElementById('theme-dropdown');
  const themeActiveLabel = document.getElementById('theme-active-label');

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
  const qcStatusMsg = document.getElementById('qc-status-msg');
  const qcBtnSubmit = document.getElementById('qc-btn-submit');

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

  // Sidebar Resizer DOM
  const sidebarResizer = document.getElementById('sidebar-resizer');

  // Modal 4: File Preview & Editor DOM (OpenCode Style)
  const modalEditor = document.getElementById('modal-editor');
  const modalEditorClose = document.getElementById('modal-editor-close');
  const editorFilename = document.getElementById('editor-filename');
  const editorDirty = document.getElementById('editor-dirty');
  const editorFilepath = document.getElementById('editor-filepath');
  const editorStatus = document.getElementById('editor-status');
  const editorBtnSave = document.getElementById('editor-btn-save');
  const editorBtnDownload = document.getElementById('editor-btn-download');
  const editorLineNumbers = document.getElementById('editor-line-numbers');
  const editorTextarea = document.getElementById('editor-textarea');
  const editorInfoLines = document.getElementById('editor-info-lines');
  const editorInfoSize = document.getElementById('editor-info-size');

  let tabs = [];
  let activeTabId = null;
  let savedHosts = [];
  let sftpConnected = false;
  let currentFsPath = '';
  let currentFsParent = '';
  let deferredPrompt = null;
  let pendingDeleteAction = null;
  let ctrlArmed = false;
  let termFontSize = 14;
  try {
    const savedFs = parseInt(localStorage.getItem('nodedeck_font_size'), 10);
    if (savedFs >= 9 && savedFs <= 28) termFontSize = savedFs;
  } catch (e) {}

  // --- UX helpers: toast notifications (replaces blocking alert()) ---
  function toast(message, type) {
    type = type || 'error';
    let stack = document.getElementById('toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    const msg = document.createElement('span');
    msg.textContent = String(message);
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'toast-close';
    x.setAttribute('aria-label', 'Dismiss');
    x.innerHTML = '&times;';
    el.appendChild(msg);
    el.appendChild(x);
    stack.appendChild(el);
    const remove = () => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 180);
    };
    x.addEventListener('click', remove);
    setTimeout(remove, type === 'error' ? 6500 : 3500);
  }

  function countSessionsForHost(hostId) {
    return tabs.filter(t => t.hostId === hostId && !t.disconnected).length;
  }

  function refreshHostSessionBadges() {
    renderHostList(hostSearch ? hostSearch.value : '');
    renderDashboardHosts();
  }

  let currentEditingPath = '';
  let originalEditorContent = '';
  let isEditorDirty = false;

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

  // --- 0. Theme Management ---
  function applyTheme(themeId) {
    if (!THEMES[themeId]) themeId = 'nodedeck';
    activeThemeId = themeId;
    const themeDef = THEMES[themeId];

    try {
      localStorage.setItem('nodedeck_theme', themeId);
    } catch (e) {}

    // Apply full-web theme variables across the whole app
    const root = document.documentElement;
    const xt = themeDef.xterm;
    const isSlate = (themeId === 'nodedeck');
    
    // Background tokens
    root.style.setProperty('--bg-app', xt.background);
    root.style.setProperty('--bg-header', isSlate ? '#0e1117' : xt.black || xt.background);
    root.style.setProperty('--bg-sidebar', isSlate ? '#11141c' : xt.background);
    root.style.setProperty('--bg-card', isSlate ? '#151922' : (xt.brightBlack || '#1a1f2c'));
    root.style.setProperty('--bg-card-hover', isSlate ? '#1c2230' : (xt.selectionBackground ? xt.brightBlack : '#252c3d'));
    root.style.setProperty('--bg-input', isSlate ? '#0a0d13' : xt.background);
    
    // Text tokens
    root.style.setProperty('--text-main', xt.foreground || '#f1f5f9');
    root.style.setProperty('--text-muted', xt.white || '#94a3b8');
    root.style.setProperty('--text-dim', xt.brightBlack || '#64748b');
    
    // Accent tokens
    const primaryAccent = xt.blue || xt.cursor || '#3b82f6';
    root.style.setProperty('--accent-blue', primaryAccent);
    root.style.setProperty('--border-focus', primaryAccent);
    if (xt.red) root.style.setProperty('--accent-red', xt.red);
    if (xt.green) root.style.setProperty('--accent-green', xt.green);
    if (xt.yellow) root.style.setProperty('--accent-amber', xt.yellow);
    if (xt.magenta) root.style.setProperty('--accent-purple', xt.magenta);

    if (themeActiveLabel) {
      themeActiveLabel.textContent = themeDef.shortName;
    }

    tabs.forEach(t => {
      if (t.term) {
        t.term.options.theme = themeDef.xterm;
      }
      if (t.panelEl) {
        t.panelEl.style.backgroundColor = themeDef.xterm.background;
      }
    });

    if (terminalContainer) {
      terminalContainer.style.backgroundColor = themeDef.xterm.background;
    }

    renderThemeDropdown();
  }

  function renderThemeDropdown() {
    if (!themeDropdown) return;
    themeDropdown.innerHTML = '';

    Object.values(THEMES).forEach(th => {
      const item = document.createElement('div');
      item.className = 'theme-item' + (th.id === activeThemeId ? ' active' : '');
      const dotsHtml = th.swatch.map(c => `<span class="theme-dot" style="background:${c};"></span>`).join('');
      item.innerHTML = `
        <div class="theme-item-left">
          <div class="theme-preview">${dotsHtml}</div>
          <span>${escapeHtml(th.name)}</span>
        </div>
        ${th.id === activeThemeId ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#60a5fa" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      `;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        applyTheme(th.id);
        themeDropdown.classList.remove('show');
      });

      themeDropdown.appendChild(item);
    });
  }

  function initThemes() {
    try {
      const saved = localStorage.getItem('nodedeck_theme');
      if (saved && THEMES[saved]) {
        activeThemeId = saved;
      }
    } catch (e) {}

    applyTheme(activeThemeId);

    if (btnThemeSelector && themeDropdown) {
      btnThemeSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('show');
        if (hostDropdown) hostDropdown.classList.remove('show');
      });
    }
  }

  // --- 1. Sidebar Management ---
  function setSidebarOpen(open) {
    let backdrop = document.getElementById('sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebar-backdrop';
      backdrop.addEventListener('click', () => setSidebarOpen(false));
      document.getElementById('app-body').appendChild(backdrop);
    }
    backdrop.classList.toggle('show', open && window.innerWidth <= 768);
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

    initSidebarResizer();
  }

  function initSidebarResizer() {
    if (!sidebarResizer || !sidebar) return;

    try {
      const savedWidth = localStorage.getItem('nodedeck_sidebar_width');
      if (savedWidth) {
        const w = parseInt(savedWidth, 10);
        if (w >= 180 && w <= 700) {
          sidebar.style.width = w + 'px';
        }
      }
    } catch (e) {}

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    sidebarResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.getBoundingClientRect().width;
      sidebarResizer.classList.add('resizing');
      document.body.classList.add('resizing-sidebar');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(180, Math.min(700, startWidth + (e.clientX - startX)));
      sidebar.style.width = newWidth + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      sidebarResizer.classList.remove('resizing');
      document.body.classList.remove('resizing-sidebar');
      try {
        const currentWidth = Math.round(sidebar.getBoundingClientRect().width);
        localStorage.setItem('nodedeck_sidebar_width', currentWidth.toString());
      } catch (e) {}
      refitActiveTerminal();
    });
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

    document.body.classList.remove('term-active');
    if (dashboardView) {
      dashboardView.style.display = 'block';
    }
    if (btnDashboard) {
      btnDashboard.classList.add('active');
    }
  }

  function hideDashboard() {
    document.body.classList.add('term-active');
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
          <div>No saved hosts.</div>
          <p style="font-size:11px; margin-top:4px; opacity:0.8;">Use <b>Quick Connect</b> above or click <b>[+ Add Host]</b> to save connection profiles.</p>
        </div>
      `;
      return;
    }

    savedHosts.forEach(h => {
      const item = document.createElement('div');
      item.className = 'dash-host-item';
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', 'Connect to ' + (h.name || 'host'));
      const color = h.color || '#3b82f6';
      const meta = h.type === 'local' ? `Local Shell (${h.user})` : `${h.user}@${h.host}:${h.port || 22}`;
      const live = countSessionsForHost(h.id);

      item.innerHTML = `
        <span class="host-status-dot" style="background:${color}; color:${color}"></span>
        <div class="host-info">
          <div class="host-name">${escapeHtml(h.name)}${live ? `<span class="live-pill" title="${live} open session(s)">${live} live</span>` : ''}</div>
          <div class="host-meta">${escapeHtml(meta)}</div>
        </div>
        <button type="button" class="dash-edit-btn" title="Edit connection" aria-label="Edit connection">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
          </svg>
        </button>
        <button type="button" class="dash-connect-btn" title="Connect Session" aria-label="Connect">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.dash-edit-btn')) {
          e.stopPropagation();
          openEditHostModal(h);
          return;
        }
        openTabForHost(h);
      });
      item.addEventListener('keydown', (e) => {
        if (e.target !== item) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openTabForHost(h);
        }
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
          <div>No saved hosts</div>
          <p style="font-size:11px; margin-top:4px; opacity:0.8;">Click [+ Add Connection] below.</p>
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
          <div>No connections found</div>
        </div>
      `;
      return;
    }

    filtered.forEach(h => {
      const card = document.createElement('div');
      card.className = 'host-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Connect to ' + (h.name || 'host'));
      const meta = h.type === 'local' ? `Local Shell (${h.user})` : `${h.user}@${h.host}:${h.port || 22}`;
      const color = h.color || '#3b82f6';
      const live = countSessionsForHost(h.id);

      card.innerHTML = `
        <span class="host-status-dot" style="background:${color}; color:${color}"></span>
        <div class="host-info">
          <div class="host-name">${escapeHtml(h.name)}${live ? `<span class="live-pill" title="${live} open session(s)">${live}</span>` : ''}</div>
          <div class="host-meta">${escapeHtml(meta)}</div>
        </div>
        <div class="host-actions">
          <button type="button" class="host-action-btn host-edit" title="Edit Connection" aria-label="Edit connection">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
            </svg>
          </button>
          <button type="button" class="host-action-btn host-del" title="Delete Connection" aria-label="Delete connection">
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
        } else if (e.target.closest('.host-edit')) {
          e.stopPropagation();
          openEditHostModal(h);
        } else {
          openTabForHost(h);
          if (window.innerWidth <= 768) setSidebarOpen(false);
        }
      });
      card.addEventListener('keydown', (e) => {
        if (e.target !== card) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
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
      <span>Add Connection...</span>
    `;
    addOpt.addEventListener('click', () => {
      hostDropdown.classList.remove('show');
      openAddHostModal();
    });
    hostDropdown.appendChild(addOpt);
  }

  function promptDeleteHost(hostItem) {
    const desc = hostItem.host ? `${hostItem.name} (${hostItem.user}@${hostItem.host})` : hostItem.name;
    showDeleteModal(desc, async () => {
      try {
        await fetch(`/api/hosts?id=${encodeURIComponent(hostItem.id)}`, { method: 'DELETE' });
        await fetchHosts();
      } catch (err) {
        toast('Failed to delete host: ' + err.message);
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

      if (qcStatusMsg) {
        qcStatusMsg.style.display = 'none';
        qcStatusMsg.textContent = '';
      }

      if (!host) {
        qcHost.focus();
        if (qcStatusMsg) {
          qcStatusMsg.textContent = 'Host / IP address is required';
          qcStatusMsg.style.display = 'inline-block';
        }
        return;
      }

      if (!user) {
        qcUser.focus();
        if (qcStatusMsg) {
          qcStatusMsg.textContent = 'Username is required';
          qcStatusMsg.style.display = 'inline-block';
        }
        return;
      }

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

      const btnSubmit = qcBtnSubmit || formQuickConnect.querySelector('button[type="submit"]');
      const originalHtml = btnSubmit ? btnSubmit.innerHTML : '';
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `
          <div class="spinner" style="width:13px; height:13px; border-width:2px; margin:0;"></div>
          <span>Connecting...</span>
        `;
      }

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
          const errText = await res.text();
          if (qcStatusMsg) {
            qcStatusMsg.textContent = errText || 'Failed to start session';
            qcStatusMsg.style.display = 'inline-block';
          } else {
            toast('Failed to start session: ' + errText);
          }
        }
      } catch (err) {
        if (qcStatusMsg) {
          qcStatusMsg.textContent = err.message || 'Connection error';
          qcStatusMsg.style.display = 'inline-block';
        } else {
          toast('Connection error: ' + err.message);
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = originalHtml;
        }
      }
    });
  }

  // Host Modal View Updates
  function openAddHostModal() {
    formHost.reset();
    document.getElementById('host-input-id').value = '';
    document.getElementById('modal-host-title').textContent = 'Add Host Connection';
    updateModalFormFields();
    modalHost.classList.add('show');
    setTimeout(() => {
      const first = document.getElementById('host-input-name');
      if (first) first.focus();
    }, 40);
  }

  function openEditHostModal(h) {
    formHost.reset();
    document.getElementById('host-input-id').value = h.id || '';
    document.getElementById('modal-host-title').textContent = 'Edit Host Connection';
    document.getElementById('host-input-name').value = h.name || '';
    hostInputType.value = h.type === 'local' ? 'local' : 'ssh';
    document.getElementById('host-input-address').value = h.type === 'local' ? '' : (h.host || '');
    document.getElementById('host-input-user').value = h.user || '';
    document.getElementById('host-input-port').value = h.port || 22;
    hostInputAuth.value = h.auth || 'password';
    if (hostInputPassword) hostInputPassword.value = h.password || '';
    document.getElementById('host-input-keypath').value = h.key_path || '';
    const radios = document.querySelectorAll('input[name="host-color"]');
    let matched = false;
    radios.forEach(r => {
      r.checked = (r.value === (h.color || '#3b82f6'));
      if (r.checked) matched = true;
    });
    if (!matched && radios[0]) radios[0].checked = true;
    updateModalFormFields();
    modalHost.classList.add('show');
    setTimeout(() => document.getElementById('host-input-name').focus(), 40);
  }

  // Close any open modal with Esc, or by clicking the dimmed backdrop
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    [modalHost, modalMkdir, modalDelete].forEach(m => {
      if (m && m.classList.contains('show')) m.classList.remove('show');
    });
    if (hostDropdown) hostDropdown.classList.remove('show');
    if (themeDropdown) themeDropdown.classList.remove('show');
  });
  [modalHost, modalMkdir].forEach(m => {
    if (!m) return;
    m.addEventListener('mousedown', (e) => {
      if (e.target === m) m.classList.remove('show');
    });
  });

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
        toast(id ? 'Connection updated' : 'Connection saved', 'success');
      } else {
        toast('Failed to save connection: ' + (await res.text()));
      }
    } catch (err) {
      toast('Error saving host: ' + err.message);
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
      if (hostDropdown) hostDropdown.classList.remove('show');
      if (themeDropdown) themeDropdown.classList.remove('show');
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

  async function loadFiles(path, silent = false) {
    if (!path) return;
    if (!silent) {
      fileList.innerHTML = `
        <div class="fs-loading-state">
          <div class="spinner"></div>
          <span>Loading directory...</span>
        </div>
      `;
    }
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
        const errText = await res.text();
        fileList.innerHTML = `
          <div style="padding: 24px 14px; text-align: center; color: #ef4444; font-size: 12px;">
            <div style="font-weight:600; margin-bottom:4px;">Cannot read directory</div>
            <div style="font-size:11px; color:var(--text-muted); word-break:break-all;">${escapeHtml(errText)}</div>
          </div>
        `;
      }
    } catch (err) {
      console.error('FS list error:', err);
      fileList.innerHTML = `
        <div style="padding: 24px 14px; text-align: center; color: #ef4444; font-size: 12px;">
          <div style="font-weight:600; margin-bottom:4px;">Network Error</div>
          <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(err.message)}</div>
        </div>
      `;
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
          <div>This folder is empty</div>
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
          <button class="file-action-btn btn-edit" title="Preview / Edit File">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
          <button class="file-action-btn btn-dl" title="Download File">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        ` : ''}
        <button class="file-action-btn btn-del" title="Delete">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-edit')) {
          e.stopPropagation();
          openFileEditor(item.path);
        } else if (e.target.closest('.btn-dl')) {
          e.stopPropagation();
          downloadFile(item.path);
        } else if (e.target.closest('.btn-del')) {
          e.stopPropagation();
          promptDeleteFile(item.path);
        } else if (item.is_dir) {
          loadFiles(item.path);
        } else {
          openFileEditor(item.path);
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
  function showDeleteModal(itemPath, onConfirm) {
    if (deletePromptMsg) {
      deletePromptMsg.textContent = itemPath;
    }
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
  modalDelete.addEventListener('click', (e) => {
    if (e.target === modalDelete) modalDelete.classList.remove('show');
  });

  function promptDeleteFile(path) {
    showDeleteModal(path, async () => {
      try {
        const res = await fetch(`/api/fs/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
        if (res.ok) {
          loadFiles(currentFsPath, true);
        } else {
          const err = await res.text();
          toast('Failed to delete: ' + err);
        }
      } catch (err) {
        toast('Error deleting item: ' + err.message);
      }
    });
  }

  // --- 4b. OpenCode File Preview & Editor ---
  function updateEditorLineNumbers() {
    if (!editorLineNumbers || !editorTextarea) return;
    const lineCount = (editorTextarea.value.match(/\n/g) || []).length + 1;
    let numbers = '';
    for (let i = 1; i <= lineCount; i++) {
      numbers += i + '\n';
    }
    editorLineNumbers.textContent = numbers;
  }

  function updateEditorInfo(sizeBytes) {
    if (!editorInfoLines || !editorInfoSize || !editorTextarea) return;
    const lineCount = (editorTextarea.value.match(/\n/g) || []).length + 1;
    editorInfoLines.textContent = `${lineCount} line${lineCount === 1 ? '' : 's'}`;
    const size = (typeof sizeBytes === 'number') ? sizeBytes : new Blob([editorTextarea.value]).size;
    editorInfoSize.textContent = formatBytes(size);
  }

  async function openFileEditor(path) {
    if (!path) return;
    currentEditingPath = path;
    isEditorDirty = false;

    const filename = path.split('/').filter(Boolean).pop() || path;
    if (editorFilename) editorFilename.textContent = filename;
    if (editorFilepath) {
      editorFilepath.textContent = path;
      editorFilepath.title = path;
    }
    if (editorDirty) editorDirty.style.display = 'none';
    if (editorStatus) {
      editorStatus.textContent = 'Loading...';
      editorStatus.style.color = 'var(--text-muted)';
    }
    if (editorTextarea) {
      editorTextarea.value = '';
      editorTextarea.readOnly = false;
    }
    if (editorBtnSave) editorBtnSave.disabled = false;
    updateEditorLineNumbers();
    if (modalEditor) modalEditor.classList.add('show');

    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const errText = await res.text();
        if (editorStatus) {
          editorStatus.textContent = 'Error: ' + errText;
          editorStatus.style.color = '#ef4444';
        }
        if (editorTextarea) {
          editorTextarea.value = `// Unable to open file:\n// ${errText}`;
          editorTextarea.readOnly = true;
        }
        if (editorBtnSave) editorBtnSave.disabled = true;
        updateEditorLineNumbers();
        return;
      }
      const data = await res.json();
      if (data.is_binary) {
        if (editorStatus) {
          editorStatus.textContent = 'Binary file (preview only)';
          editorStatus.style.color = '#f59e0b';
        }
        if (editorTextarea) {
          editorTextarea.value = `[Binary file: ${filename} (${formatBytes(data.size)})]\nBinary files cannot be edited in text mode.\nUse the Download button in the top right to download the file.`;
          editorTextarea.readOnly = true;
        }
        if (editorBtnSave) editorBtnSave.disabled = true;
      } else {
        originalEditorContent = data.content;
        if (editorTextarea) {
          editorTextarea.value = data.content;
          editorTextarea.readOnly = false;
        }
        if (editorStatus) {
          editorStatus.textContent = 'Ready';
          editorStatus.style.color = '#10b981';
        }
        if (editorBtnSave) editorBtnSave.disabled = false;
      }
      updateEditorInfo(data.size);
      updateEditorLineNumbers();
    } catch (err) {
      if (editorStatus) {
        editorStatus.textContent = 'Network error: ' + err.message;
        editorStatus.style.color = '#ef4444';
      }
    }
  }

  async function saveFileEditor() {
    if (!currentEditingPath || !editorTextarea || editorTextarea.readOnly) return;
    if (editorStatus) {
      editorStatus.textContent = 'Saving...';
      editorStatus.style.color = '#3b82f6';
    }
    const originalSaveHtml = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      <span>Save</span>
    `;
    if (editorBtnSave) {
      editorBtnSave.disabled = true;
      editorBtnSave.innerHTML = `
        <div class="spinner" style="width:11px; height:11px; border-width:1.5px; margin:0;"></div>
        <span>Saving...</span>
      `;
    }

    try {
      const res = await fetch('/api/fs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentEditingPath,
          content: editorTextarea.value
        })
      });

      if (res.ok) {
        originalEditorContent = editorTextarea.value;
        isEditorDirty = false;
        if (editorDirty) editorDirty.style.display = 'none';
        if (editorStatus) {
          editorStatus.textContent = 'Saved';
          editorStatus.style.color = '#10b981';
        }
        if (editorBtnSave) {
          editorBtnSave.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Saved</span>
          `;
        }
        setTimeout(() => {
          if (!isEditorDirty && editorStatus && editorStatus.textContent === 'Saved') {
            editorStatus.textContent = 'Ready';
          }
          if (editorBtnSave) {
            editorBtnSave.innerHTML = originalSaveHtml;
          }
        }, 1500);
        if (currentFsPath) loadFiles(currentFsPath, true);
      } else {
        const errText = await res.text();
        if (editorStatus) {
          editorStatus.textContent = 'Save failed: ' + errText;
          editorStatus.style.color = '#ef4444';
        }
        if (editorBtnSave) {
          editorBtnSave.innerHTML = originalSaveHtml;
        }
      }
    } catch (err) {
      if (editorStatus) {
        editorStatus.textContent = 'Save error: ' + err.message;
        editorStatus.style.color = '#ef4444';
      }
      if (editorBtnSave) {
        editorBtnSave.innerHTML = originalSaveHtml;
      }
    } finally {
      if (editorBtnSave) editorBtnSave.disabled = false;
    }
  }

  function closeFileEditor() {
    if (isEditorDirty) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    if (modalEditor) modalEditor.classList.remove('show');
  }

  function initFileEditor() {
    if (!modalEditor) return;

    if (modalEditorClose) {
      modalEditorClose.addEventListener('click', closeFileEditor);
    }
    modalEditor.addEventListener('click', (e) => {
      if (e.target === modalEditor) closeFileEditor();
    });
    if (editorBtnSave) {
      editorBtnSave.addEventListener('click', saveFileEditor);
    }
    if (editorBtnDownload) {
      editorBtnDownload.addEventListener('click', () => {
        if (currentEditingPath) downloadFile(currentEditingPath);
      });
    }

    if (editorTextarea) {
      editorTextarea.addEventListener('scroll', () => {
        if (editorLineNumbers) {
          editorLineNumbers.scrollTop = editorTextarea.scrollTop;
        }
      });

      editorTextarea.addEventListener('input', () => {
        isEditorDirty = (editorTextarea.value !== originalEditorContent);
        if (editorDirty) editorDirty.style.display = isEditorDirty ? 'inline-block' : 'none';
        updateEditorLineNumbers();
        updateEditorInfo();
      });

      editorTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = editorTextarea.selectionStart;
          const end = editorTextarea.selectionEnd;
          editorTextarea.value = editorTextarea.value.substring(0, start) + '  ' + editorTextarea.value.substring(end);
          editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 2;
          editorTextarea.dispatchEvent(new Event('input'));
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          saveFileEditor();
        } else if (e.key === 'Escape') {
          closeFileEditor();
        }
      });
    }
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
        toast('Failed to create folder: ' + (await res.text()));
      }
    } catch (err) {
      toast('Error creating folder: ' + err.message);
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
        toast('Upload failed: ' + (await res.text()));
      }
    } catch (err) {
      toast('Upload error: ' + err.message);
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
    closeEl.title = 'Close tab';

    tabEl.appendChild(badge);
    tabEl.appendChild(titleEl);
    tabEl.appendChild(closeEl);
    tabsContainer.appendChild(tabEl);

    // Terminal Panel DOM
    const panelEl = document.createElement('div');
    panelEl.className = 'terminal-panel';
    panelEl.dataset.id = id;
    panelEl.style.backgroundColor = getActiveTheme().xterm.background;
    terminalContainer.appendChild(panelEl);

    // Xterm Instance with Native Buffer & Scrollback
    const term = new Terminal({
      theme: getActiveTheme().xterm,
      fontFamily: "'JetBrainsMono Nerd Font', 'Cascadia Code', monospace",
      fontSize: termFontSize,
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
      dataSub: null,
      status: 'connecting',
      disconnected: false,
      closing: false
    };
    tabs.push(tabObj);
    tabEl.classList.add('is-connecting');
    tabEl.setAttribute('role', 'tab');
    tabEl.title = name || 'shell';

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

    // Middle-click closes a tab (browser-style)
    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(id);
      }
    });

    // Double-click a tab to rename it inline
    tabEl.addEventListener('dblclick', (e) => {
      if (e.target === closeEl) return;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tab-rename-input';
      input.value = tabObj.name;
      input.maxLength = 40;
      titleEl.style.display = 'none';
      tabEl.insertBefore(input, closeEl);
      input.focus();
      input.select();
      let done = false;
      const finish = (commit) => {
        if (done) return;
        done = true;
        const v = input.value.trim();
        if (commit && v) {
          tabObj.name = v;
          titleEl.textContent = v;
          tabEl.title = v;
        }
        input.remove();
        titleEl.style.display = '';
        if (tabObj.term) tabObj.term.focus();
      };
      input.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') finish(true);
        else if (ev.key === 'Escape') finish(false);
      });
      input.addEventListener('blur', () => finish(true));
      input.addEventListener('click', (ev) => ev.stopPropagation());
    });

    if (activate) {
      switchTab(id);
    }
  }

  function showTabDisconnectBar(tabObj) {
    if (!tabObj || !tabObj.panelEl || tabObj.panelEl.querySelector('.terminal-disconnect-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'terminal-disconnect-bar';
    bar.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444;"></span>
        <span>Session disconnected</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="btn-primary btn-sm btn-reconnect" style="font-size:11px; padding:3px 10px;">Reconnect</button>
        <button type="button" class="btn-secondary btn-sm btn-close-session" style="font-size:11px; padding:3px 10px;">Close Tab</button>
      </div>
    `;
    const btnReconnect = bar.querySelector('.btn-reconnect');
    const btnClose = bar.querySelector('.btn-close-session');
    btnReconnect.addEventListener('click', (e) => {
      e.stopPropagation();
      bar.remove();
      connectWs(tabObj);
    });
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tabObj.id);
    });
    tabObj.panelEl.appendChild(bar);
  }

  function connectWs(tabObj) {
    if (tabObj.panelEl) {
      const existingBar = tabObj.panelEl.querySelector('.terminal-disconnect-bar');
      if (existingBar) existingBar.remove();
    }

    if (tabObj.pingInterval) {
      clearInterval(tabObj.pingInterval);
      tabObj.pingInterval = null;
    }

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

    setTabStatus(tabObj, 'connecting');

    ws.onopen = () => {
      tabObj.fitAddon.fit();
      sendResize(tabObj);
      tabObj.term.focus();

      // Keepalive heartbeat every 25s (prevents Cloudflare Tunnel & idle drop)
      tabObj.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    ws.onmessage = (evt) => {
      if (tabObj.status !== 'connected') setTabStatus(tabObj, 'connected');
      if (typeof evt.data === 'string') {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'pong') return; // Heartbeat ack
        } catch (e) {}
        tabObj.term.write(evt.data);
      } else if (evt.data instanceof ArrayBuffer) {
        tabObj.term.write(new Uint8Array(evt.data));
      } else {
        tabObj.term.write(evt.data);
      }
    };

    // Dispose previous input handler so reconnects don't stack listeners
    if (tabObj.dataSub) tabObj.dataSub.dispose();
    tabObj.dataSub = tabObj.term.onData((data) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      // Sticky Ctrl from the on-screen key bar: Ctrl + <letter>
      if (ctrlArmed && data.length === 1) {
        const c = data.toUpperCase().charCodeAt(0);
        if (c >= 64 && c <= 95) data = String.fromCharCode(c - 64);
        setCtrlArmed(false);
      }
      ws.send(data);
    });

    ws.onclose = () => {
      if (tabObj.pingInterval) {
        clearInterval(tabObj.pingInterval);
        tabObj.pingInterval = null;
      }
      if (!tabObj.closing) {
        setTabStatus(tabObj, 'disconnected');
        showTabDisconnectBar(tabObj);
      }
    };
  }

  function setTabStatus(tabObj, status) {
    tabObj.status = status;
    tabObj.disconnected = (status === 'disconnected');
    tabObj.tabEl.classList.toggle('is-connecting', status === 'connecting');
    tabObj.tabEl.classList.toggle('is-disconnected', status === 'disconnected');
    if (tabObj.panelEl) {
      let ov = tabObj.panelEl.querySelector('.terminal-connecting');
      if (status === 'connecting') {
        if (!ov) {
          ov = document.createElement('div');
          ov.className = 'terminal-connecting';
          ov.innerHTML = '<div class="spinner"></div><span>Connecting to ' + escapeHtml(tabObj.name) + '…</span>';
          tabObj.panelEl.appendChild(ov);
        }
      } else if (ov) {
        ov.remove();
      }
    }
    refreshHostSessionBadges();
  }

  // --- On-screen key bar (mobile / touch) ---
  function setCtrlArmed(on) {
    ctrlArmed = on;
    const b = document.querySelector('#mobile-keys [data-key="ctrl"]');
    if (b) b.classList.toggle('armed', on);
  }

  function initMobileKeys() {
    const bar = document.getElementById('mobile-keys');
    if (!bar) return;
    const seq = {
      esc: '\x1b', tab: '\t', up: '\x1b[A', down: '\x1b[B',
      right: '\x1b[C', left: '\x1b[D', home: '\x1b[H', end: '\x1b[F',
      pgup: '\x1b[5~', pgdn: '\x1b[6~'
    };
    // Keep terminal focus (and the soft keyboard) when tapping keys
    bar.addEventListener('mousedown', (e) => e.preventDefault());
    bar.addEventListener('touchstart', (e) => { if (e.target.closest('button')) e.preventDefault(); }, { passive: false });
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-key]');
      if (!btn) return;
      const k = btn.dataset.key;
      if (k === 'ctrl') { setCtrlArmed(!ctrlArmed); return; }
      const active = tabs.find(t => t.id === activeTabId);
      if (!active || !active.ws || active.ws.readyState !== WebSocket.OPEN) return;
      const out = (k in seq) ? seq[k] : btn.dataset.send;
      if (out) active.ws.send(out);
      active.term.focus();
    });
  }

  function changeFontSize(delta) {
    termFontSize = Math.max(9, Math.min(28, termFontSize + delta));
    try { localStorage.setItem('nodedeck_font_size', String(termFontSize)); } catch (e) {}
    tabs.forEach(t => { t.term.options.fontSize = termFontSize; });
    refitActiveTerminal();
    toast('Font size: ' + termFontSize + 'px', 'info');
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

    if (tabObj.pingInterval) {
      clearInterval(tabObj.pingInterval);
      tabObj.pingInterval = null;
    }
    if (tabObj.ws) tabObj.ws.close();
    tabObj.term.dispose();
    tabObj.tabEl.remove();
    tabObj.panelEl.remove();

    if (notifyBackend) {
      fetch(`/api/close?id=${encodeURIComponent(id)}`, { method: 'POST' }).catch(() => {});
    }

    tabs.splice(idx, 1);
    refreshHostSessionBadges();

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
    // Alt + = / Alt + - : terminal font size
    if (e.altKey && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      changeFontSize(1);
      return;
    }
    if (e.altKey && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      changeFontSize(-1);
      return;
    }
    // Alt + Left / Right : previous / next tab
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && tabs.length > 1) {
      e.preventDefault();
      const i = tabs.findIndex(t => t.id === activeTabId);
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      if (next) switchTab(next.id);
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
    initMobileKeys();
    initThemes();
    initFileEditor();
    await ensureFontLoaded();
    await fetchHosts();

    // Auto-reconnect when device regains network or comes back from sleep
    window.addEventListener('online', () => {
      tabs.forEach(t => {
        if (t.disconnected && !t.closing) {
          toast('Network restored. Reconnecting ' + t.name + '...', 'info');
          connectWs(t);
        }
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        tabs.forEach(t => {
          if (t.disconnected && !t.closing) {
            connectWs(t);
          }
        });
      }
    });

    // Default: Show Dashboard on initial start (do not auto-enter SSH shell)
    showDashboard();
  }

  init();
})();
