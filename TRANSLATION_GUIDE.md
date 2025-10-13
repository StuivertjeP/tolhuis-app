# 🌍 Vertaling Gids voor 't Tolhuis Menu

## 📋 Overzicht

De Tolhuis app gebruikt nu **professionele OpenAI vertalingen** die rechtstreeks in Google Sheets worden opgeslagen. Dit voorkomt "Dinglish" en zorgt voor consistente, natuurlijke Engelse vertalingen.

## 🚀 Snelstart

### 1. Voeg kolommen toe aan Google Sheets

Voeg deze twee kolommen toe aan je Google Sheets (kolommen N en O):
- **Kolom N**: `title_en` - Engelse titel
- **Kolom O**: `description_en` - Engelse beschrijving

### 2. Installeer dependencies
```bash
npm install
```

### 3. Configureer Google Service Account

⚠️ **Eenmalig instellen**

1. Volg de instructies in `utils/setup-google-auth.md`
2. Vul je `.env` file in met de Service Account gegevens

### 4. Run het vertaal script

```bash
# Vertaal het menu
npm run translate

# Vertaal het weekmenu
npm run translate-weekmenu
```

## 💡 Hoe werkt het?

### Google Sheets Structuur

```
| A | B       | C            | D                    | E     | ... | N          | O                  |
|---|---------|--------------|----------------------|-------|-----|------------|--------------------|
| id| section | title        | description          | price | ... | title_en   | description_en     |
| 1 | dinner  | Caesar salade| Gegaarde kippendijen | 12.50 | ... | Caesar Salad | Slow-cooked chicken |
```

### Vertaling Flow

1. **Script leest** Nederlandse kolommen (`title`, `description`)
2. **OpenAI vertaalt** met professionele culinaire toon
3. **Script schrijft** vertalingen naar `title_en` en `description_en`
4. **WebApp gebruikt** Sheets vertalingen automatisch

### In de WebApp

De webapp check automatisch of er Sheets vertalingen beschikbaar zijn:

```javascript
// In translationService.js
const titleEn = dish.title_en;        // Sheets vertaling
const descEn = dish.description_en;   // Sheets vertaling

// Gebruik Sheets vertaling of fallback naar lokale vertaling
name: titleEn || translateText(dish.name, lang)
```

## 🎯 Voordelen

✅ **Geen Dinglisch meer** - Professionele OpenAI vertalingen  
✅ **Consistente kwaliteit** - Elke vertaling door hetzelfde model  
✅ **Offline beschikbaar** - Vertalingen zitten in Sheets, geen API calls in webapp  
✅ **Eenmalig vertalen** - Run script 1x, gebruik vertalingen altijd  
✅ **Makkelijk aanpassen** - Bewerk vertalingen direct in Sheets  

## 🔄 Workflow

### Nieuwe gerechten toevoegen

1. Voeg nieuw gerecht toe in Google Sheets (Nederlands)
2. Run `npm run translate`
3. Check de Engelse vertalingen in kolommen N en O
4. Pas aan indien nodig direct in Sheets
5. Webapp gebruikt automatisch de nieuwe vertalingen

### Vertalingen aanpassen

1. Open Google Sheets
2. Bewerk `title_en` of `description_en` kolommen
3. Save - klaar! ✅
4. Webapp gebruikt direct de aangepaste vertalingen

## 📝 Voorbeelden

### Voor vertaling (Nederlands)

| title | description |
|-------|-------------|
| Caesar salade | Gegaarde kippendijen, romeinse sla, croutons en Parmezaan |
| Biefstuk Tolhuis | 200 gram biefstuk met friet en saus naar keuze |

### Na vertaling (Engels)

| title_en | description_en |
|----------|----------------|
| Caesar Salad | Slow-cooked chicken thighs, romaine lettuce, croutons, and Parmesan cheese |
| Tolhuis Steak | 200g steak served with French fries and your choice of sauce |

## 🐛 Troubleshooting

### "Vertalingen zijn nog steeds slecht in de webapp"

1. **Check Sheets**: Zijn `title_en` en `description_en` gevuld?
2. **Run script**: `npm run translate`
3. **Clear cache**: Herlaad de webapp (Cmd+Shift+R / Ctrl+Shift+R)

### "Script geeft errors"

1. **Dependencies**: Run `npm install`
2. **Service Account**: Check `.env` configuratie
3. **Sheet Access**: Service Account heeft Editor rechten nodig

### "Sommige gerechten zijn niet vertaald"

Het script slaat gerechten over die al `title_en` en `description_en` hebben. Om opnieuw te vertalen:
1. Verwijder de `title_en` en `description_en` waarden in Sheets
2. Run `npm run translate` opnieuw

## 🔒 Security

- **.env** staat in `.gitignore` - wordt NOOIT gecommit
- **API keys** blijven lokaal
- **Service Account** heeft alleen toegang tot jouw Sheets

## 📚 Files

- `utils/translateMenu.js` - Vertaal script
- `utils/README.md` - Gedetailleerde instructies
- `utils/setup-google-auth.md` - Google Service Account setup
- `src/utils/translationService.js` - WebApp vertaal logica
- `src/services/sheetsService.js` - Google Sheets data ophalen

## 🎉 Resultaat

Met deze setup heb je:
- ✅ Professionele, natuurlijke Engelse vertalingen
- ✅ Geen Dinglisch meer
- ✅ Snelle webapp (geen API calls meer voor vertalingen)
- ✅ Makkelijk te onderhouden (alles in Sheets)
- ✅ Eenmalig vertalen, altijd beschikbaar

**Veel succes! 🚀**

