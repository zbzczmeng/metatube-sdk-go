package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/metatube-community/metatube-sdk-go/cmd"
	"github.com/metatube-community/metatube-sdk-go/engine"
)

// App struct
type App struct {
	ctx          context.Context
	serverMu     sync.Mutex
	server       *http.Server
	serverPort   int
	isServerOpen bool
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Automatically launch embedded MetaTube SDK HTTP service
	go a.StartServer(8080)
}

// shutdown is called at termination
func (a *App) shutdown(ctx context.Context) {
	a.StopServer()
}

// GetVersion returns application version
func (a *App) GetVersion() string {
	return "1.0.0"
}

// StartServer starts embedded MetaTube Gin HTTP server
func (a *App) StartServer(port int) (bool, error) {
	a.serverMu.Lock()
	defer a.serverMu.Unlock()

	if a.isServerOpen {
		return true, nil
	}
	if port <= 0 {
		port = 8080
	}

	addr := fmt.Sprintf("127.0.0.1:%d", port)
	router := cmd.Router(engine.DefaultEngineName)
	server := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return false, fmt.Errorf("failed to listen on %s: %w", addr, err)
	}

	a.server = server
	a.serverPort = port
	a.isServerOpen = true

	go func() {
		if err := server.Serve(ln); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Embedded server error: %v\n", err)
		}
	}()

	return true, nil
}

// StopServer stops embedded MetaTube Gin HTTP server
func (a *App) StopServer() bool {
	a.serverMu.Lock()
	defer a.serverMu.Unlock()

	if !a.isServerOpen || a.server == nil {
		return true
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_ = a.server.Shutdown(ctx)
	a.server = nil
	a.isServerOpen = false
	return true
}

// IsServerRunning checks if embedded server is active
func (a *App) IsServerRunning() bool {
	a.serverMu.Lock()
	defer a.serverMu.Unlock()
	return a.isServerOpen
}

// SetClipboard copies text to OS clipboard
func (a *App) SetClipboard(text string) error {
	if a.ctx == nil {
		return nil
	}
	runtime.ClipboardSetText(a.ctx, text)
	return nil
}

// GetClipboard reads text from OS clipboard
func (a *App) GetClipboard() (string, error) {
	if a.ctx == nil {
		return "", nil
	}
	return runtime.ClipboardGetText(a.ctx)
}

// SaveNFOFileDialog opens native save dialog and writes NFO file
func (a *App) SaveNFOFileDialog(defaultFilename, content string) (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("context not initialized")
	}
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultFilename,
		Title:           "保存 NFO 文件",
		Filters: []runtime.FileFilter{
			{DisplayName: "NFO 元数据文件 (*.nfo)", Pattern: "*.nfo"},
			{DisplayName: "XML 文件 (*.xml)", Pattern: "*.xml"},
			{DisplayName: "所有文件 (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return "", err
	}
	if filePath == "" {
		return "", nil // canceled
	}

	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return "", err
	}
	return filePath, nil
}

// MinimizeWindow minimizes application window
func (a *App) MinimizeWindow() {
	if a.ctx != nil {
		runtime.WindowMinimise(a.ctx)
	}
}

// ToggleMaximizeWindow toggles between maximized and normal window states
func (a *App) ToggleMaximizeWindow() bool {
	if a.ctx != nil {
		runtime.WindowToggleMaximise(a.ctx)
		return runtime.WindowIsMaximised(a.ctx)
	}
	return false
}

// IsWindowMaximized returns whether window is currently maximized
func (a *App) IsWindowMaximized() bool {
	if a.ctx != nil {
		return runtime.WindowIsMaximised(a.ctx)
	}
	return false
}

// CloseWindow quits application
func (a *App) CloseWindow() {
	if a.ctx != nil {
		runtime.Quit(a.ctx)
	}
}
