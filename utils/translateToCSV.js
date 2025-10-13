/**
 * 🔤 translateToCSV.js
 * Vertaalt ALLE menu items en export naar CSV voor import in Google Sheets
 */

const OpenAI = require("openai").default;
const https = require("https");
const fs = require("fs");
const path = require("path");

// OpenAI API Key
const OPENAI_API_KEY = 'REDACTED_API_KEY';
const SHEETS_ID = '1Y2xftXxnFn0DUKr_wXkBb4Vr-0NXrvytlmWpppKLwvo';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---- 🧠 OpenAI vertaalfunctie ----
async function translateDish(title, description) {
  const prompt = `Translate this Dutch restaurant dish to elegant English for an international menu. Avoid literal "Dinglish" translations.

Dutch:
Title: ${title}
Description: ${description || ""}

English (respond ONLY with the translation, no extra text):
Title: 
Description: `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a professional culinary translator. Translate Dutch menu items to natural, appetizing English. Keep it concise and elegant."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    const text = response.choices[0].message.content.trim();
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
      translatedDescription: translatedDescription || description || ""
    };
  } catch (err) {
    console.error(`❌ Translation error for "${title}":`, err.message);
    return { translatedTitle: title, translatedDescription: description || "" };
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
        const rows = [];
        const lines = data.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const row = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          row.push(current.trim().replace(/^"|"$/g, ''));
          rows.push(row);
        }
        
        resolve(rows);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// ---- 🗂️ Vertaal ALLE gerechten en export naar CSV ----
async function translateAllToCSV(sheetName = "menu") {
  console.log("🔄 Data ophalen uit Google Sheets...");
  console.log(`📊 Sheets ID: ${SHEETS_ID}`);
  console.log(`📋 Tab: ${sheetName}\n`);

  try {
    const rows = await fetchSheetDataCSV(sheetName);
    console.log(`✅ ${rows.length} rijen gevonden\n`);

    const header = rows[0];
    const dataRows = rows.slice(1);

    console.log("🌍 Start vertaling van ALLE items...");
    console.log("⏱️  Dit kan een paar minuten duren...\n");

    const results = [];
    let translated = 0;
    let skipped = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Kolom mapping: C=title (index 2), D=description (index 3)
      const title = row[2];
      const description = row[3];
      
      if (!title || title.toLowerCase() === 'title') {
        console.log(`⏭️  Rij ${i + 2}: Overgeslagen (geen titel of header)`);
        skipped++;
        continue;
      }

      process.stdout.write(`📝 ${i + 1}/${dataRows.length}: ${title.substring(0, 40)}...`);
      
      const { translatedTitle, translatedDescription } = await translateDish(title, description);
      
      results.push({
        rowNumber: i + 2, // Sheets row number (1-indexed + header)
        titleNL: title,
        descriptionNL: description || "",
        titleEN: translatedTitle,
        descriptionEN: translatedDescription
      });
      
      process.stdout.write(` ✅\n`);
      translated++;

      // Rate limiting: 500ms tussen calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n🎉 Vertaling compleet!`);
    console.log(`✅ ${translated} items vertaald`);
    console.log(`⏭️  ${skipped} items overgeslagen\n`);

    // Export naar CSV
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const csvFile = path.join(outputDir, `translations_${sheetName}_${timestamp}.csv`);
    
    // CSV Header
    let csvContent = "Row,Title_NL,Description_NL,Title_EN,Description_EN\n";
    
    // CSV Data
    for (const result of results) {
      const escapeCSV = (str) => {
        if (!str) return '""';
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      };
      
      csvContent += `${result.rowNumber},${escapeCSV(result.titleNL)},${escapeCSV(result.descriptionNL)},${escapeCSV(result.titleEN)},${escapeCSV(result.descriptionEN)}\n`;
    }
    
    fs.writeFileSync(csvFile, csvContent, 'utf8');
    
    console.log(`📄 CSV bestand aangemaakt: ${csvFile}\n`);
    console.log("💡 Import instructies:");
    console.log("   1. Open Google Sheets");
    console.log("   2. Selecteer kolom N (title_en)");
    console.log("   3. File > Import > Upload > Selecteer CSV file");
    console.log("   4. Kies 'Append to current sheet' of 'Replace data at selected cell'");
    console.log("   5. Herhaal voor kolom O (description_en)\n");
    
    // Print eerste 5 resultaten
    console.log("📋 Preview (eerste 5 vertalingen):");
    console.log("=".repeat(80));
    for (let i = 0; i < Math.min(5, results.length); i++) {
      const r = results[i];
      console.log(`\n${i + 1}. ${r.titleNL}`);
      console.log(`   → ${r.titleEN}`);
      console.log(`   ${r.descriptionNL.substring(0, 60)}...`);
      console.log(`   → ${r.descriptionEN.substring(0, 60)}...`);
    }
    console.log("\n" + "=".repeat(80) + "\n");

  } catch (err) {
    console.error("❌ Fout:", err.message);
    console.error(err);
  }
}

// ---- 🚀 Run ----
if (require.main === module) {
  const sheetName = process.argv[2] || "menu";
  console.log(`🚀 Start volledige vertaling voor tab: ${sheetName}\n`);
  translateAllToCSV(sheetName);
}

module.exports = { translateAllToCSV };

