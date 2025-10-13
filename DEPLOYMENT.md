# Deployment Guide - API Key Security

## 🚨 IMPORTANT: API Key Security

**NEVER commit your API key to git or expose it in the browser!**

## 🔒 Secure Deployment Options

### Option 1: Vercel (Recommended)
1. **Remove API key from .env** before deploying
2. **Add environment variable in Vercel dashboard:**
   - `OPENAI_API_KEY` = your_api_key_here
3. **Create serverless function** at `/api/openai.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, lang } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
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

    const data = await response.json();
    res.status(200).json({ description: data.choices[0]?.message?.content?.trim() });
  } catch (error) {
    res.status(500).json({ error: 'OpenAI API error' });
  }
}
```

### Option 2: Netlify
Similar to Vercel, use environment variables and serverless functions.

### Option 3: Development Only
For local development, the current setup is fine, but remember:
- **API key is visible in browser** (check DevTools > Sources)
- **Only use for development**
- **Never deploy with REACT_APP_OPENAI_API_KEY**

## 🛡️ Security Best Practices

1. **Use environment variables** for production
2. **Server-side proxy** for API calls
3. **Rate limiting** to prevent abuse
4. **API key rotation** regularly
5. **Monitor usage** and costs

## 💰 Cost Management

- **GPT-3.5-turbo**: ~$0.001-0.002 per description
- **Rate limiting**: Max 60 requests/minute
- **Caching**: Prevents duplicate calls
- **Fallback**: Templates if API fails

## 🔧 Current Status

- ✅ **Development**: API key in .env (visible in browser - OK for dev)
- ⚠️ **Production**: Needs server-side proxy
- ✅ **Fallback**: Templates if API unavailable
- ✅ **Caching**: Prevents duplicate calls
