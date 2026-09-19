/* ============================================================
   UI CORE — state, persistence, live-data orchestration, compute()
   ============================================================ */
'use strict';
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const TODAY = nzToday();
const LS_KEY = 'tgp4000.v1';

const STARTER = { tomato:4, capsicum:3, zucchini:2, cucumber:3, corn:12, dbean:24, lettuce:6, basil:4, carrot:60 };

const DEFAULTS = {
  region: 'pukekohe', place: null,
  len: 6, wid: 4, paths: 20, bedW: 1.2,
  outlook: 'auto', tweak: 0, rain: 'auto', protect: 'none',
  hor: 365, succ: true, fit: false, useLive: true, soilNow: '',
  sel: Object.assign({}, STARTER),
  prog: {}, tab: 'calendar', viewT: null, focus: null
};
let S = loadState();

function loadState(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw){ const o = JSON.parse(raw); return Object.assign({}, DEFAULTS, o, { sel: o.sel || Object.assign({}, STARTER), prog: o.prog || {} }); }
  } catch(e){}
  return JSON.parse(JSON.stringify(DEFAULTS));
}
let saveTimer = null;
function saveState(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch(e){} }, 250);
}

/* ---------- date helpers (timeline index t; today = OFF) ---------- */
function dateOfT(t){ return new Date(TODAY + (t - OFF) * DAY); }
function fmtT(t, withDow){ const d = dateOfT(t); return (withDow ? DOW[d.getUTCDay()] + ' ' : '') + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; }
function fmtTY(t){ const d = dateOfT(t); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
function isoOfT(t){ return isoOfMs(TODAY + (t - OFF) * DAY); }

/* ---------- location ---------- */
function resolveLocation(){
  if (S.place){
    const nr = nearestRegion(S.place.lat, S.place.lon);
    return { name: S.place.name + (S.place.admin ? ', ' + S.place.admin : ''), lat: S.place.lat, lon: S.place.lon, base: nr, grp: nr.grp, custom: true, ms: null };
  }
  const r = REGIONS.find(x => x.id === S.region) || REGIONS.find(x => x.id === 'pukekohe');
  return { name: r.name, lat: r.lat, lon: r.lon, base: r, grp: r.grp, custom: false, ms: r.ms };
}

/* ---------- live data ---------- */
const LIVE = { key: null, fc: null, clim: null, st: { fc: { s:'idle' }, clim: { s:'idle' }, outlook: { s:'idle' } }, token: 0 };
let CURRENT_OUTLOOK = OUTLOOK;

async function refreshLive(force){
  const loc = resolveLocation();
  const key = loc.lat.toFixed(2) + ',' + loc.lon.toFixed(2);
  if (!force && LIVE.key === key) return;
  LIVE.key = key; LIVE.fc = null; LIVE.clim = null; const tok = ++LIVE.token;
  LIVE.st.fc = { s:'loading' }; LIVE.st.clim = { s:'loading' };
  renderStatus();

  const fcKey = 'tgp.fc.' + key, clKey = 'tgp.clim.' + key;
  const cachedFc = force ? null : cacheGet(fcKey, 2 * 3600e3);
  const cachedCl = force ? null : cacheGet(clKey, 60 * 86400e3);

  const pFc = (async () => {
    try {
      let v = cachedFc, from = 'live';
      if (v && v.todayMs === TODAY){ from = 'cached'; } else { v = await loadForecast(loc.lat, loc.lon, TODAY); v.todayMs = TODAY; cacheSet(fcKey, v); }
      if (tok !== LIVE.token) return;
      LIVE.fc = v; LIVE.st.fc = { s:'ok', msg: 'Forecast, last 30 days and soil temperature (' + from + ')', at: v.fetched };
    } catch(e){ if (tok !== LIVE.token) return; LIVE.st.fc = { s:'error', msg: e.message }; }
    if (tok === LIVE.token){ renderStatus(); update(); }
  })();
  const pCl = (async () => {
    try {
      let v = cachedCl, from = 'live';
      if (v) from = 'cached'; else { v = await loadClimate(loc.lat, loc.lon); cacheSet(clKey, v); }
      if (tok !== LIVE.token) return;
      LIVE.clim = v;
      LIVE.st.clim = { s:'ok', msg: 'Climate history ' + v.span + ' for this exact spot' + (v.frostFree ? ' — effectively frost-free' : '') + ' (' + from + ')', at: v.fetched };
    } catch(e){ if (tok !== LIVE.token) return; LIVE.st.clim = { s:'error', msg: e.message }; }
    if (tok === LIVE.token){ renderStatus(); update(); }
  })();
  await Promise.all([pFc, pCl]);
}

async function refreshOutlook(){
  try {
    const j = await loadOutlookFile();
    CURRENT_OUTLOOK = j;
    LIVE.st.outlook = { s:'ok', msg: 'outlook.json (issued ' + j.updated + ')' };
  } catch(e){
    CURRENT_OUTLOOK = OUTLOOK;
    LIVE.st.outlook = { s:'builtin', msg: 'Using the outlook built into this page (issued ' + OUTLOOK.updated + ')' };
  }
  renderStatus(); update();
}

/* ---------- compute ---------- */
function measuredSoil(){
  const v = parseFloat(S.soilNow);
  if (!isNaN(v) && v > -5 && v < 40) return { v, src: 'you' };
  if (S.useLive && LIVE.fc && LIVE.fc.soilToday != null) return { v: LIVE.fc.soilToday, src: 'forecast model' };
  return null;
}

function compute(){
  const loc = resolveLocation();
  const grp = loc.grp, O = CURRENT_OUTLOOK;
  let anchors;
  if (S.outlook === 'neutral') anchors = { t:{ spr:0, sum:0, aut:0, win:0 }, r:{ spr:0, sum:0, aut:0, win:0 } };
  else if (S.outlook === 'lanina') anchors = LANINA[grp];
  else anchors = O.groups[grp] || O.groups.north;
  if (S.rain !== 'auto'){ const v = { dry:-1, normal:0, wet:1 }[S.rain]; anchors = { t: anchors.t, r:{ spr:v, sum:v, aut:v, win:v } }; }

  const base = LIVE.clim ? baselineFromNormals(LIVE.clim.air0, LIVE.clim.lsf, LIVE.clim.faf) : baselineFromRegion(loc.base);

  /* live overlay: real recent temps + 16-day forecast (only when using live data and not "normal year") */
  const live = {};
  if (S.useLive && LIVE.fc && S.outlook !== 'neutral'){
    live.obs = {}; live.fc = {};
    for (const d of LIVE.fc.days){
      if (d.mean == null) continue;
      const dy = doyOfMs(TODAY + d.t * DAY);
      const an = d.mean - base.air0[dy];
      if (d.t < 0 && d.t >= -30) live.obs[OFF + d.t] = an;
      else if (d.t >= 0 && d.t < 16) live.fc[d.t] = an;
    }
  }
  const opts = { todayMs: TODAY, base, anchors, tweak: S.tweak, protect: S.protect, live };
  let C = buildClimate(opts);
  const ms = measuredSoil();
  if (ms){ live.soilBias = clamp(ms.v - C.v.base.soil[OFF], -8, 8); C = buildClimate(opts); }
  const Cn = buildClimate({ todayMs: TODAY, base, anchors, protect: S.protect, normal: true });
  const Cc = S.protect === 'none' ? buildClimate({ todayMs: TODAY, base, anchors, tweak: S.tweak, protect: 'cloche', live }) : null;

  /* selected crops, actual-planting overrides */
  const sel = {}; Object.keys(S.sel).forEach(id => { if (CROP_BY_ID[id] && S.sel[id] > 0) sel[id] = S.sel[id]; });
  const ov = {}; Object.keys(S.prog).forEach(k => { if (S.prog[k] && S.prog[k].a) ov[k] = S.prog[k].a; });
  const sopts = { succ: S.succ, hor: S.hor, ov };
  const plantings = schedule(C, sel, sopts);
  const normalBy = {};
  Object.keys(sel).forEach(id => { normalBy[id] = planCrop(Cn, CROP_BY_ID[id], { succ: S.succ, hor: S.hor }); });

  const growArea = Math.max(0.1, S.len * S.wid * (1 - S.paths / 100));
  const Ltot = growArea / S.bedW;
  const scale = S.fit ? autoFit(plantings, sel, Ltot, S.bedW) : 1;
  const packed = packPlan(plantings, sel, scale, Ltot, S.bedW);
  const placed = packed.items.filter(i => i.x != null);
  const util = utilisation(packed.items, growArea, OFF, OFF + S.hor + 60, 7);
  const peak = util.reduce((m, u) => u.used > m.used ? u : m, { used: 0, t: OFF });
  const rainMult = 1 - 0.3 * clamp(anchors.r.sum, -1, 1);
  const shop = shopping(placed, rainMult, growArea);
  const ev = events(placed, C);

  return { loc, grp, anchors, base, C, Cn, Cc, sel, plantings, normalBy, growArea, Ltot, scale, packed, placed, util, peak,
           shop, ev, stats: climateStats(C), statsN: climateStats(Cn), rainMult, soil: ms };
}

let R = null;
function update(){ R = compute(); renderMain(); saveState(); }
