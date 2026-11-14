package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
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
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true // Native client / local curl
		}
		u, err := url.Parse(origin)
		if err != nil {
			return false
		}
		// Strict origin matching against Host header to prevent Cross-Site WebSocket Hijacking (CSWSH)
		return strings.EqualFold(u.Host, r.Host)
	},
}

type WindowSizeMsg struct {
	Type string `json:"type"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

type HostItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"` // "local" or "ssh"
	Host     string `json:"host"`
	User     string `json:"user"`
	Port     int    `json:"port"`
	Auth     string `json:"auth"` // "local", "key", "password"
	KeyPath  string `json:"key_path,omitempty"`
	Password string `json:"password,omitempty"`
	Color    string `json:"color"`
	Desc     string `json:"desc"`
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

type RingBuffer struct {
	mu   sync.Mutex
	buf  []byte
	size int
	max  int
}

func NewRingBuffer(max int) *RingBuffer {
	return &RingBuffer{
		buf: make([]byte, 0, max),
		max: max,
	}
}

func (rb *RingBuffer) Write(p []byte) (n int, err error) {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	n = len(p)
	if n >= rb.max {
		rb.buf = append(rb.buf[:0], p[n-rb.max:]...)
		return n, nil
	}
	overflow := len(rb.buf) + n - rb.max
	if overflow > 0 {
		rb.buf = append(rb.buf[overflow:], p...)
	} else {
		rb.buf = append(rb.buf, p...)
	}
	return n, nil
}

func (rb *RingBuffer) Bytes() []byte {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	out := make([]byte, len(rb.buf))
	copy(out, rb.buf)
	return out
}

type ManagedSession struct {
	mu        sync.Mutex
	tabID     string
	cmd       *exec.Cmd
	ptmx      *os.File
	buffer    *RingBuffer
	ws        *websocket.Conn
	closed    bool
	lastCols  uint16
	lastRows  uint16
	updatedAt time.Time
}

func (s *ManagedSession) setWS(conn *websocket.Conn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.ws != nil && s.ws != conn {
		_ = s.ws.Close()
	}
	s.ws = conn
	s.updatedAt = time.Now()
}

func (s *ManagedSession) sendToWS(data []byte) {
	s.mu.Lock()
	conn := s.ws
	s.mu.Unlock()
	if conn != nil {
		_ = conn.WriteMessage(websocket.BinaryMessage, data)
	}
}

func (s *ManagedSession) sendJSON(v interface{}) {
	s.mu.Lock()
	conn := s.ws
	s.mu.Unlock()
	if conn != nil {
		_ = conn.WriteJSON(v)
	}
}

var (
	managedSessions sync.Map // map[string]*ManagedSession
	activeSessions  sync.Map // legacy placeholder
	tempSessions    sync.Map // map[string]HostItem
	hostsMu         sync.Mutex
	dataDirGlobal   string
	authPassword    string
	authSessions    sync.Map // map[string]time.Time (token -> expiration)
)

func generateAuthToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func isAuthValid(r *http.Request) bool {
	if authPassword == "" {
		return true
	}

	// 1. Check Cookie
	if cookie, err := r.Cookie("nodedeck_session"); err == nil && cookie.Value != "" {
		if expVal, ok := authSessions.Load(cookie.Value); ok {
			if exp, ok := expVal.(time.Time); ok && time.Now().Before(exp) {
				return true
			}
			authSessions.Delete(cookie.Value)
		}
	}

	// 2. Check Authorization Header (Bearer <token>)
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if expVal, ok := authSessions.Load(token); ok {
			if exp, ok := expVal.(time.Time); ok && time.Now().Before(exp) {
				return true
			}
			authSessions.Delete(token)
		}
	}

	// 3. Check Query parameter ?token=<token>
	tokenQuery := r.URL.Query().Get("token")
	if tokenQuery != "" {
		if expVal, ok := authSessions.Load(tokenQuery); ok {
			if exp, ok := expVal.(time.Time); ok && time.Now().Before(exp) {
				return true
			}
			authSessions.Delete(tokenQuery)
		}
	}

	return false
}

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
		if err := json.Unmarshal(data, &hosts); err == nil {
			return hosts
		}
	}

	return []HostItem{}
}

func saveHostsInternal(hosts []HostItem) error {
	_ = os.MkdirAll(dataDirGlobal, 0755)
	dataFile := filepath.Join(dataDirGlobal, "hosts.json")
	data, err := json.MarshalIndent(hosts, "", "  ")
	if err != nil {
		log.Printf("ERROR marshaling hosts: %v", err)
		return err
	}
	if err := os.WriteFile(dataFile, data, 0644); err != nil {
		log.Printf("ERROR saving hosts to %s: %v", dataFile, err)
		return err
	}
	return nil
}

