/* GeoDrill — practice for MapTap (tap a place on the globe) and Globle (hot/cold country guessing).
   Levels: world countries plus sub-national units (US, India, China, Brazil, Canada, Australia).
   Scope: any level can be narrowed to a region; every drill and the study guide respect it. */
(() => {
'use strict';
const APP_VERSION = 'v25'; // keep in step with VERSION in sw.js

// ---------- Names (world level) ----------
const RENAME = {
  'United States of America':'United States','Dem. Rep. Congo':'DR Congo','Congo':'Republic of the Congo',
  'Central African Rep.':'Central African Republic','S. Sudan':'South Sudan','Eq. Guinea':'Equatorial Guinea',
  'Bosnia and Herz.':'Bosnia and Herzegovina','Dominican Rep.':'Dominican Republic','Solomon Is.':'Solomon Islands',
  'eSwatini':'Eswatini','Fr. S. Antarctic Lands':'French Southern Lands','Falkland Is.':'Falkland Islands',
  'W. Sahara':'Western Sahara','N. Cyprus':'Northern Cyprus','Macedonia':'North Macedonia',
  'Antigua and Barb.':'Antigua and Barbuda','Marshall Is.':'Marshall Islands','St. Vin. and Gren.':'Saint Vincent and the Grenadines',
  'St. Kitts and Nevis':'Saint Kitts and Nevis','São Tomé and Principe':'São Tomé and Príncipe','Vatican':'Vatican City',
  'Faeroe Is.':'Faroe Islands','Fr. Polynesia':'French Polynesia','Cook Is.':'Cook Islands','Cayman Is.':'Cayman Islands',
  'British Virgin Is.':'British Virgin Islands','U.S. Virgin Is.':'U.S. Virgin Islands','Turks and Caicos Is.':'Turks and Caicos Islands',
  'N. Mariana Is.':'Northern Mariana Islands','Pitcairn Is.':'Pitcairn Islands','Wallis and Futuna Is.':'Wallis and Futuna',
  'S. Geo. and the Is.':'South Georgia','Br. Indian Ocean Ter.':'British Indian Ocean Territory',
  'Ashmore and Cartier Is.':'Ashmore and Cartier Islands','Heard I. and McDonald Is.':'Heard and McDonald Islands','Indian Ocean Ter.':'Indian Ocean Territories',
};
// Disputed/unrecognised entities folded into a neighbour so borders behave like Globle's country list.
const MERGE = {'Somaliland':'Somalia','Northern Cyprus':'Cyprus','Western Sahara':'Morocco','Siachen Glacier':'India'};
const NOT_PLAYABLE = new Set(window.DEPENDENCIES);
const ALIASES = {
  'United States':['USA','US','America','United States of America'],
  'United Kingdom':['UK','Britain','Great Britain','England','Scotland','Wales'],
  'DR Congo':['Democratic Republic of the Congo','Congo-Kinshasa','DRC','Zaire','Congo (Kinshasa)'],
  'Republic of the Congo':['Congo','Congo-Brazzaville','Congo (Brazzaville)'],
  "Côte d'Ivoire":['Ivory Coast',"Cote d'Ivoire",'Cote dIvoire'],
  'Myanmar':['Burma'],'Eswatini':['Swaziland'],'Czechia':['Czech Republic'],'North Macedonia':['Macedonia'],
  'Timor-Leste':['East Timor'],'United Arab Emirates':['UAE','Emirates'],'South Korea':['Korea','Republic of Korea'],
  'North Korea':['DPRK'],'Netherlands':['Holland'],'Turkey':['Türkiye','Turkiye'],'Bosnia and Herzegovina':['Bosnia'],
  'Central African Republic':['CAR'],'Papua New Guinea':['PNG'],'Trinidad and Tobago':['Trinidad'],
  'Cabo Verde':['Cape Verde'],'Vatican City':['Vatican','Holy See'],'Russia':['Russian Federation'],
  'Iran':['Persia'],'Laos':['Lao PDR'],'Syria':['Syrian Arab Republic'],'Vietnam':['Viet Nam'],'Brunei':['Brunei Darussalam'],
  'Saint Vincent and the Grenadines':['St Vincent','Saint Vincent'],'Saint Kitts and Nevis':['St Kitts'],'Saint Lucia':['St Lucia'],
  'Micronesia':['Federated States of Micronesia','FSM'],'Tibet':['Xizang'],'Inner Mongolia':['Nei Mongol'],'Québec':['Quebec'],
  'District of Columbia':['DC','Washington DC'],'Dadra & Nagar Haveli and Daman & Diu':['Dadra and Nagar Haveli','Daman and Diu'],
};

// ---------- Levels ----------
const LEVEL_DEFS = {
  world:     { label: 'World · countries',          url: 'data/countries-50m.json',   object: 'countries', unit: 'country', units: 'countries', home: [20, 25], homeZoom: 1, decay: 900 },
  usa:       { label: 'United States · states',     url: 'data/admin1/usa.json',      object: 'units', unit: 'state', units: 'states', parent: 'United States', home: [-97, 39], homeZoom: 2.4, decay: 300 },
  india:     { label: 'India · states & UTs',       url: 'data/admin1/india.json',    object: 'units', unit: 'state or UT', units: 'states & UTs', parent: 'India', home: [80, 22], homeZoom: 4, decay: 200 },
  china:     { label: 'China · provinces',          url: 'data/admin1/china.json',    object: 'units', unit: 'province', units: 'province-level units', parent: 'China', home: [104, 36], homeZoom: 2.8, decay: 300 },
  brazil:    { label: 'Brazil · states',            url: 'data/admin1/brazil.json',   object: 'units', unit: 'state', units: 'states', parent: 'Brazil', home: [-53, -12], homeZoom: 3, decay: 300 },
  canada:    { label: 'Canada · provinces',         url: 'data/admin1/canada.json',   object: 'units', unit: 'province or territory', units: 'provinces & territories', parent: 'Canada', home: [-96, 60], homeZoom: 2, decay: 400 },
  australia: { label: 'Australia · states',         url: 'data/admin1/australia.json',object: 'units', unit: 'state or territory', units: 'states & territories', parent: 'Australia', home: [134, -27], homeZoom: 3, decay: 400 },
  russia:    { label: 'Russia · federal subjects',  url: 'data/admin1/russia.json',   object: 'units', unit: 'region', units: 'regions', parent: 'Russia', home: [95, 62], homeZoom: 1.5, decay: 450 },
};
// Known errors in the boundary data, corrected at the adjacency level so Borders/Globle teach current facts.
// India: the 2014 transfer of the Bhadrachalam-area mandals to Andhra Pradesh is missing from Natural Earth.
const ADJ_FIX = {
  india: { remove: [['Telangana', 'Odisha']], add: [['Andhra Pradesh', 'Chhattisgarh']] },
  usa: { remove: [['Utah', 'New Mexico'], ['Arizona', 'Colorado']] }, // Four Corners: point contact only
};
// Far-flung dependencies bundled into a country's polygon that distort distances (kept drawn, dropped from maths).
const PIECE_DROP = { 'New Zealand': c => c[1] > -25 /* Tokelau */ };
const LEVELS = {};           // id -> loaded level
let WORLD = null, CUR = null; // base map level, current level
let REGION = 'All';           // current region label within CUR

// ---------- Utilities ----------
const R = 6371;
const rad = d => d * Math.PI / 180;
function haversine(a, b) {
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const s = Math.sin(dLat/2)**2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
const fmtKm = d => d < 1 ? '0 km' : d < 10 ? d.toFixed(1) + ' km' : Math.round(d).toLocaleString() + ' km';
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const normalize = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const flagCode = u => (u && u.level === 'world' && window.ISO_A2[u.name]) || null;
const flagImg = (u, cls = 'flag') => { const c = flagCode(u); return c ? `<img class="${cls}" src="data/flags/${c}.svg" alt="" loading="lazy">` : ''; };

// ---------- Persistent stats ----------
const STORE = 'geodrill.v2';
let STATS = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.units) return s; } catch (e) {}
  return { units: {}, globle: [], tap: [], streaks: {} };
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(STATS)); } catch (e) {} }
function mark(unit, missed) {
  const c = STATS.units[unit.key] || (STATS.units[unit.key] = { seen: 0, miss: 0, name: unit.name, level: unit.level });
  c.seen++; if (missed) c.miss++; save();
  if (TRAIN.active) { TRAIN.setSeen++; if (missed) TRAIN.setMiss++; }
}
// Weighted random: unseen and often-missed units come up more.
function weightOf(unit) {
  const c = STATS.units[unit.key];
  if (!c) return 2.0;
  return 1 + 3 * (c.miss / c.seen) + (c.seen < 2 ? 0.8 : 0);
}
// Recently asked items per mode+level. Each entry records the item key and its normalized name, so a state and
// its same-named capital (São Paulo, Rio de Janeiro, Moscow) count as the same prompt.
// Kept in localStorage so a reload (or reopening the app) does not bring recent questions straight back.
const RECENT = (() => { try { const r = JSON.parse(localStorage.getItem('geodrill.recent')); return r && typeof r === 'object' ? r : {}; } catch (e) { return {}; } })();
function saveRecent() { try { localStorage.setItem('geodrill.recent', JSON.stringify(RECENT)); } catch (e) {} } // small; save at once so a reload loses nothing
function recentList() { const k = mode + ':' + (CUR ? CUR.id : ''); return RECENT[k] || (RECENT[k] = []); }
// No repeat until about half the pool has been asked: at least 5 questions, at most 30 (so misses can still come
// back to be re-drilled in big scopes), and never the whole pool.
function recentWindow(n) { return Math.max(0, Math.min(n - 1, Math.max(5, Math.min(30, Math.floor(n * 0.5))))); }
function avoidSet(n) {
  const out = new Set();
  for (const e of recentList().slice(-recentWindow(n))) { out.add(e.key); out.add(e.name); }
  return out;
}
function isRecent(avoid, key, name) { return avoid.has(key) || avoid.has(normalize(name)); }
function remember(key, name) {
  const rec = recentList(); rec.push({ key, name: normalize(name) });
  if (rec.length > 60) rec.splice(0, rec.length - 60); // the window never exceeds 30, so 60 is plenty
  saveRecent();
}
// Pick a unit, weighted toward misses, skipping recent ones. commit=false lets retry loops look without recording.
function pickTarget(list, commit = true) {
  const avoid = avoidSet(list.length);
  const cands = list.filter(u => !isRecent(avoid, u.key, u.name));
  const u = weightedPick(cands.length ? cands : list);
  if (commit) remember(u.key, u.name);
  return u;
}
function weightedPick(list) {
  const w = list.map(weightOf); let t = w.reduce((a, b) => a + b, 0) * Math.random();
  for (let i = 0; i < list.length; i++) { t -= w[i]; if (t <= 0) return list[i]; }
  return list[list.length - 1];
}

// ---------- Geodata ----------
function collectVertices(coords, out) {
  if (typeof coords[0] === 'number') out.push(coords);
  else for (const c of coords) collectVertices(c, out);
}
function canonicalWorld(raw) { const r = RENAME[raw] || raw; return MERGE[r] || r; }

const PARAMS = new URLSearchParams(location.search);
const SIMP = PARAMS.has('simp') ? +PARAMS.get('simp') : 0.4;   // share of vertices KEPT in the full world map (topojson.quantile keeps the top fraction)
const PREC = PARAMS.has('prec') ? +PARAMS.get('prec') : 1.0;   // projection resampling precision (larger = fewer samples)
// Natural Earth draws Crimea inside Russia. Move that polygon to Ukraine, the internationally recognised border,
// and merge it so no internal line is drawn at the isthmus.
function fixCrimea(topo) {
  const geoms = topo.objects.countries.geometries;
  const ru = geoms.find(g => g.properties && g.properties.name === 'Russia'), ua = geoms.find(g => g.properties && g.properties.name === 'Ukraine');
  if (!ru || !ua || ru.type !== 'MultiPolygon') return;
  const k = ru.arcs.findIndex(poly => { const c = d3.geoCentroid(topojson.feature(topo, { type: 'Polygon', arcs: poly })); return c[0] > 32 && c[0] < 37 && c[1] > 44 && c[1] < 46.5; });
  if (k < 0) return;
  const crimea = { type: 'Polygon', arcs: ru.arcs[k] };
  ru.arcs = ru.arcs.filter((_, i) => i !== k);
  const merged = topojson.mergeArcs(topo, [ua, crimea]);
  ua.type = merged.type; ua.arcs = merged.arcs;
}
function buildLevel(id, topo) {
  const def = LEVEL_DEFS[id], isWorld = id === 'world';
  if (isWorld) fixCrimea(topo);
  // Two detail levels: full geometry at rest, coarse geometry while dragging or animating.
  // Geometry maths (hit tests, centroids, areas, distances) use the original topology; simplified copies are only drawn.
  const pre = topojson.presimplify(topo);
  const fullTopo = isWorld && SIMP > 0 ? topojson.simplify(pre, topojson.quantile(pre, SIMP)) : topo;
  const coarseTopo = topojson.simplify(pre, topojson.quantile(pre, isWorld ? 0.07 : 0.15)); // keep 7% / 15% of vertices for motion frames
  const obj = topo.objects[def.object];
  const feats = topojson.feature(topo, obj).features;
  const featsDraw = topojson.feature(fullTopo, fullTopo.objects[def.object]).features;
  const featsCoarse = topojson.feature(coarseTopo, coarseTopo.objects[def.object]).features;
  const nb = topojson.neighbors(obj.geometries);
  const names = feats.map(f => isWorld ? canonicalWorld(f.properties.name) : f.properties.name);
  const groups = new Map();
  feats.forEach((f, i) => {
    const n = names[i];
    if (!groups.has(n)) groups.set(n, { name: n, level: id, key: id + ':' + n, features: [], featuresDraw: [], featuresCoarse: [], neighbors: new Set() });
    const g = groups.get(n); g.features.push(f); g.featuresDraw.push(featsDraw[i]); g.featuresCoarse.push(featsCoarse[i]);
    nb[i].forEach(j => { if (names[j] !== n) g.neighbors.add(names[j]); });
  });
  // regions
  const regions = {};
  if (isWorld) { Object.assign(regions, window.WORLD_CONTINENTS, window.WORLD_REGIONS); }
  else Object.assign(regions, window.LEVEL_REGIONS[id] || {});
  const primaryRegion = {};
  const regionOrder = isWorld ? Object.keys(window.WORLD_CONTINENTS) : Object.keys(regions);
  for (const r of regionOrder) for (const n of regions[r]) if (!primaryRegion[n]) primaryRegion[n] = r;
  // capitals
  const caps = new Map();
  if (isWorld) { for (const p of window.PLACES) if (p[4] === 'capital' && !caps.has(p[1])) caps.set(p[1], p[0]); }
  else { for (const p of (window.SUBCAPITALS[id] || [])) caps.set(p[0], p[1]); }

  const units = [];
  for (const g of groups.values()) {
    const fc = { type: 'FeatureCollection', features: g.features };
    g.centroid = d3.geoCentroid(fc);
    g.area = d3.geoArea(fc);
    // Simplification can collapse microstates and small islands; fall back to true geometry for drawing them.
    if (d3.geoArea({ type: 'FeatureCollection', features: g.featuresDraw }) < 0.6 * g.area) g.featuresDraw = g.features;
    if (d3.geoArea({ type: 'FeatureCollection', features: g.featuresCoarse }) < 0.6 * g.area) g.featuresCoarse = g.featuresDraw;
    const v = []; g.features.forEach(f => collectVertices(f.geometry.coordinates, v));
    const stride = Math.max(1, Math.floor(v.length / 700));
    g.vertices = v.filter((_, i) => i % stride === 0);
    if (!isWorld) g.allVertices = v;
    g.pieces = []; // centroid of each polygon, largest first, for ring markers on tiny units
    for (const f of g.features) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) { const geo = { type: 'Polygon', coordinates: poly }; g.pieces.push({ p: d3.geoCentroid(geo), a: d3.geoArea(geo), poly }); }
    }
    g.pieces.sort((x, y) => y.a - x.a);
    { // vertices of major landmasses only (≥10% of the largest), so overseas islands never carry the country's edge label
      const maxA = g.pieces.length ? g.pieces[0].a : 0, lv = [];
      for (const pc of g.pieces) if (pc.a >= 0.1 * maxA) collectVertices(pc.poly, lv);
      const st = Math.max(1, Math.floor(lv.length / 500)); g.labelVerts = lv.filter((_, i) => i % st === 0);
    }
    g.pieces = g.pieces.map(x => x.p);
    g.anchor = g.pieces[0] || g.centroid; // label/marker position: centre of the main landmass, not of a scattered multipolygon
    if (isWorld && PIECE_DROP[g.name]) { // drop far-flung pieces from distance maths
      const drop = PIECE_DROP[g.name];
      g.vertices = g.vertices.filter(v => !drop(v));
      g.pieces = g.pieces.filter(pt => !drop(pt));
    }
    g.region = primaryRegion[g.name] || (isWorld ? 'Other' : '');
    g.playable = isWorld ? !NOT_PLAYABLE.has(g.name) : true;
    g.capital = caps.get(g.name) || null;
    units.push(g);
  }
  if (!isWorld) { // repair adjacency where polygons touch without sharing arcs (e.g. enclaves)
    units.forEach(u => { u.bounds = d3.geoBounds({ type: 'FeatureCollection', features: u.features }); });
    const near = (a, b) => { const [[ax0, ay0], [ax1, ay1]] = a.bounds, [[bx0, by0], [bx1, by1]] = b.bounds, m = 0.1;
      return ax0 - m <= bx1 && bx0 - m <= ax1 && ay0 - m <= by1 && by0 - m <= ay1; };
    for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
      if (!units[i].allVertices || !units[j].allVertices) continue;
      const a = units[i], b = units[j];
      if (a.neighbors.has(b.name) || !near(a, b)) continue;
      let best = Infinity;
      const av = a.allVertices.length > 1500 ? a.vertices : a.allVertices, bv = b.allVertices.length > 1500 ? b.vertices : b.allVertices;
      for (const p of av) { for (const q of bv) { const d = haversine(p, q); if (d < best) best = d; } if (best < 3) break; }
      const enclave = contains(a, b.centroid) || contains(b, a.centroid);
      if (best < 3 || enclave) { a.neighbors.add(b.name); b.neighbors.add(a.name); }
    }
  }
  units.forEach(u => { delete u.allVertices; delete u.bounds; });
  if (ADJ_FIX[id]) {
    const byN = new Map(units.map(u => [u.name, u]));
    for (const [x, y] of ADJ_FIX[id].remove || []) { byN.get(x)?.neighbors.delete(y); byN.get(y)?.neighbors.delete(x); }
    for (const [x, y] of ADJ_FIX[id].add || []) { if (byN.has(x) && byN.has(y)) { byN.get(x).neighbors.add(y); byN.get(y).neighbors.add(x); } }
  }
  units.sort((a, b) => a.name.localeCompare(b.name));
  const byName = new Map(units.map(u => [u.name, u]));
  const lookup = new Map();
  for (const u of units) { lookup.set(normalize(u.name), u); (ALIASES[u.name] || []).forEach(a => lookup.set(normalize(a), u)); }
  // places for Tap mode
  let places;
  if (isWorld) places = window.PLACES.map(p => ({ name: p[0], where: p[1], p: [p[3], p[2]], kind: p[4], units: p[1].split(' / ').map(x => byName.get(x)).filter(Boolean) }));
  else places = [
    ...(window.SUBCAPITALS[id] || []).map(p => ({ name: p[1], where: p[0], p: [p[3], p[2]], kind: 'capital', units: [byName.get(p[0])].filter(Boolean) })),
    ...(window.SUBCITIES[id] || []).map(p => ({ name: p[0], where: p[1], p: [p[3], p[2]], kind: p[4], units: [byName.get(p[1])].filter(Boolean) })),
  ];
  for (const u of units) u.places = places.filter(pl => pl.units.includes(u) && pl.kind !== 'capital').map(pl => pl.name);
  return { id, def, units, byName, lookup, playable: units.filter(u => u.playable), regions, places, isWorld };
}

