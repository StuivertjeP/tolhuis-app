import { generateAIDescriptionViaProxy } from "../utils/openaiProxy.js";

/**
 * Context Service
 * Generates contextual information for personalized experiences
 */

/**
 * Gets current time context
 */
export function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 6 && hour < 12) {
    return {
      period: 'ochtend',
      period_en: 'morning',
      greeting: 'Goedemorgen',
      greeting_en: 'Good morning',
      context: 'Perfect moment voor een ontbijt of vroege lunch',
      context_en: 'Perfect time for breakfast or early lunch',
      emoji: '🌅'
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      period: 'middag',
      period_en: 'afternoon',
      greeting: 'Goedemiddag',
      greeting_en: 'Good afternoon',
      context: 'Ideale tijd voor een uitgebreide lunch op het terras',
      context_en: 'Perfect time for an extended lunch on the terrace',
      emoji: '☀️'
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      period: 'avond',
      period_en: 'evening',
      greeting: 'Goedenavond',
      greeting_en: 'Good evening',
      context: 'Tijd voor een heerlijk diner en gezelligheid',
      context_en: 'Time for a delicious dinner and coziness',
      emoji: '🌆'
    };
  } else {
    return {
      period: 'nacht',
      period_en: 'night',
      greeting: 'Goedenavond',
      greeting_en: 'Good evening',
      context: 'Laat diner of late night snacks',
      context_en: 'Late dinner or late night snacks',
      emoji: '🌙'
    };
  }
}

/**
 * Gets seasonal context
 */
export function getSeasonalContext() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  
  // Kerst periode (december)
  if (month === 12) {
    if (day >= 20 && day <= 26) {
      return {
        season: 'kerst',
        season_en: 'christmas',
        message: '🎄 Vrolijk Kerstfeest! Geniet van onze speciale kerstmenu\'s',
        message_en: '🎄 Merry Christmas! Enjoy our special Christmas menus',
        special: true
      };
    }
  }
  
  // Nieuwjaar (januari)
  if (month === 1 && day <= 7) {
    return {
      season: 'nieuwjaar',
      season_en: 'new year',
      message: '🥂 Gelukkig Nieuwjaar! Ontdek onze nieuwe gerechten',
      message_en: '🥂 Happy New Year! Discover our new dishes',
      special: true
    };
  }
  
  // Valentijnsdag
  if (month === 2 && day >= 10 && day <= 16) {
    return {
      season: 'valentijn',
      season_en: 'valentine',
      message: '💕 Romantisch dineren? Onze chef heeft speciale gerechten bereid',
      message_en: '💕 Romantic dinner? Our chef has prepared special dishes',
      special: true
    };
  }
  
  // Pasen
  if (month === 3 || month === 4) {
    const easterDate = getEasterDate(now.getFullYear());
    const easterRange = new Date(easterDate);
    easterRange.setDate(easterDate.getDate() - 7);
    
    if (now >= easterRange && now <= new Date(easterDate.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return {
        season: 'pasen',
        season_en: 'easter',
        message: '🐰 Vrolijk Pasen! Proef onze lente specialiteiten',
        message_en: '🐰 Happy Easter! Taste our spring specialties',
        special: true
      };
    }
  }
  
  // Zomer (juni-augustus)
  if (month >= 6 && month <= 8) {
    return {
      season: 'zomer',
      season_en: 'summer',
      message: '☀️ Zomerse sfeer! Perfect weer voor een terras moment',
      message_en: '☀️ Summer vibes! Perfect weather for a terrace moment',
      special: false
    };
  }
  
  // Herfst (september-november)
  if (month >= 9 && month <= 11) {
    return {
      season: 'herfst',
      season_en: 'autumn',
      message: '🍂 Herfstgevoel! Warme gerechten voor koude dagen',
      message_en: '🍂 Autumn feeling! Warm dishes for cold days',
      special: false
    };
  }
  
  // Winter (december-februari)
  if (month === 12 || month <= 2) {
    return {
      season: 'winter',
      season_en: 'winter',
      message: '❄️ Wintergevoel! Verwarmende gerechten en warme dranken',
      message_en: '❄️ Winter feeling! Warming dishes and hot drinks',
      special: false
    };
  }
  
  return {
    season: 'lente',
    season_en: 'spring',
    message: '🌸 Lente in de lucht! Verse ingrediënten en lichte gerechten',
    message_en: '🌸 Spring in the air! Fresh ingredients and light dishes',
    special: false
  };
}

/**
 * Gets weather context (mock for now, can be extended with real weather API)
 */
