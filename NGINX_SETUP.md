# Nginx Setup voor API Proxy

Na deployment moet je Nginx configureren om `/api/*` requests door te sturen naar de Node.js proxy server.

## Stappen:

1. **Kopieer de Nginx config naar de server:**
   ```bash
   sudo cp nginx-tolhuis-app.conf /etc/nginx/sites-available/tolhuis-app
   ```

2. **Maak een symlink (als die nog niet bestaat):**
   ```bash
   sudo ln -s /etc/nginx/sites-available/tolhuis-app /etc/nginx/sites-enabled/
   ```

3. **Test de Nginx config:**
   ```bash
   sudo nginx -t
   ```

4. **Herstart Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

5. **Controleer of de API proxy server draait:**
   ```bash
   pm2 list
   pm2 logs tolhuis-api
   ```

## Belangrijk:

- De Node.js server (`server.js`) draait op poort 3001
- PM2 start deze automatisch na deployment
- Nginx proxiet `/api/*` requests naar `http://localhost:3001`

## Troubleshooting:

Als API calls nog steeds niet werken:
1. Check of PM2 de server draait: `pm2 list`
2. Check server logs: `pm2 logs tolhuis-api`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Test de API direct: `curl http://localhost:3001/api/openai -X POST -H "Content-Type: application/json" -d '{"prompt":"test","lang":"nl"}'`

