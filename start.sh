#!/bin/sh
cd "$(dirname "$0")"
PORT="${1:-9060}"
echo "SeaScribe -> http://localhost:$PORT"
echo "  Admin: http://localhost:$PORT/admin/"
exec python main/server.py "$PORT"