function pool() { // playable units in current scope
  if (REGION === 'All' || !CUR.regions[REGION]) return CUR.playable;
  const set = new Set(CUR.regions[REGION]);
  return CUR.playable.filter(u => set.has(u.name));
}
// Russia sits in the European regions, so its places east of the Urals are left out of a regional scope.
const PLACE_IN_REGION = { Russia: pl => pl.p[0] < 60 };
function scopedPlaces(kinds) {
  if (REGION === 'All') return CUR.places.filter(pl => kinds[pl.kind]);
  const inScope = new Set(pool().map(u => u.name));
  return CUR.places.filter(pl => kinds[pl.kind] && pl.units.some(u => inScope.has(u.name) && (!CUR.isWorld || !PLACE_IN_REGION[u.name] || PLACE_IN_REGION[u.name](pl))));
}
function findUnit(text) { return CUR.lookup.get(normalize(text)) || null; }
function editDistance(a, b) {
  const m = a.length, n = b.length; if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
// Exact name or alias; else a unique prefix (3+ letters); else a single near-miss spelling. Otherwise up to 3 suggestions.
function resolveUnit(text) {
  const t = normalize(text); if (!t) return { unit: null, suggestions: [] };
  const exact = CUR.lookup.get(t); if (exact) return { unit: exact, suggestions: [] };
  const keys = [...CUR.lookup.keys()];
  if (t.length >= 3) {
    const pre = [...new Set(keys.filter(k => k.startsWith(t) || k.split(' ').some(w => w.startsWith(t))).map(k => CUR.lookup.get(k)))];
    if (pre.length === 1) return { unit: pre[0], suggestions: [] };
    if (pre.length > 1) return { unit: null, suggestions: pre.slice(0, 4) };
  }
  const scored = keys.map(k => ({ u: CUR.lookup.get(k), d: editDistance(t, k) })).filter(x => x.d <= (t.length > 6 ? 3 : 2)).sort((a, b) => a.d - b.d);
  const uniq = [...new Map(scored.map(x => [x.u, x])).values()];
  if (uniq.length && uniq[0].d <= 1 && (uniq.length === 1 || uniq[1].d > 1)) return { unit: uniq[0].u, suggestions: [] };
  return { unit: null, suggestions: uniq.slice(0, 3).map(x => x.u) };
}
function contains(c, pt) { return c.features.some(f => d3.geoContains(f, pt)); }
function unitAt(pt) {
  if (!CUR.isWorld) { const u = CUR.units.find(c => contains(c, pt)); if (u) return u; }
  return WORLD.units.find(c => contains(c, pt)) || null;
}
// Distance between two units: 0 if they share a border, else closest pair of boundary vertices (Globle-style).
const distCache = new Map();
function unitDist(a, b) {
  if (a === b) return 0;
  if (a.neighbors.has(b.name)) return 0;
  const key = a.key < b.key ? a.key + '|' + b.key : b.key + '|' + a.key;
  if (distCache.has(key)) return distCache.get(key);
  let best = Infinity;
  for (const p of a.vertices) for (const q of b.vertices) { const d = haversine(p, q); if (d < best) best = d; }
  distCache.set(key, best); return best;
}
function pointToUnitDist(pt, c) {
  if (contains(c, pt)) return 0;
  let best = Infinity; for (const q of c.vertices) { const d = haversine(pt, q); if (d < best) best = d; }
  return best;
}
function nearestBorderPoint(pt, c) {
  let best = Infinity, bp = c.anchor; for (const q of c.vertices) { const d = haversine(pt, q); if (d < best) { best = d; bp = q; } }
  return bp;
}
function zoomForArea(area) { return Math.max(1, Math.min(12, 0.9 * Math.pow(0.05 / Math.max(area, 1e-7), 0.35))); }
// Zoom that fits a set of units: based on the angular radius of the group around its centroid.
function frameZoom(units, fill = 0.8, trim = false) {
  let set = units.slice();
  let c = d3.geoCentroid({ type: 'MultiPoint', coordinates: set.map(u => u.anchor) });
  if (trim && set.length >= 4) { // drop up to 20% of units whose main landmass sits far from the rest
    for (let k = 0; k < Math.floor(set.length * 0.2); k++) {
      const ds = set.map(u => d3.geoDistance(u.anchor, c)).sort((a, b) => a - b), med = ds[Math.floor(ds.length / 2)];
      let far = null, fd = 0; for (const u of set) { const d = d3.geoDistance(u.anchor, c); if (d > fd) { fd = d; far = u; } }
      if (fd > 2.5 * Math.max(med, 0.02)) { set = set.filter(u => u !== far); c = d3.geoCentroid({ type: 'MultiPoint', coordinates: set.map(u => u.anchor) }); } else break;
    }
  }
  let r = 0;
  for (const u of set) { const vs = trim ? u.pieces.slice(0, 3) : u.vertices; for (const v of vs) r = Math.max(r, d3.geoDistance(c, v)); }
  if (trim) r *= 1.25; // pieces are centres, so pad for the land around them
  return { center: c, zoom: Math.max(1, Math.min(48, fill / Math.max(r, 0.01))) };
}
// Zoom needed so the closest pair of points is at least minPx apart on screen.
// Pairs closer than ~30 km (0.0047 rad) are left to the label dodger; zooming for them would hide everything else.
function separationZoom(points, minPx = 44, ignoreBelow = 0.0047) {
  let minAng = Infinity;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) { const d = d3.geoDistance(points[i], points[j]); if (d >= ignoreBelow) minAng = Math.min(minAng, d); }
  if (!isFinite(minAng) || minAng <= 0) return 1;
  return minPx / (minAng * G.base);
}
// Frame a group, then zoom in further (up to `maxBoost` times) if labelled points would overlap. Centers on the points when given.
function frameWithLabels(units, points, fill = 0.75, maxBoost = 3) {
  const fr = frameZoom(units, fill);
  if (points.length > 1) fr.center = d3.geoCentroid({ type: 'MultiPoint', coordinates: points });
  const sep = separationZoom(points);
  fr.zoom = Math.max(1, Math.min(48, Math.max(fr.zoom, Math.min(sep, fr.zoom * maxBoost))));
  return fr;
}
// Quiet name labels for the other units around a view, so the solution reads like a labelled map.
function contextLabels(center, zoom, exclude, max = 30) {
  const radius = 1.0 / zoom; // roughly the visible angular radius at this zoom (corners reach a little further)
  const out = [];
  for (const u of CUR.units) {
    if (exclude.has(u)) continue;
    const dc = d3.geoDistance(u.anchor, center);
    if (dc < radius * 0.7) { out.push({ u, p: u.anchor }); continue; }
    if (dc > radius + 1.0) continue; // too far for any vertex to be in view
    // Big neighbour whose centre is off-screen: label the middle of the part in view, checked to be inside the unit,
    // so the name never lands on a neighbour or out at sea.
    const seen = (u.labelVerts || u.vertices).filter(v => d3.geoDistance(v, center) < radius * 0.85);
    if (seen.length < 3) continue;
    const mid = d3.geoCentroid({ type: 'MultiPoint', coordinates: seen });
    let p = contains(u, mid) ? mid : null;
    if (!p) { // walk from the visible border point nearest the middle toward the middle until inside
      let near = seen[0], nd = Infinity; for (const v of seen) { const d = d3.geoDistance(v, mid); if (d < nd) { nd = d; near = v; } }
      const step = d3.geoInterpolate(near, mid);
      for (const f of [0.15, 0.3, 0.5, 0.7]) { const q = step(f); if (contains(u, q)) { p = q; break; } }
    }
    if (p && d3.geoDistance(p, center) < radius * 0.9) out.push({ u, p });
  }
  return out.sort((a, b) => b.u.area - a.u.area).slice(0, max).map(x => ({ p: x.p, label: x.u.name, textOnly: true }));
}
// Zoom to frame one unit: by area, but widened for scattered archipelagos and capped for tiny units so nearby land gives context.
function zoomForUnit(u) {
  let z = zoomForArea(u.area);
  let r = 0; for (const v of u.vertices) r = Math.max(r, d3.geoDistance(u.centroid, v));
  if (r > 0) z = Math.min(z, 0.8 / r);
  if (u.area < 3e-5) { // under ~1,200 km²: rings mark it; zoom out until sizeable land is in view for context
    const big = nearestLargeLand(u);
    if (big) z = Math.min(z, 0.75 / Math.max(big.dist, 0.05));
    z = Math.min(z, 5);
  }
  return Math.max(1, z);
}
// Nearest unit with meaningful land area (> ~4,000 km²) and the angular distance to its closest vertex.
function nearestLargeLand(u) {
  let best = null;
  for (const o of CUR.units) {
    if (o === u || o.area < 1e-4) continue;
    if (d3.geoDistance(u.centroid, o.centroid) > 1.2) continue;
    let d = Infinity; for (const v of o.vertices) { const x = d3.geoDistance(u.centroid, v); if (x < d) d = x; }
    if (!best || d < best.dist) best = { unit: o, dist: d };
  }
  return best;
}
function zoomForScope() {
  const units = pool(); if (!units.length) return CUR.def.homeZoom;
  const fc = { type: 'FeatureCollection', features: units.flatMap(u => u.features) };
  return Math.max(1, Math.min(8, zoomForArea(d3.geoArea(fc)) * 0.75));
}
function scopeCenter() {
  const units = pool(); if (!units.length) return CUR.def.home;
  if (REGION === 'All') return CUR.def.home;
  return d3.geoCentroid({ type: 'FeatureCollection', features: units.flatMap(u => u.features) });
}

// ---------- Globe ----------
const canvas = document.getElementById('globe'), ctx = canvas.getContext('2d');
const tip = document.getElementById('tip');
const G = {
  rotate: [-20, -25], zoom: 1, w: 0, h: 0, base: 1,
  fill: () => null, stroke: () => null, markers: [], lines: [], hover: false, onTap: null, hoverName: null,
  projection: d3.geoOrthographic().clipAngle(90).precision(PREC), path: null, graticule: d3.geoGraticule10(), anim: null,
};
G.path = d3.geoPath(G.projection, ctx);

