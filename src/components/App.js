import React, { useEffect, useMemo, useRef, useState } from "react";
import { i18n, quotes, demo, focusRing, recordEvent, sentenceCase, tasteToCode, getContextSignals, gpt5RankDishes, pickPairings, gpt5PairingCopy, generateChefRecommendationTitle } from "../App.js";
import { translateDish } from "../utils/translationService.js";
import { getCurrentPeriod, clearPeriodCache, getWeekmenuData, clearWeekmenuCache, getPairingData, clearPairingCache, getMenuData, clearMenuCache, generateAIPairings, getSmartBubblesData, saveOptInData } from "../services/sheetsService.js";
import { generatePairingDescription, generateContextHint, generateSmartUpsell } from "../utils/openaiProxy.js";
import { getCurrentWeather, getWeatherCategory, getCurrentSeason, getTimeOfDay, getWelcomeMessage } from "../services/weatherService.js";

/********************
 * UI Primitives
 ********************/
const Card = ({children, className=''}) => (
  <div className={`rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.12)] bg-[#f8f2e8] ${className}`}>{children}</div>
);

const Button = ({children, className='', ...props}) => (
  <button className={`min-h-12 px-5 py-3 rounded-2xl text-[17px] font-medium bg-amber-700 text-amber-50 active:translate-y-[1px] ${focusRing} ${className}`} {...props}>{children}</button>
);

