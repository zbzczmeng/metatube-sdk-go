# MetaTube Desktop (Wails + Vue 3)

基于 [Wails v2](https://wails.io/) 与 Vue 3 + Tailwind CSS 构建的 MetaTube 影片元数据刮削与检视桌面工作台。

## 特性亮点

1. **高保真还原 prototype.html**
   - 现代化暗黑玻璃质感界面（Tailwind CSS 自定义配色与毛玻璃面板）
   - 网格海报视图 (Grid View) 与 表格列表视图 (Table View) 无缝切换
   - 完整的骨架屏加载动画与状态反馈

2. **内置高保真演示模式 (Mock Mode)**
   - 首次启动开箱即用，无需配置后端或数据库即可完整体验搜索、详情、画廊、短评、女优联动等所有交互功能

3. **直连与内嵌 SDK 服务 (Live Mode)**
   - 支持一键启动内嵌本地 Go SDK HTTP 服务 (`http://127.0.0.1:8080`)
   - 支持自定义 SDK 端点与 API Token 连接远程或自建服务端
   - 支持并发多源检索与单源精确检索（FANZA、JavBus、MGStage、FC2、Dahlia、Caribbean 等）

4. **高级刮削与检视能力**
   - Fallback 智能降级策略开关
   - Lazy Cache 缓存与在线强制刷新控制
   - 一键调用 SDK 翻译片名与简介 (/v1/translate)
   - SDK 图像处理工坊：2:3/16:9 裁剪比例调节、AI 人脸自动居中、动态角标 (SUB/4K/HD/LEAK/无码) 实时预览
   - 剧照大图画廊与全屏灯箱浏览
   - 女优/演员资料卡联动查看与一键关联检索
   - Kodi / Jellyfin / Emby 兼容的标准 NFO 导出与原生系统文件保存对话框

## 目录结构

```
desktop/
├── app.go                 # Wails 宿主应用 Go 逻辑 (内嵌服务管理、剪贴板、文件对话框)
├── main.go                # Wails 应用程序入口与窗口配置
├── go.mod                 # Go 模块定义与 SDK 引用
├── wails.json             # Wails 项目配置文件
├── build/                 # 应用程序图标与 Windows 清单配置
└── frontend/              # 前端资源
    ├── dist/              # 预编译静态离线资源 (已内置 Vue 3 与 Tailwind 样式)
    │   ├── index.html     # 主应用界面
    │   ├── style.css      # 预构建 Tailwind 样式
    │   └── vue.global.prod.js # 离线 Vue 3 运行时
    ├── src/
    │   └── style.css      # 样式源码
    ├── tailwind.config.js # Tailwind 样式定义
    └── package.json       # 前端构建配置
```

## 开发与构建指南

### 前置要求
- Go 1.20+
- Wails CLI v2 (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
- Node.js & pnpm (仅当需要重新构建前端样式时)

### 重新构建前端样式
```bash
cd desktop/frontend
pnpm install
pnpm run build
```

### 启动开发模式 (热重载)
```bash
cd desktop
wails dev
```

### 编译生成 Windows 桌面二进制文件
```bash
cd desktop
wails build
```
编译产物将生成在 `desktop/build/bin/metatube-desktop.exe`。
