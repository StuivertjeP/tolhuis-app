/**
 * 🔤 translateMenu.js
 * Vertaal automatisch gerechten vanuit Google Sheets naar natuurlijk Engels
 * zonder Dinglish. Ideaal voor restaurantmenu's.
 * 
 * GOAL: This script connects to Google Sheets and uses OpenAI to translate restaurant dishes
 * from Dutch to natural English (culinary style). It saves translations into new columns
 * (title_en, description_en). It should avoid "Dinglish" and sound elegant for an international menu.
 * Tech stack: Node.js, OpenAI API, Google Sheets API (Service Account Auth).
 */

const OpenAI = require("openai").default;
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// ---- 🔧 ENVIRONMENT VARIABLES ----
// Voeg deze regels toe aan je .env file:
//
// OPENAI_API_KEY=your_api_key_here
// GOOGLE_SHEETS_ID=1Y2xftXxnFn0DUKr_wXkBb4Vr-0NXrvytlmWpppKLwvo
// GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx
// GOOGLE_PRIVATE_KEY="xxx"   <-- Let op: met aanhalingstekens, met \n bij nieuwe regels
//

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY not found in environment variables!');
  console.error('   Please add OPENAI_API_KEY to your .env file');
  process.exit(1);
}

// Google Sheets setup
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || '1Y2xftXxnFn0DUKr_wXkBb4Vr-0NXrvytlmWpppKLwvo';
const doc = new GoogleSpreadsheet(SHEETS_ID, serviceAccountAuth);

// ---- 🧠 OpenAI vertaalfunctie ----
async function translateDish(title, description) {
  const prompt = `
Je bent een professionele culinaire copywriter. 
Vertaal de volgende Nederlandse gerechtomschrijving naar elegant, natuurlijk Engels voor een menukaart. 
Vermijd letterlijke vertalingen of "Dinglish". Gebruik een vloeiende, internationale restauranttoon.

Voorbeeld:
Nederlands:
Titel: Caesar salade
Beschrijving: Gegaarde kippendijen, romeinse sla, croutons en Parmezaan.

Engels:
Title: Caesar Salad
Description: Slow-cooked chicken thighs, romaine lettuce, croutons, and Parmesan cheese.

Vertaal nu dit gerecht:
Titel: ${title}
Beschrijving: ${description || ""}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const text = response.choices[0].message.content.trim();

    // Verwacht format: "Title: ...\nDescription: ..."
    const lines = text.split(/\n+/);
    let translatedTitle = "";
    let translatedDescription = "";

    for (const line of lines) {
      if (line.match(/^Title:/i)) {
        translatedTitle = line.replace(/^Title:\s*/i, "").trim();
      } else if (line.match(/^Description:/i)) {
        translatedDescription = line.replace(/^Description:\s*/i, "").trim();
      }
    }

    return { 
      translatedTitle: translatedTitle || title, 
      translatedDescription: translatedDescription || description 
    };
  } catch (err) {
    console.error("❌ Fout bij vertalen:", err.message);
    return { translatedTitle: title, translatedDescription: description };
  }
}

// ---- 🗂️ Batchfunctie: vertaal hele Sheet ----
async function translateAllDishes(sheetName = "menu") {
  console.log("🔄 Vertalingen ophalen uit Google Sheets...");
  console.log(`📊 Sheets ID: ${SHEETS_ID}`);
  console.log(`📋 Tab: ${sheetName}`);

  try {
    await doc.loadInfo();
    console.log(`✅ Document geladen: ${doc.title}`);
    
    const sheet = doc.sheetsByTitle[sheetName] || doc.sheetsByIndex[0];
    console.log(`📄 Sheet geselecteerd: ${sheet.title}`);
    
    const rows = await sheet.getRows();
    console.log(`📝 ${rows.length} rijen gevonden`);

    let translated = 0;
    let skipped = 0;

    for (const [i, row] of rows.entries()) {
      const title = row.get('title') || row.get('Title') || row.get('Titel');
      const description = row.get('description') || row.get('Description') || row.get('Beschrijving');
      
      if (!title) {
        console.log(`⏭️  ${i + 1}. Overgeslagen (geen titel)`);
        skipped++;
        continue;
      }

      const titleEn = row.get('title_en') || row.get('Title_EN');
      const descEn = row.get('description_en') || row.get('Description_EN');

      if (titleEn && descEn) {
        console.log(`✅ ${i + 1}. ${title} - al vertaald`);
        skipped++;
        continue;
      }

      console.log(`🌍 ${i + 1}. Vertaal: ${title}`);
      const { translatedTitle, translatedDescription } = await translateDish(title, description);

      row.set('title_en', translatedTitle);
      row.set('description_en', translatedDescription);
      await row.save();

      console.log(`💾 Opgeslagen: ${translatedTitle}`);
      translated++;

      // Rate limiting: 1 seconde wachten tussen vertalingen
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("\n🎉 Klaar!");
    console.log(`✅ ${translated} gerechten vertaald`);
    console.log(`⏭️  ${skipped} gerechten overgeslagen`);
  } catch (err) {
    console.error("❌ Fout bij vertalen:", err.message);
    console.error(err);
  }
}

// ---- 🚀 Zelf uitvoeren ----
// Gebruik:  node utils/translateMenu.js
if (require.main === module) {
  const sheetName = process.argv[2] || "menu";
  console.log(`🚀 Start vertaling voor tab: ${sheetName}\n`);
  translateAllDishes(sheetName);
}

// Export for use in other modules
module.exports = { translateAllDishes };

