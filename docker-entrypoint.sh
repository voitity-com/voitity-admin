#!/bin/sh

set -e

APP_DIR="/app/src"

cd "$APP_DIR"

if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "Installing dependencies..."
  npm install
fi

exec "$@"
