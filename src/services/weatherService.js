/**
 * Weather Service
 * Handles weather data, seasons, time of day, and context-aware messaging
 */

const OPENWEATHER_API_KEY = 'your_openweather_api_key_here'; // Replace with actual key
const HILVERSUM_COORDS = { lat: 52.2237, lon: 5.1764 };

let weatherCache = null;
let weatherCacheTime = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Get current weather for Hilversum
 * @returns {Promise<Object|null>} Weather data or null if failed
 */
export async function getCurrentWeather() {
  // Return cached weather if still valid
  if (weatherCache && weatherCacheTime && (Date.now() - weatherCacheTime) < CACHE_DURATION) {
    console.log('🌤️ Using cached weather data');
    return weatherCache;
  }

  try {
    console.log('🌤️ Fetching fresh weather data...');
    
    // For demo purposes, return mock weather data
    // In production, replace with actual OpenWeather API call
    const mockWeather = {
      city: "Hilversum",
      condition: "clouds",
      description: "zeer lichte bewolking",
      feels_like: 14,
      humidity: 87,
      icon: "02n",
      temp: 14,
      wind_speed: 2
    };

    weatherCache = mockWeather;
    weatherCacheTime = Date.now();
    
    console.log('🌤️ Weather loaded:', mockWeather);
    return mockWeather;
    
  } catch (error) {
    console.warn('⚠️ Weather fetch failed:', error);
    return null;
  }
}

/**
 * Get weather category based on condition and temperature
 * @param {Object} weather - Weather object
 * @returns {string} Weather category
 */
export function getWeatherCategory(weather = null) {
  if (!weather) return 'neutral';
  
  const condition = weather.condition?.toLowerCase() || '';
  const temp = weather.temp || 15;
  
  // Clear weather
  if (condition.includes('clear') || condition.includes('sunny')) {
    return temp > 20 ? 'sunny_warm' : 'sunny_cool';
  }
  
  // Rainy weather
  if (condition.includes('rain') || condition.includes('drizzle')) {
    return temp > 15 ? 'rain_warm' : 'rain_cool';
  }
  
  // Cloudy weather
  if (condition.includes('cloud') || condition.includes('overcast')) {
    return temp > 18 ? 'clouds_warm' : 'clouds_cool';
  }
  
  // Snowy weather
  if (condition.includes('snow') || condition.includes('sleet')) {
    return 'snow';
  }
  
  return 'neutral';
}

/**
 * Get current season based on date
 * @returns {string} Current season
 */
export function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  
  if (month >= 3 && month <= 5) return 'lente';
  if (month >= 6 && month <= 8) return 'zomer';
  if (month >= 9 && month <= 11) return 'herfst';
  return 'winter';
}

/**
 * Get time of day based on current hour
 * @returns {string} Time of day
 */
export function getTimeOfDay() {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 11) return 'ochtend';
  if (hour >= 11 && hour < 17) return 'middag';
  if (hour >= 17 && hour < 22) return 'avond';
  return 'nacht';
}

/**
 * Generate context-aware welcome message
 * @param {Object} weather - Weather data
 * @param {string} season - Current season
 * @param {string} timeOfDay - Current time of day
 * @param {string} lang - Language ('nl' or 'en')
 * @returns {string} Welcome message
 */