function resize() {
  const wrap = document.getElementById('globe-wrap'), dpr = window.devicePixelRatio || 1;
  G.w = wrap.clientWidth; G.h = wrap.clientHeight;
  canvas.width = G.w * dpr; canvas.height = G.h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  G.base = Math.min(G.w, G.h) / 2 - 12;
  render();
}
const geomOf = c => G.coarse ? c.featuresCoarse : (G.zoom >= 8 ? c.features : c.featuresDraw);
function drawUnits(units, fallback) {
  for (const c of units) {
    const f = G.fill(c) || fallback;
    ctx.beginPath(); geomOf(c).forEach(ft => G.path(ft)); ctx.fillStyle = f; ctx.fill();
  }
}
function strokeUnits(units, color, width) {
  ctx.beginPath(); for (const c of units) geomOf(c).forEach(ft => G.path(ft));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
let fullTimer = null;
function renderCoarse() { // quick frame now, full-detail frame once input settles
  G.coarse = true; render();
  if (fullTimer) clearTimeout(fullTimer);
  fullTimer = setTimeout(() => { G.coarse = false; render(); }, 160);
}
function render() {
  if (!G.w || !WORLD) return;
  G.projection.rotate(G.rotate).scale(G.base * G.zoom).translate([G.w / 2, G.h / 2]);
  ctx.clearRect(0, 0, G.w, G.h);
  const land = cssVar('--land'), border = cssVar('--border'), landAlt = cssVar('--land-alt');
  ctx.beginPath(); G.path({ type: 'Sphere' }); ctx.fillStyle = cssVar('--ocean'); ctx.fill();
  ctx.beginPath(); G.path(G.graticule); ctx.strokeStyle = cssVar('--grat'); ctx.lineWidth = 1; ctx.stroke();
  drawUnits(WORLD.units, land);
  strokeUnits(WORLD.units, border, 0.6);
  if (!CUR.isWorld) { drawUnits(CUR.units, landAlt); strokeUnits(CUR.units, border, 0.8); }
  for (const c of CUR.units) {
    const s = G.stroke(c); if (!s) continue;
    ctx.beginPath(); geomOf(c).forEach(ft => G.path(ft)); ctx.strokeStyle = s; ctx.lineWidth = 2; ctx.stroke();
  }
  // Highlighted units too small to see at this zoom (atolls, microstates) get a ring around each island group.
  const pxScale = (G.base * G.zoom) ** 2, center0 = [-G.rotate[0], -G.rotate[1]];
  for (const c of CUR.units) {
    const f = G.fill(c); if (!f || c.area * pxScale > 600) continue;
    let n = 0;
    for (const pt of c.pieces) {
      if (n++ > 40) break;
      if (d3.geoDistance(pt, center0) > Math.PI / 2 - 0.02) continue;
      const [x, y] = G.projection(pt);
      ctx.beginPath(); ctx.arc(x, y, 11, 0, 2 * Math.PI); ctx.strokeStyle = f; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fillStyle = f; ctx.fill();
    }
  }
  if (G.hoverName && G.hover) {
    const c = CUR.byName.get(G.hoverName) || WORLD.byName.get(G.hoverName);
    if (c) { ctx.beginPath(); geomOf(c).forEach(ft => G.path(ft)); ctx.strokeStyle = cssVar('--accent'); ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  for (const l of G.lines) {
    ctx.beginPath(); G.path({ type: 'LineString', coordinates: [l.a, l.b] });
    ctx.strokeStyle = l.color || cssVar('--text'); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
  }
  const center = [-G.rotate[0], -G.rotate[1]];
  const placed = []; // label rectangles already drawn, to dodge overlaps
  const hits = r => placed.some(q => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h);
  for (const m of G.markers) {
    if (d3.geoDistance(m.p, center) > Math.PI / 2 - 0.02) continue;
    const [x, y] = G.projection(m.p);
    if (m.textOnly) { // quiet context label, centred on the point, dropped if it would collide
      ctx.font = '500 11px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const lx = x, ly = y;
      const tw = ctx.measureText(m.label).width, w = tw + 6, h = 15, r = { x: lx - w / 2, y: ly - h / 2, w, h };
      if (!hits(r)) { placed.push(r); ctx.fillStyle = cssVar('--panel-faint'); ctx.fillRect(r.x, r.y, w, h); ctx.fillStyle = cssVar('--muted'); ctx.fillText(m.label, lx, ly); }
      ctx.textAlign = 'start'; continue;
    }
    if (m.pulse) { // a ring that expands and fades for 0.8s, so a just-placed marker is easy to spot
      const t = (performance.now() - m.pulse) / 800;
      if (t < 1) { ctx.beginPath(); ctx.arc(x, y, (m.r || 6) + 4 + t * 16, 0, 2 * Math.PI); ctx.globalAlpha = 1 - t; ctx.strokeStyle = m.color; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1; }
    }
    ctx.beginPath(); ctx.arc(x, y, m.r || 6, 0, 2 * Math.PI); ctx.fillStyle = m.color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    if (m.label) {
      ctx.font = '600 12px system-ui, sans-serif'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(m.label).width, w = tw + 8, h = 18;
      const candidates = [{ x: x + 9, y: y - 9 }, { x: x - 9 - w, y: y - 9 }, { x: x - w / 2, y: y + 10 }, { x: x - w / 2, y: y - 10 - h }];
      const fits = c => c.x >= 2 && c.y >= 2 && c.x + w <= G.w - 2 && c.y + h <= G.h - 2;
      let r = candidates.find(c => fits(c) && !hits({ x: c.x, y: c.y, w, h })) || candidates.find(fits) || candidates[0];
      r = { x: r.x, y: r.y, w, h }; placed.push(r);
      ctx.fillStyle = cssVar('--panel'); ctx.fillRect(r.x, r.y, w, h);
      ctx.fillStyle = cssVar('--text'); ctx.fillText(m.label, r.x + 4, r.y + h / 2);
    }
  }
  if (LABELS.level > 0 && labelsAllowed() && !G.coarse) drawLearningLabels(center, placed, hits);
  ctx.beginPath(); G.path({ type: 'Sphere' }); ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke();
}
// ---------- Zooming about a fixed screen point ----------
// Rotation that puts geographic point p at screen point (sx, sy) at the given zoom (Newton steps, numeric Jacobian).
function rotationFor(p, sx, sy, zoom, r0) {
  const pr = d3.geoOrthographic().clipAngle(90).precision(PREC).scale(G.base * zoom).translate([G.w / 2, G.h / 2]);
  const at = r => { pr.rotate(r); const xy = pr(p); return xy ? [xy[0] - sx, xy[1] - sy] : null; };
  let r = r0.slice();
  for (let i = 0; i < 12; i++) {
    const e = at(r); if (!e) return null;
    if (Math.hypot(e[0], e[1]) < 0.05) break;
    const h = 0.01, ea = at([r[0] + h, r[1]]), eb = at([r[0], r[1] + h]); if (!ea || !eb) return null;
    const a = (ea[0] - e[0]) / h, c = (ea[1] - e[1]) / h, b = (eb[0] - e[0]) / h, d = (eb[1] - e[1]) / h, det = a * d - b * c;
    if (!det) return null;
    r = [r[0] - (d * e[0] - b * e[1]) / det, Math.max(-89, Math.min(89, r[1] - (-c * e[0] + a * e[1]) / det))];
  }
  const e = at(r); if (!e || Math.hypot(e[0], e[1]) > 0.5) return null;
  if (d3.geoDistance(p, [-r[0], -r[1]]) > Math.PI / 2 - 0.05) return null;
  return r;
}
// A zoom (and matching rotation) that keeps the tap at its screen spot and shows the answer clearly apart from it.
function anchoredView(p, sp, target, dir) {
  const fits = (r, z) => {
    const pr = d3.geoOrthographic().clipAngle(90).scale(G.base * z).translate([G.w / 2, G.h / 2]).rotate(r);
    if (d3.geoDistance(target, [-r[0], -r[1]]) > Math.PI / 2 - 0.08) return false;
    const t = pr(target), m = 40;
    if (!t || t[0] < m || t[1] < m || t[0] > G.w - m || t[1] > G.h - m) return false;
    return Math.hypot(t[0] - sp[0], t[1] - sp[1]) >= 40;
  };
  const zs = [];
  if (dir === 'out') for (let z = G.zoom / 1.25; z > 0.95; z /= 1.25) zs.push(z);
  else for (let z = G.zoom * 1.4; z <= 48; z *= 1.4) zs.push(z);
  if (dir === 'out' && G.zoom > 1) zs.push(1);
  let r = G.rotate.slice();
  for (const z of zs) {
    const rr = rotationFor(p, sp[0], sp[1], z, r); if (!rr) continue;
    r = rr;
    if (fits(rr, z)) return { zoom: z, rotate: rr };
  }
  return null;
}
// Animate the zoom while the tapped point stays pinned under the finger.
function zoomAbout(p, sp, z1, ms = 750) {
  if (G.anim) G.anim.stop();
  const z0 = G.zoom, ease = d3.easeCubicInOut;
  G.anim = d3.timer(el => {
    const t = Math.min(1, el / ms), z = z0 * Math.pow(z1 / z0, ease(t));
    const r = rotationFor(p, sp[0], sp[1], z, G.rotate); if (r) G.rotate = r;
    G.zoom = z;
    if (t >= 1) { G.anim.stop(); G.anim = null; G.coarse = false; render(); } else { G.coarse = true; render(); }
  });
}
let pulseTimer = null, revealTimer = null;
function pulseMarkers() { if (pulseTimer) pulseTimer.stop(); pulseTimer = d3.timer(el => { render(); if (el > 850) { pulseTimer.stop(); pulseTimer = null; } }); }
function flyTo(lonlat, zoom, ms = 900) {
  if (G.anim) G.anim.stop();
  const from = G.rotate.slice(), fz = G.zoom, tz = zoom == null ? G.zoom : zoom;
  const to = [-lonlat[0], -lonlat[1]];
  let dl = to[0] - from[0]; while (dl > 180) dl -= 360; while (dl < -180) dl += 360;
  const ease = d3.easeCubicInOut;
  G.anim = d3.timer(el => {
    const t = Math.min(1, el / ms), e = ease(t);
    G.rotate = [from[0] + dl * e, from[1] + (to[1] - from[1]) * e];
    G.zoom = fz + (tz - fz) * e;
    if (t >= 1) { G.anim.stop(); G.anim = null; G.coarse = false; render(); }
    else { G.coarse = true; render(); }
  });
}
// ---------- Hash router: every view and every Tap round / Hot & Cold game has a shareable link ----------
// Routes: #/<mode>/<level>[/<region>][?params]   e.g. #/tap/brazil, #/hotcold/world/caribbean?t=…, #/study/india/south?u=kerala
//         #/train[/<programme>]   #/stats/<level>
const MODE_SLUG = { train: 'train', study: 'study', explore: 'explore', tap: 'tap', globle: 'hotcold', neighbors: 'borders', closer: 'closer', nameit: 'nameit', flags: 'flags', clues: 'clues', stats: 'stats' };
const SLUG_MODE = Object.fromEntries(Object.entries(MODE_SLUG).map(([k, v]) => [v, k]));
const slugify = t => normalize(t).replace(/ /g, '-');
let ROUTE = {};        // params from the link being opened, consumed by the mode that starts
let ROUTING = false;   // true while applying a link, so the address bar keeps its parameters
const b64raw = t => atob(t.replace(/-/g, '+').replace(/_/g, '/'));
const KEY = [103, 101, 111, 100, 114, 105, 108, 108];
// Answers travel by name (stable across browsers), scrambled so a base64 decoder does not reveal them. Not security, just
// spoiler protection. New codes start with '.', which base64 never uses; older plain-base64 links still open.
function enc(t) { const b = new TextEncoder().encode(t).map((x, i) => x ^ KEY[i % KEY.length]); return '.' + btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function dec(code) {
  if (code.startsWith('.')) return new TextDecoder().decode(Uint8Array.from(b64raw(code.slice(1)), (c, i) => c.charCodeAt(0) ^ KEY[i % KEY.length]));
  return new TextDecoder().decode(Uint8Array.from(b64raw(code), c => c.charCodeAt(0)));
}
function encodePlan(plan) { return enc(plan.map(q => q.kind === 'unit' ? 'u:' + q.c.name : 'p:' + q.pl.name).join('\n')); }
function decodePlan(code) {
  try {
    const plan = dec(code).split('\n').map(tok => {
      const name = tok.slice(2);
      if (tok.startsWith('u:')) { const c = CUR.byName.get(name); return c ? { kind: 'unit', c } : null; }
      const pl = CUR.places.find(x => x.name === name); return pl ? { kind: 'place', pl } : null;
    });
    return plan.length === 5 && plan.every(Boolean) ? plan : null;
  } catch (e) { return null; }
}
function encodeUnit(u) { return enc(u.name); }
function decodeUnit(code) { try { return CUR.byName.get(dec(code)) || null; } catch (e) { return null; } }
function routePath() {
  if (TRAIN.active) return `/train/${TRAIN.program}`;
  if (mode === 'train') return '/train';
  const parts = ['', MODE_SLUG[mode] || 'study', CUR.id];
  if (REGION !== 'All') parts.push(slugify(REGION));
  return parts.join('/');
}
function syncHash() { // a new view gets a new history entry, without game parameters
  if (ROUTING || !CUR) return;
  const h = '#' + routePath();
  if (location.hash.split('?')[0] !== h) history.pushState(null, '', h);
}
function cleanHash() { if (!ROUTING && CUR) history.replaceState(null, '', '#' + routePath()); }
function focusHash(u) { if (!ROUTING && CUR && !TRAIN.active) history.replaceState(null, '', '#' + routePath() + '?u=' + slugify(u.name)); }
async function applyRoute(hash) {
  let raw = (hash || '').replace(/^#/, '');
  try { raw = decodeURIComponent(raw); } catch (e) {}
  if (!raw.startsWith('/')) return false;
  const qi = raw.indexOf('?'), path = (qi < 0 ? raw : raw.slice(0, qi)).toLowerCase(), query = qi < 0 ? '' : raw.slice(qi + 1);
  const seg = path.split('/').filter(Boolean), qp = new URLSearchParams(query);
  const m = SLUG_MODE[seg[0]]; if (!m) return false;
  stashView();
  ROUTING = true;
  try {
    trainStop(true);
    if (m === 'train') {
      if (seg[1] && PROGRAMS[seg[1]]) {
        ROUTING = false;
        trainChoose(seg[1]);
      } else await setLevel(CUR.id, REGION, 'train');
      return true;
    }
    const lv = LEVEL_DEFS[seg[1]] ? seg[1] : 'world';
    const L = await loadLevel(lv);
    const region = seg[2] ? Object.keys(L.regions).find(r => slugify(r) === seg[2]) : null;
    ROUTE = { q: qp.get('q'), s: qp.get('s'), t: qp.get('t'), g: qp.get('g') };
    await setLevel(lv, region || 'All', m);
    const u = qp.get('u') && L.units.find(x => slugify(x.name) === qp.get('u'));
    if (u && S.focus) S.focus(u);
    return true;
  } finally {
    ROUTING = false; ROUTE = {};
    // Show the address of what actually opened: unknown levels, regions or programmes fall back, and the bar says so.
    const keep = new URLSearchParams(); const qp = new URLSearchParams(location.hash.split('?')[1] || '');
    for (const k of ['q', 's', 't', 'g', 'u']) if (qp.get(k)) keep.set(k, qp.get(k));
    const want = '#' + routePath() + (keep.toString() && mode !== 'train' ? '?' + keep : '');
    if (CUR && location.hash !== want) history.replaceState(null, '', want);
  }
}
window.addEventListener('popstate', async () => {
  const [path, query] = location.hash.replace(/^#/, '').split('?');
  if (path === routePath() && !query) return; // already showing this view
  if (!(await applyRoute(location.hash)) && CUR) history.replaceState(null, '', '#' + routePath()); // unknown address: keep the current view and its address
});
// ---------- Leaving and coming back ----------
// A Tap round, Hot & Cold game or training set in progress is kept when you leave it (Back, a mode button, a level
// change), and picks up where it was when you return to the same address.
const SNAP = new Map(); let stashedS = null;
function inProgress(allowTrain) {
  if (TRAIN.active) return allowTrain;
  if (mode === 'tap') return !!(S.plan && !S.roundDone);
  if (mode === 'globle') return !!(S.target && !S.done);
  return false;
}
function stashView(allowTrain = false) {
  if (!CUR || !mode || S === stashedS || !inProgress(allowTrain)) return;
  const frag = document.createDocumentFragment(); while (panel.firstChild) frag.appendChild(panel.firstChild);
  SNAP.set(routePath(), { mode, S, frag, train: TRAIN.active ? { ...TRAIN } : null, level: CUR.id, region: REGION,
    G: { fill: G.fill, stroke: G.stroke, markers: G.markers, lines: G.lines, onTap: G.onTap, hover: G.hover, rotate: G.rotate.slice(), zoom: G.zoom, tap: canvas.classList.contains('tap') } });
  stashedS = S;
  if (SNAP.size > 8) SNAP.delete(SNAP.keys().next().value);
}
// A shared link only resumes a stashed game if it is the same game.
function snapMatchesRoute(s) {
  if (ROUTE.q) return !!(s.S.plan && encodePlan(s.S.plan) === ROUTE.q);
  if (ROUTE.t) return !!(s.S.target && encodeUnit(s.S.target) === ROUTE.t);
  return true;
}
function restoreView(key) {
  const s = SNAP.get(key); if (!s || !LEVELS[s.level] || !snapMatchesRoute(s)) return false;
  SNAP.delete(key);
  if (tourTimer) { clearInterval(tourTimer); tourTimer = null; }
  if (G.anim) { G.anim.stop(); G.anim = null; }
  if (CUR !== LEVELS[s.level] || REGION !== s.region) { CUR = LEVELS[s.level]; REGION = s.region; levelSel.value = CUR.id; fillRegionSelect(); distCache.clear(); }
  mode = s.mode; S = s.S; stashedS = null;
  if (s.train) Object.assign(TRAIN, s.train);
  Object.assign(G, { fill: s.G.fill, stroke: s.G.stroke, markers: s.G.markers, lines: s.G.lines, onTap: s.G.onTap, hover: s.G.hover, rotate: s.G.rotate, zoom: s.G.zoom, hoverName: null });
  canvas.classList.toggle('tap', s.G.tap); tip.style.display = 'none';
  panel.replaceChildren(s.frag);
  [...nav.children].forEach(b => b.classList.toggle('on', b.dataset.id === mode));
  updateLabelButton(); trainBar(); syncHash(); render();
  return true;
}
function toast(text) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
async function shareLink() {
  const params = new URLSearchParams();
  let text = `GeoDrill · ${(MODES.find(x => x[0] === mode) || ['', 'Train'])[1]} · ${scopeLabel()}`;
  if (mode === 'tap' && S.plan && !TRAIN.active) {
    params.set('q', encodePlan(S.plan));
    const finished = S.roundDone || (S.round && S.round.length >= S.n && S.answered);
    const tot = S.round ? S.round.reduce((a, r) => a + r.score, 0) : 0;
    if (finished) { params.set('s', String(tot)); text = `I scored ${tot}/500 on a GeoDrill placement round (${scopeLabel()}). Can you beat it?`; }
    else text = `Try this GeoDrill placement round (${scopeLabel()}): same five places for both of us.`;
  } else if (mode === 'globle' && S.target && !TRAIN.active) {
    params.set('t', encodeUnit(S.target));
    if (S.done && S.won) { params.set('g', String(S.guesses.length)); text = `I found the hidden ${CUR.def.unit} in ${S.guesses.length} guesses on GeoDrill. Your turn:`; }
    else text = `Find the hidden ${CUR.def.unit} on GeoDrill (${scopeLabel()}):`;
  } else if ((mode === 'study' || mode === 'explore') && S.focused) {
    params.set('u', slugify(S.focused.name)); text = `${S.focused.name} on GeoDrill`;
  }
  const url = location.origin + location.pathname + '#' + routePath() + (params.toString() ? '?' + params : '');
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: 'GeoDrill', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); }
  catch (e) { window.prompt('Copy this link:', url); }
}
document.getElementById('sharebtn').onclick = () => shareLink();

// ---------- Learning labels: names (and optionally cities) for everything in view ----------
const LABELS = { level: 0 }; // 0 off, 1 names, 2 names + cities and capitals
try { LABELS.level = +(localStorage.getItem('geodrill.labels') || 0) || 0; } catch (e) {}
const LABEL_MODES = new Set(['study', 'explore']); // learning views only, so drills are never given away
function labelsAllowed() { return LABEL_MODES.has(mode); }
function byAreaDesc(units) { return units.__sorted || (units.__sorted = units.slice().sort((a, b) => b.area - a.area)); }
function drawLearningLabels(center, placed, hits) {
  const vis = p => d3.geoDistance(p, center) < Math.PI / 2 - 0.06;
  const drawn = new Set(G.markers.filter(m => m.label).map(m => m.label));
  const onScreen = r => r.x >= 0 && r.y >= 0 && r.x + r.w <= G.w && r.y + r.h <= G.h;
  const strong = cssVar('--text'), muted = cssVar('--muted'), bg = cssVar('--panel-faint');
  const over = (a, q) => a.x < q.x + q.w && q.x < a.x + a.w && a.y < q.y + q.h && q.y < a.y + a.h;
  // With capitals showing, unit names keep clear of every capital's dot so capitals are never hidden.
  const capDots = LABELS.level >= 2 ? CUR.places.filter(pl => pl.kind === 'capital' && vis(pl.p)).map(pl => { const [cx, cy] = G.projection(pl.p); return { x: cx - 5, y: cy - 5, w: 10, h: 10 }; }) : [];
  // A unit name goes on its main landmass; if that spot is taken it may shift up or down, as long as it stays inside the unit.
  const putUnit = (u, font, color) => {
    const [x, y] = G.projection(u.anchor);
    ctx.font = font; const w = ctx.measureText(u.name).width + 6, h = 15;
    for (const [dx, dy] of [[0, 0], [0, -13], [0, 13], [-w / 3, 0], [w / 3, 0], [0, -25], [0, 25], [-w / 3, -13], [w / 3, 13], [-w / 3, 13], [w / 3, -13]]) {
      const r = { x: x + dx - w / 2, y: y + dy - h / 2, w, h };
      if (!onScreen(r) || hits(r) || capDots.some(q => over(r, q))) continue;
      if (dx || dy) { const q = invert(x + dx, y + dy); if (!q || !contains(u, q)) continue; }
      placed.push(r); ctx.fillStyle = bg; ctx.fillRect(r.x, r.y, w, h);
      ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(u.name, x + dx, y + dy); ctx.textAlign = 'start';
      return true;
    }
    return false;
  };
  // A place gets a dot and a label to its right, left, above or below, whichever is free.
  const drawPlaces = kinds => {
    for (const pl of CUR.places) {
      if (!kinds.includes(pl.kind) || !vis(pl.p)) continue;
      const [x, y] = G.projection(pl.p);
      if (x < 0 || y < 0 || x > G.w || y > G.h) continue;
      const dot = { x: x - 4, y: y - 4, w: 8, h: 8 };
      if (hits(dot)) continue;
      const font = pl.kind === 'capital' ? '600 11px system-ui, sans-serif' : '500 10.5px system-ui, sans-serif';
      ctx.font = font; const w = ctx.measureText(pl.name).width + 6, h = 15;
      const r = [{ x: x + 5, y: y - 7.5 }, { x: x - 5 - w, y: y - 7.5 }, { x: x - w / 2, y: y - 6 - h }, { x: x - w / 2, y: y + 6 }]
        .map(c => ({ ...c, w, h })).find(c => onScreen(c) && !hits(c));
      if (!r) continue;
      placed.push(r, dot);
      ctx.beginPath(); ctx.arc(x, y, pl.kind === 'capital' ? 3.5 : 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = pl.kind === 'capital' ? cssVar('--bad') : pl.kind === 'landmark' ? cssVar('--warn') : strong; ctx.fill();
      ctx.fillStyle = bg; ctx.fillRect(r.x, r.y, w, h); ctx.fillStyle = pl.kind === 'capital' ? strong : muted;
      ctx.textBaseline = 'middle'; ctx.fillText(pl.name, r.x + 3, r.y + h / 2);
    }
  };
  // Priority: unit names (largest first, so small ones appear as you zoom in), then capitals, then other cities and landmarks.
  for (const u of byAreaDesc(CUR.units)) {
    if (drawn.has(u.name) || !vis(u.anchor)) continue;
    putUnit(u, '600 11.5px system-ui, sans-serif', strong);
  }
  if (LABELS.level >= 2) { drawPlaces(['capital']); drawPlaces(['city', 'landmark']); }
  // On a sub-national level, also name the surrounding countries in a quieter style.
  if (!CUR.isWorld) for (const u of byAreaDesc(WORLD.units)) {
    if (u.name === CUR.def.parent || drawn.has(u.name) || !vis(u.anchor)) continue;
    putUnit(u, '500 10.5px system-ui, sans-serif', muted);
  }
}
function updateLabelButton() {
  const b = document.getElementById('lbl'); if (!b) return;
  b.style.display = labelsAllowed() ? '' : 'none';
  b.classList.toggle('on', LABELS.level > 0);
  b.textContent = LABELS.level === 2 ? 'Aa•' : 'Aa';
  const next = LABELS.level === 0 ? 'Show names' : LABELS.level === 1 ? 'Show names, capitals and cities' : 'Hide labels';
  const now = LABELS.level === 0 ? 'off' : LABELS.level === 1 ? 'names' : 'names, capitals and cities';
  b.title = next; b.setAttribute('aria-label', `Map labels: ${now}. Press to ${next.toLowerCase()}.`); b.removeAttribute('aria-pressed');
}
document.getElementById('lbl').onclick = () => {
  LABELS.level = (LABELS.level + 1) % 3;
  try { localStorage.setItem('geodrill.labels', String(LABELS.level)); } catch (e) {}
  updateLabelButton(); render();
};
function flyHome() {
  if (REGION === 'All' || !pool().length) return flyTo(CUR.def.home, CUR.def.homeZoom);
  const fr = frameZoom(pool(), 0.8, true);
  flyTo(fr.center, Math.max(CUR.def.homeZoom, fr.zoom));
}
function invert(x, y) {
  const p = G.projection.invert([x, y]);
  if (!p || isNaN(p[0])) return null;
  const back = G.projection(p); if (!back || Math.hypot(back[0] - x, back[1] - y) > 1) return null;
  return p;
}
let down = null, moved = false;
const pointers = new Map(); let pinch = null; // two-finger zoom state
canvas.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  if (G.anim) { G.anim.stop(); G.anim = null; }
  clearTimeout(revealTimer);
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: G.zoom }; down = null; moved = true; return; }
  down = { x: e.clientX, y: e.clientY, r: G.rotate.slice() }; moved = false;
});
canvas.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch.d0 > 0) setZoom(pinch.z0 * d / pinch.d0);
    return;
  }
  if (down) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!moved && Math.hypot(dx, dy) <= (e.pointerType === 'mouse' ? 4 : 10)) return; // a tap that wobbles a little stays a tap
    moved = true;
    const k = 90 / (G.base * G.zoom);
    G.rotate = [down.r[0] + dx * k, Math.max(-90, Math.min(90, down.r[1] - dy * k))];
    renderCoarse(); tip.style.display = 'none';
  } else if (G.hover) {
    const rect = canvas.getBoundingClientRect();
    const p = invert(e.clientX - rect.left, e.clientY - rect.top);
    const c = p ? unitAt(p) : null;
    const name = c ? c.name : null;
    if (name !== G.hoverName) { G.hoverName = name; render(); }
    if (c) { tip.textContent = c.name + (c.capital ? ' · ' + c.capital : ''); tip.style.display = 'block'; tip.style.left = (e.clientX - rect.left) + 'px'; tip.style.top = (e.clientY - rect.top) + 'px'; }
    else tip.style.display = 'none';
  }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 0) down = null;
}
canvas.addEventListener('pointerup', e => {
  if (down && !moved && G.onTap && !pinch) {
    const rect = canvas.getBoundingClientRect();
    const p = invert(e.clientX - rect.left, e.clientY - rect.top);
    if (p) G.onTap(p);
  }
  endPointer(e);
});
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { if (!down) { tip.style.display = 'none'; if (G.hoverName) { G.hoverName = null; render(); } } });
canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(G.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
function setZoom(z) { clearTimeout(revealTimer); G.zoom = Math.max(0.6, Math.min(48, z)); renderCoarse(); }
document.getElementById('zin').onclick = () => setZoom(G.zoom * 1.4);
document.getElementById('zout').onclick = () => setZoom(G.zoom / 1.4);
document.getElementById('zreset').onclick = flyHome;
window.addEventListener('resize', resize);
function resetGlobe() {
  clearTimeout(revealTimer);
  G.fill = () => null; G.stroke = () => null; G.markers = []; G.lines = []; G.onTap = null; G.hover = false; G.hoverName = null;
  canvas.classList.remove('tap'); tip.style.display = 'none';
  const side = document.getElementById('side'); if (side) side.scrollTop = 0; // each new question starts at the top of the panel
  render(); // clear the previous answer's highlight immediately, even in modes that do not fly the globe
}

// ---------- Globle colour scale ----------
const globleColorWorld = d3.scaleLinear().domain([0, 400, 1200, 3000, 6000, 10000, 15000])
  .range(['#8b0000', '#d7301f', '#fc8d59', '#fdcc8a', '#fef0c6', '#f7f4e9', '#eceae4']).clamp(true);
const globleColorSub = d3.scaleLinear().domain([0, 100, 300, 800, 1500, 2500, 4000])
  .range(['#8b0000', '#d7301f', '#fc8d59', '#fdcc8a', '#fef0c6', '#f7f4e9', '#eceae4']).clamp(true);
const globleColor = d => (CUR.isWorld ? globleColorWorld : globleColorSub)(d);

// ---------- Scope controls ----------
const levelSel = document.getElementById('level'), regionSel = document.getElementById('region');
for (const [id, def] of Object.entries(LEVEL_DEFS)) { const o = document.createElement('option'); o.value = id; o.textContent = def.label; levelSel.appendChild(o); }
function fillRegionSelect() {
  regionSel.innerHTML = '<option value="All">All regions</option>';
  const add = (label, keys) => { if (!keys.length) return; const og = document.createElement('optgroup'); og.label = label; keys.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = k; og.appendChild(o); }); regionSel.appendChild(og); };
  if (CUR.isWorld) { add('Continents', Object.keys(window.WORLD_CONTINENTS).filter(k => k !== 'Antarctica')); add('Study regions', Object.keys(window.WORLD_REGIONS)); }
  else add('Regions', Object.keys(CUR.regions));
  regionSel.value = REGION; regionSel.disabled = regionSel.options.length <= 1;
  updateScopeBtn();
}
async function loadLevel(id) {
  if (LEVELS[id]) return LEVELS[id];
  const def = LEVEL_DEFS[id];
  let topo;
  try { const r = await fetch(def.url); if (!r.ok) throw 0; topo = await r.json(); }
  catch (e) { if (id !== 'world') throw e; const r = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json'); topo = await r.json(); }
  LEVELS[id] = buildLevel(id, topo);
  return LEVELS[id];
}
async function setLevel(id, region = 'All', modeId = null) {
  stashView();
  document.getElementById('loading').style.display = 'flex';
  CUR = await loadLevel(id); REGION = region;
  document.getElementById('loading').style.display = 'none';
  levelSel.value = id; fillRegionSelect();
  distCache.clear();
  const next = modeId || mode || 'study';
  if (next === 'stats') return openStats(); // stats is a view, not a mode: re-open it for the new level
  flyHome(); // modes that frame their own target (Name It, Borders) fly after this and win
  setMode(next);
}
// Picking a level or region by hand from the Train screen means "let me study this": open the study guide.
levelSel.onchange = () => { stashView(); trainStop(true); setLevel(levelSel.value, 'All', mode === 'train' ? 'study' : null); };
regionSel.onchange = () => { stashView(); trainStop(true); REGION = regionSel.value; if (mode === 'stats') return openStats(); flyHome(); setMode(mode === 'train' ? 'study' : mode); };
function scopeLabel() { return (REGION === 'All' ? CUR.def.label.split(' · ')[0] : REGION); }

// ---------- Region picker: a map of the level, coloured by region; tap a region to practise it ----------
const picker = document.getElementById('picker'), scopeBtn = document.getElementById('scopebtn');
const PK_COLORS = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#76b7b2', '#edc948', '#b07aa1', '#ff9da7', '#9c755f'];
const lvName = id => LEVEL_DEFS[id].label.split(' · ')[0];
let PK = null; // picker state while open
function updateScopeBtn() {
  if (!CUR) return;
  const lv = lvName(CUR.id);
  scopeBtn.innerHTML = `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M1 3.5l4.5-2 5 2 4.5-2v11l-4.5 2-5-2-4.5 2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 1.5v11M10.5 3.5v11" stroke="currentColor" stroke-width="1.4"/></svg><span class="sb-t"><b>${esc(lv)}</b>${REGION === 'All' ? '' : ' · ' + esc(REGION)}</span><span aria-hidden="true">▾</span>`;
  scopeBtn.setAttribute('aria-label', `Region: ${lv}${REGION === 'All' ? '' : ', ' + REGION}. Change region`);
}
scopeBtn.onclick = () => openPicker();
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pick]'); if (b) { e.preventDefault(); openPicker(); } });
function openPicker() {
  if (!CUR) return;
  PK = { level: CUR.id, layer: CUR.isWorld && window.WORLD_REGIONS[REGION] ? 'study' : 'continents', back: document.activeElement };
  picker.hidden = false; document.body.classList.add('picking');
  drawPicker(); picker.querySelector('.pk-close').focus();
}
function closePicker() {
  if (!PK) return; const back = PK.back; PK = null;
  picker.hidden = true; document.body.classList.remove('picking');
  if (back && back.focus) back.focus();
}
// Switch level and/or region by hand: same effect as the old dropdowns. From Train, it opens the study guide.
function applyScope(level, region) {
  stashView(); trainStop(true);
  const next = mode === 'train' ? 'study' : null;
  if (level !== CUR.id) return setLevel(level, region, next);
  REGION = region; fillRegionSelect();
  if (mode === 'stats') return openStats();
  flyHome(); setMode(next || mode);
}
function pickerChoose(i) {
  const P = PK; if (!P || !P.regs) return;
  const level = P.level, region = i < 0 || P.regs[i].name === 'All' ? 'All' : P.regs[i].name;
  closePicker();
  if (level === CUR.id && region === REGION && mode !== 'train') return;
  applyScope(level, region);
}
function pickerProjection(L) {
  if (L.isWorld) return d3.geoNaturalEarth1();
  if (L.id === 'usa') return d3.geoAlbersUsa();
  if (L.id === 'canada') return d3.geoConicConformal().parallels([49, 77]).rotate([96, 0]);
  if (L.id === 'russia') return d3.geoConicEqualArea().parallels([52, 72]).rotate([-100, 0]);
  return d3.geoMercator().rotate([-L.def.home[0], 0]);
}
function pickerRegions(L, layer) {
  const names = !L.isWorld ? Object.keys(L.regions)
    : layer === 'study' ? Object.keys(window.WORLD_REGIONS) : Object.keys(window.WORLD_CONTINENTS).filter(k => k !== 'Antarctica');
  const regs = names.map(n => ({ name: n, set: new Set(L.regions[n].filter(x => L.byName.has(x))) })).filter(r => r.set.size);
  // A level without regional groups is one big region: the whole level.
  return regs.length ? regs : [{ name: 'All', set: new Set(L.units.map(u => u.name)) }];
}
// Neighbouring regions get different colours (greedy colouring of the region adjacency graph).
function colorRegions(L, regs) {
  const of = new Map();
  regs.forEach((r, i) => r.set.forEach(n => { if (!of.has(n)) of.set(n, []); of.get(n).push(i); }));
  const adj = regs.map(() => new Set());
  regs.forEach((r, i) => r.set.forEach(n => {
    for (const j of of.get(n) || []) if (j !== i) adj[i].add(j);
    const u = L.byName.get(n); if (u) for (const m of u.neighbors) for (const j of of.get(m) || []) if (j !== i) adj[i].add(j);
  }));
  if (regs.length <= PK_COLORS.length) return { of, col: regs.map((_, i) => i) }; // few regions: every one its own colour
  const col = [], uses = PK_COLORS.map(() => 0);
  for (const i of regs.map((_, i) => i).sort((a, b) => adj[b].size - adj[a].size)) {
    const used = new Set([...adj[i]].map(j => col[j]));
    const free = PK_COLORS.map((_, c) => c).filter(c => !used.has(c));
    const c = (free.length ? free : PK_COLORS.map((_, c) => c)).sort((a, b) => uses[a] - uses[b])[0]; // least-used free colour
    col[i] = c; uses[c]++;
  }
  return { of, col };
}
async function drawPicker() {
  const P = PK; if (!P) return;
  const tok = P.tok = {};
  const lvEl = picker.querySelector('.pk-levels'), lyEl = picker.querySelector('.pk-layers'), mapEl = picker.querySelector('.pk-map'),
    info = picker.querySelector('.pk-info'), chips = picker.querySelector('.pk-chips');
  lvEl.innerHTML = Object.keys(LEVEL_DEFS).map(k => `<button class="chip${k === P.level ? ' on' : ''}" data-lv="${k}" aria-pressed="${k === P.level}">${esc(lvName(k))}</button>`).join('');
  let L = LEVELS[P.level];
  if (!L) {
    mapEl.innerHTML = '<div class="pk-wait">Loading map…</div>'; lyEl.innerHTML = chips.innerHTML = info.innerHTML = ''; P.regs = null;
    try { L = await loadLevel(P.level); } catch (e) { if (PK === P && P.tok === tok) mapEl.innerHTML = '<div class="pk-wait">Could not load this map. Check your connection.</div>'; return; }
    if (PK !== P || P.tok !== tok) return;
  }
  lyEl.innerHTML = L.isWorld ? `<span class="muted small">Group by</span>` + [['continents', 'Continents'], ['study', 'Study regions']].map(([k, t]) => `<button class="chip${P.layer === k ? ' on' : ''}" data-layer="${k}" aria-pressed="${P.layer === k}">${t}</button>`).join('') : '';
  const regs = P.regs = pickerRegions(L, P.layer), { of, col } = colorRegions(L, regs);
  const whole = regs.length === 1 && regs[0].name === 'All';
  const cur = P.level === CUR.id ? regs.findIndex(r => r.name === REGION) : -1;
  P.hover = null; P.pick = null; P.hoverUnit = null;

  // Map
  const units = L.units.filter(u => u.name !== 'Antarctica');
  const fcOf = u => ({ type: 'FeatureCollection', features: u.featuresCoarse });
  const all = { type: 'FeatureCollection', features: units.flatMap(u => u.featuresCoarse) };
  const w = Math.max(260, Math.round(mapEl.clientWidth || 600)), proj = pickerProjection(L);
  let h;
  if (L.isWorld) h = Math.round(w * 0.5);
  else {
    proj.fitWidth(w - 16, all); const b = d3.geoPath(proj).bounds(all);
    h = Math.round(Math.min(Math.max(b[1][1] - b[0][1] + 16, w * 0.45), Math.max(240, innerHeight * 0.5), w * 0.95));
  }
  proj.fitExtent([[8, 8], [w - 8, h - 8]], all);
  const path = d3.geoPath(proj);
  const data = units.map(u => { const fc = fcOf(u); return { u, regs: of.get(u.name) || [], d: path(fc), a: path.area(fc), c: path.centroid(fc), b: path.bounds(fc) }; }).filter(x => x.d);
  const svg = d3.select(mapEl).html('').append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('height', h)
    .attr('role', 'img').attr('aria-label', `Map of ${lvName(L.id)}${whole ? '' : ' by region'}`);
  const shapes = svg.append('g').selectAll('path').data(data).join('path').attr('class', 'u').attr('d', x => x.d);
  const dots = svg.append('g').selectAll('circle').data(data.filter(x => x.a < 12 && isFinite(x.c[0]))).join('circle').attr('class', 'u dot').attr('r', 3.2).attr('cx', x => x.c[0]).attr('cy', x => x.c[1]);
  // A dashed ring around the highlighted region when it is too small to see (island groups, microstates).
  const ring = svg.append('rect').attr('class', 'ring').attr('rx', 10).style('display', 'none');
  const regBox = regs.map(r => { const m = data.filter(x => r.set.has(x.u.name) && isFinite(x.b[0][0])); if (!m.length) return null;
    return [d3.min(m, x => x.b[0][0]), d3.min(m, x => x.b[0][1]), d3.max(m, x => x.b[1][0]), d3.max(m, x => x.b[1][1]), d3.sum(m, x => x.a)]; });
  // Region names, biggest first, skipping any that would collide.
  if (!whole) {
    const fs = w < 520 ? 10 : 11, boxes = [];
    const labelled = regs.map((r, i) => {
      let names = [...r.set]; if (L.isWorld && names.length > 1) names = names.filter(n => n !== 'Russia'); // Russia would drag Europe's label into Siberia
      const fc = { type: 'FeatureCollection', features: names.flatMap(n => L.byName.get(n).featuresCoarse) };
      return { i, name: r.name, c: path.centroid(fc), a: path.area(fc) };
    }).filter(x => isFinite(x.c[0])).sort((a, b) => b.a - a.a);
    const lg = svg.append('g');
    for (const x of labelled) {
      const tw = x.name.length * fs * 0.56 + 6, bx = [x.c[0] - tw / 2, x.c[1] - fs * 0.7, x.c[0] + tw / 2, x.c[1] + fs * 0.7];
      if (bx[0] < 2 || bx[2] > w - 2 || bx[1] < 2 || bx[3] > h - 2) continue;
      if (boxes.some(b => bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1])) continue;
      boxes.push(bx);
      lg.append('text').attr('class', 'lbl').attr('x', x.c[0]).attr('y', x.c[1]).attr('dy', '0.35em').attr('text-anchor', 'middle').style('font-size', fs + 'px').text(x.name);
    }
  }
  const unitWord = n => n === 1 ? L.def.unit : L.def.units;
  const paint = () => {
    const hl = P.hover != null ? P.hover : P.pick != null ? P.pick : cur >= 0 ? cur : null;
    const inHl = x => hl != null && regs[hl].set.has(x.u.name);
    const fill = x => inHl(x) ? PK_COLORS[col[hl]] : x.regs.length ? PK_COLORS[col[x.regs[0]]] : 'var(--muted)';
    const dim = P.hover != null || P.pick != null ? 0.28 : 0.5; // just showing the current region: dim the rest less
    const op = x => hl == null ? (x.regs.length ? 0.72 : 0.25) : inHl(x) ? 1 : (x.regs.length ? dim : 0.15);
    shapes.style('fill', fill).style('fill-opacity', op).classed('hl', inHl);
    dots.style('fill', fill).style('fill-opacity', x => Math.max(op(x), 0.5)).classed('hl', inHl).attr('r', x => inHl(x) ? 4.5 : 3.2);
    shapes.filter(inHl).raise(); dots.filter(inHl).raise();
    const bb = hl != null && !whole && regBox[hl];
    if (bb && bb[4] < w * h * 0.004) ring.style('display', null).attr('x', bb[0] - 9).attr('y', bb[1] - 9).attr('width', bb[2] - bb[0] + 18).attr('height', bb[3] - bb[1] + 18);
    else ring.style('display', 'none');
    chips.querySelectorAll('[data-ri]').forEach(b => { const i = +b.dataset.ri; b.classList.toggle('hl', i === hl || (i < 0 && whole)); });
    const hu = P.hoverUnit;
    if (hl != null) {
      const r = regs[hl], n = [...r.set].filter(nm => L.byName.get(nm).playable).length;
      const label = r.name === 'All' ? 'All of ' + lvName(L.id) : r.name;
      const also = hu && hu.regs.length > 1 ? ` <span class="muted">· ${esc(hu.u.name)} is also in ${esc(hu.regs.filter(j => j !== hl).map(j => regs[j].name).join(', '))}</span>` : hu ? ` <span class="muted">· ${esc(hu.u.name)}</span>` : '';
      const isCur = hl === cur && P.hover == null && P.pick == null;
      info.innerHTML = `<span><b>${esc(label)}</b> · ${n} ${esc(unitWord(n))}${isCur ? ' <span class="muted">(current)</span>' : ''}${also}</span>`
        + `<button class="btn" data-ri="${hl}">${isCur ? 'Keep' : 'Choose'} ${esc(label)}</button>`;
    } else if (hu) {
      info.innerHTML = `<span><b>${esc(hu.u.name)}</b> <span class="muted">isn't in any of these regions${L.isWorld && P.layer === 'study' ? '. Try Continents' : ''}.</span></span>`;
    } else info.innerHTML = `<span class="muted">${whole ? `${esc(lvName(L.id))} has no regional groups: practise the whole map.` : 'Tap a region on the map, or pick one below.'}</span>`;
  };
  // Mouse: hover previews, click chooses. Touch: first tap previews, a second tap (or the button) chooses.
  const unitAt = e => (e.target.classList && e.target.classList.contains('u')) ? e.target.__data__ : null;
  const pop = mapEl.appendChild(document.createElement('div')); pop.className = 'pk-pop'; pop.hidden = true;
  svg.on('pointerdown', e => { P.ptype = e.pointerType; });
  svg.on('pointermove', e => {
    if (e.pointerType !== 'mouse' || !pop.hidden) return;
    const x = unitAt(e);
    P.hoverUnit = x; P.hover = x && x.regs.length ? (x.regs.includes(P.hover) ? P.hover : x.regs[0]) : null; paint();
  });
  svg.on('pointerleave', () => { if (!pop.hidden) return; P.hover = null; P.hoverUnit = null; paint(); });
  svg.on('click', e => {
    if (!pop.hidden) { pop.hidden = true; return; }
    const x = unitAt(e); if (!x) return;
    if (!x.regs.length) { P.hoverUnit = x; P.pick = null; paint(); return; }
    if (x.regs.length > 1) { // member of several study regions: ask which
      const rect = mapEl.getBoundingClientRect();
      pop.innerHTML = `<div class="muted small">${esc(x.u.name)} is in</div>` + x.regs.map(j => `<button class="chip" data-ri="${j}"><i style="background:${PK_COLORS[col[j]]}"></i>${esc(regs[j].name)}</button>`).join('');
      pop.hidden = false;
      const px = Math.min(Math.max(8, e.clientX - rect.left - pop.offsetWidth / 2), rect.width - pop.offsetWidth - 8), py = e.clientY - rect.top + 12;
      pop.style.left = px + 'px'; pop.style.top = (py + pop.offsetHeight > rect.height ? Math.max(8, e.clientY - rect.top - pop.offsetHeight - 12) : py) + 'px';
      pop.querySelectorAll('[data-ri]').forEach(b => { b.onmouseenter = () => { P.hover = +b.dataset.ri; paint(); }; });
      return;
    }
    const r = x.regs[0];
    if (P.ptype === 'mouse' || P.pick === r) return pickerChoose(r);
    P.pick = r; P.hoverUnit = x; paint();
  });
  // Region list (the same choices, for keyboards and for regions too small to tap)
  chips.innerHTML = `<button class="chip${cur < 0 && P.level === CUR.id && REGION === 'All' ? ' on' : ''}" data-ri="-1">All of ${esc(lvName(L.id))}</button>`
    + (whole ? '' : regs.map((r, i) => `<button class="chip${i === cur ? ' on' : ''}" data-ri="${i}"><i style="background:${PK_COLORS[col[i]]}"></i>${esc(r.name)}</button>`).join(''));
  chips.querySelectorAll('[data-ri]').forEach(b => {
    const i = +b.dataset.ri; if (i < 0) return;
    b.onmouseenter = () => { P.hover = i; paint(); };
    b.onmouseleave = () => { P.hover = null; paint(); };
    b.onfocus = () => { P.hover = i; paint(); }; b.onblur = () => { P.hover = null; paint(); };
  });
  paint();
}
picker.addEventListener('click', e => {
  if (!PK) return;
  if (e.target === picker) return closePicker(); // backdrop
  const t = e.target.closest('button'); if (!t) return;
  if (t.classList.contains('pk-close')) return closePicker();
  if (t.dataset.lv) { if (t.dataset.lv !== PK.level) { PK.level = t.dataset.lv; PK.layer = 'continents'; drawPicker(); picker.querySelector('[data-lv].on').focus(); } return; }
  if (t.dataset.layer) { if (t.dataset.layer !== PK.layer) { PK.layer = t.dataset.layer; drawPicker(); const on = picker.querySelector('[data-layer].on'); if (on) on.focus(); } return; }
  if (t.dataset.ri != null) return pickerChoose(+t.dataset.ri);
});
document.addEventListener('keydown', e => {
  if (!PK) return;
  if (e.key === 'Escape') { e.preventDefault(); return closePicker(); }
  if (e.key !== 'Tab') return; // keep focus inside the dialog
  const f = [...picker.querySelectorAll('button:not([hidden])')].filter(b => b.offsetParent);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});
