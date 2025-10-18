/**
 * OpenAI Proxy Service
 * Handles OpenAI API calls server-side to keep API key secure
 * Falls back to client-side if proxy is not available
 */

import { saveAIDescriptionToSheet } from '../services/sheetsService';
import { getTimeOfDay } from '../services/weatherService.js';

const PROXY_URL = process.env.REACT_APP_OPENAI_PROXY_URL || '/api/openai';

/**
 * Generate AI pairing description
 * @param {Object} params - Pairing parameters
 * @param {string} params.dishId - ID of the dish (for cache)
 * @param {string} params.dishName - Name of the dish
 * @param {string} params.pairingSuggestion - The pairing suggestion (e.g. "Glas Merlot")
 * @param {string} params.dishDescription - Optional description of the dish
 * @param {string} params.userTaste - User's taste preference
 * @param {string} params.lang - Language ('nl' or 'en')
 * @returns {Promise<string>} Generated description
 */
export async function generatePairingDescription({ dishId, dishName, pairingSuggestion, dishDescription = '', userTaste = '', lang = 'nl' }) {
  const prompt = lang === 'en'
    ? `Write a simple, local restaurant-style pairing hint (1 sentence, max 12 words) for:
       
       Dish: ${dishName}
       Pairing: ${pairingSuggestion}
       
       Examples of GOOD descriptions:
       - "Perfect match! This wine goes great with this dish."
       - "Excellent choice! This really brings out the flavors."
       - "Great combination! This pairs beautifully together."
       
       Examples of BAD descriptions (too fancy/sommelier):
       - "This exquisite vintage perfectly complements the delicate nuances"
       - "An exceptional pairing that elevates the gastronomic experience"
       
       Be enthusiastic but simple. Like a friendly local restaurant owner. NO emojis.`
    : `Schrijf een simpele, lokale restaurant-stijl pairing hint (1 zin, max 12 woorden) voor:
       
       Gerecht: ${dishName}
       Pairing: ${pairingSuggestion}
       
       Voorbeelden van GOEDE beschrijvingen:
       - "Perfecte match! Deze wijn smaakt heerlijk bij dit gerecht."
       - "Uitstekende keuze! Dit brengt de smaken echt naar voren."
       - "Geweldige combinatie! Dit past perfect bij elkaar."
       
       Voorbeelden van SLECHTE beschrijvingen (te fancy/sommelier):
       - "Deze verfijnde vintage complementeert perfect de delicate nuances"
       - "Een uitzonderlijke pairing die de gastronomische ervaring verheft"
       
       BELANGRIJK: Gebruik GEEN verkleinwoorden (hapje, drankje, etc.) - dit is een professioneel restaurant.
       
       Wees enthousiast maar simpel. Zoals een vriendelijke lokale restauranthouder. GEEN emoji's.`;

  const aiDescription = await generateAIDescriptionClientSide(prompt, lang);
  
  // Save to cache (Sheets) for future use
  if (aiDescription && dishId) {
    try {
      await saveAIDescriptionToSheet(dishId, pairingSuggestion, aiDescription, lang);
      console.log(`💾 AI description saved to cache for ${dishId}`);
    } catch (error) {
      console.warn('Failed to save AI description to cache:', error);
    }
  }
  
  return aiDescription;
}

/**
 * Generate context hint for pairing based on weather/time
 * @param {Object} params - Context parameters
 * @param {string} params.pairingSuggestion - The pairing (e.g. "Glas Merlot")
 * @param {string} params.weatherCategory - Weather category (hot_sunny, cold, rain, etc.)
 * @param {number} params.temp - Temperature in Celsius
 * @param {string} params.timeOfDay - Time of day (ochtend, middag, avond, nacht)
 * @param {string} params.season - Season (lente, zomer, herfst, winter)
 * @param {string} params.lang - Language ('nl' or 'en')
 * @returns {Promise<string>} Generated context hint
 */
