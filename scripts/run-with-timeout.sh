#!/usr/bin/env bash
# Run a command with a timeout (POSIX)
# Usage: ./scripts/run-with-timeout.sh 10 node dist/index.js start

if [ $# -lt 2 ]; then
  echo "usage: $0 <timeout-sec> <cmd> [args...]"
  exit 2
fi
TIMEOUT=$1
shift

"$@" &
PID=$!

(sleep $TIMEOUT; kill -INT $PID >/dev/null 2>&1 || true; sleep 2; kill -TERM $PID >/dev/null 2>&1 || true) &
WATCHER=$!

wait $PID 2>/dev/null
EXIT=$?
kill $WATCHER >/dev/null 2>&1 || true
exit $EXIT
