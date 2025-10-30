import React, { useEffect, useMemo, useRef, useState } from "react";
import { translateDish as translateDishService, translateCategory as translateCategoryService } from './utils/translationService.js';

/**
 * QR � AI-Guided Menu (single-file demo)
 * Flow: Intro (belevingstekst) � Mini-quiz (diet � taste � name) � WhatsApp opt-in � Menu
 * Notes:
 * - Pairings are suggest-only (toast), no ordering in-app
 * - NL/EN switch in Hero on menu page
 * - Belevingstekst roteert per app-start (1 tekst per bezoek)
 * - Fixed footer op intro/quiz/opt-in; dunne lijn-footer op menu
 * - Sticky smaakfilters onder de hero
 */

/********************
 * i18n (NL & EN)
 ********************/
const i18n = {
  nl: {
    intro: "Welkom bij 't Tolhuis",
    name: "Even voorstellen. Wat is je naam?",
    dietary: "Wat eet je graag?",
    taste: "Waar heb je zin in?",
    next: "Volgende",
    back: "Terug",
    seeMenu: "Bekijk jouw menu",
    weekSpecial: "Weekspecial",
    fullMenu: "Hele kaart",
    loading: "Even geduld...",
    pairings: "Aanbevolen",
    stepXof4: (x) => `Stap ${x} van 3`,
    typeLabel: (t) => ({ main: "Hoofdgerecht", starter: "Voorgerecht", dessert: "Dessert", side: "Bijgerecht", ontbijt: "Ontbijt", lunch: "Lunch", voorgerecht: "Voorgerecht", diner: "Hoofdgerecht", borrel: "Borrel", drank: "Drank", vlees: "Hoofdgerecht", vis: "Hoofdgerecht", vega: "Hoofdgerecht", salade: "Hoofdgerecht", soep: "Voorgerecht" })[t] || "Gerecht",
    simpleCategoryLabel: (category, section, type, isWeek) => {
      // Debug: log alle waarden
      console.log('� Category Label Debug:', { category, section, type, isWeek });
      
      // Weekmenu items zijn altijd Hoofdgerecht!
      if (isWeek) {
        console.log(' Weekmenu item detected, using: Hoofdgerecht');
        return "Hoofdgerecht";
      }
      
      // Eerste prioriteit: gebruik category kolom uit Google Sheets (kolom H) DIRECT
      if (category) {
        console.log(' Using category directly:', category);
        return category;
      }
      
      // Tweede prioriteit: section kolom uit Google Sheets (kolom C) DIRECT
      if (section) {
        console.log(' Using section directly:', section);
        return section;
      }
      
      // Derde prioriteit: type kolom DIRECT
      if (type) {
        console.log(' Using type directly:', type);
        return type;
      }
      
      console.log(' No value found, using fallback: Gerecht');
      return "Gerecht";
    },
    translateCategory: (category) => {
      return translateCategoryService(category, 'en');
    },
    orderHandOff: "Geef je bestelling door aan één van onze collega's.",
    pairingChip: (suggestion) => suggestion || 'Glas wijn',
    personalWithName: (name) => `${name}, hier is jouw persoonlijke selectie`,
    personalGeneric: "Hier is jouw persoonlijke selectie",
    langShort: "NL",
    // WhatsApp opt-in copy
    whatsappOptTitle: (name) => `Hi ${name || ''},`,
    whatsappOptBody: (choiceText) => `Steeds meer gasten kiezen ook voor ${choiceText || 'hun favoriet'}`,
    whatsappOptSmall: "Wil je af en toe op de hoogte worden gehouden van ons weekmenu of events? Vul dan hier je telefoonnummer in.",
    phonePlaceholder: "Jouw telefoonnummer",
    agreeWhatsApp: "Ik ga akkoord met WhatsApp updates. Afmelden is makkelijk: stuur STOP via WhatsApp en we stoppen met het versturen van een bericht.",
    // Pickers
    tastes: [
      { label: "✨ Licht & Fris", code: "light_fresh" },
      { label: "🍲 Rijk & Hartig", code: "rich_hearty" },
      { label: "🌟 Verrassend & Vol", code: "surprising_full" },
    ],
    diets: [
      { key: "meat", label: "🥩 Vlees" },
      { key: "fish", label: "🐟 Vis" },
      { key: "veg", label: "🥬 Vegetarisch" },
    ],
    // Menu filters
    menuFilters: {
      vegetarian: "🥬 Vegetarisch",
      glutenFree: "🌾 Glutenvrij"
    }
  },
  en: {
    intro: "Welcome to 't Tolhuis",
    name: "Introduce yourself. What's your name?",
    dietary: "What do you like to eat?",
    taste: "What are you in the mood for?",
    next: "Next",
    back: "Back",
    seeMenu: "See your menu",
    weekSpecial: "Special of the week",
    fullMenu: "Full menu",
    loading: "One moment...",
    pairings: "Recommended",
    stepXof4: (x) => `Step ${x} of 3`,
    typeLabel: (t) => ({ main: "Main course", starter: "Starter", dessert: "Dessert", side: "Side dish", ontbijt: "Breakfast", lunch: "Lunch", voorgerecht: "Starter", diner: "Main course", borrel: "Snacks", drank: "Drink", vlees: "Main course", vis: "Main course", vega: "Main course", salade: "Main course", soep: "Starter" })[t] || "Dish",
    simpleCategoryLabel: (category, section, type, isWeek) => {
      // Debug: log alle waarden
      console.log('� Category Label Debug (EN):', { category, section, type, isWeek });
      
      // Weekmenu items zijn altijd Main course!
      if (isWeek) {
        console.log(' Weekmenu item detected (EN), using: Main course');
        return "Main course";
      }
      
      // Eerste prioriteit: gebruik category kolom uit Google Sheets (kolom H) DIRECT
      if (category) {
        console.log(' Using category directly (EN):', category);
        return category;
      }
      
      // Tweede prioriteit: section kolom uit Google Sheets (kolom C) DIRECT
      if (section) {
        console.log(' Using section directly (EN):', section);
        return section;
      }
      
      // Derde prioriteit: type kolom DIRECT
      if (type) {
        console.log(' Using type directly (EN):', type);
        return type;
      }
      
      console.log(' No value found (EN), using fallback: Dish');
      return "Dish";
    },
    translateCategory: (category) => {
      return translateCategoryService(category, 'en');
    },
    orderHandOff: "Please place your order with our staff.",
    pairingChip: (suggestion) => suggestion || 'A glass of wine',
    personalWithName: (name) => `${name}, here is your personal selection`,
    personalGeneric: "Here is your personal selection",
    langShort: "EN",
    // WhatsApp opt-in copy (mirrors NL layout)
    whatsappOptTitle: (name) => `Hi ${name || ''},`,
    whatsappOptBody: (choiceText) => `More and more guests are choosing ${choiceText || 'their favourite'} too`,
    whatsappOptSmall: "Would you like to receive updates about our weekly menu or events? Enter your phone number here.",
    phonePlaceholder: "Your phone number",
    agreeWhatsApp: "I agree to WhatsApp updates. Unsubscribing is easy: send STOP via WhatsApp and we will stop sending messages.",
    // Pickers
    tastes: [
      { label: "✨ Light & Fresh", code: "light_fresh" },
      { label: "🍲 Rich & Hearty", code: "rich_hearty" },
      { label: "🌟 Surprising & Full", code: "surprising_full" },
    ],
    diets: [
      { key: "meat", label: "🥩 Meat" },
      { key: "fish", label: "🐟 Fish" },
      { key: "veg", label: "🥬 Vegetarian" },
    ],
    // Menu filters
    menuFilters: {
      vegetarian: "🥬 Vegetarian",
      glutenFree: "🌾 Gluten-free"
    }
  },
};

