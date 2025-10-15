/**
 * Betrouwbare vertaling service voor 't Tolhuis
 * Voorkomt Dinglisch door consistente vertalingen
 */

// Uitgebreide Nederlandse -> Engelse vertalingen
const TRANSLATIONS = {
  // Menu categorieën
  'Hoofdgerecht': 'Main Course',
  'Voorgerecht': 'Starter', 
  'Lunch': 'Lunch',
  'Ontbijt': 'Breakfast',
  'Dessert': 'Dessert',
  'Borrel': 'Aperitif',
  'Drank': 'Drink',
  'Gerecht': 'Dish',
  
  // Voedsel types
  'Vlees': 'Meat',
  'Vis': 'Fish', 
  'Vega': 'Vegetarian',
  'Vegetarisch': 'Vegetarian',
  
  // Smaak profielen
  'Rijk & Hartig': 'Rich & Hearty',
  'Licht & Fris': 'Light & Fresh',
  'Verrassend & Vol': 'Surprising & Full',
  
  // Algemene termen
  'Welkom bij': 'Welcome to',
  'Even voorstellen': 'Let me introduce myself',
  'Wat is je naam?': 'What is your name?',
  'Wat eet je graag?': 'What do you like to eat?',
  'Waar heb je zin in?': 'What are you in the mood for?',
  'Speciaal voor jou': 'Special for you',
  'Jouw Perfecte Match': 'Your Perfect Match',
  'Volledige kaart': 'Full menu',
  'Drankenkaart': 'Drinks menu',
  'Geef je bestelling door': 'Place your order',
  'aan één van onze collega\'s': 'with one of our colleagues',
  'Perfecte combinatie': 'Perfect combination',
  
  // Ingrediënten en bereidingen
  'gebakken': 'baked',
  'gegrild': 'grilled',
  'gekookt': 'boiled',
  'gerookt': 'smoked',
  'vers': 'fresh',
  'warme': 'warm',
  'koude': 'cold',
  'met': 'with',
  'en': 'and',
  'op': 'on',
  'van': 'of',
  'uit': 'from',
  'in': 'in',
  'aan': 'with',
  
  // Specifieke gerechten (veelvoorkomende)
  'Caesar salade': 'Caesar salad',
  'Caesar salad': 'Caesar salad', // Al Engels
  'Franse uien soep': 'French onion soup',
  'Biefstuk': 'Steak',
  'Biefstuk Tolhuis': 'Tolhuis Steak',
  'Zeebaars': 'Sea bass',
  'Gamba\'s': 'Shrimp',
  'Ossenhaas': 'Beef tenderloin',
  'Tartaar': 'Tartare',
  'Tartare': 'Tartare', // Al Engels
  
  // Dranken
  'Wijn': 'Wine',
  'Bier': 'Beer',
  'Koffie': 'Coffee',
  'Thee': 'Tea',
  'Water': 'Water',
  'Sap': 'Juice',
  'Likeur': 'Liqueur',
  'Cognac': 'Cognac',
  'Whisky': 'Whisky',
  'Gin': 'Gin',
  'Rum': 'Rum',
  'Vodka': 'Vodka',
  
  // Wijnsoorten
  'Chardonnay': 'Chardonnay',
  'Sauvignon Blanc': 'Sauvignon Blanc',
  'Merlot': 'Merlot',
  'Cabernet Sauvignon': 'Cabernet Sauvignon',
  'Pinot Noir': 'Pinot Noir',
  'Riesling': 'Riesling',
  'Malbec': 'Malbec',
  
  // Groenten
  'Tomaten': 'Tomatoes',
  'Sla': 'Lettuce',
  'Komkommer': 'Cucumber',
  'Ui': 'Onion',
  'Knoflook': 'Garlic',
  'Wortelen': 'Carrots',
  'Aardappelen': 'Potatoes',
  'Rijst': 'Rice',
  'Pasta': 'Pasta',
  
  // Sauzen en dressings
  'Saus': 'Sauce',
  'Dressing': 'Dressing',
  'Botersaus': 'Butter sauce',
  'Citroenboter': 'Lemon butter',
  'Knoflooksaus': 'Garlic sauce',
  'Mosterd': 'Mustard',
  'Mayonaise': 'Mayonnaise',
  'Olijfolie': 'Olive oil',
  'Balsamico': 'Balsamic',
  
  // Kruiden en specerijen
  'Zout': 'Salt',
  'Peper': 'Pepper',
  'Oregano': 'Oregano',
  'Basilicum': 'Basil',
  'Peterselie': 'Parsley',
  'Tijm': 'Thyme',
  'Rozemarijn': 'Rosemary',
  'Laurier': 'Bay leaf',
  'Kruidnagel': 'Clove',
  'Kaneel': 'Cinnamon',
  'Gember': 'Ginger',
  'Kurkuma': 'Turmeric',
  
  // Bereidingswijzen
  'gestoomd': 'steamed',
  'gebraden': 'roasted',
  'gefrituurd': 'fried',
  'gekruid': 'seasoned',
  'gemarineerd': 'marinated',
  'geserveerd': 'served',
  'begeleid': 'accompanied',
  'gegarnierd': 'garnished'
};

