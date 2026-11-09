# GeoDrill

A browser geography trainer built to raise scores in **MapTap** (tap a prompted place on a 3D globe, scored by distance) and **Globle** (guess the hidden country from hot/cold colours).

**Live:** https://jbeuckm.github.io/geoprep/ — installable as a PWA (Install button in Chrome/Edge/Android; on iOS use Share → Add to Home Screen). Works fully offline once loaded.

## Run

```sh
cd geoquiz
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly also works for the world level: the app falls back to loading the world map from a CDN when the local `data/` fetch is blocked by the browser. Sub-national levels need the local server.

Deep links: `index.html?level=india&region=South`, `?level=russia&region=Far%20Eastern`, `?level=world&region=South%20Pacific`.

## Levels and scope

Two dropdowns in the header set what every mode uses:

| Level | Units | Regions | Extra prompts |
|---|---|---|---|
| World | 196 countries (1:50m, includes microstates and Pacific nations) | 6 continents + 20 study regions (Balkans, Stans, Sahel, Caribbean, South Pacific, ...) | 190 capitals, 100 cities, 90 landmarks |
| United States | 50 states + DC | Census regions | state capitals |
| India | 28 states + 8 UTs | North / West / Central / East / Northeast / South | capitals, 84 cities, 15 landmarks |
| China | 31 provinces-level units | 6 geographic regions | capitals, 60 cities, 12 landmarks |
| Brazil | 27 states | 5 regiões | capitals, 42 cities, 12 landmarks |
| Russia | 83 federal subjects | 8 federal districts | capitals, 27 cities, 12 landmarks |
| Canada | 10 provinces + 3 territories | – | capitals |
| Australia | 6 states + 2 territories | – | capitals, 44 cities, 15 landmarks |

## Modes

| Mode | Trains | Game it helps |
|---|---|---|
| Study | Region list with capitals, neighbour counts and city counts. Click a unit to fly to it with its cities pinned. Tour auto-cycles the scope. Buttons launch any drill on the same scope. | both |
| Explore | Hover/click any unit: name, neighbours, capital, cities | both |
| Tap | 5-question rounds: tap a unit, capital, city or landmark on the globe. Inside the border = 100, else exponential falloff with distance (tighter scale for sub-national levels) | MapTap |
| Globle | Unlimited Globle replica on the current level and scope. Border-to-border distances, same colour logic, region hint, give-up reveal | Globle |
| Borders | Pick every land neighbour of a unit from nearby distractors, or "no land borders" | Globle |
| Closer | Which of two nearby units is closer to the target (border distance) | Globle |
| Name It | A unit is highlighted with no labels; choose its name from four nearby options | MapTap |

Every mode records misses per unit in `localStorage`. Units you miss come up more often in all modes, and the **Stats** view maps them green-to-red and lists the weakest.

## Data

- `data/countries-50m.json`: Natural Earth 1:50m via world-atlas 2.0.2. Somaliland, Northern Cyprus, Western Sahara and Siachen are folded into Somalia, Cyprus, Morocco and India so the border graph matches Globle's country list. Dependencies are drawn but never used as answers.
- `data/admin1/*.json`: Natural Earth 1:50m admin-1 (Russia from 1:10m, simplified). Crimea and Sevastopol are excluded from the Russia level.
- `data/places.js`, `data/subcapitals.js`, `data/subcities.js`: hand-entered coordinates.
- `data/regions.js`: continent, study-region and sub-national region membership.

The world map is simplified to 40% of its vertices at rest and 7% while dragging or animating, so the globe stays smooth.

Libraries: d3 7.9 and topojson 3.0.2 from cdnjs. No build step.

## PWA

`manifest.webmanifest` plus `sw.js` precache the app shell, the two CDN libraries and all map data (about 1.6 MB). `pwa.js` registers the worker, shows a reload toast when a new version is deployed, wires the Install button, and shows a one-time Add-to-Home-Screen hint on iOS. Bump `VERSION` in `sw.js` when shipping changes so clients pick them up.

Deploys: GitHub Pages serves the `main` branch root. Push to `main` and the site updates in a minute or two.

## Automation hook

`window.__geo` exposes `tapLatLon(lat, lon)`, `setLevel(id, region)`, `setMode(id)`, `findUnit(text)` and the current level, so scripts can play the app.
