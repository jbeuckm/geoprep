# GeoDrill

A browser geography trainer for map-placement, hot-and-cold country hunts and street-level identification. Built for players of games like MapTap, Globle and GeoGuessr, but the app itself names skills, not games.

**Live:** https://jbeuckm.github.io/geoprep/ — installable as a PWA (Install button in Chrome/Edge/Android; on iOS use Share → Add to Home Screen). Works fully offline once loaded.

## Run

```sh
cd geoquiz
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly also works for the world level: the app falls back to loading the world map from a CDN when the local `data/` fetch is blocked by the browser. Sub-national levels need the local server.

Deep links: `index.html?level=india&region=South`, `?level=russia&region=Far%20Eastern`, `?level=world&region=South%20Pacific`.

## Train (default)

The landing screen offers four programmes: **Locate** (tap, shapes, flags), **Hot & Cold** (hidden country, borders, distances), **Street Clues** (clues, flags, capitals) or **Everything**. The app then runs sets of five questions (or one Tap round or Globle game), choosing the topic and drill itself:

- Topics are the study regions and sub-national regions. Each is weighted by `(misses + 1) / (seen + 2)`, so unseen topics are sampled early and mastered ones fade. The last topic is down-weighted to avoid ruts.
- A set with 40%+ misses triggers a **review**: the study guide opens on that topic, then the same topic is quizzed again. After one review-and-retry the programme moves on; the topic's miss rate brings it back later.
- **Skip topic** and **Stop** sit in the training bar. Touching the nav or the dropdowns stops the programme and hands control back.

Everything below is the manual mode, for people who want to steer.

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
| Tap | 5-question rounds: tap a unit, capital, city or landmark on the globe. Inside the border = 100, else exponential falloff with distance (tighter scale for sub-national levels) | placement |
| Hot & Cold | A hidden unit; each guess is coloured by border-to-border distance. Region hint, give-up reveal | hot/cold |
| Borders | Pick every land neighbour of a unit from nearby distractors, or "no land borders" | hot/cold |
| Closer | Which of two nearby units is closer to the target (border distance) | hot/cold |
| Name It | A unit is highlighted with no labels; choose its name from four nearby options. Nearby countries outside the options are labelled for orientation | placement |
| Flags | A national flag; choose the country from four regional neighbours (world level) | all |
| Clues | Three street-level clues (driving side, road lines, poles, signs, plates, camera-car quirks, language); pick the country from four same-side neighbours. Reveal more clues on demand | street |

In Study and Explore, the **Aa** button on the globe labels the map: one press names every unit in view (largest first, more appear as you zoom), a second adds capitals and cities, a third turns labels off. The setting is remembered, and the button is hidden in drills so it never gives answers away.

Every mode records misses per unit in `localStorage`. Units you miss come up more often in all modes, and the **Stats** view maps them green-to-red and lists the weakest.

## Links and sharing

Every view has a link, kept in the address bar as you move around (Back and Forward work):

| Link | Opens |
|---|---|
| `#/tap/brazil` | Tap on Brazil |
| `#/hotcold/world/caribbean` | Hot & Cold, Caribbean scope |
| `#/borders/usa/west` | Borders on US West |
| `#/study/india/south?u=kerala` | India South study guide with Kerala's card open |
| `#/stats/canada` | Stats for Canada |
| `#/train/locate` | Starts the Locate programme (`hotcold`, `street`, `mixed` also work) |

Mode slugs: `train study explore tap hotcold borders closer nameit flags clues stats`. Level ids: `world usa india china brazil canada australia russia`. Regions are slugified names (`western-europe`, `far-eastern`).

**Share** in the header copies a link to what you are looking at, or opens the phone share sheet. In Tap it shares the round's five questions (planned when the round starts); in Hot & Cold it shares the hidden country; after finishing, your score or guess count rides along and the friend sees it as the score to beat. Answers travel by name, scrambled so that neither the URL nor a base64 decoder shows them (this is not security, just spoiler protection). Older plain-base64 links and `?level=&region=` links still work. A damaged link opens a fresh game and says so.

Leaving a Tap round, Hot & Cold game or training set mid-way (Back, another mode, a level change) keeps it: coming back to the same address picks up where you were. Pressing the current mode's button again starts afresh.

## Data

- `data/countries-50m.json`: Natural Earth 1:50m via world-atlas 2.0.2. Somaliland, Northern Cyprus, Western Sahara and Siachen are folded into Somalia, Cyprus, Morocco and India so the border graph matches Globle's country list. Crimea, which Natural Earth draws inside Russia, is moved to Ukraine at load time. Dependencies are drawn but never used as answers.
- `data/admin1/*.json`: Natural Earth 1:50m admin-1 (Russia from 1:10m, simplified). Crimea and Sevastopol are excluded from the Russia level.
- `data/places.js`, `data/subcapitals.js`, `data/subcities.js`: hand-entered coordinates.
- `data/regions.js`: continent, study-region and sub-national region membership.
- `data/iso.js` + `data/flags/*.svg`: ISO alpha-2 codes and 227 flags vendored from the MIT-licensed flag-icons package (4:3). Syria's flag is updated to the 2025 green-white-black flag with three red stars.
- `data/clues.js`: hand-written street-level identification clues for 134 countries and territories with Street View coverage. Shown on study cards and used by the Clues drill.

The world map is simplified to 40% of its vertices at rest and 7% while dragging or animating, so the globe stays smooth.

Libraries: d3 7.9 and topojson 3.0.2 from cdnjs. No build step.

## PWA

`manifest.webmanifest` plus `sw.js` precache the app shell, the two CDN libraries and all map data (about 1.6 MB). `pwa.js` registers the worker, shows a reload toast when a new version is deployed, wires the Install button, and shows a one-time Add-to-Home-Screen hint on iOS. Bump `VERSION` in `sw.js` and `APP_VERSION` in `app.js` together when shipping changes: the worker version makes clients update, and the app version is what Stats shows, so it always names the code actually running.

Deploys: GitHub Pages serves the `main` branch root. Push to `main` and the site updates in a minute or two.

## Automation hook

`window.__geo` exposes `tapLatLon(lat, lon)`, `setLevel(id, region)`, `setMode(id)`, `findUnit(text)` and the current level, so scripts can play the app.
