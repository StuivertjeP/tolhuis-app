#!/bin/zsh

# Simple deploy script for tolhuis.slimmegast.ai
# - Syncs code to server (excludes .env, node_modules, .git, dist)
# - Installs deps, builds, and restarts PM2 app on the server

set -euo pipefail

SERVER="root@tolhuis.slimmegast.ai"
APP_DIR="/var/www/tolhuis-app"

echo "Deploying to $SERVER:$APP_DIR ..."

# Sync project files to server, excluding sensitive/unnecessary items
rsync -avz --delete \
  --exclude ".env" \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "dist" \
  "$(pwd)/" \
  "$SERVER:$APP_DIR/"

# Install, build, and restart on the server
ssh "$SERVER" <<'REMOTE_CMDS'
set -euo pipefail
cd /var/www/tolhuis-app
echo "Installing dependencies..."
npm ci
echo "Building frontend..."
npm run build
echo "Restarting PM2 app..."
pm2 restart tolhuis-api || pm2 start server/index.js --name tolhuis-api
pm2 save
echo "Done."
REMOTE_CMDS

echo "Deployment complete: https://tolhuis.slimmegast.ai"


