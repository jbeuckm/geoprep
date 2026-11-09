/* GeoDrill — practice for MapTap (tap a place on the globe) and Globle (hot/cold country guessing).
   Levels: world countries plus sub-national units (US, India, China, Brazil, Canada, Australia).
   Scope: any level can be narrowed to a region; every drill and the study guide respect it. */
(() => {
'use strict';

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
  india:     { label: 'India · states & UTs',       url: 'data/admin1/india.json',    object: 'units', unit: 'state', units: 'states', parent: 'India', home: [80, 22], homeZoom: 4, decay: 200 },
  china:     { label: 'China · provinces',          url: 'data/admin1/china.json',    object: 'units', unit: 'province', units: 'provinces', parent: 'China', home: [104, 36], homeZoom: 2.8, decay: 300 },
  brazil:    { label: 'Brazil · states',            url: 'data/admin1/brazil.json',   object: 'units', unit: 'state', units: 'states', parent: 'Brazil', home: [-53, -12], homeZoom: 3, decay: 300 },
  canada:    { label: 'Canada · provinces',         url: 'data/admin1/canada.json',   object: 'units', unit: 'province', units: 'provinces', parent: 'Canada', home: [-96, 60], homeZoom: 2, decay: 400 },
  australia: { label: 'Australia · states',         url: 'data/admin1/australia.json',object: 'units', unit: 'state', units: 'states', parent: 'Australia', home: [134, -27], homeZoom: 3, decay: 400 },
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
const RECENT = {}; // mode+level -> recent target keys, to avoid immediate repeats
function pickTarget(list) {
  const key = mode + ':' + (CUR ? CUR.id : '');
  const rec = RECENT[key] || (RECENT[key] = []);
  const avoid = new Set(rec.slice(-Math.min(8, list.length - 1)));
  const cands = list.filter(u => !avoid.has(u.key));
  const u = weightedPick(cands.length ? cands : list);
  rec.push(u.key); if (rec.length > 50) rec.shift();
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
function buildLevel(id, topo) {
  const def = LEVEL_DEFS[id], isWorld = id === 'world';
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
      for (const poly of polys) { const geo = { type: 'Polygon', coordinates: poly }; g.pieces.push({ p: d3.geoCentroid(geo), a: d3.geoArea(geo) }); }
    }
    g.pieces = g.pieces.sort((x, y) => y.a - x.a).map(x => x.p);
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
function scopedPlaces(kinds) {
  if (REGION === 'All') return CUR.places.filter(pl => kinds[pl.kind]);
  const inScope = new Set(pool().map(u => u.name));
  return CUR.places.filter(pl => kinds[pl.kind] && pl.units.some(u => inScope.has(u.name)));
}
function findUnit(text) { return CUR.lookup.get(normalize(text)) || null; }
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
    // Big neighbour whose centre is off-screen: label it just inside its nearest visible edge (pixel inset applied at draw time).
    let best = null, bd = radius * 0.95;
    for (const v of u.vertices) { const d = d3.geoDistance(v, center); if (d < bd) { bd = d; best = v; } }
    if (best) out.push({ u, p: best, edge: true });
  }
  return out.sort((a, b) => b.u.area - a.u.area).slice(0, max).map(x => ({ p: x.p, label: x.u.name, textOnly: true, edge: !!x.edge }));
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
      let lx = x, ly = y;
      if (m.edge) { // nudge an edge label a fixed 16px toward the view centre so it sits inside its own country
        const dx = G.w / 2 - x, dy = G.h / 2 - y, L = Math.hypot(dx, dy) || 1; lx = x + dx / L * 16; ly = y + dy / L * 16;
      }
      const tw = ctx.measureText(m.label).width, w = tw + 6, h = 15, r = { x: lx - w / 2, y: ly - h / 2, w, h };
      if (!hits(r)) { placed.push(r); ctx.fillStyle = cssVar('--panel-faint'); ctx.fillRect(r.x, r.y, w, h); ctx.fillStyle = cssVar('--muted'); ctx.fillText(m.label, lx, ly); }
      ctx.textAlign = 'start'; continue;
    }
    ctx.beginPath(); ctx.arc(x, y, m.r || 6, 0, 2 * Math.PI); ctx.fillStyle = m.color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    if (m.label) {
      ctx.font = '600 12px system-ui, sans-serif'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(m.label).width, w = tw + 8, h = 18;
      const candidates = [{ x: x + 9, y: y - 9 }, { x: x - 9 - w, y: y - 9 }, { x: x - w / 2, y: y + 10 }, { x: x - w / 2, y: y - 10 - h }];
      let r = candidates.find(c => !hits({ x: c.x, y: c.y, w, h })) || candidates[0];
      r = { x: r.x, y: r.y, w, h }; placed.push(r);
      ctx.fillStyle = cssVar('--panel'); ctx.fillRect(r.x, r.y, w, h);
      ctx.fillStyle = cssVar('--text'); ctx.fillText(m.label, r.x + 4, r.y + h / 2);
    }
  }
  ctx.beginPath(); G.path({ type: 'Sphere' }); ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke();
}
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
    if (Math.hypot(dx, dy) > 4) moved = true;
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
function setZoom(z) { G.zoom = Math.max(0.6, Math.min(48, z)); renderCoarse(); }
document.getElementById('zin').onclick = () => setZoom(G.zoom * 1.4);
document.getElementById('zout').onclick = () => setZoom(G.zoom / 1.4);
document.getElementById('zreset').onclick = flyHome;
window.addEventListener('resize', resize);
function resetGlobe() { G.fill = () => null; G.stroke = () => null; G.markers = []; G.lines = []; G.onTap = null; G.hover = false; G.hoverName = null; canvas.classList.remove('tap'); tip.style.display = 'none'; }

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
  document.getElementById('loading').style.display = 'flex';
  CUR = await loadLevel(id); REGION = region;
  document.getElementById('loading').style.display = 'none';
  levelSel.value = id; fillRegionSelect();
  distCache.clear();
  setMode(modeId || mode || 'study');
  flyHome();
}
levelSel.onchange = () => { trainStop(true); setLevel(levelSel.value); };
regionSel.onchange = () => { trainStop(true); REGION = regionSel.value; setMode(mode); flyHome(); };
function scopeLabel() { return (REGION === 'All' ? CUR.def.label.split(' · ')[0] : REGION); }

