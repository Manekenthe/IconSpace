# DockApp – galerie ikon pro iOS a macOS

Statický web (čisté HTML / CSS / JS, bez buildu a bez závislostí). Běží přímo na GitHub Pages.

## Struktura

```
index.html            stránka
css/styles.css        styly (barvy, typografie a komponenty z dokumentu)
js/app.js             logika: filtry, řazení, vyhledávání, modal, téma
js/icons.js           UI ikony (generované, viz níže)
data/apps.csv         ZDROJ DAT – sem přidáváš aplikace
data/counts.json      ručně zadaný počet ikon (iOS / macOS)
data/apps.js          generované z apps.csv (to načítá web)
icons/ios/*.png       ikony aplikací pro iOS
icons/macos/*.png     ikony aplikací pro macOS
assets/fonts/         Geist
assets/ui-icons/      originální SVG ikony UI a kategorií
tools/                pomocné skripty (Python 3)
```

## Přidání nové aplikace

1. Ulož PNG ikonu do `icons/ios/` nebo `icons/macos/` (doporučeno 512×512 px, čtverec).
2. Přidej řádek do `data/apps.csv` (otevři v Numbers / Excelu / Google Sheets, ulož jako CSV UTF‑8):

   | sloupec | význam |
   |---|---|
   | platform | `ios` nebo `macos` |
   | title | název aplikace |
   | category | přesně jedna z 20 kategorií (např. `Finance`, `Developer Tools`) |
   | developer | vývojář |
   | date | `YYYY-MM`, např. `2026-10` (zobrazí se jako „October 2026“) |
   | website | např. `aave.com` |
   | appstore | celý odkaz do App Storu |
   | icon | cesta k PNG, např. `icons/ios/aave.png` |
   | featured | `yes` pro „Featured“, jinak prázdné |

3. Spusť `python3 tools/build-data.py` – vygeneruje `data/apps.js` a upozorní na chyby
   (špatná kategorie, chybějící soubor ikony, špatný formát data).
4. Commit + push → GitHub Pages se aktualizuje za minutu.

Řazení „Latest“: podle `date`, a při stejném měsíci je novější řádek níže v CSV.

## Počet ikon

V `data/counts.json` nastav čísla (např. `{"ios": 3085, "macos": 1200}`) a spusť build-data.
Při aktivním hledání nebo filtru kategorie se ukazuje počet nalezených ikon.

## Lokální náhled

```
python3 -m http.server 8000
```
a otevři http://localhost:8000. (Web funguje i po dvojkliku na `index.html`.)

## Nasazení na GitHub Pages

1. Na GitHubu vytvoř nový repozitář (např. `dockapp`), public.
2. V této složce:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<tvoje-jmeno>/dockapp.git
   git push -u origin main
   ```
3. Na GitHubu: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
   Branch: `main`, folder `/ (root)` → Save**.
4. Za 1–2 minuty běží na `https://<tvoje-jmeno>.github.io/dockapp/`.

Všechny cesty jsou relativní, takže web funguje i v podadresáři `/dockapp/`.

## Poznámky

- Při změně UI ikony v `assets/ui-icons/` spusť `python3 tools/build-ui-icons.py`.
- Aktuální data a ikony v `data/apps.csv` / `icons/` jsou **ukázkové** (fiktivní aplikace) – před nasazením je smaž.
- Při tisících ikon doporučuju PNG zmenšit (512 px, případně komprimovat přes pngquant / Squoosh),
  web načítá obrázky líně a karty vykresluje po dávkách, ale velikost stránky pak bude znát.
