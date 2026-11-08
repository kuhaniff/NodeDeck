package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"syscall"

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

type TabInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

var (
	activeSessions sync.Map // map[string]*exec.Cmd
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

func main() {
	port := flag.String("port", getEnv("PORT", "8090"), "HTTP port to listen")
	staticDir := flag.String("static", getEnv("STATIC_DIR", "./static"), "Path to static assets")
	flag.Parse()

	targetUser := getEnv("USER_NAME", "hermes")
	puidStr := getEnv("PUID", "1001")
	pgidStr := getEnv("PGID", "1001")
	puid, _ := strconv.Atoi(puidStr)
	pgid, _ := strconv.Atoi(pgidStr)

	homeDir := "/home/" + targetUser
	if _, err := os.Stat(homeDir); err != nil {
		homeDir = getEnv("HOME", "/root")
	}

	// 1. Static files
	fs := http.FileServer(http.Dir(*staticDir))
	http.Handle("/", fs)

	// 2. API: List active sessions
	http.HandleFunc("/api/tabs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		tabs := []TabInfo{}
		activeSessions.Range(func(key, value interface{}) bool {
			id := fmt.Sprintf("%v", key)
			tabs = append(tabs, TabInfo{
				ID:   id,
				Name: id,
			})
			return true
		})
		_ = json.NewEncoder(w).Encode(tabs)
	})

	// 3. API: Close a session
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

	// 4. WebSocket terminal handler: Direct native PTY
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		tabID := sanitizeID(r.URL.Query().Get("id"))

		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}
		defer ws.Close()

		// Launch bash login shell directly for ultra-low latency & full native scrollback
		cmd := exec.Command("bash", "-l")
		cmd.Env = append(os.Environ(),
			"TERM=xterm-256color",
			"COLORTERM=truecolor",
			"HOME="+homeDir,
			"USER="+targetUser,
			"LOGNAME="+targetUser,
			"SHELL=/bin/bash",
		)
		cmd.Dir = homeDir

		if os.Getuid() == 0 && puid > 0 {
			cmd.SysProcAttr = &syscall.SysProcAttr{}
			cmd.SysProcAttr.Credential = &syscall.Credential{
				Uid: uint32(puid),
				Gid: uint32(pgid),
			}
		}

		ptmx, err := pty.Start(cmd)
		if err != nil {
			log.Printf("Failed to spawn direct PTY: %v", err)
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

		// PTY -> WebSocket (Zero-buffering stream)
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

		// WebSocket -> PTY (Immediate input forward)
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

			// Forward data to terminal PTY immediately
			if _, err := ptmx.Write(data); err != nil {
				break
			}
		}
	})

	log.Printf("Phantom Native Terminal listening on :%s (static: %s)", *port, *staticDir)
	if err := http.ListenAndServe(":"+*port, nil); err != nil {
		log.Fatalf("Server exited: %v", err)
	}
}
