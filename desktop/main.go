package main

import (
	"embed"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	// Enable WebView2 running in sandboxed / non-standard development directories
	currentArgs := os.Getenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS")
	if currentArgs == "" {
		os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--no-sandbox --disable-gpu-compositing")
	}
}

func main() {
	// Create an instance of the app structure
	app := NewApp()

	userDataDir := filepath.Join(os.Getenv("LOCALAPPDATA"), "MetaTubeDesktop")

	// Create application with options
	err := wails.Run(&options.App{
		Title:             "MetaTube Scraper - 元数据刮削与检视工作台",
		Width:             1280,
		Height:            860,
		MinWidth:          1024,
		MinHeight:         700,
		Frameless:         true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour:  &options.RGBA{R: 11, G: 15, B: 25, A: 255},
		OnStartup:         app.startup,
		OnShutdown:        app.shutdown,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewUserDataPath:               userDataDir,
			DisableFramelessWindowDecorations: false,
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableWindowIcon:                 false,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
