#!/usr/bin/env bash
PORT=${PORT:-8000}

echo "[1/3] Freeing dev ports (8000 9000 9100)..."
for p in 8000 9000 9100; do
    PID=$(netstat -ano 2>/dev/null | grep ":${p} " | grep LISTENING | awk '{print $5}' | head -1)
    if [ -n "$PID" ]; then
        echo "  Killing PID $PID on port $p"
        taskkill /PID "$PID" /F 2>/dev/null || kill -9 "$PID" 2>/dev/null
    fi
done
sleep 2

echo "[2/3] Clearing Python bytecode cache..."
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

echo "[3/3] Starting backend on port $PORT..."
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --log-level info
