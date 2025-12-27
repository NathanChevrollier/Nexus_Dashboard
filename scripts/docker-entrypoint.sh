#!/bin/sh
set -e

# Start Next standalone server
echo "Starting Next server..."
node server.js &
NEXT_PID=$!

# Optionally start socket server inside the same container
if [ "$RUN_SOCKET_IN_APP" = "true" ] || [ "$RUN_SOCKET_IN_APP" = "1" ]; then
  echo "RUN_SOCKET_IN_APP is enabled — starting socket server"
  node ./scripts/socket-server.js &
  SOCKET_PID=$!
fi

wait $NEXT_PID
