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

	// 2. API: List active phantom sessions
	http.HandleFunc("/api/tabs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		cmd := exec.Command("tmux", "list-sessions", "-F", "#{session_name}")
		out, err := cmd.Output()
		tabs := []TabInfo{}
		if err == nil {
			lines := strings.Split(strings.TrimSpace(string(out)), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "phantom_") {
					id := strings.TrimPrefix(line, "phantom_")
					tabs = append(tabs, TabInfo{
						ID:   id,
						Name: id,
					})
				}
			}
		}
		_ = json.NewEncoder(w).Encode(tabs)
	})

	// 3. API: Close a phantom session
	http.HandleFunc("/api/close", func(w http.ResponseWriter, r *http.Request) {
		tabID := sanitizeID(r.URL.Query().Get("id"))
		sessionName := fmt.Sprintf("phantom_%s", tabID)
		_ = exec.Command("tmux", "kill-session", "-t", sessionName).Run()
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// 4. WebSocket terminal handler
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		tabID := sanitizeID(r.URL.Query().Get("id"))
		sessionName := fmt.Sprintf("phantom_%s", tabID)

		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}
		defer ws.Close()

		// Ensure tmux session exists headless with status bar disabled upfront
		hasSession := exec.Command("tmux", "has-session", "-t", sessionName).Run() == nil
		if !hasSession {
			createCmd := exec.Command("tmux", "new-session", "-d", "-s", sessionName, "bash", "-l")
			createCmd.Env = append(os.Environ(),
				"TERM=xterm-256color",
				"COLORTERM=truecolor",
				"HOME="+homeDir,
				"USER="+targetUser,
				"LOGNAME="+targetUser,
				"SHELL=/bin/bash",
			)
			createCmd.Dir = homeDir
			if os.Getuid() == 0 && puid > 0 {
				createCmd.SysProcAttr = &syscall.SysProcAttr{}
				createCmd.SysProcAttr.Credential = &syscall.Credential{
					Uid: uint32(puid),
					Gid: uint32(pgid),
				}
			}
			_ = createCmd.Run()
			_ = exec.Command("tmux", "set-option", "-t", sessionName, "status", "off").Run()
			_ = exec.Command("tmux", "set-option", "-t", sessionName, "mouse", "on").Run()
			_ = exec.Command("tmux", "set-option", "-t", sessionName, "default-terminal", "xterm-256color").Run()
		}

		// Attach to the headless session via PTY
		cmd := exec.Command("tmux", "-u", "attach-session", "-t", sessionName)
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
			log.Printf("Failed to spawn PTY: %v", err)
			return
		}

		var once sync.Once
		closeBoth := func() {
			once.Do(func() {
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
			buf := make([]byte, 8192)
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

			// Forward data to terminal PTY
			if _, err := ptmx.Write(data); err != nil {
				break
			}
		}
	})

	log.Printf("Phantom Go Terminal listening on :%s (static: %s)", *port, *staticDir)
	if err := http.ListenAndServe(":"+*port, nil); err != nil {
		log.Fatalf("Server exited: %v", err)
	}
}
