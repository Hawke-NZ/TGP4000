/* ============================================================
   UI CORE — current garden, live-data orchestration, compute()
   ============================================================ */
'use strict';
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const TODAY = nzToday();

STORE = loadStore();
rebuildCrops();
/* S is always the garden you're looking at */
let S = curGarden();
function saveState(){ saveStore(); }

/* ---------- date helpers (timeline index t; today = OFF) ---------- */
function dateOfT(t){ return new Date(TODAY + (t - OFF) * DAY); }
function fmtT(t, withDow){ const d = dateOfT(t); return (withDow ? DOW[d.getUTCDay()] + ' ' : '') + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + (Math.abs(t - OFF) > 330 ? ' ' + d.getUTCFullYear() : ''); }
function fmtTY(t){ const d = dateOfT(t); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
function isoOfT(t){ return isoOfMs(TODAY + (t - OFF) * DAY); }
function tOfIso(s){ return Math.round((Date.parse(s + 'T00:00:00Z') - TODAY) / DAY) + OFF; }

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
const LIVE = { key: null, fc: null, clim: null, season: null, st: { fc: { s:'idle' }, clim: { s:'idle' }, season: { s:'idle' }, outlook: { s:'idle' } }, token: 0 };
let CURRENT_OUTLOOK = OUTLOOK;

async function refreshLive(force){
  const loc = resolveLocation();
  const key = loc.lat.toFixed(2) + ',' + loc.lon.toFixed(2);
  if (!force && LIVE.key === key) return;
  LIVE.key = key; LIVE.fc = null; LIVE.clim = null; LIVE.season = null; const tok = ++LIVE.token;
  LIVE.st.fc = { s:'loading' }; LIVE.st.clim = { s:'loading' }; LIVE.st.season = { s:'loading' };
  renderStatus();

  const fcKey = 'tgp.fc2.' + key, clKey = 'tgp.clim.' + key, seKey = 'tgp.season.' + key;
  const cachedFc = force ? null : cacheGet(fcKey, 2 * 3600e3);
  const cachedCl = force ? null : cacheGet(clKey, 60 * 86400e3);
  const cachedSe = force ? null : cacheGet(seKey, 20 * 3600e3);

  const settle = () => { if (tok === LIVE.token){ renderStatus(); update(); } };
  const pFc = (async () => {
    try {
      let v = cachedFc, from = 'live';
      if (v && v.todayMs === TODAY){ from = 'cached'; } else { v = await loadForecast(loc.lat, loc.lon, TODAY); v.todayMs = TODAY; cacheSet(fcKey, v); }
      if (tok !== LIVE.token) return;
      LIVE.fc = v; LIVE.st.fc = { s:'ok', msg: 'Forecast, recent weather and soil temperature (' + from + ')', at: v.fetched };
    } catch(e){ if (tok !== LIVE.token) return; LIVE.st.fc = { s:'error', msg: e.message }; }
    settle();
  })();
  const pCl = (async () => {
    try {
      let v = cachedCl, from = 'live';
      if (v) from = 'cached'; else { v = await loadClimate(loc.lat, loc.lon); cacheSet(clKey, v); }
      if (tok !== LIVE.token) return;
      LIVE.clim = v;
      LIVE.st.clim = { s:'ok', msg: 'Climate history ' + v.span + ' for this exact spot' + (v.frostFree ? ' — effectively frost-free' : '') + ' (' + from + ')', at: v.fetched };
    } catch(e){ if (tok !== LIVE.token) return; LIVE.st.clim = { s:'error', msg: e.message }; }
    settle();
  })();
  const pSe = (async () => {
    try {
      let v = cachedSe, from = 'live';
      if (v && v.todayMs === TODAY) from = 'cached'; else { v = await loadSeason(loc.lat, loc.lon, TODAY); cacheSet(seKey, v); }
      if (tok !== LIVE.token) return;
      LIVE.season = v; LIVE.st.season = { s:'ok', msg: 'This season’s temperatures so far, for fruit and vine timing (' + from + ')' };
    } catch(e){ if (tok !== LIVE.token) return; LIVE.st.season = { s:'error', msg: e.message }; }
    settle();
  })();
  await Promise.all([pFc, pCl, pSe]);
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
const zoneCtx = z => ({ cover: z && z.cover || 'open', light: z && z.light || 'sun' });

function compute(){
  const loc = resolveLocation();
  const grp = loc.grp, O = CURRENT_OUTLOOK;
  let anchors;
  if (S.outlook === 'neutral') anchors = { t:{ spr:0, sum:0, aut:0, win:0 }, r:{ spr:0, sum:0, aut:0, win:0 } };
  else if (S.outlook === 'lanina') anchors = LANINA[grp];
  else anchors = O.groups[grp] || O.groups.north;
  if (S.rain !== 'auto'){ const v = { dry:-1, normal:0, wet:1 }[S.rain]; anchors = { t: anchors.t, r:{ spr:v, sum:v, aut:v, win:v } }; }

  const base = LIVE.clim ? baselineFromNormals(LIVE.clim.air0, LIVE.clim.lsf, LIVE.clim.faf) : baselineFromRegion(loc.base);

  /* live overlay: this season's real temperatures, the last 92 days and the 16-day forecast (only when using live data and not "normal year") */
  const live = {};
  if (S.useLive && S.outlook !== 'neutral'){
    live.obs = {}; live.fc = {};
    const anomOf = (t, mean) => mean - base.air0[doyOfMs(TODAY + t * DAY)];
    if (LIVE.season) for (const d of LIVE.season.days){ const tt = OFF + d.t; if (tt >= 0 && tt < OFF) live.obs[tt] = anomOf(d.t, d.mean); }
    if (LIVE.fc) for (const d of LIVE.fc.days){
      if (d.mean == null) continue;
      if (d.t < 0 && d.t >= -OFF) live.obs[OFF + d.t] = anomOf(d.t, d.mean);
      else if (d.t >= 0 && d.t < 16) live.fc[d.t] = anomOf(d.t, d.mean);
    }
  }
  const opts = { todayMs: TODAY, base, anchors, tweak: S.tweak, live };
  let C = buildClimate(opts);
  const ms = measuredSoil();
  if (ms){ live.soilBias = clamp(ms.v - C.v.base.soil[OFF], -8, 8); C = buildClimate(opts); }
  const Cn = buildClimate({ todayMs: TODAY, base, anchors, normal: true });

  /* the plan */
  const ov = {}; Object.keys(S.prog).forEach(k => { if (S.prog[k] && S.prog[k].a) ov[k] = S.prog[k].a; });
  const env = { C, Cn }, cache = {};
  const scale = S.fit ? autoFitGarden(env, S, { ov, cache }) : 1;
  const plan = planGarden(env, S, { ov, scale, cache });
  const placed = plan.items.filter(i => i.x != null);
  const normalBy = {};
  Object.keys(plan.byEntry).forEach(id => {
    const b = plan.byEntry[id]; if (!b.zone) return;
    normalBy[id] = planCrop(Cn, b.eff, { succ: S.succ, hor: S.hor, key: id, ctx: zoneCtx(b.zone) });
  });
  const util = utilisationZones(plan, OFF, OFF + S.hor + 60, 7);
  const rainMult = 1 - 0.3 * clamp(anchors.r.sum, -1, 1);
  const shop = shopping(placed, rainMult, plan);
  const ev = events(placed);
  const care = careTasks(placed);
  const trees = (S.trees || []).map(t => ({ tree: t, pred: predictPerennial(C, t, Cn) }));

  /* weather for watering advice */
  const wx = { tMean: C.v.base.air[OFF] * 0.5 + C.v.base.air[OFF + 3] * 0.5, rainPast: 0, rainYest: 0, rainSoon: 0, live: false };
  if (S.useLive && LIVE.fc){
    wx.live = true; let n = 0, s = 0;
    LIVE.fc.days.forEach(d => {
      if (d.t >= 0 && d.t <= 3 && d.mean != null){ s += d.mean; n++; }
      if (d.t >= -7 && d.t <= -1) wx.rainPast += d.rain || 0;
      if (d.t === -1 || d.t === 0) wx.rainYest += d.rain || 0;
      if (d.t === 1 || d.t === 2) wx.rainSoon += d.rain || 0;
    });
    if (n) wx.tMean = s / n;
  }

  return { loc, grp, anchors, base, C, Cn, env, cache, plan, scale, placed, items: plan.items, normalBy, util, shop, ev, care, trees, wx,
           stats: climateStats(C), statsN: climateStats(Cn), rainMult, soil: ms, overflow: plan.overflow };
}

let R = null;
/* keep keyboard focus (and the caret) where it was when a section is re-drawn */
function focusDesc(){
  const a = document.activeElement; if (!a || a === document.body || (a.closest && a.closest('#dlg'))) return null;
  let sel = null;
  if (a.id) sel = '#' + CSS.escape(a.id);
  else { const ks = Object.keys(a.dataset || {}); if (ks.length) sel = a.tagName.toLowerCase() + ks.map(k => '[data-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()) + '="' + CSS.escape(String(a.dataset[k])) + '"]').join(''); }
  if (!sel) return null;
  let ss = null, se = null; try { ss = a.selectionStart; se = a.selectionEnd; } catch(e){}
  return { sel, ss, se };
}
function restoreFocus(d){
  if (!d) return; let el = null; try { el = document.querySelector(d.sel); } catch(e){}
  if (!el || el === document.activeElement) return;
  el.focus({ preventScroll: true }); try { if (d.ss != null) el.setSelectionRange(d.ss, d.se); } catch(e){}
}
function update(){ R = compute(); renderMain(); saveState(); }

/* switch to another garden */
function useGarden(id){
  if (!STORE.gardens[id]) return;
  STORE.cur = id; S = curGarden();
  if (typeof SITE !== 'undefined'){ SITE.sel = null; SITE.tool = null; SITE.calib = null; SITE.bgmove = false; SITE.drag = null; SITE.dims = null; }
  refreshLive(false); update();
}