// Menu Tab Component
const MenuTab = ({ children, isActive, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${focusRing} ${isActive 
      ? 'bg-amber-700 text-amber-50' 
      : 'bg-white/70 text-amber-900 hover:bg-amber-100'
    } ${className}`}
  >
    {children}
  </button>
);

// Helper: pick first existing image from candidates (graceful fallback)
function useImageCandidate(cands) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (typeof Image === 'undefined') { setSrc(null); return; }
    let cancelled = false; const list = (cands||[]).filter(Boolean);
    const tryNext = (i) => {
      if (cancelled || i >= list.length) { setSrc(null); return; }
      const url = list[i]; const img = new Image();
      img.onload = () => { if (!cancelled) setSrc(url); };
      img.onerror = () => tryNext(i + 1);
      img.src = url;
    };
    tryNext(0);
    return () => { cancelled = true; };
  }, [JSON.stringify(cands)]);
  return src;
}

/********************
 * Header / Hero / Language
 ********************/
const HERO_CANDIDATES = ['header-tolhuis.jpg','/header-tolhuis.jpg'];

function Hero({ src, alt = "Cafe 't Tolhuis", children }){
  const [hero, setHero] = useState(src || null);
  useEffect(()=>{
    if (hero) return; let cancelled=false;
    const qs = (()=>{ try{ return new URLSearchParams(window.location.search).get('hero'); }catch{return null;} })();
    const ls = (()=>{ try{ return localStorage.getItem('hero_url'); }catch{return null;} })();
    const candidates = [qs, ls, ...HERO_CANDIDATES].filter(Boolean);
    const tryNext=(i)=>{ if(cancelled||i>=candidates.length){ setHero(null); return; } const url=candidates[i]; const img=new Image(); img.onload=()=>{ if(!cancelled){ setHero(url); try{ localStorage.setItem('hero_url',url);}catch{} } }; img.onerror=()=>tryNext(i+1); img.src=url; };
    tryNext(0); return ()=>{cancelled=true};
  },[hero]);
  const style = hero ? { backgroundImage: `url('${hero}')` } : { backgroundImage: 'linear-gradient(135deg, #d6b98a, #f3e8d2)' };
  return (
    <div className="relative -mx-4 -mt-4 mb-4 h-[150px] sm:h-[170px] overflow-hidden rounded-b-3xl shadow-[0_10px_28px_rgba(0,0,0,0.18)]" role="img" aria-label={alt}>
      <div className="absolute inset-0 bg-top bg-cover" style={style} />
      <div className="absolute inset-0 bg-black/12" />
      {children}
    </div>
  );
}

function LangSwitchInline({ lang, onChange, className='' }){
  const handleLangChange = (newLang) => {
    console.log(`Language switch clicked: ${lang} � ${newLang}`);
    console.log(`Current lang state: ${lang}`);
    onChange(newLang);
    console.log(`Called onChange with: ${newLang}`);
  };
  
  return (
    <div className={`flex items-center gap-1 bg-white/70 backdrop-blur px-2 py-1 rounded-full border border-amber-900/10 shadow-sm ${className}`}>
       <button aria-label="Nederlands" className={`px-2 py-1 rounded-full text-xs ${lang==='nl'? 'bg-amber-700 text-white' : 'text-amber-900'}`} onClick={()=>handleLangChange('nl')}>🇳🇱 {i18n.nl.langShort}</button>
       <button aria-label="English" className={`px-2 py-1 rounded-full text-xs ${lang==='en'? 'bg-amber-700 text-white' : 'text-amber-900'}`} onClick={()=>handleLangChange('en')}>🇬🇧 {i18n.en.langShort}</button>
    </div>
  );
}

function BrandHeader({ showIntroImage = false }){
  return (
    <header className="text-center mt-12 mb-4">
      <div className="font-[ui-serif] text-xs tracking-wide mb-2 hidden">ANNO 1901</div>
      <div className="mb-2">
        <img 
          src="tolhuis-logo.png" 
          alt="'t Tolhuis Logo" 
          className="h-12 w-auto object-contain mx-auto"
          onError={(e) => {
            // Fallback naar tekst als logo niet bestaat
            e.target.style.display = 'none';
            const fallback = e.target.parentNode;
            fallback.innerHTML = '<div class="font-[ui-serif] text-xl">\'t TOLHUIS</div>';
          }}
        />
      </div>
      <div className="text-[10px] tracking-wide hidden">HILVERSUM</div>
      
      {/* Intro image - alleen op eerste pagina */}
      {showIntroImage && (
        <div className="mt-6 mb-4">
          <img 
            src="/intro-image.jpg" 
            alt="'t Tolhuis ambiance" 
            className="mx-auto rounded-2xl shadow-lg object-cover"
            style={{ width: '300px', height: '300px', aspectRatio: '1/1' }}
            onError={(e) => {
              console.warn('Intro image not found:', e.target.src);
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
    </header>
  );
}

/********************
 * Belevingstekst / Intro
 ********************/
function RotatingQuote({ large = false, lang = 'nl' }){
  const [q, setQ] = useState(quotes[lang][0]);
  useEffect(()=>{
    // Only use localStorage in the browser; fall back to a date-seeded index otherwise
    const pick = () => {
      const langQuotes = quotes[lang] || quotes.nl;
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined'){
          const key='quoteIndex';
          const raw = localStorage.getItem(key);
          const idx = raw==null ? 0 : (parseInt(raw,10)||0);
          const next=(idx+1)%langQuotes.length;
          localStorage.setItem(key,String(next));
          return langQuotes[idx%langQuotes.length];
        }
      } catch {}
      const d=new Date();
      const seed=d.getFullYear()*1000+(d.getMonth()+1)*50+d.getDate();
      return langQuotes[seed%langQuotes.length];
    };
    setQ(pick());
  },[lang]);
  return (
    <div className={`transition-opacity duration-500 ${large ? 'min-h-[120px]' : 'min-h-[84px]'}`}>
      <p className={`font-[ui-serif] ${large ? 'text-2xl sm:text-[28px] leading-9' : 'text-xl leading-relaxed'} mx-auto max-w-[28ch]`}>&ldquo;{q.text}&rdquo;</p>
    </div>
  );
}

// White version for video background intro
function RotatingQuoteWhite({ large = false, lang = 'nl' }){
  const [q, setQ] = useState(quotes[lang][0]);
  useEffect(()=>{
    const pick = () => {
      const langQuotes = quotes[lang] || quotes.nl;
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined'){
          const key='quoteIndex';
          const raw = localStorage.getItem(key);
          const idx = raw==null ? 0 : (parseInt(raw,10)||0);
          const next=(idx+1)%langQuotes.length;
          localStorage.setItem(key,String(next));
          return langQuotes[idx%langQuotes.length];
        }
      } catch {}
      const d=new Date();
      const seed=d.getFullYear()*1000+(d.getMonth()+1)*50+d.getDate();
      return langQuotes[seed%langQuotes.length];
    };
    setQ(pick());
  },[lang]);
  return (
    <div className={`transition-opacity duration-500 ${large ? 'min-h-[120px]' : 'min-h-[84px]'}`}>
      <p className={`font-[ui-serif] text-white ${large ? 'text-2xl sm:text-[28px] leading-9' : 'text-xl leading-relaxed'} mx-auto max-w-[28ch]`}>&ldquo;{q.text}&rdquo;</p>
    </div>
  );
}

/********************
 * Cards
 ********************/
function SpecialsCard({ specials, lang }){
  const [aiTranslations, setAiTranslations] = useState({});
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);
  
  // Title translations for English
  const titleMap = lang === 'en' ? { 
    'HAP VAN DE WEEK': 'Dish of the week',
    'HAP VAN HET SEIZOEN': 'Seasonal dish',
    'VEGETARISCHE HAP': 'Vegetarian dish',
    'SALADE VAN DE MAAND': 'Salad of the month',
    'SOEP VAN DE MAAND': 'Soup of the month',
    'VIS VAN DE DAG': 'Fish of the day',
    'VEGETARISCHE SPECIAL': 'Vegetarian special'
  } : {};
  
  // Load AI translations for weekmenu items when switching to English
  useEffect(() => {
    const loadAITranslations = async () => {
      if (lang !== 'en') {
        setAiTranslations({});
        return;
      }
      
      setIsLoadingTranslations(true);
      const translations = {};
      
      try {
        const { generateDishTranslation } = await import('../utils/openaiProxy.js');
        
        // Process all weekmenu items
        for (const group of specials.groups) {
          for (const item of group.items) {
            const itemId = item.id || `${item.name}-${item.title}`;
            
            // Skip if manual translation exists
            if (item.title_en && item.title_en.trim() !== '') {
              continue;
            }
            
            // Skip if already cached
            if (item.ai_title_en && item.ai_title_en.trim() !== '') {
              translations[itemId] = {
                title_en: item.ai_title_en,
                description_en: item.ai_description_en || ''
              };
              continue;
            }
            
            // Generate AI translation
            try {
              const { generateDishTranslation } = await import('../utils/openaiProxy.js');
              const translation = await generateDishTranslation({
                title: item.title || item.name,
                description: item.description || item.desc || ''
              });
              translations[itemId] = translation;
              console.log(`Weekmenu AI translation for ${item.name}:`, translation);
            } catch (error) {
              console.warn(`AI translation failed for ${item.name}:`, error);
              // Use simple fallback
              const fallbackTranslations = {
                'Franse uiensoep': 'French Onion Soup',
                'Salade van de maand': 'Salad of the Month',
                'Soep van de maand': 'Soup of the Month',
                'Hap van de week': 'Dish of the Week',
                'Vegetarische hap': 'Vegetarian Dish',
                'Vis van de dag': 'Fish of the Day'
              };
              const fallbackTitle = fallbackTranslations[item.title || item.name];
              if (fallbackTitle) {
                translations[itemId] = {
                  title_en: fallbackTitle,
                  description_en: item.description || item.desc || ''
                };
                console.log(` Using weekmenu fallback for ${item.name}:`, fallbackTitle);
              }
            }
          }
        }
        
        setAiTranslations(translations);
      } catch (error) {
        console.warn('AI translations loading failed:', error);
      } finally {
        setIsLoadingTranslations(false);
      }
    };
    
    loadAITranslations();
  }, [lang, specials.groups]);
  
  return (
    <Card className="p-5">
      <div className="space-y-5">
        {specials.groups.map((gr) => (
          <div key={gr.title}>
            <h3 className="font-[ui-serif] text-base tracking-wide mb-1">{titleMap[gr.title] || gr.title}</h3>
            {gr.items.map((it, idx) => { 
              // HYBRID TRANSLATION: Manual Sheets > AI translation > Original
              let itemName, itemDesc;
              
              if (lang === 'en') {
                const itemId = it.id || `${it.name}-${it.title}`;
                const aiTranslation = aiTranslations[itemId];
                
                itemName = it.title_en || aiTranslation?.title_en || it.name || it.title;
                itemDesc = it.description_en || aiTranslation?.description_en || it.desc || it.description;
                
                console.log('� Weekmenu translation:', {
                  original: it.name,
                  manual: it.title_en,
                  ai: aiTranslation?.title_en,
                  using: itemName
                });
              } else {
                itemName = it.name || it.title;
                itemDesc = it.desc || it.description;
              }
              
              return (
              <div key={idx} className="flex items-start justify-between gap-3 py-2 border-t border-amber-900/10 first:border-t-0">
                <div className="min-w-0">
                    <div className="font-medium">{itemName}</div>
                    {itemDesc && <div className="text-sm text-amber-900/80 mt-0.5">{sentenceCase(itemDesc)}</div>}
                </div>
                   {typeof it.price==='number' && <div className="shrink-0 font-semibold">€{it.price.toFixed(2)}</div>}
              </div>
              ); 
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Smart detection voor Nice to Meat gerechten - alleen als fallback
function isNiceToMeatDish(dish) {
  const dishName = (dish.name || '').toLowerCase();
  const dishId = dish.id || '';
  
  // Alleen specifieke gerechten die we ZEKER weten dat van Nice to Meat komen
  const confirmedNiceToMeatDishes = [
    'week_hap', 'de gebraden eendenborst'
  ];
  
  // Check op dish ID - alleen voor bevestigde gerechten
  if (dishId && confirmedNiceToMeatDishes.includes(dishId.toLowerCase())) {
    return true;
  }
  
  // Check op gerecht naam - alleen voor bevestigde gerechten
  const confirmedNiceToMeatNames = [
    'de gebraden eendenborst', 'eendenborst'
  ];
  
  const hasConfirmedName = confirmedNiceToMeatNames.some(name => 
    dishName.includes(name.toLowerCase())
  );
  
  // Exclude alle andere gerechten - te veilig zijn is beter
  const excludePatterns = [
    'schol', 'scholfilet', 'vis', 'zalm', 'tonijn',
    'kaas', 'roquefort', 'blauwader', 'geitenkaas',
    'soep', 'salade', 'saus', 'jus', 'dressing',
    'vegetarisch', 'vega', 'hap van het seizoen', 'seizoen',
    'vegetarische hap'
  ];
  
  const isExcluded = excludePatterns.some(pattern => 
    dishName.includes(pattern)
  );
  
  // Alleen Nice to Meat als het bevestigd is EN niet uitgesloten
  return hasConfirmedName && !isExcluded;
}

// Helper functie om te detecteren of een dessert van De Hoop is (ijs)
function isDeHoopDish(dish) {
  const dishName = (dish.name || '').toLowerCase();
  const dishDesc = (dish.desc || '').toLowerCase();
  const supplier = dish.supplier?.toLowerCase() || '';
  const tags = dish.tags?.join(' ').toLowerCase() || '';
  
  // Expliciete supplier match
  if (supplier === 'dehoop' || supplier === 'de hoop') {
    return true;
  }
  
  // Detecteer ijs in naam, beschrijving of tags
  const icePatterns = ['ijs', 'ice', 'sorbet', 'gelato', 'frozen', 'ijsje'];
  
  for (const pattern of icePatterns) {
    if (dishName.includes(pattern) || dishDesc.includes(pattern) || tags.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

function DishCard({ venue, dish, pairings, onShowPairing, lang, generatePairingText, setCurrentPairing, setShowPairingCard, showPairingCard, weather, weatherCategory, preloadedTranslations, pairingTranslations }){
  
  const [currentPairing, setLocalCurrentPairing] = useState(null);
  const [aiTranslation, setAiTranslation] = useState(null);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [pairingTranslation, setPairingTranslation] = useState(null);
  
  useEffect(()=>{ recordEvent({ type:'dish_view', dish: dish.id }); }, [dish?.id]);
  
  // Reset currentPairing when language, dish, or pairings change to prevent stale data
  useEffect(() => {
    setLocalCurrentPairing(null);
    setShowPairingCard(false);
  }, [lang, dish.id, pairings, setShowPairingCard]);
  
  // Load AI translation if needed (English + no manual translation)
  useEffect(() => {
    const loadAITranslation = async () => {
      if (lang !== 'en') {
        setAiTranslation(null);
        return;
      }
      
      // Check if BOTH title and description are manually translated
      const hasManualTitle = (dish.title_en && dish.title_en.trim() !== '');
      const hasManualDescription = (dish.description_en && dish.description_en.trim() !== '');
      
      if (hasManualTitle && hasManualDescription) {
        setAiTranslation(null);
        return;
      }
      
      // Check if cached AI translation exists
      if (dish.ai_title_en && dish.ai_title_en.trim() !== '') {
        setAiTranslation({
          title_en: dish.ai_title_en,
          description_en: dish.ai_description_en || ''
        });
        return;
      }
      
      // Check if pre-loaded translation exists
      const dishId = dish.id || `${dish.name}-${dish.title}`;
      if (preloadedTranslations && preloadedTranslations[dishId]) {
        setAiTranslation(preloadedTranslations[dishId]);
        return;
      }
      
      // Generate AI translation (fallback)
      setIsLoadingTranslation(true);
      try {
        const { generateDishTranslation } = await import('../utils/openaiProxy.js');
        const translation = await generateDishTranslation({
          title: dish.title || dish.name,
          description: dish.description || dish.desc || ''
        });
        setAiTranslation(translation);
      } catch (error) {
        console.warn('AI translation failed:', error);
        setAiTranslation(null);
      } finally {
        setIsLoadingTranslation(false);
      }
    };
    
    loadAITranslation();
  }, [lang, dish.title, dish.name, dish.title_en, dish.description_en, dish.ai_title_en, preloadedTranslations]);
  
  // Simple pairing translation
  useEffect(() => {
    const translatePairing = async () => {
      console.log('Pairing translation useEffect triggered:', { lang, pairingsLength: pairings?.length, dishName: dish.name });
      
      if (lang !== 'en' || !pairings || pairings.length === 0) {
        console.log('Pairing translation skipped:', { lang, pairingsLength: pairings?.length });
        setPairingTranslation(null);
        return;
      }
      
      const pairing = pairings[0];
      console.log('Checking pairing:', { suggestion: pairing.suggestion, suggestion_en: pairing.suggestion_en });
      
      if (pairing.suggestion_en && pairing.suggestion_en.trim() !== '') {
        console.log('Using manual translation:', pairing.suggestion_en);
        setPairingTranslation(null); // Use manual translation
        return;
      }
      
      console.log('Generating AI translation for pairing:', pairing.suggestion);
      try {
        const { generateDishTranslation } = await import('../utils/openaiProxy.js');
        const translation = await generateDishTranslation({
          title: pairing.suggestion,
          description: ''
        });
        console.log('Pairing translation completed:', translation.title_en);
        setPairingTranslation(translation.title_en);
      } catch (error) {
        console.warn('Pairing translation failed:', error);
        setPairingTranslation(null);
      }
    };
    
    translatePairing();
  }, [lang, pairings]);
  
  
  // SIMPLE TRANSLATION: If English, use columns N and O from Google Sheets
  let displayName, displayDesc;
  
  if (lang === 'en') {
    // Priority: Manual Sheets translation > AI translation > Original
    displayName = dish.title_en || aiTranslation?.title_en || dish.name || dish.title;
    displayDesc = dish.description_en || aiTranslation?.description_en || dish.desc || dish.description;
    
  } else {
    // Use Dutch original
    displayName = dish.name || dish.title;
    displayDesc = dish.desc || dish.description;
  }
  
  const t = i18n[lang];
  
  // Category translation - English only
  const translateCategory = (category) => {
    if (lang === 'nl') return category || 'Gerecht';
    
    const translations = {
      'Hoofdgerecht': 'Main Course',
      'Voorgerecht': 'Starter',
      'Lunch': 'Lunch',
      'Ontbijt': 'Breakfast',
      'Borrel': 'Aperitif',
      'Dessert': 'Dessert',
      'Drank': 'Drink',
      'Drinken': 'Drink',
      'Gerecht': 'Dish'
    };
    return translations[category] || category || 'Dish';
  };
  
  // Diet tags translation - English only
  const translateDietTag = (tag) => {
    if (lang === 'nl') return tag;
    
    const dietTranslations = {
      'lactose': 'Lactose',
      'lactosevrij': 'Lactose-free',
      'glutenvrij': 'Gluten-free',
      'glutfree': 'Gluten-free',
      'vega': 'Vegetarian',
      'vegetarisch': 'Vegetarian',
      'veg': 'Vegetarian',
      'vlees': 'Meat',
      'vis': 'Fish',
      'noten': 'Nuts',
      'pinda': 'Peanuts',
      'ei': 'Eggs',
      'soja': 'Soy',
      'spicy': 'Spicy',
      'pittig': 'Spicy',
      'mild': 'Mild',
      'zout': 'Salty',
      'zoet': 'Sweet',
      'zuur': 'Sour',
      'bitter': 'Bitter'
    };
    
    return dietTranslations[tag.toLowerCase()] || tag;
  };
  
  // SIMPLE SUPPLIER DETECTION - alleen Google Sheets supplier kolom
  const getSupplierFromSheets = () => {
    if (!dish.supplier) return null;
    
    const supplier = dish.supplier.toLowerCase().trim();
    
    if (supplier.includes('fish') || supplier.includes('vis')) return 'fish';
    if (supplier.includes('nicetomeat') || supplier.includes('meat')) return 'meat';
    if (supplier.includes('dehoop') || supplier.includes('hoop')) return 'dehoop';
    
    return null;
  };
  
  const detectedSupplier = getSupplierFromSheets();
  const showFishSupplier = detectedSupplier === 'fish';
  const showNiceToMeat = detectedSupplier === 'meat';
  const showDeHoop = detectedSupplier === 'dehoop';
  
  // Debug info voor restaurants
  console.log(`Supplier for "${dish.name}":`, detectedSupplier, {
    explicitSupplier: dish.supplier
  });
  
  const niceToMeatLogo = 'nice-to-meat.png';
  const fishSupplierLogo = 'w-a-fish.png';

  // Menu category icons - temporarily removed to fix error
  
  // Function to submit opt-in data to Google Sheets
  const submitOptInData = async () => {
    if (!optInData.name.trim() || !optInData.phone.trim()) {
      alert(lang === 'nl' ? 'Vul beide velden in' : 'Please fill in both fields');
      return;
    }
    
    setIsSubmittingOptIn(true);
    
    try {
      // Prepare data for saving
      const dataToSave = {
        name: optInData.name.trim(),
        phone: optInData.phone.trim(),
        lang: lang,
        user_taste: user.taste,
        user_diet: user.diet
      };
      
      // Save to Google Sheets (or localStorage for now)
      const result = await saveOptInData(dataToSave);
      
      if (result.success) {
        setShowOptInModal(false);
        
        // Show success message
        alert(lang === 'nl' ? 
          'Bedankt! We nemen binnenkort contact met je op via WhatsApp.' : 
          'Thank you! We will contact you soon via WhatsApp.'
        );
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Error submitting opt-in data:', error);
      alert(lang === 'nl' ? 
        'Er ging iets mis. Probeer het later opnieuw.' : 
        'Something went wrong. Please try again later.'
      );
    } finally {
      setIsSubmittingOptIn(false);
    }
  };           
  
  
  const deHoopLogo = 'Logo-De-Hoop-zwart-goud.svg';
  
  const handlePairingClick = () => {
    if (pairings?.length > 0) {
      const p = pairings[0];
      
      // Update the pairing data immediately
      setLocalCurrentPairing(p);
      setShowPairingCard(true);
      
      recordEvent({ type:'chip_click', label: `pairing:${p.suggestion}`, dish: dish.id });
    }
  };
  
  return (
    <>
      <Card className="p-4 sm:p-5 relative overflow-hidden">
        {/* Supplier logos */}
        {showFishSupplier && fishSupplierLogo && (
          <img 
            src={fishSupplierLogo} 
            alt="Fish Supplier" 
            className="absolute right-4 h-8 opacity-80"
            style={{
              clipPath: 'inset(0 0 0% 0)',
              objectPosition: 'center top',
              marginTop: '0px'
            }}
          />
        )}
        
        {showNiceToMeat && niceToMeatLogo && (
          <img 
            src={niceToMeatLogo} 
            alt="Nice to Meat" 
            className="absolute right-4 h-8 opacity-80"
            style={{
              clipPath: 'inset(0 0 0% 0)',
              objectPosition: 'center top',
              marginTop: '0px'
            }}
          />
        )}
        
        {/* De Hoop logo */}
        {showDeHoop && deHoopLogo && (
          <img 
            src={deHoopLogo} 
            alt="De Hoop" 
            className="absolute right-4 h-8 opacity-80"
            style={{
              objectPosition: 'center center',
              marginTop: (showNiceToMeat || showFishSupplier) ? '0px' : '0px'
            }}
          />
        )}
        <div className="flex flex-col gap-3">
          {/* Titel en prijs */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-[16px] sm:text-[18px] font-semibold leading-tight break-words">{displayName}</h3>
          <p className="text-xs sm:text-sm text-amber-900/80 mt-0.5">
             {translateCategory(dish.subtitle || 'Gerecht')} • {venue.currency}{Number(dish.price).toFixed(2)}
          </p>
            </div>
          </div>
          
          {/* Beschrijving */}
          {displayDesc ? (
            <p className="text-[12px] sm:text-[13px] text-amber-900/80 leading-relaxed break-words">{sentenceCase(displayDesc)}</p>
          ) : (
             <p className="text-[12px] sm:text-[13px] text-amber-900/70 break-words">{(dish.tags||[]).slice(0,3).join(' • ')}</p>
          )}
          
          {/* Diet tags */}
          {(dish.diet||[]).length > 0 && (
            <div className="flex flex-wrap gap-1" aria-hidden="true">
              {(dish.diet||[]).slice(0,3).map((d)=> <span key={String(d)} className="text-[11px] px-2 py-1 rounded-full bg-amber-700/10">{translateDietTag(String(d))}</span>)}
            </div>
          )}
        </div>
                   {pairings?.length>0 && (
                     <div className="mt-4 flex justify-end">
                        <button 
                          className={`px-3 py-2 rounded-full text-[11px] sm:text-[12px] bg-amber-600 text-amber-50 shadow transition-all duration-300 hover:scale-105 hover:shadow-lg ${focusRing}`}
                         onClick={handlePairingClick}
                          aria-label={`Pairing: ${lang === 'en' ? (pairings[0].suggestion_en || pairingTranslation || pairings[0].suggestion) : pairings[0].suggestion}`}
                        >
                          {t.pairingChip(lang === 'en' ? (pairings[0].suggestion_en || pairingTranslation || pairings[0].suggestion) : pairings[0].suggestion)}
                        </button>
                     </div>
                   )}
        <div className="mt-4 text-[10px] sm:text-xs text-amber-900/70">{t.orderHandOff}</div>
      </Card>
      
      {currentPairing && (
        <PairingSlideCard 
            key={`${dish.id}-${currentPairing.dish_id}-${currentPairing.suggestion}`}
            pairing={currentPairing}
            dish={dish}
          venue={venue} 
          lang={lang} 
          isOpen={showPairingCard}
          weather={weather}
          weatherCategory={weatherCategory}
            onClose={() => {
              setShowPairingCard(false);
              setLocalCurrentPairing(null);
            }}
        />
      )}
      
      {/* WhatsApp Opt-in Modal */}
      {/* (legacy OptInModal removed; using global popup in App) */}
    </>
  );
}


/********************
 * Quiz helpers
 ********************/
function StepCard({ title, children, onBack, onNext, backLabel, nextLabel, step, totalSteps }){
  let lblBack = backLabel; let lblNext = nextLabel;
  try { const lang = (localStorage.getItem('lang') || 'nl'); if (!lblBack || !lblNext) { lblBack = lblBack || (lang === 'en' ? 'Back' : 'Terug'); lblNext = lblNext || (lang === 'en' ? 'Next' : 'Volgende'); } } catch {}
  return (
    <section>
      <Card className="p-6">
        {title ? <h2 className="text-xl mb-4 font-semibold">{title}</h2> : null}
        <div>{children}</div>
        <div className="mt-6 flex items-center justify-between">
          <button onClick={onBack} className={`px-4 py-3 rounded-2xl border bg-white/80 ${focusRing}`}>{lblBack}</button>
          <Button onClick={onNext}>{lblNext}</Button>
        </div>
      </Card>
    </section>
  );
}

function DietPicker({ value, onChange, lang }){
  const opts = i18n[lang].diets;
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Diet">
      {opts.map((o)=> (
        <label key={o.key} className={`px-4 py-4 rounded-2xl border text-lg bg-white/80 ${value===o.key ? 'ring-2 ring-amber-700' : ''}`}>
          <input type="radio" name="diet" value={o.key} className="sr-only" checked={value===o.key} onChange={()=>onChange(o.key)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function TastePicker({ value, onChange, lang }){
  const tastes = i18n[lang].tastes;
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Taste">
      {tastes.map(({label, code}) => (
        <label key={code} className={`px-4 py-4 rounded-2xl border text-lg bg-white/80 ${value===label ? 'ring-2 ring-amber-700' : ''}`}>
          <input type="radio" name="taste" value={label} className="sr-only" checked={value===label} onChange={()=>onChange(label)} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function NameStep({ value, onChange, lang }){
  return (
    <input
      autoFocus
      aria-label={i18n[lang].name}
      className="w-full px-4 py-3 rounded-2xl border bg-white/80 focus:outline-none caret-amber-700"
      value={value}
      onChange={(e)=>onChange(e.target.value)}
    />
  );
}

function MenuFilters({ filters, onFilterChange, lang }){
  const t = i18n[lang];
  return (
    <div className="flex items-center gap-3 justify-center flex-wrap">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input 
          type="checkbox" 
          checked={filters.vegetarian}
          onChange={(e) => onFilterChange('vegetarian', e.target.checked)}
          className="accent-amber-700"
        />
        <span>{t.menuFilters.vegetarian}</span>
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input 
          type="checkbox" 
          checked={filters.glutenFree}
          onChange={(e) => onFilterChange('glutenFree', e.target.checked)}
          className="accent-amber-700"
        />
        <span>{t.menuFilters.glutenFree}</span>
      </label>
    </div>
  );
}

/********************
 * Footer & Toast
 ********************/
function FooterBlock({ lang, onLinkClick, textColor = 'text-amber-900/70' }){
  return (
    <div className={`text-center text-xs ${textColor} leading-5`}>
      <div>© 2025 SlimmeGast.ai All rights reserved.</div>
      <div className="mt-2">
        <button 
          onClick={() => onLinkClick?.('uitschrijven')}
          className="hover:underline cursor-pointer"
        >
          {lang === 'en' ? 'Unsubscribe' : 'Uitschrijven'}
        </button>
        {' | '}
        <button 
          onClick={() => onLinkClick?.('privacy')}
          className="hover:underline cursor-pointer"
        >
          {lang === 'en' ? 'Privacy' : 'Privacy'}
        </button>
        {' | '}
        <button 
          onClick={() => onLinkClick?.('informatie')}
          className="hover:underline cursor-pointer"
        >
          {lang === 'en' ? 'Information' : 'Informatie'}
        </button>
      </div>
    </div>
  );
}

function FixedFooter({ lang, onLinkClick }){
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[min(92%,420px)] pointer-events-none z-40">
      <div className="pointer-events-auto">
        <div className="w-full border-t border-amber-900/20" />
        <div className="pt-2"><FooterBlock lang={lang} onLinkClick={onLinkClick} /></div>
      </div>
    </div>
  );
}

/********************
 * Smart Bubble Upsell
 ********************/
function SmartBubble({ message, onClose, position = 'bottom-right' }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Fade in
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto close after 8 seconds
    const autoCloseTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 8000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(autoCloseTimer);
    };
  }, [onClose]);
  
  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-left': 'left-4',
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4'
  };
  
  const getBottomPosition = () => {
    // Smart bubbles should be above the toaster (fixed at absolute bottom)
    const toasterHeight = 70; // Height of toaster + padding
    const extraSpace = 20; // Extra ruimte tussen SmartBubble en "Bekijk het hele menu" button
    return `calc(${toasterHeight}px + ${extraSpace}px + max(8px, env(safe-area-inset-bottom)))`;
  };
  
  return (
    <div className={`fixed ${positionClasses[position]} z-50 pointer-events-auto`}
         style={position.includes('bottom') ? { bottom: getBottomPosition(), position: 'fixed' } : {}}>
      <div className={`
        bg-gradient-to-br from-amber-100 to-amber-200 
        border border-amber-300 
        rounded-2xl shadow-lg 
        px-4 py-3 max-w-xs
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
      `}>
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm text-amber-900 font-medium flex-1">{message}</p>
          <button 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-amber-700 hover:text-amber-900 text-lg leading-none flex-shrink-0 cursor-pointer z-10 relative"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastBar({ open, text, onClose }){
  const [autoCloseTimer, setAutoCloseTimer] = useState(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  // Handle iOS Safari dynamic viewport changes
  React.useEffect(() => {
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setViewportHeight(window.innerHeight);
    };
    
    // Initial set
    updateViewportHeight();
    
    // Listen for viewport changes (iOS Safari address bar)
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    
    // Also listen for scroll events which can trigger viewport changes on iOS
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateViewportHeight();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Auto-close after 6 seconds
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // 6 seconds
      
      setAutoCloseTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
    }
  }, [open, onClose]);
  
  const handleClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
    onClose();
  };
  
  return (
    <div 
      role="status" 
      aria-live="polite" 
      className={`fixed left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-[420px] transition-all duration-300 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`} 
      style={{ 
        bottom: '0px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        position: 'fixed',
        transform: 'translateX(-50%)',
        // Use dynamic viewport height for iOS Safari compatibility
        minHeight: 'auto',
        // Force to bottom of viewport
        bottom: 'env(safe-area-inset-bottom, 0px)',
        marginBottom: '0px'
      }} 
    >
      <div className="px-4 py-3 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] bg-amber-800 text-amber-50 text-sm text-center relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 w-6 h-6 text-amber-200 hover:text-white transition-colors flex items-center justify-center text-lg font-bold"
        >
          ×
        </button>
        
        {/* Text content */}
        <div className="pr-6">{text}</div>
      </div>
    </div>
  );
}

// Info Modal for footer links (Uitschrijven, Privacy, Informatie)
function InfoModal({ isOpen, onClose, type, lang }) {
  if (!isOpen) return null;
  
  const content = {
    uitschrijven: {
      title: lang === 'en' ? 'Unsubscribe' : 'Uitschrijven',
      text: lang === 'en' 
        ? `Have you signed up for our <strong>WhatsApp-updates?</strong>

We send you an occasional message about new dishes, fun specials and cozy events at 't Tolhuis.

Don't want to receive messages anymore? It's no problem: just send <strong>STOP</strong> via WhatsApp and you will be unsubscribed immediately.`
        : `Heb je je aangemeld voor onze <strong>WhatsApp-updates?</strong>

We sturen je af en toe een bericht over nieuwe gerechten, leuke specials en gezellige events bij 't Tolhuis.

Wil je geen berichten meer ontvangen? Dat is geen probleem: stuur gewoon <strong>STOP</strong> via WhatsApp en je wordt direct uitgeschreven.`
    },
    privacy: {
      title: lang === 'en' ? 'Privacy' : 'Privacy',
      text: lang === 'en'
        ? `At 't Tolhuis, we value trust.

We handle your data with care and use it solely to inform you about our own dishes, actions and events.

Your data is never shared, sold or passed on to third parties.

This way your privacy remains in good hands with us.`
        : `Bij 't Tolhuis vinden we vertrouwen belangrijk.

We gaan zorgvuldig om met jouw gegevens en gebruiken deze uitsluitend om je te informeren over onze eigen gerechten, acties en evenementen.

Jouw gegevens worden nooit gedeeld, verkocht of doorgegeven aan derden.

Zo blijft jouw privacy bij ons in goede handen.`
    },
    informatie: {
      title: lang === 'en' ? 'Information' : 'Informatie',
      text: lang === 'en'
        ? `This webapp has been developed by <strong>SlimmeGast.ai</strong>, specifically for 't Tolhuis.

The app helps guests find dishes faster that match their taste, preferences and moments of the day. By converting data into experience, each visit becomes a bit smarter - and especially more flavorful.

Curious what <strong>SlimmeGast.ai</strong> can do for your business? Send us a WhatsApp message with <strong>"Coffee?" via +31 (0)6 510 696 67.</strong>`
        : `Deze webapp is ontwikkeld door <strong>SlimmeGast.ai</strong>, speciaal voor 't Tolhuis.

De app helpt gasten om sneller gerechten te vinden die passen bij hun smaak, voorkeuren en momenten van de dag. Door data om te zetten in beleving wordt elk bezoek nét een beetje slimmer - en vooral smaakvoller.

Benieuwd wat <strong>SlimmeGast.ai</strong> voor jouw bedrijf kan doen? Stuur ons een WhatsApp-bericht met <strong>"Bakkie doen?" via +31 (0)6 510 696 67.</strong>`
    }
  };
  
  const info = content[type] || content.informatie;
  
  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-amber-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-serif font-medium">{info.title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-amber-800 rounded-full transition-colors"
            aria-label={lang === 'en' ? 'Close' : 'Sluiten'}
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div 
          className="px-6 py-6 text-amber-900 leading-relaxed whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: info.text.split('\n').join('<br />') }}
        />
      </div>
    </div>
  );
}

// WhatsApp Opt-in Subtle Slider (bottom-right)
function WhatsAppOptInPopup({ isVisible, onClose, onSubmit, data, setData, isSubmitting, lang }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    }
  }, [isVisible]);
  
  if (!isVisible) return null;

  const nameLabel = lang === 'nl' ? 'Naam' : 'Name';
  const phoneLabel = lang === 'nl' ? 'Telefoonnummer' : 'Phone number';
  const nameHasValue = data.name && data.name.trim().length > 0;
  const phoneHasValue = data.phone && data.phone.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgb(243 232 210 / 30%)' }}
        onClick={onClose}
      />
      
      {/* Popup in center - nieuwe styling */}
      <div className={`relative rounded-2xl shadow-lg border border-amber-200/50 w-full max-w-sm mx-auto transform transition-all duration-300 pointer-events-auto ${
        isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
      }`}
      style={{ backgroundColor: 'rgb(248 242 232 / var(--tw-bg-opacity, 1))' }}>
        <div className="px-4 pt-4 pb-0 border-b border-amber-200/30 flex items-center justify-between">
          <div style={{ color: 'rgb(120 53 15 / 0.8)', fontFamily: 'Mill Sorts Goudy, serif', fontSize: '20px', fontWeight: '400', paddingBottom: '0' }}>
            {lang === 'nl' ? 'Blijf als eerste op de hoogte via WhatsApp!' : 'Stay first in the loop via WhatsApp!'}
          </div>
          <button onClick={onClose} className="text-amber-600 hover:text-amber-800 text-lg leading-none">×</button>
        </div>
        <div className="px-4 pb-4">
          <div className="mb-4 text-sm leading-relaxed" style={{ color: 'rgb(120 53 15 / 0.8)' }}>
            {lang === 'nl' 
              ? 'Ontvang als eerste updates over nieuwe gerechten, seizoensspecials & events. Rechtstreeks in je app.'
              : 'Be the first to receive updates about new dishes, seasonal specials & events. Directly in your app.'
            }
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
            {/* Name field with floating label */}
            <div className="relative">
              <label 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  nameFocused || nameHasValue
                    ? 'top-1 text-xs text-amber-700'
                    : 'top-1/2 -translate-y-1/2 text-base text-amber-900/60'
                }`}
              >
                {nameLabel}
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData({...data, name: e.target.value})}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                className="w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg bg-white/80 focus:ring-1 focus:ring-amber-600 focus:border-amber-600 transition-all duration-200"
                style={{ color: 'rgb(120 53 15 / 0.9)' }}
                required
              />
            </div>
            
            {/* Phone field with floating label */}
            <div className="relative">
              <label 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  phoneFocused || phoneHasValue
                    ? 'top-1 text-xs text-amber-700'
                    : 'top-1/2 -translate-y-1/2 text-base text-amber-900/60'
                }`}
              >
                {phoneLabel}
              </label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => setData({...data, phone: e.target.value})}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                className="w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg bg-white/80 focus:ring-1 focus:ring-amber-600 focus:border-amber-600 transition-all duration-200"
                style={{ color: 'rgb(120 53 15 / 0.9)' }}
                required
              />
            </div>
            
            {/* Footer note */}
            <div className="text-xs leading-relaxed" style={{ color: 'rgb(120 53 15 / 0.6)' }}>
              {lang === 'nl' 
                ? 'Max. 2 tot 4 berichten per maand. Geen spam, alleen maar updates.'
                : 'Max. 2 to 4 messages per month. No spam, just updates.'
              }
            </div>
            
            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-600 text-amber-50 py-3 px-4 rounded-lg font-medium hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting 
                ? (lang === 'nl' ? 'Versturen...' : 'Sending...')
                : (lang === 'nl' ? 'Voeg me toe aan Whatsapp' : 'Add me to WhatsApp')
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PairingSlideCard({ pairing, dish, venue, lang, isOpen, onClose, weather, weatherCategory }){
  const t = i18n[lang];
  const [isVisible, setIsVisible] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState(null);
  const [aiDescription, setAiDescription] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [contextHint, setContextHint] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  
  // Swipe-to-dismiss functionality
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Minimum distance for swipe
  const minSwipeDistance = 50;
  
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };
  
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    // Swipe DOWN to close (touchEnd > touchStart means moving down)
    const distance = touchEnd - touchStart;
    const isDownSwipe = distance > minSwipeDistance;
    
    if (isDownSwipe) {
      // Cancel auto-close timer
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
      
      // Slide out immediately
      setIsVisible(false);
      setTimeout(() => {
        onClose();
      }, 300);
    }
  };

  
  // Generate AI description if needed (with cache check)
  useEffect(() => {
    const generateAI = async () => {
      // Safety check
      if (!dish || !pairing) {
        return;
      }
      
      // PRIORITY 1: Check for manual Sheets description (kolom D/J)
      const hasSheetDescription = lang === 'en' 
        ? (pairing?.description_en && pairing.description_en.trim().length > 0)
        : (pairing?.description && pairing.description.trim().length > 0);
      
      // PRIORITY 2: Check for AI cached description (kolom K/L)
      const hasAICachedDescription = lang === 'en'
        ? (pairing?.ai_description_en && pairing.ai_description_en.trim().length > 0)
        : (pairing?.ai_description_nl && pairing.ai_description_nl.trim().length > 0);
      
      console.log(' AI CHECK:', {
        pairing: pairing?.suggestion,
        hasSheetDescription,
        hasAICachedDescription,
        ai_cache_nl: pairing?.ai_description_nl,
        ai_cache_en: pairing?.ai_description_en,
        lang,
        needsGeneration: !hasSheetDescription && !hasAICachedDescription
      });
      
      // If we have AI cache, use it immediately
      if (hasAICachedDescription && !aiDescription) {
        const cachedText = lang === 'en' ? pairing.ai_description_en : pairing.ai_description_nl;
        console.log('� Using AI cache:', cachedText);
        setAiDescription(cachedText);
        return;
      }
      
      // Only generate NEW AI if no manual description AND no cache
      if (!hasSheetDescription && !hasAICachedDescription && !isLoadingAI && !aiDescription) {
        setIsLoadingAI(true);
        console.log(' GENERATING NEW AI for:', pairing?.suggestion);
        
        try {
          const params = {
            dishId: dish?.id,
            dishName: dish?.name || dish?.title || 'Dit gerecht',
            pairingSuggestion: lang === 'en' ? (pairing?.suggestion_en || pairing?.suggestion) : pairing?.suggestion,
            dishDescription: dish?.desc || dish?.description || '',
            lang: lang
          };
          console.log(' Calling with params:', params);
          
          const generated = await generatePairingDescription(params);
          
          console.log(' Generated result:', generated);
          
          if (generated) {
            console.log('AI SUCCESS + SAVED TO CACHE:', generated);
            setAiDescription(generated);
          } else {
            console.log('AI returned null/empty');
          }
        } catch (error) {
          console.error('AI ERROR:', error);
        } finally {
          setIsLoadingAI(false);
        }
      }
    };
    
    if (isOpen && pairing && dish) {
      generateAI();
    }
  }, [isOpen, pairing, dish, lang, aiDescription, isLoadingAI]);
  
  // Generate context hint based on weather/time
  useEffect(() => {
    const generateContext = async () => {
      if (!isOpen || !pairing || !weather || contextHint || isLoadingContext) return;
      
      setIsLoadingContext(true);
      
      try {
        const hint = await generateContextHint({
          pairingSuggestion: lang === 'en' ? (pairing?.suggestion_en || pairing?.suggestion) : pairing?.suggestion,
          weatherCategory: weatherCategory || 'neutral',
          temp: weather?.temp || 15,
          timeOfDay: getTimeOfDay(),
          season: getCurrentSeason(),
          lang: lang
        });
        
        if (hint) {
          setContextHint(hint);
          console.log(' Context hint for pairing:', hint);
        }
      } catch (error) {
        console.warn('Context hint generation failed:', error);
      } finally {
        setIsLoadingContext(false);
      }
    };
    
    if (isOpen && pairing && weather) {
      generateContext();
    }
  }, [isOpen, pairing, weather, weatherCategory, lang, contextHint, isLoadingContext]);
  
  useEffect(() => {
    if (isOpen) {
      // Slide in
      setIsVisible(true);
      
      // Auto slide out after 6 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Wait for animation to complete before calling onClose
        setTimeout(() => {
          onClose();
        }, 500);
      }, 8000);
      
      setAutoCloseTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      setIsVisible(false);
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
    }
  }, [isOpen, onClose]);
  
  if (!isOpen || !pairing) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] flex justify-center pb-0 px-4 pt-4 pointer-events-none">
      {/* Slide Card */}
      <div 
        className={`w-full max-w-md transform transition-all duration-500 ease-out pointer-events-auto ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        onClick={onClose}
      >
        <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-2xl shadow-lg overflow-hidden">
          {/* Swipe indicator */}
          <div className="w-8 h-1 bg-yellow-900/30 rounded-full mx-auto mt-2"></div>
          
          {/* Content */}
          <div className="px-6 py-5">
            <p className="font-serif text-lg sm:text-base text-yellow-900 leading-relaxed text-center">
              {(() => {
                let baseDescription = '';
                
                // PRIORITY 1: Manual Sheets description (kolom D/J)
                const sheetDescription = lang === 'en' 
                  ? (pairing?.description_en || pairing?.description)
                  : pairing?.description;
                
                if (sheetDescription && sheetDescription.trim().length > 0) {
                  baseDescription = sheetDescription;
                } else {
                  // PRIORITY 2: AI cached description from Sheets (kolom K/L)
                  const aiCachedDescription = lang === 'en'
                    ? pairing?.ai_description_en
                    : pairing?.ai_description_nl;
                  
                  if (aiCachedDescription && aiCachedDescription.trim().length > 0) {
                    baseDescription = aiCachedDescription;
                  } else {
                    // PRIORITY 3: Live AI generated (in state)
                    if (aiDescription) {
                      baseDescription = aiDescription;
                    } else {
                      // PRIORITY 4: Loading state (only if actively generating)
                      if (isLoadingAI) {
                        baseDescription = lang === 'en' ? '...' : '...';
                      } else {
                        // PRIORITY 5: Fallback
                        baseDescription = lang === 'en' ? 'Perfect combination!' : 'Perfecte combinatie!';
                      }
                    }
                  }
                }
                
                // Add subtle context-aware recommendations (only when it feels natural)
                if (contextHint && baseDescription && !baseDescription.includes('...')) {
                  // Only add context for specific weather conditions that make sense
                  const shouldAddContext = weatherCategory === 'rain' || weatherCategory === 'snow' || weatherCategory === 'cold' || weatherCategory === 'hot_sunny' || (weatherCategory === 'clouds_cool' && getCurrentSeason() === 'herfst');
                  
                  if (shouldAddContext) {
                    // Make it feel like a natural continuation, not a separate sentence
                    const cleanContextHint = contextHint.replace(/[^\w\s.,!?]/g, '').trim();
                    
                    // Integrate naturally by replacing the ending
                    const baseWithoutEnding = baseDescription.replace(/[.!?]$/, '').trim();
                    return `${baseWithoutEnding} - ${cleanContextHint.toLowerCase()}.`;
                  }
                }
                
                return baseDescription;
              })()}
            </p>
            
            {/* Close button */}
            <div className="absolute top-3 right-3">
              <button 
                onClick={() => {
                  setIsVisible(false);
                  if (autoCloseTimer) {
                    clearTimeout(autoCloseTimer);
                    setAutoCloseTimer(null);
                  }
                  setTimeout(onClose, 300);
                }}
                className="w-6 h-6 text-amber-800 hover:text-amber-900 transition-colors flex items-center justify-center text-lg font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/********************
 * Main App
 ********************/
