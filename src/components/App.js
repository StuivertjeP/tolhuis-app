import React, { useEffect, useMemo, useRef, useState } from "react";
import { i18n, quotes, demo, focusRing, recordEvent, sentenceCase, tasteToCode, getContextSignals, gpt5RankDishes, pickPairings, gpt5PairingCopy, removeEmojisFromTaste, generateChefRecommendationTitle } from "../App.js";
import { translateDish } from "../utils/translationService.js";
import { getCurrentPeriod, clearPeriodCache, getWeekmenuData, clearWeekmenuCache, getPairingData, clearPairingCache, getMenuData, clearMenuCache, generateAIPairings } from "../services/sheetsService.js";
import { generatePairingDescription } from "../utils/openaiProxy.js";

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
  return (
    <div className={`flex items-center gap-1 bg-white/70 backdrop-blur px-2 py-1 rounded-full border border-amber-900/10 shadow-sm ${className}`}>
      <button aria-label="Nederlands" className={`px-2 py-1 rounded-full text-xs ${lang==='nl'? 'bg-amber-700 text-white' : 'text-amber-900'}`} onClick={()=>onChange('nl')}>🇳🇱 {i18n.nl.langShort}</button>
      <button aria-label="English" className={`px-2 py-1 rounded-full text-xs ${lang==='en'? 'bg-amber-700 text-white' : 'text-amber-900'}`} onClick={()=>onChange('en')}>🇬🇧 {i18n.en.langShort}</button>
    </div>
  );
}

