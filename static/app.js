// Phantom Terminal - Frontend Logic
(function() {
  'use strict';

  // Palette matching Ghostty / Tokyo Night
  const THEME = {
    background: '#0f1115',
    foreground: '#d8dce4',
    cursor: '#7aa2f7',
    cursorAccent: '#0f1115',
    selectionBackground: 'rgba(122, 162, 247, 0.3)',
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

  const tabsContainer = document.getElementById('tabs-container');
  const terminalContainer = document.getElementById('terminal-container');
  const btnNewTab = document.getElementById('btn-new-tab');
  const pwaInstallBtn = document.getElementById('pwa-install-btn');

  let tabs = []; // [{ id, name, term, fitAddon, ws, panel, closing }]
  let activeTabId = null;
  let deferredPrompt = null;

  // Ensure fonts are loaded before xterm measures cells
  async function ensureFontLoaded() {
    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load('400 14px "JetBrains Mono"'),
          document.fonts.load('700 14px "JetBrains Mono"'),
          document.fonts.ready
        ]);
      }
    } catch (e) {
      console.warn('Font loading wait skipped:', e);
    }
  }

  // LocalStorage persistence for tabs
  function loadSavedTabs() {
    try {
      const saved = localStorage.getItem('phantom_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  function saveTabs() {
    const data = tabs.map(t => ({ id: t.id, name: t.name }));
    localStorage.setItem('phantom_tabs', JSON.stringify(data));
    if (activeTabId) {
      localStorage.setItem('phantom_active_tab', activeTabId);
    }
  }

  // Create a tab session
  function createTab(id, name, activate = true) {
    if (tabs.find(t => t.id === id)) {
      return;
    }

    // Tab DOM element
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.id = id;

    const titleEl = document.createElement('span');
    titleEl.className = 'tab-title';
    titleEl.textContent = name || 'shell';

    const closeEl = document.createElement('span');
    closeEl.className = 'tab-close';
    closeEl.innerHTML = '&times;';
    closeEl.title = 'Tutup tab';

    tabEl.appendChild(titleEl);
    tabEl.appendChild(closeEl);
    tabsContainer.appendChild(tabEl);

    // Terminal Panel DOM
    const panelEl = document.createElement('div');
    panelEl.className = 'terminal-panel';
    panelEl.dataset.id = id;
    terminalContainer.appendChild(panelEl);

    // Xterm instance
    const term = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', Cascadia Code, monospace",
      fontSize: 14,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      convertEol: true
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);

    term.open(panelEl);

    // Try WebGL addon for crisp GPU-accelerated rendering
    try {
      if (typeof WebglAddon !== 'undefined' && WebglAddon.WebglAddon) {
        const webgl = new WebglAddon.WebglAddon();
        webgl.onContextLoss(() => webgl.dispose());
        term.loadAddon(webgl);
      }
    } catch (e) {
      console.warn('WebGL addon disabled, fallback to standard canvas:', e);
    }

    // Dynamic title updates
    term.onTitleChange((title) => {
      if (title && title.trim()) {
        const cleanTitle = title.split('—')[0].split('-')[0].trim();
        titleEl.textContent = cleanTitle || title;
        const tabObj = tabs.find(t => t.id === id);
        if (tabObj) {
          tabObj.name = cleanTitle || title;
          saveTabs();
        }
      }
    });

    // Auto copy on selection
    term.onSelectionChange(() => {
      const selection = term.getSelection();
      if (selection && selection.length > 0) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(selection).catch(() => {});
        }
      }
    });

    // Setup WebSocket connection
    const tabObj = {
      id,
      name: name || 'shell',
      tabEl,
      titleEl,
      panelEl,
      term,
      fitAddon,
      ws: null,
      closing: false
    };
    tabs.push(tabObj);

    connectWs(tabObj);

    // Events
    tabEl.addEventListener('click', (e) => {
      if (e.target === closeEl) {
        closeTab(id);
      } else {
        switchTab(id);
      }
    });

    // Rename on double-click
    tabEl.addEventListener('dblclick', (e) => {
      if (e.target === closeEl) return;
      const current = titleEl.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = current;
      input.style.width = '80px';
      input.style.fontSize = '12px';
      input.style.background = '#0f1115';
      input.style.color = '#fff';
      input.style.border = '1px solid #7aa2f7';
      input.style.borderRadius = '3px';
      input.style.padding = '1px 4px';
      input.style.outline = 'none';

      titleEl.replaceWith(input);
      input.focus();
      input.select();

      const finishRename = () => {
        const val = input.value.trim() || current;
        titleEl.textContent = val;
        tabObj.name = val;
        saveTabs();
        if (input.parentNode) {
          input.replaceWith(titleEl);
        }
      };

      input.addEventListener('blur', finishRename);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          finishRename();
        } else if (ev.key === 'Escape') {
          titleEl.textContent = current;
          if (input.parentNode) input.replaceWith(titleEl);
        }
      });
    });

    saveTabs();

    if (activate) {
      switchTab(id);
    }
  }

  // Connect WebSocket to backend for this tab
  function connectWs(tabObj) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws?id=${encodeURIComponent(tabObj.id)}`;
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
        // Tab shell exited, auto close tab if multiple tabs exist
        if (tabs.length > 1) {
          closeTab(tabObj.id, false);
        } else {
          tabObj.term.write('\r\n\x1b[33m[Session disconnected. Klik [+] untuk tab baru atau refresh]\x1b[0m\r\n');
        }
      }
    };

    ws.onerror = (err) => {
      console.warn(`WebSocket error on tab ${tabObj.id}:`, err);
    };
  }

  function sendResize(tabObj) {
    if (tabObj && tabObj.ws && tabObj.ws.readyState === WebSocket.OPEN) {
      const { cols, rows } = tabObj.term;
      tabObj.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }

  // Switch active tab
  function switchTab(id) {
    const tabObj = tabs.find(t => t.id === id);
    if (!tabObj) return;

    activeTabId = id;
    tabs.forEach(t => {
      const isActive = t.id === id;
      t.tabEl.classList.toggle('active', isActive);
      t.panelEl.classList.toggle('active', isActive);
    });

    // Refit terminal after becoming visible
    setTimeout(() => {
      tabObj.fitAddon.fit();
      sendResize(tabObj);
      tabObj.term.focus();
    }, 10);

    saveTabs();
  }

  // Close tab
  function closeTab(id, notifyBackend = true) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    const tabObj = tabs[idx];
    tabObj.closing = true;

    if (tabObj.ws) {
      tabObj.ws.close();
    }
    tabObj.term.dispose();
    tabObj.tabEl.remove();
    tabObj.panelEl.remove();

    if (notifyBackend) {
      fetch(`/api/close?id=${encodeURIComponent(id)}`, { method: 'POST' }).catch(() => {});
    }

    tabs.splice(idx, 1);

    if (tabs.length === 0) {
      // Create new clean tab
      createTab('main', 'shell', true);
    } else {
      if (activeTabId === id) {
        const nextIdx = Math.max(0, idx - 1);
        switchTab(tabs[nextIdx].id);
      } else {
        saveTabs();
      }
    }
  }

  // Add tab handler
  btnNewTab.addEventListener('click', () => {
    const newId = 'tab-' + Math.random().toString(36).substring(2, 8);
    const count = tabs.length + 1;
    createTab(newId, `Tab #${count}`, true);
  });

  // Window resize handler
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const active = tabs.find(t => t.id === activeTabId);
      if (active) {
        active.fitAddon.fit();
        sendResize(active);
      }
    }, 50);
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Alt + T : New tab
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
    // Alt + Left / Alt + Right : Next / Prev tab
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const currentIdx = tabs.findIndex(t => t.id === activeTabId);
      if (currentIdx !== -1) {
        const delta = e.key === 'ArrowLeft' ? -1 : 1;
        const nextIdx = (currentIdx + delta + tabs.length) % tabs.length;
        switchTab(tabs[nextIdx].id);
      }
    }
  });

  // PWA Install prompt handling
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = 'inline-flex';
    }
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

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    });
  }

  // App Initialization
  async function init() {
    await ensureFontLoaded();

    let initialTabs = loadSavedTabs();

    // If no saved tabs in localStorage, check server active sessions
    if (!initialTabs || initialTabs.length === 0) {
      try {
        const res = await fetch('/api/tabs');
        if (res.ok) {
          const serverTabs = await res.json();
          if (Array.isArray(serverTabs) && serverTabs.length > 0) {
            initialTabs = serverTabs.map(st => ({ id: st.id, name: st.name || st.id }));
          }
        }
      } catch (e) {}
    }

    if (!initialTabs || initialTabs.length === 0) {
      initialTabs = [{ id: 'main', name: 'shell' }];
    }

    const lastActive = localStorage.getItem('phantom_active_tab');

    initialTabs.forEach((t, i) => {
      const activate = lastActive ? t.id === lastActive : i === 0;
      createTab(t.id, t.name, activate);
    });

    if (!activeTabId && tabs.length > 0) {
      switchTab(tabs[0].id);
    }
  }

  init();
})();
