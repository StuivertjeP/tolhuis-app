# 🚀 Vertaling Quick Start Gids

## ⚠️ Belangrijke Info

Je app is een **React + Webpack app**, GEEN Next.js. Daarom werkt de vertaling via een **Node.js backend script**, niet via API routes.

## ✅ Wat je al hebt (en werkt!)

### 1. Simple Script (Geen setup nodig)
```bash
npm run translate-simple
```

Dit script:
- ✅ Leest menu uit Google Sheets
- ✅ Vertaalt via OpenAI API (gpt-4o-mini)
- ✅ Print vertalingen in terminal
- ✅ Werkt METEEN (geen extra setup)

### 2. Automatisch Script (Met Google Service Account)
```bash
npm run translate
```

Dit script:
- ✅ Leest menu uit Google Sheets
- ✅ Vertaalt via OpenAI API
- ✅ Schrijft AUTOMATISCH terug naar Sheets
- ⚠️ Vereist Google Service Account setup

## 🎯 Welke moet je gebruiken?

### **Voor NU: Optie 1** (Simple Script)

**Waarom?**
- Werkt direct zonder extra setup
- Geen Google Service Account nodig
- Je ziet meteen de vertalingen

**Hoe:**
```bash
# 1. Run het script
npm run translate-simple

# 2. Kopieer de output
# Je ziet zoiets als:
# ✅ Engels: Caesar Salad
#    Slow-cooked chicken thighs, romaine lettuce...

# 3. Plak in Google Sheets
# - Kolom N: title_en
# - Kolom O: description_en

# 4. WebApp gebruikt automatisch deze vertalingen!
```

### **Later: Optie 2** (Automatisch Script)

Als je niet handmatig wilt kopiëren:

1. **Setup Google Service Account** (10 min):
   ```bash
   # Volg: utils/setup-google-auth.md
   ```

2. **Vul .env in**:
   ```env
   OPENAI_API_KEY=sk-proj-xxx
   GOOGLE_SHEETS_ID=1Y2xftXxnFn0DUKr_wXkBb4Vr-0NXrvytlmWpppKLwvo
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@xxx.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"
   ```

3. **Run**:
   ```bash
   npm run translate
   ```

## 📋 API Key Setup

De OpenAI API key is **al geconfigureerd** in:
- `utils/translateMenu.js` (automatisch script)
- `utils/translateMenuSimple.js` (simple script)

**Huidige key:**
```
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
```

## 🧪 Test de Vertaling

```bash
# Test met eerste 10 menu items
npm run translate-simple

# Als dit werkt, zie je:
# ✅ Engels: Caesar Salad
#    Slow-cooked chicken thighs, romaine lettuce, croutons, and Parmesan cheese
```

## 🔧 Troubleshooting

### "Invalid API key"
- Check of de key nog geldig is
- Update in `utils/translateMenuSimple.js` (regel 10)

### "Cannot find module 'openai'"
```bash
npm install
```

### "Forbidden" of "Permission denied"
- Google Sheets moet publiek zijn OF
- Je moet ingelogd zijn op Google met toegang

## 📊 Hoe de WebApp de vertalingen gebruikt

In `src/utils/translationService.js`:
```javascript
export function translateDish(dish, lang = 'en') {
  // 1. Check of er Sheets vertalingen zijn
  const titleEn = dish.title_en;
  const descEn = dish.description_en;
  
  // 2. Gebruik Sheets vertaling OF fallback naar lokale vertaling
  return {
    ...dish,
    name: titleEn || translateText(dish.name, lang),
    description: descEn || translateText(dish.description, lang)
  };
}
```

**Flow:**
1. Script vertaalt → `title_en` en `description_en` in Sheets
2. WebApp leest Sheets → gebruikt deze vertalingen
3. Geen Dinglish meer! ✨

## 🎯 Waarom geen API routes?

Je app is **React + Webpack**, niet Next.js:
- ❌ Geen `/pages` folder
- ❌ Geen `/api` routes
- ✅ Webpack dev server
- ✅ Client-side React app

**Oplossing:** Node.js backend script (zoals ik heb gemaakt)

## 💡 Alternatief: Upgrade naar Next.js

Als je echt API routes wilt:

1. **Migreer naar Next.js** (groot werk):
   ```bash
   npx create-next-app@latest slimmegast-nextjs
   # Migreer al je React components
   ```

2. **Maak API route** (`pages/api/translate.ts`):
   ```typescript
   import OpenAI from 'openai';
   
   export default async function handler(req, res) {
     const openai = new OpenAI({ 
       apiKey: process.env.OPENAI_API_KEY 
     });
     
     const { title, description } = req.body;
     
     const response = await openai.chat.completions.create({
       model: "gpt-4o-mini",
       messages: [{ role: "user", content: `Translate to English: ${title}` }]
     });
     
     res.json({ translation: response.choices[0].message.content });
   }
   ```

**Maar dit is VEEL werk en niet nodig!** Het huidige script werkt perfect.

## ✅ Conclusie

**Gebruik gewoon:**
```bash
npm run translate-simple
```

**En plak de vertalingen in Google Sheets.** Klaar! 🎉

De webapp gebruikt dan automatisch de professionele OpenAI vertalingen zonder Dinglish.