func saveHosts(hosts []HostItem) error {
	hostsMu.Lock()
	defer hostsMu.Unlock()
	return saveHostsInternal(hosts)
}

func isBlockedFsPath(path string) bool {
	clean := filepath.Clean(path)
	base := filepath.Base(clean)
	// Block sensitive credentials, keys, shadow, env files, and docker socket
	if strings.HasPrefix(base, "id_") || strings.HasSuffix(base, ".pem") || strings.HasSuffix(base, ".key") {
		return true
	}
	if base == ".env" || strings.HasPrefix(base, ".env.") {
		return true
	}
	if base == "shadow" || base == "sudoers" || base == "docker.sock" || base == "authorized_keys" {
		return true
	}
	if clean == "/" || clean == "/etc" || clean == "/proc" || clean == "/sys" || clean == "/root" {
		return true
	}
	return false
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

	authPassword = getEnv("AUTH_PASSWORD", getEnv("PASSWORD", getEnv("NODEDECK_PASSWORD", "")))

	// Auth Endpoints
	http.HandleFunc("/api/auth/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"auth_required": authPassword != "",
			"authenticated": isAuthValid(r),
		})
	})

	http.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		if authPassword == "" {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
			return
		}
		var payload struct {
			Password string `json:"password"`
			Remember bool   `json:"remember"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, `{"error":"Invalid request"}`, http.StatusBadRequest)
			return
		}
		if payload.Password != authPassword {
			http.Error(w, `{"error":"Invalid password"}`, http.StatusUnauthorized)
			return
		}

		token := generateAuthToken()
		duration := 24 * time.Hour
		maxAge := 0 // session cookie
		if payload.Remember {
			duration = 30 * 24 * time.Hour
			maxAge = 30 * 86400
		}
		authSessions.Store(token, time.Now().Add(duration))

		http.SetCookie(w, &http.Cookie{
			Name:     "nodedeck_session",
			Value:    token,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   maxAge,
		})

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"token":   token,
		})
	})

	http.HandleFunc("/api/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if cookie, err := r.Cookie("nodedeck_session"); err == nil && cookie.Value != "" {
			authSessions.Delete(cookie.Value)
		}
		http.SetCookie(w, &http.Cookie{
			Name:     "nodedeck_session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
		})
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
	})

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
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
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
			if err := saveHosts(hosts); err != nil {
				http.Error(w, "Failed to save host: "+err.Error(), http.StatusInternalServerError)
				return
			}
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

	// 2b. Ad-hoc / Quick-Connect Session Endpoint
	http.HandleFunc("/api/session/create", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var item HostItem
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if item.ID == "" {
			item.ID = fmt.Sprintf("quick-%d", time.Now().UnixNano()%1000000)
		}
		tempSessions.Store(item.ID, item)
		_ = json.NewEncoder(w).Encode(map[string]string{"session_id": item.ID})
	})

	// 3. File Explorer & Transfer REST API (/api/fs)
	http.HandleFunc("/api/fs/list", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		reqPath := r.URL.Query().Get("path")
		if reqPath == "" {
			http.Error(w, "path required", http.StatusBadRequest)
			return
		}
		reqPath = filepath.Clean(reqPath)
		if isBlockedFsPath(reqPath) {
			http.Error(w, "access denied", http.StatusForbidden)
			return
		}

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

	http.HandleFunc("/api/fs/read", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		reqPath := filepath.Clean(r.URL.Query().Get("path"))
		if reqPath == "" || isBlockedFsPath(reqPath) {
			http.Error(w, "access denied", http.StatusForbidden)
			return
		}
		info, err := os.Stat(reqPath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if info.IsDir() {
			http.Error(w, "path is a directory", http.StatusBadRequest)
			return
		}
		const maxEditSize = 2 * 1024 * 1024 // 2MB
		if info.Size() > maxEditSize {
			http.Error(w, "file is too large to edit in browser (max 2MB)", http.StatusRequestEntityTooLarge)
			return
		}

		data, err := os.ReadFile(reqPath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Basic binary check
		isBinary := false
		checkLen := len(data)
		if checkLen > 512 {
			checkLen = 512
		}
		for i := 0; i < checkLen; i++ {
			if data[i] == 0 {
				isBinary = true
				break
			}
		}

		resp := map[string]interface{}{
			"path":      reqPath,
			"name":      filepath.Base(reqPath),
			"size":      info.Size(),
			"is_binary": isBinary,
			"content":   string(data),
		}
		if isBinary {
			resp["content"] = ""
		}
		_ = json.NewEncoder(w).Encode(resp)
	})

	http.HandleFunc("/api/fs/save", func(w http.ResponseWriter, r *http.Request) {
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			Path    string `json:"path"`
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		targetPath := filepath.Clean(payload.Path)
		if targetPath == "" || isBlockedFsPath(targetPath) {
			http.Error(w, "access denied", http.StatusForbidden)
			return
		}
		info, err := os.Stat(targetPath)
		if err == nil && info.IsDir() {
			http.Error(w, "target is a directory", http.StatusBadRequest)
			return
		}
		perm := os.FileMode(0644)
		if err == nil {
			perm = info.Mode().Perm()
		}
		if err := os.WriteFile(targetPath, []byte(payload.Content), perm); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"saved"}`))
	})

	http.HandleFunc("/api/fs/download", func(w http.ResponseWriter, r *http.Request) {
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		targetFile := filepath.Clean(r.URL.Query().Get("path"))
		if targetFile == "" || isBlockedFsPath(targetFile) {
			http.Error(w, "access denied", http.StatusForbidden)
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
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		targetDir := filepath.Clean(r.URL.Query().Get("path"))
		if targetDir == "" || isBlockedFsPath(targetDir) {
			http.Error(w, "access denied", http.StatusForbidden)
			return
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
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		targetPath := r.URL.Query().Get("path")
		if targetPath == "" && r.Body != nil {
			var bodyData struct {
				Path string `json:"path"`
			}
			_ = json.NewDecoder(r.Body).Decode(&bodyData)
			targetPath = bodyData.Path
		}
		targetPath = filepath.Clean(targetPath)
		if targetPath == "" || targetPath == "." {
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
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		targetPath := filepath.Clean(r.URL.Query().Get("path"))
		if targetPath == "" || targetPath == "/" || isBlockedFsPath(targetPath) {
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
		if !isAuthValid(r) {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		tabID := sanitizeID(r.URL.Query().Get("id"))
		if val, ok := managedSessions.Load(tabID); ok {
			sess := val.(*ManagedSession)
			sess.mu.Lock()
			sess.closed = true
			if sess.ws != nil {
				_ = sess.ws.Close()
				sess.ws = nil
			}
			if sess.ptmx != nil {
				_ = sess.ptmx.Close()
			}
			if sess.cmd != nil && sess.cmd.Process != nil {
				_ = sess.cmd.Process.Kill()
			}
			sess.mu.Unlock()
			managedSessions.Delete(tabID)
		}
		activeSessions.Delete(tabID)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// 5. WebSocket Terminal Dispatcher with Session Persistence & Heartbeat (/ws?id=...&host=...&session=...)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		if !isAuthValid(r) {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		tabID := sanitizeID(r.URL.Query().Get("id"))
		sessionID := r.URL.Query().Get("session")
		hostID := r.URL.Query().Get("host")

		// Lookup host profile: first check tempSessions (Quick Connect), then saved hosts
		var targetHost HostItem
		if sessionID != "" {
			if val, ok := tempSessions.Load(sessionID); ok {
				targetHost = val.(HostItem)
			}
		}

		if targetHost.ID == "" && hostID != "" {
			hosts := loadHosts()
			for _, h := range hosts {
				if h.ID == hostID {
					targetHost = h
					break
				}
			}
		}

		// Reject if no valid session or host is found
		if targetHost.ID == "" {
			http.Error(w, "Target host or session not found", http.StatusBadRequest)
			return
		}

		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}

		// Find or create managed session for persistence
		var sess *ManagedSession
		if val, ok := managedSessions.Load(tabID); ok {
			existing := val.(*ManagedSession)
			existing.mu.Lock()
			if !existing.closed {
				sess = existing
			}
			existing.mu.Unlock()
		}

		if sess == nil {
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
					"-o", "LogLevel=ERROR",
					"-p", strconv.Itoa(portNum),
				}

				if targetHost.Auth == "key" {
					if targetHost.KeyPath != "" {
						sshArgs = append(sshArgs, "-i", targetHost.KeyPath)
					} else if _, err := os.Stat("/home/hermes/.ssh/id_ed25519"); err == nil {
						sshArgs = append(sshArgs, "-i", "/home/hermes/.ssh/id_ed25519")
					}
					sshArgs = append(sshArgs, fmt.Sprintf("%s@%s", sshUser, sshHost))
					cmd = exec.Command("ssh", sshArgs...)
				} else if targetHost.Auth == "password" {
					if targetHost.Password != "" {
						// Automated password via sshpass
						fullArgs := append([]string{"-e", "ssh"}, append(sshArgs, fmt.Sprintf("%s@%s", sshUser, sshHost))...)
						cmd = exec.Command("sshpass", fullArgs...)
					} else {
						// Interactive password prompt in PTY
						sshArgs = append(sshArgs,
							"-o", "PreferredAuthentications=password,keyboard-interactive",
							"-o", "PubkeyAuthentication=no",
							fmt.Sprintf("%s@%s", sshUser, sshHost),
						)
						cmd = exec.Command("ssh", sshArgs...)
					}
				} else {
					if targetHost.KeyPath != "" {
						sshArgs = append(sshArgs, "-i", targetHost.KeyPath)
					}
					sshArgs = append(sshArgs, fmt.Sprintf("%s@%s", sshUser, sshHost))
					cmd = exec.Command("ssh", sshArgs...)
				}

				cmd.Dir = homeDir
				if os.Getuid() == 0 && puid > 0 {
					cmd.SysProcAttr = &syscall.SysProcAttr{}
					cmd.SysProcAttr.Credential = &syscall.Credential{
						Uid: uint32(puid),
						Gid: uint32(pgid),
					}
				}
			}

			env := append(os.Environ(),
				"TERM=xterm-256color",
				"COLORTERM=truecolor",
				"HOME="+homeDir,
				"USER="+targetHost.User,
				"SHELL=/bin/bash",
			)
			if targetHost.Auth == "password" && targetHost.Password != "" {
				env = append(env, "SSHPASS="+targetHost.Password)
			}
			cmd.Env = env

			ptmx, err := pty.Start(cmd)
			if err != nil {
				log.Printf("Failed to spawn PTY for %s: %v", targetHost.Name, err)
				_ = ws.Close()
				return
			}

			// Circular buffer to hold up to 2MB (~10,000 lines) of scrollback history
			sess = &ManagedSession{
				tabID:     tabID,
				cmd:       cmd,
				ptmx:      ptmx,
				buffer:    NewRingBuffer(2 * 1024 * 1024),
				ws:        ws,
				updatedAt: time.Now(),
			}
			managedSessions.Store(tabID, sess)

			// Reader pump: PTY -> Buffer -> WebSocket (Runs detached in background)
			go func(s *ManagedSession) {
				buf := make([]byte, 4096)
				for {
					n, err := s.ptmx.Read(buf)
					if err != nil {
						// PTY died (e.g. exit called)
						s.mu.Lock()
						s.closed = true
						if s.ws != nil {
							_ = s.ws.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[33m[Process exited]\x1b[0m\r\n"))
							_ = s.ws.Close()
						}
						s.mu.Unlock()
						managedSessions.Delete(s.tabID)
						return
					}
					chunk := buf[:n]
					_, _ = s.buffer.Write(chunk)
					s.sendToWS(chunk)
				}
			}(sess)
		} else {
			// Re-attaching to existing background session:
			// Send replay history buffer to restore terminal state
			history := sess.buffer.Bytes()
			if len(history) > 0 {
				_ = ws.WriteMessage(websocket.BinaryMessage, history)
			}
			sess.setWS(ws)
		}

		defer func() {
			sess.mu.Lock()
			if sess.ws == ws {
				sess.ws = nil
			}
			sess.mu.Unlock()
			_ = ws.Close()
		}()

		// WebSocket -> PTY (Reader from client)
		for {
			msgType, data, err := ws.ReadMessage()
			if err != nil {
				break
			}

			// Handle JSON commands (resize & heartbeat ping)
			if msgType == websocket.TextMessage && len(data) > 0 && data[0] == '{' {
				var cmdMsg struct {
					Type string `json:"type"`
					Cols uint16 `json:"cols"`
					Rows uint16 `json:"rows"`
				}
				if err := json.Unmarshal(data, &cmdMsg); err == nil {
					if cmdMsg.Type == "ping" {
						_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))
						continue
					}
					if cmdMsg.Type == "resize" && cmdMsg.Cols > 0 && cmdMsg.Rows > 0 {
						sess.mu.Lock()
						sess.lastCols = cmdMsg.Cols
						sess.lastRows = cmdMsg.Rows
						_ = pty.Setsize(sess.ptmx, &pty.Winsize{
							Cols: cmdMsg.Cols,
							Rows: cmdMsg.Rows,
						})
						sess.mu.Unlock()
						continue
					}
				}
			}

			if _, err := sess.ptmx.Write(data); err != nil {
				break
			}
		}
	})

	log.Printf("NodeDeck Terminal listening on :%s (static: %s, data: %s)", *port, *staticDir, *dataDir)
	if err := http.ListenAndServe(":"+*port, nil); err != nil {
		log.Fatalf("Server exited: %v", err)
	}
}
