import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * QR → AI-Guided Menu (single-file demo)
 * Flow: Intro (belevingstekst) → Mini-quiz (diet → taste → name) → WhatsApp opt-in → Menu
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
    dietary: "Heb je een voorkeur?",
    taste: "Waar heb je zin in?",
    next: "Volgende",
    back: "Terug",
    seeMenu: "Bekijk jouw menu",
    weekSpecial: "Weekspecial",
    fullMenu: "Hele kaart",
    loading: "Even geduld...",
    pairings: "Aanbevolen",
    stepXof3: (x) => `Stap ${x} van 3`,
    typeLabel: (t) => ({ main: "hoofdgerecht", starter: "voorgerecht", dessert: "dessert", side: "bijgerecht" })[t] || "gerecht",
    orderHandOff: "Geef je bestelling door aan één van onze collega’s.",
    pairingChip: (currency, price) => `Glas wijn bij deze topper +${currency}${price.toFixed(0)},-`,
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
      { key: "meatfish", label: "🥩🐟 Vlees & Vis" },
      { key: "veg", label: "🥦 Vegetarisch" },
      { key: "glutfree", label: "🌾🚫 Glutenvrij" },
    ],
  },
  en: {
    intro: "Welcome to 't Tolhuis",
    name: "Introduce yourself. What's your name?",
    dietary: "Do you have a preference?",
    taste: "What are you in the mood for?",
    next: "Next",
    back: "Back",
    seeMenu: "See your menu",
    weekSpecial: "Special of the week",
    fullMenu: "Full menu",
    loading: "One moment...",
    pairings: "Recommended",
    stepXof3: (x) => `Step ${x} of 3`,
    typeLabel: (t) => ({ main: "main", starter: "starter", dessert: "dessert", side: "side" })[t] || "dish",
    orderHandOff: "Please place your order with our staff.",
    pairingChip: (currency, price) => `A glass of wine with this one +${currency}${price.toFixed(0)}`,
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
      { key: "meatfish", label: "🥩🐟 Meat & Fish" },
      { key: "veg", label: "🥦 Vegetarian" },
      { key: "glutfree", label: "🌾🚫 Gluten-free" },
    ],
  },
};

/********************
 * Belevingsteksten (rotate per app start)
 ********************/
const quotes = [
  { text: "Welkom bij ’t Tolhuis. Even een avondje genieten." },
  { text: "Laat je verrassen. Geniet, proef, beleef. Natuurlijk in ’t Tolhuis." },
  { text: "Hier komen goed eten en gezelligheid samen." },
  { text: "Van ontbijt, borrel tot diner geniet elk moment. Natuurlijk in ’t Tolhuis." },
  { text: "Een avond uit. Een avond in ’t Tolhuis." },
];

/********************
 * Demo data (mock)
 ********************/
