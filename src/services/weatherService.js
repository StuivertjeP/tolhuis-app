/**
 * Weather Service
 * Handles weather data fetching with geolocation support
 */

const OPENWEATHER_API_KEY = '4d8fb5b93d4af21d66a2948710284366'; // Free tier API key
const HILVERSUM_COORDS = { lat: 52.2242, lon: 5.1758 }; // Fallback location

// Cache voor weather data (5 minuten)
let weatherCache = { data: null, timestamp: null, ttl: 300000 };

/**
 * Get user's location via browser geolocation API
 * Falls back to Hilversum if denied/unavailable
 */
async function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log('🌍 Geolocation not supported, using Hilversum');
      resolve(HILVERSUM_COORDS);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 User location detected:', position.coords.latitude, position.coords.longitude);
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        console.log('📍 Geolocation denied/failed, using Hilversum:', error.message);
        resolve(HILVERSUM_COORDS);
      },
      { timeout: 5000, maximumAge: 300000 } // 5s timeout, cache 5 min
    );
  });
}

/**
 * Fetch weather data from OpenWeather API
 */
async function fetchWeatherData(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=nl`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      condition: data.weather[0].main.toLowerCase(), // clear, clouds, rain, snow, etc.
      description: data.weather[0].description,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed),
      city: data.name,
      icon: data.weather[0].icon
    };
  } catch (error) {
    console.error('❌ Weather API error:', error);
    return null;
  }
}

/**
 * Get current weather with caching
 */
export async function getCurrentWeather() {
  // Check cache
  if (weatherCache.data && weatherCache.timestamp) {
    const now = Date.now();
    if (now - weatherCache.timestamp < weatherCache.ttl) {
      console.log('🌤️ Using cached weather data');
      return weatherCache.data;
    }
  }

  console.log('🌤️ Fetching fresh weather data...');
  
  // Get location
  const location = await getUserLocation();
  
  // Fetch weather
  const weather = await fetchWeatherData(location.lat, location.lon);
  
  if (weather) {
    weatherCache.data = weather;
    weatherCache.timestamp = Date.now();
    console.log('🌤️ Weather data cached:', weather);
    return weather;
  }

  // Fallback weather (neutral)
  return {
    temp: 15,
    feels_like: 15,
    condition: 'clouds',
    description: 'bewolkt',
    humidity: 70,
    wind_speed: 10,
    city: 'Hilversum',
    icon: '03d'
  };
}

/**
 * Get weather category for context hints
 */
export function getWeatherCategory(weather) {
  if (!weather) return 'neutral';
  
  const temp = weather.temp;
  const condition = weather.condition;
  
  // Hot & sunny
  if (temp >= 25 && condition === 'clear') return 'hot_sunny';
  
  // Hot (any condition)
  if (temp >= 22) return 'hot';
  
  // Cold
  if (temp < 8) return 'cold';
  
  // Rain
  if (condition === 'rain' || condition === 'drizzle') return 'rain';
  
  // Snow
  if (condition === 'snow') return 'snow';
  
  // Clouds (more specific)
  if (condition === 'clouds') {
    if (temp >= 15) return 'clouds_warm';
    if (temp < 12) return 'clouds_cool';
  }
  
  // Default
  return 'neutral';
}

/**
 * Get current season
 */
export function getCurrentSeason() {
  const month = new Date().getMonth(); // 0-11
  
  if (month >= 2 && month <= 4) return 'lente'; // maart-mei
  if (month >= 5 && month <= 7) return 'zomer'; // juni-augustus
  if (month >= 8 && month <= 10) return 'herfst'; // september-november
  return 'winter'; // december-februari
}

/**
 * Get time of day
 */
export function getTimeOfDay() {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) return 'ochtend';
  if (hour >= 12 && hour < 18) return 'middag';
  if (hour >= 18 && hour < 22) return 'avond';
  return 'nacht';
}

/**
 * Get context-aware welcome message
 */
export function getWelcomeMessage(weatherCategory, season, timeOfDay, lang = 'nl') {
  // Context-aware messages for dramatic weather/special moments
  const contextMessages = {
    nl: {
      rain: ['Wat een weer hè? 🌧️ Fijn dat je er bent!', 'Heerlijk binnen zitten! ☔'],
      snow: ['Wat een winterweer! ❄️ Welkom!', 'Gezellig knus binnen! ⛄'],
      cold: ['Lekker warm binnen! 🔥', 'Kom er lekker bij! ❄️'],
      hot_sunny: ['Perfecte dag voor op het terras! ☀️', 'Wat een heerlijk weer! 🌞'],
      hot: ['Lekker verfrissend bij ons! 🌤️', 'Tijd voor iets kouds! 🧊'],
      clouds_cool: season === 'herfst' ? ['Herfstachtig he? 🍂 Welkom!', 'Typisch herfstweer! 🍁'] : ['Fijn dat je er bent! ☁️'],
    },
    en: {
      rain: ['What weather huh? 🌧️ Great to see you!', 'Nice to be inside! ☔'],
      snow: ['What winter weather! ❄️ Welcome!', 'Cozy inside! ⛄'],
      cold: ['Nice and warm inside! 🔥', 'Come warm up! ❄️'],
      hot_sunny: ['Perfect day for the terrace! ☀️', 'What lovely weather! 🌞'],
      hot: ['Nice and refreshing here! 🌤️', 'Time for something cold! 🧊'],
      clouds_cool: season === 'herfst' ? ['Autumn vibes! 🍂 Welcome!', 'Typical autumn weather! 🍁'] : ['Great to see you! ☁️'],
    }
  };
  
  // Default welcome messages
  const defaultMessages = {
    nl: ['Fijn dat je er bent! ✨', 'Welkom bij \'t Tolhuis! 🌟', 'Goed je te zien! 👋'],
    en: ['Great to see you! ✨', 'Welcome to \'t Tolhuis! 🌟', 'Good to see you! 👋']
  };
  
  // Check if we have context-specific messages
  const messages = contextMessages[lang][weatherCategory];
  
  if (messages && messages.length > 0) {
    // Return random context-aware message
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Return random default message
  const defaults = defaultMessages[lang];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

/**
 * Clear weather cache (for testing)
 */
export function clearWeatherCache() {
  weatherCache.data = null;
  weatherCache.timestamp = null;
  console.log('🌤️ Weather cache cleared');
}