export function getWeatherContext() {
  // For now, we'll use a simple mock based on season
  const season = getSeasonalContext();
  
  if (season.season === 'zomer') {
    return {
      weather: 'zonnig',
      weather_en: 'sunny',
      temp: '25°C',
      message: 'Perfect terrasweer vandaag!',
      message_en: 'Perfect terrace weather today!',
      emoji: '☀️'
    };
  } else if (season.season === 'winter') {
    return {
      weather: 'koud',
      weather_en: 'cold',
      temp: '5°C',
      message: 'Lekker warm binnen zitten vandaag',
      message_en: 'Nice and warm inside today',
      emoji: '❄️'
    };
  } else {
    return {
      weather: 'mild',
      weather_en: 'mild',
      temp: '15°C',
      message: 'Aangenaam weer voor een bezoek',
      message_en: 'Pleasant weather for a visit',
      emoji: '🌤️'
    };
  }
}

/**
 * Generates AI-powered contextual intro
 */
export async function generateContextualIntro(lang = 'nl', userName = '') {
  try {
    const timeContext = getTimeContext();
    const seasonalContext = getSeasonalContext();
    const weatherContext = getWeatherContext();
    
    // Build context prompt
    const contextInfo = {
      time: lang === 'nl' ? timeContext.period : timeContext.period_en,
      greeting: lang === 'nl' ? timeContext.greeting : timeContext.greeting_en,
      season: lang === 'nl' ? seasonalContext.season : seasonalContext.season_en,
      weather: lang === 'nl' ? weatherContext.weather : weatherContext.weather_en,
      userName: userName || ''
    };
    
    const prompt = buildIntroPrompt(contextInfo, lang);
    
    // Try to get AI-generated intro
    const aiIntro = await generateAIIntro(prompt, lang);
    
    if (aiIntro) {
      return {
        greeting: aiIntro.greeting,
        message: aiIntro.message,
        emoji: aiIntro.emoji,
        source: 'ai'
      };
    }
    
    // Fallback to template-based intro
    return generateTemplateIntro(timeContext, seasonalContext, weatherContext, lang, userName);
    
  } catch (error) {
    console.error('Error generating contextual intro:', error);
    return generateTemplateIntro(getTimeContext(), getSeasonalContext(), getWeatherContext(), lang, userName);
  }
}

/**
 * Builds prompt for AI intro generation
 */
function buildIntroPrompt(context, lang) {
  if (lang === 'en') {
    return `Create a warm, welcoming intro for a restaurant app based on this context:
    
    TIME: ${context.time}
    GREETING: ${context.greeting}
    SEASON: ${context.season}
    WEATHER: ${context.weather}
    USER: ${context.userName}
    
    Write a short, friendly greeting (max 40 words) that incorporates the time, season, and weather context. Make it feel personal and inviting. Include an appropriate emoji.`;
  } else {
    return `Maak een warme, welkomende intro voor een restaurant app gebaseerd op deze context:
    
    TIJD: ${context.time}
    GROET: ${context.greeting}
    SEIZOEN: ${context.season}
    WEER: ${context.weather}
    GEBRUIKER: ${context.userName}
    
    Schrijf een korte, vriendelijke groet (max 40 woorden) die de tijd, het seizoen en het weer verwerkt. Maak het persoonlijk en uitnodigend. Voeg een passende emoji toe.`;
  }
}

/**
 * Generates AI intro via OpenAI API
 */
async function generateAIIntro(prompt, lang) {
  try {
    const aiText = await generateAIDescriptionViaProxy(prompt, lang);
    
    if (!aiText) {
      return null;
    }
    
    // Parse AI response (simple parsing)
    const lines = aiText.split('\n').filter(line => line.trim());
    const emoji = lines.find(line => /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(line)) || '🍽️';
    const text = lines.find(line => !/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(line)) || aiText;
    
    return {
      greeting: text.split(' ').slice(0, 3).join(' '),
      message: text,
      emoji: emoji,
      source: 'ai'
    };
    
  } catch (error) {
    console.error('Error calling OpenAI for intro:', error);
    return null;
  }
}

/**
 * Fallback template-based intro
 */
function generateTemplateIntro(timeContext, seasonalContext, weatherContext, lang, userName) {
  const name = userName ? `, ${userName}` : '';
  const greeting = lang === 'nl' ? timeContext.greeting : timeContext.greeting_en;
  
  let message = '';
  let emoji = timeContext.emoji;
  
  if (seasonalContext.special) {
    message = lang === 'nl' ? seasonalContext.message : seasonalContext.message_en;
    emoji = seasonalContext.season === 'kerst' ? '🎄' : 
            seasonalContext.season === 'nieuwjaar' ? '🥂' :
            seasonalContext.season === 'valentijn' ? '💕' : '🐰';
  } else {
    const timeMsg = lang === 'nl' ? timeContext.context : timeContext.context_en;
    const weatherMsg = lang === 'nl' ? weatherContext.message : weatherContext.message_en;
    message = `${timeMsg}. ${weatherMsg}`;
  }
  
  return {
    greeting: `${greeting}${name}`,
    message: message,
    emoji: emoji,
    source: 'template'
  };
}

/**
 * Helper function to calculate Easter date
 */
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;
  
  return new Date(year, n - 1, p + 1);
}
