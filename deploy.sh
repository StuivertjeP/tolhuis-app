#!/bin/zsh
set -euo pipefail

# === CONFIG ===
SERVER="root@tolhuis.slimmegast.ai"
APP_DIR="/var/www/tolhuis-app"

echo "🚀 Deploying frontend to $SERVER:$APP_DIR"

# === SYNC PROJECT TO SERVER ===
# (sluit onnodige bestanden uit om de upload klein te houden)
rsync -avz --delete \
  --exclude ".env" \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "dist" \
  . "$SERVER:$APP_DIR"

# === BUILD ON SERVER ===
ssh "$SERVER" << 'ENDSSH'
set -euo pipefail
cd /var/www/tolhuis-app

echo "📦 Installing dependencies..."
npm ci

echo "🏗️ Building project..."
npm run build

echo "✨ Deployment complete!"
echo "De site zou nu bereikbaar moeten zijn op: https://tolhuis.slimmegast.ai"
ENDSSH

