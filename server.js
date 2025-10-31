const express = require("express");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Proxy endpoint for client-side calls (format: { prompt, lang })
app.post("/api/openai", async (req, res) => {
  try {
    const { prompt, lang } = req.body;
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ error: errorData.error?.message || 'OpenAI API error' });
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content?.trim() || '';
    
    res.json({ description });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: "Er is iets misgegaan met de OpenAI API" });
  }
});

// Legacy endpoint for backward compatibility
app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Er is iets misgegaan met de OpenAI API" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