export function getWelcomeMessage(weather = null, season = 'herfst', timeOfDay = 'avond', lang = 'nl') {
  const weatherCategory = getWeatherCategory(weather);
  
  if (lang === 'en') {
    // English welcome messages
    if (timeOfDay === 'ochtend') {
      const morningMessages = [
        "Good morning! Great to see you! ☀️",
        "Morning! Welcome to 't Tolhuis! 🌅",
        "Good morning! Ready for breakfast? 🥐"
      ];
      return morningMessages[Math.floor(Math.random() * morningMessages.length)];
    }
    
    if (timeOfDay === 'middag') {
      const afternoonMessages = [
        "Good afternoon! Great to see you! 🌤️",
        "Afternoon! Welcome to 't Tolhuis! ☀️",
        "Good afternoon! Ready for lunch? 🍽️"
      ];
      return afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
    }
    
    // Weather and season-based messages for evening/night
    if (weatherCategory === 'sunny_warm') {
      const sunnyMessages = [
        "What lovely sunny weather! Great to see you! ☀️",
        "Perfect sunny day! Welcome to 't Tolhuis! 🌞",
        "Beautiful weather! Great to see you! ☀️"
      ];
      return sunnyMessages[Math.floor(Math.random() * sunnyMessages.length)];
    }
    
    if (weatherCategory === 'rain_cool' || weatherCategory === 'rain_warm') {
      const rainyMessages = [
        "Perfect weather for staying inside! Great to see you! 🌧️",
        "Cozy rainy day! Welcome to 't Tolhuis! ☔",
        "Rainy weather calls for good food! Great to see you! 🌧️"
      ];
      return rainyMessages[Math.floor(Math.random() * rainyMessages.length)];
    }
    
    if (season === 'herfst' && weatherCategory === 'clouds_cool') {
      const autumnMessages = [
        "Autumn evening! Great to see you! 🍂",
        "Cozy autumn atmosphere! Welcome! 🍁",
        "Perfect autumn weather! Great to see you! 🍂"
      ];
      return autumnMessages[Math.floor(Math.random() * autumnMessages.length)];
    }
    
    if (season === 'winter') {
      const winterMessages = [
        "Cozy winter evening! Great to see you! ❄️",
        "Perfect winter weather! Welcome! 🧊",
        "Winter vibes! Great to see you! ❄️"
      ];
      return winterMessages[Math.floor(Math.random() * winterMessages.length)];
    }
    
    if (season === 'zomer') {
      const summerMessages = [
        "Lovely summer evening! Great to see you! 🌻",
        "Perfect summer weather! Welcome! ☀️",
        "Summer vibes! Great to see you! 🌞"
      ];
      return summerMessages[Math.floor(Math.random() * summerMessages.length)];
    }
    
    // Default English
    const defaultMessages = [
      "Great to see you! ✨",
      "Welcome to 't Tolhuis! 🌟",
      "Good to have you here! ✨"
    ];
    return defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
  }
  
  // Dutch welcome messages (original logic with more variety)
  if (timeOfDay === 'ochtend') {
    const morningMessages = [
      "Goedemorgen! Fijn dat je er bent! ☀️",
      "Morgen! Welkom bij 't Tolhuis! 🌅",
      "Goedemorgen! Klaar voor het ontbijt? 🥐"
    ];
    return morningMessages[Math.floor(Math.random() * morningMessages.length)];
  }
  
  if (timeOfDay === 'middag') {
    const afternoonMessages = [
      "Goedemiddag! Fijn dat je er bent! 🌤️",
      "Middag! Welkom bij 't Tolhuis! ☀️",
      "Goedemiddag! Klaar voor de lunch? 🍽️"
    ];
    return afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
  }
  
  // Weather and season-based messages for evening/night
  if (weatherCategory === 'sunny_warm') {
    const sunnyMessages = [
      "Wat een heerlijk zonnig weer! Fijn dat je er bent! ☀️",
      "Perfect zonnig weer! Welkom bij 't Tolhuis! 🌞",
      "Prachtig weer! Fijn dat je er bent! ☀️",
      "Zonnetje schijnt! Fijn dat je er bent! ☀️",
      "Heerlijk zonnig! Welkom! 🌅"
    ];
    return sunnyMessages[Math.floor(Math.random() * sunnyMessages.length)];
  }
  
  if (weatherCategory === 'rain_cool' || weatherCategory === 'rain_warm') {
    const rainyMessages = [
      "Perfect weer voor binnen zitten! Fijn dat je er bent! 🌧️",
      "Gezellige regendag! Welkom bij 't Tolhuis! ☔",
      "Regenweer vraagt om lekker eten! Fijn dat je er bent! 🌧️",
      "Regenachtig weer! Fijn dat je er bent! ☔",
      "Gezellig binnen! Welkom! 🌧️"
    ];
    return rainyMessages[Math.floor(Math.random() * rainyMessages.length)];
  }
  
  if (season === 'herfst' && weatherCategory === 'clouds_cool') {
    const autumnMessages = [
      "Herfstachtige avond! Fijn dat je er bent! 🍂",
      "Gezellige herfstsfeer! Welkom! 🍁",
      "Perfect herfstweer! Fijn dat je er bent! 🍂",
      "Herfstgevoel! Fijn dat je er bent! 🍃",
      "Gezellige herfstavond! Welkom! 🍂"
    ];
    return autumnMessages[Math.floor(Math.random() * autumnMessages.length)];
  }
  
  if (season === 'winter') {
    const winterMessages = [
      "Gezellige winteravond! Fijn dat je er bent! ❄️",
      "Perfect winterweer! Welkom! 🧊",
      "Wintergevoel! Fijn dat je er bent! ❄️"
    ];
    return winterMessages[Math.floor(Math.random() * winterMessages.length)];
  }
  
  if (season === 'zomer') {
    const summerMessages = [
      "Heerlijke zomeravond! Fijn dat je er bent! 🌻",
      "Perfect zomerweer! Welkom! ☀️",
      "Zomervibes! Fijn dat je er bent! 🌞"
    ];
    return summerMessages[Math.floor(Math.random() * summerMessages.length)];
  }
  
  // Default Dutch
  const defaultMessages = [
    "Fijn dat je er bent! ✨",
    "Welkom bij 't Tolhuis! 🌟",
    "Goed dat je er bent! ✨",
    "Fijn dat je er bent! 🌟",
    "Welkom! Fijn dat je er bent! ✨"
  ];
  return defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
}

/**
 * Clear weather cache
 */
export function clearWeatherCache() {
  weatherCache = null;
  weatherCacheTime = null;
  console.log('🔄 Weather cache cleared');
}