function App(){
  // Start in NL, remember last choice if present
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('lang') || 'nl'; } catch { return 'nl'; } });
  const t = i18n[lang];
  
  // Debug language changes
  useEffect(() => {
    console.log(` Language changed to: ${lang}`);
    try {
      localStorage.setItem('lang', lang);
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  }, [lang]);
  
  // Force re-render when language changes
  const handleLangChange = (newLang) => {
    console.log(` App handleLangChange: ${lang} � ${newLang}`);
    setLang(newLang);
    console.log(` App setLang called with: ${newLang}`);
  };
  
  
  // Function to submit opt-in data to Google Sheets
  const submitOptInData = async () => {
    if (!optInData.name.trim() || !optInData.phone.trim()) {
      alert(lang === 'nl' ? 'Vul beide velden in' : 'Please fill in both fields');
      return;
    }
    
    setIsSubmittingOptIn(true);
    
    try {
      // Import the sheetsService
      const { saveOptInData } = await import('../services/sheetsService.js');
      
      // Prepare data for sheetsService
      const optInRecord = {
        name: optInData.name.trim(),
        phone: optInData.phone.trim(),
        lang: lang,
        user_taste: user.taste,
        user_diet: user.diet
      };
      
      // Save to Google Sheets via sheetsService
      const result = await saveOptInData(optInRecord);
      
      if (result.success) {
        // Clear form
        setOptInData({ name: '', phone: '' });
        setShowOptInModal(false);
        
        // Show success message
        setToast({
          open: true,
          text: lang === 'nl' 
            ? 'Bedankt! We nemen binnenkort contact met je op via WhatsApp.' 
            : 'Thank you! We will contact you soon via WhatsApp.'
        });
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Error submitting opt-in data:', error);
      alert(lang === 'nl' ? 
        'Er ging iets mis. Probeer het later opnieuw.' : 
        'Something went wrong. Please try again later.'
      );
    } finally {
      setIsSubmittingOptIn(false);
    }
  };
  
  // WhatsApp Opt-in Modal State - using existing state from main component
  
  // Function to submit opt-in data - using main component function
  const [step, setStep] = useState(0); // 0=intro,1=taste,2=diet,3=name,4=menu
  const [user, setUser] = useState({ name:'', diet:'meat', taste:'Licht & Fris', phone:'' });
  const [menuFilters, setMenuFilters] = useState({ vegetarian: false, glutenFree: false });
  const [toast, setToast] = useState({ open:false, text:'' });
  const [showPairingCard, setShowPairingCard] = useState(false);
  const [currentPairing, setCurrentPairing] = useState(null);
  
  // WhatsApp teaser: show small button after 15s on intro (step 0)
  const [showOptInTeaser, setShowOptInTeaser] = useState(false);
  const [showOptInFloating, setShowOptInFloating] = useState(false);
  useEffect(() => {
    console.log('� Opt-in teaser effect: current step =', step);
    if (step === 0) {
      console.log('� Scheduling teaser timer for intro (10s)');
      const timer = setTimeout(() => {
        const hasOptedIn = localStorage.getItem('tolhuis-optin');
        const hasDeclined = localStorage.getItem('tolhuis-optin-declined');
        console.log(' Opt-in teaser timer fired. hasOptedIn:', hasOptedIn, 'hasDeclined:', hasDeclined);
        
        // Tijdelijk: altijd tonen voor testing (verwijder deze regel later)
        console.log(' TEST MODE: Always showing WhatsApp button');
        setShowOptInTeaser(true);
        
        // Originele logica (uitgecommentarieerd voor testing):
        // if (!hasOptedIn && !hasDeclined) {
        //   console.log(' Showing opt-in teaser button');
        //   setShowOptInTeaser(true);
        // }
      }, 10000);
      return () => clearTimeout(timer);
    } else if (step === 4) {
      // Also allow teaser on menu if not opted-in, after 10s
      console.log('� Scheduling teaser timer for menu (10s)');
      const timer = setTimeout(() => {
        const hasOptedIn = localStorage.getItem('tolhuis-optin');
        const hasDeclined = localStorage.getItem('tolhuis-optin-declined');
        console.log(' Opt-in teaser (menu) timer fired. hasOptedIn:', hasOptedIn, 'hasDeclined:', hasDeclined);
        
        // Tijdelijk: altijd tonen voor testing (verwijder deze regel later)
        console.log(' TEST MODE: Always showing WhatsApp button on menu');
        setShowOptInTeaser(true);
        
        // Originele logica (uitgecommentarieerd voor testing):
        // if (!hasOptedIn && !hasDeclined) {
        //   console.log(' Showing opt-in teaser button on menu');
        //   setShowOptInTeaser(true);
        // }
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setShowOptInTeaser(false);
    }
  }, [step]);

  // Floating WhatsApp button after 20s on menu page
  useEffect(() => {
    if (step === 4) {
      console.log('� Scheduling floating WhatsApp button timer (20s)');
      const timer = setTimeout(() => {
        const hasOptedIn = localStorage.getItem('tolhuis-optin');
        const hasDeclined = localStorage.getItem('tolhuis-optin-declined');
        console.log(' Floating WhatsApp timer fired. hasOptedIn:', hasOptedIn, 'hasDeclined:', hasDeclined);
        
        // Tijdelijk: altijd tonen voor testing
        console.log(' TEST MODE: Always showing floating WhatsApp button');
        setShowOptInFloating(true);
        
        // Originele logica (uitgecommentarieerd voor testing):
        // if (!hasOptedIn && !hasDeclined) {
        //   console.log(' Showing floating WhatsApp button');
        //   setShowOptInFloating(true);
        // }
      }, 20000);
      return () => clearTimeout(timer);
    } else {
      setShowOptInFloating(false);
    }
  }, [step]);
  const [currentPeriod, setCurrentPeriod] = useState("Laden..."); // Fallback periode
  const [weekmenuData, setWeekmenuData] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherCategory, setWeatherCategory] = useState('neutral');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [smartBubble, setSmartBubble] = useState(null);
  const [lastBubbleTime, setLastBubbleTime] = useState(0);
  
  // WhatsApp Opt-in Modal State
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [optInData, setOptInData] = useState({ name: '', phone: '' });
  const [isSubmittingOptIn, setIsSubmittingOptIn] = useState(false);
  
  // Info Modal State (for footer links)
  const [infoModalType, setInfoModalType] = useState(null); // null, 'uitschrijven', 'privacy', 'informatie'
  const [smartBubblesData, setSmartBubblesData] = useState([]);
  const [pairingData, setPairingData] = useState([]);
  const [menuData, setMenuData] = useState([]); // Menu data uit Google Sheets
  // Smart default menu category based on time of day
  const getDefaultMenuCategory = () => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
    
    // 06:00 - 11:00 = Ontbijt (alle dagen inclusief vrijdag)
    if (hour >= 6 && hour < 11) return 'ontbijt';
    
    // 11:00 - 16:00 = Lunch (ook vrijdag tot 16:00)
    if (hour >= 11 && hour < 16) return 'lunch';
    
     // VRIMIBO! Vrijdag vanaf 16:00 = Borrel 🍻
    if (dayOfWeek === 5 && hour >= 16) return 'borrel';
    
    // 16:00/17:00 - 23:00 = Diner (ma-do vanaf 16:00, anders 17:00)
    if (hour >= 16 && hour < 23) return 'diner';
    
    // 23:00 - 06:00 = Borrel (late evening/night)
    return 'borrel';
  };
  
  const [selectedMenuCategory, setSelectedMenuCategory] = useState(getDefaultMenuCategory());
  const [selectedDrinksSubcategory, setSelectedDrinksSubcategory] = useState('all'); // Default to all drinks
  const [chefRecommendationTitle, setChefRecommendationTitle] = useState('');
  const [preloadedTranslations, setPreloadedTranslations] = useState({});
  
  // Pre-load AI translations for all dishes (weekmenu + regular menu)
  useEffect(() => {
    const preloadAllTranslations = async () => {
      if (!weekmenuData || weekmenuData.length === 0) return;
      
      try {
        const { generateDishTranslation } = await import('../utils/openaiProxy.js');
        const translations = {};
        
        // Process ALL weekmenu items (no limit - dynamic based on Google Sheets)
        console.log(` Pre-loading translations for ${weekmenuData.length} weekmenu items...`);
        for (const dish of weekmenuData) {
          const dishId = dish.id || `${dish.name}-${dish.title}`;
          
          // Skip if manual translation exists
          if (dish.title_en && dish.title_en.trim() !== '' && dish.description_en && dish.description_en.trim() !== '') {
            console.log(`� Skipping ${dish.name} - manual translation exists`);
            continue;
          }
          
          // Skip if already cached
          if (dish.ai_title_en && dish.ai_title_en.trim() !== '') {
            console.log(`� Skipping ${dish.name} - AI cache exists`);
            continue;
          }
          
          // Generate AI translation
          try {
            console.log(` Generating AI translation for ${dish.name}...`);
            const translation = await generateDishTranslation({
              title: dish.title || dish.name,
              description: dish.description || dish.desc || ''
            });
            translations[dishId] = translation;
            console.log(` Pre-loaded translation for ${dish.name}:`, translation);
          } catch (error) {
            console.warn(` Pre-load failed for ${dish.name}:`, error);
          }
        }
        
        // Also pre-load translations for top ranked dishes (including specialDish)
        if (ranked && ranked.length > 0) {
          const topDishes = ranked.slice(0, 10); // Pre-load top 10 dishes to catch specialDish
          console.log(` Pre-loading translations for top ${topDishes.length} ranked dishes...`);
          for (const dish of topDishes) {
            const dishId = dish.id || `${dish.name}-${dish.title}`;
            
            // Skip if already processed or manual translation exists
            if (translations[dishId] || (dish.title_en && dish.title_en.trim() !== '' && dish.description_en && dish.description_en.trim() !== '')) {
              continue;
            }
            
            // Skip if already cached
            if (dish.ai_title_en && dish.ai_title_en.trim() !== '') {
              continue;
            }
            
            // Generate AI translation
            try {
              console.log(` Generating AI translation for top dish ${dish.name}...`);
              const translation = await generateDishTranslation({
                title: dish.title || dish.name,
                description: dish.description || dish.desc || ''
              });
              translations[dishId] = translation;
              console.log(` Pre-loaded translation for top dish ${dish.name}:`, translation);
            } catch (error) {
              console.warn(` Pre-load failed for top dish ${dish.name}:`, error);
            }
          }
        }
        
        // Also pre-load translations for personal recommendations
        if (personalRecommendations && personalRecommendations.length > 0) {
          console.log(` Pre-loading translations for ${personalRecommendations.length} personal recommendations...`);
          for (const dish of personalRecommendations) {
            const dishId = dish.id || `${dish.name}-${dish.title}`;
            
            // Skip if already processed or manual translation exists
            if (translations[dishId] || (dish.title_en && dish.title_en.trim() !== '' && dish.description_en && dish.description_en.trim() !== '')) {
              continue;
            }
            
            // Skip if already cached
            if (dish.ai_title_en && dish.ai_title_en.trim() !== '') {
              continue;
            }
            
            // Generate AI translation
            try {
              console.log(` Generating AI translation for personal recommendation ${dish.name}...`);
              const translation = await generateDishTranslation({
                title: dish.title || dish.name,
                description: dish.description || dish.desc || ''
              });
              translations[dishId] = translation;
              console.log(` Pre-loaded translation for personal recommendation ${dish.name}:`, translation);
            } catch (error) {
              console.warn(` Pre-load failed for personal recommendation ${dish.name}:`, error);
            }
          }
        }
        
        // Also pre-load translations for common pairings
        console.log(` Pre-loading translations for common pairings...`);
        const commonPairings = ['Speciaal biertje', 'Huiswijn', 'Cappuccino', 'Espresso', 'Thee', 'Frisdrank'];
        for (const pairing of commonPairings) {
          try {
            console.log(` Generating AI translation for pairing ${pairing}...`);
            const translation = await generateDishTranslation({
              title: pairing,
              description: ''
            });
            translations[`pairing_${pairing}`] = translation;
            console.log(` Pre-loaded pairing translation for ${pairing}:`, translation);
          } catch (error) {
            console.warn(` Pre-load failed for pairing ${pairing}:`, error);
          }
        }
        
        setPreloadedTranslations(translations);
        console.log(' Pre-loaded translations:', translations);
      } catch (error) {
        console.warn(' Pre-loading translations failed:', error);
      }
    };
    
    preloadAllTranslations();
  }, [weekmenuData, ranked, personalRecommendations]);
  
  // Smart bubble upsell trigger
  const triggerSmartBubble = async () => {
    const now = Date.now();
    const timeSinceLastBubble = now - lastBubbleTime;
    
    // Don't show bubbles too frequently (min 15 seconds apart)
    if (timeSinceLastBubble < 15000) {
      console.log(' Bubble cooldown active, skipping...');
      return;
    }
    
    // Only show on menu page (step 4)
    if (step !== 4) {
      return;
    }
    
    try {
      console.log(' Generating SmartBubble with data:', {
        userTaste: user.taste,
        weatherCategory: weatherCategory,
        temp: weather?.temp || 15,
        smartBubblesDataLength: smartBubblesData.length
      });
      
      const upsellMessage = await generateSmartUpsell({
        userTaste: user.taste,
        weatherCategory: weatherCategory,
        temp: weather?.temp || 15,
        timeOfDay: getTimeOfDay(),
        season: getCurrentSeason(),
        lang: lang,
        smartBubblesData: smartBubblesData
      });
      
      console.log(' Generated upsell message:', upsellMessage);
      
      if (upsellMessage) {
        setSmartBubble({
          message: upsellMessage,
          position: 'bottom-left'
        });
        setLastBubbleTime(now);
        console.log(' Smart bubble triggered:', upsellMessage);
      } else {
        console.log(' No upsell message generated');
      }
    } catch (error) {
      console.warn('Failed to generate smart bubble:', error);
    }
  };

  // Auto-trigger smart bubbles based on user behavior
  useEffect(() => {
    if (step === 4) {
      console.log(' Setting up SmartBubble timers for step 4, weather:', weather);
      // Show first bubble after 10 seconds on menu page
      const timer1 = setTimeout(() => {
        console.log(' Timer 1 (10s) triggered');
        triggerSmartBubble();
      }, 10000);
      
      // Show second bubble after 30 seconds
      const timer2 = setTimeout(() => {
        console.log(' Timer 2 (30s) triggered');
        triggerSmartBubble();
      }, 30000);
      
      // Show third bubble after 60 seconds
      const timer3 = setTimeout(() => {
        console.log(' Timer 3 (60s) triggered');
        triggerSmartBubble();
      }, 60000);
      
      // Show fourth bubble after 90 seconds
      const timer4 = setTimeout(() => {
        console.log(' Timer 4 (90s) triggered');
        triggerSmartBubble();
      }, 90000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [step, weather, user.taste, weatherCategory, lang]);
  
  // Load SmartBubbles data
  useEffect(() => {
    const loadSmartBubbles = async () => {
      try {
        const data = await getSmartBubblesData();
        setSmartBubblesData(data);
        console.log(' SmartBubbles data loaded:', data.length, 'items');
        console.log(' SmartBubbles data sample:', data.slice(0, 3));
      } catch (error) {
        console.warn('Failed to load SmartBubbles data:', error);
        setSmartBubblesData([]);
      }
    };
    loadSmartBubbles();
  }, []);
  
  // Debug log when pairingData changes
  useEffect(() => {
    console.log('� pairingData state changed:', pairingData.length, 'items');
    if (pairingData.length > 0) {
      console.log('� pairingData sample:', pairingData.slice(0, 2));
    } else {
      console.log(' pairingData is EMPTY! Why?');
      console.trace('Stack trace for empty pairingData');
    }
  }, [pairingData]);
  
  // Debug log when menuData changes
  useEffect(() => {
    console.log(' menuData state changed:', menuData.length, 'items');
    if (menuData.length > 0) {
      console.log(' menuData sample:', menuData.slice(0, 2));
    }
  }, [menuData]);

  // Generate chef recommendation title when user taste changes
  useEffect(() => {
    const generateTitle = async () => {
      if (user.taste) {
        const title = await generateChefRecommendationTitle(user.taste, lang);
        setChefRecommendationTitle(title);
      } else {
        setChefRecommendationTitle(lang === 'nl' ? 'Voor jou geselecteerd' : 'Selected for you');
      }
    };
    
    generateTitle();
  }, [user.taste, lang]);
  

  // Generate 3 personal recommendations from regular menu (excluding weekmenu items and drinks)
  const personalRecommendations = useMemo(() => {
    if (!menuData.length) return [];
    
    // Convert menu data to dish format for ranking
    const menuDishes = menuData.map(item => ({
      id: item.id,
      name: item.title,
      title: item.title,
      title_en: item.title_en, // PRESERVE English translations!
      subtitle: item.subtitle, // Nieuwe subtitle veld
      desc: item.description,
      description: item.description,
      description_en: item.description_en, // PRESERVE English translations!
      price: item.price,
      type: item.type,
      diet: item.diet,
      tags: item.tags,
      supplier: item.supplier,
      section: item.section,
      category: item.category // Nieuwe category veld
    }));
    
    // Filter out weekmenu items and drinks to avoid duplicates
    const weekmenuIds = new Set(weekmenuData.map(item => item.id));
    
    // STRICT FILTER: Only include REAL FOOD items, exclude ALL drinks
    const nonWeekmenuDishes = menuDishes.filter(dish => {
      // Exclude week menu items
      if (weekmenuIds.has(dish.id)) {
        return false;
      }
      
      const title = dish.name?.toLowerCase() || '';
      const section = dish.section?.toLowerCase() || '';
      const category = dish.category?.toLowerCase() || '';
      
      // STRICT: Exclude ANYTHING that looks like a drink
      const isDrinkBySection = section.includes('drank') || section.includes('wijn') || 
          section.includes('bier') || section.includes('cocktail') || section.includes('bubbel') || 
          section.includes('dranken') || section.includes('drink') || section.includes('beverage') ||
          section.includes('alcohol') || section.includes('spirit') || section.includes('wine') ||
          section.includes('beer') || section.includes('coffee') || section.includes('tea') ||
          section.includes('drinken');
      
      const isDrinkByCategory = category.includes('drank') || category.includes('wijn') || 
          category.includes('bier') || category.includes('cocktail') || category.includes('bubbel') || 
          category.includes('dranken') || category.includes('drink') || category.includes('beverage') ||
          category.includes('alcohol') || category.includes('spirit') || category.includes('wine') ||
          category.includes('beer') || category.includes('coffee') || category.includes('tea') ||
          category.includes('drinken');
      
      const isDrinkByName = title.includes('hennessy') || title.includes('cognac') || 
          title.includes('whisky') || title.includes('whiskey') || title.includes('wijn') || 
          title.includes('bier') || title.includes('cocktail') || title.includes('koffie') || 
          title.includes('espresso') || title.includes('thee') || title.includes('jus d\'orange') ||
          title.includes('bobby\'s') || title.includes('bombay') || title.includes('gin') ||
          title.includes('rum') || title.includes('vodka') || title.includes('tequila') ||
          title.includes('champagne') || title.includes('prosecco') || title.includes('cava') ||
          title.includes('amstel') || title.includes('radler') || title.includes('cola') ||
          title.includes('fanta') || title.includes('sprite') || title.includes('water') ||
          title.includes('limonade') || title.includes('sap') || title.includes('juice') ||
          title.includes('drank') || title.includes('drink') || title.includes('bubbel') ||
          title.includes('sparkling') || title.includes('mineraal') || title.includes('frisdrank') ||
          // Wijnmerken
          title.includes('casa silva') || title.includes('pucari') || title.includes('domaine') ||
          title.includes('ch�teau') || title.includes('bordeaux') || title.includes('burgundy') ||
          title.includes('pinot') || title.includes('chardonnay') || title.includes('sauvignon') ||
          title.includes('merlot') || title.includes('cabernet') || title.includes('syrah') ||
          title.includes('riesling') || title.includes('gewürztraminer') || title.includes('malbec') ||
          title.includes('tempranillo') || title.includes('sangiovese') || title.includes('barbera') ||
          // Likeuren en sterke dranken
          title.includes('bailey\'s') || title.includes('amaretto') || title.includes('disaronno') ||
          title.includes('likeur') || title.includes('liqueur') || title.includes('cognac') ||
          title.includes('brandy') || title.includes('sherry') || title.includes('port') ||
          title.includes('vermouth') || title.includes('aperitif') || title.includes('digestif');
      
      const isDrink = isDrinkBySection || isDrinkByCategory || isDrinkByName;
      
      // DEBUG: Log items that are being filtered out
      if (isDrink) {
        console.log('� FILTERING OUT DRINK:', { 
          name: dish.name, 
          section: dish.section, 
          category: dish.category,
          isDrinkBySection, 
          isDrinkByCategory,
          isDrinkByName 
        });
      }
      
      return !isDrink;
    });
    
    // Use existing ranking logic with fallback context
    const safeContext = context || { daypart: 'dinner' };
    const rankedMenuDishes = gpt5RankDishes({ user, context: safeContext, dishes: nonWeekmenuDishes });
    
    // DAYPART-SPECIFIC RECOMMENDATIONS
    const currentDaypart = safeContext.daypart;
    console.log(' Creating daypart-specific recommendations for:', currentDaypart);
    console.log(' Available dishes for ranking:', rankedMenuDishes.map(d => ({ 
      name: d.name, 
      type: d.type, 
      diet: d.diet, 
      tags: d.tags,
      score: d.score,
      section: d.section,
      category: d.category
    })));
    
    // EXTRA CHECK: Make sure NO drinks made it through
    const drinksInRanking = rankedMenuDishes.filter(d => {
      const name = d.name?.toLowerCase() || '';
      const section = d.section?.toLowerCase() || '';
      const category = d.category?.toLowerCase() || '';
      
      return name.includes('koffie') || name.includes('bier') || name.includes('wijn') || 
             name.includes('cola') || name.includes('water') || name.includes('sap') ||
             section.includes('drinken') || category.includes('drinken');
    });
    
    if (drinksInRanking.length > 0) {
      console.error(' DRINKS STILL IN RANKING:', drinksInRanking.map(d => d.name));
    } else {
      console.log(' NO DRINKS IN RANKING - FILTERING WORKING!');
    }
    
    if (currentDaypart === 'dinner') {
      // DINER: 1x voorgerecht + 1x hoofdgerecht (precies 2 gerechten) - GEEN lunch/ontbijt items
      const voorgerechten = rankedMenuDishes.filter(d => {
        const category = d.category?.toLowerCase() || '';
        const name = d.name?.toLowerCase() || '';
        const tags = d.tags || [];
        
        // Exclude lunch/breakfast items
        if (category === 'lunch' || category === 'breakfast' || category === 'ontbijt' ||
            name.includes('tosti') || name.includes('broodje') || name.includes('sandwich') ||
            name.includes('ontbijt') || name.includes('breakfast') ||
            tags.includes('lunch') || tags.includes('ontbijt') || tags.includes('breakfast')) {
          return false;
        }
        
        return category === 'starter' || category === 'voorgerecht' || category === 'appetizer' ||
               name.includes('soep') || name.includes('salade') || name.includes('voorgerecht');
      });
      
      const hoofdgerechten = rankedMenuDishes.filter(d => {
        const category = d.category?.toLowerCase() || '';
        const name = d.name?.toLowerCase() || '';
        const tags = d.tags || [];
        
        // Exclude lunch/breakfast items
        if (category === 'lunch' || category === 'breakfast' || category === 'ontbijt' ||
            name.includes('tosti') || name.includes('broodje') || name.includes('sandwich') ||
            name.includes('ontbijt') || name.includes('breakfast') ||
            tags.includes('lunch') || tags.includes('ontbijt') || tags.includes('breakfast')) {
          return false;
        }
        
        return category === 'main' || category === 'diner' || category === 'hoofdgerecht' || category === 'entree' ||
               (!name.includes('soep') && !name.includes('salade') && !name.includes('voorgerecht') && 
                !name.includes('dessert'));
      });
      
      console.log(' Voorgerechten found:', voorgerechten.map(v => v.name));
      console.log(' Hoofdgerechten found:', hoofdgerechten.map(h => h.name));
      
      const recommendations = [];
      
      // IMPROVED LOGIC: Probeer eerst 1 voorgerecht + 1 hoofdgerecht
      if (voorgerechten.length > 0) {
        recommendations.push(voorgerechten[0]);
      }
      
      if (hoofdgerechten.length > 0) {
        // Voorkom duplicaten - kies het beste hoofdgerecht dat niet al geselecteerd is
        const selectedHoofdgerecht = hoofdgerechten.find(h => !recommendations.includes(h));
        if (selectedHoofdgerecht) {
          recommendations.push(selectedHoofdgerecht);
        }
      }
      
      // Als we nog geen 2 gerechten hebben, vul aan met de beste gerechten (MAAR GEEN DRANKEN!)
      if (recommendations.length < 2) {
        const remainingDishes = rankedMenuDishes.filter(d => {
          if (recommendations.includes(d)) return false;
          
          // EXTRA CHECK: Geen dranken in fallback!
          const name = d.name?.toLowerCase() || '';
          const section = d.section?.toLowerCase() || '';
          const category = d.category?.toLowerCase() || '';
          
          return !(name.includes('koffie') || name.includes('bier') || name.includes('wijn') || 
                   name.includes('cocktail') || name.includes('drank') || name.includes('drink') ||
                   name.includes('hennessy') || name.includes('cognac') || name.includes('whisky') ||
                   name.includes('gin') || name.includes('rum') || name.includes('vodka') ||
                   name.includes('champagne') || name.includes('prosecco') || name.includes('cava') ||
                   name.includes('amstel') || name.includes('radler') || name.includes('cola') ||
                   name.includes('fanta') || name.includes('sprite') || name.includes('water') ||
                   name.includes('limonade') || name.includes('sap') || name.includes('juice') ||
                   section.includes('drank') || section.includes('wijn') || section.includes('bier') ||
                   section.includes('cocktail') || section.includes('bubbel') || section.includes('dranken') ||
                   section.includes('drink') || section.includes('beverage') || section.includes('alcohol') ||
                   section.includes('spirit') || section.includes('wine') || section.includes('beer') ||
                   section.includes('coffee') || section.includes('tea') || section.includes('drinken') ||
                   category.includes('drank') || category.includes('wijn') || category.includes('bier') ||
                   category.includes('cocktail') || category.includes('bubbel') || category.includes('dranken') ||
                   category.includes('drink') || category.includes('beverage') || category.includes('alcohol') ||
                   category.includes('spirit') || category.includes('wine') || category.includes('beer') ||
                   category.includes('coffee') || category.includes('tea') || category.includes('drinken'));
        });
        
        // Voorkom duplicaten in fallback
        const uniqueRemainingDishes = remainingDishes.filter(d => !recommendations.includes(d));
        recommendations.push(...uniqueRemainingDishes.slice(0, 2 - recommendations.length));
      }
      
      console.log(' Dinner recommendations (1 voorgerecht + 1 hoofdgerecht):', recommendations.map(r => ({ name: r.name, section: r.section, category: r.category })));
      return recommendations.slice(0, 2); // Zorg dat we precies 2 gerechten hebben
      
    } else if (currentDaypart === 'borrel') {
      // BORREL: mix van borrel snacks (precies 2 items) - GEEN dinner/lunch/breakfast items
      const borrelSnacks = rankedMenuDishes.filter(d => {
        const category = d.category?.toLowerCase() || '';
        const name = d.name?.toLowerCase() || '';
        const tags = d.tags || [];
        
        // Exclude dinner/lunch/breakfast items
        if (category === 'diner' || category === 'main' || category === 'hoofdgerecht' ||
            category === 'lunch' || category === 'breakfast' || category === 'ontbijt' ||
            name.includes('tosti') || name.includes('broodje') || name.includes('sandwich') ||
            name.includes('ontbijt') || name.includes('breakfast') ||
            tags.includes('diner') || tags.includes('lunch') || tags.includes('ontbijt') || tags.includes('breakfast')) {
          return false;
        }
        
        return category === 'borrel' || category === 'starter' || category === 'side' || 
               tags.includes('borrel') || tags.includes('snack') ||
               name.includes('borrel') || name.includes('hapje') ||
               name.includes('bitterbal') || name.includes('kaas') ||
               name.includes('worst') || name.includes('olijf');
      });
      
      // Als er niet genoeg borrel snacks zijn, vul aan met andere gerechten (MAAR GEEN DRANKEN!)
      let recommendations = borrelSnacks.slice(0, 2);
      if (recommendations.length < 2) {
        const remainingDishes = rankedMenuDishes.filter(d => {
          if (recommendations.includes(d)) return false;
          
          // EXTRA CHECK: Geen dranken in fallback!
          const name = d.name?.toLowerCase() || '';
          const section = d.section?.toLowerCase() || '';
          const category = d.category?.toLowerCase() || '';
          
          return !(name.includes('koffie') || name.includes('bier') || name.includes('wijn') || 
                   name.includes('cocktail') || name.includes('drank') || name.includes('drink') ||
                   name.includes('hennessy') || name.includes('cognac') || name.includes('whisky') ||
                   name.includes('gin') || name.includes('rum') || name.includes('vodka') ||
                   name.includes('champagne') || name.includes('prosecco') || name.includes('cava') ||
                   name.includes('amstel') || name.includes('radler') || name.includes('cola') ||
                   name.includes('fanta') || name.includes('sprite') || name.includes('water') ||
                   name.includes('limonade') || name.includes('sap') || name.includes('juice') ||
                   section.includes('drank') || section.includes('wijn') || section.includes('bier') ||
                   section.includes('cocktail') || section.includes('bubbel') || section.includes('dranken') ||
                   section.includes('drink') || section.includes('beverage') || section.includes('alcohol') ||
                   section.includes('spirit') || section.includes('wine') || section.includes('beer') ||
                   section.includes('coffee') || section.includes('tea') || section.includes('drinken') ||
                   category.includes('drank') || category.includes('wijn') || category.includes('bier') ||
                   category.includes('cocktail') || category.includes('bubbel') || category.includes('dranken') ||
                   category.includes('drink') || category.includes('beverage') || category.includes('alcohol') ||
                   category.includes('spirit') || category.includes('wine') || category.includes('beer') ||
                   category.includes('coffee') || category.includes('tea') || category.includes('drinken'));
        });
        recommendations.push(...remainingDishes.slice(0, 2 - recommendations.length));
      }
      
      console.log('� Borrel recommendations (precies 2):', recommendations.map(r => r.name));
      return recommendations.slice(0, 2);
      
    } else if (currentDaypart === 'breakfast') {
      // ONTBIJT: variaties van ontbijt items (precies 2 items) - GEEN dinner/lunch/borrel items
      const breakfastItems = rankedMenuDishes.filter(d => {
        const category = d.category?.toLowerCase() || '';
        const name = d.name?.toLowerCase() || '';
        const tags = d.tags || [];
        
        // Exclude dinner/lunch/borrel items
        if (category === 'diner' || category === 'main' || category === 'hoofdgerecht' ||
            category === 'lunch' || category === 'borrel' ||
            name.includes('tosti') || name.includes('broodje') || name.includes('sandwich') ||
            name.includes('borrel') || name.includes('hapje') ||
            tags.includes('diner') || tags.includes('lunch') || tags.includes('borrel')) {
          return false;
        }
        
        return category === 'breakfast' || category === 'ontbijt' ||
               tags.includes('ontbijt') || tags.includes('breakfast') ||
               name.includes('ontbijt') || name.includes('breakfast') ||
               name.includes('brood') || name.includes('ei') ||
               name.includes('pancake') || name.includes('wafel');
      });
      
      // Als er niet genoeg ontbijt items zijn, vul aan met andere gerechten (MAAR GEEN DRANKEN!)
      let recommendations = breakfastItems.slice(0, 2);
      if (recommendations.length < 2) {
        const remainingDishes = rankedMenuDishes.filter(d => {
          if (recommendations.includes(d)) return false;
          
          // EXTRA CHECK: Geen dranken in fallback!
          const name = d.name?.toLowerCase() || '';
          const section = d.section?.toLowerCase() || '';
          const category = d.category?.toLowerCase() || '';
          
          return !(name.includes('koffie') || name.includes('bier') || name.includes('wijn') || 
                   name.includes('cocktail') || name.includes('drank') || name.includes('drink') ||
                   name.includes('hennessy') || name.includes('cognac') || name.includes('whisky') ||
                   name.includes('gin') || name.includes('rum') || name.includes('vodka') ||
                   name.includes('champagne') || name.includes('prosecco') || name.includes('cava') ||
                   name.includes('amstel') || name.includes('radler') || name.includes('cola') ||
                   name.includes('fanta') || name.includes('sprite') || name.includes('water') ||
                   name.includes('limonade') || name.includes('sap') || name.includes('juice') ||
                   section.includes('drank') || section.includes('wijn') || section.includes('bier') ||
                   section.includes('cocktail') || section.includes('bubbel') || section.includes('dranken') ||
                   section.includes('drink') || section.includes('beverage') || section.includes('alcohol') ||
                   section.includes('spirit') || section.includes('wine') || section.includes('beer') ||
                   section.includes('coffee') || section.includes('tea') || section.includes('drinken') ||
                   category.includes('drank') || category.includes('wijn') || category.includes('bier') ||
                   category.includes('cocktail') || category.includes('bubbel') || category.includes('dranken') ||
                   category.includes('drink') || category.includes('beverage') || category.includes('alcohol') ||
                   category.includes('spirit') || category.includes('wine') || category.includes('beer') ||
                   category.includes('coffee') || category.includes('tea') || category.includes('drinken'));
        });
        recommendations.push(...remainingDishes.slice(0, 2 - recommendations.length));
      }
      
      console.log(' Breakfast recommendations (precies 2):', recommendations.map(r => r.name));
      return recommendations.slice(0, 2);
      
    } else if (currentDaypart === 'lunch') {
      // LUNCH: lunch gerechten (precies 2 items) - GEEN dinner/breakfast/borrel items
      const lunchItems = rankedMenuDishes.filter(d => {
        const category = d.category?.toLowerCase() || '';
        const name = d.name?.toLowerCase() || '';
        const tags = d.tags || [];
        
        // Exclude dinner/breakfast/borrel items
        if (category === 'diner' || category === 'main' || category === 'hoofdgerecht' ||
            category === 'breakfast' || category === 'ontbijt' || category === 'borrel' ||
            name.includes('ontbijt') || name.includes('breakfast') ||
            name.includes('borrel') || name.includes('hapje') ||
            tags.includes('diner') || tags.includes('ontbijt') || tags.includes('breakfast') || tags.includes('borrel')) {
          return false;
        }
        
        return category === 'lunch' ||
               tags.includes('lunch') || tags.includes('middag') ||
               name.includes('lunch') || name.includes('middag') ||
               name.includes('sandwich') || name.includes('salade') ||
               name.includes('soep') || name.includes('pasta') ||
               name.includes('tosti') || name.includes('broodje');
      });
      
      // Als er niet genoeg lunch items zijn, vul aan met andere gerechten (MAAR GEEN DRANKEN!)
      let recommendations = lunchItems.slice(0, 2);
      if (recommendations.length < 2) {
        const remainingDishes = rankedMenuDishes.filter(d => {
          if (recommendations.includes(d)) return false;
          
          // EXTRA CHECK: Geen dranken in fallback!
          const name = d.name?.toLowerCase() || '';
          const section = d.section?.toLowerCase() || '';
          const category = d.category?.toLowerCase() || '';
          
          return !(name.includes('koffie') || name.includes('bier') || name.includes('wijn') || 
                   name.includes('cocktail') || name.includes('drank') || name.includes('drink') ||
                   name.includes('hennessy') || name.includes('cognac') || name.includes('whisky') ||
                   name.includes('gin') || name.includes('rum') || name.includes('vodka') ||
                   name.includes('champagne') || name.includes('prosecco') || name.includes('cava') ||
                   name.includes('amstel') || name.includes('radler') || name.includes('cola') ||
                   name.includes('fanta') || name.includes('sprite') || name.includes('water') ||
                   name.includes('limonade') || name.includes('sap') || name.includes('juice') ||
                   section.includes('drank') || section.includes('wijn') || section.includes('bier') ||
                   section.includes('cocktail') || section.includes('bubbel') || section.includes('dranken') ||
                   section.includes('drink') || section.includes('beverage') || section.includes('alcohol') ||
                   section.includes('spirit') || section.includes('wine') || section.includes('beer') ||
                   section.includes('coffee') || section.includes('tea') || section.includes('drinken') ||
                   category.includes('drank') || category.includes('wijn') || category.includes('bier') ||
                   category.includes('cocktail') || category.includes('bubbel') || category.includes('dranken') ||
                   category.includes('drink') || category.includes('beverage') || category.includes('alcohol') ||
                   category.includes('spirit') || category.includes('wine') || category.includes('beer') ||
                   category.includes('coffee') || category.includes('tea') || category.includes('drinken'));
        });
        recommendations.push(...remainingDishes.slice(0, 2 - recommendations.length));
      }
      
      console.log('� Lunch recommendations (precies 2):', recommendations.map(r => r.name));
      return recommendations.slice(0, 2);
      
    } else {
      // FALLBACK: top 2 recommendations (precies 2) - MAAR GEEN DRANKEN!
      const fallbackRecs = rankedMenuDishes.filter(d => {
        // EXTRA CHECK: Geen dranken in fallback!
        const name = d.name?.toLowerCase() || '';
        const section = d.section?.toLowerCase() || '';
        const category = d.category?.toLowerCase() || '';
        
        return !(name.includes('koffie') || name.includes('bier') || name.includes('wijn') || 
                 name.includes('cocktail') || name.includes('drank') || name.includes('drink') ||
                 name.includes('hennessy') || name.includes('cognac') || name.includes('whisky') ||
                 name.includes('gin') || name.includes('rum') || name.includes('vodka') ||
                 name.includes('champagne') || name.includes('prosecco') || name.includes('cava') ||
                 name.includes('amstel') || name.includes('radler') || name.includes('cola') ||
                 name.includes('fanta') || name.includes('sprite') || name.includes('water') ||
                 name.includes('limonade') || name.includes('sap') || name.includes('juice') ||
                 section.includes('drank') || section.includes('wijn') || section.includes('bier') ||
                 section.includes('cocktail') || section.includes('bubbel') || section.includes('dranken') ||
                 section.includes('drink') || section.includes('beverage') || section.includes('alcohol') ||
                 section.includes('spirit') || section.includes('wine') || section.includes('beer') ||
                 section.includes('coffee') || section.includes('tea') || section.includes('drinken') ||
                 category.includes('drank') || category.includes('wijn') || category.includes('bier') ||
                 category.includes('cocktail') || category.includes('bubbel') || category.includes('dranken') ||
                 category.includes('drink') || category.includes('beverage') || category.includes('alcohol') ||
                 category.includes('spirit') || category.includes('wine') || category.includes('beer') ||
                 category.includes('coffee') || category.includes('tea') || category.includes('drinken'));
      }).slice(0, 2);
      
      console.log(' Fallback recommendations (precies 2):', fallbackRecs.map(r => ({ name: r.name, section: r.section })));
      return fallbackRecs;
    }
  }, [menuData, user, context, weekmenuData]);
  
  const [dishPairings, setDishPairings] = useState({}); // Cache voor dish pairings
  const toastTimer = useRef(null);
  const showToast = (text) => { try{ if (toastTimer.current) clearTimeout(toastTimer.current); }catch{} setToast({open:true,text}); toastTimer.current=setTimeout(()=>setToast({open:false, text:''}), 4000); };
  useEffect(()=>{ try{ localStorage.setItem('lang', lang); }catch{} }, [lang]);
  
  // Update user taste preference when language changes
  useEffect(() => {
    const currentTasteCode = tasteToCode(user.taste);
    const newTasteLabel = i18n[lang].tastes.find(t => t.code === currentTasteCode)?.label;
    
    console.log(' Language change effect:', {
      lang,
      currentUserTaste: user.taste,
      currentTasteCode,
      newTasteLabel,
      willUpdate: newTasteLabel && newTasteLabel !== user.taste
    });
    
    // ALTIJD dish pairings cache legen bij taalwisseling
    console.log(' Clearing dish pairings cache due to language change');
    setDishPairings({});
    
    // Ook pairing data cache legen voor stabiliteit
    if (typeof window !== 'undefined' && window.clearPairingCache) {
      window.clearPairingCache();
      console.log(' Cleared pairing data cache');
    }
    
    if (newTasteLabel && newTasteLabel !== user.taste) {
      console.log(' Updating user taste from', user.taste, 'to', newTasteLabel);
      setUser(prev => ({ ...prev, taste: newTasteLabel }));
    }
  }, [lang]);

  // Haal dynamische periode op uit Google Sheets
  useEffect(() => {
    const loadPeriod = async () => {
      try {
        // Leeg cache om verse data op te halen
        clearPeriodCache();
        const period = await getCurrentPeriod();
        setCurrentPeriod(period);
        console.log('Periode geladen uit Sheets:', period);
      } catch (error) {
        console.warn('Kon periode niet laden uit Sheets:', error);
        setCurrentPeriod("Periode niet beschikbaar");
      }
    };
    
    loadPeriod();
  }, []);

  // Haal weather data op
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const weatherData = await getCurrentWeather();
        setWeather(weatherData);
        
        const category = getWeatherCategory(weatherData);
        setWeatherCategory(category);
        
        const timeOfDay = getTimeOfDay();
        const season = getCurrentSeason();
        
        // Context-aware welcome message based on weather, season, time
        const welcomeMsg = getWelcomeMessage(weatherData, season, timeOfDay, lang);
        setWelcomeMessage(welcomeMsg);
        
        console.log(' Weather loaded:', weatherData, '- Category:', category, '- Time:', timeOfDay, '- Season:', season, '- Welcome:', welcomeMsg);
      } catch (error) {
        console.warn('Could not load weather:', error);
        setWelcomeMessage(lang === 'nl' ? 'Fijn dat je er bent!' : 'Great to see you!');
      }
    };
    
    loadWeather();
  }, [lang]);

  // Haal weekmenu data op uit Google Sheets
  useEffect(() => {
    const loadWeekmenu = async () => {
      try {
        // Leeg cache om verse data op te halen
        clearWeekmenuCache();
        const weekmenu = await getWeekmenuData();
        setWeekmenuData(weekmenu);
        console.log(' Weekmenu geladen uit Sheets:', weekmenu.length, 'items');
        console.log('� Weekmenu items:', weekmenu.map(item => ({ 
          id: item.id, 
          title: item.title, 
          name: item.name,
          title_en: item.title_en,
          description_en: item.description_en,
          hasTitleEn: !!item.title_en,
          hasAiTitleEn: !!item.ai_title_en
        })));
        
        // DEBUG: Check if weekmenu items have the right structure
        if (weekmenu.length > 0) {
          console.log(' First weekmenu item structure:', weekmenu[0]);
          console.log(' All weekmenu item keys:', Object.keys(weekmenu[0]));
        } else {
          console.log(' No weekmenu items found!');
        }
      } catch (error) {
        console.warn(' Kon weekmenu niet laden uit Sheets:', error);
        setWeekmenuData([]);
      }
    };
    
    loadWeekmenu();
  }, []);

  // Haal pairing data op uit Google Sheets
  useEffect(() => {
    console.log(' useEffect voor pairing data wordt aangeroepen! lang:', lang);
    const loadPairings = async () => {
      try {
        console.log('� Loading pairing data...');
        // Clear cache to force fresh data
        clearPairingCache();
        // Clear dish pairings cache to force fresh generation
        setDishPairings({});
        // Add timestamp to force fresh fetch
        const timestamp = Date.now();
        console.log('�� Force refresh timestamp:', timestamp);
        const pairings = await getPairingData(true); // Force refresh
        console.log(' getPairingData returned:', pairings);
        console.log(' getPairingData length:', pairings?.length);
        console.log(' getPairingData type:', typeof pairings);
        console.log(' getPairingData is array:', Array.isArray(pairings));
        setPairingData(pairings);
        console.log(' Pairing data loaded:', pairings.length, 'items');
        console.log('� Pairing data details:', pairings);
        console.log('� Pairing data sample:', pairings.slice(0, 3));
        console.log('� Pairing dish IDs:', pairings.map(p => p.dish_id));
      } catch (error) {
        console.warn('Kon pairing data niet laden uit Sheets:', error);
        setPairingData([]);
      }
    };
    
    loadPairings();
  }, [lang]); // Reload pairing data when language changes

  // Load pairing data when dishes are shown (after quiz or on first page)
  useEffect(() => {
    const loadPairingsForDishes = async () => {
      if (menuData.length > 0 && pairingData.length === 0) {
        console.log(' Loading pairing data for dishes...');
        try {
          const pairings = await getPairingData(true);
          setPairingData(pairings);
          console.log(' Pairing data loaded for dishes:', pairings.length, 'items');
        } catch (error) {
          console.warn('Failed to load pairing data for dishes:', error);
        }
      }
    };
    
    loadPairingsForDishes();
  }, [menuData.length]); // Load when menu data is available

  // Haal menu data op uit Google Sheets
  useEffect(() => {
    console.log(' useEffect voor menu data wordt aangeroepen!');
    
    const loadMenu = async () => {
      try {
        console.log(' Loading menu data...');
        console.log(' About to call clearMenuCache...');
        // Clear cache to prevent duplicates
        clearMenuCache();
        console.log(' About to call getMenuData...');
        const menu = await getMenuData(true); // Force refresh
        console.log(' getMenuData returned:', menu);
        setMenuData(menu);
        console.log(' Menu data loaded:', menu.length, 'items');
        console.log(' Menu data details:', menu);
        console.log(' Menu sections found:', [...new Set(menu.map(m => m.section))]);
      } catch (error) {
        console.warn('Kon menu data niet laden uit Sheets:', error);
        setMenuData([]);
      }
    };
    
    loadMenu();
  }, []); // Load menu data once on mount


  const venue = demo.venue;
  const context = useMemo(()=>getContextSignals(), [step]);
  
  // Filter dishes based on menu filters
  const filteredDishes = useMemo(() => {
    // Gebruik weekmenu data als beschikbaar, anders fallback naar lege array
    let menuData;
    
    if (weekmenuData.length > 0) {
      menuData = weekmenuData;
      console.log(' Using weekmenuData from Google Sheets:', menuData.length, 'items');
    } else {
      menuData = [];
      console.log(' No data available - add items to Google Sheets');
    }
    
    console.log('� Menu Data Debug:', {
      weekmenuDataLength: weekmenuData.length,
      menuDataLength: menuData.length,
      usingWeekmenu: weekmenuData.length > 0,
      weekmenuData: weekmenuData,
      menuData: menuData
    });
    
    const filtered = menuData.filter(dish => {
      console.log(' Filtering dish:', {
        name: dish.name,
        diet: dish.diet,
        tags: dish.tags,
        type: dish.type,
        vegetarian: menuFilters.vegetarian,
        glutenFree: menuFilters.glutenFree
      });
      
      if (menuFilters.vegetarian && !(dish.diet?.includes('vega') || dish.diet?.includes('veg') || dish.diet?.includes('v') || dish.diet?.includes('vegetarisch') || dish.type === 'vega')) {
        console.log(' Filtered out (vegetarian):', dish.name, { diet: dish.diet, type: dish.type });
        return false;
      }
      if (menuFilters.glutenFree && !(dish.diet?.includes('glutfree') || dish.tags?.includes('glutfree') || dish.tags?.includes('gf') || dish.diet?.includes('glutenvrij') || dish.tags?.includes('glutenvrij'))) {
        console.log(' Filtered out (gluten-free):', dish.name, { diet: dish.diet, tags: dish.tags });
        return false;
      }
      console.log(' Keeping dish:', dish.name);
      return true;
    });
    
    console.log('� Final filtered dishes:', filtered.length, filtered);
    return filtered;
  }, [menuFilters, weekmenuData, weekmenuData.length]);
  
  const ranked = useMemo(()=> {
    console.log(' Ranking dishes:', { 
      filteredDishesLength: filteredDishes.length, 
      user: user,
      context: context,
      filteredDishes: filteredDishes.map(d => ({ id: d.id, name: d.name, type: d.type, diet: d.diet, tags: d.tags }))
    });
    const safeContext = context || { daypart: 'dinner' };
    const result = gpt5RankDishes({ user, context: safeContext, dishes: filteredDishes });
    console.log('� Ranked result:', result);
    return result;
  }, [user, context, filteredDishes]);
  
  const specialDish = useMemo(()=>{ 
    console.log(' Finding special dish:', { weekmenuDataLength: weekmenuData.length, rankedLength: ranked.length, currentDaypart: context?.daypart });
    
    // Gebruik weekmenu data om special dish te bepalen
    if (weekmenuData.length > 0) {
      // Neem het BESTE matching item uit weekmenu (eerste in ranked lijst)
      const weekmenuIds = new Set(weekmenuData.map(item => item.id));
      const found = ranked.find(d => weekmenuIds.has(d.id)) || null;
      console.log(' Special dish found:', found, 'from weekmenu items:', Array.from(weekmenuIds));
      return found;
    }
    
    // Als er geen weekmenu data is, neem het hoogst gerankte gerecht
    if (ranked.length > 0) {
      console.log(' No weekmenu data - using highest ranked dish:', ranked[0].name);
      return ranked[0];
    }
    
    // Geen data beschikbaar
    console.log(' No data available for special dish');
    return null;
  }, [ranked, weekmenuData, context]);

  // Categorize menu items based on their type from Google Sheets
  const menuCategories = useMemo(() => {
    console.log(' menuCategories useMemo triggered!');
    console.log('� menuData length:', menuData.length);
    
    if (!menuData.length) {
      console.log('� No menu data available');
      return {
        ontbijt: [],
        lunch: [],
        voorgerecht: [],
        diner: [],
        dessert: [],
        borrel: [],
        dranken: []
      };
    }
    
    console.log('� Processing menu data:', menuData.length, 'items');
    console.log('� First few items:', menuData.slice(0, 3));
    
    const categories = {
      ontbijt: [],
      lunch: [],
      voorgerecht: [],
      diner: [],
      dessert: [],
      borrel: [],
      dranken: []
    };
    
    // Categorization based on CATEGORY column (new structure)
    // Remove duplicates first to prevent accumulation bug
    const uniqueItems = menuData.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );
    
    console.log(` Original items: ${menuData.length}, Unique items: ${uniqueItems.length}`);
    
    uniqueItems.forEach(item => {
      const category = item.category?.toLowerCase() || '';
      const type = item.type?.toLowerCase() || ''; // Keep type for diet matching
      const section = item.section || '';
      const title = item.title || 'Unknown';
      
      console.log(`� Item: "${title}" with category: "${category}", type: "${type}" and section: "${section}"`);
      
      // SIMPLE FILTER: Only use CATEGORY column (most reliable)
      const isDrink = category?.toLowerCase() === 'drinken';
      
      // DEBUG: Log items that are being filtered out
      if (isDrink) {
        console.log('� FILTERING OUT DRINK FROM FOOD CATEGORIES:', { 
          name: title, 
          section: section, 
          category: category
        });
      }
      
      // Categorize by CATEGORY (new structure)
      if (category === 'breakfast' || category === 'ontbijt') {
        categories.ontbijt.push(item);
        console.log(` Added to ontbijt: ${title}`);
      } else if (category === 'lunch') {
        categories.lunch.push(item);
        console.log(` Added to lunch: ${title}`);
      } else if (category === 'starter' || category === 'voorgerecht') {
        categories.voorgerecht.push(item);
        console.log(` Added to voorgerecht: ${title}`);
      } else if (category === 'diner' || category === 'main' || category === 'hoofdgerecht') {
        categories.diner.push(item);
        console.log(` Added to diner: ${title}`);
      } else if (category === 'dessert') {
        categories.dessert.push(item);
        console.log(` Added to dessert: ${title}`);
      } else if (category === 'borrel') {
        categories.borrel.push(item);
        console.log(` Added to borrel: ${title}`);
      } else if (isDrink) {
        // Only add to dranken category and set correct subtitle
        // Check if already exists to prevent duplicates
        const alreadyExists = categories.dranken.some(existing => existing.id === item.id);
        if (!alreadyExists) {
          const drinkItem = { ...item, subtitle: 'Drank' };
          categories.dranken.push(drinkItem);
          console.log(` Added to dranken: ${title} (section: ${section}) with subtitle: Drank`);
        } else {
          console.log(` Skipped duplicate drink: ${title} (id: ${item.id})`);
        }
      } else {
        // Fallback to diner
        categories.diner.push(item);
        console.log(` Fallback to diner: ${title} (category: ${category})`);
      }
    });
    
    console.log('� Final categories:', {
      ontbijt: categories.ontbijt.length,
      lunch: categories.lunch.length,
      voorgerecht: categories.voorgerecht.length,
      diner: categories.diner.length,
      dessert: categories.dessert.length,
      borrel: categories.borrel.length,
      dranken: categories.dranken.length
    });
    
    return categories;
  }, [menuData]);

  // Get drinks subcategories based on section
  const drinksSubcategories = useMemo(() => {
    if (!menuCategories.dranken?.length) return [];
    
    const sections = [...new Set(menuCategories.dranken.map(item => item.section).filter(Boolean))];
    console.log('� Drinks subcategories found:', sections);
    console.log('� All dranken items with sections:', menuCategories.dranken.map(item => ({ 
      title: item.title, 
      section: item.section,
      category: item.category,
      id: item.id
    })));
    
    // Check if Casa Silva and Pucari have sections
    const casaSilva = menuCategories.dranken.find(item => item.title.toLowerCase().includes('casa silva'));
    const pucari = menuCategories.dranken.find(item => item.title.toLowerCase().includes('pucari'));
    
    if (casaSilva) console.log(' Casa Silva found:', casaSilva);
    if (pucari) console.log(' Pucari found:', pucari);
    
    return sections;
  }, [menuCategories.dranken]);


  const handleMenuFilterChange = (filterType, checked) => {
    setMenuFilters(prev => ({ ...prev, [filterType]: checked }));
  };

  // Direct drinks filter change - smooth like other filtering
  const handleDrinksSubcategoryChange = (subcategory) => {
    setSelectedDrinksSubcategory(subcategory);
  };


  // SMART PAIRING TEXT GENERATION - Use Sheets descriptions or generate with OpenAI
  const generatePairingText = async (pairing, lang) => {
    if (!pairing) return 'Perfecte combinatie!';
    
    // Get the correct pairing name based on language
    const pairingName = lang === 'en' ? (pairing.name_en || pairing.name) : pairing.name;
    
    console.log('� generatePairingText called:', {
      lang,
      pairingName,
      name: pairing.name,
      name_en: pairing.name_en,
      description: pairing.description,
      description_en: pairing.description_en
    });
    
    // PRIORITEIT 1: Use description from Google Sheets if available
    if (lang === 'en' && pairing.description_en) {
      console.log(' Using English description from Sheets for:', pairingName);
      return pairing.description_en;
    } else if (lang === 'nl' && pairing.description) {
      console.log(' Using Dutch description from Sheets for:', pairingName);
      return pairing.description;
    }
    
    // PRIORITEIT 2: Generate with OpenAI API if Sheets description is not available
    console.log(' Generating AI description for pairing:', pairingName);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer REDACTED_API_KEY`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: lang === 'en' 
                ? 'You are a sommelier. Create a short, enticing description (max 15 words) explaining why this pairing is perfect.'
                : 'Je bent een sommelier. Maak een korte, verleidelijke omschrijving (max 15 woorden) waarom deze pairing perfect is.'
            },
            {
              role: 'user',
              content: lang === 'en'
                ? `Why is ${pairingName} a perfect pairing?`
                : `Waarom is ${pairingName} een perfecte pairing?`
            }
          ],
          max_tokens: 40,
          temperature: 0.7
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const aiDescription = data.choices[0].message.content.trim();
        console.log(' AI generated description:', aiDescription);
        return aiDescription;
      } else {
        console.error(' API request failed with status:', response.status);
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error(' Error generating AI description:', error);
      // FALLBACK: Simple generic text
      return lang === 'en'
        ? `Perfect pairing with ${pairingName} - enhances the flavors beautifully.`
         : `Prachtige match met ${pairingName} — versterkt de smaken zonder te overheersen.`;
    }
  };

  // Generate pairings for a dish - prioritize Google Sheets pairings
  const handleShowPairing = async (pairing) => {
    console.log('� Showing pairing:', pairing);
    if (pairing && pairing.name) {
      // Generate pairing text first (async)
      const pairingText = await generatePairingText(pairing, lang);
       showToast(`${pairing.name} - €${pairing.price.toFixed(2)}`);
      
      // Show pairing card with generated text
      setShowPairingCard(true);
      setCurrentPairing({ ...pairing, description: pairingText });
    } else {
      showToast('Pairing informatie niet beschikbaar');
    }
  };

  const generatePairingsForDish = async (dish) => {
    console.log(' generatePairingsForDish START for dish:', dish.name, 'ID:', dish.id);
    console.log(' Current pairingData length:', pairingData.length);
    
    const cacheKey = `${dish.id}_${dish.name}_${user.taste}_${lang}`;
    
    console.log(' generatePairingsForDish called:', {
      dish: dish.name,
      dishId: dish.id,
      userTaste: user.taste,
      lang,
      cacheKey,
      pairingDataLength: pairingData.length
    });
    
    // Check cache first
    if (dishPairings[cacheKey]) {
      console.log('� Using cached pairings for', dish.name);
      return dishPairings[cacheKey];
    }
    
    // ALWAYS prioritize Google Sheets pairings first
    const allSheetsPairings = pairingData.filter(p => p.dish_id === dish.id && p.active);
    console.log('� All Google Sheets pairings for', dish.name, ':', allSheetsPairings.length);
    
    if (allSheetsPairings.length > 0) {
      // Get user taste code for matching
      const userTasteCode = tasteToCode(user.taste);
      console.log(' User taste code:', userTasteCode, 'from taste:', user.taste);
      
      // Score pairings based on match_tags
      const scoredPairings = allSheetsPairings.map(p => {
        let score = 0;
        
        // Check if match_tags includes user taste
        if (p.match_tags && p.match_tags.length > 0) {
          console.log('� Pairing tags for', p.suggestion, ':', p.match_tags);
          
          // Flexible matching - check for partial matches too
          const tagsLower = p.match_tags.map(tag => tag.toLowerCase().trim());
          
          // Exact match first
          if (tagsLower.includes(userTasteCode)) {
            score += 10;
            console.log(' EXACT TASTE MATCH for', p.suggestion);
          }
          // Partial matches for common variations
          else if (userTasteCode === 'light_fresh' && (tagsLower.includes('fris') || tagsLower.includes('licht') || tagsLower.includes('light') || tagsLower.includes('fresh'))) {
            score += 10;
            console.log(' PARTIAL MATCH (light_fresh) for', p.suggestion);
          }
          else if (userTasteCode === 'rich_hearty' && (tagsLower.includes('rijk') || tagsLower.includes('hartig') || tagsLower.includes('rich') || tagsLower.includes('hearty'))) {
            score += 10;
            console.log(' PARTIAL MATCH (rich_hearty) for', p.suggestion);
          }
          else if (userTasteCode === 'surprising_full' && (tagsLower.includes('verrassend') || tagsLower.includes('vol') || tagsLower.includes('surprising') || tagsLower.includes('full'))) {
            score += 10;
            console.log(' PARTIAL MATCH (surprising_full) for', p.suggestion);
          }
          // General matches
          else if (tagsLower.includes('all') || tagsLower.includes('*')) {
            score += 1;
            console.log(' GENERAL MATCH (all) for', p.suggestion);
          }
        } else {
          // No tags means it's for everyone
          score += 1;
        }
        
        // Add priority from column F
        score += (p.priority || 5);
        
        return { ...p, score };
      });
      
      // Sort by score (highest first)
      const sortedPairings = scoredPairings.sort((a, b) => b.score - a.score);
      console.log(' Sorted pairings for', dish.name, ':', sortedPairings.map(p => ({ suggestion: p.suggestion, score: p.score, tags: p.match_tags })));
      
      // Return top pairing(s)
      const selectedPairings = sortedPairings.slice(0, 3); // Max 3 pairings
      console.log(' Using Google Sheets pairings for', dish.name, ':', selectedPairings.length);
      
      // Cache the result
      setDishPairings(prev => ({ ...prev, [cacheKey]: selectedPairings }));
      return selectedPairings;
    }
    
    // Only generate AI pairings if no Google Sheets pairings exist
    console.log(' No Google Sheets pairings found, generating AI pairings for', dish.name);
    try {
      const aiPairings = await generateAIPairings(dish, user, lang, pairingData);
      console.log(' AI pairings for', dish.name, ':', aiPairings);
      
      // Cache the result
      setDishPairings(prev => ({ ...prev, [cacheKey]: aiPairings }));
      return aiPairings;
    } catch (error) {
      console.warn('Failed to generate AI pairings, using empty array:', error);
      setDishPairings(prev => ({ ...prev, [cacheKey]: [] }));
      return [];
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F3E8D2] text-amber-950 selection:bg-amber-700/20 relative" role="application" aria-label="AI Menu App">
      {/* Intro */}
      {step===0 && (
        <main className="relative min-h-[100dvh] w-full overflow-hidden text-center">
          {/* Video Background */}
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/output-intro-grain.webm" type="video/webm" />
            <source src="/output-intro-grain.mov" type="video/quicktime" />
          </video>
          
          {/* Overlay for better text readability (optional dark overlay) */}
          <div className="absolute inset-0 bg-black/20 z-[1]" />
          
          {/* Content */}
          <div className="relative z-[2] flex flex-col min-h-[100dvh] px-4 py-8">
            {/* Language switch in top-right - white variant for video background */}
            <div className="absolute top-4 right-4 z-[3] flex items-center gap-1 bg-white/80 backdrop-blur px-2 py-1 rounded-full border border-white/30 shadow-lg">
              <button 
                aria-label="Nederlands" 
                className={`px-2 py-1 rounded-full text-xs ${lang==='nl'? 'bg-amber-700 text-white' : 'text-gray-700'}`} 
                onClick={()=>handleLangChange('nl')}
              >
                🇳🇱 {i18n.nl.langShort}
              </button>
              <button 
                aria-label="English" 
                className={`px-2 py-1 rounded-full text-xs ${lang==='en'? 'bg-amber-700 text-white' : 'text-gray-700'}`} 
                onClick={()=>handleLangChange('en')}
              >
                🇬🇧 {i18n.en.langShort}
              </button>
            </div>
            
            {/* Logo - wit */}
            <div className="mt-12 mb-8 flex justify-center">
              <img 
                src="/logo-cafe-t-tolhuis-wit.png" 
                alt="'t Tolhuis Logo" 
                className="h-16 sm:h-20 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            
            {/* Welcome Text - wit */}
            <div className="mt-6 mb-4">
              <h1 className="text-4xl sm:text-5xl font-serif font-medium text-white mb-6">
                {t.intro}
              </h1>
            </div>
            
            {/* Quotes - wit */}
            <div className="mt-8 mb-8">
              <RotatingQuoteWhite large lang={lang} />
            </div>
            
            {/* Button */}
            <div className="mt-auto mb-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
              <Button onClick={()=>setStep(1)}>{t.seeMenu}</Button>
            </div>
            
            {/* Footer - wit */}
            <div className="mt-auto pt-4 pb-6">
              <div className="w-full border-t border-white/30 mb-3" />
              <FooterBlock 
                lang={lang} 
                onLinkClick={setInfoModalType}
                textColor="text-white/90"
              />
            </div>
          </div>
        </main>
      )}

      {/* Steps 1-3 with progress */}
      {step>=1 && step<=3 && (
        <main className="max-w-screen-sm mx-auto px-4 py-4 pb-24">
          <BrandHeader />
          <div className="text-center text-sm mt-4">{t.stepXof4(step)}</div>
          <div className="mt-2 mb-6 h-1 rounded-full bg-amber-900/10"><div className="h-1 rounded-full bg-amber-700" style={{ width: `${(step/3)*100}%` }} /></div>

          {step===1 && (
            <StepCard title={t.taste} onBack={()=>setStep(0)} onNext={()=>setStep(2)} backLabel={t.back} nextLabel={t.next}>
              <TastePicker lang={lang} value={user.taste} onChange={(taste)=>{setUser({...user, taste}); setDishPairings({});}} />
            </StepCard>
          )}
          {step===2 && (
            <StepCard title={t.dietary} onBack={()=>setStep(1)} onNext={()=>setStep(3)} backLabel={t.back} nextLabel={t.next}>
              <DietPicker lang={lang} value={user.diet} onChange={(diet)=>{setUser({...user, diet}); setDishPairings({});}} />
            </StepCard>
          )}
          {step===3 && (
            <StepCard title={t.name} onBack={()=>setStep(2)} onNext={()=>{console.log('Moving to step 4'); setStep(4);}} backLabel={t.back} nextLabel={t.next}>
              <NameStep lang={lang} value={user.name} onChange={(name)=>setUser({...user, name})} />
            </StepCard>
          )}
          <FixedFooter lang={lang} onLinkClick={setInfoModalType} />
        </main>
      )}


      {/* Menu */}
      {step===4 && (
        <main className="max-w-screen-sm mx-auto px-4 py-4 pb-40">
          {console.log('Rendering step 4 - Menu')}
          
          <Hero>
            {/* White logo centered in Hero */}
            <div className="absolute inset-0 flex items-center justify-center z-[1] pointer-events-none">
              <img 
                src="/logo-cafe-t-tolhuis-wit.png" 
                alt="'t Tolhuis Logo" 
                className="w-auto object-contain drop-shadow-lg"
                style={{ height: '54px' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            
            {/* Language switch in hero top-right */}
            <LangSwitchInline 
              lang={lang} 
              onChange={(newLang) => {
                console.log('Language switch clicked:', lang, '�', newLang);
                setLang(newLang);
                // Clear caches for stability
                setDishPairings({});
                // Don't clear pairingData to avoid errors
              }} 
              className="absolute top-3 right-3 z-[20]" 
            />
          </Hero>
          <div className="font-[ui-serif] text-2xl sm:text-xl text-center mt-4">
            {user.name ? (
              <span>{lang === 'nl' ? `Hi ${user.name}! ${welcomeMessage || 'Fijn dat je er bent!'}` : `Hi ${user.name}! ${welcomeMessage || 'Great to see you!'}`}</span>
            ) : (
              <span>{welcomeMessage || (lang === 'nl' ? 'Waar heb je zin in?' : 'What do you feel like?')}</span>
            )}
          </div>

          {/* Sticky filters under header; content scrolls from week menu */}
          <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-[#F3E8D2]/95 backdrop-blur border-b border-amber-900/10">
            <div className="space-y-3">
              {/* Taste buttons */}
              <div className="flex items-center gap-1 flex-wrap justify-center">
                {i18n[lang].tastes.map(({label, code})=> (
                  <button key={code} onClick={()=>{setUser({...user, taste: label}); setDishPairings({});}} className={`px-4 py-2 rounded-full border text-sm whitespace-nowrap ${tasteToCode(user.taste)===code ? 'bg-amber-700 text-amber-50' : 'bg-white/70'} ${focusRing}`} aria-pressed={tasteToCode(user.taste)===code}>{label.replace(/[✨🍲🌟]/g, '').trim()}</button>
                ))}
              </div>
              
              {/* Filter buttons - tijdelijk verborgen (vegetarisch en glutenvrij) */}
              {/* 
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleMenuFilterChange('vegetarian', !menuFilters.vegetarian)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${focusRing} ${
                    menuFilters.vegetarian 
                      ? 'bg-green-100 text-green-800 border-green-300' 
                      : 'bg-white/70 text-amber-900 border-amber-300 hover:bg-green-50'
                  }`}
                >
                  {lang === 'nl' ? 'Vegetarisch' : 'Vegetarian'}
                </button>
                
                <button
                  onClick={() => handleMenuFilterChange('glutenFree', !menuFilters.glutenFree)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${focusRing} ${
                    menuFilters.glutenFree 
                      ? 'bg-blue-100 text-blue-800 border-blue-300' 
                      : 'bg-white/70 text-amber-900 border-amber-300 hover:bg-blue-50'
                  }`}
                >
                  {lang === 'nl' ? '🌾 Glutenvrij' : '🌾 Gluten-free'}
                </button>
              </div>
              */}
            </div>
          </div>

          {/* Chef recommendations section */}
          <section aria-labelledby="chef-recommendations" className="mt-2">
            <h2 id="chef-recommendations" className="font-[ui-serif] mb-3 text-left" style={{fontSize: '1.2rem'}}>
              {chefRecommendationTitle || (lang === 'nl' ? 'Voor jou geselecteerd' : 'Selected for you')}
            </h2>
            
            <div className="grid gap-3">
              {/* 1 weekmenu item (only if available) */}
              {specialDish && (
                <DishCardWithPairings key={specialDish.id} lang={lang} venue={venue} dish={specialDish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} weather={weather} weatherCategory={weatherCategory} preloadedTranslations={preloadedTranslations} />
              )}
              
              {/* 2 personal recommendations from regular menu */}
              {personalRecommendations.slice(0, 2).map(dish => (
                <DishCardWithPairings key={dish.id} lang={lang} venue={venue} dish={dish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} weather={weather} weatherCategory={weatherCategory} preloadedTranslations={preloadedTranslations} />
              ))}
            </div>
          </section>

          {/* 't Tolhuis Journaal section - Individual dish cards with AI translations */}
            {weekmenuData.length > 0 && (
            <section aria-labelledby="tolhuis-journaal-title" className="mt-6">
              <h2 id="tolhuis-journaal-title" className="font-[ui-serif] text-lg mb-4">{currentPeriod}</h2>
              <div className="grid gap-4">
                {weekmenuData.map(dish => {
                  return (
                    <DishCardWithPairings key={dish.id} lang={lang} venue={venue} dish={dish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} weather={weather} weatherCategory={weatherCategory} preloadedTranslations={preloadedTranslations} />
                  );
                })}
              </div>
            </section>
            )}

            
            {/* Volledige kaart */}
            <h3 data-section="volledige-kaart" className="font-['Sorts_Mill_Goudy'] mb-4 pt-8" style={{fontSize: '1.2rem'}}>
              {lang === 'nl' ? 'Volledige kaart' : 'Full menu'}
            </h3>
            
            {/* Menu categorieën - 6 buttons in 2 rijen */}
            <div className="flex flex-col gap-3 justify-center mb-6">
              {/* Eerste rij */}
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setSelectedMenuCategory('ontbijt')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'ontbijt'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img src="ontbijt.png" alt="" className="w-4 h-4" />
                    {lang === 'nl' ? 'Ontbijt' : 'Breakfast'}
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedMenuCategory('lunch')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'lunch'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img src="lunch.png" alt="" className="w-4 h-4" />
                    {lang === 'nl' ? 'Lunch' : 'Lunch'}
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedMenuCategory('voorgerecht')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'voorgerecht'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img src="voorgerecht.png" alt="" className="w-4 h-4" />
                    {lang === 'nl' ? 'Voorgerecht' : 'Starter'}
                  </div>
                </button>
              </div>
              
              {/* Tweede rij */}
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setSelectedMenuCategory('diner')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'diner'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img src="diner.png" alt="" className="w-4 h-4" />
                    {lang === 'nl' ? 'Diner' : 'Dinner'}
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedMenuCategory('dessert')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'dessert'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img src="dessert.png" alt="" className="w-4 h-4" />
                    {lang === 'nl' ? 'Dessert' : 'Dessert'}
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedMenuCategory('borrel')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'borrel'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img src="borrel.png" alt="" className="w-4 h-4" />
                    {lang === 'nl' ? 'Borrel' : 'Snacks'}
                  </div>
                </button>
              </div>
              
            </div>
            
            {/* Menu items per categorie */}
            <div id="filtered-menu-items" className="grid gap-4">
              {menuCategories[selectedMenuCategory]?.length > 0 ? menuCategories[selectedMenuCategory].map(item => {
                // Transform menu item to dish format with correct type based on category
                const dish = {
                  id: item.id,
                  name: item.title,
                  title: item.title,
                  title_en: item.title_en, // PRESERVE English translations!
                  subtitle: item.subtitle || item.category, // Use subtitle from Sheets or fallback to category
                  desc: item.description,
                  description: item.description,
                  description_en: item.description_en, // PRESERVE English translations!
                  price: item.price,
                  type: item.type || selectedMenuCategory, // Use item.type if available (from week menu correction), otherwise use category
                  diet: item.diet,
                  tags: item.tags,
                  supplier: item.supplier,
                  category: item.category
                };
                
                return (
                  <DishCardWithPairings key={item.id} lang={lang} venue={venue} dish={dish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} preloadedTranslations={preloadedTranslations} />
                );
              }) : (
                <div className="text-center text-amber-700 py-8">
                  {lang === 'nl' ? 'Geen items gevonden voor deze categorie' : 'No items found for this category'}
                </div>
              )}
            </div>
            
            {/* Dranken kaart sectie */}
            {menuCategories.dranken?.length > 0 && (
              <div id="drankenkaart-anchor" className="mt-8">
                <h3 className="font-['Sorts_Mill_Goudy'] mb-4 flex items-center gap-2" style={{fontSize: '1.2rem'}}>
                  <img src="dranken.png" alt="" className="w-5 h-5" />
                  {lang === 'nl' ? 'Drankenkaart' : 'Drinks menu'}
                </h3>
                
                {/* Drinks subcategory buttons */}
                {drinksSubcategories.length > 1 && (
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    <button
                      onClick={() => handleDrinksSubcategoryChange('all')}
                      className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                        selectedDrinksSubcategory === 'all'
                          ? 'bg-amber-700 text-amber-50' 
                          : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {lang === 'nl' ? 'Alle dranken' : 'All drinks'}
                    </button>
                    
                    {drinksSubcategories.map(subcategory => (
                      <button
                        key={subcategory}
                        onClick={() => handleDrinksSubcategoryChange(subcategory)}
                        className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                          selectedDrinksSubcategory === subcategory
                            ? 'bg-amber-700 text-amber-50' 
                            : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {subcategory}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="grid gap-4">
                  {(() => {
                    // Direct filtering in render to prevent race conditions
                    if (!menuCategories.dranken?.length) return [];
                    
                    if (selectedDrinksSubcategory === 'all') {
                      return menuCategories.dranken;
                    }
                    
                    const filtered = menuCategories.dranken.filter(item => {
                      const matches = item.section === selectedDrinksSubcategory;
                      if (!matches) {
                        console.log(` ${item.title} does NOT match filter "${selectedDrinksSubcategory}" (section: "${item.section}")`);
                      } else {
                        console.log(` ${item.title} matches filter "${selectedDrinksSubcategory}"`);
                      }
                      return matches;
                    });
                    
                    console.log(`� Filter "${selectedDrinksSubcategory}" result:`, filtered.map(item => item.title));
                    return filtered;
                  })().map(item => {
                    // Transform menu item to dish format with correct type
                    const dish = {
                      id: item.id,
                      name: item.title,
                      title: item.title,
                      title_en: item.title_en, // PRESERVE English translations!
                      desc: item.description,
                      description: item.description,
                      description_en: item.description_en, // PRESERVE English translations!
                      price: item.price,
                      type: 'drank', // Use 'drank' as type for drinks
                      diet: item.diet,
                      tags: item.tags,
                      supplier: item.supplier,
                      subtitle: item.subtitle || 'Drank' // Ensure subtitle is set
                    };
                    
                    return (
                      <DishCardWithPairings key={item.id} lang={lang} venue={venue} dish={dish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} preloadedTranslations={preloadedTranslations} />
                    );
                  })}
                </div>
              </div>
            )}

          {/* Fixed CTA */}
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[min(92%,420px)]">
            <button className={`w-full px-5 py-4 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] bg-amber-700 text-amber-50 ${focusRing}`}
              onClick={()=>{ 
                const el = document.querySelector('[data-section="volledige-kaart"]'); 
                if (el) {
                  el.scrollIntoView({behavior:'smooth', block:'start'}); 
                } else {
                  console.log(' Volledige kaart section not found');
                }
              }}
            >{lang==='nl' ? 'Bekijk het hele menu' : 'View full menu'}</button>
          </div>

          {/* footer on menu page (non-fixed) */}
          <div className="max-w-screen-sm mx-auto px-4 mt-4 pb-8">
            <div className="w-full border-t border-amber-900/20" />
            <div className="pt-2"><FooterBlock lang={lang} onLinkClick={setInfoModalType} /></div>
          </div>
        </main>
      )}

      <ToastBar open={toast.open} text={toast.text} onClose={()=>setToast({open:false, text:''})} />
      
      {/* Info Modal for footer links */}
      <InfoModal 
        isOpen={infoModalType !== null}
        onClose={() => setInfoModalType(null)}
        type={infoModalType}
        lang={lang}
      />
      
      {/* WhatsApp Opt-in Subtle Slider */}
      <WhatsAppOptInPopup 
        isVisible={showOptInModal}
        onClose={() => setShowOptInModal(false)}
        onSubmit={submitOptInData}
        data={optInData}
        setData={setOptInData}
        isSubmitting={isSubmittingOptIn}
        lang={lang}
      />
      
      {/* Smart Bubble */}
      {smartBubble && (
        <SmartBubble
          message={smartBubble.message}
          onClose={() => setSmartBubble(null)}
          position={smartBubble.position}
        />
      )}
      
      {/* Floating WhatsApp button - rechtsonderin na 20s */}
      {showOptInFloating && (
        <button
          onClick={() => { console.log(' Floating WhatsApp button clicked'); setShowOptInModal(true); }}
          className="fixed bottom-24 right-6 sm:bottom-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg border border-green-500/30 hover:bg-green-700 transition-all duration-200 z-[999] flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// Component that handles pairing generation
function DishCardWithPairings({ venue, dish, onShowPairing, lang, generatePairingsForDish, generatePairingText, setCurrentPairing, setShowPairingCard, showPairingCard, weather, weatherCategory, preloadedTranslations }) {
  console.log(' DishCardWithPairings RENDER for dish:', dish.name, 'ID:', dish.id, 'lang:', lang, 'full dish object:', dish);
  const [pairings, setPairings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pairingTranslations, setPairingTranslations] = useState({});
  
  useEffect(() => {
    const loadPairings = async () => {
      setLoading(true);
      try {
        console.log(' Loading pairings for dish:', dish.name, 'ID:', dish.id);
        console.log(' About to call generatePairingsForDish...');
        const dishPairings = await generatePairingsForDish(dish);
        console.log(' Loaded pairings for', dish.name, ':', dishPairings);
        setPairings(dishPairings);
      } catch (error) {
        console.error(' Failed to load pairings for', dish.name, error);
        console.error(' Error details:', error);
        setPairings([]);
      }
      setLoading(false);
    };
    
    loadPairings();
  }, [dish.id, generatePairingsForDish, lang]); // Also reload when language changes
  
  // Load AI translations for pairings if needed
  useEffect(() => {
    console.log(` Pairing translation useEffect triggered - lang: ${lang}, pairings: ${pairings?.length || 0}`);
    
    const loadPairingTranslations = async () => {
      if (lang !== 'en' || !pairings || pairings.length === 0) {
        console.log(`� Skipping pairing translations - lang: ${lang}, pairings: ${pairings?.length || 0}`);
        setPairingTranslations({});
        return;
      }
      
      const translations = {};
      let needsTranslation = false;
      
      for (const pairing of pairings) {
        console.log(` Checking pairing: "${pairing.suggestion}" (suggestion_en: "${pairing.suggestion_en}")`);
        
        // Check if we need AI translation for this pairing
        // Only translate if suggestion_en (kolom I) is empty
        const isEmpty = !pairing.suggestion_en || pairing.suggestion_en.trim().length === 0;
        
        if (isEmpty) {
          needsTranslation = true;
          console.log(` Need AI translation for: "${pairing.suggestion}" (suggestion_en is empty)`);
          
          // Check preloaded translations first
          const preloadedKey = `pairing_${pairing.suggestion}`;
          if (preloadedTranslations && preloadedTranslations[preloadedKey]) {
            translations[pairing.suggestion] = preloadedTranslations[preloadedKey];
          } else {
            // Generate AI translation
            try {
              const { generateDishTranslation } = await import('../utils/openaiProxy.js');
              const translated = await generateDishTranslation({
                title: pairing.suggestion, // Translate Dutch text from kolom C
                description: ''
              });
              translations[pairing.suggestion] = translated.title;
            } catch (error) {
              console.error('Error translating pairing:', error);
              translations[pairing.suggestion] = pairing.suggestion; // fallback
            }
          }
        }
      }
      
      if (needsTranslation) {
        console.log(` Setting pairing translations:`, translations);
        setPairingTranslations(translations);
      } else {
        console.log(`� No pairing translations needed`);
      }
    };
    
    loadPairingTranslations();
  }, [lang, pairings, preloadedTranslations]);
  
  const pairingsToPass = loading ? [] : pairings;
  console.log(' DishCardWithPairings passing pairings:', { 
    dish: dish.name,
    loading,
    pairingsLength: pairings.length,
    pairingsToPassLength: pairingsToPass.length,
    pairings: pairings.length > 0 ? `${pairings.length} pairings found` : 'NO PAIRINGS'
  });
  
  try {
    console.log(' DishCardWithPairings about to render DishCard for:', dish.name);
  return (
    <DishCard 
      venue={venue} 
      dish={dish} 
      pairings={pairingsToPass} 
      onShowPairing={onShowPairing} 
      lang={lang} 
             generatePairingText={generatePairingText}
             setCurrentPairing={setCurrentPairing}
             setShowPairingCard={setShowPairingCard}
             showPairingCard={showPairingCard}
             weather={weather}
             weatherCategory={weatherCategory}
             preloadedTranslations={preloadedTranslations}
             pairingTranslations={pairingTranslations}
           />
         );
  } catch (error) {
    console.error(' Error in DishCardWithPairings rendering DishCard for', dish.name, error);
    return <div>Error rendering {dish.name}</div>;
  }
}

// WhatsApp Opt-in Modal Component - Simple slider
const OptInModal = ({ isVisible, onClose, lang }) => {
  console.log(' OptInModal render - isVisible:', isVisible);
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4" style={{paddingBottom: 'max(16px, env(safe-area-inset-bottom))'}}>
      {/* Simple slider */}
      <div className="bg-amber-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-amber-700/20 max-w-md mx-auto">
        <div className="p-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-6 h-6 text-amber-200 hover:text-white transition-colors flex items-center justify-center text-lg font-bold"
          >
            ×
          </button>
          
          {/* Header */}
          <div className="mb-3 pr-8">
            <h3 className="text-base font-bold text-amber-50 mb-1">
              {lang === 'nl' ? 'Blijf op de hoogte!' : 'Stay updated!'}
            </h3>
            <p className="text-amber-200 text-xs">
              {lang === 'nl' 
                ? 'WhatsApp updates van \'t Tolhuis' 
                : 'WhatsApp updates from \'t Tolhuis'
              }
            </p>
          </div>
          
          {/* Simple buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                console.log(' User clicked subscribe');
                onClose();
              }}
              className="w-full bg-green-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
            >
              {lang === 'nl' ? 'Aanmelden' : 'Subscribe'}
            </button>
            
            <button
              onClick={onClose}
              className="w-full text-amber-300 hover:text-white text-xs transition-colors"
            >
              {lang === 'nl' ? 'Nee, bedankt' : 'No, thanks'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
