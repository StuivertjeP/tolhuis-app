/**
 * OpenAI Proxy Service
 * Handles OpenAI API calls server-side to keep API key secure
 * Falls back to client-side if proxy is not available
 */

import { saveAIDescriptionToSheet } from '../services/sheetsService';

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
    ? `Write a very short pairing description (1 sentence, max 15 words) for:
       
       Dish: ${dishName}
       Pairing: ${pairingSuggestion}
       
       Be brief and enthusiastic. Add a relevant emoji at the end.`
    : `Schrijf een heel korte pairing beschrijving (1 zin, max 15 woorden) voor:
       
       Gerecht: ${dishName}
       Pairing: ${pairingSuggestion}
       
       Wees kort en enthousiast. Voeg een relevante emoji toe aan het einde.`;

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
  // TEMPORARY: Direct API key for testing (CHANGE THIS BEFORE PRODUCTION!)
  const apiKey = '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';
  
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
