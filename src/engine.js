/* ============================================================
   ENGINE — climate model + planting scheduler + bed packing
   Pure functions, no DOM. Works in browser and node (tests).
   ============================================================ */
const DAY = 86400000;
const OFF = 120;            // timeline starts 120 days before "today" (so past plantings can be entered)
const NDAYS = OFF + 620;    // …and runs ~20 months ahead
const CROP_BY_ID = {}; CROPS.forEach(c => CROP_BY_ID[c.id] = c);

const PROTECTION = {
  none:   { label: 'Open ground',            pa: 0,   ps: 0,   shift: 0  },
  cloche: { label: 'Cloches / tunnel house', pa: 1.5, ps: 1.5, shift: 14 },
  glass:  { label: 'Greenhouse',             pa: 4,   ps: 3,   shift: 35 }
};

function utcMidnight(d){ return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
function doyOfMs(ms){ const d = new Date(ms); return Math.round((ms - Date.UTC(d.getUTCFullYear(),0,0)) / DAY); }
function mmddToDoy(s){ const [m,d] = s.split('-').map(Number); return Math.round((Date.UTC(2001,m-1,d) - Date.UTC(2001,0,0)) / DAY); }
function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ---------- baseline climate (per day-of-year, 1..366) ---------- */
function baselineFromRegion(r){
  const air0 = new Float64Array(367), soil0 = new Float64Array(367);
  for (let d = 1; d <= 366; d++){
    air0[d]  = r.ta + r.amp * Math.cos(2*Math.PI*(d-25)/365);
    soil0[d] = r.ta + 0.92 * r.amp * Math.cos(2*Math.PI*(d-38)/365);
  }
  return { air0, soil0, lsf: mmddToDoy(r.lsf), faf: mmddToDoy(r.faf), ta: r.ta, src: 'table' };
}
/* Live: daily normals from Open-Meteo archive → air0 (already smoothed), soil derived by lagging */
function baselineFromNormals(air0in, lsf, faf){
  const air0 = new Float64Array(367);
  for (let d = 1; d <= 366; d++) air0[d] = air0in[d];
  let ta = 0; for (let d = 1; d <= 365; d++) ta += air0[d]; ta /= 365;
  const soil0 = new Float64Array(367);
  for (let d = 1; d <= 366; d++){
    let s = 0; for (let k = 6; k <= 20; k++){ let dd = d - k; while (dd < 1) dd += 365; s += air0[dd]; }
    s /= 15;
    soil0[d] = ta + 0.92 * (s - ta);
  }
  return { air0, soil0, lsf, faf, ta, src: 'live' };
}

/* seasonal anomaly, cyclic linear interpolation between mid-season anchors */
function seasonalAnom(doy, a){
  const pts = [[15,a.sum],[105,a.aut],[196,a.win],[288,a.spr],[380,a.sum]];
  let d = doy; if (d < 15) d += 365;
  for (let i = 0; i < pts.length-1; i++){
    if (d >= pts[i][0] && d <= pts[i+1][0]){
      const f = (d - pts[i][0]) / (pts[i+1][0] - pts[i][0]);
      return pts[i][1] + f * (pts[i+1][1] - pts[i][1]);
    }
  }
  return 0;
}

/* ---------- the climate object ----------
   o.todayMs   UTC-midnight ms of today
   o.base      baseline
   o.anchors   {t:{spr,sum,aut,win}, r:{…}}   seasonal outlook anomalies (°C / rain index)
   o.tweak     user °C offset
   o.protect   'none'|'cloche'|'glass'
   o.live      optional: { obs:{t→anom}, fc:{i→anom}, seasonal:fn(t)->anom|null, soilBias }
   o.normal    true → ignore all anomalies (used for "vs a normal year")                    */
function buildClimate(o){
  const N = NDAYS, base = o.base, live = o.live || {};
  const doy = new Int16Array(N), month = new Int8Array(N);
  const an = new Float64Array(N), air = new Float64Array(N), soil = new Float64Array(N);
  const tweak = o.normal ? 0 : (o.tweak || 0);
  const anchorsT = (o.anchors && o.anchors.t) || { spr:0, sum:0, aut:0, win:0 };
  for (let t = 0; t < N; t++){
    const ms = o.todayMs + (t - OFF) * DAY;
    doy[t] = doyOfMs(ms); month[t] = new Date(ms).getUTCMonth() + 1;
    let a = 0;
    if (!o.normal){
      a = seasonalAnom(doy[t], anchorsT);
      if (live.seasonal){ const s = live.seasonal(t); if (s != null) a = s; }
      if (t < OFF && live.obs && live.obs[t] != null) a = live.obs[t];
      else if (t >= OFF && live.fc && live.fc[t-OFF] != null){
        const w = Math.max(0, 1 - (t-OFF)/16);
        a = a*(1-w) + live.fc[t-OFF]*w;
      }
    }
    a += tweak;
    an[t] = a;
    const bias = (!o.normal && live.soilBias != null && t >= OFF) ? live.soilBias * Math.exp(-(t-OFF)/21) : 0;
    air[t]  = base.air0[doy[t]]  + a + 0.5*bias;
    soil[t] = base.soil0[doy[t]] + 0.9*a + bias;
  }
  const sprA = o.normal ? 0 : anchorsT.spr + tweak, autA = o.normal ? 0 : anchorsT.aut + tweak;
  const lsf = base.lsf - clamp(Math.round(9*sprA), -14, 14);
  const faf = base.faf + clamp(Math.round(9*autA), -14, 14);
  const P = PROTECTION[o.protect || 'none'];
  const v = { base: { air, soil, lsf, faf } };
  if (P.shift || P.pa){
    const airP = new Float64Array(N), soilP = new Float64Array(N);
    for (let t = 0; t < N; t++){ airP[t] = air[t] + P.pa; soilP[t] = soil[t] + P.ps; }
    v.prot = { air: airP, soil: soilP, lsf: lsf - P.shift, faf: faf + P.shift };
  } else v.prot = v.base;
  return { N, doy, month, an, v, todayMs: o.todayMs, protect: o.protect || 'none', _cum: {},
           dateOf(t){ return new Date(this.todayMs + (t - OFF)*DAY); } };
}

/* ---------- thermal time ---------- */
function cumGDD(C, vk, tb){
  const key = vk + '|' + tb;
  if (C._cum[key]) return C._cum[key];
  const air = C.v[vk].air, c = new Float64Array(C.N + 1);
  for (let i = 0; i < C.N; i++) c[i+1] = c[i] + Math.max(0, air[i] - tb);
  return C._cum[key] = c;
}
function maturityDay(C, vk, tb, p, gdd){
  const c = cumGDD(C, vk, tb), target = c[p] + gdd;
  if (c[C.N] < target) return -1;
  let lo = p, hi = C.N - 1;
  while (lo < hi){ const mid = (lo + hi) >> 1; if (c[mid+1] >= target) hi = mid; else lo = mid + 1; }
  return lo;
}
function nextDoy(C, from, d){ for (let t = from; t < C.N; t++) if (C.doy[t] === d) return t; return C.N; }
function meanAir(C, vk, a, b){
  const air = C.v[vk].air; a = clamp(a, 0, C.N-1); b = clamp(b, a, C.N-1);
  let s = 0; for (let t = a; t <= b; t++) s += air[t]; return s / (b - a + 1);
}
function vkFor(C, crop){ return crop.warm ? 'prot' : 'base'; }

/* Can this crop go in the ground on day p? If so, when does it mature? */
function evalPlant(C, crop, p){
  const vk = vkFor(C, crop), v = C.v[vk];
  if (crop.months && crop.months.indexOf(C.month[p]) < 0) return null;
  if (v.soil[p] < crop.minSoil) return null;
  const d = C.doy[p];
  if (crop.fb != null && !(d >= v.lsf + crop.fb || d <= v.faf)) return null;
  const gdd = crop.d * (crop.rt - crop.tb);
  const m = maturityDay(C, vk, crop.tb, p, gdd);
  if (m < 0) return null;
  const days = m - p;
  const slow = crop.slow || (crop.warm ? 1.35 : 1.7);
  if (days > crop.d * slow) return null;
  let status = 'ok', flag = null, end = m + crop.span;
  if (crop.warm){
    const faf = nextDoy(C, p, v.faf);
    if (m + Math.round(crop.span*0.4) > faf) return null;
    const endT = crop.endT != null ? crop.endT : crop.tb + 3.5;
    if (v.air[Math.min(m + Math.round(crop.span*0.5), C.N-1)] < endT) return null;
    end = Math.min(m + crop.span, Math.max(m + 7, faf));
  } else if (crop.hmax){
    const mh = meanAir(C, vk, m - Math.round(days/3), m + Math.round(crop.span/2));
    if (mh > crop.hmax + 2) return null;
    if (mh > crop.hmax){ status = 'caution'; flag = 'heat'; }
  }
  return { p, m, end, days, status, flag, gdd };
}

function actualPlant(C, crop, p){
  const vk = vkFor(C, crop);
  const gdd = crop.d * (crop.rt - crop.tb);
  const m = maturityDay(C, vk, crop.tb, p, gdd);
  const mm = m < 0 ? Math.min(C.N-1, p + Math.round(crop.d*1.6)) : m;
  return { p, m: mm, end: mm + crop.span, days: mm - p, status: 'actual', flag: m < 0 ? 'unfinished' : null, gdd };
}

/* ---------- scheduling ---------- */
function planCrop(C, crop, o){
  const res = [], pMax = Math.min(C.N - 2, OFF + o.hor);
  const cap = o.succ ? crop.max : 1;
  let start = OFF;
  for (let r = 0; r < cap; r++){
    let pl = null;
    const ovd = o.ov && o.ov[crop.id + '|' + r];
    if (ovd){
      const pIdx = Math.round((Date.parse(ovd + 'T00:00:00Z') - C.todayMs) / DAY) + OFF;
      if (pIdx >= 0 && pIdx < C.N - 2) pl = actualPlant(C, crop, pIdx);
    }
    if (!pl){
      for (let q = start; q < pMax; q++){ const e = evalPlant(C, crop, q); if (e){ pl = e; break; } }
    }
    if (!pl) break;
    pl.cropId = crop.id; pl.r = r; pl.key = crop.id + '|' + r;
    res.push(pl);
    if (crop.mode === 'seq'){ const f = crop.nxt != null ? crop.nxt : 1; start = f >= 1 ? pl.end + 2 : Math.max(pl.p + 10, pl.m + Math.round(crop.span * f)); }
    else start = pl.p + crop.gap;
  }
  return res;
}

function schedule(C, sel, o){
  const out = [];
  for (const id in sel){ const crop = CROP_BY_ID[id]; if (!crop) continue;
    for (const pl of planCrop(C, crop, o)) out.push(pl); }
  out.sort((a,b) => a.p - b.p);
  return out;
}

/* ---------- bed packing (1-D strip of bedW-wide beds, first-fit in time+space) ---------- */
function packPlan(plantings, sel, scale, Ltot, bedW){
  const items = plantings.map(pl => {
    const crop = CROP_BY_ID[pl.cropId];
    const plants = Math.max(1, Math.round(sel[pl.cropId] * scale));
    const area = plants / crop.pm;
    return Object.assign({}, pl, { plants, area, len: area / bedW, x: null });
  });
  const order = items.slice().sort((a,b) => a.p - b.p || b.len - a.len);
  const placed = [], lastX = {}, overflow = [];
  for (const it of order){
    const busy = placed.filter(q => q.p < it.end && it.p < q.end);
    const cands = [];
    if (lastX[it.cropId] != null) cands.push(lastX[it.cropId]);
    cands.push(0); busy.forEach(q => cands.push(q.x + q.len));
    cands.sort((a,b) => a - b);
    let ok = null;
    for (const x of cands){
      if (x + it.len > Ltot + 1e-6) continue;
      if (busy.every(q => x + it.len <= q.x + 1e-6 || q.x + q.len <= x + 1e-6)){ ok = x; break; }
    }
    if (ok == null){ it.x = null; overflow.push(it); }
    else { it.x = ok; placed.push(it); lastX[it.cropId] = ok; }
  }
  return { items, overflow };
}

function autoFit(plantings, sel, Ltot, bedW){
  for (let s = 1; s >= 0.25; s -= 0.05){
    const r = packPlan(plantings, sel, s, Ltot, bedW);
    if (!r.overflow.length) return Math.round(s*100)/100;
  }
  return 0.25;
}

function utilisation(items, Aarea, from, to, step){
  const out = [];
  for (let t = from; t < to; t += step){
    let used = 0; for (const it of items) if (it.x != null && it.p <= t && t < it.end) used += it.area;
    out.push({ t, used, pct: Aarea > 0 ? used / Aarea : 0 });
  }
  return out;
}

/* ---------- shopping list ---------- */
function shopping(items, waterMult, areaGrow){
  const byCrop = {};
  for (const it of items){
    const c = CROP_BY_ID[it.cropId];
    const e = byCrop[c.id] || (byCrop[c.id] = { crop: c, plants: 0, rounds: 0 });
    e.plants += it.plants; e.rounds++;
  }
  const rows = Object.values(byCrop).map(e => {
    const c = e.crop; let buy = '', extra = '';
    if (c.kind === 'seedling'){ buy = e.plants + ' seedlings'; extra = 'or ~' + Math.ceil(e.plants*1.3) + ' seeds to raise your own' + (c.pack > 1 ? ' (' + Math.ceil(e.plants*1.3 / c.pack) + ' packet' + (Math.ceil(e.plants*1.3 / c.pack) > 1 ? 's' : '') + ')' : ''); }
    else if (c.kind === 'direct'){ const seeds = Math.ceil(e.plants * (c.sow || 1.5)); const pk = Math.max(1, Math.ceil(seeds / c.pack)); buy = seeds + ' seeds'; extra = pk + ' packet' + (pk > 1 ? 's' : ''); }
    else if (c.kind === 'tuber'){ buy = (Math.ceil(e.plants * 0.07 * 2) / 2).toFixed(1) + ' kg seed potatoes'; extra = 'certified seed, ~' + e.plants + ' tubers'; }
    else if (c.kind === 'clove'){ buy = Math.ceil(e.plants / 7) + ' bulbs of seed garlic'; extra = 'split into ~' + e.plants + ' cloves'; }
    else if (c.kind === 'slip'){ buy = e.plants + ' kumara slips'; extra = 'or sprout your own from tubers'; }
    return { id: c.id, name: c.n, group: c.g, plants: e.plants, rounds: e.rounds, buy, extra,
             kg: Math.round(e.plants * c.kg * 10) / 10, water: c.water };
  });
  rows.sort((a,b) => GROUPS[a.group].slot - GROUPS[b.group].slot || a.name.localeCompare(b.name));
  const P = id => (byCrop[id] ? byCrop[id].plants / Math.max(1, byCrop[id].rounds) : 0);
  const supplies = [];
  supplies.push({ name: 'Compost (top-dress 2.5 cm)', qty: Math.ceil(areaGrow * 25 / 40) + ' × 40 L bags' });
  supplies.push({ name: 'Mulch (pea straw / bark, 5 cm)', qty: Math.ceil(areaGrow * 50 / 40) + ' × 40 L bags' });
  const stakes = Math.ceil(P('tomato') + P('cherry'));
  if (stakes) supplies.push({ name: 'Tomato stakes or cages', qty: stakes });
  if (byCrop.cbean) supplies.push({ name: 'Bean poles / teepee canes', qty: Math.ceil(P('cbean') / 3) + ' × 2 m canes' });
  if (byCrop.cucumber) supplies.push({ name: 'Trellis / netting for cucumbers', qty: Math.max(1, Math.ceil(P('cucumber') * 0.3)) + ' m' });
  const brassArea = items.filter(i => CROP_BY_ID[i.cropId].g === 'bras').reduce((s,i) => Math.max(s, i.area), 0);
  if (brassArea > 0) supplies.push({ name: 'Insect netting for brassicas', qty: '≈ ' + Math.ceil(brassArea * 1.3) + ' m²' });
  return { rows, supplies };
}

/* ---------- agenda events ---------- */
function events(items, C){
  const ev = [];
  for (const it of items){
    const c = CROP_BY_ID[it.cropId];
    if (c.nur > 0){
      const t = it.p - c.nur * 7;
      ev.push({ t, key: it.key, cropId: c.id, kind: 'sow', text: (t < OFF ? 'Buy ' + c.n.toLowerCase() + ' seedlings' : 'Sow ' + c.n.toLowerCase() + ' seed in trays'), r: it.r });
    }
    const verb = c.kind === 'direct' ? 'Sow ' + c.n.toLowerCase() + ' direct' : c.kind === 'tuber' ? 'Plant ' + c.n.toLowerCase() : c.kind === 'clove' ? 'Plant ' + c.n.toLowerCase() + ' cloves' : c.kind === 'slip' ? 'Plant out ' + c.n.toLowerCase() + ' slips' : 'Plant out ' + c.n.toLowerCase();
    ev.push({ t: it.p, key: it.key, cropId: c.id, kind: 'plant', text: verb, r: it.r });
    ev.push({ t: it.m, key: it.key, cropId: c.id, kind: 'harvest', text: 'First ' + c.n.toLowerCase() + ' harvest', r: it.r });
  }
  ev.sort((a,b) => a.t - b.t);
  return ev;
}

/* ---------- climate stats for the briefing ---------- */
function climateStats(C, hor){
  const v = C.v.base;
  let warm = 0; for (let t = OFF; t < OFF + 365; t++) if (v.air[t] >= 14) warm++;
  const lsfT = nextDoy(C, OFF - 60, v.lsf), fafT = nextDoy(C, Math.max(OFF - 60, 0), v.faf);
  return { warmDays: warm, lsfT, fafT, lsf: v.lsf, faf: v.faf };
}

/* first feasible plant date from today (or null) */
function firstFeasible(C, crop, hor){
  const pMax = Math.min(C.N - 2, OFF + (hor || 365));
  for (let q = OFF; q < pMax; q++){ const e = evalPlant(C, crop, q); if (e) return e; }
  return null;
}

if (typeof module !== 'undefined') module.exports = { OFF, NDAYS, DAY, CROP_BY_ID, PROTECTION, utcMidnight, doyOfMs, mmddToDoy, baselineFromRegion, baselineFromNormals, seasonalAnom, buildClimate, evalPlant, planCrop, schedule, packPlan, autoFit, utilisation, shopping, events, climateStats, firstFeasible, MONTHS };
