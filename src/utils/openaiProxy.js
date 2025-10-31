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
    ? `Write a natural, brief pairing description (1 sentence, max 15 words) for:
       
       Dish: ${dishName}
       Pairing: ${pairingSuggestion}
       
       Examples of GOOD descriptions:
       - "Perfect combination! This wine complements the dish beautifully!"
       - "Excellent choice! This pairing enhances the flavors perfectly!"
       
       Examples of BAD descriptions (too much weather/time):
       - "Perfect for a rainy autumn evening with neutral weather!"
       
       Be enthusiastic but natural. Focus on taste and pairing quality. NO EMOJIS - keep it clean and professional.`
    : `Schrijf een natuurlijke, korte pairing beschrijving (1 zin, max 15 woorden) voor:
       
       Gerecht: ${dishName}
       Pairing: ${pairingSuggestion}
       
       Voorbeelden van GOEDE beschrijvingen:
       - "Perfecte combinatie! Deze wijn smaakt heerlijk bij dit gerecht!"
       - "Uitstekende keuze! Deze pairing versterkt de smaken perfect!"
       
       Voorbeelden van SLECHTE beschrijvingen (teveel weer/tijd):
       - "Perfect voor een regenachtige herfstavond bij neutraal weer!"
       
       BELANGRIJK: Gebruik GEEN verkleinwoorden (hapje, drankje, etc.) - dit is een professioneel restaurant.
       
       Wees enthousiast maar natuurlijk. Focus op smaak en combinatie. GEEN EMOJIS - houd het schoon en professioneel.`;

  // Prefer secure server-side proxy in production
  const aiDescription = await generateAIDescriptionViaProxy(prompt, lang);
  
  // Save to cache (Sheets) for future use
  if (aiDescription && dishId) {
    try {
      await saveAIDescriptionToSheet(dishId, pairingSuggestion, aiDescription, lang);
      console.log(`� AI description saved to cache for ${dishId}`);
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
      hot_sunny: "Heerlijk verfrissend!",
      hot: "Perfect bij dit weer!",
      cold: "Lekker verwarmend!",
      rain: "Ideaal bij regen!",
      snow: "Winterse verwennerij!",
      clouds_warm: "Aangenaam bij bewolkt weer!",
      clouds_cool: "Verfrissend bij fris weer!",
      neutral: "Uitstekende keuze!"
    },
    en: {
      hot_sunny: "Wonderfully refreshing!",
      hot: "Perfect for this weather!",
      cold: "Nicely warming!",
      rain: "Ideal in the rain!",
      snow: "Winter treat!",
      clouds_warm: "Pleasant on cloudy weather!",
      clouds_cool: "Refreshing on cool weather!",
      neutral: "Excellent choice!"
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
       3. Sounds enthusiastic but not pushy
       4. NO EMOJIS - keep it clean and professional
       
       Examples:
       - "Perfectly refreshing for this weather!"
       - "Ideal for a cold evening!"
       - "Great choice for tonight!"`
    : `Gegeven deze context:
       - Pairing: ${pairingSuggestion}
       - Weer: ${weatherCategory} (${temp}°C)
       - Tijd: ${timeOfDay}
       - Seizoen: ${season}
       
       Genereer een KORTE commerciële hint (max 8 woorden) die:
       1. Natuurlijk aansluit bij de context
       2. Verlangen/urgentie creëert
       3. Enthousiast klinkt maar niet opdringerig
       4. GEEN verkleinwoorden gebruikt (dit is een professioneel restaurant)
       5. GEEN EMOJIS - houd het schoon en professioneel
       
       Voorbeelden:
       - "Heerlijk verfrissend bij dit weer!"
       - "Perfect voor een koude avond!"
       - "Ideale keuze voor vanavond!"`;

  try {
    const hint = await generateAIDescriptionViaProxy(prompt, lang);
    if (hint && hint.length > 0) {
      console.log(` AI context hint generated: ${hint}`);
      return hint;
    }
  } catch (error) {
    console.warn('Context hint generation failed, using fallback:', error);
  }

  // Fallback
  const fallback = fallbacks[lang][weatherCategory] || fallbacks[lang].neutral;
  console.log(` Using fallback hint: ${fallback}`);
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
  console.log(' generateAIDescriptionClientSide called with lang:', lang);
  
  // Get API key from environment variable (development only). No fallback key.
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  console.log('API Key check:', apiKey ? `Found (${apiKey.substring(0, 10)}...)` : 'NOT FOUND');
  
  if (!apiKey) {
    console.warn(' No OpenAI API key found');
    return null;
  }

  try {
    console.log('Calling OpenAI API directly...');
    console.log(' Prompt:', prompt.substring(0, 100) + '...');
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

    console.log(' OpenAI response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(' OpenAI API error response:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response data:', data);
    
    const result = data.choices[0]?.message?.content?.trim();
    console.log(' Generated text:', result);
    
    return result;
    
  } catch (error) {
    console.error(' Error calling OpenAI API:', error);
    console.error(' Error details:', error.message);
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
  console.log(' generateSmartUpsell called with:', {
    userTaste,
    weatherCategory,
    timeOfDay,
    season,
    lang,
    smartBubblesCount: smartBubblesData.length,
    smartBubblesData: smartBubblesData
  });
  
  // If no SmartBubbles data, use hardcoded menu items as fallback
  if (smartBubblesData.length === 0) {
    console.log(' No SmartBubbles data available, using hardcoded fallback menu items');
    
    // Hardcoded menu items (temporary until SmartBubbles sheet is ready)
    const hardcodedItems = lang === 'en' ? [
      { dish_name: "Carpaccio tenderloin", category: "food", price: "�� 7,50" },
      { dish_name: "Special beer", category: "drink", price: "�� 4,95" },
      { dish_name: "Cr�me brûlée", category: "dessert", price: "�� 6,50" },
      { dish_name: "French onion soup", category: "food", price: "�� 6,95" }
    ] : [
      { dish_name: "Carpaccio ossenhaas", category: "food", price: "�� 7,50" },
      { dish_name: "Speciaal biertje", category: "drink", price: "�� 4,95" },
      { dish_name: "Cr�me brûlée", category: "dessert", price: "�� 6,50" },
      { dish_name: "Franse uiensoep", category: "food", price: "�� 6,95" }
    ];
    
    smartBubblesData = hardcodedItems;
    console.log(' Using hardcoded items:', smartBubblesData.length, 'items');
  }
  
  const prompt = lang === 'en'
    ? `Generate a SHORT, friendly upsell suggestion (max 10 words) for Restaurant 't Tolhuis based on:
       
       Context: ${weatherCategory} weather (${temp}°C), ${timeOfDay}, ${season}
       User preference: ${userTaste}
       
       REAL MENU ITEMS FROM 'T TOLHUIS (use these keywords/dishes):
       ${smartBubblesData.length > 0 ? smartBubblesData.map(item => `- ${item.dish_name} - ${item.price} (${item.category})`).join('\n') : 'No specific items available'}
       
       Make it:
       - Subtle and non-pushy
       - Use KEYWORDS from menu items (e.g. "carpaccio", "cr�me brûlée", etc.)
       - ALWAYS MENTION THE PRICE - this is an offer!
       - Make it attractive but stay with real dishes
       - IMPORTANT: Consider time - no alcohol in morning/afternoon!
       - NO EMOJIS - keep it clean and professional
       
       Examples (creative with keywords + PRICE):
       If menu has "Carpaccio tenderloin - �� 7,50":
        "Try our carpaccio for only �� 7,50!"
        "Carpaccio tenderloin for �� 7,50!"
       
       If menu has "Special beer - �� 4,95":
        "Special beer for �� 4,95!"
        "Beer for �� 4,95?"
       
       IMPORTANT: Use the EXACT dish names from the menu items above!
       
       CRITICAL: Translate Dutch dish names to English:
       - "Carpaccio ossenhaas" � "Carpaccio tenderloin"
       - "Speciaal biertje" � "Special beer"
       - "Glas wijn" � "Glass of wine"
       
       GENERAL (if no match):
       "Our chef has something special today!"
       "Ask for our offers!"`
    : `Genereer een KORTE, vriendelijke upsell suggestie (max 10 woorden) voor Restaurant 't Tolhuis gebaseerd op:
       
       Context: ${weatherCategory} weer (${temp}°C), ${timeOfDay}, ${season}
       Gebruiker voorkeur: ${userTaste}
       
       ECHTE MENU ITEMS UIT 'T TOLHUIS (gebruik deze keywords/gerechten):
       ${smartBubblesData.length > 0 ? smartBubblesData.map(item => `- ${item.dish_name} - ${item.price} (${item.category})`).join('\n') : 'Geen specifieke items beschikbaar'}
       
       Maak het:
       - Subtiel en niet opdringerig
       - Gebruik de KEYWORDS uit de menu items (bijv. "carpaccio", "cr�me brûlée", etc.)
       - NOEM ALTIJD DE PRIJS - dit is een aanbieding!
       - Maak het aantrekkelijk en verleidelijk, maar blijf bij echte gerechten
       - BELANGRIJK: Houd rekening met tijd - geen alcohol in ochtend/middag!
       - Je MAG creatief zijn met de woorden, maar NIET nieuwe gerechten bedenken
       - GEEN EMOJIS - houd het schoon en professioneel
       
       Voorbeelden (creatief met keywords + PRIJS):
       Als menu heeft "Carpaccio ossenhaas - �� 7,50":
        "Carpaccio ossenhaas voor �� 7,50!"
        "Probeer onze carpaccio voor slechts �� 7,50!"
        "Probeer onze fruitsalade!" (NIET - staat niet in menu)
       
       Als menu heeft "Speciaal biertje - �� 4,95":
        "Speciaal biertje voor �� 4,95!"
        "Biertje erbij voor �� 4,95?"
       
       Als menu heeft "Cr�me brûlée - �� 6,50":
        "Cr�me brûlée voor �� 6,50 als afsluiter?"
        "Zoete afsluiter voor �� 6,50!"
       
       ALGEMEEN (als geen match):
       "Onze chef heeft vandaag iets speciaals!"
       "Vraag naar onze aanbiedingen!"`;

  try {
    const upsellMessage = await generateAIDescriptionViaProxy(prompt, lang);
    if (upsellMessage && upsellMessage.length > 0) {
      console.log(` Smart upsell generated: ${upsellMessage}`);
      return upsellMessage;
    }
  } catch (error) {
    console.warn('Smart upsell generation failed:', error);
  }

  // If AI failed, return contextual fallback based on time and weather
  console.log(' AI generation failed, using contextual fallback');
  
  if (lang === 'en') {
    const englishFallbacks = {
      morning: "Try our breakfast special!",
      afternoon: "Perfect lunch option available!", 
      evening: "Evening specials await!",
      rainy: "Cozy indoor dining!",
      sunny: "Perfect terrace weather!",
      autumn: "Autumn flavors available!",
      winter: "Warm winter dishes!",
      spring: "Fresh spring menu!",
      summer: "Refreshing summer options!"
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
    
    return "Our chef has something special today!";
  } else {
    const dutchFallbacks = {
      morning: "Probeer ons ontbijt!",
      afternoon: "Perfecte lunch optie beschikbaar!",
      evening: "Avond specials wachten!", 
      rainy: "Gezellig binnen dineren!",
      sunny: "Perfect terras weer!",
      autumn: "Herfst smaken beschikbaar!",
      winter: "Warme winter gerechten!",
      spring: "Verse lente menu!",
      summer: "Verfrissende zomer opties!"
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
    
    return "Onze chef heeft vandaag iets speciaals!";
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
    'Cr�me brûlée': 'Cr�me Brûlée',
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
    'Friet': 'Fries',
    'Aardappelen': 'Potatoes',
    'Rijst': 'Rice',
    'Pasta': 'Pasta',
    'Salade': 'Salad',
    'Soep': 'Soup',
    'Dessert': 'Dessert'
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
"Franse uiensoep" � "French Onion Soup"
"Biefstuk Tolhuis" � "Tolhuis Steak"
"Salade van de maand" � "Salad of the Month"
"Hap van het seizoen" � "Seasonal Dish"

Translate ONLY the title: ${title}`;

  const aiTitle = await generateAIDescriptionViaProxy(prompt, 'en');
  
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
    
    aiDescription = await generateAIDescriptionViaProxy(descPrompt, 'en');
  }
  
  if (aiTitle) {
    return {
      title_en: aiTitle.trim(),
      description_en: aiDescription ? aiDescription.trim() : description || ''
    };
  }
  
  return { title_en: title, description_en: description };
}