function BrandHeader(){
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

/********************
 * Cards
 ********************/
function SpecialsCard({ specials, lang }){
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
  
  return (
    <Card className="p-5">
      <div className="space-y-5">
        {specials.groups.map((gr) => (
          <div key={gr.title}>
            <h3 className="font-[ui-serif] text-base tracking-wide mb-1">{titleMap[gr.title] || gr.title}</h3>
            {gr.items.map((it, idx) => { 
              // SIMPLE TRANSLATION: If English, use columns N and O from Google Sheets
              let itemName, itemDesc;
              
              if (lang === 'en') {
                itemName = it.title_en || it.name || it.title;
                itemDesc = it.description_en || it.desc || it.description;
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

function DishCard({ venue, dish, pairings, onShowPairing, lang, generatePairingText, setCurrentPairing, setShowPairingCard, showPairingCard }){
  const [currentPairing, setLocalCurrentPairing] = useState(null);
  
  useEffect(()=>{ recordEvent({ type:'dish_view', dish: dish.id }); }, [dish?.id]);
  
  // Reset currentPairing when language, dish, or pairings change to prevent stale data
  useEffect(() => {
    setLocalCurrentPairing(null);
    setShowPairingCard(false);
  }, [lang, dish.id, pairings, setShowPairingCard]);
  
  
  // SIMPLE TRANSLATION: If English, use columns N and O from Google Sheets
  let displayName, displayDesc;
  
  if (lang === 'en') {
    // Use English translations from Google Sheets columns N and O
    displayName = dish.title_en || dish.name || dish.title;
    displayDesc = dish.description_en || dish.desc || dish.description;
    console.log('🇬🇧 ENGLISH MODE - Using Sheets columns N & O:', {
      originalTitle: dish.title,
      englishTitle: dish.title_en,
      usingTitle: displayName,
      originalDesc: dish.description,
      englishDesc: dish.description_en,
      usingDesc: displayDesc
    });
  } else {
    // Use Dutch original
    displayName = dish.name || dish.title;
    displayDesc = dish.desc || dish.description;
    console.log('🇳🇱 DUTCH MODE - Using original:', {
      usingTitle: displayName,
      usingDesc: displayDesc
    });
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
  console.log(`🏷️ Supplier for "${dish.name}":`, detectedSupplier, {
    explicitSupplier: dish.supplier
  });
  
  const niceToMeatLogo = useImageCandidate([
    'nice-to-meat.png',
    '/nice-to-meat.png'
  ]);
  
  const fishSupplierLogo = useImageCandidate([
    'fish-supplier.png',
    '/fish-supplier.png',
    'fish.png',
    '/fish.png'
  ]);
  
  const deHoopLogo = useImageCandidate([
    'Logo-De-Hoop-zwart-goud.svg',
    '/Logo-De-Hoop-zwart-gold.svg'
  ]);
  
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
              {(dish.diet||[]).slice(0,3).map((d)=> <span key={String(d)} className="text-[11px] px-2 py-1 rounded-full bg-amber-700/10">{String(d)}</span>)}
            </div>
          )}
        </div>
                   {pairings?.length>0 && (
                     <div className="mt-4 flex justify-end">
                        <button 
                          className={`px-3 py-2 rounded-full text-[11px] sm:text-[12px] bg-amber-600 text-amber-50 shadow transition-all duration-300 hover:scale-105 hover:shadow-lg ${focusRing}`}
                         onClick={handlePairingClick}
                          aria-label={`Pairing: ${lang === 'en' ? (pairings[0].suggestion_en || pairings[0].suggestion) : pairings[0].suggestion}`}
                        >
                          {t.pairingChip(lang === 'en' ? (pairings[0].suggestion_en || pairings[0].suggestion) : pairings[0].suggestion)}
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
            onClose={() => {
              setShowPairingCard(false);
              setLocalCurrentPairing(null);
            }}
        />
      )}
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
function FooterBlock(){
  return (
    <div className="text-center text-xs text-amber-900/70 leading-5">
      <div>© 2025 SlimmeGast.ai All rights reserved.</div>
      <div>Uitschrijven | Privacy | Informatie</div>
    </div>
  );
}

function FixedFooter(){
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[min(92%,420px)] pointer-events-none z-40">
      <div className="pointer-events-auto">
        <div className="w-full border-t border-amber-900/20" />
        <div className="pt-2"><FooterBlock /></div>
      </div>
    </div>
  );
}

function ToastBar({ open, text, onClose }){
  return (
    <div role="status" aria-live="polite" className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[min(92%,420px)] transition-all duration-300 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`} onClick={onClose}>
      <div className="px-4 py-3 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.25)] bg-amber-800 text-amber-50 text-sm text-center">{text}</div>
    </div>
  );
}

function PairingSlideCard({ pairing, dish, venue, lang, isOpen, onClose }){
  const t = i18n[lang];
  const [isVisible, setIsVisible] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState(null);
  const [aiDescription, setAiDescription] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
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
    
    const distance = touchStart - touchEnd;
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
      }, 500);
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
      
      console.log('🤖 AI CHECK:', {
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
        console.log('💾 Using AI cache:', cachedText);
        setAiDescription(cachedText);
        return;
      }
      
      // Only generate NEW AI if no manual description AND no cache
      if (!hasSheetDescription && !hasAICachedDescription && !isLoadingAI && !aiDescription) {
        setIsLoadingAI(true);
        console.log('🤖 GENERATING NEW AI for:', pairing?.suggestion);
        
        try {
          const params = {
            dishId: dish?.id,
            dishName: dish?.name || dish?.title || 'Dit gerecht',
            pairingSuggestion: lang === 'en' ? (pairing?.suggestion_en || pairing?.suggestion) : pairing?.suggestion,
            dishDescription: dish?.desc || dish?.description || '',
            lang: lang
          };
          console.log('🤖 Calling with params:', params);
          
          const generated = await generatePairingDescription(params);
          
          console.log('🤖 Generated result:', generated);
          
          if (generated) {
            console.log('🤖✅ AI SUCCESS + SAVED TO CACHE:', generated);
            setAiDescription(generated);
          } else {
            console.log('🤖❌ AI returned null/empty');
          }
        } catch (error) {
          console.error('🤖❌ AI ERROR:', error);
        } finally {
          setIsLoadingAI(false);
        }
      }
    };
    
    if (isOpen && pairing && dish) {
      generateAI();
    }
  }, [isOpen, pairing, dish, lang, aiDescription, isLoadingAI]);
  
  useEffect(() => {
    if (isOpen) {
      // Slide in
      setIsVisible(true);
      
      // Auto slide out after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Wait for animation to complete before calling onClose
        setTimeout(() => {
          onClose();
        }, 500);
      }, 4000);
      
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-2xl shadow-lg overflow-hidden">
          {/* Swipe indicator */}
          <div className="w-8 h-1 bg-yellow-900/30 rounded-full mx-auto mt-2"></div>
          
          {/* Content */}
          <div className="px-6 py-5">
            <p className="font-serif text-base text-yellow-900 leading-relaxed text-center">
              {(() => {
                // PRIORITY 1: Manual Sheets description (kolom D/J)
                const sheetDescription = lang === 'en' 
                  ? (pairing?.description_en || pairing?.description)
                  : pairing?.description;
                
                if (sheetDescription && sheetDescription.trim().length > 0) {
                  return sheetDescription;
                }
                
                // PRIORITY 2: AI cached description from Sheets (kolom K/L)
                const aiCachedDescription = lang === 'en'
                  ? pairing?.ai_description_en
                  : pairing?.ai_description_nl;
                
                if (aiCachedDescription && aiCachedDescription.trim().length > 0) {
                  return aiCachedDescription;
                }
                
                // PRIORITY 3: Live AI generated (in state)
                if (aiDescription) {
                  return aiDescription;
                }
                
                // PRIORITY 4: Loading state (only if actively generating)
                if (isLoadingAI) {
                  return lang === 'en' ? '✨ ...' : '✨ ...';
                }
                
                // PRIORITY 5: Fallback
                return lang === 'en' ? 'Perfect combination!' : 'Perfecte combinatie!';
              })()}
            </p>
            
            {/* Swipe hint */}
            <p className="text-xs text-yellow-800/70 text-center mt-3">
              {lang === 'nl' ? 'Veeg naar beneden om te sluiten' : 'Swipe down to close'}
            </p>
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
  const [step, setStep] = useState(0); // 0=intro,1=taste,2=diet,3=name,4=menu
  const [user, setUser] = useState({ name:'', diet:'meat', taste:'✨ Licht & Fris', phone:'' });
  const [menuFilters, setMenuFilters] = useState({ vegetarian: false, glutenFree: false });
  const [toast, setToast] = useState({ open:false, text:'' });
  const [showPairingCard, setShowPairingCard] = useState(false);
  const [currentPairing, setCurrentPairing] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState("Laden..."); // Fallback periode
  const [weekmenuData, setWeekmenuData] = useState([]);
  const [pairingData, setPairingData] = useState([]);
  const [menuData, setMenuData] = useState([]); // Menu data uit Google Sheets
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('diner'); // Default to diner
  const [selectedDrinksSubcategory, setSelectedDrinksSubcategory] = useState('all'); // Default to all drinks
  const [chefRecommendationTitle, setChefRecommendationTitle] = useState('');
  
  // Debug log when pairingData changes
  useEffect(() => {
    console.log('📊 pairingData state changed:', pairingData.length, 'items');
    if (pairingData.length > 0) {
      console.log('📊 pairingData sample:', pairingData.slice(0, 2));
    } else {
      console.log('⚠️ pairingData is EMPTY! Why?');
      console.trace('Stack trace for empty pairingData');
    }
  }, [pairingData]);
  
  // Debug log when menuData changes
  useEffect(() => {
    console.log('🍽️ menuData state changed:', menuData.length, 'items');
    if (menuData.length > 0) {
      console.log('🍽️ menuData sample:', menuData.slice(0, 2));
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
          title.includes('château') || title.includes('bordeaux') || title.includes('burgundy') ||
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
        console.log('🚫 FILTERING OUT DRINK:', { 
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
    console.log('🍽️ Creating daypart-specific recommendations for:', currentDaypart);
    console.log('🔍 Available dishes for ranking:', rankedMenuDishes.map(d => ({ 
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
      console.error('❌ DRINKS STILL IN RANKING:', drinksInRanking.map(d => d.name));
    } else {
      console.log('✅ NO DRINKS IN RANKING - FILTERING WORKING!');
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
      
      console.log('🍽️ Voorgerechten found:', voorgerechten.map(v => v.name));
      console.log('🍽️ Hoofdgerechten found:', hoofdgerechten.map(h => h.name));
      
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
      
      console.log('🍽️ Dinner recommendations (1 voorgerecht + 1 hoofdgerecht):', recommendations.map(r => ({ name: r.name, section: r.section, category: r.category })));
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
      
      console.log('🍻 Borrel recommendations (precies 2):', recommendations.map(r => r.name));
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
      
      console.log('🌅 Breakfast recommendations (precies 2):', recommendations.map(r => r.name));
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
      
      console.log('🥗 Lunch recommendations (precies 2):', recommendations.map(r => r.name));
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
      
      console.log('🔄 Fallback recommendations (precies 2):', fallbackRecs.map(r => ({ name: r.name, section: r.section })));
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
    
    console.log('🌍 Language change effect:', {
      lang,
      currentUserTaste: user.taste,
      currentTasteCode,
      newTasteLabel,
      willUpdate: newTasteLabel && newTasteLabel !== user.taste
    });
    
    // ALTIJD dish pairings cache legen bij taalwisseling
    console.log('🔄 Clearing dish pairings cache due to language change');
    setDishPairings({});
    
    // Ook pairing data cache legen voor stabiliteit
    if (typeof window !== 'undefined' && window.clearPairingCache) {
      window.clearPairingCache();
      console.log('🔄 Cleared pairing data cache');
    }
    
    if (newTasteLabel && newTasteLabel !== user.taste) {
      console.log('🔄 Updating user taste from', user.taste, 'to', newTasteLabel);
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

  // Haal weekmenu data op uit Google Sheets
  useEffect(() => {
    const loadWeekmenu = async () => {
      try {
        // Leeg cache om verse data op te halen
        clearWeekmenuCache();
        const weekmenu = await getWeekmenuData();
        setWeekmenuData(weekmenu);
        console.log('✅ Weekmenu geladen uit Sheets:', weekmenu);
      } catch (error) {
        console.warn('Kon weekmenu niet laden uit Sheets:', error);
        setWeekmenuData([]);
      }
    };
    
    loadWeekmenu();
  }, []);

  // Haal pairing data op uit Google Sheets
  useEffect(() => {
    console.log('🚨🚨🚨 useEffect voor pairing data wordt aangeroepen! lang:', lang);
    const loadPairings = async () => {
      try {
        console.log('🍷 Loading pairing data...');
        // Clear cache to force fresh data
        clearPairingCache();
        // Clear dish pairings cache to force fresh generation
        setDishPairings({});
        // Add timestamp to force fresh fetch
        const timestamp = Date.now();
        console.log('🕐 Force refresh timestamp:', timestamp);
        const pairings = await getPairingData(true); // Force refresh
        console.log('🔥 getPairingData returned:', pairings);
        console.log('🔥 getPairingData length:', pairings?.length);
        console.log('🔥 getPairingData type:', typeof pairings);
        console.log('🔥 getPairingData is array:', Array.isArray(pairings));
        setPairingData(pairings);
        console.log('✅ Pairing data loaded:', pairings.length, 'items');
        console.log('🍷 Pairing data details:', pairings);
        console.log('🍷 Pairing data sample:', pairings.slice(0, 3));
        console.log('🍷 Pairing dish IDs:', pairings.map(p => p.dish_id));
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
        console.log('🔄 Loading pairing data for dishes...');
        try {
          const pairings = await getPairingData(true);
          setPairingData(pairings);
          console.log('✅ Pairing data loaded for dishes:', pairings.length, 'items');
        } catch (error) {
          console.warn('Failed to load pairing data for dishes:', error);
        }
      }
    };
    
    loadPairingsForDishes();
  }, [menuData.length]); // Load when menu data is available

  // Haal menu data op uit Google Sheets
  useEffect(() => {
    console.log('🚨 useEffect voor menu data wordt aangeroepen!');
    
    const loadMenu = async () => {
      try {
        console.log('🍽️ Loading menu data...');
        console.log('🔍 About to call clearMenuCache...');
        // Clear cache to prevent duplicates
        clearMenuCache();
        console.log('🔍 About to call getMenuData...');
        const menu = await getMenuData(true); // Force refresh
        console.log('🔍 getMenuData returned:', menu);
        setMenuData(menu);
        console.log('✅ Menu data loaded:', menu.length, 'items');
        console.log('🍽️ Menu data details:', menu);
        console.log('🍽️ Menu sections found:', [...new Set(menu.map(m => m.section))]);
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
      console.log('✅ Using weekmenuData from Google Sheets:', menuData.length, 'items');
    } else {
      menuData = [];
      console.log('⚠️ No data available - add items to Google Sheets');
    }
    
    console.log('📊 Menu Data Debug:', {
      weekmenuDataLength: weekmenuData.length,
      menuDataLength: menuData.length,
      usingWeekmenu: weekmenuData.length > 0,
      weekmenuData: weekmenuData,
      menuData: menuData
    });
    
    const filtered = menuData.filter(dish => {
      console.log('🔍 Filtering dish:', {
        name: dish.name,
        diet: dish.diet,
        tags: dish.tags,
        type: dish.type,
        vegetarian: menuFilters.vegetarian,
        glutenFree: menuFilters.glutenFree
      });
      
      if (menuFilters.vegetarian && !(dish.diet?.includes('vega') || dish.diet?.includes('veg') || dish.diet?.includes('v') || dish.diet?.includes('vegetarisch') || dish.type === 'vega')) {
        console.log('❌ Filtered out (vegetarian):', dish.name, { diet: dish.diet, type: dish.type });
        return false;
      }
      if (menuFilters.glutenFree && !(dish.diet?.includes('glutfree') || dish.tags?.includes('glutfree') || dish.tags?.includes('gf') || dish.diet?.includes('glutenvrij') || dish.tags?.includes('glutenvrij'))) {
        console.log('❌ Filtered out (gluten-free):', dish.name, { diet: dish.diet, tags: dish.tags });
        return false;
      }
      console.log('✅ Keeping dish:', dish.name);
      return true;
    });
    
    console.log('📊 Final filtered dishes:', filtered.length, filtered);
    return filtered;
  }, [menuFilters, weekmenuData, weekmenuData.length]);
  
  const ranked = useMemo(()=> {
    console.log('🔄 Ranking dishes:', { 
      filteredDishesLength: filteredDishes.length, 
      user: user,
      context: context,
      filteredDishes: filteredDishes.map(d => ({ id: d.id, name: d.name, type: d.type, diet: d.diet, tags: d.tags }))
    });
    const safeContext = context || { daypart: 'dinner' };
    const result = gpt5RankDishes({ user, context: safeContext, dishes: filteredDishes });
    console.log('📊 Ranked result:', result);
    return result;
  }, [user, context, filteredDishes]);
  
  const specialDish = useMemo(()=>{ 
    console.log('🔍 Finding special dish:', { weekmenuDataLength: weekmenuData.length, rankedLength: ranked.length, currentDaypart: context?.daypart });
    
    // Gebruik weekmenu data om special dish te bepalen
    if (weekmenuData.length > 0) {
      // Neem het BESTE matching item uit weekmenu (eerste in ranked lijst)
      const weekmenuIds = new Set(weekmenuData.map(item => item.id));
      const found = ranked.find(d => weekmenuIds.has(d.id)) || null;
      console.log('✅ Special dish found:', found, 'from weekmenu items:', Array.from(weekmenuIds));
      return found;
    }
    
    // Als er geen weekmenu data is, neem het hoogst gerankte gerecht
    if (ranked.length > 0) {
      console.log('⚠️ No weekmenu data - using highest ranked dish:', ranked[0].name);
      return ranked[0];
    }
    
    // Geen data beschikbaar
    console.log('❌ No data available for special dish');
    return null;
  }, [ranked, weekmenuData, context]);

  // Categorize menu items based on their type from Google Sheets
  const menuCategories = useMemo(() => {
    console.log('🔄 menuCategories useMemo triggered!');
    console.log('📊 menuData length:', menuData.length);
    
    if (!menuData.length) {
      console.log('📊 No menu data available');
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
    
    console.log('📊 Processing menu data:', menuData.length, 'items');
    console.log('📊 First few items:', menuData.slice(0, 3));
    
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
    
    console.log(`🔄 Original items: ${menuData.length}, Unique items: ${uniqueItems.length}`);
    
    uniqueItems.forEach(item => {
      const category = item.category?.toLowerCase() || '';
      const type = item.type?.toLowerCase() || ''; // Keep type for diet matching
      const section = item.section || '';
      const title = item.title || 'Unknown';
      
      console.log(`📋 Item: "${title}" with category: "${category}", type: "${type}" and section: "${section}"`);
      
      // SIMPLE FILTER: Only use CATEGORY column (most reliable)
      const isDrink = category?.toLowerCase() === 'drinken';
      
      // DEBUG: Log items that are being filtered out
      if (isDrink) {
        console.log('🚫 FILTERING OUT DRINK FROM FOOD CATEGORIES:', { 
          name: title, 
          section: section, 
          category: category
        });
      }
      
      // Categorize by CATEGORY (new structure)
      if (category === 'breakfast' || category === 'ontbijt') {
        categories.ontbijt.push(item);
        console.log(`✅ Added to ontbijt: ${title}`);
      } else if (category === 'lunch') {
        categories.lunch.push(item);
        console.log(`✅ Added to lunch: ${title}`);
      } else if (category === 'starter' || category === 'voorgerecht') {
        categories.voorgerecht.push(item);
        console.log(`✅ Added to voorgerecht: ${title}`);
      } else if (category === 'diner' || category === 'main' || category === 'hoofdgerecht') {
        categories.diner.push(item);
        console.log(`✅ Added to diner: ${title}`);
      } else if (category === 'dessert') {
        categories.dessert.push(item);
        console.log(`✅ Added to dessert: ${title}`);
      } else if (category === 'borrel') {
        categories.borrel.push(item);
        console.log(`✅ Added to borrel: ${title}`);
      } else if (isDrink) {
        // Only add to dranken category and set correct subtitle
        // Check if already exists to prevent duplicates
        const alreadyExists = categories.dranken.some(existing => existing.id === item.id);
        if (!alreadyExists) {
          const drinkItem = { ...item, subtitle: 'Drank' };
          categories.dranken.push(drinkItem);
          console.log(`✅ Added to dranken: ${title} (section: ${section}) with subtitle: Drank`);
        } else {
          console.log(`⚠️ Skipped duplicate drink: ${title} (id: ${item.id})`);
        }
      } else {
        // Fallback to diner
        categories.diner.push(item);
        console.log(`⚠️ Fallback to diner: ${title} (category: ${category})`);
      }
    });
    
    console.log('📊 Final categories:', {
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
    console.log('🍷 Drinks subcategories found:', sections);
    console.log('🍷 All dranken items with sections:', menuCategories.dranken.map(item => ({ 
      title: item.title, 
      section: item.section,
      category: item.category,
      id: item.id
    })));
    
    // Check if Casa Silva and Pucari have sections
    const casaSilva = menuCategories.dranken.find(item => item.title.toLowerCase().includes('casa silva'));
    const pucari = menuCategories.dranken.find(item => item.title.toLowerCase().includes('pucari'));
    
    if (casaSilva) console.log('🔍 Casa Silva found:', casaSilva);
    if (pucari) console.log('🔍 Pucari found:', pucari);
    
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
    
    console.log('🍷 generatePairingText called:', {
      lang,
      pairingName,
      name: pairing.name,
      name_en: pairing.name_en,
      description: pairing.description,
      description_en: pairing.description_en
    });
    
    // PRIORITEIT 1: Use description from Google Sheets if available
    if (lang === 'en' && pairing.description_en) {
      console.log('✅ Using English description from Sheets for:', pairingName);
      return pairing.description_en;
    } else if (lang === 'nl' && pairing.description) {
      console.log('✅ Using Dutch description from Sheets for:', pairingName);
      return pairing.description;
    }
    
    // PRIORITEIT 2: Generate with OpenAI API if Sheets description is not available
    console.log('🤖 Generating AI description for pairing:', pairingName);
    
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
        console.log('✅ AI generated description:', aiDescription);
        return aiDescription;
      } else {
        console.error('❌ API request failed with status:', response.status);
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('❌ Error generating AI description:', error);
      // FALLBACK: Simple generic text
      return lang === 'en'
        ? `Perfect pairing with ${pairingName} - enhances the flavors beautifully.`
        : `Prachtige match met ${pairingName} — versterkt de smaken zonder te overheersen.`;
    }
  };

  // Generate pairings for a dish - prioritize Google Sheets pairings
  const handleShowPairing = async (pairing) => {
    console.log('🍷 Showing pairing:', pairing);
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
    console.log('🚀 generatePairingsForDish START for dish:', dish.name, 'ID:', dish.id);
    console.log('🚀 Current pairingData length:', pairingData.length);
    
    const cacheKey = `${dish.id}_${dish.name}_${user.taste}_${lang}`;
    
    console.log('🎯 generatePairingsForDish called:', {
      dish: dish.name,
      dishId: dish.id,
      userTaste: user.taste,
      lang,
      cacheKey,
      pairingDataLength: pairingData.length
    });
    
    // Check cache first
    if (dishPairings[cacheKey]) {
      console.log('📦 Using cached pairings for', dish.name);
      return dishPairings[cacheKey];
    }
    
    // ALWAYS prioritize Google Sheets pairings first
    const allSheetsPairings = pairingData.filter(p => p.dish_id === dish.id && p.active);
    console.log('📋 All Google Sheets pairings for', dish.name, ':', allSheetsPairings.length);
    
    if (allSheetsPairings.length > 0) {
      // Get user taste code for matching
      const userTasteCode = tasteToCode(user.taste);
      console.log('🎯 User taste code:', userTasteCode, 'from taste:', user.taste);
      
      // Score pairings based on match_tags
      const scoredPairings = allSheetsPairings.map(p => {
        let score = 0;
        
        // Check if match_tags includes user taste
        if (p.match_tags && p.match_tags.length > 0) {
          console.log('🏷️ Pairing tags for', p.suggestion, ':', p.match_tags);
          
          // Flexible matching - check for partial matches too
          const tagsLower = p.match_tags.map(tag => tag.toLowerCase().trim());
          
          // Exact match first
          if (tagsLower.includes(userTasteCode)) {
            score += 10;
            console.log('✅ EXACT TASTE MATCH for', p.suggestion);
          }
          // Partial matches for common variations
          else if (userTasteCode === 'light_fresh' && (tagsLower.includes('fris') || tagsLower.includes('licht') || tagsLower.includes('light') || tagsLower.includes('fresh'))) {
            score += 10;
            console.log('✅ PARTIAL MATCH (light_fresh) for', p.suggestion);
          }
          else if (userTasteCode === 'rich_hearty' && (tagsLower.includes('rijk') || tagsLower.includes('hartig') || tagsLower.includes('rich') || tagsLower.includes('hearty'))) {
            score += 10;
            console.log('✅ PARTIAL MATCH (rich_hearty) for', p.suggestion);
          }
          else if (userTasteCode === 'surprising_full' && (tagsLower.includes('verrassend') || tagsLower.includes('vol') || tagsLower.includes('surprising') || tagsLower.includes('full'))) {
            score += 10;
            console.log('✅ PARTIAL MATCH (surprising_full) for', p.suggestion);
          }
          // General matches
          else if (tagsLower.includes('all') || tagsLower.includes('*')) {
            score += 1;
            console.log('✅ GENERAL MATCH (all) for', p.suggestion);
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
      console.log('🎯 Sorted pairings for', dish.name, ':', sortedPairings.map(p => ({ suggestion: p.suggestion, score: p.score, tags: p.match_tags })));
      
      // Return top pairing(s)
      const selectedPairings = sortedPairings.slice(0, 3); // Max 3 pairings
      console.log('✅ Using Google Sheets pairings for', dish.name, ':', selectedPairings.length);
      
      // Cache the result
      setDishPairings(prev => ({ ...prev, [cacheKey]: selectedPairings }));
      return selectedPairings;
    }
    
    // Only generate AI pairings if no Google Sheets pairings exist
    console.log('🤖 No Google Sheets pairings found, generating AI pairings for', dish.name);
    try {
      const aiPairings = await generateAIPairings(dish, user, lang, pairingData);
      console.log('🤖 AI pairings for', dish.name, ':', aiPairings);
      
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
        <main className="max-w-screen-sm mx-auto px-4 py-4 text-center relative">
          {/* Language switch in top-right */}
          <LangSwitchInline lang={lang} onChange={setLang} className="absolute top-4 right-4" />
          
          <BrandHeader />
          
          {/* Welcome Section */}
          <div className="mt-20 mb-8">
            <h1 className="text-4xl sm:text-5xl font-serif font-medium text-amber-900 mb-6">
              {t.intro}
            </h1>
          </div>
          
          <div className="mt-8"><RotatingQuote large lang={lang} /></div>
          <div className="mt-10" style={{paddingTop: '1rem', paddingBottom: '1rem', marginBottom: '3rem'}}><Button onClick={()=>setStep(1)}>{t.seeMenu}</Button></div>
          <FixedFooter />
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
            <StepCard title={t.name} onBack={()=>setStep(2)} onNext={()=>setStep(4)} backLabel={t.back} nextLabel={t.next}>
              <NameStep lang={lang} value={user.name} onChange={(name)=>setUser({...user, name})} />
            </StepCard>
          )}
          <FixedFooter />
        </main>
      )}


      {/* Menu */}
      {step===4 && (
        <main className="max-w-screen-sm mx-auto px-4 py-4 pb-32">
          <Hero>
            {/* Language switch in hero top-right */}
            <LangSwitchInline 
              lang={lang} 
              onChange={(newLang) => {
                console.log('🌍 Language switch clicked:', lang, '→', newLang);
                setLang(newLang);
                // Clear caches for stability
                setDishPairings({});
                // Don't clear pairingData to avoid errors
              }} 
              className="absolute top-3 right-3" 
            />
          </Hero>
          <BrandHeader />
          <div className="font-[ui-serif] text-xl text-center mt-4">{user.name ? (lang==='nl' ? `Hi ${user.name}! Waar heb je zin in?` : `Hi ${user.name}! What do you feel like?`) : (lang==='nl' ? 'Waar heb je zin in?' : 'What do you feel like?')}</div>

          {/* Sticky filters under header; content scrolls from week menu */}
          <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-[#F3E8D2]/95 backdrop-blur border-b border-amber-900/10">
            <div className="space-y-3">
              {/* Taste buttons */}
              <div className="flex items-center gap-1 flex-wrap justify-center">
                {i18n[lang].tastes.map(({label, code})=> (
                  <button key={code} onClick={()=>{setUser({...user, taste: label}); setDishPairings({});}} className={`px-4 py-2 rounded-full border text-sm whitespace-nowrap ${tasteToCode(user.taste)===code ? 'bg-amber-700 text-amber-50' : 'bg-white/70'} ${focusRing}`} aria-pressed={tasteToCode(user.taste)===code}>{removeEmojisFromTaste(label)}</button>
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
                  {lang === 'nl' ? '🥬 Vegetarisch' : '🥬 Vegetarian'}
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
                <DishCardWithPairings key={specialDish.id} lang={lang} venue={venue} dish={specialDish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} />
              )}
              
              {/* 2 personal recommendations from regular menu */}
              {personalRecommendations.slice(0, 2).map(dish => (
                <DishCardWithPairings key={dish.id} lang={lang} venue={venue} dish={dish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} />
              ))}
            </div>
          </section>

          {/* 't Tolhuis Journaal section - Individual dish cards */}
            {weekmenuData.length > 0 && (
            <section aria-labelledby="tolhuis-journaal-title" className="mt-6">
              <h2 id="tolhuis-journaal-title" className="font-[ui-serif] text-lg mb-4">{currentPeriod}</h2>
              <div className="grid gap-4">
                {weekmenuData.map(dish => (
                  <DishCardWithPairings key={dish.id} lang={lang} venue={venue} dish={dish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} />
                ))}
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
                  {lang === 'nl' ? '🌅 Ontbijt' : '🌅 Breakfast'}
                </button>
                
                <button
                  onClick={() => setSelectedMenuCategory('lunch')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'lunch'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {lang === 'nl' ? '🥪 Lunch' : '🥪 Lunch'}
                </button>
                
                <button
                  onClick={() => setSelectedMenuCategory('voorgerecht')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'voorgerecht'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {lang === 'nl' ? '🦪 Voorgerecht' : '🦪 Starter'}
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
                  {lang === 'nl' ? '🍽️ Diner' : '🍽️ Dinner'}
                </button>
                
                <button
                  onClick={() => setSelectedMenuCategory('dessert')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'dessert'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {lang === 'nl' ? '🍰 Dessert' : '🍰 Dessert'}
                </button>
                
                <button
                  onClick={() => setSelectedMenuCategory('borrel')}
                  className={`px-3 py-2 text-sm rounded-full transition-colors ${focusRing} ${
                    selectedMenuCategory === 'borrel'
                      ? 'bg-amber-700 text-amber-50' 
                      : 'bg-white/70 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {lang === 'nl' ? '🍻 Borrel' : '🍻 Snacks'}
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
                  <DishCardWithPairings key={item.id} lang={lang} venue={venue} dish={dish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} />
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
                <h3 className="font-['Sorts_Mill_Goudy'] mb-4" style={{fontSize: '1.2rem'}}>
                  {lang === 'nl' ? '🍷 Dranken kaart' : '🍷 Drinks menu'}
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
                      {lang === 'nl' ? '🍷 Alle dranken' : '🍷 All drinks'}
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
                        console.log(`❌ ${item.title} does NOT match filter "${selectedDrinksSubcategory}" (section: "${item.section}")`);
                      } else {
                        console.log(`✅ ${item.title} matches filter "${selectedDrinksSubcategory}"`);
                      }
                      return matches;
                    });
                    
                    console.log(`🍷 Filter "${selectedDrinksSubcategory}" result:`, filtered.map(item => item.title));
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
                      <DishCardWithPairings key={item.id} lang={lang} venue={venue} dish={dish} generatePairingsForDish={generatePairingsForDish} generatePairingText={generatePairingText} setCurrentPairing={setCurrentPairing} setShowPairingCard={setShowPairingCard} showPairingCard={showPairingCard} onShowPairing={handleShowPairing} />
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
                  console.log('❌ Volledige kaart section not found');
                }
              }}
            >{lang==='nl' ? 'Bekijk het hele menu' : 'View full menu'}</button>
          </div>

          {/* footer on menu page (non-fixed) */}
          <div className="max-w-screen-sm mx-auto px-4 mt-4 pb-8">
            <div className="w-full border-t border-amber-900/20" />
            <div className="pt-2"><FooterBlock /></div>
          </div>
        </main>
      )}

      <ToastBar open={toast.open} text={toast.text} onClose={()=>setToast({open:false, text:''})} />
    </div>
  );
}

// Component that handles pairing generation
function DishCardWithPairings({ venue, dish, onShowPairing, lang, generatePairingsForDish, generatePairingText, setCurrentPairing, setShowPairingCard, showPairingCard }) {
  console.log('🎨 DishCardWithPairings RENDER for dish:', dish.name, 'ID:', dish.id, 'lang:', lang, 'full dish object:', dish);
  const [pairings, setPairings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadPairings = async () => {
      setLoading(true);
      try {
        console.log('🔄 Loading pairings for dish:', dish.name, 'ID:', dish.id);
        console.log('🔄 About to call generatePairingsForDish...');
        const dishPairings = await generatePairingsForDish(dish);
        console.log('✅ Loaded pairings for', dish.name, ':', dishPairings);
        setPairings(dishPairings);
      } catch (error) {
        console.error('❌ Failed to load pairings for', dish.name, error);
        console.error('❌ Error details:', error);
        setPairings([]);
      }
      setLoading(false);
    };
    
    loadPairings();
  }, [dish.id, generatePairingsForDish, lang]); // Also reload when language changes
  
  const pairingsToPass = loading ? [] : pairings;
  console.log('🔄 DishCardWithPairings passing pairings:', {
    dish: dish.name,
    loading,
    pairingsLength: pairings.length,
    pairingsToPassLength: pairingsToPass.length,
    pairings: pairings.length > 0 ? `${pairings.length} pairings found` : 'NO PAIRINGS'
  });
  
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
    />
  );
}

export default App;