const demo = {
  venue: { slug: "tolhuis", name: "'t Tolhuis", currency: "€" },
  weekmenu: [{ venue: "tolhuis", week: "2025-W36", dish_id: "spc_1", label: "HAP VAN DE WEEK" }],
  specials: {
    metaTitle: "No: 36 • Jaargang: 2025 • 2 sept t/m 8 sept",
    groups: [
      { title: "HAP VAN DE WEEK", items: [ { id: "spc_1", name: "Grillspies van ossenhaaspuntjes, paprika en ui", desc: "op Provencaalse groenteratatouille met Stroganoffsaus en aardappel wedges", price: 19.95 } ]},
      { title: "HAP VAN HET SEIZOEN", items: [ { id: "spc_2", name: "Gebakken zeeduivelfilet op zwarte lintpasta", desc: "zeekraal, mosselen en inktvisringen met een kreeftensaus", price: 21.75 } ]},
      { title: "VEGETARISCHE HAP", items: [ { id: "spc_3", name: "Mediterraanse ovenschotel", desc: "aardappelpuree met zongedroogde tomaat, courgette, veg. gehakt, ras-el-hanout, sesamzaadjes, gegratineerde knoflook en feta met een frisse couscoussalade", price: 18.95 } ]},
      { title: "SALADE VAN DE MAAND", items: [ { id: "spc_4", name: "Salade met gebakken geitenkaas", desc: "spinazie, pecannoten, cherrytomaatjes, peer, zwarte olijven met honing-mosterdvinaigrette", price: 18.95 } ]},
      { title: "SOEP VAN DE MAAND", items: [ { id: "spc_5", name: "Gebonden soep van pommodori tomaten", desc: "met basilicum, room en Old Amsterdammer", price: 8.95 } ]},
    ]
  },
  menu: [
    { id: "spc_1", name: "Zeebaars met citroenboter", desc: "Met kappertjes, citroen en zachte kruidenboter.", price: 23.5, type: "main", diet: ["fish"], tags: ["licht","fris","zilt"], taste: ["Licht & fris"], avail: true },
    { id: "m_2", name: "Paddenstoelenrisotto", desc: "Romig met porcini, Parmezaan en verse tijm.", price: 19.0, type: "main", diet: ["veg"], tags: ["romig","aards"], taste: ["Rijk & hartig"], avail: true },
    { id: "s_3", name: "Burrata met tomaat & basilicum", desc: "Zomerse burrata met zoete tomaat en basilicum.", price: 11.5, type: "starter", diet: ["veg"], tags: ["licht","fris"], taste: ["Licht & fris"], avail: true },
    { id: "d_4", name: "Tiramisu klassiek", desc: "Huisgemaakt, luchtig en net genoeg cacao.", price: 7.5, type: "dessert", diet: ["v"], tags: ["zoet","vol"], taste: ["Verrassend & vol"], avail: true },
    { id: "m_5", name: "Runderstoof met kruidige jus", desc: "Langzaam gegaard met laurier en kruidnagel.", price: 22.0, type: "main", diet: ["meat"], tags: ["rijk","hartig","supplier:nicetomeat"], taste: ["Rijk & hartig"], avail: true },
    { id: "sd_6", name: "Geroosterde groenten", desc: "Seizoensgroenten met olijfolie en zeezout.", price: 5.5, type: "side", diet: ["veg"], tags: ["licht"], taste: ["Licht & fris"], avail: true },
  ],
  pairings: [
    { dish_id: "spc_1", kind: "wine", name: "Albarino Rias Baixas", price: 6.5, match_tags: ["fris","zilt"], upsell_id: "p1" },
    { dish_id: "m_2", kind: "wine", name: "Chardonnay Bourgogne", price: 7.0, match_tags: ["romig"], upsell_id: "p2" },
    { dish_id: "m_5", kind: "beer", name: "Dubbel Abdij", price: 5.0, match_tags: ["rijk","hartig"], upsell_id: "p3" },
    { dish_id: "s_3", kind: "side", name: "Focaccia met olijfolie", price: 4.0, match_tags: ["licht"], upsell_id: "p4" },
    { dish_id: "d_4", kind: "drink", name: "Espresso", price: 2.8, match_tags: ["zoet"], upsell_id: "p5" },
  ],
  rules: [
    { key: "taste.Licht & fris", pairings: ["wine:Albarino","side:Focaccia"], weight: 1 },
    { key: "taste.Rijk & hartig", pairings: ["beer:Dubbel"], weight: 1 },
  ],
};

// EN dish translations (optional)
const dishEn = {
  spc_1: { name: "Sea bass with lemon butter", desc: "With capers, lemon and soft herb butter." },
  m_2: { name: "Mushroom risotto", desc: "Creamy with porcini, Parmesan and thyme." },
  s_3: { name: "Burrata with tomato and basil", desc: "Summer burrata with sweet tomatoes and basil." },
  d_4: { name: "Classic tiramisu", desc: "Homemade, airy, just enough cocoa." },
  m_5: { name: "Beef stew with spiced jus", desc: "Slow-cooked with bay leaf and clove." },
  sd_6: { name: "Roasted vegetables", desc: "Seasonal vegetables with olive oil and sea salt." },
};

