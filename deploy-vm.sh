#!/bin/bash

# Tolhuis App - Scaleway VM Deployment Script
# Run this on your DEV1-M instance

set -e

echo "🚀 Starting Tolhuis App Deployment..."

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
echo "📦 Installing Docker Compose..."
apt install docker-compose-plugin -y

# Navigate to app directory
APP_DIR="/var/www/tolhuis-app"
mkdir -p $APP_DIR
cd $APP_DIR

echo "📝 Reading environment variables..."
# Read .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found. Please create one first!"
    exit 1
fi

echo "🔨 Building Docker image..."
docker build \
  --build-arg REACT_APP_OPENAI_API_KEY="$REACT_APP_OPENAI_API_KEY" \
  --build-arg REACT_APP_OPENAI_PROXY_URL="/api/openai" \
  -t tolhuis-app:latest .

echo "🛑 Stopping existing container..."
docker stop tolhuis-app 2>/dev/null || true
docker rm tolhuis-app 2>/dev/null || true

echo "▶️  Starting new container..."
docker run -d \
  --name tolhuis-app \
  --restart unless-stopped \
  -p 8080:80 \
  tolhuis-app:latest

echo "✅ Deployment complete!"
echo "📍 App is running on: http://localhost:8080"
echo ""
echo "🔍 Check logs with: docker logs -f tolhuis-app"
echo "🛑 Stop with: docker stop tolhuis-app"





