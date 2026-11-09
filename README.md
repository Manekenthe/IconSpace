# DockIcons – galerie ikon pro iOS a macOS

Statický web (čisté HTML / CSS / JS, bez buildu a bez závislostí) pro GitHub Pages.

## Struktura

```
index.html            stránka
css/styles.css        styly
js/app.js             logika (filtry, řazení, vyhledávání, detail, téma)
js/icons.js           malé UI ikony (šipky, hledání, téma…)
data/apps.csv         aplikace – sem přidáváš nové
data/categories.csv   kategorie a jejich ikony
data/counts.json      ručně zadaný počet ikon (iOS / macOS)
icons/ios, icons/macos   PNG ikony aplikací
assets/ui-icons/      SVG ikony kategorií a rozhraní
assets/brand/         favicon, OG obrázek, manifest
```

Žádný skript se nespouští. Web čte CSV soubory přímo v prohlížeči.

## Přidání aplikace

1. Nahraj PNG ikonu do `icons/ios/` nebo `icons/macos/` (čtverec, ideálně 512×512 px).
2. Přidej řádek do `data/apps.csv`:

| sloupec | význam |
|---|---|
| platform | `ios` nebo `macos` |
| title | název aplikace |
| category | název kategorie z `data/categories.csv` |
| developer | vývojář |
| date | `YYYY-MM`, např. `2026-10` |
| website | např. `aave.com` |
| appstore | celý odkaz do App Storu |
| testflight | odkaz na TestFlight (jen pro aplikace, které ještě nejsou v App Storu) |
| expires | do kdy platí TestFlight build, `YYYY-MM`, např. `2027-01` |
| icon | cesta k PNG, např. `icons/ios/aave.png` |
| featured | `yes` pro „Featured“, jinak prázdné |

**TestFlight:** u beta aplikace nech `appstore` prázdné a vyplň `testflight` (a `expires`). Na ikoně se ukáže
štítek „TestFlight“ a v detailu řádky „Release Date“, „Expires“ a „TestFlight“. Pokud jsou vyplněné oba odkazy,
platí App Store (bez štítku). Až aplikace vyjde, doplň `appstore` a TestFlight můžeš smazat.

Při chybě v řádku (špatný `platform`, neznámá kategorie…) web vypíše upozornění do konzole prohlížeče.

## Přidání kategorie

1. Nahraj SVG ikonu do `assets/ui-icons/`. Čtverec (např. 16×16), jedna barva,
   výplň `fill="black"` nebo `fill="currentColor"`, bez dalších barev a filtrů.
2. Přidej řádek do `data/categories.csv`: `Název kategorie,nazev-souboru-bez-pripony`
   (např. `Shopping,shopping-cart`). Pořadí řádků = pořadí v dropdownu, drž abecední.
3. V `data/apps.csv` použij přesně tento název kategorie.

## Počet ikon

V `data/counts.json` nastav např. `{"ios": 3085, "macos": 1200}`. Při hledání nebo filtru kategorie
se ukazuje počet nalezených ikon.

## Nasazení

Změny nahraj přes web GitHubu (Add file → Upload files) nebo přes `git push`. Soubor `CNAME`
v repozitáři nemaž, drží vlastní doménu.

Lokální náhled: `python3 -m http.server 8000` a http://localhost:8000.
(Po dvojkliku na `index.html` web nefunguje, prohlížeč blokuje čtení CSV z disku.)
