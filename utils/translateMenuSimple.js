/**
 * 🔤 translateMenuSimple.js
 * Eenvoudige versie - vertaalt via OpenAI en print het resultaat
 * Je kunt de output dan handmatig in Google Sheets plakken
 */

const OpenAI = require("openai").default;
const https = require("https");

// OpenAI API Key
const OPENAI_API_KEY = 'REDACTED_API_KEY';
const SHEETS_ID = '1Y2xftXxnFn0DUKr_wXkBb4Vr-0NXrvytlmWpppKLwvo';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

// ---- 📥 Haal data op uit Google Sheets (CSV export) ----
async function fetchSheetDataCSV(sheetName) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Parse CSV
        const rows = [];
        const lines = data.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          // Simple CSV parse (handles quotes)
          const row = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          row.push(current.trim());
          rows.push(row);
        }
        
        resolve(rows);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// ---- 🗂️ Vertaal gerechten en print output ----
async function translateAndPrint(sheetName = "menu") {
  console.log("🔄 Data ophalen uit Google Sheets...");
  console.log(`📊 Sheets ID: ${SHEETS_ID}`);
  console.log(`📋 Tab: ${sheetName}\n`);

  try {
    const rows = await fetchSheetDataCSV(sheetName);
    console.log(`✅ ${rows.length} rijen gevonden\n`);

    // Skip header row
    const header = rows[0];
    const dataRows = rows.slice(1);

    console.log("🌍 Start vertaling...\n");
    console.log("=" .repeat(80));

    for (let i = 0; i < Math.min(dataRows.length, 10); i++) {
      const row = dataRows[i];
      
      // Kolom mapping: C=title, D=description
      const title = row[2]; // Kolom C (0-indexed)
      const description = row[3]; // Kolom D
      
      if (!title) {
        console.log(`⏭️  Rij ${i + 2}: Overgeslagen (geen titel)\n`);
        continue;
      }

      console.log(`📝 Rij ${i + 2}: ${title}`);
      console.log(`   Nederlands: ${description || '(geen beschrijving)'}`);
      
      const { translatedTitle, translatedDescription } = await translateDish(title, description);
      
      console.log(`   ✅ Engels: ${translatedTitle}`);
      console.log(`   ${translatedDescription || '(no description)'}`);
      console.log("-".repeat(80));

      // Rate limiting: 1 seconde wachten
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("\n🎉 Klaar!");
    console.log("\n💡 TIP: Kopieer de Engelse vertalingen en plak ze in kolommen N en O van Google Sheets");
    console.log("   - Kolom N: title_en");
    console.log("   - Kolom O: description_en\n");
  } catch (err) {
    console.error("❌ Fout:", err.message);
  }
}

// ---- 🚀 Run ----
if (require.main === module) {
  const sheetName = process.argv[2] || "menu";
  console.log(`🚀 Start vertaling voor tab: ${sheetName}\n`);
  translateAndPrint(sheetName);
}

module.exports = { translateAndPrint };

