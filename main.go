package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Protected via reverse proxy / Cloudflare Tunnel / local loopback
	},
}

type WindowSizeMsg struct {
	Type string `json:"type"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

type HostItem struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Type    string `json:"type"` // "local" or "ssh"
	Host    string `json:"host"`
	User    string `json:"user"`
	Port    int    `json:"port"`
	Auth    string `json:"auth"` // "local", "key", "password"
	KeyPath string `json:"key_path,omitempty"`
	Color   string `json:"color"`
	Desc    string `json:"desc"`
}

type FileItem struct {
	Name    string `json:"name"`
	IsDir   bool   `json:"is_dir"`
	Size    int64  `json:"size"`
	ModTime string `json:"mod_time"`
	Path    string `json:"path"`
}

type FileListResponse struct {
	Current string     `json:"current"`
	Parent  string     `json:"parent"`
	Items   []FileItem `json:"items"`
}

var (
	activeSessions sync.Map // map[string]*exec.Cmd
	hostsMu        sync.Mutex
	dataDirGlobal  string
)

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func sanitizeID(id string) string {
	var sb strings.Builder
	for _, ch := range id {
		if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_' {
			sb.WriteRune(ch)
		}
	}
	res := sb.String()
	if res == "" {
		return "main"
	}
	return res
}

func loadHosts() []HostItem {
	hostsMu.Lock()
	defer hostsMu.Unlock()

	dataFile := filepath.Join(dataDirGlobal, "hosts.json")
	var hosts []HostItem

	if data, err := os.ReadFile(dataFile); err == nil {
		if err := json.Unmarshal(data, &hosts); err == nil && len(hosts) > 0 {
			return hosts
		}
	}

	// Default preset hosts
	hosts = []HostItem{
		{
			ID:    "node01-hermes",
			Name:  "node01 (hermes)",
			Type:  "local",
			Host:  "localhost",
			User:  "hermes",
			Port:  22,
			Auth:  "local",
			Color: "#7aa2f7",
			Desc:  "Local shell as hermes",
		},
		{
			ID:    "node01-aneep",
			Name:  "node01 (aneep)",
			Type:  "local",
			Host:  "localhost",
			User:  "aneep",
			Port:  22,
			Auth:  "local",
			Color: "#e0af68",
			Desc:  "Local shell as aneep",
		},
		{
			ID:      "node02",
			Name:    "node02",
			Type:    "ssh",
			Host:    "100.92.218.94",
			User:    "aneep",
			Port:    22,
			Auth:    "key",
			KeyPath: "/home/hermes/.ssh/id_ed25519",
			Color:   "#9ece6a",
			Desc:    "Tailscale Node 02 (100.92.218.94)",
		},
	}
	_ = saveHostsInternal(hosts)
	return hosts
}

func saveHostsInternal(hosts []HostItem) error {
	_ = os.MkdirAll(dataDirGlobal, 0755)
	dataFile := filepath.Join(dataDirGlobal, "hosts.json")
	data, err := json.MarshalIndent(hosts, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(dataFile, data, 0644)
}

func saveHosts(hosts []HostItem) error {
	hostsMu.Lock()
	defer hostsMu.Unlock()
	return saveHostsInternal(hosts)
}

func main() {
	port := flag.String("port", getEnv("PORT", "8090"), "HTTP port to listen")
	staticDir := flag.String("static", getEnv("STATIC_DIR", "./static"), "Path to static assets")
	dataDir := flag.String("data", getEnv("DATA_DIR", "./data"), "Path to data directory")
	flag.Parse()

	dataDirGlobal = *dataDir
	_ = os.MkdirAll(dataDirGlobal, 0755)

	targetUser := getEnv("USER_NAME", "hermes")
	puidStr := getEnv("PUID", "1001")
	pgidStr := getEnv("PGID", "1001")
	puid, _ := strconv.Atoi(puidStr)
	pgid, _ := strconv.Atoi(pgidStr)

	homeDir := "/home/" + targetUser
	if _, err := os.Stat(homeDir); err != nil {
		homeDir = getEnv("HOME", "/root")
	}

	// 1. Static Web Assets with No-Cache for dev/hot updates
	fileServer := http.FileServer(http.Dir(*staticDir))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, ".html") || strings.HasSuffix(path, ".css") || strings.HasSuffix(path, ".js") || path == "/" {
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
		}
		fileServer.ServeHTTP(w, r)
	})

	// 2. Hosts Management REST API
	http.HandleFunc("/api/hosts", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodGet:
			hosts := loadHosts()
			_ = json.NewEncoder(w).Encode(hosts)

		case http.MethodPost:
			var item HostItem
			if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			if item.ID == "" {
				item.ID = fmt.Sprintf("host-%d", time.Now().UnixNano()%1000000)
			}
			if item.Color == "" {
				item.Color = "#7aa2f7"
			}
			hosts := loadHosts()
			found := false
			for i, h := range hosts {
				if h.ID == item.ID {
					hosts[i] = item
					found = true
					break
				}
			}
			if !found {
				hosts = append(hosts, item)
			}
			_ = saveHosts(hosts)
			_ = json.NewEncoder(w).Encode(item)

		case http.MethodDelete:
			id := r.URL.Query().Get("id")
			if id == "" {
				http.Error(w, "missing id", http.StatusBadRequest)
				return
			}
			hosts := loadHosts()
			newHosts := []HostItem{}
			for _, h := range hosts {
				if h.ID != id {
					newHosts = append(newHosts, h)
				}
			}
			_ = saveHosts(newHosts)
			_, _ = w.Write([]byte(`{"status":"deleted"}`))

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// 3. File Explorer & Transfer REST API (/api/fs)
	http.HandleFunc("/api/fs/list", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		reqPath := r.URL.Query().Get("path")
		if reqPath == "" {
			reqPath = homeDir
		}
		reqPath = filepath.Clean(reqPath)

		entries, err := os.ReadDir(reqPath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		resp := FileListResponse{
			Current: reqPath,
			Parent:  filepath.Dir(reqPath),
			Items:   []FileItem{},
		}

		for _, entry := range entries {
			info, err := entry.Info()
			if err != nil {
				continue
			}
			resp.Items = append(resp.Items, FileItem{
				Name:    entry.Name(),
				IsDir:   entry.IsDir(),
				Size:    info.Size(),
				ModTime: info.ModTime().Format("2006-01-02 15:04"),
				Path:    filepath.Join(reqPath, entry.Name()),
			})
		}
		_ = json.NewEncoder(w).Encode(resp)
	})

	http.HandleFunc("/api/fs/download", func(w http.ResponseWriter, r *http.Request) {
		targetFile := filepath.Clean(r.URL.Query().Get("path"))
		if targetFile == "" {
			http.Error(w, "path required", http.StatusBadRequest)
			return
		}
		info, err := os.Stat(targetFile)
		if err != nil || info.IsDir() {
			http.Error(w, "invalid file", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filepath.Base(targetFile)))
		http.ServeFile(w, r, targetFile)
	})

	http.HandleFunc("/api/fs/upload", func(w http.ResponseWriter, r *http.Request) {
		targetDir := filepath.Clean(r.URL.Query().Get("path"))
		if targetDir == "" {
			targetDir = homeDir
		}

		mr, err := r.MultipartReader()
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		for {
			part, err := mr.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			filename := part.FileName()
			if filename == "" {
				continue
			}

			dstPath := filepath.Join(targetDir, filepath.Base(filename))
			dst, err := os.OpenFile(dstPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			_, _ = io.Copy(dst, part)
			dst.Close()
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"uploaded"}`))
	})

	http.HandleFunc("/api/fs/mkdir", func(w http.ResponseWriter, r *http.Request) {
		targetPath := filepath.Clean(r.URL.Query().Get("path"))
		if targetPath == "" {
			http.Error(w, "path required", http.StatusBadRequest)
			return
		}
		if err := os.MkdirAll(targetPath, 0755); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"created"}`))
	})

	http.HandleFunc("/api/fs/delete", func(w http.ResponseWriter, r *http.Request) {
		targetPath := filepath.Clean(r.URL.Query().Get("path"))
		if targetPath == "" || targetPath == "/" || targetPath == homeDir {
			http.Error(w, "protected path", http.StatusForbidden)
			return
		}
		if err := os.RemoveAll(targetPath); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"deleted"}`))
	})

	// 4. Session Termination API
	http.HandleFunc("/api/close", func(w http.ResponseWriter, r *http.Request) {
		tabID := sanitizeID(r.URL.Query().Get("id"))
		if val, ok := activeSessions.Load(tabID); ok {
			if cmd, ok := val.(*exec.Cmd); ok && cmd.Process != nil {
				_ = cmd.Process.Kill()
			}
			activeSessions.Delete(tabID)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// 5. WebSocket Terminal Dispatcher (/ws?id=...&host=...)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		tabID := sanitizeID(r.URL.Query().Get("id"))
		hostID := r.URL.Query().Get("host")

		// Lookup host profile
		var targetHost HostItem
		hosts := loadHosts()
		for _, h := range hosts {
			if h.ID == hostID {
				targetHost = h
				break
			}
		}
		if targetHost.ID == "" {
			targetHost = hosts[0] // fallback to first host (local hermes)
		}

		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}
		defer ws.Close()

		var cmd *exec.Cmd

		if targetHost.Type == "local" {
			if targetHost.User == "aneep" {
				cmd = exec.Command("sudo", "-u", "aneep", "-i", "bash", "-l")
				cmd.Dir = "/home/aneep"
			} else {
				cmd = exec.Command("bash", "-l")
				cmd.Dir = homeDir
				if os.Getuid() == 0 && puid > 0 {
					cmd.SysProcAttr = &syscall.SysProcAttr{}
					cmd.SysProcAttr.Credential = &syscall.Credential{
						Uid: uint32(puid),
						Gid: uint32(pgid),
					}
				}
			}
		} else {
			// SSH Connection (Standard SSH or Tailscale SSH)
			portNum := targetHost.Port
			if portNum <= 0 {
				portNum = 22
			}
			sshUser := targetHost.User
			if sshUser == "" {
				sshUser = "aneep"
			}
			sshHost := targetHost.Host
			if sshHost == "" {
				sshHost = "100.92.218.94"
			}

			sshArgs := []string{
				"-o", "StrictHostKeyChecking=no",
				"-o", "UserKnownHostsFile=/dev/null",
				"-p", strconv.Itoa(portNum),
			}

			if targetHost.KeyPath != "" {
				sshArgs = append(sshArgs, "-i", targetHost.KeyPath)
			} else if _, err := os.Stat("/home/hermes/.ssh/id_ed25519"); err == nil {
				sshArgs = append(sshArgs, "-i", "/home/hermes/.ssh/id_ed25519")
			}

			sshArgs = append(sshArgs, fmt.Sprintf("%s@%s", sshUser, sshHost))
			cmd = exec.Command("ssh", sshArgs...)
			cmd.Dir = homeDir
			if os.Getuid() == 0 && puid > 0 {
				cmd.SysProcAttr = &syscall.SysProcAttr{}
				cmd.SysProcAttr.Credential = &syscall.Credential{
					Uid: uint32(puid),
					Gid: uint32(pgid),
				}
			}
		}

		cmd.Env = append(os.Environ(),
			"TERM=xterm-256color",
			"COLORTERM=truecolor",
			"HOME="+homeDir,
			"USER="+targetHost.User,
			"SHELL=/bin/bash",
		)

		ptmx, err := pty.Start(cmd)
		if err != nil {
			log.Printf("Failed to spawn PTY for %s: %v", targetHost.Name, err)
			return
		}

		activeSessions.Store(tabID, cmd)

		var once sync.Once
		closeBoth := func() {
			once.Do(func() {
				activeSessions.Delete(tabID)
				_ = ptmx.Close()
				_ = ws.Close()
				if cmd.Process != nil {
					_ = cmd.Process.Kill()
				}
			})
		}
		defer closeBoth()

		// PTY -> WebSocket
		go func() {
			defer closeBoth()
			buf := make([]byte, 4096)
			for {
				n, err := ptmx.Read(buf)
				if err != nil {
					return
				}
				if err := ws.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					return
				}
			}
		}()

		// WebSocket -> PTY
		for {
			msgType, data, err := ws.ReadMessage()
			if err != nil {
				break
			}

			// Handle JSON resize message: {"type":"resize","cols":80,"rows":24}
			if msgType == websocket.TextMessage && len(data) > 0 && data[0] == '{' {
				var sz WindowSizeMsg
				if err := json.Unmarshal(data, &sz); err == nil && sz.Type == "resize" && sz.Cols > 0 && sz.Rows > 0 {
					_ = pty.Setsize(ptmx, &pty.Winsize{
						Cols: sz.Cols,
						Rows: sz.Rows,
					})
					continue
				}
			}

			if _, err := ptmx.Write(data); err != nil {
				break
			}
		}
	})

	log.Printf("Phantom Termius Terminal listening on :%s (static: %s, data: %s)", *port, *staticDir, *dataDir)
	if err := http.ListenAndServe(":"+*port, nil); err != nil {
		log.Fatalf("Server exited: %v", err)
	}
}
