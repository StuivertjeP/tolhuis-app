/**
 * Google Sheets Service voor Tolhuis App
 * Haalt data uit Google Sheets met nieuwe kolom structuur
 */

// Google Sheets configuratie
const SHEETS_CONFIG = {
  spreadsheetId: '1Y2xftXxnFn0DUKr_wXkBb4Vr-0NXrvytlmWpppKLwvo',
  sheets: {
    menu: 'menu',
    weekmenu: 'weekmenu', 
    pairings: 'pairings',
    feestdagen: 'Feestdagen 2025'
  }
};

// Cache voor data
let menuCache = { data: null, timestamp: null, ttl: 30000 };
let weekmenuCache = { data: null, timestamp: null, ttl: 30000 };
let pairingCache = { data: null, timestamp: null, ttl: 30000 };
let periodCache = { data: null, timestamp: null, ttl: 30000 };
let feestdagenCache = { data: null, timestamp: null, ttl: 30000 };

/**
 * Haalt data op uit Google Sheets (publieke CSV export)
 */
async function fetchSheetData(sheetName) {
  // Gebruik CSV export voor publieke Sheets
  const url = `https://docs.google.com/spreadsheets/d/${SHEETS_CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    
    // Parse CSV to array - improved parser for multi-line cells
    const rows = [];
    let currentRow = [];
  let current = '';
  let inQuotes = false;
    let quoteCount = 0;
  
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
    
    if (char === '"') {
        quoteCount++;
        if (quoteCount % 2 === 1) {
          inQuotes = true;
      } else {
          inQuotes = false;
      }
        current += char;
    } else if (char === ',' && !inQuotes) {
        currentRow.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(current.trim().replace(/^"|"$/g, ''));
        rows.push(currentRow);
        currentRow = [];
      current = '';
    } else {
      current += char;
    }
  }
  
    // Add last row
    if (currentRow.length > 0 || current.trim()) {
      currentRow.push(current.trim().replace(/^"|"$/g, ''));
      rows.push(currentRow);
    }
    
    return rows;
  } catch (error) {
    console.error(`Error fetching ${sheetName}:`, error);
    return [];
  }
}

/**
 * Mapt een rij uit Sheets naar menu item object
 * Kolom mapping: A=id, B=section, C=title, D=description, E=price, F=type, G=category, H=diet, I=tags, J=active, K=is_week, L=supplier, M=date
 */
function mapSheetRowToMenuItem(row, index) {
  if (!row || row.length < 9) return null;
  
  // Map alle kolommen inclusief de nieuwe title_en en description_en kolommen
  // Kolom mapping: A=id, B=section, C=title, D=description, E=price, F=type, G=category, H=diet, I=tags, J=active, K=is_week, L=supplier, M=date, N=title_en, O=description_en
  const [id, section, title, description, price, type, category, diet, tags, active, is_week, supplier, date, title_en, description_en] = row;
  
  // Skip header row
  if (index === 0) return null;
  
  // Skip empty rows
  if (!title || !section) return null;
  
  return {
    id: id || `item_${index}`,
    venue: 'tolhuis',
    section: section.toLowerCase(),
    name: title, // Dutch name
    title: title, // Dutch title
    title_en: title_en || '', // English title from Sheets
    description: description || '', // Dutch description
    desc: description || '', // Dutch description (alias)
    description_en: description_en || '', // English description from Sheets
    price: parseFloat(price.replace(',', '.')) || 0, // Handle comma as decimal separator
    category: category || '',
    type: type || '',
    diet: diet ? diet.split(',').map(d => d.trim()) : [],
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    active: active === 'TRUE' || active === 'true' || active === '1' || active === 'WAAR',
    is_week: is_week === 'TRUE' || is_week === 'true' || is_week === '1' || is_week === 'WAAR',
    supplier: supplier || '',
    subtitle: category || '',
    date: date || null
  };
}

/**
 * Mapt een rij uit Sheets naar pairing object
 */
function mapSheetRowToPairing(row, index) {
  if (!row || row.length < 7) return null;
  
  // CORRECTE Kolom mapping: A=dish_id, B=venue, C=suggestion, D=description, E=kind, F=match_tags, G=priority, H=active, I=suggestion_en, J=description_en, K=ai_description_nl, L=ai_description_en
  const [dish_id, venue, suggestion, description, kind, match_tags, priority, active, suggestion_en, description_en, ai_description_nl, ai_description_en] = row;
  
  // Skip header row
  if (index === 0) return null;
  
  // Skip empty rows
  if (!dish_id || !suggestion) return null;
  
  return {
    dish_id: dish_id,
    venue: venue || 'tolhuis',
    suggestion: suggestion, // Button tekst (NL) - bijv. "Glas Merlot + ��5,95"
    suggestion_en: suggestion_en || suggestion, // Button tekst (EN) - fallback naar NL
    description: description || '', // Toaster tekst (NL) - laat leeg voor AI generation
    description_en: description_en || '', // Toaster tekst (EN) - laat leeg voor AI generation
    ai_description_nl: ai_description_nl || '', // AI cache (NL) - kolom K
    ai_description_en: ai_description_en || '', // AI cache (EN) - kolom L
    kind: kind || 'food', // Kolom E: food/drink/wine/beer etc
    match_tags: match_tags ? match_tags.split(',').map(t => t.trim()) : [], // Kolom F: taste tags
    priority: parseInt(priority) || 5, // Kolom G
    active: active === 'TRUE' || active === 'true' || active === '1' || active === 'WAAR', // Kolom H
    row_index: index // Bewaar rij nummer voor later updaten
  };
}

/**
 * Haalt menu data op uit Google Sheets
 */
async function getMenuData(forceRefresh = false) {
  console.log(' getMenuData function called - fetching from Google Sheets');
  
  if (!forceRefresh && menuCache.data && menuCache.timestamp) {
    const now = Date.now();
    if (now - menuCache.timestamp < menuCache.ttl) {
      console.log(' Using cached menu data:', menuCache.data.length, 'items');
      return menuCache.data;
    }
  }

  try {
    const rows = await fetchSheetData(SHEETS_CONFIG.sheets.menu);
    console.log(' RAW MENU ROWS from Sheets:', rows.slice(0, 3)); // Debug: show first 3 rows
    
    const menuItems = rows
      .map((row, index) => {
        const mapped = mapSheetRowToMenuItem(row, index);
        if (mapped && index < 5) {
          console.log(` Mapped menu item ${index}:`, {
            title: mapped.title,
            active: mapped.active,
            is_week: mapped.is_week,
            category: mapped.category,
            section: mapped.section
          });
        }
        return mapped;
      })
      .filter(item => {
        if (item) {
          console.log(` Filtering item: ${item.title} - active: ${item.active}`);
        }
        return item && item.active;
      });
    
    menuCache.data = menuItems;
    menuCache.timestamp = Date.now();
    console.log(' Updated menu cache with Sheets data:', menuItems.length, 'items');
    console.log(' First menu item:', menuItems[0]);
    return menuItems;
  } catch (error) {
    console.error('Error fetching menu data:', error);
    return menuCache.data || [];
  }
}

/**
 * Haalt feestdagen data op uit Google Sheets
 */
async function getFeestdagenData(forceRefresh = false) {
  console.log('🎄 getFeestdagenData function called - fetching from Google Sheets');
  
  if (!forceRefresh && feestdagenCache.data && feestdagenCache.timestamp) {
    const now = Date.now();
    if (now - feestdagenCache.timestamp < feestdagenCache.ttl) {
      console.log(' Using cached feestdagen data:', feestdagenCache.data.length, 'items');
      return feestdagenCache.data;
    }
  }

  try {
    const rows = await fetchSheetData(SHEETS_CONFIG.sheets.feestdagen);
    console.log('🎄 RAW FEESTDAGEN ROWS from Sheets:', rows.slice(0, 3));
    
    const feestdagenItems = rows
      .map((row, index) => {
        const mapped = mapSheetRowToMenuItem(row, index);
        if (mapped && index < 5) {
          console.log(`🎄 Mapped feestdagen item ${index}:`, {
            title: mapped.title,
            category: mapped.category,
            section: mapped.section
          });
        }
        return mapped;
      })
      .filter(item => item && item.active);
    
    feestdagenCache.data = feestdagenItems;
    feestdagenCache.timestamp = Date.now();
    console.log('🎄 Updated feestdagen cache with Sheets data:', feestdagenItems.length, 'items');
    return feestdagenItems;
  } catch (error) {
    console.error('Error fetching feestdagen data:', error);
    return feestdagenCache.data || [];
  }
}

function clearFeestdagenCache() {
  feestdagenCache.data = null;
  feestdagenCache.timestamp = null;
  console.log('🎄 Feestdagen cache cleared');
}

/**
 * Haalt weekmenu data op uit Google Sheets
 */
async function getWeekmenuData() {
  console.log('� getWeekmenuData function called - fetching from Google Sheets');
  
  if (weekmenuCache.data && weekmenuCache.timestamp) {
    const now = Date.now();
    if (now - weekmenuCache.timestamp < weekmenuCache.ttl) {
      return weekmenuCache.data;
    }
  }

  try {
    const rows = await fetchSheetData(SHEETS_CONFIG.sheets.weekmenu);
    console.log('� RAW WEEKMENU ROWS from Sheets:', rows.slice(0, 3)); // Debug: show first 3 rows
    
    const weekmenuItems = rows
      .map((row, index) => {
        const mapped = mapSheetRowToMenuItem(row, index);
        if (mapped && index < 5) {
          console.log(`� Mapped weekmenu item ${index}:`, {
            title: mapped.title,
            title_en: mapped.title_en,
            description: mapped.description?.substring(0, 50),
            description_en: mapped.description_en?.substring(0, 50)
          });
        }
        return mapped;
      })
      .filter(item => item && item.active && item.is_week);
    
      weekmenuCache.data = weekmenuItems;
      weekmenuCache.timestamp = Date.now();
    console.log('� Updated weekmenu cache with Sheets data:', weekmenuItems.length, 'items');
    console.log('� First weekmenu item with translations:', weekmenuItems[0]);
      return weekmenuItems;
  } catch (error) {
    console.error('Error fetching weekmenu data:', error);
    return weekmenuCache.data || [];
  }
}

/**
 * Haalt pairing data op uit Google Sheets
 */
async function getPairingData(forceRefresh = false) {
  console.log(' getPairingData function called - fetching from Google Sheets');
  
  if (!forceRefresh && pairingCache.data && pairingCache.timestamp) {
    const now = Date.now();
    if (now - pairingCache.timestamp < pairingCache.ttl) {
      console.log('� Using cached pairing data:', pairingCache.data.length, 'items');
      return pairingCache.data;
    }
  }

  try {
    console.log(' Fetching pairings from sheet:', SHEETS_CONFIG.sheets.pairings);
    const rows = await fetchSheetData(SHEETS_CONFIG.sheets.pairings);
    console.log(' RAW PAIRING ROWS from Sheets:', rows.length, 'rows');
    console.log('� First 3 rows:', rows.slice(0, 3)); // Debug: show first 3 rows
    
    const pairingItems = rows
      .map((row, index) => {
        const mapped = mapSheetRowToPairing(row, index);
        if (mapped && index < 5) {
          console.log(`� Mapped pairing ${index}:`, {
            suggestion: mapped.suggestion,
            suggestion_en: mapped.suggestion_en,
            description: mapped.description,
            description_en: mapped.description_en
          });
        }
        return mapped;
      })
      .filter(item => item && item.active);
    
    pairingCache.data = pairingItems;
    pairingCache.timestamp = Date.now();
    console.log('� Updated pairing cache with Sheets data:', pairingItems.length, 'items');
    console.log('� First pairing item with translations:', pairingItems[0]);
    return pairingItems;
  } catch (error) {
    console.error('Error fetching pairing data:', error);
    return pairingCache.data || [];
  }
}

/**
 * Haalt periode op uit weekmenu data
 */
async function getCurrentPeriod() {
  console.log(' getCurrentPeriod function called - fetching from Google Sheets');
  
  if (periodCache.data && periodCache.timestamp) {
    const now = Date.now();
    if (now - periodCache.timestamp < periodCache.ttl) {
      return periodCache.data;
    }
  }

  try {
    const weekmenuItems = await getWeekmenuData();
    if (weekmenuItems.length > 0 && weekmenuItems[0].date) {
      const dateString = weekmenuItems[0].date;
      console.log(' Found date string:', dateString);
      
      // Parse datum uit journaal string - met haakjes
      const dateMatch = dateString.match(/\((\d{1,2})\s+(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\s+t\/m\s+(\d{1,2})\s+(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\s+(\d{4})\)/i);
      
      if (dateMatch) {
        const [, startDay, startMonth, endDay, endMonth, year] = dateMatch;
        const period = `${startDay} ${startMonth} t/m ${endDay} ${endMonth} ${year}`;
        periodCache.data = period;
        periodCache.timestamp = Date.now();
        console.log(' Parsed period from journaal:', period);
        return period;
      } else {
        // Fallback: gebruik de hele string als periode
        const period = dateString.replace(/^'t Tolhuis Journaal No\.\d+\s*/, '');
        periodCache.data = period;
        periodCache.timestamp = Date.now();
        console.log(' Using fallback period:', period);
        return period;
      }
    }
  } catch (error) {
    console.error('Error fetching period:', error);
  }

  // Fallback
  const period = "Huidige week";
  periodCache.data = period;
  periodCache.timestamp = Date.now();
  return period;
}

/**
 * Berekent weeknummer
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Genereert AI pairings voor een gerecht
 */
async function generateAIPairings(dish, user, lang = 'nl', pairingData = []) {
  console.log(' generateAIPairings for:', dish.name);
  
  // Zoek matching pairings uit Sheets
  const matchingPairings = pairingData.filter(pairing => 
    pairing.dish_id === dish.id && pairing.active
  );
  
    const pairings = [];
    
    for (const pairing of matchingPairings) {
      const isTasteMatch = pairing.match_tags.some(tag => {
      const userTaste = user.taste ? user.taste.toLowerCase() : '';
      return userTaste.includes(tag.toLowerCase()) || pairing.match_tags.length === 0;
    });
    
    if (isTasteMatch) {
      let price = 5.95;
        const priceMatch = pairing.suggestion.match(/\+��?([\d,]+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(',', '.'));
        }
        
      const nameWithoutPrice = pairing.suggestion.replace(/\s*\+��?[\d,\.]+.*$/, '');
      const nameWithoutPrice_en = (pairing.suggestion_en || pairing.suggestion).replace(/\s*\+��?[\d,\.]+.*$/, '');
        
        pairings.push({
          dish_id: dish.id,
          kind: pairing.kind,
        name: nameWithoutPrice, // Dutch name (without price)
        name_en: nameWithoutPrice_en, // English name (without price)
        suggestion: pairing.suggestion, // Dutch suggestion (with price, e.g. "Glas Merlot + ��5,95")
        suggestion_en: pairing.suggestion_en || pairing.suggestion, // English suggestion (with price)
          price: price,
        description: pairing.description || '', // Dutch description from Sheets
        description_en: pairing.description_en || '', // English description from Sheets
          match_tags: pairing.match_tags,
        upsell_id: `pairing_${pairing.kind}_${dish.id}`,
          priority: pairing.priority
        });
      }
    }
    
  return pairings.slice(0, 2);
}

// Cache clear functies
function clearMenuCache() {
  menuCache.data = null;
  menuCache.timestamp = null;
  console.log(' Menu cache cleared');
}

function clearWeekmenuCache() {
  weekmenuCache.data = null;
  weekmenuCache.timestamp = null;
  console.log('� Weekmenu cache cleared');
}

function clearPairingCache() {
  pairingCache.data = null;
  pairingCache.timestamp = null;
  console.log('� Pairing cache cleared');
}

function clearPeriodCache() {
  periodCache.data = null;
  periodCache.timestamp = null;
  console.log(' Period cache cleared');
}

/**
 * Schrijft AI description terug naar Google Sheets (kolom K of L)
 * BELANGRIJK: Google Sheets CSV export is READ-ONLY!
 * Voor write access moet je Google Sheets API gebruiken met credentials.
 * Deze functie is een placeholder voor toekomstige implementatie.
 */
async function saveAIDescriptionToSheet(dish_id, suggestion, aiDescription, lang = 'nl') {
  console.log(`� [CACHE] Saving AI description for ${dish_id} (${lang}):`, aiDescription);
  
  // TODO: Implementeer Google Sheets API write
  // Voor nu slaan we alleen op in memory cache
  // In productie moet je:
  // 1. Google Sheets API credentials toevoegen
  // 2. OAuth setup doen
  // 3. sheets.spreadsheets.values.update() gebruiken
  
  // Find pairing in cache and update
  if (pairingCache.data) {
    const pairingIndex = pairingCache.data.findIndex(p => 
      p.dish_id === dish_id && p.suggestion === suggestion
    );
    
    if (pairingIndex !== -1) {
      if (lang === 'nl') {
        pairingCache.data[pairingIndex].ai_description_nl = aiDescription;
    } else {
        pairingCache.data[pairingIndex].ai_description_en = aiDescription;
      }
      console.log(`� [CACHE] Updated pairing cache for ${dish_id}`);
    }
  }
  
  return true;
}

// Test functies
async function testSheetsConnection() {
  try {
    const testData = await fetchSheetData(SHEETS_CONFIG.sheets.menu);
    return testData.length > 0;
  } catch (error) {
    console.error('Sheets connection test failed:', error);
    return false;
  }
}

async function testOpenAIConnection() {
  return true; // Placeholder
}

async function getAllSheetsData() {
  try {
    const [menuData, weekmenuData, pairingData] = await Promise.all([
      getMenuData(),
      getWeekmenuData(),
      getPairingData()
    ]);
    
    return {
      currentPeriod: await getCurrentPeriod(),
      lastUpdated: Date.now(),
      source: 'google-sheets',
      menuItems: menuData.length,
      weekmenuItems: weekmenuData.length,
      pairingItems: pairingData.length
    };
  } catch (error) {
    console.error('Error getting all sheets data:', error);
    return {
      currentPeriod: 'Unknown',
      lastUpdated: Date.now(),
      source: 'error',
      error: error.message
    };
  }
}

/**
 * Get SmartBubbles data from Google Sheets
 * Fetches real menu items for upsell suggestions
 */
async function getSmartBubblesData() {
  try {
    // Use CSV export for SmartBubbles sheet (same as other sheets) with cache busting
    const timestamp = Date.now();
    const url = `https://docs.google.com/spreadsheets/d/${SHEETS_CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=SmartBubbles&_t=${timestamp}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(' SmartBubbles sheet does not exist yet, returning empty array');
      return [];
    }
    
    // Parse CSV data
    const csvText = await response.text();
    console.log(' SmartBubbles raw CSV:', csvText.substring(0, 200));
    
    const rows = csvText.split('\n').map(row => {
      // Simple CSV parser (handles quoted values)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
    } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    }).filter(row => row.some(cell => cell && cell !== ''));
    
    console.log(' SmartBubbles parsed rows:', rows.length);
    console.log(' SmartBubbles header row:', rows[0]);
    console.log(' SmartBubbles data rows:', rows.slice(1));
    
    if (rows.length <= 1) {
      console.log(' No SmartBubbles data found (only header or empty)');
      return [];
    }
    
    const smartBubbles = rows.slice(1).map((row, index) => {
      if (!row || row.length < 2) return null;
      
      const [offer_id, venue, dish_name, price, category, taste_match, weather_match, time_match, season_match, active] = row;
      
      if (!offer_id || !dish_name) return null;
    
    return {
        offer_id,
        venue: venue || 'tolhuis',
        dish_name,
        price: price || '',
        category: category || 'food',
        taste_match: taste_match && taste_match !== 'alle' ? taste_match.split(',').map(t => t.trim()) : [],
        weather_match: weather_match && weather_match !== 'alle' ? weather_match.split(',').map(w => w.trim()) : [],
        time_match: time_match && time_match !== 'alle' ? time_match.split(',').map(t => t.trim()) : [],
        season_match: season_match && season_match !== 'alle' ? season_match.split(',').map(s => s.trim()) : [],
        active: active === 'TRUE' || active === 'true' || active === '1' || active === 'WAAR',
        row_index: index + 1
      };
    }).filter(Boolean);
    
    console.log(' SmartBubbles processed:', smartBubbles.length, 'items');
    console.log(' SmartBubbles items:', smartBubbles.map(item => `${item.dish_name} (${item.active ? 'active' : 'inactive'})`));
    return smartBubbles;
    
  } catch (error) {
    console.error(' Error fetching SmartBubbles data:', error);
    return [];
  }
}

