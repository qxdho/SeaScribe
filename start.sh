#!/bin/sh
cd "$(dirname "$0")"

PORT="${1:-9360}"

kill $(lsof -ti :$PORT 2>/dev/null) 2>/dev/null

echo "SeaScribe -> http://localhost:$PORT"
echo "  Admin: http://localhost:$PORT/admin/"

python main/server.py $PORT 2>&1
