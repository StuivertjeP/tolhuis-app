# Scaleway VM Deployment Guide

## 🖥️ Jouw Setup:
- **Instance**: DEV1-M
- **Location**: Amsterdam 1
- **OS**: Ubuntu 24.04
- **RAM**: 4 GB
- **CPU**: 2 cores
- **IP**: Publiek IP toegewezen

## 📦 Deployment Stappen

### 1. Connect met je VM
```bash
ssh root@<jouw-publieke-ip>
```

### 2. Update system & install dependencies
```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Install Nginx (voor reverse proxy en SSL)
apt install nginx certbot python3-certbot-nginx -y
```

### 3. Upload je app naar de VM

**Optie A: Via Git (aanbevolen)**
```bash
# Op de VM
apt install git -y
cd /var/www
git clone https://github.com/jouw-username/tolhuis-app.git
cd tolhuis-app
```

**Optie B: Via SFTP/SCP (lokaal van jouw Mac)**
```bash
# Op jouw Mac
cd "/Users/stuiver/Desktop/Tolhuis App 2.0"
scp -r . root@<jouw-publieke-ip>:/var/www/tolhuis-app
```

### 4. Setup .env file op de VM
```bash
# Op de VM
cd /var/www/tolhuis-app
nano .env
```

Voeg toe:
```env
REACT_APP_OPENAI_API_KEY=your_api_key_here
REACT_APP_OPENAI_PROXY_URL=/api/openai
```

**⚠️ BELANGRIJK:** Vervang `your_api_key_here` met je echte OpenAI API key. Deel deze NOOIT in Git!

### 5. Build & Run Docker Container
```bash
# Build de image met .env variables
docker build --build-arg REACT_APP_OPENAI_API_KEY="$REACT_APP_OPENAI_API_KEY" \
  --build-arg REACT_APP_OPENAI_PROXY_URL="/api/openai" \
  -t tolhuis-app .

# Run de container
docker run -d \
  --name tolhuis-app \
  --restart unless-stopped \
  -p 8080:80 \
  tolhuis-app

# Check logs
docker logs -f tolhuis-app
```

### 6. Configure Nginx Reverse Proxy
```bash
# Create Nginx config
nano /etc/nginx/sites-available/tolhuis-app
```

Voeg toe:
```nginx
server {
    listen 80;
    server_name tolhuis.slimmegast.ai;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tolhuis.slimmegast.ai;

    ssl_certificate /etc/letsencrypt/live/tolhuis.slimmegast.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tolhuis.slimmegast.ai/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7. Enable site & get SSL certificate
```bash
# Enable site
ln -s /etc/nginx/sites-available/tolhuis-app /etc/nginx/sites-enabled/

# Remove default
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Get SSL certificate
certbot --nginx -d tolhuis.slimmegast.ai

# Restart Nginx
systemctl restart nginx
```

### 8. Configure DNS
1. Ga naar Scaleway Console → Domain DNS
2. Select `slimmegast.ai`
3. Add record:
   - **Type**: A
   - **Name**: tolhuis
   - **TTL**: 300
   - **Value**: `<jouw-publieke-ip>`

### 9. Test!
```bash
# Check container
docker ps

# Check Nginx
systemctl status nginx

# Check logs
docker logs tolhuis-app
tail -f /var/log/nginx/error.log
```

Open: https://tolhuis.slimmegast.ai 🚀

## 🔄 Updates deployen
```bash
# SSH naar je VM
ssh root@<jouw-publieke-ip>

# Navigate naar app
cd /var/www/tolhuis-app

# Pull latest changes (als via Git)
git pull

# Rebuild container
docker build -t tolhuis-app .
docker stop tolhuis-app
docker rm tolhuis-app
docker run -d --name tolhuis-app --restart unless-stopped -p 8080:80 tolhuis-app

# Check
docker logs -f tolhuis-app
```

## 💰 Kosten Estimate
- **DEV1-M**: €4.99/maand (4GB RAM)
- **Bandwidth**: Unlimited
- **Storage**: 50GB (meer dan genoeg voor app + Docker)

## 📊 Monitoring & Logs
```bash
# Container logs
docker logs -f tolhuis-app

# System resources
htop

# Disk space
df -h

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```