// Function to save opt-in data to external database
async function saveOptInData(optInData) {
  try {
    console.log(' Saving opt-in data to database:', optInData);
    
    const optInRecord = {
      name: optInData.name.trim(),
      phone: optInData.phone.trim(),
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      venue: 'tolhuis',
      language: optInData.lang || 'nl',
      user_taste: optInData.user_taste || 'unknown',
      user_diet: optInData.user_diet || 'unknown',
      active: true
    };
    
    // Use your existing SlimmeGast Apps Script API
    try {
      // Get your existing Apps Script API URL
      // This should be the same URL you use for your SlimmeGast webapp
      const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SLIMMEGAST_SCRIPT_ID/exec';
      
      const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          type: 'optin',
          ...optInRecord
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(' Opt-in data saved to SlimmeGast spreadsheet:', result);
      } else {
        throw new Error(`SlimmeGast API request failed: ${response.status}`);
      }
      
    } catch (apiError) {
      console.warn(' SlimmeGast API not ready for opt-in data, using Google Form fallback:', apiError);
      
      // Fallback to Google Form
      try {
        const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdPeWKTwOLF93UsxuFLlVm6uT35Ot9AqmXNASmKuxMhD9lhHw/formResponse';
        
        // Google Form field IDs - ECHTE IDs UIT JE FORM (logische volgorde)
        const FIELD_IDS = {
          name: 'entry.691302498',        // 1e veld - Naam
          phone: 'entry.772321695',      // 2e veld - Telefoonnummer
          timestamp: 'entry.1583448926', // 3e veld - Timestamp
          language: 'entry.152588836',   // 4e veld - Taal
          taste: 'entry.802344911',      // 5e veld - Smaak voorkeur
          diet: 'entry.118522528'        // 6e veld - Dieet voorkeur
        };
        
        console.log(' Using field IDs:', FIELD_IDS);
        
        const formData = new FormData();
        formData.append(FIELD_IDS.name, optInRecord.name);
        formData.append(FIELD_IDS.phone, optInRecord.phone);
        formData.append(FIELD_IDS.timestamp, optInRecord.timestamp);
        formData.append(FIELD_IDS.language, optInRecord.language);
        formData.append(FIELD_IDS.taste, optInRecord.user_taste);
        formData.append(FIELD_IDS.diet, optInRecord.user_diet);
        
        const formResponse = await fetch(GOOGLE_FORM_URL, {
          method: 'POST',
          body: formData
        });
        
        if (formResponse.ok) {
          console.log(' Opt-in data sent to Google Form successfully');
        } else {
          throw new Error(`Google Form failed: ${formResponse.status}`);
        }
        
      } catch (formError) {
        console.warn(' Google Form also failed, using localStorage backup:', formError);
      }
    }
    
    // Always store in localStorage as backup
    const existingOptIns = JSON.parse(localStorage.getItem('tolhuis-optins') || '[]');
    existingOptIns.push(optInRecord);
    localStorage.setItem('tolhuis-optins', JSON.stringify(existingOptIns));
    
    // Mark as opted in
    localStorage.setItem('tolhuis-optin', 'true');
    
    console.log(' Opt-in data saved successfully');
    
    return { success: true, message: 'Opt-in data saved successfully' };
    
    } catch (error) {
    console.error(' Error saving opt-in data:', error);
    return { success: false, message: 'Failed to save opt-in data' };
  }
}

module.exports = {
  getCurrentPeriod,
  clearPeriodCache,
  getWeekmenuData,
  clearWeekmenuCache,
  getPairingData,
  clearPairingCache,
  getMenuData,
  clearMenuCache,
  getFeestdagenData,
  clearFeestdagenCache,
  generateAIPairings,
  saveAIDescriptionToSheet,
  testSheetsConnection,
  testOpenAIConnection,
  getAllSheetsData,
  getSmartBubblesData,
  saveOptInData
};