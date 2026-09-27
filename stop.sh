#!/usr/bin/env bash

# ==========================================
# MetaTube Server 停止脚本 (Linux)
# ==========================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

PID_FILE="server.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "[Warn] PID 文件 $PID_FILE 不存在，正在根据进程名称排查..."
    PIDS=$(pgrep -f "metatube-server" || true)
    if [ -n "$PIDS" ]; then
        echo "[Info] 正在终止进程: $PIDS"
        kill $PIDS
        sleep 1
        echo "[Success] 已发送停止信号。"
    else
        echo "[Info] 没有运行中的 MetaTube 进程。"
    fi
    exit 0
fi

PID=$(cat "$PID_FILE")
if ps -p "$PID" > /dev/null 2>&1; then
    echo "[Info] 正在停止 MetaTube Server (PID: $PID)..."
    kill "$PID"
    for i in {1..10}; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            break
        fi
        sleep 0.5
    done
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "[Warn] 进程未退出，强制终止..."
        kill -9 "$PID"
    fi
    rm -f "$PID_FILE"
    echo "[Success] MetaTube Server 已停止。"
else
    echo "[Warn] 进程 (PID: $PID) 不存在。"
    rm -f "$PID_FILE"
fi