/********************
 * Helpers
 ********************/
const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2";
function toArr(v){ if (Array.isArray(v)) return v; if (v==null) return []; return String(v).split(/[,|]/).map((s)=>s.trim()).filter(Boolean); }
function recordEvent(event){ try{ const k='analytics'; const arr=JSON.parse(localStorage.getItem(k)||'[]'); arr.push({t:Date.now(),...event}); localStorage.setItem(k, JSON.stringify(arr)); }catch{} }
function sentenceCase(s){ if (!s) return ''; const t = String(s).trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
function tasteToCode(s=''){
  const x = s.toLowerCase();
  if (/(licht|light)/.test(x) && /(fris|fresh)/.test(x)) return 'light_fresh';
  if (/(rijk|rich)/.test(x) && /(hartig|hearty)/.test(x)) return 'rich_hearty';
  if (/(verrassend|surprising)/.test(x) && /(vol|full)/.test(x)) return 'surprising_full';
  return x.replace(/\s+/g,'_');
}
function getContextSignals(){ const now = new Date(); const hour = now.getHours(); const daypart = hour < 11 ? 'breakfast' : hour < 17 ? 'lunch' : 'dinner'; return { time: now.toISOString(), hour, daypart, weather: 'clear' }; }
function translateDish(d, lang){ return (lang==='en' && dishEn[d.id]) ? { ...d, ...dishEn[d.id] } : d; }
function preferDiet(d, dietKey){ if (!dietKey || dietKey==='all') return true; const ds = d.diet||[]; if (dietKey==='veg') return ds.includes('veg') || ds.includes('v'); if (dietKey==='glutfree') return ds.includes('glutfree') || (d.tags||[]).includes('glutfree') || (d.tags||[]).includes('gf'); if (dietKey==='meatfish') return ds.includes('meat') || ds.includes('fish'); return true; }
function gpt5RankDishes({ user, context, dishes }){
  const tastePrefCode = tasteToCode(user.taste || '');
  const score = (d) => {
    if (!preferDiet(d, user.diet)) return -1;
    let s=0; const dishCodes = (d.taste||[]).map((x)=>tasteToCode(x));
    if (tastePrefCode && dishCodes.includes(tastePrefCode)) s+=8;
    if ((d.tags||[]).some((t)=> (user.taste||'').toLowerCase().includes(String(t).toLowerCase()))) s+=3;
    if (context.daypart==='dinner' && d.type==='main') s+=2;
    return s + Math.random()*0.4;
  };
  return dishes.map((d)=>({...d,_score:score(d)})).filter((d)=>d._score>=0).sort((a,b)=>b._score-a._score);
}
function gpt5PairingCopy({ pairing, lang='nl' }){
  const base = lang==='nl' ? `Prachtige match met ${pairing.name}` : `A lovely match with ${pairing.name}`;
  const nuance = lang==='nl' ? '— versterkt de smaken zonder te overheersen.' : '— lifts the flavours without overpowering.';
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

/********************
 * UI Primitives
 ********************/
const Card = ({children, className=''}) => (
  <div className={`rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.12)] bg-[#f8f2e8] ${className}`}>{children}</div>
);
const Button = ({children, className='', ...props}) => (
  <button className={`min-h-12 px-5 py-3 rounded-2xl text-[17px] font-medium bg-amber-700 text-amber-50 active:translate-y-[1px] ${focusRing} ${className}`} {...props}>{children}</button>
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
const HERO_CANDIDATES = ['header-app.jpg','/header-app.jpg'];
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
    <div className="relative -mx-4 mb-4 h-[150px] sm:h-[170px] overflow-hidden rounded-b-3xl shadow-[0_10px_28px_rgba(0,0,0,0.18)]" role="img" aria-label={alt}>
      <div className="absolute inset-0 bg-center bg-cover" style={style} />
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
    <header className="text-center relative mt-4 mb-4">
      <div className="font-[ui-serif] text-xs tracking-wide">ANNO 1901</div>
      <div className="font-[ui-serif] text-xl">'t TOLHUIS</div>
      <div className="text-[10px] tracking-wide">HILVERSUM</div>
    </header>
  );
}

/********************
 * Belevingstekst / Intro
 ********************/
function RotatingQuote({ large = false }){
  const [q, setQ] = useState(quotes[0]);
  useEffect(()=>{
    // Only use localStorage in the browser; fall back to a date-seeded index otherwise
    const pick = () => {
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined'){
          const key='quoteIndex';
          const raw = localStorage.getItem(key);
          const idx = raw==null ? 0 : (parseInt(raw,10)||0);
          const next=(idx+1)%quotes.length;
          localStorage.setItem(key,String(next));
          return quotes[idx%quotes.length];
        }
      } catch {}
      const d=new Date();
      const seed=d.getFullYear()*1000+(d.getMonth()+1)*50+d.getDate();
      return quotes[seed%quotes.length];
    };
    setQ(pick());
  },[]);
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
  const titleMap = lang==='en' ? { 'HAP VAN DE WEEK':'Dish of the week','HAP VAN HET SEIZOEN':'Seasonal dish','VEGETARISCHE HAP':'Vegetarian dish','SALADE VAN DE MAAND':'Salad of the month','SOEP VAN DE MAAND':'Soup of the month' } : {};
  return (
    <Card className="p-5">
      <div className="space-y-5">
        {specials.groups.map((gr) => (
          <div key={gr.title}>
            <h3 className="font-[ui-serif] text-base tracking-wide mb-1">{titleMap[gr.title] || gr.title}</h3>
            {gr.items.map((it, idx) => { const di = translateDish(it, lang); return (
              <div key={idx} className="flex items-start justify-between gap-3 py-2 border-t border-amber-900/10 first:border-t-0">
                <div className="min-w-0">
                  <div className="font-medium">{di.name}</div>
                  {di.desc && <div className="text-sm text-amber-900/80 mt-0.5">{sentenceCase(di.desc)}</div>}
                </div>
                {typeof di.price==='number' && <div className="shrink-0 font-semibold">€{di.price.toFixed(2)}</div>}
              </div>
            ); })}
          </div>
        ))}
      </div>
    </Card>
  );
}
function DishCard({ venue, dish, pairings, onToast, lang }){
  useEffect(()=>{ recordEvent({ type:'dish_view', dish: dish.id }); }, [dish?.id]);
  const t = i18n[lang];
  const local = translateDish(dish, lang);
  const showSupplier = (local.tags||[]).some((tx)=> /supplier:nicetomeat|nicetomeat/i.test(String(tx)));
  const supplierLogo = useImageCandidate([
    'nice-to-meat-you-logo-1 1.png',
    'nice-to-meat.png',
    '/nice-to-meat-you-logo-1 1.png',
    '/nice-to-meat.png'
  ]);
  return (
    <Card className="p-5 relative overflow-hidden">
      {showSupplier && supplierLogo && (
        <img src={supplierLogo} alt="Nice to Meat" className="absolute right-4 top-4 h-8 opacity-80" />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-[18px] font-semibold leading-tight truncate">{local.name}</h3>
          <p className="text-sm text-amber-900/80 mt-0.5">{t.typeLabel(local.type)} • {venue.currency}{Number(local.price).toFixed(2)}</p>
          {local.desc ? (
            <p className="mt-2 text-[13px] text-amber-900/80 leading-relaxed">{sentenceCase(local.desc)}</p>
          ) : (
            <p className="mt-2 text-[13px] text-amber-900/70">{(local.tags||[]).slice(0,3).join(' • ')}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex gap-1" aria-hidden="true">
          {(local.diet||[]).slice(0,3).map((d)=> <span key={String(d)} className="text-[11px] px-2 py-1 rounded-full bg-amber-700/10">{String(d)}</span>)}
        </div>
      </div>
      {pairings?.length>0 && (
        <div className="mt-4 flex justify-end">
          <button className={`px-3 py-2 rounded-full text-[12px] bg-amber-600 text-amber-50 shadow ${focusRing}`}
            onClick={()=>{ const p = pairings[0]; recordEvent({ type:'chip_click', label: `${p.kind}:${p.name}`, dish: local.id }); const copy = gpt5PairingCopy({ pairing: p, lang }); onToast?.(copy); }}
            aria-label={`${t.pairings}: ${pairings[0].name}`}
          >{t.pairingChip(venue.currency, (pairings[0].price||6))}</button>
        </div>
      )}
      <div className="mt-4 text-xs text-amber-900/70">{t.orderHandOff}</div>
    </Card>
  );
}

/********************
 * Quiz helpers
 ********************/
function StepCard({ title, children, onBack, onNext, backLabel, nextLabel }){
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

/********************
 * WhatsApp Opt-in (custom, lighter than StepCard)
 ********************/
function WhatsAppOptIn({ name, diet, taste, lang, onBack, onNext, onChange, value }) {
  const t = i18n[lang];
  const dietLabel = (i18n[lang].diets.find(d=>d.key===diet)?.label) || (lang==='nl' ? 'een favoriete keuze' : 'a favourite choice');
  const choiceText = taste || dietLabel;
  return (
    <section>
      <div className="p-6">
        {/* Titel */}
        <p className="text-lg font-semibold text-amber-900 mb-1">
          {t.whatsappOptTitle(name)}
        </p>
        {/* Body met keuze — zelfde grootte/stijl als titel */}
        <p className="text-lg font-semibold text-amber-900 mb-4">
          {t.whatsappOptBody(choiceText)}
        </p>
        {/* Uitleg kleiner */}
        <p className="text-sm text-amber-900/80 mb-4">
          {t.whatsappOptSmall}
        </p>

        {/* Input */}
        <input
          type="tel"
          autoFocus
          aria-label="Phone number"
          placeholder={t.phonePlaceholder}
          className="w-full px-4 py-3 rounded-2xl border bg-white/80 focus:outline-none caret-amber-700 mb-3 text-base"
          value={value}
          onChange={(e)=>onChange(e.target.value)}
        />

        {/* Checkbox */}
        <label className="flex items-start gap-2 text-xs text-amber-900/70 leading-snug mb-6">
          <input type="checkbox" className="mt-0.5 accent-amber-700" />
          <span>{t.agreeWhatsApp}</span>
        </label>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className={`px-4 py-3 rounded-2xl border bg-white/80 ${focusRing}`}>{t.back}</button>
          <button onClick={onNext} className={`px-5 py-3 rounded-2xl text-[17px] font-medium bg-amber-700 text-amber-50 ${focusRing}`}>{t.next}</button>
        </div>
      </div>
    </section>
  );
}

/********************
 * Main App
 ********************/
function App(){
  // Start in NL, remember last choice if present
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('lang') || 'nl'; } catch { return 'nl'; } });
  const t = i18n[lang];
  const [step, setStep] = useState(0); // 0=intro,1=diet,2=taste,3=name,4=whatsapp,5=menu
  const [user, setUser] = useState({ name:'', diet:'meatfish', taste:'✨ Licht & Fris', phone:'' });
  const [toast, setToast] = useState({ open:false, text:'' });
  const toastTimer = useRef(null);
  const showToast = (text) => { try{ if (toastTimer.current) clearTimeout(toastTimer.current); }catch{} setToast({open:true,text}); toastTimer.current=setTimeout(()=>setToast({open:false, text:''}), 2200); };
  useEffect(()=>{ try{ localStorage.setItem('lang', lang); }catch{} }, [lang]);

  const venue = demo.venue;
  const context = useMemo(()=>getContextSignals(), [step]);
  const ranked = useMemo(()=> gpt5RankDishes({ user, context, dishes: demo.menu }), [user, context]);
  const specialDish = useMemo(()=>{ try{ const ids = new Set((demo.weekmenu||[]).map(w=>w.dish_id)); return ranked.find(d=>ids.has(d.id)) || null; }catch{ return null; } }, [ranked]);

  return (
    <div className="min-h-[100dvh] bg-[#F3E8D2] text-amber-950 selection:bg-amber-700/20 relative" role="application" aria-label="AI Menu App">
      {/* Intro */}
      {step===0 && (
        <main className="max-w-screen-sm mx-auto px-4 py-4 text-center">
          <BrandHeader />
          <div className="mt-8"><RotatingQuote large /></div>
          <div className="mt-10"><Button onClick={()=>setStep(1)}>{t.seeMenu}</Button></div>
          <FixedFooter />
        </main>
      )}

      {/* Steps 1-3 with progress */}
      {step>=1 && step<=3 && (
        <main className="max-w-screen-sm mx-auto px-4 py-4 pb-24">
          <BrandHeader />
          <div className="text-center text-sm mt-4">{t.stepXof3(step)}</div>
          <div className="mt-2 h-1 rounded-full bg-amber-900/10"><div className="h-1 rounded-full bg-amber-700" style={{ width: `${(step/3)*100}%` }} /></div>

          {step===1 && (
            <StepCard title={t.dietary} onBack={()=>setStep(0)} onNext={()=>setStep(2)} backLabel={t.back} nextLabel={t.next}>
              <DietPicker lang={lang} value={user.diet} onChange={(diet)=>setUser({...user, diet})} />
            </StepCard>
          )}
          {step===2 && (
            <StepCard title={t.taste} onBack={()=>setStep(1)} onNext={()=>setStep(3)} backLabel={t.back} nextLabel={t.next}>
              <TastePicker lang={lang} value={user.taste} onChange={(taste)=>setUser({...user, taste})} />
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

      {/* Step 4: WhatsApp Opt-in (no progress bar) */}
      {step===4 && (
        <main className="max-w-screen-sm mx-auto px-4 py-4 pb-24">
          <BrandHeader />
          <WhatsAppOptIn
            lang={lang}
            name={user.name}
            diet={user.diet}
            taste={user.taste}
            value={user.phone}
            onChange={(phone)=>setUser({...user, phone})}
            onBack={()=>setStep(3)}
            onNext={()=>setStep(5)}
          />
          <FixedFooter />
        </main>
      )}

      {/* Menu */}
      {step===5 && (
        <main className="max-w-screen-sm mx-auto px-4 py-4 pb-32">
          <Hero>
            {/* Language switch in hero top-right */}
            <LangSwitchInline lang={lang} onChange={setLang} className="absolute top-3 right-3" />
          </Hero>
          <BrandHeader />
          <div className="font-[ui-serif] text-xl text-center mt-4">{user.name ? (lang==='nl' ? `Hi ${user.name}! Waar heb je zin in?` : `Hi ${user.name}! What do you feel like?`) : (lang==='nl' ? 'Waar heb je zin in?' : 'What do you feel like?')}</div>

          {/* Sticky filters under header; content scrolls from week menu */}
          <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-[#F3E8D2]/95 backdrop-blur border-b border-amber-900/10">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {i18n[lang].tastes.map(({label, code})=> (
                <button key={code} onClick={()=>setUser({...user, taste: label})} className={`px-4 py-2 rounded-full border ${tasteToCode(user.taste)===code ? 'bg-amber-700 text-amber-50' : 'bg-white/70'} ${focusRing}`} aria-pressed={tasteToCode(user.taste)===code}>{label}</button>
              ))}
            </div>
          </div>

          {/* Personal selection (weekspecial dish) */}
          {specialDish && (
            <section aria-labelledby="week-special" className="mt-2">
              <h2 id="week-special" className="font-[ui-serif] text-lg mb-1">{(demo.weekmenu && demo.weekmenu[0] && demo.weekmenu[0].label) || t.weekSpecial}</h2>
              <DishCard lang={lang} venue={venue} dish={specialDish} pairings={pickPairings({ dish: specialDish, pairings: demo.pairings, user, rules: demo.rules })} onToast={(txt)=>showToast(txt)} />
            </section>
          )}

          {/* Specials text card */}
          {demo.specials && (
            <section aria-labelledby="specials" className="mt-1">
              <h2 id="specials" className="font-[ui-serif] text-lg mb-1">{demo.specials.metaTitle}</h2>
              <SpecialsCard lang={lang} specials={demo.specials} />
            </section>
          )}

          {/* Full menu */}
          <section id="full-menu" aria-labelledby="full-menu-title" className="mt-3">
            <h2 id="full-menu-title" className="font-[ui-serif] text-lg mb-1">{t.fullMenu}</h2>
            <div className="grid gap-4">
              {ranked.map(d => (
                <DishCard key={d.id} lang={lang} venue={venue} dish={d} pairings={pickPairings({ dish: d, pairings: demo.pairings, user, rules: demo.rules })} onToast={(txt)=>showToast(txt)} />
              ))}
            </div>
          </section>

          {/* Fixed CTA */}
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[min(92%,420px)]">
            <button className={`w-full px-5 py-4 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] bg-amber-700 text-amber-50 ${focusRing}`}
              onClick={()=>{ const el=document.getElementById('full-menu'); if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); else window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'}); }}
            >{lang==='nl' ? 'Bekijk het hele menu' : 'View full menu'}</button>
          </div>

          {/* footer on menu page (non-fixed) */}
          <div className="max-w-screen-sm mx-auto px-4 mt-8 pb-8">
            <div className="w-full border-t border-amber-900/20" />
            <div className="pt-2"><FooterBlock /></div>
          </div>
        </main>
      )}

      <ToastBar open={toast.open} text={toast.text} onClose={()=>setToast({open:false, text:''})} />
    </div>
  );
}

// ✅ Explicit default export to avoid scope/bundler edge cases
export default App;

/********************
 * Dev tests (?test=1)
 ********************/
if (typeof window !== 'undefined'){
  try{
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('test')==='1'){
      console.assert(typeof i18n==='object' && i18n.nl && i18n.en, 'i18n present');
      console.assert(typeof tasteToCode==='function', 'tasteToCode present');
      console.assert(tasteToCode('Licht & fris')==='light_fresh', 'taste NL -> code');
      console.assert(tasteToCode('✨ Licht & Fris')==='light_fresh', 'taste with emoji -> code');
      console.assert(tasteToCode('Rich & hearty')==='rich_hearty', 'taste EN -> code');
      const ranked = gpt5RankDishes({ user:{diet:'veg', taste:'✨ Licht & Fris'}, context:{daypart:'dinner'}, dishes: demo.menu });
      console.assert(ranked.length>=1, 'ranking returns items');
      const ps = pickPairings({ dish: demo.menu[0], pairings: demo.pairings, user:{taste:'Licht & fris'}, rules: demo.rules });
      console.assert(ps.length>=1 && ps.length<=3, 'pairings length 1..3');
      const uniq = new Set(ps.map(p=>`${p.kind}|${p.name}`));
      console.assert(uniq.size === ps.length, 'pairings deduped');
      const tr = translateDish(demo.menu[0], 'en');
      console.assert(!!tr.name, 'translateDish provides English where available');
      console.assert(sentenceCase('romig met kaas')==='Romig met kaas', 'sentenceCase capitalizes');
      console.assert(i18n.nl.next==='Volgende' && i18n.en.next==='Next', 'i18n basic labels');
      console.assert(typeof WhatsAppOptIn === 'function', 'WhatsAppOptIn exists');
      console.assert(typeof App === 'function', 'App is defined');
      console.log('%cDEV TESTS passed','color:green;font-weight:bold');
    }
  }catch(err){ console.error('DEV TESTS failed', err); }
}
