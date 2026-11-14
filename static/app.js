/**
 * NodeDeck Terminal & Workspace - Modern WebSSH & SFTP
 * Full Integration: Real Xterm Engine, Real WebSocket Stream, Real SFTP Filesystem & Omnibox
 */
(function() {
  'use strict';

  // 1. THEMES DEFINITION (Windows Terminal Specs: Coolnight, CutiePro, Monokai Remastered, Fahrenheit)
  const THEME_SPECS = {
    'coolnight': {
      id: 'coolnight',
      label: 'Coolnight',
      dot: '#0FC5ED',
      xterm: {
        background: '#000B14',
        foreground: '#CBE0F0',
        cursor: '#47FF9C',
        cursorAccent: '#000B14',
        selectionBackground: 'rgba(15, 197, 237, 0.35)',
        black: '#0B3B61',
        red: '#FF3A3A',
        green: '#47FF9C',
        yellow: '#FFF383',
        blue: '#0FC5ED',
        magenta: '#AE81FF',
        cyan: '#0FC5ED',
        white: '#CBE0F0',
        brightBlack: '#62686C',
        brightRed: '#FF54B0',
        brightGreen: '#73FFD8',
        brightYellow: '#FCF4AD',
        brightBlue: '#378DFE',
        brightMagenta: '#8F4673',
        brightCyan: '#FF69D7',
        brightWhite: '#FFFFFF'
      }
    },
    'cutiepro': {
      id: 'cutiepro',
      label: 'CutiePro',
      dot: '#F56E7F',
      xterm: {
        background: '#121112',
        foreground: '#D5D0C9',
        cursor: '#EFC4CD',
        cursorAccent: '#121112',
        selectionBackground: 'rgba(245, 110, 127, 0.35)',
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
    'monokai': {
      id: 'monokai',
      label: 'Monokai Remastered',
      dot: '#98E024',
      xterm: {
        background: '#080808',
        foreground: '#D9D9D9',
        cursor: '#FD971F',
        cursorAccent: '#080808',
        selectionBackground: 'rgba(152, 224, 36, 0.35)',
        black: '#1A1A1A',
        red: '#F4005F',
        green: '#98E024',
        yellow: '#FD971F',
        blue: '#9D65FF',
        magenta: '#F4005F',
        cyan: '#58D1EB',
        white: '#D9D9D9',
        brightBlack: '#625E4C',
        brightRed: '#F4005F',
        brightGreen: '#98E024',
        brightYellow: '#E0D561',
        brightBlue: '#9D65FF',
        brightMagenta: '#F4005F',
        brightCyan: '#58D1EB',
        brightWhite: '#F6F6EF'
      }
    },
    'fahrenheit': {
      id: 'fahrenheit',
      label: 'Fahrenheit',
      dot: '#FD9F4D',
      xterm: {
        background: '#030201',
        foreground: '#E6DFC3',
        cursor: '#FECF75',
        cursorAccent: '#030201',
        selectionBackground: 'rgba(253, 159, 77, 0.3)',
        black: '#1c1c1c',
        red: '#c94848',
        green: '#5f9641',
        yellow: '#d1aa50',
        blue: '#527e78',
        magenta: '#a3506d',
        cyan: '#619c95',
        white: '#ded7bd',
        brightBlack: '#474747',
        brightRed: '#e85f5f',
        brightGreen: '#7ab356',
        brightYellow: '#e8bd58',
        brightBlue: '#619c95',
        brightMagenta: '#bd6383',
        brightCyan: '#82b8b1',
        brightWhite: '#d6cfb8'
      }
    }
  };

  const DEFAULT_SNIPPETS = [
    { id: 'sp1', title: 'Docker Containers', cmd: 'docker ps', tag: 'Docker' },
    { id: 'sp2', title: 'Attach Tmux', cmd: 'tmux attach', tag: 'Tmux' },
    { id: 'sp3', title: 'System Monitor', cmd: 'htop', tag: 'System' },
    { id: 'sp4', title: 'Disk Usage', cmd: 'df -h', tag: 'System' }
  ];

  function loadSnippets() {
    try {
      const raw = localStorage.getItem('nodedeck_snippets');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SNIPPETS;
  }

  function saveSnippets(list) {
    try {
      localStorage.setItem('nodedeck_snippets', JSON.stringify(list));
    } catch (e) {}
  }

  function loadBookmarks() {
    try {
      const raw = localStorage.getItem('nodedeck_sftp_bookmarks');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  function saveBookmarks(list) {
    try {
      localStorage.setItem('nodedeck_sftp_bookmarks', JSON.stringify(list));
    } catch (e) {}
  }

  // 2. CENTRAL APPLICATION STATE
  const state = {
    theme: localStorage.getItem('nodedeck_theme') || 'coolnight',
    sidebarOpen: window.innerWidth >= 768,
    sidebarTab: 'hosts', // 'hosts' | 'sftp' | 'snippets'
    hostSearch: '',
    hostEnvFilter: 'All', // 'All' | 'LAN' | 'Tailscale' | 'Tunnel'
    addSnippetOpen: false,

    activeTabId: 'launcher',
    secondaryTabId: null,
    splitPane: false,

    omniboxText: '',
    authExpanded: false,
    omniboxAuth: 'key',
    omniboxSave: false,

    hosts: [],
    snippets: loadSnippets(),
    termTabs: [], // array of tab objects

    // SFTP State
    sftpPath: localStorage.getItem('nodedeck_last_sftp_path') || '/home',
    sftpItems: [],
    sftpLoading: false,
    sftpSortBy: localStorage.getItem('nodedeck_sftp_sort_by') || 'name', // 'name' | 'type' | 'date'
    sftpSortAsc: localStorage.getItem('nodedeck_sftp_sort_asc') !== 'false',
    sftpBookmarks: loadBookmarks(),

    // File Editor State
    editorPath: '',
    editorIsDirty: false,

    cmdIndex: 0,
    ctrlArmed: false
  };

  const envStyleMap = {
    LAN: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Tailscale: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    Tunnel: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  };

  // 3. TOAST NOTIFICATION ENGINE
  function toast(msg, type = 'info') {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    const dotColor = type === 'success' ? 'bg-emerald-400' : type === 'warn' ? 'bg-amber-400' : type === 'error' ? 'bg-rose-400' : 'bg-sky-400';
    el.className = 'px-3 py-2 rounded-xl glass-modal border t-border-strong shadow-xl flex items-center gap-2 text-[11px] font-medium t-text-primary smooth-transition';
    el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${dotColor} shrink-0"></span><span>${escapeHtml(msg)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(4px)';
      setTimeout(() => el.remove(), 180);
    }, 2200);
  }

  // 4. THEME MANAGEMENT
  function applyTheme(key) {
    if (!THEME_SPECS[key]) key = 'coolnight';
    state.theme = key;
    document.documentElement.setAttribute('data-theme', key);
    document.body.setAttribute('data-theme', key);
    try { localStorage.setItem('nodedeck_theme', key); } catch (e) {}

    const meta = THEME_SPECS[key];
    const lbl = document.getElementById('themeActiveLabel');
    const dot = document.getElementById('themeActiveDot');
    if (lbl) lbl.textContent = meta.label;
    if (dot) dot.style.backgroundColor = meta.dot;

    // Update active checkmarks in menu
    document.querySelectorAll('.theme-menu-item').forEach(btn => {
      const isCur = btn.getAttribute('data-theme-item') === key;
      const check = btn.querySelector('.theme-check');
      if (isCur) {
        btn.classList.add('t-accent-text', 'font-semibold');
        if (check) check.classList.remove('hidden');
      } else {
        btn.classList.remove('t-accent-text', 'font-semibold');
        if (check) check.classList.add('hidden');
      }
    });

    // Update running Xterm terminals
    state.termTabs.forEach(t => {
      if (t.term) {
        t.term.options.theme = meta.xterm;
      }
      if (t.panelEl) {
        t.panelEl.style.backgroundColor = meta.xterm.background;
      }
    });
  }

  function toggleThemeMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('themeDropdownMenu');
    if (menu) menu.classList.toggle('hidden');
  }

  function selectThemeFromMenu(key) {
    applyTheme(key);
    const menu = document.getElementById('themeDropdownMenu');
    if (menu) menu.classList.add('hidden');
    toast(`Theme changed to ${THEME_SPECS[key].label}`, 'success');
  }

  // 5. BACKEND API INTERACTIONS
  async function fetchHosts() {
    try {
      const res = await fetch('/api/hosts');
      if (res.status === 401) {
        showLoginScreen();
        return;
      }
      if (res.ok) {
        state.hosts = await res.json();
        renderLeftSidebarContent();
        if (state.activeTabId === 'launcher') renderMainCanvas();
      }
    } catch (e) {
      console.warn('Failed to fetch hosts:', e);
    }
  }

  async function saveHostToBackend(hostData) {
    const url = '/api/hosts';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hostData)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to save host');
    }
    await fetchHosts();
  }

  async function deleteHostFromBackend(id) {
    const res = await fetch(`/api/hosts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to delete host');
    }
    await fetchHosts();
  }

  async function fetchFsList(path) {
    state.sftpLoading = true;
    renderLeftSidebarContent();
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      if (res.status === 401) {
        showLoginScreen();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        state.sftpPath = data.current || path;
        try { localStorage.setItem('nodedeck_last_sftp_path', state.sftpPath); } catch (e) {}
        state.sftpItems = data.items || [];
      } else {
        // Fallback to / if path is invalid or unaccessible
        if (path !== '/') {
          toast('Directory not accessible, returning to root', 'warn');
          return fetchFsList('/');
        }
        toast('Cannot open directory', 'error');
      }
    } catch (e) {
      toast('SFTP Error: ' + e.message, 'error');
    } finally {
      state.sftpLoading = false;
      renderLeftSidebarContent();
    }
  }

  // 6. XTERM TERMINAL ENGINE & WEBSOCKET CONNECTION
  function createTab(name, hostId = '', color = '#0FC5ED', activate = true, sessionId = null, hostMeta = null) {
    const id = 'tab-' + Math.random().toString(36).substring(2, 8);
    const activeTheme = THEME_SPECS[state.theme] || THEME_SPECS.coolnight;

    const panelEl = document.createElement('div');
    panelEl.className = 'terminal-panel-wrapper';
    panelEl.dataset.id = id;
    panelEl.style.backgroundColor = activeTheme.xterm.background;

    // Sub Toolbar
    const barEl = document.createElement('div');
    barEl.className = 'h-8 px-3 t-bg-surface border-b t-border flex items-center justify-between text-[11px] shrink-0';
    
    const leftMeta = document.createElement('div');
    leftMeta.className = 'flex items-center gap-2 font-mono t-text-secondary truncate';
    leftMeta.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      <span class="truncate">${escapeHtml(name)}</span>
      <span class="px-1.5 py-0.2 rounded t-bg-base border t-border text-[9px] t-text-muted font-mono">${hostMeta?.env || 'SSH'}</span>
    `;

    const rightActions = document.createElement('div');
    rightActions.className = 'flex items-center gap-1.5 shrink-0';
    rightActions.innerHTML = `
      <button class="btn-term-clear px-2 py-0.5 rounded-md t-bg-base hover:t-bg-elevated border t-border text-[10px] font-mono t-text-muted hover:t-text-primary smooth-transition">Clear</button>
      <button class="btn-term-reconnect px-2 py-0.5 rounded-md t-bg-base hover:t-bg-elevated border t-border text-[10px] font-mono text-emerald-400 hover:brightness-110 smooth-transition">Reconnect</button>
    `;
    barEl.appendChild(leftMeta);
    barEl.appendChild(rightActions);
    panelEl.appendChild(barEl);

    // Viewport Container for Xterm
    const vpContainer = document.createElement('div');
    vpContainer.className = 'xterm-viewport-container';
    panelEl.appendChild(vpContainer);

    // Connecting Overlay
    const connectingOverlay = document.createElement('div');
    connectingOverlay.className = 'terminal-connecting-overlay';
    connectingOverlay.innerHTML = `<div class="spinner"></div><span>Connecting to ${escapeHtml(name)}…</span>`;
    panelEl.appendChild(connectingOverlay);

    // Instantiate Xterm
    const term = new Terminal({
      theme: activeTheme.xterm,
      fontFamily: "'JetBrainsMono Nerd Font', 'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      convertEol: true,
      scrollback: 10000,
      scrollSensitivity: 2,
      fastScrollSensitivity: 5,
      scrollOnUserInput: true
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(vpContainer);

    try {
      if (typeof WebglAddon !== 'undefined' && WebglAddon.WebglAddon) {
        const webgl = new WebglAddon.WebglAddon();
        webgl.onContextLoss(() => webgl.dispose());
        term.loadAddon(webgl);
      }
    } catch (e) {
      console.warn('WebGL fallback to canvas:', e);
    }

    const tabObj = {
      id,
      name: name || 'shell',
      hostId,
      sessionId,
      color,
      env: hostMeta?.env || 'LAN',
      ping: '-- ms',
      rttStart: 0,
      panelEl,
      term,
      fitAddon,
      ws: null,
      dataSub: null,
      status: 'connecting',
      needsInput: false,
      closing: false
    };

    state.termTabs.push(tabObj);

    // Sub-toolbar button bindings
    barEl.querySelector('.btn-term-clear').addEventListener('click', () => {
      term.clear();
      term.focus();
    });
    barEl.querySelector('.btn-term-reconnect').addEventListener('click', () => {
      connectWs(tabObj);
    });

    // Auto-copy on select
    term.onSelectionChange(() => {
      const sel = term.getSelection();
      if (sel && sel.length > 0 && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(sel).catch(() => {});
      }
    });

    // Custom Key Handler
    term.attachCustomKeyEventHandler((e) => {
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
      if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
        if (e.type === 'keydown' && navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then((txt) => {
            if (txt) term.paste(txt);
          }).catch(() => {});
        }
        return false;
      }
      return true;
    });

    // Context menu paste
    vpContainer.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      if (term.hasSelection()) {
        const text = term.getSelection();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        }
        term.clearSelection();
      } else if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const txt = await navigator.clipboard.readText();
          if (txt) term.paste(txt);
        } catch (err) {}
      }
    });

    // Connect WebSocket
    connectWs(tabObj);

    // Switch focus
    if (activate) {
      if (state.splitPane && state.activeTabId !== 'launcher') {
        state.secondaryTabId = id;
      } else {
        state.activeTabId = id;
      }
      renderAll();
    }

    return tabObj;
  }

  function connectWs(tabObj) {
    if (tabObj.pingInterval) {
      clearInterval(tabObj.pingInterval);
      tabObj.pingInterval = null;
    }

    // Remove existing disconnect bar if any
    const oldBar = tabObj.panelEl.querySelector('.terminal-disconnect-bar');
    if (oldBar) oldBar.remove();

    // Show connecting overlay
    let overlay = tabObj.panelEl.querySelector('.terminal-connecting-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'terminal-connecting-overlay';
      overlay.innerHTML = `<div class="spinner"></div><span>Connecting to ${escapeHtml(tabObj.name)}…</span>`;
      tabObj.panelEl.appendChild(overlay);
    }

    tabObj.status = 'connecting';
    tabObj.needsInput = false;
    renderTopTabs();

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
      tabObj.status = 'connected';
      if (overlay) overlay.remove();
      renderTopTabs();

      tabObj.fitAddon.fit();
      sendResize(tabObj);
      tabObj.term.focus();

      // Keepalive heartbeat every 20s + latency measurement
      tabObj.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          tabObj.rttStart = Date.now();
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.onmessage = (evt) => {
      if (typeof evt.data === 'string') {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'pong') {
            const rtt = Date.now() - tabObj.rttStart;
            tabObj.ping = `${rtt} ms`;
            updateTelemetryPing(tabObj);
            return;
          }
        } catch (e) {}

        // Interactive prompt / input detection (e.g. sudo password, [y/N])
        const text = evt.data;
        if (/(\[y\/N\]|password:|Password:|Are you sure you want to continue\?)/i.test(text)) {
          tabObj.needsInput = true;
          renderTopTabs();
        }

        tabObj.term.write(text);
      } else if (evt.data instanceof ArrayBuffer) {
        tabObj.term.write(new Uint8Array(evt.data));
      } else {
        tabObj.term.write(evt.data);
      }
    };

    if (tabObj.dataSub) tabObj.dataSub.dispose();
    tabObj.dataSub = tabObj.term.onData((data) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      tabObj.needsInput = false;
      renderTopTabs();

      if (state.ctrlArmed && data.length === 1) {
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
        tabObj.status = 'disconnected';
        tabObj.needsInput = false;
        renderTopTabs();
        showDisconnectBar(tabObj);
      }
    };
  }

  function sendResize(tabObj) {
    if (!tabObj.ws || tabObj.ws.readyState !== WebSocket.OPEN) return;
    const cols = tabObj.term.cols;
    const rows = tabObj.term.rows;
    tabObj.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    
    const gridEl = document.getElementById('telemetryGrid');
    if (gridEl && tabObj.id === state.activeTabId) {
      gridEl.textContent = `${cols}×${rows}`;
    }
  }

  function showDisconnectBar(tabObj) {
    if (tabObj.panelEl.querySelector('.terminal-disconnect-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'terminal-disconnect-bar';
    bar.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-rose-500"></span>
      <span>Session disconnected</span>
      <button class="px-2.5 py-1 rounded-full bg-emerald-500 text-black font-semibold text-[10px] hover:brightness-110">Reconnect</button>
      <button class="px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 font-semibold text-[10px] hover:bg-white/20">Close</button>
    `;
    const [_, __, btnRecon, btnClose] = bar.children;
    btnRecon.addEventListener('click', (e) => {
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

  function closeTab(id, e) {
    if (e) e.stopPropagation();
    const idx = state.termTabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    const t = state.termTabs[idx];
    t.closing = true;
    if (t.pingInterval) clearInterval(t.pingInterval);
    if (t.ws) {
      try { t.ws.close(); } catch (err) {}
    }
    fetch(`/api/close?id=${encodeURIComponent(id)}`, { method: 'POST' }).catch(() => {});

    state.termTabs.splice(idx, 1);

    if (state.secondaryTabId === id) {
      const remaining = state.termTabs.find(tab => tab.id !== state.activeTabId);
      state.secondaryTabId = remaining ? remaining.id : null;
      if (!state.secondaryTabId) state.splitPane = false;
    }

    if (state.activeTabId === id) {
      const fallback = state.termTabs[idx] || state.termTabs[idx - 1];
      state.activeTabId = fallback ? fallback.id : 'launcher';
    }

    renderAll();
  }

  function switchTab(id) {
    state.activeTabId = id;
    if (id === 'launcher') {
      state.splitPane = false;
    }
    renderAll();
  }

  function toggleSplitPane() {
    if (state.termTabs.length < 2) {
      if (state.termTabs.length === 1 && state.hosts.length > 0) {
        state.splitPane = true;
        const otherHost = state.hosts.find(h => h.id !== state.termTabs[0].hostId) || state.hosts[0];
        connectHost(otherHost);
        return;
      } else {
        toast('Open at least 2 terminal sessions to split view');
        return;
      }
    }
    state.splitPane = !state.splitPane;
    if (state.splitPane) {
      if (state.activeTabId === 'launcher') state.activeTabId = state.termTabs[0].id;
      const other = state.termTabs.find(t => t.id !== state.activeTabId);
      state.secondaryTabId = other ? other.id : null;
    }
    renderAll();
  }

  function updateTelemetryPing(tabObj) {
    if (tabObj.id === state.activeTabId) {
      const topPing = document.getElementById('topBarPingValue');
      const btmPing = document.getElementById('telemetryLatency');
      if (topPing) topPing.textContent = tabObj.ping;
      if (btmPing) btmPing.textContent = `RTT: ${tabObj.ping}`;
    }
  }

  // 7. RENDERING TOP BAR & TABS
  function renderTopTabs() {
    const homeBtn = document.getElementById('homeLogoBtn');
    const isHome = state.activeTabId === 'launcher';
    if (isHome) {
      homeBtn.className = 'flex items-center gap-2 px-2.5 py-1 rounded-lg border t-accent-soft font-semibold smooth-transition shrink-0';
    } else {
      homeBtn.className = 'flex items-center gap-2 px-2.5 py-1 rounded-lg border border-transparent t-text-secondary hover:t-text-primary t-hover-bg smooth-transition shrink-0';
    }

    const strip = document.getElementById('tabsStrip');
    if (!strip) return;
    strip.innerHTML = '';

    state.termTabs.forEach(tab => {
      const isPrimary = tab.id === state.activeTabId;
      const isSecondary = state.splitPane && tab.id === state.secondaryTabId;
      const selected = isPrimary || isSecondary;

      const pill = document.createElement('div');
      pill.onclick = () => switchTab(tab.id);

      let dotHtml = '<span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)] shrink-0"></span>';
      let inputBadgeHtml = '';
      let borderHighlight = selected
        ? 't-bg-elevated t-text-primary t-border-strong shadow-sm'
        : 'border-transparent t-text-muted hover:t-text-primary t-hover-bg';

      if (tab.status === 'connecting') {
        dotHtml = '<span class="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0"></span>';
      } else if (tab.status === 'disconnected') {
        dotHtml = '<span class="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>';
      }

      if (tab.needsInput) {
        dotHtml = `
          <span class="relative flex h-2.5 w-2.5 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
          </span>`;
        inputBadgeHtml = `<span class="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[9px] font-semibold tracking-wide">INPUT</span>`;
        borderHighlight = 't-bg-elevated t-text-primary border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]';
      }

      pill.className = `group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-medium cursor-pointer smooth-transition shrink-0 border ${borderHighlight}`;
      pill.title = tab.needsInput ? 'Interactive Prompt Input required!' : `${tab.name} (${tab.ping})`;

      pill.innerHTML = `
        ${dotHtml}
        <span class="font-mono text-[11px] truncate max-w-[120px]">${escapeHtml(tab.name)}</span>
        ${inputBadgeHtml}
        <button onclick="window.NodeDeck.closeTab('${tab.id}', event)" class="w-4 h-4 rounded-full flex items-center justify-center t-text-muted hover:t-text-primary t-hover-bg opacity-75 group-hover:opacity-100">
          <i data-lucide="x" class="w-2.5 h-2.5"></i>
        </button>
      `;

      strip.appendChild(pill);
    });

    const splitBtn = document.getElementById('splitToggleBtn');
    if (splitBtn) {
      if (state.splitPane) {
        splitBtn.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border t-accent-soft text-[11px] font-semibold smooth-transition';
      } else {
        splitBtn.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border t-border text-[11px] t-text-secondary t-hover-bg smooth-transition';
      }
    }

    // Telemetry updates
    const activeTab = state.termTabs.find(t => t.id === state.activeTabId);
    const topPingEl = document.getElementById('topBarPingValue');
    const latEl = document.getElementById('telemetryLatency');
    const sessEl = document.getElementById('telemetrySessionBadge');

    if (activeTab) {
      if (topPingEl) topPingEl.textContent = activeTab.ping;
      if (latEl) latEl.textContent = `RTT: ${activeTab.ping}`;
      if (sessEl) sessEl.textContent = activeTab.name;
    } else {
      if (topPingEl) topPingEl.textContent = '-- ms';
      if (latEl) latEl.textContent = 'RTT: -- ms';
      if (sessEl) sessEl.textContent = 'HOME · READY';
    }

    if (window.lucide) lucide.createIcons();
  }

  // 8. SIDEBAR LOGIC (Hosts, SFTP with Sorting & Bookmarks, Snippets)
  function toggleLeftSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    renderLeftSidebarVisibility();
  }

  function setSidebarTab(tabName) {
    state.sidebarTab = tabName;
    if (!state.sidebarOpen) state.sidebarOpen = true;
    renderLeftSidebarVisibility();
    renderLeftSidebarContent();
    if (tabName === 'sftp' && state.sftpItems.length === 0) {
      fetchFsList(state.sftpPath);
    }
  }

  function renderLeftSidebarVisibility() {
    const aside = document.getElementById('leftSidebar');
    const icon = document.getElementById('sidebarToggleIcon');
    if (!aside || !icon) return;
    if (state.sidebarOpen) {
      aside.classList.remove('hidden');
      icon.setAttribute('data-lucide', 'panel-left-close');
    } else {
      aside.classList.add('hidden');
      icon.setAttribute('data-lucide', 'panel-left-open');
    }
    if (window.lucide) lucide.createIcons();
  }

  function renderBreadcrumbs(path) {
    const parts = (path || '/').split('/').filter(Boolean);
    let accumulated = '';
    const crumbs = [
      `<button onclick="window.NodeDeck.navigateToSftpPath('/')" class="hover:t-text-primary px-1 py-0.5 rounded hover:t-bg-elevated font-mono shrink-0">root</button>`
    ];

    parts.forEach((p, idx) => {
      accumulated += '/' + p;
      const curPath = accumulated;
      const isLast = (idx === parts.length - 1);
      crumbs.push(
        `<span class="opacity-40 shrink-0">/</span>`,
        `<button onclick="window.NodeDeck.navigateToSftpPath('${escapeQuotes(curPath)}')" class="hover:t-text-primary px-1 py-0.5 rounded hover:t-bg-elevated font-mono shrink-0 ${isLast ? 'font-semibold t-text-primary' : 't-text-secondary'}" title="${escapeHtml(curPath)}">${escapeHtml(p)}</button>`
      );
    });

    return crumbs.join('');
  }

  function getSortedSftpItems() {
    const items = [...state.sftpItems];
    const { sftpSortBy, sftpSortAsc } = state;

    items.sort((a, b) => {
      // Folders always first unless sorting specifically by type in reverse
      if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
      }

      let cmp = 0;
      if (sftpSortBy === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sftpSortBy === 'type') {
        const extA = a.is_dir ? '' : (a.name.split('.').pop() || '');
        const extB = b.is_dir ? '' : (b.name.split('.').pop() || '');
        cmp = extA.localeCompare(extB) || a.name.localeCompare(b.name);
      } else if (sftpSortBy === 'date') {
        const dateA = a.mod_time || '';
        const dateB = b.mod_time || '';
        cmp = dateA.localeCompare(dateB);
      }

      return sftpSortAsc ? cmp : -cmp;
    });

    return items;
  }

  function setSftpSort(sortBy) {
    if (state.sftpSortBy === sortBy) {
      state.sftpSortAsc = !state.sftpSortAsc;
    } else {
      state.sftpSortBy = sortBy;
      state.sftpSortAsc = true;
    }
    try {
      localStorage.setItem('nodedeck_sftp_sort_by', state.sftpSortBy);
      localStorage.setItem('nodedeck_sftp_sort_asc', String(state.sftpSortAsc));
    } catch (e) {}
    renderLeftSidebarContent();
  }

  function togglePinCurrentFolder() {
    const cur = state.sftpPath;
    const idx = state.sftpBookmarks.findIndex(b => b.path === cur);
    if (idx !== -1) {
      state.sftpBookmarks.splice(idx, 1);
      toast('Folder unpinned', 'info');
    } else {
      const name = cur.split('/').filter(Boolean).pop() || 'root';
      state.sftpBookmarks.push({ name, path: cur });
      toast('Folder pinned to shortcuts', 'success');
    }
    saveBookmarks(state.sftpBookmarks);
    renderLeftSidebarContent();
  }

  function renderLeftSidebarContent() {
    document.querySelectorAll('.stab-btn').forEach(btn => {
      const isCur = btn.getAttribute('data-stab') === state.sidebarTab;
      if (isCur) {
        btn.className = 'stab-btn py-1.5 rounded-md text-[11px] font-semibold t-accent-bg shadow-sm flex items-center justify-center gap-1.5 smooth-transition';
      } else {
        btn.className = 'stab-btn py-1.5 rounded-md text-[11px] font-medium t-text-muted hover:t-text-primary flex items-center justify-center gap-1.5 smooth-transition';
      }
    });

    const container = document.getElementById('leftSidebarBody');
    if (!container) return;

    if (state.sidebarTab === 'hosts') {
      const q = state.hostSearch.toLowerCase().trim();
      const filtered = state.hosts.filter(n => {
        const env = n.env || (n.host?.startsWith('192.168.') ? 'LAN' : n.host?.startsWith('100.') ? 'Tailscale' : 'Tunnel');
        const matchEnv = state.hostEnvFilter === 'All' || env === state.hostEnvFilter;
        const matchQuery = !q || n.name?.toLowerCase().includes(q) || n.host?.toLowerCase().includes(q) || n.user?.toLowerCase().includes(q);
        return matchEnv && matchQuery;
      });

      const envs = ['All', 'LAN', 'Tailscale', 'Tunnel'];

      container.innerHTML = `
        <div class="p-2.5 space-y-2 border-b t-border shrink-0">
          <div class="relative">
            <i data-lucide="search" class="w-3.5 h-3.5 t-text-muted absolute left-2.5 top-1/2 -translate-y-1/2"></i>
            <input id="sidebarHostSearch" type="text" value="${escapeHtml(state.hostSearch)}" placeholder="Filter hosts..."
              class="w-full pl-8 pr-2.5 py-1.5 rounded-lg t-bg-base border t-border text-xs t-text-primary placeholder:opacity-50 focus:outline-none focus:t-border-strong" />
          </div>
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar">
            ${envs.map(env => `
              <button onclick="window.NodeDeck.setHostEnvFilter('${env}')"
                class="px-2 py-0.5 rounded-md text-[10px] font-medium border smooth-transition ${
                  state.hostEnvFilter === env
                    ? 't-accent-soft font-semibold'
                    : 't-bg-base t-border t-text-muted hover:t-text-primary'
                }">${env}</button>
            `).join('')}
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
          ${filtered.length > 0 ? filtered.map(host => {
            const env = host.env || (host.host?.startsWith('192.168.') ? 'LAN' : host.host?.startsWith('100.') ? 'Tailscale' : 'Tunnel');
            const badge = envStyleMap[env] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
            return `
              <div onclick='window.NodeDeck.connectHost(${JSON.stringify(host)})'
                class="group relative p-2.5 rounded-xl t-bg-base hover:t-bg-elevated border t-border hover:t-border-strong cursor-pointer smooth-transition">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.75)] shrink-0"></span>
                    <span class="font-semibold text-xs t-text-primary truncate">${escapeHtml(host.name)}</span>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-mono border ${badge}">${env}</span>
                    <div class="relative">
                      <button onclick="window.NodeDeck.toggleHostMenu('${host.id}', event)" title="Host Options"
                        class="p-1 rounded opacity-60 group-hover:opacity-100 t-text-muted hover:t-text-primary t-hover-bg smooth-transition">
                        <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
                      </button>
                      <div id="host-menu-${host.id}" class="host-action-menu hidden absolute right-0 mt-1 w-32 rounded-xl glass-modal border t-border-strong shadow-2xl py-1 z-40">
                        <button onclick="window.NodeDeck.openEditHostModal('${host.id}', event)" class="w-full px-3 py-1.5 text-left text-[11px] t-text-primary t-hover-bg flex items-center gap-2">
                          <i data-lucide="pencil" class="w-3 h-3 t-accent-text"></i> Edit
                        </button>
                        <button onclick="window.NodeDeck.duplicateHost('${host.id}', event)" class="w-full px-3 py-1.5 text-left text-[11px] t-text-primary t-hover-bg flex items-center gap-2">
                          <i data-lucide="copy" class="w-3 h-3 t-accent-sec-text"></i> Duplicate
                        </button>
                        <div class="my-1 border-t t-border"></div>
                        <button onclick="window.NodeDeck.promptDeleteHost('${host.id}', event)" class="w-full px-3 py-1.5 text-left text-[11px] text-rose-400 hover:bg-rose-500/10 flex items-center gap-2">
                          <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="mt-1 pl-4 flex items-center justify-between font-mono text-[10px] t-text-muted">
                  <span class="truncate">${escapeHtml(host.user)}@${escapeHtml(host.host)}:${host.port || 22}</span>
                  <span class="shrink-0 ml-1 font-mono">${host.auth || 'key'}</span>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="py-12 text-center text-[11px] t-text-muted">
              ${state.hosts.length === 0 ? 'No saved hosts yet' : 'No hosts match filter'}
            </div>
          `}
        </div>

        <div class="p-2.5 border-t t-border shrink-0">
          <button onclick="window.NodeDeck.openAddHostModal()" class="w-full py-2 rounded-xl t-accent-bg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm smooth-transition">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>New Host</span>
          </button>
        </div>
      `;

      const searchInp = document.getElementById('sidebarHostSearch');
      if (searchInp) {
        searchInp.addEventListener('input', e => {
          state.hostSearch = e.target.value;
          renderLeftSidebarContent();
          const restored = document.getElementById('sidebarHostSearch');
          if (restored) {
            restored.focus();
            restored.setSelectionRange(restored.value.length, restored.value.length);
          }
        });
      }
    } else if (state.sidebarTab === 'sftp') {
      const canGoUp = state.sftpPath !== '/' && state.sftpPath !== '';
      const isPinned = state.sftpBookmarks.some(b => b.path === state.sftpPath);
      const sortedFiles = getSortedSftpItems();

      const sortArrow = (key) => {
        if (state.sftpSortBy !== key) return '';
        return state.sftpSortAsc ? ' ↑' : ' ↓';
      };

      container.innerHTML = `
        <div class="p-2 space-y-2 border-b t-border shrink-0">
          <!-- Dynamic Breadcrumbs & Action Bar -->
          <div class="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg t-bg-base border t-border font-mono text-[11px]">
            <div id="breadcrumbScrollContainer" class="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1 whitespace-nowrap">
              ${renderBreadcrumbs(state.sftpPath)}
            </div>
            <div class="flex items-center gap-0.5 shrink-0 pl-1 border-l t-border">
              <button onclick="window.NodeDeck.togglePinCurrentFolder()" title="${isPinned ? 'Remove from favorites' : 'Add to favorites'}" class="p-1 rounded t-hover-bg ${isPinned ? 'text-amber-400' : 't-text-muted hover:t-text-primary'}">
                <i data-lucide="${isPinned ? 'star' : 'star'}" class="w-3 h-3 ${isPinned ? 'fill-amber-400' : ''}"></i>
              </button>
              <button onclick="window.NodeDeck.navigateSftpUp()" title="Up Directory" class="p-1 rounded t-hover-bg t-text-muted hover:t-text-primary ${canGoUp ? '' : 'opacity-40 cursor-not-allowed'}">
                <i data-lucide="arrow-up" class="w-3 h-3"></i>
              </button>
              <button onclick="window.NodeDeck.refreshSftp()" title="Refresh" class="p-1 rounded t-hover-bg t-text-muted hover:t-text-primary">
                <i data-lucide="refresh-cw" class="w-3 h-3 ${state.sftpLoading ? 'animate-spin' : ''}"></i>
              </button>
            </div>
          </div>

          <!-- Pinned Shortcuts (User-Defined Bookmarks) -->
          ${state.sftpBookmarks.length > 0 ? `
            <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              ${state.sftpBookmarks.map(b => `
                <button onclick="window.NodeDeck.navigateToSftpPath('${escapeQuotes(b.path)}')"
                  class="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border smooth-transition truncate max-w-[110px] ${
                    state.sftpPath === b.path ? 't-accent-soft font-semibold' : 't-bg-base t-border t-text-muted hover:t-text-primary'
                  }" title="${escapeHtml(b.path)}">
                  <i data-lucide="folder-heart" class="w-2.5 h-2.5 shrink-0 ${state.sftpPath === b.path ? 't-accent-text' : 't-accent-sec-text'}"></i>
                  <span class="truncate">${escapeHtml(b.name)}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}

          <!-- Sort Bar (Name, Type, Date) -->
          <div class="flex items-center justify-between text-[10px] px-1 font-mono t-text-muted">
            <span>Sort by:</span>
            <div class="flex items-center gap-1">
              <button onclick="window.NodeDeck.setSftpSort('name')"
                class="px-1.5 py-0.5 rounded border smooth-transition ${state.sftpSortBy === 'name' ? 't-accent-soft font-semibold' : 't-bg-base t-border hover:t-text-primary'}">
                Name${sortArrow('name')}
              </button>
              <button onclick="window.NodeDeck.setSftpSort('type')"
                class="px-1.5 py-0.5 rounded border smooth-transition ${state.sftpSortBy === 'type' ? 't-accent-soft font-semibold' : 't-bg-base t-border hover:t-text-primary'}">
                Type${sortArrow('type')}
              </button>
              <button onclick="window.NodeDeck.setSftpSort('date')"
                class="px-1.5 py-0.5 rounded border smooth-transition ${state.sftpSortBy === 'date' ? 't-accent-soft font-semibold' : 't-bg-base t-border hover:t-text-primary'}">
                Date${sortArrow('date')}
              </button>
            </div>
          </div>
        </div>

        <!-- Files List -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          ${state.sftpLoading ? `
            <div class="py-12 flex flex-col items-center justify-center gap-2 t-text-muted text-xs">
              <div class="spinner"></div>
              <span>Reading directory…</span>
            </div>
          ` : sortedFiles.length > 0 ? sortedFiles.map(item => {
            const isDir = item.is_dir;
            const sizeStr = isDir ? 'DIR' : formatFileSize(item.size);
            const dateStr = (state.sftpSortBy === 'date' && item.mod_time) ? item.mod_time : '';
            return `
              <div onclick="window.NodeDeck.onSftpItemClick('${escapeHtml(item.name)}', ${isDir})"
                class="group px-2.5 py-1.5 rounded-lg t-bg-base hover:t-bg-elevated border border-transparent hover:t-border cursor-pointer smooth-transition flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <i data-lucide="${isDir ? 'folder' : 'file-text'}" class="w-3.5 h-3.5 shrink-0 ${isDir ? 't-accent-text' : 't-text-muted'}"></i>
                  <span class="font-mono text-[11px] truncate ${isDir ? 'font-semibold t-text-primary' : 't-text-secondary'}">${escapeHtml(item.name)}${isDir ? '/' : ''}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 font-mono text-[10px] t-text-muted">
                  ${dateStr ? `<span class="opacity-75 font-mono text-[9px]">${dateStr}</span>` : ''}
                  <span>${sizeStr}</span>
                  <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${!isDir ? `
                      <button onclick="window.NodeDeck.downloadFilePath('${escapeHtml(item.path || state.sftpPath + '/' + item.name)}', event)" title="Download" class="p-1 rounded hover:t-text-primary t-hover-bg">
                        <i data-lucide="download" class="w-3 h-3"></i>
                      </button>
                    ` : ''}
                    <button onclick="window.NodeDeck.promptDeleteSftpItem('${escapeQuotes(item.name)}', '${escapeQuotes(item.path || state.sftpPath + '/' + item.name)}', ${isDir}, event)" title="Delete" class="p-1 rounded text-rose-400 hover:bg-rose-500/15">
                      <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="py-12 text-center text-[11px] t-text-muted">Directory is empty</div>
          `}
        </div>

        <!-- Upload & Actions -->
        <div class="p-2.5 border-t t-border shrink-0 flex items-center gap-2">
          <label class="flex-1 py-1.5 rounded-xl t-bg-base hover:t-bg-elevated border t-border-strong t-text-primary font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer smooth-transition">
            <i data-lucide="upload-cloud" class="w-3.5 h-3.5 t-accent-text"></i>
            <span>Upload File</span>
            <input type="file" id="sftpUploadInput" multiple style="display:none" onchange="window.NodeDeck.handleFileUpload(event)">
          </label>
        </div>
      `;

      // Auto-scroll breadcrumbs to the far right so current directory is always visible
      requestAnimationFrame(() => {
        const bc = document.getElementById('breadcrumbScrollContainer');
        if (bc) bc.scrollLeft = bc.scrollWidth;
      });
    } else if (state.sidebarTab === 'snippets') {
      const tagColors = {
        Docker: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        System: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        Tmux: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        Custom: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      };

      container.innerHTML = `
        <div class="p-2.5 border-b t-border space-y-2 shrink-0">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-mono uppercase tracking-wider t-text-muted">Snippets (${state.snippets.length})</span>
            <button onclick="window.NodeDeck.toggleAddSnippetForm()"
              class="px-2.5 py-1 rounded-lg t-accent-bg font-semibold text-[11px] flex items-center gap-1 shadow-sm smooth-transition">
              <i data-lucide="${state.addSnippetOpen ? 'x' : 'plus'}" class="w-3 h-3"></i>
              <span>${state.addSnippetOpen ? 'Cancel' : 'Add'}</span>
            </button>
          </div>

          <form id="addSnippetForm" class="${state.addSnippetOpen ? '' : 'hidden'} p-2.5 rounded-xl t-bg-base border t-border-strong space-y-2">
            <div>
              <label class="block text-[9px] font-mono uppercase t-text-muted mb-1">Snippet Name</label>
              <input id="snippetTitleInput" type="text" required placeholder="e.g. Restart Docker"
                class="w-full px-2.5 py-1.5 rounded-lg t-bg-surface border t-border text-xs t-text-primary placeholder:opacity-50 focus:outline-none focus:t-border-strong" />
            </div>
            <div>
              <label class="block text-[9px] font-mono uppercase t-text-muted mb-1">Command</label>
              <input id="snippetCmdInput" type="text" required placeholder="docker compose restart"
                class="w-full px-2.5 py-1.5 rounded-lg t-bg-surface border t-border font-mono text-[11px] t-text-primary placeholder:opacity-50 focus:outline-none focus:t-border-strong" />
            </div>
            <div class="flex items-center justify-between gap-2 pt-0.5">
              <select id="snippetTagInput"
                class="px-2 py-1.5 rounded-lg t-bg-surface border t-border text-[11px] t-text-primary focus:outline-none">
                <option value="Docker">Docker</option>
                <option value="Tmux">Tmux</option>
                <option value="System">System</option>
                <option value="Custom">Custom</option>
              </select>
              <button type="submit" class="px-3 py-1.5 rounded-lg t-accent-bg font-semibold text-[11px] flex items-center gap-1">
                <i data-lucide="check" class="w-3 h-3"></i>
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
          ${state.snippets.map(s => {
            const badge = tagColors[s.tag] || tagColors.Custom;
            return `
              <div onclick="window.NodeDeck.executeSnippet('${escapeQuotes(s.cmd)}')"
                class="group p-2.5 rounded-xl t-bg-base hover:t-bg-elevated border t-border hover:t-border-strong cursor-pointer smooth-transition space-y-1">
                <div class="flex items-center justify-between gap-1.5">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-semibold text-[11px] t-text-primary truncate">${escapeHtml(s.title)}</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-mono border shrink-0 ${badge}">${escapeHtml(s.tag || 'Custom')}</span>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <i data-lucide="play" class="w-3 h-3 t-accent-text"></i>
                    <button onclick="window.NodeDeck.deleteSnippet('${s.id}', event)" title="Delete Snippet"
                      class="p-0.5 rounded opacity-50 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10 smooth-transition">
                      <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>
                  </div>
                </div>
                <div class="font-mono text-[10px] t-text-muted truncate">$ ${escapeHtml(s.cmd)}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      const snipForm = document.getElementById('addSnippetForm');
      if (snipForm) {
        snipForm.addEventListener('submit', e => {
          e.preventDefault();
          const title = document.getElementById('snippetTitleInput').value.trim();
          const cmd = document.getElementById('snippetCmdInput').value.trim();
          const tag = document.getElementById('snippetTagInput').value;
          if (!title || !cmd) return;

          state.snippets.unshift({ id: 'sp-' + Date.now(), title, cmd, tag });
          saveSnippets(state.snippets);
          state.addSnippetOpen = false;
          renderLeftSidebarContent();
          toast(`Saved snippet "${title}"`, 'success');
        });
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  // 9. PRIMARY WORKSPACE CANVAS (HOME LAUNCHER & SPLIT TERMINALS)
  function renderMainCanvas() {
    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;

    if (state.activeTabId === 'launcher') {
      canvas.innerHTML = renderLauncherView();
      bindLauncherEvents();
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Terminals Viewport
    canvas.innerHTML = '';
    const active = state.termTabs.find(t => t.id === state.activeTabId) || state.termTabs[0];

    if (state.splitPane && state.secondaryTabId && state.secondaryTabId !== active.id) {
      const second = state.termTabs.find(t => t.id === state.secondaryTabId);
      const splitWrap = document.createElement('div');
      splitWrap.className = 'flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10 min-h-0 w-full h-full';

      if (active) {
        active.panelEl.classList.add('terminal-active-border');
        splitWrap.appendChild(active.panelEl);
      }
      if (second) {
        second.panelEl.classList.remove('terminal-active-border');
        splitWrap.appendChild(second.panelEl);
      }
      canvas.appendChild(splitWrap);
    } else if (active) {
      active.panelEl.classList.remove('terminal-active-border');
      canvas.appendChild(active.panelEl);
    }

    // Refit terminals after DOM attach
    requestAnimationFrame(() => {
      state.termTabs.forEach(t => {
        if (t.fitAddon) {
          try {
            t.fitAddon.fit();
            sendResize(t);
          } catch (e) {}
        }
      });
      if (active && active.term) active.term.focus();
    });

    if (window.lucide) lucide.createIcons();
  }

  function renderLauncherView() {
    const q = state.omniboxText.toLowerCase().trim();
    const filteredNodes = state.hosts.filter(n =>
      !q || n.name?.toLowerCase().includes(q) || n.host?.toLowerCase().includes(q) || n.user?.toLowerCase().includes(q)
    );

    // Universal Command Chips (Applicable to any Linux host / user)
    const workflows = [
      { label: 'tmux attach', cmd: 'tmux attach || tmux new' },
      { label: 'docker ps', cmd: 'docker ps' },
      { label: 'systemctl status', cmd: 'systemctl status' },
      { label: 'htop', cmd: 'htop' }
    ];

    return `
      <div class="flex-1 dot-grid-bg overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center">
        <div class="w-full max-w-2xl space-y-5">
          <!-- Hero Header -->
          <div class="text-center space-y-1">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full t-accent-soft border text-[10px] font-mono">
              <i data-lucide="zap" class="w-3 h-3"></i>
              <span>INSTANT WEBSSH & SFTP WORKSPACE</span>
            </div>
            <h1 class="text-lg sm:text-xl font-bold tracking-tight t-text-primary">Quick Connect or Select a Node</h1>
            <p class="text-[11px] t-text-muted">Paste <span class="font-mono t-text-secondary">user@host:port</span> below and press <kbd class="px-1.5 py-0.2 rounded t-bg-surface border t-border font-mono text-[10px]">Enter</kbd></p>
          </div>

          <!-- Hero Omnibox Card -->
          <div class="rounded-2xl t-bg-surface border t-border-strong p-3 shadow-2xl space-y-2.5">
            <div class="flex items-center gap-2.5 px-3 py-2 rounded-xl t-bg-base border t-border focus-within:t-border-strong">
              <i data-lucide="terminal" class="w-4 h-4 t-accent-text shrink-0"></i>
              <input id="heroOmniboxInput" type="text" value="${escapeHtml(state.omniboxText)}"
                placeholder="user@host:port (e.g. user@192.168.1.10:22 or server-alias)"
                class="flex-1 bg-transparent font-mono text-xs sm:text-sm t-text-primary placeholder:opacity-45 focus:outline-none" />
              <button onclick="window.NodeDeck.submitHeroOmnibox()" class="px-3.5 py-1.5 rounded-lg t-accent-bg font-semibold text-xs flex items-center gap-1.5 shrink-0 smooth-transition">
                <span>Connect</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Expandable Auth & Options Pill -->
            <div class="flex flex-wrap items-center justify-between gap-2 px-1">
              <button onclick="window.NodeDeck.toggleAuthExpanded()"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full t-bg-base hover:t-bg-elevated border t-border text-[10px] font-mono t-text-secondary smooth-transition">
                <i data-lucide="shield-check" class="w-3 h-3 t-accent-text"></i>
                <span>Auth: ${state.omniboxAuth === 'key' ? 'SSH Key' : 'Password'}</span>
                <i data-lucide="${state.authExpanded ? 'chevron-up' : 'chevron-down'}" class="w-3 h-3 t-text-muted"></i>
              </button>

              <!-- Universal 1-Click Command Chips -->
              <div class="flex flex-wrap items-center gap-1.5">
                ${workflows.map(w => `
                  <button onclick="window.NodeDeck.triggerWorkflowSnippet('${escapeQuotes(w.cmd)}')"
                    class="px-2 py-0.5 rounded-full t-bg-base hover:t-bg-elevated border t-border hover:t-border-strong font-mono text-[10px] t-text-muted hover:t-text-primary smooth-transition">
                    ${escapeHtml(w.label)}
                  </button>
                `).join('')}
              </div>
            </div>

            ${state.authExpanded ? `
              <div class="pt-2 border-t t-border flex flex-wrap items-center justify-between gap-3 px-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-mono t-text-muted">Auth:</span>
                  ${['key', 'password'].map(m => `
                    <button onclick="window.NodeDeck.setOmniboxAuth('${m}')"
                      class="px-2.5 py-1 rounded-lg text-[11px] font-medium border smooth-transition ${
                        state.omniboxAuth === m ? 't-accent-soft font-semibold' : 't-bg-base t-border t-text-muted hover:t-text-primary'
                      }">${m === 'key' ? 'SSH Key' : 'Password'}</button>
                  `).join('')}
                </div>
                <label class="inline-flex items-center gap-1.5 text-[11px] t-text-secondary cursor-pointer">
                  <input type="checkbox" ${state.omniboxSave ? 'checked' : ''} onchange="window.NodeDeck.setOmniboxSave(this.checked)"
                    class="rounded border-white/20 bg-transparent" />
                  <span>Save host to sidebar</span>
                </label>
              </div>
            ` : ''}
          </div>

          <!-- 2-Column Saved Host Cards -->
          <div class="space-y-2">
            <div class="flex items-center justify-between px-1">
              <span class="text-[10px] font-mono uppercase tracking-wider t-text-muted">Quick Connect Hosts (${filteredNodes.length})</span>
              <button onclick="window.NodeDeck.openAddHostModal()" class="text-[11px] t-accent-text hover:underline font-medium flex items-center gap-1">
                <i data-lucide="plus" class="w-3 h-3"></i>
                <span>Add Host</span>
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${filteredNodes.map(host => {
                const env = host.env || (host.host?.startsWith('192.168.') ? 'LAN' : host.host?.startsWith('100.') ? 'Tailscale' : 'Tunnel');
                const badge = envStyleMap[env] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
                return `
                  <div onclick='window.NodeDeck.connectHost(${JSON.stringify(host)})'
                    class="group p-3 rounded-xl t-bg-surface hover:t-bg-elevated border t-border hover:t-border-strong cursor-pointer smooth-transition flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <span class="font-semibold text-xs t-text-primary truncate">${escapeHtml(host.name)}</span>
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-mono border ${badge}">${env}</span>
                      </div>
                      <div class="mt-1 pl-4 font-mono text-[10px] t-text-muted truncate">${escapeHtml(host.user)}@${escapeHtml(host.host)}:${host.port || 22}</div>
                    </div>
                    <div class="flex flex-col items-end gap-1 shrink-0">
                      <span class="font-mono text-[10px] t-text-muted">${host.auth || 'key'}</span>
                      <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 t-accent-text opacity-70 group-hover:opacity-100"></i>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindLauncherEvents() {
    const inp = document.getElementById('heroOmniboxInput');
    if (!inp) return;
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);

    inp.addEventListener('input', e => {
      state.omniboxText = e.target.value;
      renderMainCanvas();
    });

    inp.addEventListener('paste', e => {
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const parsed = parseSmartConnect(pasted);
      if (parsed) {
        e.preventDefault();
        const norm = `${parsed.user}@${parsed.host}:${parsed.port}`;
        state.omniboxText = norm;
        renderMainCanvas();
        toast(`Parsed ${norm}`, 'success');
      }
    });

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitHeroOmnibox();
      }
    });
  }

  function parseSmartConnect(raw) {
    const cleaned = raw.trim().replace(/^ssh\s+/i, '');
    if (!cleaned) return null;

    let user = 'root';
    let hostPart = cleaned;

    if (cleaned.includes('@')) {
      const parts = cleaned.split('@');
      user = parts[0].trim() || 'root';
      hostPart = parts.slice(1).join('@').trim();
    }

    let host = hostPart;
    let port = 22;

    if (hostPart.includes(':')) {
      const hp = hostPart.split(':');
      host = hp[0].trim();
      const parsedPort = parseInt(hp[1], 10);
      if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        port = parsedPort;
      }
    }

    if (!host) return null;
    return { user, host, port };
  }

  async function submitHeroOmnibox() {
    const raw = state.omniboxText.trim();
    if (!raw) {
      toast('Enter user@host:port or select a host');
      return;
    }

    const exactAlias = state.hosts.find(n => n.name?.toLowerCase() === raw.toLowerCase());
    if (exactAlias && !raw.includes('@') && !raw.includes('.')) {
      state.omniboxText = '';
      connectHost(exactAlias);
      return;
    }

    const parsed = parseSmartConnect(raw);
    if (!parsed) {
      toast('Invalid format. Use user@host:port', 'warn');
      return;
    }

    const env = parsed.host.startsWith('192.168.') ? 'LAN' : parsed.host.startsWith('100.') ? 'Tailscale' : 'Tunnel';
    const payload = {
      name: `${parsed.user}@${parsed.host}`,
      type: 'ssh',
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      auth: state.omniboxAuth,
      password: '',
      key_path: '',
      color: '#0FC5ED',
      env
    };

    if (state.omniboxSave) {
      try {
        await saveHostToBackend(payload);
        toast(`Saved '${payload.name}' to Hosts`, 'success');
      } catch (err) {
        toast('Failed to save host: ' + err.message, 'warn');
      }
    }

    state.omniboxText = '';
    connectQuickHost(payload);
  }

  async function connectQuickHost(payload) {
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        createTab(payload.name, payload.name, payload.color || '#0FC5ED', true, data.session_id, { env: payload.env });
      } else {
        const err = await res.text();
        toast('Connection failed: ' + err, 'error');
      }
    } catch (e) {
      toast('Error connecting: ' + e.message, 'error');
    }
  }

  function connectHost(host) {
    const existingSame = state.termTabs.filter(t => t.hostId === host.id);
    const count = existingSame.length + 1;
    const tabTitle = `${host.name || host.host} · ${count}`;
    createTab(tabTitle, host.id, host.color || '#0FC5ED', true, null, { env: host.env });
  }

  function triggerWorkflowSnippet(cmd) {
    const active = state.termTabs.find(t => t.id === state.activeTabId);
    if (active && active.ws && active.ws.readyState === WebSocket.OPEN) {
      active.ws.send(cmd + '\n');
      toast(`Executed "${cmd}"`, 'success');
      return;
    }

    // If no active terminal session, check if there is an input in Omnibox
    const omniRaw = (state.omniboxText || '').trim();
    if (omniRaw) {
      const parsed = parseSmartConnect(omniRaw);
      if (parsed) {
        const env = parsed.host.startsWith('192.168.') ? 'LAN' : parsed.host.startsWith('100.') ? 'Tailscale' : 'Tunnel';
        const payload = {
          name: `${parsed.user}@${parsed.host}`,
          type: 'ssh',
          host: parsed.host,
          port: parsed.port,
          user: parsed.user,
          auth: state.omniboxAuth,
          password: '',
          key_path: '',
          color: '#0FC5ED',
          env
        };
        connectQuickHost(payload).then(() => {
          setTimeout(() => {
            const newly = state.termTabs.find(t => t.id === state.activeTabId);
            if (newly && newly.ws) newly.ws.send(cmd + '\n');
          }, 1200);
        });
        return;
      }
    }

    toast('Connect or paste user@host in Omnibox first');
  }

  function executeSnippet(cmd) {
    const active = state.termTabs.find(t => t.id === state.activeTabId);
    if (!active) {
      toast('Open a terminal session first to run snippet');
      return;
    }
    if (active.ws && active.ws.readyState === WebSocket.OPEN) {
      active.ws.send(cmd + '\n');
      toast('Snippet sent to terminal', 'success');
    } else {
      toast('Terminal not connected', 'warn');
    }
  }

  // 10. HOST MODAL & ACTIONS
  function openAddHostModal() {
    document.getElementById('nodeModalForm').reset();
    document.getElementById('editNodeId').value = '';
    document.getElementById('nodeModalTitle').textContent = 'Add New Host';
    document.getElementById('nodePort').value = 22;
    onModalAuthChange();
    document.getElementById('nodeModalBackdrop').classList.remove('hidden');
    document.getElementById('nodeAlias').focus();
  }

  function openEditHostModal(id, e) {
    if (e) e.stopPropagation();
    closeAllPopups();
    const host = state.hosts.find(h => h.id === id);
    if (!host) return;

    document.getElementById('nodeModalTitle').textContent = `Edit Host · ${host.name}`;
    document.getElementById('editNodeId').value = host.id;
    document.getElementById('nodeAlias').value = host.name || '';
    document.getElementById('nodeEnv').value = host.env || 'LAN';
    document.getElementById('nodeHost').value = host.host || '';
    document.getElementById('nodePort').value = host.port || 22;
    document.getElementById('nodeUser').value = host.user || '';
    document.getElementById('nodeAuth').value = host.auth || 'key';
    document.getElementById('nodePassword').value = host.password || '';
    document.getElementById('nodeKeyPath').value = host.key_path || '';

    onModalAuthChange();
    document.getElementById('nodeModalBackdrop').classList.remove('hidden');
    document.getElementById('nodeAlias').focus();
  }

  function closeNodeModal() {
    document.getElementById('nodeModalBackdrop').classList.add('hidden');
  }

  function onModalAuthChange() {
    const auth = document.getElementById('nodeAuth').value;
    const pwdGroup = document.getElementById('nodePasswordGroup');
    const keyGroup = document.getElementById('nodeKeyGroup');
    if (auth === 'password') {
      pwdGroup.classList.remove('hidden');
      keyGroup.classList.add('hidden');
    } else {
      pwdGroup.classList.add('hidden');
      keyGroup.classList.remove('hidden');
    }
  }

  document.getElementById('nodeModalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editNodeId').value;
    const name = document.getElementById('nodeAlias').value.trim();
    const env = document.getElementById('nodeEnv').value;
    const host = document.getElementById('nodeHost').value.trim();
    const port = parseInt(document.getElementById('nodePort').value, 10) || 22;
    const user = document.getElementById('nodeUser').value.trim();
    const auth = document.getElementById('nodeAuth').value;
    const password = document.getElementById('nodePassword').value;
    const key_path = document.getElementById('nodeKeyPath').value.trim();

    const payload = {
      id: id || undefined,
      name,
      type: 'ssh',
      env,
      host,
      port,
      user,
      auth,
      password: auth === 'password' ? password : '',
      key_path: auth === 'key' ? key_path : '',
      color: '#0FC5ED'
    };

    try {
      await saveHostToBackend(payload);
      closeNodeModal();
      toast(`Saved '${name}'`, 'success');
      renderAll();
    } catch (err) {
      toast('Error saving host: ' + err.message, 'error');
    }
  });

  function toggleHostMenu(id, e) {
    e.stopPropagation();
    document.querySelectorAll('.host-action-menu').forEach(m => {
      if (m.id !== `host-menu-${id}`) m.classList.add('hidden');
    });
    const menu = document.getElementById(`host-menu-${id}`);
    if (menu) menu.classList.toggle('hidden');
  }

  function duplicateHost(id, e) {
    if (e) e.stopPropagation();
    closeAllPopups();
    const orig = state.hosts.find(h => h.id === id);
    if (!orig) return;
    const copy = {
      ...orig,
      id: undefined,
      name: `${orig.name}-copy`
    };
    saveHostToBackend(copy).then(() => {
      toast(`Duplicated '${orig.name}'`, 'success');
    }).catch(err => toast('Error duplicating: ' + err.message, 'error'));
  }

  function promptDeleteHost(id, e) {
    if (e) e.stopPropagation();
    closeAllPopups();
    const target = state.hosts.find(h => h.id === id);
    if (!target) return;

    document.getElementById('deleteTargetText').textContent = `${target.name} (${target.user}@${target.host})`;
    const btn = document.getElementById('confirmDeleteBtn');
    btn.onclick = async () => {
      try {
        await deleteHostFromBackend(id);
        closeDeleteModal();
        toast(`Deleted '${target.name}'`, 'warn');
      } catch (err) {
        toast('Delete failed: ' + err.message, 'error');
      }
    };
    document.getElementById('confirmDeleteBackdrop').classList.remove('hidden');
  }

  function closeDeleteModal() {
    document.getElementById('confirmDeleteBackdrop').classList.add('hidden');
  }

  function promptDeleteSftpItem(name, path, isDir, e) {
    if (e) e.stopPropagation();
    closeAllPopups();

    document.getElementById('deleteTargetText').textContent = `${isDir ? '📁 Folder: ' : '📄 File: '}${path}`;
    const btn = document.getElementById('confirmDeleteBtn');
    btn.onclick = async () => {
      try {
        const res = await fetch(`/api/fs/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
        if (res.ok) {
          closeDeleteModal();
          toast(`Deleted ${name}`, 'warn');
          refreshSftp();
        } else {
          const err = await res.text();
          toast('Delete failed: ' + err, 'error');
        }
      } catch (err) {
        toast('Delete failed: ' + err.message, 'error');
      }
    };
    document.getElementById('confirmDeleteBackdrop').classList.remove('hidden');
  }

  // 11. SFTP OPERATIONS & FILE EDITOR
  function navigateToSftpPath(path) {
    fetchFsList(path);
  }

  function navigateSftpUp() {
    if (state.sftpPath === '/' || !state.sftpPath) return;
    const parts = state.sftpPath.split('/').filter(Boolean);
    parts.pop();
    const upPath = '/' + parts.join('/');
    fetchFsList(upPath || '/');
  }

  function refreshSftp() {
    fetchFsList(state.sftpPath);
  }

  function onSftpItemClick(name, isDir) {
    const fullPath = state.sftpPath.endsWith('/') ? state.sftpPath + name : state.sftpPath + '/' + name;
    if (isDir) {
      fetchFsList(fullPath);
    } else {
      openFileInEditor(fullPath);
    }
  }

  function downloadFilePath(path, e) {
    if (e) e.stopPropagation();
    const a = document.createElement('a');
    a.href = `/api/fs/download?path=${encodeURIComponent(path)}`;
    a.download = path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadCurrentFile() {
    if (state.editorPath) {
      downloadFilePath(state.editorPath);
    }
  }

  async function openFileInEditor(path) {
    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const err = await res.text();
        toast('Cannot open file: ' + err, 'error');
        return;
      }
      const data = await res.json();
      state.editorPath = path;
      state.editorIsDirty = false;

      const fileName = path.split('/').pop();
      document.getElementById('editorFileName').textContent = fileName;
      document.getElementById('editorFilePath').textContent = path;
      document.getElementById('editorDirtyDot').classList.add('hidden');

      const textarea = document.getElementById('editorTextarea');
      textarea.value = data.content || '';
      updateEditorLineNumbers();

      document.getElementById('fileEditorBackdrop').classList.remove('hidden');
      textarea.focus();
    } catch (e) {
      toast('Failed to load file: ' + e.message, 'error');
    }
  }

  function closeFileEditor() {
    document.getElementById('fileEditorBackdrop').classList.add('hidden');
    state.editorPath = '';
    state.editorIsDirty = false;
  }

  async function saveEditedFile() {
    if (!state.editorPath) return;
    const content = document.getElementById('editorTextarea').value;
    try {
      const res = await fetch('/api/fs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: state.editorPath, content })
      });
      if (res.ok) {
        state.editorIsDirty = false;
        document.getElementById('editorDirtyDot').classList.add('hidden');
        toast('File saved successfully', 'success');
      } else {
        const err = await res.text();
        toast('Save failed: ' + err, 'error');
      }
    } catch (e) {
      toast('Save error: ' + e.message, 'error');
    }
  }

  function updateEditorLineNumbers() {
    const textarea = document.getElementById('editorTextarea');
    const linesEl = document.getElementById('editorLineNumbers');
    const lineCountEl = document.getElementById('editorLineCount');
    const sizeEl = document.getElementById('editorFileSize');

    const lines = textarea.value.split('\n');
    linesEl.innerHTML = lines.map((_, i) => i + 1).join('<br>');
    if (lineCountEl) lineCountEl.textContent = `${lines.length} lines`;
    if (sizeEl) sizeEl.textContent = formatFileSize(new Blob([textarea.value]).size);
  }

  document.getElementById('editorTextarea').addEventListener('input', () => {
    state.editorIsDirty = true;
    document.getElementById('editorDirtyDot').classList.remove('hidden');
    updateEditorLineNumbers();
  });

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`/api/fs/upload?path=${encodeURIComponent(state.sftpPath)}`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          toast(`Uploaded ${file.name}`, 'success');
        } else {
          toast(`Failed to upload ${file.name}`, 'error');
        }
      } catch (err) {
        toast(`Upload error: ${err.message}`, 'error');
      }
    }
    refreshSftp();
  }

  // 12. COMMAND PALETTE (Ctrl+K)
  let paletteItems = [];

  function openCommandPalette() {
    state.cmdIndex = 0;
    document.getElementById('cmdPaletteBackdrop').classList.remove('hidden');
    const inp = document.getElementById('cmdPaletteInput');
    inp.value = '';
    renderPaletteList('');
    inp.focus();
  }

  function closeCommandPalette() {
    document.getElementById('cmdPaletteBackdrop').classList.add('hidden');
  }

  function renderPaletteList(query) {
    const q = query.toLowerCase().trim();
    const items = [];

    if (q && (q.includes('@') || q.includes('.'))) {
      items.push({
        icon: 'zap',
        title: `Connect to ${query.trim()}`,
        sub: 'Direct Quick SSH',
        tag: 'ENTER',
        run: () => {
          state.omniboxText = query.trim();
          submitHeroOmnibox();
        }
      });
    }

    state.hosts.forEach(n => {
      if (!q || n.name?.toLowerCase().includes(q) || n.host?.toLowerCase().includes(q)) {
        items.push({
          icon: 'terminal',
          title: n.name,
          sub: `${n.user}@${n.host}:${n.port || 22}`,
          tag: n.env || 'SSH',
          run: () => connectHost(n)
        });
      }
    });

    const actions = [
      { icon: 'columns-2', title: 'Toggle Split View 50/50', sub: 'Side-by-side active terminals', tag: 'Ctrl+\\', run: toggleSplitPane },
      { icon: 'panel-left', title: 'Toggle Left Sidebar', sub: 'Show or hide sidebar', tag: 'Ctrl+B', run: toggleLeftSidebar },
      { icon: 'plus-circle', title: 'Add New Host', sub: 'Save server to sidebar', tag: 'NEW', run: openAddHostModal }
    ];

    actions.forEach(a => {
      if (!q || a.title.toLowerCase().includes(q)) items.push(a);
    });

    paletteItems = items;
    if (state.cmdIndex >= items.length) state.cmdIndex = 0;

    const list = document.getElementById('cmdPaletteList');
    list.innerHTML = items.map((it, i) => `
      <div onclick="window.NodeDeck.runPaletteEntry(${i})" class="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer smooth-transition ${
        i === state.cmdIndex ? 't-accent-soft border' : 'border border-transparent t-hover-bg t-text-primary'
      }">
        <div class="flex items-center gap-2.5 min-w-0">
          <i data-lucide="${it.icon}" class="w-3.5 h-3.5 shrink-0 t-accent-text"></i>
          <div class="min-w-0">
            <div class="text-xs font-medium truncate">${escapeHtml(it.title)}</div>
            <div class="font-mono text-[10px] t-text-muted truncate">${escapeHtml(it.sub)}</div>
          </div>
        </div>
        <span class="px-1.5 py-0.5 rounded t-bg-base border t-border font-mono text-[9px] t-text-muted shrink-0">${it.tag}</span>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  function runPaletteEntry(i) {
    const it = paletteItems[i];
    if (!it) return;
    closeCommandPalette();
    it.run();
  }

  // 13. MOBILE KEYS BAR
  function setCtrlArmed(on) {
    state.ctrlArmed = on;
    const b = document.querySelector('#mobile-keys [data-key="ctrl"]');
    if (b) b.classList.toggle('armed', on);
  }

  function initMobileKeys() {
    const bar = document.getElementById('mobile-keys');
    if (!bar) return;
    if (window.innerWidth <= 768) bar.classList.add('show');

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.key-btn');
      if (!btn) return;
      const key = btn.dataset.key;
      const active = state.termTabs.find(t => t.id === state.activeTabId);
      if (!active || !active.ws || active.ws.readyState !== WebSocket.OPEN) return;

      if (key === 'ctrl') {
        setCtrlArmed(!state.ctrlArmed);
        return;
      }

      let payload = null;
      switch (key) {
        case 'esc': payload = '\x1b'; break;
        case 'tab': payload = '\t'; break;
        case 'c': payload = '\x03'; break;
        case 'd': payload = '\x04'; break;
        case 'z': payload = '\x1a'; break;
        case 'up': payload = '\x1b[A'; break;
        case 'down': payload = '\x1b[B'; break;
        case 'right': payload = '\x1b[C'; break;
        case 'left': payload = '\x1b[D'; break;
        case 'pipe': payload = '|'; break;
        case 'tilde': payload = '~'; break;
        case 'slash': payload = '/'; break;
      }

      if (payload) {
        active.ws.send(payload);
        active.term.focus();
      }
    });
  }

  // 13b. SIDEBAR RESIZING
  function initSidebarResizer() {
    const resizer = document.getElementById('sidebarResizer');
    const sidebar = document.getElementById('leftSidebar');
    if (!resizer || !sidebar) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const savedWidth = localStorage.getItem('nodedeck_sidebar_width');
    if (savedWidth && window.innerWidth > 768) {
      sidebar.style.width = `${savedWidth}px`;
    }

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.getBoundingClientRect().width;
      resizer.classList.add('is-resizing');
      document.body.classList.add('no-select');
      document.body.style.cursor = 'col-resize';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const delta = e.clientX - startX;
      let newWidth = startWidth + delta;
      const minW = 200;
      const maxW = Math.min(window.innerWidth * 0.7, 600);

      if (newWidth < minW) newWidth = minW;
      if (newWidth > maxW) newWidth = maxW;

      sidebar.style.width = `${newWidth}px`;

      // Keep current directory visible during live resize
      const bc = document.getElementById('breadcrumbScrollContainer');
      if (bc) bc.scrollLeft = bc.scrollWidth;
    });

    window.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      resizer.classList.remove('is-resizing');
      document.body.classList.remove('no-select');
      document.body.style.cursor = '';
      
      const currentWidth = sidebar.getBoundingClientRect().width;
      try {
        localStorage.setItem('nodedeck_sidebar_width', Math.round(currentWidth));
      } catch (e) {}

      // Keep current directory visible on resize complete
      const bc = document.getElementById('breadcrumbScrollContainer');
      if (bc) bc.scrollLeft = bc.scrollWidth;

      // Refit active terminals to new width
      state.termTabs.forEach(t => {
        if (t.fitAddon) {
          try {
            t.fitAddon.fit();
            sendResize(t);
          } catch (err) {}
        }
      });
    });
  }

  // 14. GLOBAL EVENTS & SHORTCUTS
  function closeAllPopups() {
    document.querySelectorAll('.host-action-menu').forEach(m => m.classList.add('hidden'));
    const tMenu = document.getElementById('themeDropdownMenu');
    if (tMenu) tMenu.classList.add('hidden');
  }

  window.addEventListener('click', () => closeAllPopups());

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const modal = document.getElementById('cmdPaletteBackdrop');
      if (modal.classList.contains('hidden')) openCommandPalette();
      else closeCommandPalette();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleLeftSidebar();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
      e.preventDefault();
      toggleSplitPane();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      const editor = document.getElementById('fileEditorBackdrop');
      if (!editor.classList.contains('hidden')) {
        e.preventDefault();
        saveEditedFile();
      }
    } else if (e.altKey && e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx === 0) {
        e.preventDefault();
        switchTab('launcher');
      } else if (state.termTabs[idx - 1]) {
        e.preventDefault();
        switchTab(state.termTabs[idx - 1].id);
      }
    } else if (e.key === 'Escape') {
      closeCommandPalette();
      closeNodeModal();
      closeDeleteModal();
      closeFileEditor();
    }
  });

  const cmdInp = document.getElementById('cmdPaletteInput');
  if (cmdInp) {
    cmdInp.addEventListener('input', e => {
      state.cmdIndex = 0;
      renderPaletteList(e.target.value);
    });
    cmdInp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.cmdIndex = (state.cmdIndex + 1) % Math.max(1, paletteItems.length);
        renderPaletteList(cmdInp.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.cmdIndex = (state.cmdIndex - 1 + paletteItems.length) % Math.max(1, paletteItems.length);
        renderPaletteList(cmdInp.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runPaletteEntry(state.cmdIndex);
      }
    });
  }

  window.addEventListener('resize', () => {
    state.termTabs.forEach(t => {
      if (t.fitAddon) {
        try {
          t.fitAddon.fit();
          sendResize(t);
        } catch (e) {}
      }
    });
  });

  // Helpers
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeQuotes(str) {
    return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  function renderAll() {
    renderTopTabs();
    renderLeftSidebarVisibility();
    renderLeftSidebarContent();
    renderMainCanvas();
    if (window.lucide) lucide.createIcons();
  }

  // 15. PUBLIC EXPORTS FOR INLINE ONCLICK HANDLERS
  // 15b. AUTHENTICATION & LOCK SCREEN
  async function checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        const lockBtn = document.getElementById('lockSessionBtn');
        if (data.auth_required) {
          if (lockBtn) lockBtn.classList.remove('hidden');
          if (!data.authenticated) {
            showLoginScreen();
            return false;
          }
        } else {
          if (lockBtn) lockBtn.classList.add('hidden');
        }
      }
    } catch (e) {
      console.warn('Auth check failed:', e);
    }
    hideLoginScreen();
    return true;
  }

  function showLoginScreen() {
    const el = document.getElementById('loginScreen');
    if (el) {
      el.classList.remove('hidden');
      el.classList.remove('opacity-0');
      const pass = document.getElementById('loginPasswordInput');
      if (pass) {
        pass.value = '';
        setTimeout(() => pass.focus(), 150);
      }
      const errBanner = document.getElementById('loginErrorBanner');
      if (errBanner) errBanner.classList.add('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function hideLoginScreen() {
    const el = document.getElementById('loginScreen');
    if (el && !el.classList.contains('hidden')) {
      el.classList.add('smooth-transition', 'opacity-0');
      setTimeout(() => {
        el.classList.add('hidden');
        el.classList.remove('opacity-0');
      }, 250);
    }
  }

  function toggleLoginPasswordEye() {
    const input = document.getElementById('loginPasswordInput');
    const icon = document.getElementById('loginEyeIcon');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.setAttribute('data-lucide', 'eye-off');
    } else {
      input.type = 'password';
      if (icon) icon.setAttribute('data-lucide', 'eye');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async function submitLogin(e) {
    if (e) e.preventDefault();
    const passInput = document.getElementById('loginPasswordInput');
    const rememberCheck = document.getElementById('loginRememberCheck');
    const errBanner = document.getElementById('loginErrorBanner');
    const errText = document.getElementById('loginErrorText');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const btnText = document.getElementById('loginBtnText');

    if (!passInput) return;
    const password = passInput.value;
    const remember = rememberCheck ? rememberCheck.checked : true;

    if (errBanner) errBanner.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.textContent = 'Verifying…';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, remember })
      });
      if (res.ok) {
        toast('Welcome back to NodeDeck', 'success');
        hideLoginScreen();
        // Boot workspace data
        fetchHosts();
        fetchFsList(state.sftpPath);
      } else {
        const data = await res.json().catch(() => ({}));
        if (errBanner) {
          errBanner.classList.remove('hidden');
          if (errText) errText.textContent = data.error || 'Incorrect password. Please try again.';
          if (window.lucide) window.lucide.createIcons();
        }
        passInput.classList.add('ring-2', 'ring-rose-500/50', 'border-rose-500');
        setTimeout(() => {
          passInput.classList.remove('ring-2', 'ring-rose-500/50', 'border-rose-500');
        }, 1500);
        passInput.focus();
        passInput.select();
      }
    } catch (err) {
      if (errBanner) {
        errBanner.classList.remove('hidden');
        if (errText) errText.textContent = 'Connection error: ' + err.message;
        if (window.lucide) window.lucide.createIcons();
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.textContent = 'Sign In';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async function logoutSession() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    toast('Session locked', 'info');
    // Disconnect any active terminal sessions
    state.termTabs.forEach(t => {
      if (t.ws) {
        t.closing = true;
        t.ws.close();
      }
    });
    showLoginScreen();
  }

  window.NodeDeck = {
    state,
    applyTheme,
    toggleThemeMenu,
    selectThemeFromMenu,
    toggleLeftSidebar,
    setSidebarTab,
    setHostEnvFilter: (env) => { state.hostEnvFilter = env; renderLeftSidebarContent(); },
    openAddHostModal,
    openEditHostModal,
    closeNodeModal,
    onModalAuthChange,
    toggleHostMenu,
    duplicateHost,
    promptDeleteHost,
    promptDeleteSftpItem,
    closeDeleteModal,
    connectHost,
    submitHeroOmnibox,
    toggleAuthExpanded: () => { state.authExpanded = !state.authExpanded; renderMainCanvas(); },
    setOmniboxAuth: (auth) => { state.omniboxAuth = auth; renderMainCanvas(); },
    setOmniboxSave: (save) => { state.omniboxSave = save; },
    triggerWorkflowSnippet,
    executeSnippet,
    toggleAddSnippetForm: () => { state.addSnippetOpen = !state.addSnippetOpen; renderLeftSidebarContent(); },
    deleteSnippet: (id, e) => {
      if (e) e.stopPropagation();
      state.snippets = state.snippets.filter(s => s.id !== id);
      saveSnippets(state.snippets);
      renderLeftSidebarContent();
      toast('Snippet deleted', 'warn');
    },
    switchTab,
    closeTab,
    toggleSplitPane,
    navigateToSftpPath,
    navigateSftpUp,
    refreshSftp,
    setSftpSort,
    togglePinCurrentFolder,
    onSftpItemClick,
    downloadFilePath,
    downloadCurrentFile,
    saveEditedFile,
    closeFileEditor,
    handleFileUpload,
    openCommandPalette,
    closeCommandPalette,
    runPaletteEntry,
    submitLogin,
    toggleLoginPasswordEye,
    logoutSession,
    showLoginScreen
  };

  // 16. BOOT APPLICATION
  applyTheme(state.theme);
  renderAll();
  initMobileKeys();
  initSidebarResizer();
  checkAuthStatus().then(authenticated => {
    if (authenticated) {
      fetchHosts();
      fetchFsList(state.sftpPath);
    }
  });

})();