/**
 * Vertaal een Nederlandse tekst naar Engels
 * @param {string} text - Nederlandse tekst
 * @param {string} lang - Doeltaal ('en' of 'nl')
 * @returns {string} - Vertaalde tekst
 */
export function translateText(text, lang = 'en') {
  if (!text || lang === 'nl') {
    return text || '';
  }
  
  // Directe vertaling zoeken
  if (TRANSLATIONS[text]) {
    return TRANSLATIONS[text];
  }
  
  // Woord-voor-woord vertaling voor complexe zinnen
  let translatedText = text;
  
  // Vervang bekende woorden
  Object.entries(TRANSLATIONS).forEach(([dutch, english]) => {
    const regex = new RegExp(`\\b${dutch}\\b`, 'gi');
    translatedText = translatedText.replace(regex, english);
  });
  
  // Als er nog steeds Nederlandse karakters zijn, doe een conservatieve vertaling
  if (/[ëöüäï]/.test(translatedText.toLowerCase())) {
    console.warn(`⚠️ Unhandled Dutch text: "${text}"`);
    // Voor nu, return origineel om Dinglisch te voorkomen
    return text;
  }
  
  return translatedText;
}

/**
 * Vertaal een volledig gerecht object
 * @param {Object} dish - Gerecht object
 * @param {string} lang - Doeltaal
 * @returns {Promise<Object>} - Vertaald gerecht object
 */
export async function translateDish(dish, lang = 'en') {
  if (!dish || lang === 'nl') {
    return dish;
  }
  
  // DEBUG: Log what we're working with
  console.log('🔍 translateDish called:', {
    lang,
    originalTitle: dish.title,
    originalTitleEn: dish.title_en,
    originalDesc: dish.description,
    originalDescEn: dish.description_en
  });
  
  // Use pre-translated fields from Google Sheets if available
  let titleEn = dish.title_en || dish.titleEn;
  let descEn = dish.description_en || dish.descriptionEn;
  
  // If no manual translation exists, use AI translation (with cache check)
  if (!titleEn || titleEn.trim() === '') {
    console.log('🌐 No manual translation found, checking AI cache or generating...');
    
    // Check if we already have cached AI translation in dish object
    if (dish.ai_title_en && dish.ai_title_en.trim() !== '') {
      console.log('📦 Using cached AI translation from Sheets');
      titleEn = dish.ai_title_en;
      descEn = dish.ai_description_en || descEn;
    } else {
      // Generate AI translation
      try {
        const { generateDishTranslation } = await import('./openaiProxy.js');
        const aiTranslation = await generateDishTranslation({
          title: dish.title || dish.name,
          description: dish.description || dish.desc || ''
        });
        
        titleEn = aiTranslation.title_en;
        descEn = aiTranslation.description_en || descEn;
        
        // TODO: Save to Sheets cache (kolom M/N)
        console.log('💾 AI translation generated (cache to Sheets not yet implemented)');
      } catch (error) {
        console.warn('⚠️ AI translation failed, using original:', error);
        titleEn = dish.title || dish.name;
      }
    }
  }
  
  const result = {
    ...dish,
    // Use manual Sheets translations, AI translations, or fallback to original
    name: titleEn || dish.name || dish.title,
    title: titleEn || dish.title || dish.name,
    desc: descEn || dish.desc || dish.description,
    description: descEn || dish.description || dish.desc,
    subtitle: translateCategory(dish.subtitle, lang),
    category: translateCategory(dish.category, lang)
  };
  
  console.log('✅ translateDish result:', {
    finalName: result.name,
    finalDesc: result.desc
  });
  
  return result;
}

/**
 * Vertaal categorieën (Hoofdgerecht -> Main Course)
 * @param {string} category - Categorie
 * @param {string} lang - Doeltaal
 * @returns {string} - Vertaalde categorie
 */
export function translateCategory(category, lang = 'en') {
  if (!category || lang === 'nl') {
    return category || 'Gerecht';
  }
  
  return TRANSLATIONS[category] || 'Dish';
}

/**
 * Vertaal i18n keys (interface teksten)
 * @param {string} key - i18n key
 * @param {string} lang - Doeltaal
 * @returns {string} - Vertaalde tekst
 */
export function translateKey(key, lang = 'en') {
  if (!key || lang === 'nl') {
    return key;
  }
  
  return TRANSLATIONS[key] || key;
}
