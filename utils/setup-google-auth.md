# 🔐 Google Service Account Setup

Volg deze stappen om de Google Sheets API te configureren:

## 1. Ga naar Google Cloud Console

Ga naar: https://console.cloud.google.com/

## 2. Maak een nieuw project (of gebruik bestaand)

1. Klik op het project dropdown (bovenaan)
2. Klik op "NEW PROJECT"
3. Geef het een naam, bijvoorbeeld: "Tolhuis Menu App"
4. Klik op "CREATE"

## 3. Enable Google Sheets API

1. Ga naar: https://console.cloud.google.com/apis/library
2. Zoek naar "Google Sheets API"
3. Klik op "ENABLE"

## 4. Maak een Service Account

1. Ga naar: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Klik op "CREATE SERVICE ACCOUNT"
3. Vul in:
   - **Service account name**: `tolhuis-sheets-translator`
   - **Description**: `Service account voor menu vertalingen`
4. Klik op "CREATE AND CONTINUE"
5. **Role**: Kies "Editor" (of "Basic > Editor")
6. Klik op "CONTINUE" en dan "DONE"

## 5. Download de JSON key

1. Klik op het service account dat je net hebt aangemaakt
2. Ga naar het tabblad "KEYS"
3. Klik op "ADD KEY" > "Create new key"
4. Kies "JSON"
5. Klik op "CREATE"
6. Een JSON file wordt gedownload - **bewaar deze veilig!**

## 6. Kopieer de gegevens naar .env

Open het gedownloade JSON bestand en kopieer:

- `client_email` → naar `GOOGLE_SERVICE_ACCOUNT_EMAIL` in `.env`
- `private_key` → naar `GOOGLE_PRIVATE_KEY` in `.env`

**Let op:** De `private_key` bevat `\n` voor nieuwe regels. Bewaar deze als een string met quotes:

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEF...\n-----END PRIVATE KEY-----\n"
```

## 7. Geef toegang tot je Google Sheet

1. Open je Google Sheet: https://docs.google.com/spreadsheets/d/1Y2xftXxnFn0DUKr_wXkBb4Vr-0NXrvytlmWpppKLwvo
2. Klik op "Share" / "Delen" (rechts bovenin)
3. Voeg het `client_email` toe (bijv. `tolhuis-sheets-translator@xxx.iam.gserviceaccount.com`)
4. Geef "Editor" rechten
5. Klik op "Send" / "Verzenden"

## 8. Test de configuratie

```bash
npm run translate
```

Als alles goed is, zie je:
```
🔄 Vertalingen ophalen uit Google Sheets...
✅ Document geladen: 't Tolhuis Menu
📄 Sheet geselecteerd: menu
📝 XX rijen gevonden
...
```

## 🎉 Klaar!

Je kunt nu automatisch je menu vertalen met:
```bash
npm run translate
npm run translate-weekmenu
```