/********************
 * Belevingsteksten (rotate per app start)
 ********************/
const quotes = {
  nl: [
    { text: "Welkom bij 't Tolhuis. Even een avondje genieten." },
    { text: "Laat je verrassen. Geniet, proef, beleef. Natuurlijk in 't Tolhuis." },
    { text: "Hier komen goed eten en gezelligheid samen." },
    { text: "Van ontbijt, borrel tot diner geniet elk moment. Natuurlijk in 't Tolhuis." },
    { text: "Een avond uit. Een avond in 't Tolhuis." },
  ],
  en: [
    { text: "Welcome to 't Tolhuis. Time to enjoy an evening." },
    { text: "Let yourself be surprised. Enjoy, taste, experience. Naturally at 't Tolhuis." },
    { text: "Where good food and coziness come together." },
    { text: "From breakfast, drinks to dinner - enjoy every moment. Naturally at 't Tolhuis." },
    { text: "A night out. A night at 't Tolhuis." },
  ]
};

/********************
 * Demo data (mock)
 ********************/
const demo = {
  venue: { slug: "tolhuis", name: "'t Tolhuis", currency: "€" },
  weekmenu: [{ venue: "tolhuis", week: "2025-W36", dish_id: "spc_1", label: "HAP VAN DE WEEK" }],
  specials: {
    metaTitle: "No: 40  Jaar: 2025  30 sept t/m 6 okt",
    groups: [
      { title: "HAP VAN DE WEEK", items: [ { id: "spc_1", name: "Op de huid gebakken zeebaarsfilet", desc: "op groene curry, boontjes, inktvis met een limoen botersaus", price: 19.95 } ]},
      { title: "VIS VAN DE DAG", items: [ { id: "spc_2", name: "Gebakken zalm", desc: "met kruiden, citroen en geroosterde aardappelen", price: 18.95 } ]},
      { title: "VEGETARISCHE SPECIAL", items: [ { id: "spc_3", name: "Mediterrane stoofpot", desc: "met seizoensgroenten, kruiden en couscous salade", price: 16.95 } ]},
      { title: "SALADE VAN DE MAAND", items: [ { id: "spc_4", name: "Geitenkaas salade", desc: "met spinazie, walnoten, cherrytomaatjes en honingmosterd dressing", price: 14.95 } ]},
      { title: "SOEP VAN DE MAAND", items: [ { id: "spc_5", name: "Tomatensoep met basilicum", desc: "met room en parmezaanse kaas", price: 7.95 } ]},
    ]
  },
  menu: [
    // Demo menu items verwijderd - gebruik Google Sheets voor alle menu data
  ],
  pairings: [
    // Demo pairings verwijderd - gebruik Google Sheets voor alle pairing data
  ],
  rules: [
    // Demo rules verwijderd - gebruik Google Sheets voor alle pairing rules
  ],
};