addEventListener('resize', () => { if (PK) { clearTimeout(PK.rt); PK.rt = setTimeout(drawPicker, 150); } });

// ---------- Modes ----------
const panel = document.getElementById('panel');
const MODES = [['train', 'Train'], ['study', 'Study'], ['explore', 'Explore'], ['tap', 'Tap'], ['globle', 'Hot & Cold'], ['neighbors', 'Borders'], ['closer', 'Closer'], ['nameit', 'Name It'], ['flags', 'Flags'], ['clues', 'Clues']];
let mode = null, S = {}, tourTimer = null;
const nav = document.getElementById('nav');
MODES.forEach(([id, label]) => { const b = document.createElement('button'); b.textContent = label; b.dataset.id = id; b.onclick = () => { const again = id === mode && !TRAIN.active; stashView(); if (id !== 'train') trainStop(true); setMode(id, again); }; nav.appendChild(b); });
function setMode(id, fresh = false) {
  updateScopeBtn();
  if (!fresh) stashView();
  if (tourTimer) { clearInterval(tourTimer); tourTimer = null; }
  mode = id; S = {};
  if (fresh) SNAP.delete(routePath());
  else if (!TRAIN.active && SNAP.has(routePath()) && restoreView(routePath())) return 'restored';
  updateLabelButton();
  syncHash();
  [...nav.children].forEach(b => b.classList.toggle('on', b.dataset.id === id));
  resetGlobe(); render();
  const fn = { train: trainLanding, study: studyStart, explore, tap: tapStart, globle: globleStart, neighbors: neighborsStart, closer: closerStart, nameit: nameitStart, flags: flagsStart, clues: cluesStart }[id];
  (fn || studyStart)();
}
document.addEventListener('keydown', e => {
  if (PK) return; // the region picker handles its own keys
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
  if (/^[1-9]$/.test(e.key)) {
    const btns = [...document.querySelectorAll('#nopts .btn, #fopts .btn, #clopts .btn, #copts .btn, #panel .chips .chip')];
    const b = btns[+e.key - 1]; if (b) { e.preventDefault(); b.click(); }
    return;
  }
  if (e.key === 'n' || e.key === 'N' || (e.key === 'Enter' && tag !== 'BUTTON' && tag !== 'SUMMARY')) {
    const nx = document.querySelector('#nnext, #fnext, #clnext, #cnext, #nbnext, #tapnext, #again, #gnew, #nbcheck, #tbquiz');
    if (nx) { e.preventDefault(); nx.click(); }
  }
});
document.addEventListener('click', e => {
  if (e.detail > 1 && e.target.closest && e.target.closest('#panel button, #trainbar button')) { e.stopImmediatePropagation(); e.preventDefault(); }
}, true);
function focusNext() {
  setTimeout(() => { const nx = document.querySelector('#nnext, #fnext, #clnext, #cnext, #nbnext, #tapnext, #gnew'); if (nx) nx.focus({ preventScroll: true }); }, 0);
}
function revealFeedback(sel) {
  focusNext();
  if (window.innerWidth > 860) return;
  const el = document.querySelector(sel), side = document.getElementById('side');
  if (!el || !el.firstElementChild) return;
  const top = el.firstElementChild.getBoundingClientRect().top - side.getBoundingClientRect().top + side.scrollTop - 8;
  side.scrollTo({ top, behavior: 'smooth' }); // scroll the panel only, never the document
}
function coach(items) { return `<div class="coach"><b>Coach</b><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`; }
function scopeCount() {
  const n = pool().length;
  if (CUR.id === 'usa' && pool().some(u => u.name === 'District of Columbia')) return `${n - 1} states + DC`;
  return `${n} ${CUR.def.units}`;
}
function scopeLine() { return `<div class="scopeline">Scope: <b>${esc(scopeLabel())}</b> · ${esc(scopeCount())} · <button class="linkbtn" data-pick>change</button></div>`; }
function noScope() { panel.innerHTML = `<h2>Nothing in scope</h2><p class="sub">This region has no playable ${esc(CUR.def.units)}. <button class="linkbtn" data-pick>Pick another region</button>.</p>`; return true; }

