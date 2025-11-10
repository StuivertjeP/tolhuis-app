# Scaleway Deployment Guide

## 🚀 Stappen om de Tolhuis WebApp op Scaleway te deployen

### 1. Scaleway Container Registry Setup

```bash
# Install Scaleway CLI (als je die nog niet hebt)
brew install scw

# Login bij Scaleway
scw config

# Maak een container registry namespace aan
scw registry namespace create name=slimmegast
```

### 2. Build en Push Docker Image

```bash
# Login bij Container Registry
scw registry login

# Build de image met proxy endpoint
docker build \
  --build-arg REACT_APP_OPENAI_PROXY_URL="/api/openai" \
  -t rg.nl-ams.scw.cloud/slimmegast/tolhuis-app:latest .

# Push naar registry
docker push rg.nl-ams.scw.cloud/slimmegast/tolhuis-app:latest
```

### 3. Create Serverless Container

```bash
# Maak een container deployment
scw container create \
  name=tolhuis-app \
  region=nl-ams \
  memory-limit=512mb \
  cpu-limit=100 \
  min-scale=1 \
  max-scale=3 \
  privacy=public \
  port=80 \
  http-option=redirected \
  registry-image=rg.nl-ams.scw.cloud/slimmegast/tolhuis-app:latest
```

### 4. Configure Environment Variables in Scaleway Console

1. Ga naar Scaleway Console → Serverless Containers
2. Select "tolhuis-app"
3. Ga naar "Environment Variables"
4. Voeg toe:
   - `OPENAI_API_KEY` = je OpenAI API key
   - `REACT_APP_OPENAI_PROXY_URL` = `/api/openai`

### 5. Domain Configuration

```bash
# Koppel je domein aan de container
scw domain add-http-hostname \
  domain=slimmegast.ai \
  hostname=tolhuis \
  container-id=<container-id>
```

In Scaleway Console:
1. Ga naar "Domains & DNS"
2. Voeg toe: `tolhuis.slimmegast.ai`
3. Maak DNS record: CNAME `tolhuis` → `container-instance-url.scw.cloud`

### 6. SSL Certificate (Automatisch)

Scaleway genereert automatisch SSL certificaten via Let's Encrypt voor je domein.

## 🔒 Veiligheid

- ✅ Environment variables worden NIET in de bundle gebouwd
- ✅ API keys blijven veilig op server-side
- ✅ HTTPS wordt automatisch geregeld
- ✅ Docker image is geoptimaliseerd met multi-stage build

## 📊 Monitoring

```bash
# View logs
scw container log get container-id=<container-id>

# Scale container
scw container update <container-id> min-scale=2 max-scale=5
```

## 🔄 CI/CD Setup (Optioneel)

Maak een `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Scaleway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and Push
        run: |
          scw registry login
          docker build \
            --build-arg REACT_APP_OPENAI_PROXY_URL=/api/openai \
            -t rg.nl-ams.scw.cloud/slimmegast/tolhuis-app:latest .
          docker push rg.nl-ams.scw.cloud/slimmegast/tolhuis-app:latest
      - name: Deploy
        run: scw container deploy rg.nl-ams.scw.cloud/slimmegast/tolhuis-app:latest
```





