# 🔤 Menu Vertaling Tool

Dit tool vertaalt automatisch je Nederlandse menu items naar natuurlijk Engels, **zonder Dinglisch**!

## 🚀 Gebruik

### 1. Installeer dependencies
```bash
npm install
```

### 2. Voeg Google Service Account toe

Je hebt een Google Service Account nodig om toegang te krijgen tot Google Sheets:

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Maak een nieuw Service Account aan
3. Download de JSON key file
4. Kopieer de `client_email` en `private_key` naar je `.env` file

### 3. Configureer `.env` file

Maak een `.env` file aan in de root van je project:

```env
# OpenAI API Key
OPENAI_API_KEY=REDACTED_API_KEY

# Google Sheets Configuration
GOOGLE_SHEETS_ID=1Y2xftXxnFn0DUKr_wXkBb4Vr-0NXrvytlmWpppKLwvo

# Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 4. Geef Service Account toegang tot je Google Sheet

1. Open je Google Sheet
2. Klik op "Share" / "Delen"
3. Voeg het `GOOGLE_SERVICE_ACCOUNT_EMAIL` toe met "Editor" rechten

### 5. Voeg kolommen toe aan Google Sheets

Zorg dat je Google Sheets de volgende kolommen heeft:
- `title` of `Title` of `Titel` (Nederlandse titel)
- `description` of `Description` of `Beschrijving` (Nederlandse beschrijving)
- `title_en` of `Title_EN` (wordt gevuld met Engelse vertaling)
- `description_en` of `Description_EN` (wordt gevuld met Engelse vertaling)

### 6. Run het vertaal script

```bash
# Vertaal het "menu" tabblad
npm run translate

# Vertaal het "weekmenu" tabblad
npm run translate-weekmenu

# Of gebruik direct:
node utils/translateMenu.js menu
node utils/translateMenu.js weekmenu
```

## 🎯 Wat doet het?

- **Leest** alle rijen uit je Google Sheets tab
- **Controleert** of een gerecht al vertaald is (slaat over indien ja)
- **Vertaalt** met OpenAI GPT-4o-mini voor natuurlijk, culinair Engels
- **Schrijft** de vertalingen terug naar `title_en` en `description_en` kolommen
- **Vermijdt** Dinglisch door professionele culinaire copywriting

## ✨ Voorbeelden

**Nederlands:**
```
Titel: Caesar salade
Beschrijving: Gegaarde kippendijen, romeinse sla, croutons en Parmezaan.
```

**Engels (na vertaling):**
```
Title: Caesar Salad
Description: Slow-cooked chicken thighs, romaine lettuce, croutons, and Parmesan cheese.
```

## 💡 Tips

- Het script wacht 1 seconde tussen vertalingen om rate limiting te voorkomen
- Al vertaalde gerechten worden overgeslagen (check `title_en` en `description_en`)
- Je kunt het script meerdere keren runnen - het update alleen ontbrekende vertalingen

## 🐛 Troubleshooting

### "Error: Cannot find module 'openai'"
```bash
npm install
```

### "Error: Cannot read properties of undefined (reading 'get')"
Zorg dat je Google Sheets de juiste kolommen heeft: `title`, `description`, `title_en`, `description_en`

### "Error: Request had insufficient authentication scopes"
Je Service Account heeft geen toegang tot de Google Sheet. Deel de sheet met het service account email.

## 📚 Dependencies

- `openai` - OpenAI API client
- `google-spreadsheet` - Google Sheets API client
- `google-auth-library` - Google authentication
- `dotenv` - Environment variables

## 🔒 Security

- **Nooit** je `.env` file committen naar Git
- De `.env` file staat al in `.gitignore`
- Gebruik altijd environment variables voor API keys