// ----- Train: adaptive programme -----
const TRAIN = { active: false, program: null, topic: null, lastTopic: null, lastMode: null, remaining: 0, setSeen: 0, setMiss: 0, phase: 'run', sets: 0 };
const PROGRAMS = {
  locate:  { label: 'Locate', blurb: 'Tap places on the globe, name shapes, flags', levels: 'all', modes: { world: { tap: .5, nameit: .3, flags: .2 }, sub: { tap: .6, nameit: .4 } } },
  hotcold: { label: 'Hot & Cold', blurb: 'Find a hidden country from warm/cold guesses; borders and distances', levels: 'world', modes: { world: { globle: .4, neighbors: .4, closer: .2 }, sub: { neighbors: .6, closer: .4 } } },
  street:  { label: 'Street Clues', blurb: 'Road lines, poles, signs, plates, camera quirks, capitals', levels: 'world', needClues: true, modes: { world: { clues: .5, flags: .2, nameit: .15, tap: .15 }, sub: { tap: 1 } } },
  mixed:   { label: 'Everything', blurb: 'All drills, weighted to your misses', levels: 'all', modes: { world: { tap: .25, nameit: .15, flags: .1, globle: .15, neighbors: .15, closer: .1, clues: .1 }, sub: { tap: .35, nameit: .25, globle: .15, neighbors: .15, closer: .1 } } },
};
function trainTopics(program) {
  const out = [];
  for (const r of Object.keys(window.WORLD_REGIONS)) {
    if (PROGRAMS[program].needClues && window.WORLD_REGIONS[r].filter(n => window.CLUES[n]).length < 4) continue;
    out.push({ level: 'world', region: r, label: r, keys: window.WORLD_REGIONS[r].map(n => 'world:' + n) });
  }
  if (PROGRAMS[program].levels === 'all') {
    for (const [id, regs] of Object.entries(window.LEVEL_REGIONS)) {
      const name = LEVEL_DEFS[id].label.split(' · ')[0];
      const allKeys = (window.SUBCAPITALS[id] || []).map(p => id + ':' + p[0]);
      for (const r of Object.keys(regs)) if (regs[r].length >= 4) out.push({ level: id, region: r, label: `${name}: ${r}`, keys: regs[r].map(n => id + ':' + n) });
      out.push({ level: id, region: 'All', label: name, keys: allKeys }); // whole-level topic covers tiny regions too
    }
  }
  return out;
}
function topicStats(t) {
  let seen = 0, miss = 0;
  for (const k of t.keys) { const u = STATS.units[k]; if (u) { seen += u.seen; miss += u.miss; } }
  return { seen, miss, weight: (miss + 1) / (seen + 2) }; // unseen topics start at 0.5 so coverage happens; mastered topics fade
}
function pickTopic(program) {
  // Sample across all topics with probability ∝ weight²: weak and unseen topics dominate, but every level gets visited.
  const scored = shuffle(trainTopics(program).map(t => ({ t, ...topicStats(t) })));
  const perLevel = {}; for (const x of scored) perLevel[x.t.level] = (perLevel[x.t.level] || 0) + 1;
  for (const x of scored) {
    if (x.t.level !== 'world') x.weight *= Math.min(1, 4 / perLevel[x.t.level]); // a level with many regions should not swamp the mix
    if (TRAIN.lastTopic && x.t.label === TRAIN.lastTopic.label) x.weight *= 0.3;
    if (TRAIN.lastTopic && x.t.level === TRAIN.lastTopic.level && x.t.level !== 'world') x.weight *= 0.7; // vary levels
    x.w2 = x.weight * x.weight;
  }
  let r = Math.random() * scored.reduce((a, x) => a + x.w2, 0);
  for (const x of scored) { r -= x.w2; if (r <= 0) return x; }
  return scored[0];
}
function pickMode(program, level) {
  const table = PROGRAMS[program].modes[level === 'world' ? 'world' : 'sub'];
  const primary = Object.entries(table).sort((a, b) => b[1] - a[1])[0][0]; // the programme's main drill may repeat
  const entries = Object.entries(table).filter(([m]) => !(m === TRAIN.lastMode && m !== primary && Object.keys(table).length > 1));
  let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [m, w] of entries) { r -= w; if (r <= 0) return m; }
  return entries[0][0];
}
function weakestNow(n = 3) {
  return trainTopics('mixed').map(t => ({ t, ...topicStats(t) })).filter(x => x.seen >= 3 && x.miss > 0).sort((a, b) => b.miss / b.seen - a.miss / a.seen).slice(0, n);
}
function trainLanding() {
  TRAIN.active = false; trainBar();
  let saved = null; try { saved = localStorage.getItem('geodrill.program'); } catch (e) {}
  if (saved && !PROGRAMS[saved]) saved = null;
  const weak = weakestNow();
  panel.innerHTML = `<h2>Train</h2>
    <p class="sub">Pick what you're practising for. The app chooses the topics and drills, doubles down where you miss, and moves on when you're solid. No settings needed.</p>
    <div class="bigopts">${Object.entries(PROGRAMS).map(([id, p]) => `<button data-p="${id}"><b>${p.label}${saved === id ? ' <span class="muted small">· continue</span>' : ''}</b><small>${p.blurb}</small></button>`).join('')}</div>
    ${weak.length ? `<div class="small"><b>Where you've struggled:</b> ${weak.map(x => `${esc(x.t.label)} (${Math.round(100 * x.miss / x.seen)}% missed)`).join(', ')}</div>` : '<div class="small muted">No history yet. The first sets sample widely to find your weak spots.</div>'}
    <div class="small muted" style="margin-top:14px">Prefer to steer yourself? Use Study and the level/region dropdowns. Sets are 5 questions, or one Tap round or Hot &amp; Cold game.</div>`;
  panel.querySelectorAll('.bigopts button').forEach(b => b.onclick = () => trainChoose(b.dataset.p));
}
function trainChoose(program) {
  if (restoreView('/train/' + program)) return; // a set left mid-way picks up where it was
  TRAIN.active = true; TRAIN.program = program; TRAIN.sets = 0; TRAIN.lastTopic = null; TRAIN.lastMode = null; TRAIN.reviewed = false;
  try { localStorage.setItem('geodrill.program', program); } catch (e) {}
  trainNextSet();
}
function trainStop(silent) {
  if (!TRAIN.active) return;
  if (silent) stashView(true);
  TRAIN.active = false; TRAIN.phase = 'run'; trainBar();
  if (!silent) setMode('train');
}
async function trainRunSet(topic, forceMode = null) {
  TRAIN.topic = topic; TRAIN.phase = 'run'; TRAIN.sets++;
  const m = forceMode || pickMode(TRAIN.program, topic.level);
  TRAIN.lastMode = m; TRAIN.setSize = TRAIN.remaining = (m === 'tap' || m === 'globle') ? 1 : 5; TRAIN.setSeen = 0; TRAIN.setMiss = 0;
  await setLevel(topic.level, topic.region, m);
  TRAIN.lastTopic = topic;
  trainBar();
}
async function trainNextSet() {
  const weak = TRAIN.setSeen >= 3 && TRAIN.setMiss / TRAIN.setSeen >= 0.4;
  if (weak && !TRAIN.reviewed) { // double down: review this topic, then quiz it again
    TRAIN.reviewed = true; TRAIN.phase = 'review';
    await setLevel(TRAIN.topic.level, TRAIN.topic.region, 'study');
    trainBar(); return;
  }
  // After a review-and-retry the programme moves on even if still weak; the topic's miss rate keeps it coming back.
  TRAIN.reviewed = false;
  trainRunSet(pickTopic(TRAIN.program).t);
}
function advance(fn) {
  if (!TRAIN.active) return fn();
  TRAIN.remaining--;
  if (TRAIN.remaining > 0) { fn(); trainBar(); } else trainNextSet();
}
function trainBar() {
  const el = document.getElementById('trainbar');
  if (!TRAIN.active || !TRAIN.topic) { el.innerHTML = ''; return; }
  const st = topicStats(TRAIN.topic), p = PROGRAMS[TRAIN.program];
  const reason = TRAIN.phase === 'review' ? `You missed ${TRAIN.setMiss} of ${TRAIN.setSeen} here. Have a look, then try it again.`
    : st.seen === 0 ? 'New ground: sampling it to see how you do.' : `${st.miss} of ${st.seen} missed here so far.`;
  let modeLabel = (MODES.find(m => m[0] === mode) || [])[1] || '';
  if (mode === 'tap' && S.round) modeLabel += ` · Q${Math.min(S.round.length + 1, S.n)}/${S.n}`;
  el.innerHTML = `<div class="tbt">Training for ${esc(p.label)} · set ${TRAIN.sets}${TRAIN.phase === 'review' ? ' · review' : ` · ${esc(modeLabel)}${TRAIN.setSize > 1 ? ` · Q${TRAIN.setSize - TRAIN.remaining + 1}/${TRAIN.setSize}` : ''}`}</div>
    <div>${esc(TRAIN.topic.label)} <span class="muted">· ${reason}</span></div>
    <div class="row">${TRAIN.phase === 'review' ? '<button class="btn" id="tbquiz">Quiz me again</button>' : '<button class="btn sec" id="tbskip">Skip topic</button>'}<button class="btn sec" id="tbstop">Stop</button></div>`;
  const q = document.getElementById('tbquiz'); if (q) q.onclick = () => trainRunSet(TRAIN.topic, TRAIN.lastMode); // retry the skill that was missed
  const sk = document.getElementById('tbskip'); if (sk) sk.onclick = () => { TRAIN.setSeen = 0; TRAIN.setMiss = 0; TRAIN.reviewed = false; trainNextSet(); };
  document.getElementById('tbstop').onclick = () => trainStop(false);
}

// ----- Study guide -----
function studyStart() {
  G.hover = true;
  const units = pool();
  const grouped = {};
  for (const u of units) (grouped[u.region || 'All'] ||= []).push(u);
  const groups = Object.keys(grouped).sort();
  const row = u => `<div class="urow" data-n="${esc(u.name)}"><span class="un">${flagImg(u)}${esc(u.name)}</span><span class="uc muted">${u.capital ? esc(u.capital) : ''}</span><span class="ub muted">${u.neighbors.size ? u.neighbors.size + (u.neighbors.size === 1 ? ' neighbour' : ' neighbours') : 'no land borders'}${u.places && u.places.length ? ' · ' + u.places.length + (u.places.length === 1 ? ' place' : ' places') : ''}</span></div>`;
  panel.innerHTML = `<h2>Study guide</h2>
    ${scopeLine()}
    <p class="sub">Click a ${esc(CUR.def.unit)} to fly to it and see its neighbours. Press <b>Aa</b> on the globe to label the map (press again to add capitals and cities). Then drill the same scope with the buttons below.</p>
    <div class="row" style="margin:6px 0 10px">
      <button class="btn" data-m="tap">Tap</button><button class="btn" data-m="nameit">Name It</button><button class="btn" data-m="neighbors">Borders</button><button class="btn" data-m="globle">Hot &amp; Cold</button>${CUR.isWorld ? '<button class="btn" data-m="flags">Flags</button><button class="btn" data-m="clues">Clues</button>' : ''}
      <button class="btn sec" id="tour">▶ Tour</button>
    </div>
    <div id="sinfo"></div>
    <div class="ulist">${groups.map(g => `${groups.length > 1 ? `<div class="ugroup">${esc(g)} <span class="muted">(${grouped[g].length})</span></div>` : ''}${grouped[g].map(row).join('')}`).join('')}</div>
    ${coach(CUR.isWorld ? [
      'Work one region at a time until Name It and Borders are automatic, then widen the scope.',
      'For each country, memorise three things: shape, one neighbour in each direction, and which side the capital sits on.',
      'Islands and microstates are where placement taps go wrong. Learn them as pairs with the nearest big country.']
    : [
      `Learn the ${esc(CUR.def.units)} as a grid: which row and column each sits in, then its capital.`,
      'The Tour cycles through every unit in scope with its capital. Run it twice, then switch to Name It.'])}`;
  panel.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setMode(b.dataset.m));
  panel.querySelectorAll('.urow').forEach(r => r.onclick = () => showUnit(CUR.byName.get(r.dataset.n)));
  G.onTap = p => { const c = unitAt(p); if (c && c.level === CUR.id) showUnit(c); };
  let tourIdx = -1;
  document.getElementById('tour').onclick = e => {
    if (tourTimer) { clearInterval(tourTimer); tourTimer = null; e.target.textContent = '▶ Tour'; return; }
    e.target.textContent = '■ Stop';
    const step = () => { tourIdx = (tourIdx + 1) % units.length; showUnit(units[tourIdx]); };
    step(); tourTimer = setInterval(step, 3000);
  };
  S.focus = showUnit;
  function showUnit(c) {
    S.focused = c; focusHash(c);
    const pls = CUR.places.filter(pl => pl.units.includes(c));
    G.markers = pls.map(pl => ({ p: pl.p, color: pl.kind === 'capital' ? cssVar('--bad') : pl.kind === 'landmark' ? cssVar('--warn') : cssVar('--text'), r: pl.kind === 'capital' ? 6 : 4, label: pl.name }));
    const fr = frameWithLabels([c], pls.map(pl => pl.p), 0.8, 1.6);
    const zc = Math.max(zoomForUnit(c) * 0.9, fr.zoom), cc = pls.length > 1 ? fr.center : c.centroid;
    flyTo(cc, zc);
    G.markers = G.markers.concat(contextLabels(cc, zc, new Set([c])));
    G.fill = x => x === c ? cssVar('--accent') : (x.level === c.level && c.neighbors.has(x.name)) ? '#f0a53a' : null;
    const nbs = [...c.neighbors].sort();
    panel.querySelectorAll('.urow').forEach(r => r.classList.toggle('on', r.dataset.n === c.name));
    const el = document.getElementById('sinfo');
    el.innerHTML = `<div class="card"><div class="big">${flagImg(c, 'flag big')}${esc(c.name)}</div>
      <div class="small muted">${esc(c.region)}${c.capital ? ' · Capital: ' + esc(c.capital) : ''}</div>
      <div style="margin-top:6px"><b>Borders (${nbs.length}):</b> ${nbs.length ? nbs.map(esc).join(', ') : 'none — island or isolated'}</div>
      ${c.places && c.places.length ? `<div style="margin-top:4px"><b>Cities & places:</b> ${c.places.map(esc).join(', ')}</div>` : ''}
      ${clueCard(c)}</div>`;
    render();
  }
}

// ----- Explore -----
function explore() {
  G.hover = true;
  panel.innerHTML = `<h2>Explore</h2><p class="sub">Hover to identify, click a ${esc(CUR.def.unit)} to see its borders and capital. Type a name to fly there.</p>
    <form id="exform"><input type="text" id="exq" placeholder="Fly to…" list="clist" autocomplete="off" aria-label="Fly to a ${esc(CUR.def.unit)}"></form>
    <div class="hint" id="exmsg" aria-live="polite"></div>
    <datalist id="clist">${CUR.playable.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
    <div id="exinfo"></div>
    ${coach(CUR.isWorld ? ['Learn clusters, not single countries: the Sahel strip, the Stans, the Balkans, the Gulf, Central America, the Guianas.',
      'For each country, know at least one neighbour in each direction. Hot-and-cold games are solved by walking borders.',
      'Note where a country is <i>not</i>: Mongolia touches only Russia and China. Portugal touches only Spain.']
    : [`Learn the ${esc(CUR.def.units)} in clusters by region, then know at least one neighbour in each direction.`,
      'Hover along a border to see which units meet there. Hot-and-cold games are solved by walking borders.'])}`;
  const q = document.getElementById('exq');
  const go = text => {
    const msg = document.getElementById('exmsg');
    if (!normalize(text)) { msg.textContent = ''; return; }
    const { unit: c, suggestions } = resolveUnit(text);
    if (c) { msg.textContent = ''; q.value = ''; return showUnit(c); }
    msg.innerHTML = suggestions.length ? `Did you mean ${suggestions.map(u => `<button type="button" class="linkbtn" data-n="${esc(u.name)}">${esc(u.name)}</button>`).join(', ')}?`
      : `No ${esc(CUR.def.unit)} called "${esc(text)}" on this level.`;
    msg.querySelectorAll('.linkbtn').forEach(b => b.onclick = () => go(b.dataset.n));
  };
  document.getElementById('exform').onsubmit = e => { e.preventDefault(); go(q.value); };
  q.addEventListener('change', () => { if (CUR.lookup.has(normalize(q.value))) go(q.value); }); // picked from the list
  G.onTap = p => { const c = unitAt(p); if (c) showUnit(c); };
  S.focus = showUnit;
  function showUnit(c) {
    S.focused = c; focusHash(c);
    const z = zoomForUnit(c);
    flyTo(c.centroid, z);
    G.markers = contextLabels(c.centroid, z, new Set([c]));
    G.fill = x => x === c ? cssVar('--accent') : (x.level === c.level && c.neighbors.has(x.name)) ? '#f0a53a' : null;
    const nbs = [...c.neighbors].sort();
    document.getElementById('exinfo').innerHTML = `<div class="card"><div class="big">${flagImg(c, 'flag big')}${esc(c.name)}</div>
      <div class="small muted">${esc(c.region)}${c.capital ? ' · Capital: ' + esc(c.capital) : ''}</div>
      <div style="margin-top:6px"><b>Borders (${nbs.length}):</b> ${nbs.length ? nbs.map(esc).join(', ') : 'none — island or isolated'}</div>
      ${c.places && c.places.length ? `<div style="margin-top:4px"><b>Cities & places:</b> ${c.places.map(esc).join(', ')}</div>` : ''}
      ${clueCard(c)}</div>`;
    render();
  }
}

// ----- Tap (MapTap) -----
function tapScore(dKm) { return dKm <= 0 ? 100 : Math.max(0, Math.round(100 * Math.exp(-dKm / CUR.def.decay))); }
function tapStart() {
  S.cats = { unit: true, capital: true, city: true, landmark: false };
  S.round = []; S.q = null; S.n = 5;
  if (!pool().length) return noScope();
  // A shared link carries the exact five questions; otherwise plan a fresh round now, so it can be shared at any point.
  S.plan = ROUTE.q ? decodePlan(ROUTE.q) : null;
  if (ROUTE.q && !S.plan) toast("That shared round's link is damaged, so this is a new round.");
  S.shared = S.plan ? { score: ROUTE.s != null && /^\d+$/.test(ROUTE.s) ? Math.min(500, +ROUTE.s) : null } : null;
  if (!S.plan) S.plan = planTapRound();
  tapNext();
}
const tapKey = q => q.kind === 'unit' ? q.c.key : 'place:' + CUR.id + ':' + q.pl.name;
const tapName = q => q.kind === 'unit' ? q.c.name : q.pl.name;
function chooseTapQuestion(taken) {
  const units = pool(), places = scopedPlaces(S.cats);
  if (!S.cats.unit && !places.length) S.cats.unit = true;
  const avoid = avoidSet(units.length + places.length);
  const takenNames = new Set(taken.map(t => normalize(tapName(t))));
  const fresh = q => !takenNames.has(normalize(tapName(q))) && !isRecent(avoid, tapKey(q), tapName(q));
  let q = null, fallback = null;
  for (let tries = 0; tries < 30 && !q; tries++) {
    let c;
    const unitShare = places.length ? 0.6 : 1;
    if (S.cats.unit && Math.random() < unitShare) c = { kind: 'unit', c: pickTarget(units, false) };
    else if (places.length) { // choose a unit (weighted) first, then one of its fresh places, so place-rich units do not dominate
      const byUnit = new Map();
      for (const pl of places) {
        if (isRecent(avoid, 'place:' + CUR.id + ':' + pl.name, pl.name)) continue;
        for (const u of pl.units) { if (!byUnit.has(u)) byUnit.set(u, []); byUnit.get(u).push(pl); }
      }
      const u = byUnit.size ? weightedPick([...byUnit.keys()]) : null;
      c = { kind: 'place', pl: u ? pick(byUnit.get(u)) : pick(places) };
    }
    else c = { kind: 'unit', c: pickTarget(units, false) };
    fallback = fallback || c;
    if (fresh(c)) q = c;
  }
  q = q || fallback;
  remember(tapKey(q), tapName(q)); // only the question actually asked goes into the history
  return q;
}
function planTapRound() { const plan = []; while (plan.length < S.n) plan.push(chooseTapQuestion(plan)); return plan; }
function tapNext() {
  resetGlobe(); canvas.classList.add('tap');
  flyHome(); // each question starts from the whole scope, not zoomed in on the last answer
  S.q = S.plan[S.round.length] || chooseTapQuestion(S.round.map(r => r.q)); S.answered = false;
  G.onTap = tapAnswer;
  tapRender();
}
function tapRender() {
  const q = S.q, total = S.round.reduce((a, r) => a + r.score, 0);
  const label = q.kind === 'unit' ? q.c.name : q.pl.name;
  const kindTxt = q.kind === 'unit' ? CUR.def.unit : q.pl.kind;
  const idx = S.round.length + 1;
  panel.innerHTML = `<h2>Tap <span class="muted small">· placement drill</span></h2>
    ${scopeLine()}
    ${S.shared ? `<div class="sharedbar">🔗 Shared round: the same five questions your friend got${S.shared.score != null ? `. Their score: <b>${S.shared.score}/500</b>` : ''}.</div>` : ''}
    <div class="row small muted"><span>Question ${idx} / ${S.n}</span><span>·</span><span id="tapscore">Round score ${total}</span></div>
    <div class="scorebar"><i id="tapbar" style="width:${total / S.n}%"></i></div>
    <div class="prompt">${q.kind === 'unit' ? flagImg(q.c, 'flag big') : ''}${esc(label)}</div>
    <div class="hint">${esc(kindTxt)}${q.kind === 'place' ? ` · <a href="#" id="revealc">show ${esc(CUR.def.unit)}</a>` : ''}</div>
    <p class="sub">Rotate and zoom the globe, then tap where it is. Inside the border = 100; otherwise points fall off with distance.</p>
    <div id="tapfb" aria-live="polite"></div>
    <div class="row" style="margin-top:8px">
      <label class="cb"><input type="checkbox" data-cat="unit" ${S.cats.unit ? 'checked' : ''}> ${esc(CUR.def.units[0].toUpperCase() + CUR.def.units.slice(1))}</label>
      <label class="cb"><input type="checkbox" data-cat="capital" ${S.cats.capital ? 'checked' : ''}> Capitals</label>
      ${CUR.places.some(pl => pl.kind === 'city') ? `<label class="cb"><input type="checkbox" data-cat="city" ${S.cats.city ? 'checked' : ''}> Cities</label>` : ''}
      ${CUR.places.some(pl => pl.kind === 'landmark') ? `<label class="cb"><input type="checkbox" data-cat="landmark" ${S.cats.landmark ? 'checked' : ''}> Landmarks</label>` : ''}
    </div>
    ${tapHistory()}
    ${coach(['Anchor on coastlines and big shapes first, then count units inward from the edge you know.',
      'For capitals, know which side of the territory they sit on. Many are coastal or near a border.',
      'Zoom in before tapping. A tap inside the border scores full marks, so a careful tap beats a quick one.'])}`;
  panel.querySelectorAll('input[data-cat]').forEach(cb => cb.onchange = () => {
    S.cats[cb.dataset.cat] = cb.checked;
    S.plan.length = S.round.length + 1; // keep the current question, re-plan the rest with the new categories
    while (S.plan.length < S.n) S.plan.push(chooseTapQuestion(S.plan));
  });
  if (TRAIN.active) trainBar();
  const rc = document.getElementById('revealc'); if (rc) rc.onclick = e => { e.preventDefault(); rc.replaceWith(document.createTextNode(q.pl.where)); };
}
function tapRounds(level) { return STATS.tap.map(r => typeof r === 'number' ? { t: r, level: 'world' } : r).filter(r => r.level === level).map(r => r.t); }
function tapHistory() {
  const t = tapRounds(CUR.id);
  const best = t.length ? Math.max(...t) : null, avg = t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : null;
  return `<div class="small muted" style="margin-top:8px">${esc(scopeLabel())} rounds played: ${t.length}${best != null ? ` · Best ${best}/${S.n * 100} · Avg ${avg}` : ''}</div>`;
}
function tapAnswer(p) {
  if (S.answered) return; S.answered = true; G.onTap = null; canvas.classList.remove('tap');
  const q = S.q; let d, target, inside = false, statUnit;
  if (q.kind === 'unit') { d = pointToUnitDist(p, q.c); inside = d === 0; target = inside ? q.c.anchor : nearestBorderPoint(p, q.c); statUnit = q.c; }
  else { target = q.pl.p; d = haversine(p, target); if (d < 25) { d = 0; inside = true; } statUnit = q.pl.units[0] || null; }
  const score = tapScore(d);
  if (statUnit) mark(statUnit, score < 60);
  S.round.push({ q, score, d, p, target, inside });
  { const tot = S.round.reduce((a, r) => a + r.score, 0); const ts = document.getElementById('tapscore'), tb = document.getElementById('tapbar');
    if (ts) ts.textContent = 'Round score ' + tot; if (tb) tb.style.width = (tot / S.n) + '%'; }
  const okc = cssVar('--ok'), badc = cssVar('--bad');
  if (q.kind === 'unit') G.fill = x => x === q.c ? okc : null;
  // Your tap is always marked exactly where it landed. A hit is green; the answer gets a name label, not a second dot.
  const you = { p, color: inside ? okc : badc, r: 7, label: inside ? 'you ✓' : 'you', pulse: performance.now() };
  if (inside) {
    G.markers = [you];
    if (q.kind === 'unit') G.markers.push({ p: q.c.anchor, label: q.c.name, textOnly: true });
    else G.markers.push({ p: target, color: okc, r: 4, label: q.pl.name });
  } else {
    G.markers = [{ p: target, color: okc, label: q.kind === 'unit' ? q.c.name + ' border' : q.pl.name }, you];
    G.lines = [{ a: p, b: target }];
  }
  G.hover = true;
  // Keep the view still when both points are on screen and clearly apart, so your marker stays under your finger.
  // Move only when the answer is off screen (frame both) or the two dots are too close to tell apart (zoom in on them).
  const here = [-G.rotate[0], -G.rotate[1]];
  const sp = G.projection(p), st = G.projection(target);
  const onScreen = (ll, xy) => d3.geoDistance(ll, here) < Math.PI / 2 - 0.05 && xy[0] > 30 && xy[1] > 30 && xy[0] < G.w - 30 && xy[1] < G.h - 30;
  const bothVisible = onScreen(p, sp) && onScreen(target, st);
  const apart = Math.hypot(sp[0] - st[0], sp[1] - st[1]);
  let ct = here, zt = G.zoom, move = false, anchored = null;
  if (!inside && !(bothVisible && apart >= 40)) {
    // First choice: zoom about the tap itself (out to bring the answer into view, or in to separate the dots),
    // so your marker never leaves your finger. Only if that cannot show both does the view pan.
    anchored = anchoredView(p, sp, target, bothVisible ? 'in' : 'out');
    if (anchored) { zt = anchored.zoom; ct = [-anchored.rotate[0], -anchored.rotate[1]]; }
    else {
      const theta = d3.geoDistance(p, target);
      ct = d3.geoInterpolate(p, target)(0.5); zt = Math.max(bothVisible ? G.zoom : 1, Math.min(24, 0.7 / Math.max(theta, 1e-4))); move = true;
    }
  }
  if (anchored) zoomAbout(p, sp, anchored.zoom);
  else if (move) { // the answer is round the back of the globe: show your marker where you tapped first, then turn
    pulseMarkers();
    clearTimeout(revealTimer); revealTimer = setTimeout(() => { if (S.q === q && mode === 'tap') flyTo(ct, zt); }, 1100);
  } else pulseMarkers();
  G.markers = G.markers.concat(contextLabels(ct, zt, new Set(q.kind === 'unit' ? [q.c] : q.pl.units)));
  const cls = score >= 80 ? 'ok' : score >= 40 ? 'warn' : 'bad';
  setTimeout(() => revealFeedback('#tapfb'), 50);
  const msg = inside ? (q.kind === 'unit' ? 'Inside the border. Full marks.' : 'Dead on.') : `You were <b>${fmtKm(d)}</b> off${q.kind === 'unit' ? ' from the border' : ''}.`;
  const done = S.round.length >= S.n;
  document.getElementById('tapfb').innerHTML = `<div class="card ${cls}"><div class="big">${score} ${score === 1 ? 'pt' : 'pts'}</div><div>${msg}</div>
    ${q.kind === 'place' ? `<div class="small muted">${esc(q.pl.name)} is in ${esc(q.pl.where)}.</div>` : ''}
    <div style="margin-top:8px"><button class="btn" id="tapnext">${done ? 'See round summary' : 'Next'}</button></div></div>`;
  document.getElementById('tapnext').onclick = () => done ? tapSummary() : tapNext();
  render();
}
function tapSummary() {
  const total = S.round.reduce((a, r) => a + r.score, 0);
  STATS.tap.push({ t: total, level: CUR.id }); save();
  resetGlobe(); G.hover = true;
  const col = r => r.score >= 80 ? cssVar('--ok') : r.score >= 40 ? cssVar('--warn') : cssVar('--bad');
  G.markers = S.round.map(r => ({ p: r.target, color: col(r), r: 5, label: `${r.q.kind === 'unit' ? r.q.c.name : r.q.pl.name} · ${r.score}` }))
    .concat(S.round.filter(r => !r.inside).map(r => ({ p: r.p, color: cssVar('--muted'), r: 3 })));
  G.lines = S.round.filter(r => !r.inside).map(r => ({ a: r.p, b: r.target, color: col(r) }));
  flyHome(); render();
  panel.innerHTML = `<h2>Round complete</h2>
    <div class="card"><div class="big">${total} / ${S.n * 100}</div><div class="scorebar"><i style="width:${total / S.n}%"></i></div>
    ${S.round.map(r => `<div class="stat"><span>${esc(r.q.kind === 'unit' ? r.q.c.name : r.q.pl.name)}</span><b>${r.score} <span class="muted">(${fmtKm(r.d)})</span></b></div>`).join('')}
    </div>
    ${S.shared && S.shared.score != null ? `<div class="sharedbar">${total > S.shared.score ? '🏆 You beat your friend' : total === S.shared.score ? '🤝 A tie with your friend' : 'Your friend wins this one'} (they scored ${S.shared.score}/500).</div>` : ''}
    <div class="row"><button class="btn" id="again">New round</button><button class="btn sec" id="sharer">Share this round${TRAIN.active ? '' : ' and your score'}</button></div>
    ${tapHistory()}`;
  S.total = total; S.roundDone = true;
  document.getElementById('sharer').onclick = () => shareLink();
  document.getElementById('again').onclick = () => advance(() => { S.round = []; S.shared = null; S.roundDone = false; S.plan = planTapRound(); cleanHash(); tapNext(); });
}

// ----- Globle -----
function globleStart() {
  if (!pool().length) return noScope();
  const sharedTarget = ROUTE.t ? decodeUnit(ROUTE.t) : null;
  S.target = sharedTarget && sharedTarget.playable ? sharedTarget : pickTarget(pool());
  S.shared = sharedTarget ? { guesses: ROUTE.g && /^\d+$/.test(ROUTE.g) && +ROUTE.g >= 1 && +ROUTE.g <= CUR.playable.length ? +ROUTE.g : null } : null;
  if (ROUTE.t && !(sharedTarget && sharedTarget.playable)) toast("That shared game's link is damaged, so this is a new hidden " + CUR.def.unit + '.');
  S.guesses = []; S.done = false; S.won = false; S.hintsUsed = 0;
  const nb = S.target.neighbors.size;
  S.hints = [
    ...(REGION === 'All' && S.target.region ? [`Region: ${S.target.region}`] : []),
    nb ? `It has ${nb} land neighbour${nb === 1 ? '' : 's'}.` : 'It has no land borders.',
    `Its name starts with "${S.target.name[0]}".`,
    ...(nb ? [`One of its neighbours is ${[...S.target.neighbors][Math.floor(Math.random() * nb)]}.`] : []),
  ];
  G.hover = false;
  globleRender();
}
function globleRender() {
  const sorted = S.guesses.slice().sort((a, b) => a.d - b.d);
  const games = STATS.globle, avg = games.length ? (games.reduce((a, b) => a + b, 0) / games.length).toFixed(1) : '–';
  panel.innerHTML = `<h2>Hot &amp; Cold <span class="muted small">· hidden ${esc(CUR.def.unit)}</span></h2>
    ${scopeLine()}
    ${S.shared ? `<div class="sharedbar">🔗 Shared game: the same hidden ${esc(CUR.def.unit)} your friend hunted${S.shared.guesses != null ? `. They found it in <b>${S.shared.guesses}</b> guesses` : ''}.</div>` : ''}
    <p class="sub">A mystery ${esc(CUR.def.unit)} from the scope is hidden. Guess any ${esc(CUR.def.unit)}: the warmer the colour, the closer it is. Bordering ones show darkest red.</p>
    ${S.done ? '' : `<form id="gform"><input type="text" id="gq" placeholder="Type a ${esc(CUR.def.unit)} and press Enter" list="glist" autocomplete="off"></form>
    <datalist id="glist">${CUR.playable.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
    <div class="hint" id="gmsg" aria-live="polite"></div><div class="small" id="ghints"></div>`}
    <div class="row small muted" style="margin-top:6px"><span>Guesses: <b>${S.guesses.length}</b></span><span>·</span><span>Games: ${games.length}</span><span>·</span><span>Avg guesses: ${avg}</span></div>
    <div id="gres" aria-live="polite"></div>
    <ul class="glist">${sorted.map(g => `<li><span class="sw" style="background:${g.c === S.target ? cssVar('--ok') : globleColor(g.d)}"></span>${flagImg(g.c)}${esc(g.c.name)}<span class="d">${g.c === S.target ? 'found' : g.d === 0 ? 'borders it' : fmtKm(g.d)}</span></li>`).join('')}</ul>
    <div class="row">${S.done ? '<button class="btn" id="gnew">New game</button>' : `<button class="btn sec" id="ghint" ${S.hintsUsed >= S.hints.length ? 'disabled' : ''}>Hint (${S.hints.length - S.hintsUsed} left)</button> <button class="btn sec" id="ggive">Give up</button>`}</div>
    ${coach(['Open with one guess per continent, spread out: e.g. Mexico, Germany, Egypt, India, Australia. Three or four openers anchor the search.',
      'Treat your warmest guess as the anchor and walk its borders. Dark red means you share a border: list that country\'s neighbours and pick one that explains all previous colours.',
      'If two guesses are equally warm, the target is roughly between them. Stop pushing in a direction once colours cool.',
      'Colours reflect distance between borders, so a huge neighbour (Russia, Brazil) can read red while its far side is thousands of km away.'])}`;
  const f = document.getElementById('gform');
  if (f) {
    const q = document.getElementById('gq'); q.focus();
    f.onsubmit = e => { e.preventDefault(); globleGuess(q.value); q.value = ''; };
    document.getElementById('ggive').onclick = () => globleEnd(false);
    document.getElementById('ghint').onclick = () => { if (S.hintsUsed >= S.hints.length) return; S.hintsUsed++; globleRender(); };
    if (S.hintsUsed) document.getElementById('ghints').innerHTML = S.hints.slice(0, S.hintsUsed).map(h => `<div>💡 ${esc(h)}</div>`).join('');
  }
  const n = document.getElementById('gnew'); if (n) n.onclick = () => advance(() => { resetGlobe(); cleanHash(); globleStart(); });
  G.fill = c => { if (c.level !== CUR.id) return null; const g = S.guesses.find(x => x.c === c); if (g) return c === S.target ? cssVar('--ok') : globleColor(g.d); if (S.done && c === S.target) return cssVar('--ok'); return null; };
  render();
}
function globleGuess(text) {
  const msg = document.getElementById('gmsg');
  if (!normalize(text)) { msg.textContent = ''; return; }
  const { unit: c, suggestions } = resolveUnit(text);
  if (!c) {
    msg.innerHTML = suggestions.length ? `Did you mean ${suggestions.map(u => `<button type="button" class="linkbtn" data-n="${esc(u.name)}">${esc(u.name)}</button>`).join(', ')}?` : `"${esc(text)}" is not in the list.`;
    msg.querySelectorAll('.linkbtn').forEach(b => b.onclick = () => globleGuess(b.dataset.n));
    return;
  }
  if (!c.playable) { msg.textContent = `${c.name} is not a guessable ${CUR.def.unit} here.`; return; }
  if (S.guesses.some(g => g.c === c)) { msg.textContent = `Already guessed ${c.name}.`; return; }
  const d = unitDist(c, S.target);
  S.guesses.push({ c, d });
  flyTo(c.centroid, Math.max(CUR.def.homeZoom, Math.min(G.zoom, CUR.def.homeZoom * 2.2)));
  if (c === S.target) return globleEnd(true);
  globleRender();
  const m = document.getElementById('gmsg');
  m.textContent = d === 0 ? `${c.name} borders the mystery ${CUR.def.unit}.` : `${c.name} is ${fmtKm(d)} away.`;
}
function globleEnd(won) {
  S.done = true; S.won = won;
  if (won) STATS.globle.push(S.guesses.length);
  mark(S.target, !won || S.guesses.length > 8); save();
  globleRender();
  const zg = Math.max(1.2, zoomForUnit(S.target) * 0.8);
  flyTo(S.target.centroid, zg);
  G.markers = [{ p: S.target.anchor, color: cssVar('--ok'), r: 7, label: S.target.name }].concat(contextLabels(S.target.centroid, zg, new Set([S.target])));
  setTimeout(() => revealFeedback('#gres'), 50);
  G.hover = true;
  const nbs = [...S.target.neighbors].sort();
  setTimeout(() => { const b = document.getElementById('gshare'); if (b) b.onclick = () => shareLink(); }, 0);
  document.getElementById('gres').innerHTML = `<div class="card ${won ? 'ok' : 'bad'}"><div class="big">${won ? `Solved in ${S.guesses.length}` : 'Gave up'}</div>
    <div>It was ${flagImg(S.target)}<b>${esc(S.target.name)}</b>${S.target.region ? ' (' + esc(S.target.region) + ')' : ''}.</div>
    ${S.shared && S.shared.guesses != null && won ? `<div style="margin-top:4px">${S.guesses.length < S.shared.guesses ? '🏆 Fewer guesses than your friend' : S.guesses.length === S.shared.guesses ? '🤝 Same as your friend' : 'Your friend was quicker'} (${S.shared.guesses}).</div>` : ''}
    <div style="margin-top:8px"><button class="btn sec" id="gshare">${won ? 'Challenge a friend' : 'Share this game'}</button></div>
    <div class="small muted" style="margin-top:4px">Borders: ${nbs.length ? nbs.map(esc).join(', ') : 'none'}</div></div>`;
}

// ----- Borders (neighbours) -----
function neighborsStart() {
  if (!pool().length) return noScope();
  // Prefer units with land neighbours, but only when there are enough of them; island-heavy scopes keep their islands.
  const withNb = pool().filter(u => u.neighbors.size);
  const share = withNb.length >= 5 ? 0.8 : withNb.length / Math.max(pool().length, 1) + 0.25;
  const t = pickTarget(withNb.length && Math.random() < share ? withNb : pool());
  S.target = t; S.sel = new Set(); S.checked = false;
  const actual = [...t.neighbors].map(n => CUR.byName.get(n)).filter(c => c && c.playable);
  const nDistract = Math.max(3, actual.length);
  const distract = CUR.playable.filter(c => c !== t && !t.neighbors.has(c.name))
    .sort((a, b) => haversine(a.centroid, t.centroid) - haversine(b.centroid, t.centroid)).slice(0, nDistract);
  S.options = shuffle([...actual, ...distract]);
  S.actual = new Set(actual.map(c => c.name));
  flyTo(t.centroid, Math.max(CUR.def.homeZoom, zoomForUnit(t) * 0.7));
  G.fill = c => c === t ? cssVar('--accent') : null;
  neighborsRender();
}
function neighborsRender() {
  const t = S.target;
  const chip = c => { const on = S.sel.has(c.name); let cls = on ? 'on' : '';
    if (S.checked) cls = S.actual.has(c.name) ? (on ? 'ok' : 'miss') : (on ? 'bad' : '');
    return `<button class="chip ${cls}" data-n="${esc(c.name)}">${flagImg(c)}${esc(c.name)}</button>`; };
  const noneOn = S.sel.has('__none'); let noneCls = noneOn ? 'on' : '';
  if (S.checked) noneCls = S.actual.size === 0 ? (noneOn ? 'ok' : 'miss') : (noneOn ? 'bad' : '');
  const st = STATS.streaks.neighbors || 0;
  panel.innerHTML = `<h2>Borders <span class="muted small">· neighbour recall</span></h2>
    ${scopeLine()}
    <p class="sub">Select every ${esc(CUR.def.unit)} that shares a land border with the highlighted one, then check.</p>
    <div class="prompt">${flagImg(t, 'flag big')}${esc(t.name)}</div><div class="hint">${esc(t.region || '')} · running streak ${st}</div>
    <div class="chips">${S.options.map(chip).join('')}<button class="chip ${noneCls}" data-n="__none">No land borders</button></div>
    <div id="nbfb" aria-live="polite"></div>
    <div class="row">${S.checked ? '<button class="btn" id="nbnext">Next</button>' : '<button class="btn" id="nbcheck">Check</button> <button class="btn sec" id="nbskip">Skip</button>'}</div>
    ${coach(['Say neighbours clockwise from the north. A fixed order makes recall reliable under time pressure.',
      'Islands and near-islands are hot-and-cold traps: Sri Lanka, Madagascar, Cuba, Philippines, Japan, Iceland, New Zealand have no land borders.',
      'Remember surprising borders: Russia–North Korea, France–Brazil (French Guiana), Namibia–Zambia (Caprivi), Denmark–Germany only.'])}`;
  panel.querySelectorAll('.chip').forEach(b => b.onclick = () => { if (S.checked) return; const n = b.dataset.n;
    if (n === '__none') { S.sel.clear(); S.sel.add('__none'); } else { S.sel.delete('__none'); S.sel.has(n) ? S.sel.delete(n) : S.sel.add(n); } neighborsRender(); });
  const ck = document.getElementById('nbcheck'); if (ck) ck.onclick = neighborsCheck;
  const sk = document.getElementById('nbskip'); if (sk) sk.onclick = () => { resetGlobe(); neighborsStart(); };
  const nx = document.getElementById('nbnext'); if (nx) nx.onclick = () => advance(() => { resetGlobe(); neighborsStart(); });
}
function neighborsCheck() {
  S.checked = true;
  const picked = new Set([...S.sel].filter(x => x !== '__none'));
  const correct = S.actual.size === 0 ? S.sel.has('__none') && picked.size === 0 : picked.size === S.actual.size && [...picked].every(n => S.actual.has(n));
  STATS.streaks.neighbors = correct ? (STATS.streaks.neighbors || 0) + 1 : 0;
  mark(S.target, !correct);
  const okc = cssVar('--ok'), badc = cssVar('--bad'), warnc = cssVar('--warn');
  G.fill = c => c.level !== CUR.id ? null : c === S.target ? cssVar('--accent') : S.actual.has(c.name) ? (picked.has(c.name) ? okc : warnc) : picked.has(c.name) ? badc : null;
  // Label every option on the map in the same colour as its chip, so the shapes can be matched to the list.
  const colorFor = c => c === S.target ? cssVar('--accent') : S.actual.has(c.name) ? (picked.has(c.name) ? okc : warnc) : picked.has(c.name) ? badc : cssVar('--muted');
  const shown = [S.target, ...S.options];
  G.markers = shown.map(c => ({ p: c.anchor, color: colorFor(c), r: c === S.target ? 7 : 5, label: c.name + (S.actual.has(c.name) ? (picked.has(c.name) ? ' ✓' : ' (missed)') : picked.has(c.name) ? ' ✗' : '') }));
  const group = shown; // frame every option so each labelled marker is on screen
  const fr = frameWithLabels(group, group.map(u => u.anchor), 0.75, 3);
  setTimeout(() => revealFeedback('#nbfb'), 50);
  G.markers = G.markers.concat(contextLabels(fr.center, fr.zoom, new Set(shown)));
  flyTo(fr.center, fr.zoom);
  G.hover = true;
  neighborsRender();
  const missed = [...S.actual].filter(n => !picked.has(n)), wrong = [...picked].filter(n => !S.actual.has(n));
  document.getElementById('nbfb').innerHTML = `<div class="card ${correct ? 'ok' : 'bad'}"><div class="big">${correct ? 'Correct' : 'Not quite'}</div>
    <div class="small">${esc(S.target.name)} borders ${S.actual.size} ${S.actual.size === 1 ? esc(CUR.def.unit) : esc(CUR.def.units)}${S.actual.size ? ': ' + [...S.actual].sort().map(esc).join(', ') : ''}.</div>
    ${missed.length ? `<div class="small" style="color:var(--warn)">Missed: ${missed.map(esc).join(', ')}</div>` : ''}
    ${wrong.length ? `<div class="small" style="color:var(--bad)">Wrong: ${wrong.map(esc).join(', ')}</div>` : ''}
    <div class="small muted" style="margin-top:4px">Map: blue = target, green = correct pick, orange = missed neighbour, red = wrong pick. Each option is labelled.</div></div>`;
  render();
}

// ----- Closer -----
function closerStart() {
  if (pool().length < 1 || CUR.playable.length < 3) return noScope();
  let x, a, b, da, db, tries = 0;
  do {
    x = pickTarget(pool(), false); // record only the final choice, not every rejected try
    const others = CUR.playable.filter(c => c !== x);
    const near = others.sort((p, q) => haversine(p.centroid, x.centroid) - haversine(q.centroid, x.centroid)).slice(0, 40);
    a = pick(near); b = pick(near);
    tries++;
    if (a === b) continue;
    da = unitDist(a, x); db = unitDist(b, x);
  } while ((a === b || Math.abs(da - db) < 0.25 * Math.max(da, db, 1) || (da === 0 && db === 0)) && tries < 60);
  remember(x.key, x.name);
  S.x = x; S.a = a; S.b = b; S.da = da; S.db = db; S.answered = false;
  flyHome();
  closerRender();
}
function closerRender() {
  const st = STATS.streaks.closer || 0;
  panel.innerHTML = `<h2>Closer <span class="muted small">· distance intuition</span></h2>
    ${scopeLine()}
    <p class="sub">Which of the two is closer to the target? Distance is border-to-border, as in hot-and-cold games.</p>
    <div class="hint">Running streak ${st}</div>
    <div class="prompt">${flagImg(S.x, 'flag big')}${esc(S.x.name)}</div>
    <div class="opts" id="copts"><button class="btn" data-k="a">${flagImg(S.a)}${esc(S.a.name)}</button><button class="btn" data-k="b">${flagImg(S.b)}${esc(S.b.name)}</button></div>
    <div id="cfb" aria-live="polite"></div>
    ${coach(['Think in border hops, not map inches: hot-and-cold colours come from the nearest edges of two countries.',
      'Big countries are "close" to a lot: Russia is near Japan, Norway, Alaska and North Korea at once.',
      'Build a mental ruler: Paris–Moscow ≈ 2,500 km, Cairo–Cape Town ≈ 7,200 km, New York–LA ≈ 3,900 km.'])}`;
  panel.querySelectorAll('#copts .btn').forEach(b => b.onclick = () => closerAnswer(b.dataset.k));
}
function closerAnswer(k) {
  if (S.answered) return; S.answered = true;
  const right = S.da < S.db ? 'a' : 'b', correct = k === right;
  STATS.streaks.closer = correct ? (STATS.streaks.closer || 0) + 1 : 0;
  mark(S.x, !correct); save();
  panel.querySelectorAll('#copts .btn').forEach(b => { if (b.dataset.k === right) b.classList.add('ok'); else if (b.dataset.k === k) b.classList.add('bad'); });
  G.fill = c => c === S.x ? cssVar('--accent') : c === S.a ? globleColor(S.da) : c === S.b ? globleColor(S.db) : null;
  G.stroke = c => (c === S.a || c === S.b) ? cssVar('--text') : null;
  G.hover = true;
  const mid = d3.geoInterpolate(S.a.centroid, S.b.centroid)(0.5);
  const spread = Math.max(haversine(S.a.centroid, S.x.centroid), haversine(S.b.centroid, S.x.centroid), haversine(S.a.centroid, S.b.centroid));
  flyTo(d3.geoInterpolate(mid, S.x.centroid)(0.5), Math.max(1, Math.min(8, 6000 / Math.max(spread, 600))));
  setTimeout(() => revealFeedback('#cfb'), 50);
  document.getElementById('cfb').innerHTML = `<div class="card ${correct ? 'ok' : 'bad'}"><div class="big">${correct ? 'Correct' : 'Wrong'}</div>
    <div class="stat"><span>${esc(S.a.name)}</span><b>${S.da === 0 ? 'borders' : fmtKm(S.da)}</b></div>
    <div class="stat"><span>${esc(S.b.name)}</span><b>${S.db === 0 ? 'borders' : fmtKm(S.db)}</b></div>
    <div style="margin-top:8px"><button class="btn" id="cnext">Next</button></div></div>`;
  document.getElementById('cnext').onclick = () => advance(() => { resetGlobe(); closerStart(); });
  render();
}

// ----- Name It -----
function nameitStart() {
  if (!pool().length || CUR.playable.length < 4) return noScope();
  const t = pickTarget(pool());
  const near = CUR.playable.filter(c => c !== t).sort((p, q) => haversine(p.centroid, t.centroid) - haversine(q.centroid, t.centroid)).slice(0, 10);
  S.t = t; S.opts = shuffle([t, ...shuffle(near).slice(0, 3)]); S.answered = false;
  G.fill = c => c === t ? cssVar('--accent') : null;
  const zn = Math.max(CUR.def.homeZoom, zoomForUnit(t) * 0.8);
  flyTo(t.centroid, zn); // no labels before answering; context labels appear with the answer
  nameitRender();
}
function nameitRender() {
  const st = STATS.streaks.nameit || 0;
  panel.innerHTML = `<h2>Name It <span class="muted small">· shape and position</span></h2>
    ${scopeLine()}
    <p class="sub">Which ${esc(CUR.def.unit)} is highlighted? No labels, no neighbours: just shape and position.</p>
    <div class="hint">Running streak ${st}</div>
    <div class="opts" id="nopts">${S.opts.map((c, i) => `<button class="btn" data-i="${i}">${esc(c.name)}</button>`).join('')}</div>
    <div id="nfb" aria-live="polite"></div>
    ${coach(['Distractors are always nearby, so this trains exactly the confusions that cost placement points.',
      CUR.isWorld ? 'Common swaps: Niger/Nigeria, Slovakia/Slovenia, Zambia/Zimbabwe, Guinea/Guinea-Bissau, Paraguay/Uruguay, Latvia/Lithuania, Oman/Yemen.'
        : `Note each ${esc(CUR.def.unit)}'s outline against its neighbours: a coast, a straight border or a notch is usually what gives it away.`])}`;
  panel.querySelectorAll('#nopts .btn').forEach(b => b.onclick = () => nameitAnswer(+b.dataset.i));
}
function nameitAnswer(i) {
  if (S.answered) return; S.answered = true;
  const correct = S.opts[i] === S.t;
  STATS.streaks.nameit = correct ? (STATS.streaks.nameit || 0) + 1 : 0;
  mark(S.t, !correct); save();
  panel.querySelectorAll('#nopts .btn').forEach(b => { const c = S.opts[+b.dataset.i]; if (c === S.t) b.classList.add('ok'); else if (+b.dataset.i === i) b.classList.add('bad'); });
  G.hover = true;
  G.markers = contextLabels(S.t.centroid, G.zoom, new Set([S.t])).concat(S.opts.filter(c => c !== S.t).map(c => ({ p: c.anchor, label: c.name, textOnly: true })));
  render();
  const nbs = [...S.t.neighbors].sort();
  setTimeout(() => revealFeedback('#nfb'), 50);
  document.getElementById('nfb').innerHTML = `<div class="card ${correct ? 'ok' : 'bad'}"><div class="big">${flagImg(S.t, 'flag big')}${correct ? 'Correct' : 'It was ' + esc(S.t.name)}</div>
    <div class="small muted">${esc(S.t.region || '')}${S.t.capital ? ' · Capital: ' + esc(S.t.capital) : ''}${nbs.length ? ' · Borders: ' + nbs.map(esc).join(', ') : ' · No land borders'}</div>
    <div style="margin-top:8px"><button class="btn" id="nnext">Next</button></div></div>`;
  document.getElementById('nnext').onclick = () => advance(() => { resetGlobe(); nameitStart(); });
  render();
}

// ----- Flags -----
function flagsStart() {
  if (!CUR.isWorld) {
    panel.innerHTML = `<h2>Flags</h2><p class="sub">Flags are available on the World level.</p><div class="row"><button class="btn" id="toworld">Switch to World</button></div>`;
    document.getElementById('toworld').onclick = () => setLevel('world');
    return;
  }
  const cands = pool().filter(flagCode);
  if (cands.length < 4 && CUR.playable.filter(flagCode).length < 4) return noScope();
  const t = pickTarget(cands.length ? cands : CUR.playable.filter(flagCode));
  const near = CUR.playable.filter(c => c !== t && flagCode(c)).sort((p, q) => haversine(p.centroid, t.centroid) - haversine(q.centroid, t.centroid)).slice(0, 12);
  S.t = t; S.opts = shuffle([t, ...shuffle(near).slice(0, 3)]); S.answered = false;
  flagsRender();
}
function flagsRender() {
  const st = STATS.streaks.flags || 0;
  panel.innerHTML = `<h2>Flags <span class="muted small">· whose flag?</span></h2>
    ${scopeLine()}
    <p class="sub">Name the country. Options are neighbours, so similar regional flags are the test.</p>
    <div class="hint">Running streak ${st}</div>
    <div class="flagstage"><img src="data/flags/${flagCode(S.t)}.svg" alt="Flag to identify"></div>
    <div class="opts" id="fopts">${S.opts.map((c, i) => `<button class="btn" data-i="${i}">${esc(c.name)}</button>`).join('')}</div>
    <div id="ffb" aria-live="polite"></div>
    ${coach(['Group flags by family: Pan-African (green, yellow, red), Pan-Arab (red, white, black, green), Nordic crosses, Pan-Slavic tricolours, Central American blue-white-blue.',
      'Lookalikes worth drilling: Chad/Romania, Indonesia/Monaco, Australia/New Zealand, Ireland/Côte d\'Ivoire, Norway/Iceland, Senegal/Mali/Guinea.'])}`;
  panel.querySelectorAll('#fopts .btn').forEach(b => b.onclick = () => flagsAnswer(+b.dataset.i));
}
function flagsAnswer(i) {
  if (S.answered) return; S.answered = true;
  const correct = S.opts[i] === S.t;
  STATS.streaks.flags = correct ? (STATS.streaks.flags || 0) + 1 : 0;
  mark(S.t, !correct); save();
  panel.querySelectorAll('#fopts .btn').forEach(b => { const c = S.opts[+b.dataset.i]; if (c === S.t) b.classList.add('ok'); else if (+b.dataset.i === i) b.classList.add('bad'); });
  G.fill = c => c === S.t ? cssVar('--accent') : null;
  const z = Math.max(1, zoomForUnit(S.t) * 0.8);
  flyTo(S.t.centroid, z);
  G.markers = contextLabels(S.t.centroid, z, new Set([S.t]));
  G.hover = true;
  const nbs = [...S.t.neighbors].sort();
  setTimeout(() => revealFeedback('#ffb'), 50);
  document.getElementById('ffb').innerHTML = `<div class="card ${correct ? 'ok' : 'bad'}"><div class="big">${correct ? 'Correct' : 'It was ' + esc(S.t.name)}</div>
    <div class="small muted">${esc(S.t.region || '')}${S.t.capital ? ' · Capital: ' + esc(S.t.capital) : ''}${nbs.length ? ' · Borders: ' + nbs.map(esc).join(', ') : ' · No land borders'}</div>
    <div style="margin-top:8px"><button class="btn" id="fnext">Next</button></div></div>`;
  document.getElementById('fnext').onclick = () => advance(() => { resetGlobe(); flagsStart(); });
  render();
}

// ----- Street clues -----
const CLUE_LABELS = { drive: 'Drives on the', lines: 'Road lines', bollards: 'Bollards', poles: 'Utility poles', signs: 'Signs', plates: 'Plates', car: 'Camera car', lang: 'Language', tld: 'Domain', other: 'Also' };
function clueRows(u, keys) {
  const c = window.CLUES[u.name]; if (!c) return '';
  return `<div class="clues">${(keys || Object.keys(c)).filter(k => c[k]).map(k => `<div class="clue"><span class="ck">${CLUE_LABELS[k] || k}</span><span>${esc(c[k])}</span></div>`).join('')}</div>`;
}
function clueCard(u) {
  if (!window.CLUES[u.name]) return '';
  return `<details class="cluebox" open><summary>Street clues${u.capital ? ` · capital ${esc(u.capital)}` : ''}</summary>${clueRows(u)}</details>`;
}
function cluesStart() {
  if (!CUR.isWorld) {
    panel.innerHTML = `<h2>Clues</h2><p class="sub">Street clues are available on the World level.</p><div class="row"><button class="btn" id="toworld">Switch to World</button></div>`;
    document.getElementById('toworld').onclick = () => setLevel('world');
    return;
  }
  const has = u => !!window.CLUES[u.name];
  const all = CUR.playable.filter(has), cands = pool().filter(has);
  if (all.length < 4) return noScope();
  const t = pickTarget(cands.length ? cands : all);
  const byDist = all.filter(c => c !== t).sort((p, q) => haversine(p.centroid, t.centroid) - haversine(q.centroid, t.centroid));
  const cont = byDist.filter(c => c.region === t.region).slice(0, 12);
  const base = cont.length >= 3 ? cont : byDist.slice(0, 12);
  const sameSide = base.filter(c => window.CLUES[c.name].drive === window.CLUES[t.name].drive);
  S.t = t; S.opts = shuffle([t, ...shuffle(sameSide.length >= 3 ? sameSide : base).slice(0, 3)]); S.answered = false;
  const keys = shuffle(Object.keys(window.CLUES[t.name]).filter(k => k !== 'tld'));
  S.shown = keys.slice(0, 3); S.hidden = keys.slice(3);
  cluesRender();
}
function cluesRender() {
  const st = STATS.streaks.clues || 0;
  panel.innerHTML = `<h2>Clues <span class="muted small">· what you'd see on the street</span></h2>
    ${scopeLine()}
    <p class="sub">Which country matches these clues? Options share the driving side and region, so the details decide it.</p>
    <div class="hint">Running streak ${st}</div>
    ${clueRows(S.t, S.shown)}
    <div class="row" style="margin:6px 0 10px">${S.hidden.length ? '<button class="btn sec" id="morec">Reveal another clue</button>' : ''}</div>
    <div class="opts" id="clopts">${S.opts.map((c, i) => `<button class="btn" data-i="${i}">${esc(c.name)}</button>`).join('')}</div>
    <div id="clfb" aria-live="polite"></div>
    ${coach(['Order of checks on a real round: driving side, then road-line colours, then script and language, then plates, poles and bollards.',
      'Camera-car quirks are the fastest tells: Kenya snorkel, Ghana tape, Nigeria follow car, Senegal and Mongolia visible car.',
      'Yellow centre lines point to the Americas and a few others (Norway, older Finnish imagery, Japan where overtaking is banned); all-white lines suggest most of Europe.'])}`;
  const m = document.getElementById('morec'); if (m) m.onclick = () => { S.shown.push(S.hidden.shift()); cluesRender(); };
  panel.querySelectorAll('#clopts .btn').forEach(b => b.onclick = () => cluesAnswer(+b.dataset.i));
}
function cluesAnswer(i) {
  if (S.answered) return; S.answered = true;
  const correct = S.opts[i] === S.t;
  STATS.streaks.clues = correct ? (STATS.streaks.clues || 0) + 1 : 0;
  mark(S.t, !correct); save();
  panel.querySelectorAll('#clopts .btn').forEach(b => { const c = S.opts[+b.dataset.i]; if (c === S.t) b.classList.add('ok'); else if (+b.dataset.i === i) b.classList.add('bad'); });
  G.fill = c => c === S.t ? cssVar('--accent') : null;
  const z = Math.max(1, zoomForUnit(S.t) * 0.8);
  flyTo(S.t.centroid, z);
  G.markers = contextLabels(S.t.centroid, z, new Set([S.t]));
  G.hover = true;
  setTimeout(() => revealFeedback('#clfb'), 50);
  document.getElementById('clfb').innerHTML = `<div class="card ${correct ? 'ok' : 'bad'}"><div class="big">${flagImg(S.t, 'flag big')}${correct ? 'Correct' : 'It was ' + esc(S.t.name)}</div>
    <div class="small muted">${esc(S.t.region || '')}${S.t.capital ? ' · Capital: ' + esc(S.t.capital) : ''}</div>
    ${clueRows(S.t)}
    <div style="margin-top:8px"><button class="btn" id="clnext">Next</button></div></div>`;
  document.getElementById('clnext').onclick = () => advance(() => { resetGlobe(); cluesStart(); });
  render();
}

// ----- Stats -----
document.getElementById('statsbtn').onclick = () => openStats();
function openStats() {
  stashView();
  resetGlobe(); G.hover = true; [...nav.children].forEach(b => b.classList.remove('on')); mode = 'stats'; updateLabelButton(); syncHash();
  if (tourTimer) { clearInterval(tourTimer); tourTimer = null; }
  const rows = Object.entries(STATS.units).filter(([, v]) => v.seen >= 2 && v.miss > 0).map(([k, v]) => ({ k, rate: v.miss / v.seen, ...v })).sort((a, b) => b.rate - a.rate || b.seen - a.seen);
  const weak = rows.slice(0, 20);
  const g = STATS.globle, gavg = g.length ? (g.reduce((a, b) => a + b, 0) / g.length).toFixed(1) : '–', gbest = g.length ? Math.min(...g) : '–';
  const t = tapRounds(CUR.id), tavg = t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : '–', tbest = t.length ? Math.max(...t) : '–';
  const seen = CUR.playable.filter(u => STATS.units[u.key]).length;
  G.fill = c => { const s = STATS.units[c.key]; if (!s) return null; return d3.interpolateRgb(cssVar('--ok'), cssVar('--bad'))(s.miss / s.seen); };
  flyHome();
  panel.innerHTML = `<h2>Your stats</h2><p class="sub">Globe shows every ${esc(CUR.def.unit)} you have met: green = reliable, red = keeps costing you. Unseen ones stay neutral.</p>
    <div class="card"><div class="stat"><span>Hot &amp; Cold games</span><b>${g.length}</b></div><div class="stat"><span>Hot &amp; Cold avg guesses</span><b>${gavg}</b></div><div class="stat"><span>Hot &amp; Cold best</span><b>${gbest}</b></div>
    <div class="stat"><span>Tap rounds (${esc(CUR.def.label.split(' · ')[0])})</span><b>${t.length}</b></div><div class="stat"><span>Tap avg / best (of 500)</span><b>${tavg} / ${tbest}</b></div>
    <div class="stat"><span>${esc(CUR.def.units)} met in this level</span><b>${seen} / ${CUR.playable.length}</b></div></div>
    <h2 style="margin-top:14px">Weak spots</h2>
    <p class="muted small">Places you have seen at least twice and missed at least once. They come up more often in every mode.</p>
    ${weak.length ? weak.map(r => `<div class="stat"><span>${r.level === 'world' ? flagImg(WORLD.byName.get(r.name)) : ''}${esc(r.name)} <span class="muted small">${r.level === 'world' ? '' : esc(LEVEL_DEFS[r.level].label.split(' · ')[0])}</span></span><b>${r.miss} of ${r.seen} missed</b></div>`).join('') : '<p class="muted small">Nothing yet. Play a few rounds.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn sec" id="reset">Reset all stats</button></div>
    <div class="small muted" id="appver" style="margin-top:10px"></div>`;
  document.getElementById('appver').textContent = 'App version ' + APP_VERSION;
  document.getElementById('reset').onclick = () => {
    if (!confirm('Erase all progress?')) return;
    STATS = { units: {}, globle: [], tap: [], streaks: {} }; save();
    try { localStorage.removeItem('geodrill.program'); } catch (e) {}
    for (const k of Object.keys(RECENT)) delete RECENT[k];
    saveRecent();
    openStats();
  };
  render();
}

// ----- Theme -----
document.getElementById('themebtn').onclick = () => {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('geodrill.theme', document.documentElement.dataset.theme); } catch (e) {}
  render();
};
try { const th = localStorage.getItem('geodrill.theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) {}

// ---------- Boot ----------
loadLevel('world').then(w => {
  WORLD = w; CUR = w;
  resize();
  return applyRoute(location.hash).then(routed => {
    if (routed) return;
    const params = new URLSearchParams(location.search);
    const lv = LEVEL_DEFS[params.get('level')] ? params.get('level') : 'world';
    const deep = params.has('level') || params.has('region');
    return setLevel(lv, params.get('region') || 'All', deep ? 'study' : 'train');
  });
}).then(() => {
  // Test/automation hook: lets a script "tap" at a latitude/longitude it believes is right, and inspect state.
  window.__geo = {
    levels: LEVEL_DEFS, get level() { return CUR; }, get world() { return WORLD; }, get region() { return REGION; }, get mode() { return mode; },
    pool, unitDist, findUnit, unitAt, pointToUnitDist, setMode, setLevel,
    tapLatLon(lat, lon) { if (!G.onTap) return false; G.onTap([lon, lat]); return true; },
    render, get G() { return G; }, get TRAIN() { return TRAIN; }, applyRoute, routePath, shareLink,
  };
}).catch(err => { document.getElementById('loading').textContent = 'Could not load map data: ' + err; console.error(err); });
})();