// EN dish translations (optional)
const dishEn = {
  'spc_1': { name: "Skin-on baked sea bass fillet", desc: "on green curry, beans, squid with lime butter sauce" },
  'spc_2': { name: "Fried salmon", desc: "with herbs, lemon and roasted potatoes" },
  'spc_3': { name: "Mediterranean stew", desc: "with seasonal vegetables, herbs and couscous salad" },
  'spc_4': { name: "Goat cheese salad", desc: "with spinach, walnuts, cherry tomatoes and honey mustard dressing" },
  'spc_5': { name: "Tomato soup with basil", desc: "with cream and parmesan cheese" }
};

/********************
 * Helpers
 ********************/
const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2";
function toArr(v){ if (Array.isArray(v)) return v; if (v==null) return []; return String(v).split(/[,|]/).map((s)=>s.trim()).filter(Boolean); }
function recordEvent(event){ try{ const k='analytics'; const arr=JSON.parse(localStorage.getItem(k)||'[]'); arr.push({t:Date.now(),...event}); localStorage.setItem(k, JSON.stringify(arr)); }catch{} }
function sentenceCase(s){ if (!s) return ''; const t = String(s).trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
function tasteToCode(s=''){
  const x = s.toLowerCase().replace(/[�]/g, '').trim(); // Remove emojis
  if (/(licht|light)/.test(x) && /(fris|fresh)/.test(x)) return 'light_fresh';
  if (/(rijk|rich)/.test(x) && /(hartig|hearty)/.test(x)) return 'rich_hearty';
  if (/(verrassend|surprising)/.test(x) && /(vol|full)/.test(x)) return 'surprising_full';
  return x.replace(/\s+/g,'_');
}
function getContextSignals(){ 
  const now = new Date(); 
  const hour = now.getHours(); 
  const dayOfWeek = now.getDay(); // 0 = zondag, 5 = vrijdag
  
  // Verbeterde daypart logica met borrel periode
  let daypartContext = {
    breakfast: { start: 6, end: 11, name: 'ontbijt', name_en: 'breakfast' },
    lunch: { start: 11, end: 16, name: 'lunch', name_en: 'lunch' },
    borrel: { start: 16, end: 19, name: 'borrel', name_en: 'aperitif' },
    dinner: { start: 19, end: 23, name: 'diner', name_en: 'dinner' }
  };
  
  // Speciale vrijdag borrel logica - nog eerder beginnen
  if (dayOfWeek === 5) { // Vrijdag
    daypartContext.borrel.start = 15; // Vrijdag borrel vanaf 15:00
    console.log('� Vrijdag borrel mode - vanaf 15:00!');
  }
  
  // Bepaal de juiste daypart met meer precisie
  let currentDaypart = 'dinner'; // default
  for (const [key, value] of Object.entries(daypartContext)) {
    if (hour >= value.start && hour < value.end) {
      currentDaypart = key;
      break;
    }
  }
  
  // Speciale vrijdag middag borrel check
  if (dayOfWeek === 5 && hour >= 15 && hour < 17) {
    currentDaypart = 'borrel';
    console.log('� Vrijdag middag borrel actief!');
  }
  
  return { 
    time: now.toISOString(), 
    hour, 
    daypart: currentDaypart, 
    dayOfWeek,
    isFriday: dayOfWeek === 5,
    weather: 'clear',
    daypartInfo: daypartContext[currentDaypart]
  }; 
}
// Translation cache to avoid duplicate API calls
const translationCache = new Map();

// Global abort controller for cancelling all active translations
let globalAbortController = null;


// Simple wrapper for backward compatibility (now async for AI translations)
async function translateDish(d, lang) {
  return await translateDishService(d, lang);
}

// AI translation removed - using reliable local translation service instead

// Old translation function replaced by translation service
function translateDescriptionSimple(desc) {
  // Use new translation service
  return translateDishService({ desc }, 'en').desc || desc;
}

function preferDiet(d, dietKey){ 
  if (!dietKey || dietKey==='all') return true; 
  const ds = d.diet||[]; 
  const type = d.type || '';
  
  // Google Sheets compatibility: check both diet array and type field
  if (dietKey==='veg') {
    const category = (d.category || '').toLowerCase();
    
    // EXCLUDE LUNCH CATEGORY (tijdelijke items)
    if (category === 'lunch') {
      console.log('� LUNCH excluded:', d.name);
      return false;
    }
    
    // SIMPEL: Check kolom F (type) voor "vega" of kolom H (diet) voor "veg"/"vega"
    const isVega = type === 'vega' || type === 'vegetarisch' || 
                   ds.includes('veg') || ds.includes('v') || ds.includes('vega') || ds.includes('vegetarisch');
    
    console.log('� Veg check:', d.name, {
      type: type,
      diet: ds,
      category: category,
      isVega: isVega,
      result: isVega ? ' ACCEPTED' : ' REJECTED'
    });
    
    return isVega;
  } 
  if (dietKey==='vegan') return ds.includes('vegan') || ds.includes('vega') || (d.tags||[]).includes('vegan') || (d.tags||[]).includes('vega');
  if (dietKey==='glutfree') {
    // Check explicit tags first
    if (ds.includes('glutfree') || (d.tags||[]).includes('glutfree') || (d.tags||[]).includes('gf') || 
        ds.includes('glutenvrij') || (d.tags||[]).includes('glutenvrij')) return true;
    
    // Auto-detect gluten-free dishes based on name/description
    const name = (d.name || '').toLowerCase();
    const desc = (d.description || '').toLowerCase();
    const glutenFreeKeywords = ['glutenvrij', 'gluten-free', 'gf', 'zonder gluten'];
    const glutenFreeDishes = ['salade', 'vis', 'vlees', 'groente', 'fruit', 'rijst', 'quinoa', 'aardappel'];
    
    // Check for gluten-containing ingredients that would make it NOT gluten-free
    const glutenKeywords = ['boter', 'kruidenboter', 'citroenboter', 'pasta', 'brood', 'meel', 'bloem', 'paneermeel', 'sojasaus', 'miso'];
    
    // If dish contains gluten ingredients, it's NOT gluten-free
    if (glutenKeywords.some(k => name.includes(k) || desc.includes(k))) {
      return false;
    }
    
    // If it's a naturally gluten-free dish type, it's gluten-free
    if (glutenFreeDishes.some(dish => name.includes(dish) || desc.includes(dish))) {
      return true;
    }
    
    return false;
  }
  if (dietKey==='meat') return ds.includes('meat') || ds.includes('vlees') || type === 'vlees' || type === 'meat';
  if (dietKey==='fish') return ds.includes('fish') || ds.includes('vis') || type === 'vis' || type === 'fish';
  if (dietKey==='meatfish') return ds.includes('meat') || ds.includes('fish') || type === 'vlees' || type === 'vis'; 
  return true; 
}

// Helper function to remove emojis from taste labels for menu display
function removeEmojisFromTaste(tasteLabel) {
  return tasteLabel.replace(/[�]/g, '').trim();
}

function gpt5RankDishes({ user, context, dishes }){
  const tastePrefCode = tasteToCode(user.taste || '');
  console.log(' Ranking debug:', { tastePrefCode, userTaste: user.taste, userDiet: user.diet });
  
  // Debug: log all dishes being ranked
  console.log('� All dishes for ranking:', dishes.map(d => ({
    name: d.name,
    type: d.type,
    diet: d.diet,
    tags: d.tags,
    taste: d.taste 
  })));
  
  const score = (d) => {
    // Don't filter out items completely - just score them lower
    const dietMatch = preferDiet(d, user.diet);
    if (!dietMatch) {
      console.log(' Diet preference not matched for:', d.name, { userDiet: user.diet, dishType: d.type, dishDiet: d.diet });
    }
    
    let s = 0;
    
    // Base score for all dishes
    s += 1;
    
    // SPECIAL: For vegetarians, always prioritize "Vegetarische hap"
    if (user.diet === 'veg') {
      const name = (d.name || '').toLowerCase();
      if (name.includes('vegetarische hap') || name.includes('vegetarian dish')) {
        s += 100; // Very high score to ensure it's always first
        console.log('� VEGETARISCHE HAP BOOST for:', d.name);
      }
    }
    
    // Diet preference scoring
    if (dietMatch) {
      s += 3;
      console.log(' Diet match for:', d.name);
    } else {
      s -= 1; // Penalty for diet mismatch, but don't exclude completely
    }
    
    // Taste preference scoring
    if (tastePrefCode === 'light_fresh') {
      if (d.tags?.includes('licht') || d.tags?.includes('fris')) s += 2;
      if (d.tags?.includes('rijk') || d.tags?.includes('hartig')) s -= 1;
    } else if (tastePrefCode === 'rich_hearty') {
      if (d.tags?.includes('rijk') || d.tags?.includes('hartig')) s += 2;
      if (d.tags?.includes('licht') || d.tags?.includes('fris')) s -= 1;
    } else if (tastePrefCode === 'surprising_full') {
      if (d.tags?.includes('verrassend') || d.tags?.includes('vol')) s += 2;
      if (d.tags?.includes('rijk') || d.tags?.includes('hartig')) s += 2;
    }
    
    console.log('� Score for', d.name, ':', s, 'final:', s);
    return s; // Geen random factor meer - consistente ranking
  };
  const ranked = dishes.map((d)=>({...d,_score:score(d)})).filter((d)=>d._score>=0).sort((a,b)=>b._score-a._score);
  
  console.log('� Final ranked dishes:', ranked.map(d => ({ name: d.name, score: d._score })));
  
  return ranked;
}

async function gpt5PairingCopy({ pairing, lang='nl' }){
  // Gebruik AI-gegenereerde beschrijving als beschikbaar, anders fallback
  if (pairing.description) {
    return pairing.description;
  }
  
  // Fallback voor als er geen beschrijving is
  const base = lang==='nl' ? 
    `Perfecte combinatie met ${pairing.name}` : 
    `Perfect combination with ${pairing.name}`;
  const nuance = lang==='nl' ? ' versterkt de smaken zonder te overheersen.' : ' lifts the flavours without overpowering.';
  return `${base} ${nuance}`;
}

function pickPairings({ dish, pairings, user, rules }){
  const tastePref = (user.taste||'').toLowerCase();
  const byDish = (pairings||[]).filter(p=>p.dish_id===dish.id);
  const extra = (rules||[]).filter((r)=>r.key.toLowerCase().includes('taste') && r.key.toLowerCase().includes(tastePref)).flatMap((r)=> toArr(r.pairings).map((tok)=>{
    const [kind,name] = String(tok).split(':');
    return { dish_id: dish.id, kind, name, price: null, match_tags: [], upsell_id: `rule_${kind}_${name}` };
  }));
  const merged = [...byDish, ...extra];
  const seen = new Set();
  return merged.filter(p=>{ const k=`${p.kind}|${p.name}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0,3);
}

// Generate chef recommendation title
async function generateChefRecommendationTitle(userTaste, lang = 'nl') {
  // Roulerende chef recommendation titels (geen AI, geen kosten!)
  const titlesNL = [
    'Speciaal voor jou geselecteerd',
    "Chef's keuze voor jou",
    'Voor jou uitgekozen',
    'Onze aanbeveling'
  ];
  
  const titlesEN = [
    'Specially selected for you',
    "Chef's choice for you",
    'Picked for you',
    'Our recommendation'
  ];
  
  const titles = lang === 'nl' ? titlesNL : titlesEN;
  
  // Roteer elke 10 seconden naar een nieuwe titel
  const index = Math.floor(Date.now() / 10000) % titles.length;
  
  return titles[index];
}

export {
  i18n,
  quotes,
  demo,
  dishEn,
  focusRing,
  toArr,
  recordEvent,
  sentenceCase,
  tasteToCode,
  getContextSignals,
  translateDish,
  preferDiet,
  removeEmojisFromTaste,
  gpt5RankDishes,
  gpt5PairingCopy,
  pickPairings,
  generateChefRecommendationTitle
};
