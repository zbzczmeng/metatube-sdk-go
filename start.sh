#!/usr/bin/env bash

# ==========================================
# MetaTube Server 启动脚本 (Linux)
# ==========================================

# 1. 基础运行配置
PORT="8080"
BIND="0.0.0.0"
TOKEN=""                     # API 认证 Token，留空则无需认证
DSN="./metatube.db"          # 数据库持久化路径，支持 SQLite 文件路径或 PostgreSQL 连接串
REQUEST_TIMEOUT="1m"         # 抓取单次请求超时
GIN_MODE="release"           # release 或 debug

# 2. 代理网络配置
# 若代理（Clash/v2ray/sing-box）在当前 Linux 本机运行，直接写 127.0.0.1:端口
# 若在局域网内其他主机运行，填写局域网 IP，如 192.168.1.100:7890
ENABLE_PROXY=true
PROXY_URL="http://127.0.0.1:7890"

# ==========================================
# 环境变量注入
# ==========================================
export PORT="$PORT"
export BIND="$BIND"
export TOKEN="$TOKEN"
export DSN="$DSN"
export REQUEST_TIMEOUT="$REQUEST_TIMEOUT"
export GIN_MODE="$GIN_MODE"

if [ "$ENABLE_PROXY" = true ] && [ -n "$PROXY_URL" ]; then
    echo "[Info] 启用网络代理: $PROXY_URL"
    export HTTP_PROXY="$PROXY_URL"
    export HTTPS_PROXY="$PROXY_URL"
    export ALL_PROXY="$PROXY_URL"
    export NO_PROXY="localhost,127.0.0.1"
else
    echo "[Info] 未配置网络代理，直连访问"
fi

# 获取脚本所在目录
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

# 寻找二进制文件
BIN="./build/metatube-server-linux-amd64"
if [ ! -f "$BIN" ]; then
    BIN="./metatube-server-linux-amd64"
fi
if [ ! -f "$BIN" ]; then
    BIN="./metatube-server"
fi

if [ ! -f "$BIN" ]; then
    echo "[Error] 未找到可执行文件，请检查 build/ 目录或当前目录！"
    exit 1
fi

chmod +x "$BIN"

# 检查是否已在运行
PID_FILE="server.pid"
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "[Warn] 服务已在运行中 (PID: $OLD_PID)。若需重启，请先运行 ./stop.sh"
        exit 1
    else
        rm -f "$PID_FILE"
    fi
fi

# 启动模式判断（默认后台运行，加 -f 参数为前台运行）
if [ "$1" = "-f" ] || [ "$1" = "--foreground" ]; then
    echo "[Info] 前台启动 MetaTube Server..."
    exec "$BIN"
else
    echo "[Info] 后台启动 MetaTube Server..."
    nohup "$BIN" > server.log 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    echo "[Success] 服务启动成功！"
    echo "  - PID: $PID"
    echo "  - 端口: $PORT"
    echo "  - 日志文件: $DIR/server.log"
    echo "  - 查看实时日志: tail -f server.log"
    echo "  - 停止服务: ./stop.sh"
fi