export async function generateContextHint({ pairingSuggestion, weatherCategory, temp, timeOfDay, season, lang = 'nl' }) {
  // Fallback templates if AI fails
  const fallbacks = {
    nl: {
      hot_sunny: "Heerlijk verfrissend! ☀️",
      hot: "Perfect bij dit weer! 🌤️",
      cold: "Lekker verwarmend! 🔥",
      rain: "Ideaal bij regen! 🌧️",
      snow: "Winterse verwennerij! ❄️",
      clouds_warm: "Aangenaam bij bewolkt weer! ☁️",
      clouds_cool: "Verfrissend bij fris weer! 🌥️",
      neutral: "Uitstekende keuze! ✨"
    },
    en: {
      hot_sunny: "Wonderfully refreshing! ☀️",
      hot: "Perfect for this weather! 🌤️",
      cold: "Nicely warming! 🔥",
      rain: "Ideal in the rain! 🌧️",
      snow: "Winter treat! ❄️",
      clouds_warm: "Pleasant on cloudy weather! ☁️",
      clouds_cool: "Refreshing on cool weather! 🌥️",
      neutral: "Excellent choice! ✨"
    }
  };

  const prompt = lang === 'en'
    ? `Given this context:
       - Pairing: ${pairingSuggestion}
       - Weather: ${weatherCategory} (${temp}°C)
       - Time: ${timeOfDay}
       - Season: ${season}
       
       Generate a SHORT commercial hint (max 8 words) that:
       1. Matches the context naturally
       2. Creates desire/urgency
       3. Includes relevant emoji
       4. Sounds enthusiastic but not pushy
       
       Examples:
       - "Perfectly refreshing for this weather! 🌤️"
       - "Ideal for a cold evening! 🔥"
       - "Great choice for tonight! 🌙"`
    : `Gegeven deze context:
       - Pairing: ${pairingSuggestion}
       - Weer: ${weatherCategory} (${temp}°C)
       - Tijd: ${timeOfDay}
       - Seizoen: ${season}
       
       Genereer een KORTE commerciële hint (max 8 woorden) die:
       1. Natuurlijk aansluit bij de context
       2. Verlangen/urgentie creëert
       3. Een relevante emoji bevat
       4. Enthousiast klinkt maar niet opdringerig
       5. GEEN verkleinwoorden gebruikt (dit is een professioneel restaurant)
       
       Voorbeelden:
       - "Heerlijk verfrissend bij dit weer! 🌤️"
       - "Perfect voor een koude avond! 🔥"
       - "Ideale keuze voor vanavond! 🌙"`;

  try {
    const hint = await generateAIDescriptionClientSide(prompt, lang);
    if (hint && hint.length > 0) {
      console.log(`🌤️ AI context hint generated: ${hint}`);
      return hint;
    }
  } catch (error) {
    console.warn('Context hint generation failed, using fallback:', error);
  }

  // Fallback
  const fallback = fallbacks[lang][weatherCategory] || fallbacks[lang].neutral;
  console.log(`🌤️ Using fallback hint: ${fallback}`);
  return fallback;
}

export async function generateAIDescriptionViaProxy(prompt, lang = 'nl') {
  try {
    // Try proxy first (for production)
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, lang }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.description;
    }
  } catch (error) {
    console.warn('Proxy not available, falling back to client-side:', error);
  }

  // Fallback to client-side (for development)
  return generateAIDescriptionClientSide(prompt, lang);
}