// ---------- Modes ----------
const panel = document.getElementById('panel');
const MODES = [['train', 'Train'], ['study', 'Study'], ['explore', 'Explore'], ['tap', 'Tap'], ['globle', 'Hot & Cold'], ['neighbors', 'Borders'], ['closer', 'Closer'], ['nameit', 'Name It'], ['flags', 'Flags'], ['clues', 'Clues']];
let mode = null, S = {}, tourTimer = null;
const nav = document.getElementById('nav');
MODES.forEach(([id, label]) => { const b = document.createElement('button'); b.textContent = label; b.dataset.id = id; b.onclick = () => { if (id !== 'train') trainStop(true); setMode(id); }; nav.appendChild(b); });
function setMode(id) {
  mode = id; S = {};
  if (tourTimer) { clearInterval(tourTimer); tourTimer = null; }
  [...nav.children].forEach(b => b.classList.toggle('on', b.dataset.id === id));
  resetGlobe(); render();
  ({ train: trainLanding, study: studyStart, explore, tap: tapStart, globle: globleStart, neighbors: neighborsStart, closer: closerStart, nameit: nameitStart, flags: flagsStart, clues: cluesStart })[id]();
}
function revealFeedback(sel) {
  if (window.innerWidth > 860) return;
  const el = document.querySelector(sel), side = document.getElementById('side');
  if (!el || !el.firstElementChild) return;
  const top = el.firstElementChild.getBoundingClientRect().top - side.getBoundingClientRect().top + side.scrollTop - 8;
  side.scrollTo({ top, behavior: 'smooth' }); // scroll the panel only, never the document
}
function coach(items) { return `<div class="coach"><b>Coach</b><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`; }
function scopeLine() { return `<div class="scopeline">Scope: <b>${esc(scopeLabel())}</b> · ${pool().length} ${esc(CUR.def.units)}</div>`; }
function noScope() { panel.innerHTML = `<h2>Nothing in scope</h2><p class="sub">This region has no playable ${esc(CUR.def.units)}. Pick another region above.</p>`; return true; }

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
  const entries = Object.entries(table).filter(([m]) => !(m === TRAIN.lastMode && Object.keys(table).length > 1));
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
  TRAIN.active = true; TRAIN.program = program; TRAIN.sets = 0; TRAIN.lastTopic = null; TRAIN.lastMode = null; TRAIN.reviewed = false;
  try { localStorage.setItem('geodrill.program', program); } catch (e) {}
  trainNextSet();
}
function trainStop(silent) {
  if (!TRAIN.active) return;
  TRAIN.active = false; TRAIN.phase = 'run'; trainBar();
  if (!silent) setMode('train');
}
async function trainRunSet(topic) {
  TRAIN.topic = topic; TRAIN.phase = 'run'; TRAIN.sets++;
  const m = pickMode(TRAIN.program, topic.level);
  TRAIN.lastMode = m; TRAIN.remaining = (m === 'tap' || m === 'globle') ? 1 : 5; TRAIN.setSeen = 0; TRAIN.setMiss = 0;
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
  el.innerHTML = `<div class="tbt">Training for ${esc(p.label)} · set ${TRAIN.sets}${TRAIN.phase === 'review' ? ' · review' : ` · ${esc(modeLabel)}${TRAIN.remaining > 1 ? ` (${TRAIN.remaining} left)` : ''}`}</div>
    <div>${esc(TRAIN.topic.label)} <span class="muted">· ${reason}</span></div>
    <div class="row">${TRAIN.phase === 'review' ? '<button class="btn" id="tbquiz">Quiz me again</button>' : '<button class="btn sec" id="tbskip">Skip topic</button>'}<button class="btn sec" id="tbstop">Stop</button></div>`;
  const q = document.getElementById('tbquiz'); if (q) q.onclick = () => trainRunSet(TRAIN.topic);
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
  const row = u => `<div class="urow" data-n="${esc(u.name)}"><span class="un">${flagImg(u)}${esc(u.name)}</span><span class="uc muted">${u.capital ? esc(u.capital) : ''}</span><span class="ub muted">${u.neighbors.size ? u.neighbors.size + ' nb' : 'island'}${u.places && u.places.length ? ' · ' + u.places.length + ' pl' : ''}</span></div>`;
  panel.innerHTML = `<h2>Study guide</h2>
    ${scopeLine()}
    <p class="sub">Click a ${esc(CUR.def.unit)} to fly to it and see its neighbours. Then drill the same scope with the buttons below.</p>
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
  function showUnit(c) {
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
    <input type="text" id="exq" placeholder="Fly to…" list="clist" autocomplete="off">
    <datalist id="clist">${CUR.playable.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
    <div id="exinfo"></div>
    ${coach(['Learn clusters, not single countries: the Sahel strip, the Stans, the Balkans, the Gulf, Central America, the Guianas.',
      'For each country, know at least one neighbour in each direction. Hot-and-cold games are solved by walking borders.',
      'Note where a country is <i>not</i>: Mongolia touches only Russia and China. Portugal touches only Spain.'])}`;
  const q = document.getElementById('exq');
  q.addEventListener('change', () => { const c = findUnit(q.value); if (c) showUnit(c); });
  G.onTap = p => { const c = unitAt(p); if (c) showUnit(c); };
  function showUnit(c) {
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
  tapNext();
}
function tapNext() {
  resetGlobe(); canvas.classList.add('tap');
  const units = pool(), places = scopedPlaces(S.cats);
  if (!S.cats.unit && !places.length) S.cats.unit = true;
  let q;
  const unitShare = places.length ? 0.6 : 1;
  if (S.cats.unit && Math.random() < unitShare) q = { kind: 'unit', c: pickTarget(units) };
  else if (places.length) { // choose a unit (weighted) first, then one of its places, so place-rich units do not dominate
    const byUnit = new Map(); for (const pl of places) for (const u of pl.units) { if (!byUnit.has(u)) byUnit.set(u, []); byUnit.get(u).push(pl); }
    const u = byUnit.size ? weightedPick([...byUnit.keys()]) : null;
    q = { kind: 'place', pl: u ? pick(byUnit.get(u)) : pick(places) };
  }
  else q = { kind: 'unit', c: pickTarget(units) };
  if (units.length + places.length > 8 && S.round.some(r => r.q.kind === q.kind && (q.kind === 'unit' ? r.q.c === q.c : r.q.pl === q.pl))) return tapNext();
  S.q = q; S.answered = false;
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
    <div class="row small muted"><span>Question ${idx} / ${S.n}</span><span>·</span><span>Round score ${total}</span></div>
    <div class="scorebar"><i style="width:${total / S.n}%"></i></div>
    <div class="prompt">${q.kind === 'unit' ? flagImg(q.c, 'flag big') : ''}${esc(label)}</div>
    <div class="hint">${esc(kindTxt)}${q.kind === 'place' ? ` · <a href="#" id="revealc">show ${esc(CUR.def.unit)}</a>` : ''}</div>
    <p class="sub">Rotate and zoom the globe, then tap where it is. Inside the border = 100; otherwise points fall off with distance.</p>
    <div id="tapfb"></div>
    <div class="row" style="margin-top:8px">
      <label class="cb"><input type="checkbox" data-cat="unit" ${S.cats.unit ? 'checked' : ''}> ${esc(CUR.def.units)}</label>
      <label class="cb"><input type="checkbox" data-cat="capital" ${S.cats.capital ? 'checked' : ''}> Capitals</label>
      ${CUR.places.some(pl => pl.kind === 'city') ? `<label class="cb"><input type="checkbox" data-cat="city" ${S.cats.city ? 'checked' : ''}> Cities</label>` : ''}
      ${CUR.places.some(pl => pl.kind === 'landmark') ? `<label class="cb"><input type="checkbox" data-cat="landmark" ${S.cats.landmark ? 'checked' : ''}> Landmarks</label>` : ''}
    </div>
    ${tapHistory()}
    ${coach(['Anchor on coastlines and big shapes first, then count units inward from the edge you know.',
      'For capitals, know which side of the territory they sit on. Many are coastal or near a border.',
      'Zoom in before tapping. A tap inside the border scores full marks, so a careful tap beats a quick one.'])}`;
  panel.querySelectorAll('input[data-cat]').forEach(cb => cb.onchange = () => { S.cats[cb.dataset.cat] = cb.checked; });
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
  S.round.push({ q, score, d });
  const okc = cssVar('--ok'), badc = cssVar('--bad');
  if (q.kind === 'unit') G.fill = x => x === q.c ? okc : null;
  G.markers = [{ p: target, color: okc, label: q.kind === 'unit' ? (inside ? q.c.name : q.c.name + ' border') : q.pl.name }];
  if (!inside) { G.markers.push({ p, color: badc, label: 'you' }); G.lines = [{ a: p, b: target }]; }
  G.hover = true;
  // Frame both dots: pick a zoom where the miss spans roughly a third of the globe view, so near misses are still visible.
  const mid = d3.geoInterpolate(p, target)(0.5);
  let zt, ct;
  if (inside) { ct = target; zt = q.kind === 'unit' ? Math.max(1.2, zoomForUnit(q.c) * 0.9) : Math.max(G.zoom, 6); }
  else { const theta = d3.geoDistance(p, target); ct = mid; zt = Math.max(1, Math.min(24, 0.7 / Math.max(theta, 1e-4))); }
  flyTo(ct, zt);
  G.markers = G.markers.concat(contextLabels(ct, zt, new Set(q.kind === 'unit' ? [q.c] : q.pl.units)));
  const cls = score >= 80 ? 'ok' : score >= 40 ? 'warn' : 'bad';
  setTimeout(() => revealFeedback('#tapfb'), 50);
  const msg = inside ? (q.kind === 'unit' ? 'Inside the border. Full marks.' : 'Dead on.') : `You were <b>${fmtKm(d)}</b> off${q.kind === 'unit' ? ' from the border' : ''}.`;
  const done = S.round.length >= S.n;
  document.getElementById('tapfb').innerHTML = `<div class="card ${cls}"><div class="big">${score} pts</div><div>${msg}</div>
    ${q.kind === 'place' ? `<div class="small muted">${esc(q.pl.name)} is in ${esc(q.pl.where)}.</div>` : ''}
    <div style="margin-top:8px"><button class="btn" id="tapnext">${done ? 'See round summary' : 'Next'}</button></div></div>`;
  document.getElementById('tapnext').onclick = () => done ? tapSummary() : tapNext();
  render();
}
function tapSummary() {
  const total = S.round.reduce((a, r) => a + r.score, 0);
  STATS.tap.push({ t: total, level: CUR.id }); save();
  resetGlobe(); G.hover = true;
  G.markers = S.round.map(r => ({ p: r.q.kind === 'unit' ? r.q.c.centroid : r.q.pl.p, color: r.score >= 80 ? cssVar('--ok') : r.score >= 40 ? cssVar('--warn') : cssVar('--bad'), r: 5 }));
  flyHome(); render();
  panel.innerHTML = `<h2>Round complete</h2>
    <div class="card"><div class="big">${total} / ${S.n * 100}</div><div class="scorebar"><i style="width:${total / S.n}%"></i></div>
    ${S.round.map(r => `<div class="stat"><span>${esc(r.q.kind === 'unit' ? r.q.c.name : r.q.pl.name)}</span><b>${r.score} <span class="muted">(${fmtKm(r.d)})</span></b></div>`).join('')}
    </div>
    <div class="row"><button class="btn" id="again">New round</button></div>
    ${tapHistory()}`;
  document.getElementById('again').onclick = () => advance(() => { S.round = []; tapNext(); });
}

// ----- Globle -----
function globleStart() {
  if (!pool().length) return noScope();
  S.target = pickTarget(pool()); S.guesses = []; S.done = false;
  G.hover = false;
  globleRender();
}
function globleRender() {
  const sorted = S.guesses.slice().sort((a, b) => a.d - b.d);
  const games = STATS.globle, avg = games.length ? (games.reduce((a, b) => a + b, 0) / games.length).toFixed(1) : '–';
  panel.innerHTML = `<h2>Hot &amp; Cold <span class="muted small">· hidden ${esc(CUR.def.unit)}</span></h2>
    ${scopeLine()}
    <p class="sub">A mystery ${esc(CUR.def.unit)} from the scope is hidden. Guess any ${esc(CUR.def.unit)}: the warmer the colour, the closer it is. Bordering ones show darkest red.</p>
    ${S.done ? '' : `<form id="gform"><input type="text" id="gq" placeholder="Type a ${esc(CUR.def.unit)} and press Enter" list="glist" autocomplete="off"></form>
    <datalist id="glist">${CUR.playable.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
    <div class="hint" id="gmsg"></div>`}
    <div class="row small muted" style="margin-top:6px"><span>Guesses: <b>${S.guesses.length}</b></span><span>·</span><span>Games: ${games.length}</span><span>·</span><span>Avg guesses: ${avg}</span></div>
    <div id="gres"></div>
    <ul class="glist">${sorted.map(g => `<li><span class="sw" style="background:${g.c === S.target ? cssVar('--ok') : globleColor(g.d)}"></span>${flagImg(g.c)}${esc(g.c.name)}<span class="d">${g.c === S.target ? 'found' : g.d === 0 ? 'borders it' : fmtKm(g.d)}</span></li>`).join('')}</ul>
    <div class="row">${S.done ? '<button class="btn" id="gnew">New game</button>' : '<button class="btn sec" id="ghint">Hint: region</button> <button class="btn sec" id="ggive">Give up</button>'}</div>
    ${coach(['Open with one guess per continent, spread out: e.g. Mexico, Germany, Egypt, India, Australia. Three or four openers anchor the search.',
      'Treat your warmest guess as the anchor and walk its borders. Dark red means you share a border: list that country\'s neighbours and pick one that explains all previous colours.',
      'If two guesses are equally warm, the target is roughly between them. Stop pushing in a direction once colours cool.',
      'Colours reflect distance between borders, so a huge neighbour (Russia, Brazil) can read red while its far side is thousands of km away.'])}`;
  const f = document.getElementById('gform');
  if (f) {
    const q = document.getElementById('gq'); q.focus();
    f.onsubmit = e => { e.preventDefault(); globleGuess(q.value); q.value = ''; };
    document.getElementById('ggive').onclick = () => globleEnd(false);
    document.getElementById('ghint').onclick = () => { document.getElementById('gmsg').textContent = 'Region: ' + (S.target.region || 'n/a'); };
  }
  const n = document.getElementById('gnew'); if (n) n.onclick = () => advance(() => { resetGlobe(); globleStart(); });
  G.fill = c => { if (c.level !== CUR.id) return null; const g = S.guesses.find(x => x.c === c); if (g) return c === S.target ? cssVar('--ok') : globleColor(g.d); if (S.done && c === S.target) return cssVar('--ok'); return null; };
  render();
}
function globleGuess(text) {
  const c = findUnit(text);
  const msg = document.getElementById('gmsg');
  if (!c) { msg.textContent = `"${text}" is not in the list.`; return; }
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
  S.done = true;
  if (won) STATS.globle.push(S.guesses.length);
  mark(S.target, !won || S.guesses.length > 8); save();
  globleRender();
  const zg = Math.max(1.2, zoomForUnit(S.target) * 0.8);
  flyTo(S.target.centroid, zg);
  G.markers = [{ p: S.target.anchor, color: cssVar('--ok'), r: 7, label: S.target.name }].concat(contextLabels(S.target.centroid, zg, new Set([S.target])));
  setTimeout(() => revealFeedback('#gres'), 50);
  G.hover = true;
  const nbs = [...S.target.neighbors].sort();
  document.getElementById('gres').innerHTML = `<div class="card ${won ? 'ok' : 'bad'}"><div class="big">${won ? `Solved in ${S.guesses.length}` : 'Gave up'}</div>
    <div>It was ${flagImg(S.target)}<b>${esc(S.target.name)}</b>${S.target.region ? ' (' + esc(S.target.region) + ')' : ''}.</div>
    <div class="small muted" style="margin-top:4px">Borders: ${nbs.length ? nbs.map(esc).join(', ') : 'none'}</div></div>`;
}

// ----- Borders (neighbours) -----
function neighborsStart() {
  if (!pool().length) return noScope();
  const withNb = pool().filter(u => u.neighbors.size);
  const t = pickTarget(withNb.length && Math.random() < 0.8 ? withNb : pool());
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
    <div class="prompt">${flagImg(t, 'flag big')}${esc(t.name)}</div><div class="hint">${esc(t.region || '')} · streak ${st}</div>
    <div class="chips">${S.options.map(chip).join('')}<button class="chip ${noneCls}" data-n="__none">No land borders</button></div>
    <div id="nbfb"></div>
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
    x = pickTarget(pool());
    const others = CUR.playable.filter(c => c !== x);
    const near = others.sort((p, q) => haversine(p.centroid, x.centroid) - haversine(q.centroid, x.centroid)).slice(0, 40);
    a = pick(near); b = pick(near);
    tries++;
    if (a === b) continue;
    da = unitDist(a, x); db = unitDist(b, x);
  } while ((a === b || Math.abs(da - db) < 0.25 * Math.max(da, db, 1) || (da === 0 && db === 0)) && tries < 60);
  S.x = x; S.a = a; S.b = b; S.da = da; S.db = db; S.answered = false;
  flyHome();
  closerRender();
}
function closerRender() {
  const st = STATS.streaks.closer || 0;
  panel.innerHTML = `<h2>Closer <span class="muted small">· distance intuition</span></h2>
    ${scopeLine()}
    <p class="sub">Which of the two is closer to the target? Distance is border-to-border, as in hot-and-cold games.</p>
    <div class="hint">Streak ${st}</div>
    <div class="prompt">${flagImg(S.x, 'flag big')}${esc(S.x.name)}</div>
    <div class="opts" id="copts"><button class="btn" data-k="a">${flagImg(S.a)}${esc(S.a.name)}</button><button class="btn" data-k="b">${flagImg(S.b)}${esc(S.b.name)}</button></div>
    <div id="cfb"></div>
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
    <div class="hint">Streak ${st}</div>
    <div class="opts" id="nopts">${S.opts.map((c, i) => `<button class="btn" data-i="${i}">${esc(c.name)}</button>`).join('')}</div>
    <div id="nfb"></div>
    ${coach(['Distractors are always nearby, so this trains exactly the confusions that cost placement points.',
      'Common swaps: Niger/Nigeria, Slovakia/Slovenia, Zambia/Zimbabwe, Guinea/Guinea-Bissau, Paraguay/Uruguay, Latvia/Lithuania, Oman/Yemen.'])}`;
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
    <div class="hint">Streak ${st}</div>
    <div class="flagstage"><img src="data/flags/${flagCode(S.t)}.svg" alt="Flag to identify"></div>
    <div class="opts" id="fopts">${S.opts.map((c, i) => `<button class="btn" data-i="${i}">${esc(c.name)}</button>`).join('')}</div>
    <div id="ffb"></div>
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
    <div class="hint">Streak ${st}</div>
    ${clueRows(S.t, S.shown)}
    <div class="row" style="margin:6px 0 10px">${S.hidden.length ? '<button class="btn sec" id="morec">Reveal another clue</button>' : ''}</div>
    <div class="opts" id="clopts">${S.opts.map((c, i) => `<button class="btn" data-i="${i}">${esc(c.name)}</button>`).join('')}</div>
    <div id="clfb"></div>
    ${coach(['Order of checks on a real round: driving side, then road-line colours, then script and language, then plates, poles and bollards.',
      'Camera-car quirks are the fastest tells: Kenya snorkel, Ghana tape, Nigeria follow car, Senegal and Mongolia visible car.',
      'Yellow centre lines point to the Americas and a few others (Norway, Iceland, Japan no-overtaking); all-white lines suggest Europe.'])}`;
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
document.getElementById('statsbtn').onclick = () => {
  resetGlobe(); G.hover = true; [...nav.children].forEach(b => b.classList.remove('on')); mode = 'stats';
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
    ${weak.length ? weak.map(r => `<div class="stat"><span>${r.level === 'world' ? flagImg(WORLD.byName.get(r.name)) : ''}${esc(r.name)} <span class="muted small">${r.level === 'world' ? '' : esc(LEVEL_DEFS[r.level].label.split(' · ')[0])}</span></span><b>${Math.round(r.rate * 100)}% missed <span class="muted">(${r.seen})</span></b></div>`).join('') : '<p class="muted small">Play a few rounds; units you miss twice or more show up here, and come up more often in every mode.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn sec" id="reset">Reset all stats</button></div>`;
  document.getElementById('reset').onclick = () => { if (confirm('Erase all progress?')) { STATS = { units: {}, globle: [], tap: [], streaks: {} }; save(); document.getElementById('statsbtn').click(); } };
  render();
};

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
  const params = new URLSearchParams(location.search);
  const lv = LEVEL_DEFS[params.get('level')] ? params.get('level') : 'world';
  const deep = params.has('level') || params.has('region');
  return setLevel(lv, params.get('region') || 'All', deep ? 'study' : 'train');
}).then(() => {
  // Test/automation hook: lets a script "tap" at a latitude/longitude it believes is right, and inspect state.
  window.__geo = {
    levels: LEVEL_DEFS, get level() { return CUR; }, get world() { return WORLD; }, get region() { return REGION; }, get mode() { return mode; },
    pool, unitDist, findUnit, unitAt, pointToUnitDist, setMode, setLevel,
    tapLatLon(lat, lon) { if (!G.onTap) return false; G.onTap([lon, lat]); return true; },
    render, get G() { return G; }, get TRAIN() { return TRAIN; },
  };
}).catch(err => { document.getElementById('loading').textContent = 'Could not load map data: ' + err; console.error(err); });
})();