async function generateAIDescriptionClientSide(prompt, lang = 'nl') {
  console.log('🤖 generateAIDescriptionClientSide called with lang:', lang);
  
  // Get API key from environment variable or use fallback
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY || 'REDACTED_API_KEY';
  
  console.log('🔑 API Key check:', apiKey ? `Found (${apiKey.substring(0, 10)}...)` : 'NOT FOUND');
  
  if (!apiKey) {
    console.warn('⚠️ No OpenAI API key found');
    return null;
  }

  try {
    console.log('📞 Calling OpenAI API...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Je bent een sommelier en food pairing expert. Schrijf korte, aantrekkelijke beschrijvingen (max 80 woorden) voor voedsel en drank combinaties.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    console.log('📡 OpenAI response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenAI API error response:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 OpenAI response data:', data);
    
    const result = data.choices[0]?.message?.content?.trim();
    console.log('✅ Generated text:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error);
    console.error('❌ Error details:', error.message);
    return null;
  }
}

/**
 * Generate smart upsell bubble content based on context
 * @param {Object} params - Context parameters
 * @param {string} params.userTaste - User's taste preference
 * @param {string} params.weatherCategory - Weather category
 * @param {number} params.temp - Temperature
 * @param {string} params.timeOfDay - Time of day
 * @param {string} params.season - Current season
 * @param {string} params.lang - Language ('nl' or 'en')
 * @returns {Promise<string>} Generated upsell message
 */
export async function generateSmartUpsell({ userTaste = '', weatherCategory = 'neutral', temp = 15, timeOfDay = 'avond', season = 'herfst', lang = 'nl', smartBubblesData = [] }) {
  console.log('🎯 generateSmartUpsell called with:', {
    userTaste,
    weatherCategory,
    timeOfDay,
    season,
    lang,
    smartBubblesCount: smartBubblesData.length,
    smartBubblesData: smartBubblesData
  });
  
  // If no SmartBubbles data, return empty (no fallback)
  if (smartBubblesData.length === 0) {
    console.log('⚠️ No SmartBubbles data available - not showing any bubbles');
    return '';
  }
  
  // Filter SmartBubbles based on context
  console.log(`🔍 Filtering ${smartBubblesData.length} SmartBubbles with context:`, {
    weatherCategory,
    timeOfDay,
    season,
    userTaste
  });
  
  const filteredBubbles = smartBubblesData.filter(bubble => {
    console.log(`🔍 Checking bubble: ${bubble.dish_name}`, {
      active: bubble.active,
      weather_match: bubble.weather_match,
      time_match: bubble.time_match,
      season_match: bubble.season_match,
      taste_match: bubble.taste_match
    });
    
    // Check if bubble is active
    if (!bubble.active) {
      console.log(`⏭️ Skipping ${bubble.dish_name} - not active`);
      return false;
    }
    
    // Check weather match (only if explicitly set and not 'alle')
    if (bubble.weather_match && bubble.weather_match.length > 0 && !bubble.weather_match.includes('alle')) {
      if (!bubble.weather_match.includes(weatherCategory)) {
        console.log(`⏭️ Skipping ${bubble.dish_name} - weather mismatch (${weatherCategory} not in ${bubble.weather_match})`);
        return false;
      }
    }
    
    // Check time match (only if explicitly set and not 'alle')
    if (bubble.time_match && bubble.time_match.length > 0 && !bubble.time_match.includes('alle')) {
      if (!bubble.time_match.includes(timeOfDay)) {
        console.log(`⏭️ Skipping ${bubble.dish_name} - time mismatch (${timeOfDay} not in ${bubble.time_match})`);
        return false;
      }
    }
    
    // Check season match (only if explicitly set and not 'alle')
    if (bubble.season_match && bubble.season_match.length > 0 && !bubble.season_match.includes('alle')) {
      if (!bubble.season_match.includes(season)) {
        console.log(`⏭️ Skipping ${bubble.dish_name} - season mismatch (${season} not in ${bubble.season_match})`);
        return false;
      }
    }
    
    // Check taste match (only if explicitly set and not 'alle')
    if (bubble.taste_match && bubble.taste_match.length > 0 && !bubble.taste_match.includes('alle')) {
      if (!bubble.taste_match.some(taste => userTaste.includes(taste))) {
        console.log(`⏭️ Skipping ${bubble.dish_name} - taste mismatch (${userTaste} not matching ${bubble.taste_match})`);
        return false;
      }
    }
    
    console.log(`✅ ${bubble.dish_name} passed all filters`);
    return true;
  });
  
  console.log(`🎯 Filtered ${filteredBubbles.length} bubbles from ${smartBubblesData.length} total`);
  console.log(`🎯 Current context: weather=${weatherCategory}, time=${timeOfDay}, season=${season}, taste=${userTaste}`);
  
  // If no bubbles pass the filters, don't show anything
  if (filteredBubbles.length === 0) {
    console.log('⚠️ No SmartBubbles passed the filters - not showing any bubbles');
    console.log('🔍 Available bubbles:', smartBubblesData.map(b => `${b.dish_name} (active:${b.active}, weather:${b.weather_match}, time:${b.time_match}, season:${b.season_match}, taste:${b.taste_match})`));
    return '';
  }
  
  // Use filtered bubbles
  const selectedBubble = filteredBubbles[Math.floor(Math.random() * filteredBubbles.length)];
  console.log(`🎯 Selected bubble: ${selectedBubble.dish_name}`);
  
  const prompt = lang === 'en'
    ? `Generate a SHORT, friendly upsell suggestion (max 10 words) for Restaurant 't Tolhuis based on:
       
       Context: ${weatherCategory} weather (${temp}°C), ${timeOfDay}, ${season}
       User preference: ${userTaste}
       
       REAL MENU ITEMS FROM 'T TOLHUIS (use these keywords/dishes):
       ${filteredBubbles.map(item => `- ${item.dish_name} - ${item.price} (${item.category})`).join('\n')}
       
       Make it:
       - Subtle and non-pushy
       - Use EXACT dish names from menu items above - NO modifications!
       - ALWAYS MENTION THE PRICE - this is an offer!
       - Make it attractive but stay with real dishes
       - Add relevant emoji
       - NO diminutives (no "hapje", "biertje", etc.)
       - NO weird combinations (no "warm carpaccio", "cold soup", "fresh carpaccio", etc.)
       - NO adjectives that don't make sense (no "frisse carpaccio", "warme carpaccio")
       - Keep it natural and appetizing
       - Match the context (${weatherCategory} weather, ${timeOfDay}, ${season})
       - IMPORTANT: Consider time - no alcohol in morning/afternoon!
       - CRITICAL: Use ONLY the exact dish name + price + emoji
       
       Examples (creative with keywords + PRICE):
       If menu has "Carpaccio tenderloin - € 7,50":
       ✅ "Try our carpaccio for only € 7,50! 🥩"
       ✅ "Carpaccio tenderloin for € 7,50! 🍽️"
       
       If menu has "Special beer - € 4,95":
       ✅ "Special beer for € 4,95! 🍺"
       ✅ "Beer for € 4,95? 🍻"
       
       IMPORTANT: Use the EXACT dish names from the menu items above!
       
       CRITICAL: Translate Dutch dish names to English:
       - "Carpaccio ossenhaas" → "Carpaccio tenderloin"
       - "Speciaal biertje" → "Special beer"
       - "Glas wijn" → "Glass of wine"
       
       GENERAL (if no match):
       "Our chef has something special today! 👨‍🍳"
       "Ask for our offers! ✨"`
    : `Genereer een KORTE, vriendelijke upsell suggestie (max 10 woorden) voor Restaurant 't Tolhuis gebaseerd op:
       
       Context: ${weatherCategory} weer (${temp}°C), ${timeOfDay}, ${season}
       Gebruiker voorkeur: ${userTaste}
       
       ECHTE MENU ITEMS UIT 'T TOLHUIS (gebruik deze keywords/gerechten):
       ${filteredBubbles.map(item => `- ${item.dish_name} - ${item.price} (${item.category})`).join('\n')}
       
       Maak het:
       - Subtiel en niet opdringerig
       - Gebruik EXACTE gerechtnamen uit menu items hierboven
       - NOEM ALTIJD DE PRIJS - dit is een aanbieding!
       - Maak het aantrekkelijk en verleidelijk, maar blijf bij echte gerechten
       - Voeg relevante emoji toe
       - GEEN verkleinwoorden (geen "hapje", "biertje", etc.)
       - GEEN rare combinaties (geen "warme carpaccio", "koude soep", etc.)
       - Houd het natuurlijk en appetijtelijk
       - Match de context (${weatherCategory} weer, ${timeOfDay}, ${season})
       - BELANGRIJK: Houd rekening met tijd - geen alcohol in ochtend/middag!
       
       Voorbeelden (creatief met keywords + PRIJS):
       Als menu heeft "Carpaccio ossenhaas - € 7,50":
       ✅ "Carpaccio ossenhaas voor € 7,50! 🥩"
       ✅ "Probeer onze carpaccio voor slechts € 7,50! 🍽️"
       ❌ "Probeer onze fruitsalade!" (NIET - staat niet in menu)
       
       Als menu heeft "Speciaal biertje - € 4,95":
       ✅ "Speciaal biertje voor € 4,95! 🍺"
       ✅ "Biertje erbij voor € 4,95? 🍻"
       
       Als menu heeft "Crème brûlée - € 6,50":
       ✅ "Crème brûlée voor € 6,50 als afsluiter? 🍮"
       ✅ "Zoete afsluiter voor € 6,50! ✨"
       
       ALGEMEEN (als geen match):
       "Onze chef heeft vandaag iets speciaals! 👨‍🍳"
       "Vraag naar onze aanbiedingen! ✨"`;

  try {
    const upsellMessage = await generateAIDescriptionClientSide(prompt, lang);
    if (upsellMessage && upsellMessage.length > 0) {
      console.log(`🎯 Smart upsell generated: ${upsellMessage}`);
      return upsellMessage;
    }
  } catch (error) {
    console.warn('Smart upsell generation failed:', error);
  }

  // If AI failed, return contextual fallback based on time and weather
  console.log('⚠️ AI generation failed, using contextual fallback');
  
  if (lang === 'en') {
    const englishFallbacks = {
      morning: "Try our breakfast special! ☀️",
      afternoon: "Perfect lunch option available! 🍽️", 
      evening: "Evening specials await! 🌙",
      rainy: "Cozy indoor dining! ☔",
      sunny: "Perfect terrace weather! ☀️",
      autumn: "Autumn flavors available! 🍂",
      winter: "Warm winter dishes! ❄️",
      spring: "Fresh spring menu! 🌸",
      summer: "Refreshing summer options! 🌻"
    };
    
    // Try to match context
    if (timeOfDay === 'ochtend') return englishFallbacks.morning;
    if (timeOfDay === 'middag') return englishFallbacks.afternoon;
    if (timeOfDay === 'avond') return englishFallbacks.evening;
    if (weatherCategory.includes('rain')) return englishFallbacks.rainy;
    if (weatherCategory.includes('sunny')) return englishFallbacks.sunny;
    if (season === 'herfst') return englishFallbacks.autumn;
    if (season === 'winter') return englishFallbacks.winter;
    if (season === 'lente') return englishFallbacks.spring;
    if (season === 'zomer') return englishFallbacks.summer;
    
    return "Our chef has something special today! 👨‍🍳";
  } else {
    const dutchFallbacks = {
      morning: "Probeer ons ontbijt! ☀️",
      afternoon: "Perfecte lunch optie beschikbaar! 🍽️",
      evening: "Avond specials wachten! 🌙", 
      rainy: "Gezellig binnen dineren! ☔",
      sunny: "Perfect terras weer! ☀️",
      autumn: "Herfst smaken beschikbaar! 🍂",
      winter: "Warme winter gerechten! ❄️",
      spring: "Verse lente menu! 🌸",
      summer: "Verfrissende zomer opties! 🌻"
    };
    
    // Try to match context
    if (timeOfDay === 'ochtend') return dutchFallbacks.morning;
    if (timeOfDay === 'middag') return dutchFallbacks.afternoon;
    if (timeOfDay === 'avond') return dutchFallbacks.evening;
    if (weatherCategory.includes('rain')) return dutchFallbacks.rainy;
    if (weatherCategory.includes('sunny')) return dutchFallbacks.sunny;
    if (season === 'herfst') return dutchFallbacks.autumn;
    if (season === 'winter') return dutchFallbacks.winter;
    if (season === 'lente') return dutchFallbacks.spring;
    if (season === 'zomer') return dutchFallbacks.summer;
    
    return "Onze chef heeft vandaag iets speciaals! 👨‍🍳";
  }
}

/**
 * Generate AI translation for dish title and description
 * @param {Object} params - Translation parameters
 * @param {string} params.title - Dutch dish title
 * @param {string} params.description - Dutch dish description (optional)
 * @returns {Promise<Object>} { title_en, description_en }
 */
export async function generateDishTranslation({ title, description = '' }) {
  
  // First try simple fallback translations for common dishes
  const fallbackTranslations = {
    'Franse uiensoep': 'French Onion Soup',
    'Biefstuk Tolhuis': 'Tolhuis Steak',
    'Carpaccio ossenhaas': 'Carpaccio Tenderloin',
    'Crème brûlée': 'Crème Brûlée',
    'Tiramisu': 'Tiramisu',
    'Salade van de maand': 'Salad of the Month',
    'Soep van de maand': 'Soup of the Month',
    'Hap van de week': 'Dish of the Week',
    'Vegetarische hap': 'Vegetarian Dish',
    'Vis van de dag': 'Fish of the Day',
    'Speciaal biertje': 'Special Beer',
    'Glas wijn': 'Glass of Wine',
    'Koffie': 'Coffee',
    'Thee': 'Tea',
    'Wellicht een glaasje water erbij?': 'Perhaps a glass of water with it?',
    'Friet': 'Fries',
    'Aardappelen': 'Potatoes',
    'Rijst': 'Rice',
    'Pasta': 'Pasta',
    'Salade': 'Salad',
    'Soep': 'Soup',
    'Dessert': 'Dessert',
    // Weekmenu items
    'Hap van het seizoen': 'Seasonal Dish',
    'Salade van de maand (VEGA VARIANT)': 'Salad of the Month (VEGETARIAN)',
    'Soep van de maand (VEGA VARIANT)': 'Soup of the Month (VEGETARIAN)'
  };
  
  // Try fallback first
  const fallbackTitle = fallbackTranslations[title];
  if (fallbackTitle) {
    return {
      title_en: fallbackTitle,
      description_en: description || ''
    };
  }
  
  // If no fallback, try AI - EXACTLY like generatePairingDescription works
  const prompt = `Translate ONLY the Dutch dish title to English:

Dutch Title: ${title}

Guidelines:
- Translate ONLY the title, not the description
- Keep proper names as-is: "Carpaccio", "Merlot"
- Use natural, appetizing English
- Professional restaurant tone
- Short and clear
- Do NOT include "Description:" or any other labels

Examples:
"Franse uiensoep" → "French Onion Soup"
"Biefstuk Tolhuis" → "Tolhuis Steak"
"Salade van de maand" → "Salad of the Month"
"Hap van het seizoen" → "Seasonal Dish"

Translate ONLY the title: ${title}`;

  const aiTitle = await generateAIDescriptionClientSide(prompt, 'en');
  
  // Also translate description if provided
  let aiDescription = '';
  if (description && description.trim() !== '') {
    const descPrompt = `Translate this Dutch restaurant dish description to English:

Dutch Description: ${description}

Guidelines:
- Translate to natural, appetizing English
- Keep proper names as-is: "Carpaccio", "Merlot"
- Professional restaurant tone
- Make it sound delicious and appealing
- Do NOT include "Description:" or any other labels

Return ONLY the English description, nothing else.`;
    
    aiDescription = await generateAIDescriptionClientSide(descPrompt, 'en');
  }
  
  if (aiTitle) {
    return {
      title_en: aiTitle.trim(),
      description_en: aiDescription ? aiDescription.trim() : description || ''
    };
  }
  
  return { title_en: title, description_en: description };
}
