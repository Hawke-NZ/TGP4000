/* ============================================================
   ENGINE — climate model, planting scheduler, zones (beds + pots), care, perennials
   Pure functions, no DOM. Works in browser and node (tests).
   ============================================================ */
const DAY = 86400000;
const OFF = 365;            // timeline starts 365 days before "today" (past plantings, this season's degree-days)
const NDAYS = OFF + 620;    // …and runs ~20 months ahead
const CROP_BY_ID = {}; CROPS.forEach(c => CROP_BY_ID[c.id] = c);
const PERENNIAL_BY_ID = {}; PERENNIALS.forEach(p => PERENNIAL_BY_ID[p.id] = p);

/* cover (protection) and light tags that a zone can carry */
const COVERS = {
  open:   { label: 'Open ground',            pa: 0,   ps: 0,   shift: 0  },
  cloche: { label: 'Cloches / tunnel house', pa: 1.5, ps: 1.5, shift: 14 },
  glass:  { label: 'Glasshouse',             pa: 4,   ps: 3,   shift: 35 }
};
const LIGHTS = {
  sun:   { label: 'Full sun',   rank: 0, da: 0,    ds: 0 },
  part:  { label: 'Part shade', rank: 1, da: -0.7, ds: -1.5 },
  shade: { label: 'Shade',      rank: 2, da: -1.4, ds: -2.8 }
};
const PROTECTION = COVERS;   // v1 name

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
   o.live      optional: { obs:{t→anom}, fc:{i→anom}, soilBias }
   o.normal    true → ignore all anomalies (used for "vs a normal year")
   C.variant(cover, light) → temperatures for a zone with that protection and shade                */
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
  const v = { base: { air, soil, lsf, faf, key: 'open|sun' } };
  const C = { N, doy, month, an, v, todayMs: o.todayMs, _cum: {}, _vars: { 'open|sun': v.base },
    dateOf(t){ return new Date(this.todayMs + (t - OFF)*DAY); },
    variant(cover, light, k){
      cover = cover || 'open'; light = light || 'sun'; k = k == null ? 1 : k;
      const key = cover + '|' + light + (k === 1 ? '' : '|x' + k);
      if (this._vars[key]) return this._vars[key];
      const P = COVERS[cover] || COVERS.open, L = LIGHTS[light] || LIGHTS.sun;
      const da = P.pa * k + L.da, ds = P.ps * k + L.ds;
      const A = new Float64Array(N), Sx = new Float64Array(N);
      for (let t = 0; t < N; t++){ A[t] = air[t] + da; Sx[t] = soil[t] + ds; }
      return this._vars[key] = { air: A, soil: Sx, lsf: Math.round(lsf - P.shift * k), faf: Math.round(faf + P.shift * k), key };
    } };
  return C;
}

/* ---------- thermal time ---------- */
function cumGDD(C, vk, tb){
  const key = vk + '|' + tb;
  if (C._cum[key]) return C._cum[key];
  const air = C._vars[vk].air, c = new Float64Array(C.N + 1);
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
  const air = C._vars[vk].air; a = clamp(a, 0, C.N-1); b = clamp(b, a, C.N-1);
  let s = 0; for (let t = a; t <= b; t++) s += air[t]; return s / (b - a + 1);
}

/* ---------- a crop as this planting will grow it (how it's started) ----------
   how: auto | tray (raise from seed) | buy (buy seedlings) | direct (sow in place)          */
function effCrop(c, e){
  const want = e && e.how && e.how !== 'auto' ? e.how : null;
  let o = Object.assign({}, c);
  if (want === 'direct' && c.kind === 'seedling' && c.dsow){
    o.kind = 'direct'; o.d = Math.round(c.d + c.nur * 7 * 0.85); o.nur = 0; o.sow = c.sow || 1.5; o.how = 'direct';
  } else if ((want === 'tray' || want === 'buy') && c.kind === 'direct' && c.tray){
    o.kind = 'seedling'; o.nur = c.tray; o.d = Math.max(20, Math.round(c.d - c.tray * 7 * 0.85)); o.how = want;
  } else if (want === 'buy' && c.kind === 'seedling'){ o.how = 'buy'; }
  else if (want === 'tray' && c.kind === 'seedling'){ o.how = 'tray'; }
  else o.how = c.kind === 'seedling' ? 'tray' : c.kind;
  return o;
}
/* which ways can this crop be started? */
function howOptions(c){
  const out = [];
  if (c.kind === 'seedling'){ out.push(['tray', 'Raise from seed in trays'], ['buy', 'Buy seedlings']); if (c.dsow) out.push(['direct', 'Sow seed direct']); }
  else if (c.kind === 'direct'){ out.push(['direct', 'Sow seed direct']); if (c.tray) out.push(['tray', 'Raise from seed in trays'], ['buy', 'Buy seedlings']); }
  return out;
}
/* litres of pot one plant of this crop wants, and how many can share a pot */
function potNeed(c){ return c.potL != null ? c.potL : clamp(Math.round(40 / Math.max(c.pm, 0.3)), 2, 60); }
function potShare(c){ return c.pm >= 20 ? 8 : c.pm >= 8 ? 5 : c.pm >= 3 ? 2 : 1; }

/* ---------- can this crop go in on day p, in a zone with this cover and light? ---------- */
function evalPlant(C, crop, p, ctx, why){
  ctx = ctx || {};
  const fail = code => { if (why) why[code] = (why[code] || 0) + 1; return null; };
  const v = C.variant(ctx.cover, ctx.light);
  if (crop.months && crop.months.indexOf(C.month[p]) < 0) return fail('month');
  /* light: zone shadier than the crop tolerates / sunnier than it wants */
  const zr = (LIGHTS[ctx.light || 'sun'] || LIGHTS.sun).rank, lt = crop.lt != null ? crop.lt : 0, ms = crop.minShade || 0;
  let gm = 1, ymul = 1, lightFlag = null, hAdj = 0;
  if (zr > lt){ if (zr - lt >= 2) return fail('shade'); gm = 1.15; ymul = 0.75; lightFlag = 'shady'; }
  if (zr < ms){ hAdj = -2.5 * (ms - zr); ymul *= 0.7; lightFlag = lightFlag || 'sunny'; }
  if (v.soil[p] < crop.minSoil) return fail('soil');
  const d = C.doy[p];
  if (crop.fb != null && !(d >= v.lsf + crop.fb || d <= v.faf)) return fail('frost');
  const gdd = crop.d * (crop.rt - crop.tb) * gm;
  const m = maturityDay(C, v.key, crop.tb, p, gdd);
  if (m < 0) return fail('season');
  const days = m - p;
  const slow = crop.slow || (crop.warm ? 1.35 : 1.7);
  if (days > crop.d * slow * gm) return fail('slow');
  let status = 'ok', flag = null, end = m + crop.span;
  if (crop.warm){
    const faf = nextDoy(C, p, v.faf);
    if (m + Math.round(crop.span*0.4) > faf) return fail('autumn');
    const endT = crop.endT != null ? crop.endT : crop.tb + 3.5;
    if (v.air[Math.min(m + Math.round(crop.span*0.5), C.N-1)] < endT) return fail('autumn');
    end = Math.min(m + crop.span, Math.max(m + 7, faf));
  } else if (crop.hmax){
    const mh = meanAir(C, v.key, m - Math.round(days/3), m + Math.round(crop.span/2));
    const hm = crop.hmax + hAdj;     // hAdj < 0 when the spot is sunnier than the crop likes
    if (mh > hm + 2) return fail('heat');
    if (mh > hm){ status = 'caution'; flag = 'heat'; }
  }
  return { p, m, end, days, status, flag, gdd, ymul, light: lightFlag };
}

function actualPlant(C, crop, p, ctx){
  const v = C.variant(ctx && ctx.cover, ctx && ctx.light);
  const gdd = crop.d * (crop.rt - crop.tb);
  const m = maturityDay(C, v.key, crop.tb, p, gdd);
  const mm = m < 0 ? Math.min(C.N-1, p + Math.round(crop.d*1.6)) : m;
  return { p, m: mm, end: mm + crop.span, days: mm - p, status: 'actual', flag: m < 0 ? 'unfinished' : null, gdd, ymul: 1, light: null };
}

const WHY_TEXT = {
  month:  'it’s outside its usual planting months',
  soil:   'the soil is too cold for it during the plan',
  frost:  'frost risk rules out the planting dates',
  season: 'there isn’t enough warmth in the plan to finish it',
  slow:   'it grows too slowly in the available warmth',
  autumn: 'it can’t finish before autumn cools',
  heat:   'it would be too hot at harvest (it bolts or sulks)',
  shade:  'the spot is too shady for it'
};
/* why does nothing work for this crop here? */
function whyNot(C, crop, o){
  const why = {}, pMax = Math.min(C.N - 2, OFF + o.hor);
  for (let q = OFF; q < pMax; q++) evalPlant(C, crop, q, o.ctx, why);
  let best = null, n = 0;
  /* a failure late in the checks (couldn't finish, too hot) says more than "it's winter" */
  const late = ['autumn', 'season', 'slow', 'heat', 'shade'].filter(k => why[k]);
  if (late.length){ late.forEach(k => { if (why[k] > n){ n = why[k]; best = k; } }); }
  else Object.keys(why).forEach(k => { if (why[k] > n){ n = why[k]; best = k; } });
  return best ? { code: best, text: WHY_TEXT[best] } : null;
}

/* ---------- scheduling one crop in one climate variant ---------- */
function planCrop(C, crop, o){
  const res = [], pMax = Math.min(C.N - 2, OFF + o.hor), ctx = o.ctx || {}, kid = o.key || crop.id;
  const cap = o.succ ? crop.max : 1;
  let start = OFF;
  for (let r = 0; r < cap; r++){
    let pl = null;
    const ovd = o.ov && o.ov[kid + '|' + r];
    if (ovd){
      const pIdx = Math.round((Date.parse(ovd + 'T00:00:00Z') - C.todayMs) / DAY) + OFF;
      if (pIdx >= 0 && pIdx < C.N - 2) pl = actualPlant(C, crop, pIdx, ctx);
    }
    if (!pl){
      for (let q = start; q < pMax; q++){ const e = evalPlant(C, crop, q, ctx); if (e){ pl = e; break; } }
    }
    if (!pl) break;
    pl.cropId = crop.id; pl.r = r; pl.key = kid + '|' + r;
    res.push(pl);
    if (crop.mode === 'seq'){ const f = crop.nxt != null ? crop.nxt : 1; start = f >= 1 ? pl.end + 2 : Math.max(pl.p + 10, pl.m + Math.round(crop.span * f)); }
    else start = pl.p + crop.gap;
  }
  return res;
}

/* ---------- zones ---------- */
const bedArea = z => Math.max(0.1, (z.w || 1) * (z.h || 1));
const bedStrip = z => Math.max(0.3, Math.min(z.bw || 1.2, z.w || 1, z.h || 1));
function potSlots(z){
  const out = [];
  (z.pots || []).forEach((g, gi) => { for (let k = 0; k < (g.n || 0); k++) out.push({ l: +g.l || 10, g: gi }); });
  out.sort((a, b) => a.l - b.l);
  out.forEach((s, i) => s.i = i);
  return out;
}

/* a bed packs plantings in a 1-D strip: first-fit in time + space.
   With `smart` it looks at every free position and picks the one with the best companions and light
   (tall crops to the south, no antagonists next to each other); ties go to the first fit, so nothing changes when it makes no difference. */
function bedPacker(z, smart){
  const L = bedArea(z) / bedStrip(z), bw = bedStrip(z), placed = [], lastX = {}, longSide = Math.max(z.w || 1, z.h || 1);
  return {
    kind: 'bed', z, cap: bedArea(z), L, bw, placed,
    tryPlace(it, c){
      it.area = it.plants / c.pm; it.len = it.area / bw;
      const busy = placed.filter(q => q.p < it.end && it.p < q.end);
      const cands = [];
      if (lastX[it.cropId] != null) cands.push(lastX[it.cropId]);
      cands.push(0); busy.forEach(q => cands.push(q.x + q.len));
      if (smart){
        cands.push(L - it.len); busy.forEach(q => cands.push(q.x - it.len));
        for (let k = 1; k * longSide < L - 1e-6; k++){ cands.push(k * longSide); cands.push(k * longSide - it.len); }
      }
      cands.sort((a, b) => a - b);
      const ok = [];
      for (const x of cands){
        if (x < -1e-6 || x + it.len > L + 1e-6) continue;
        if (ok.length && Math.abs(ok[ok.length - 1] - x) < 1e-6) continue;
        if (busy.every(q => x + it.len <= q.x + 1e-6 || q.x + q.len <= x + 1e-6)){
          ok.push(x);
          if (!smart) break;
        }
      }
      if (!ok.length) return false;
      let pick = ok[0];
      if (smart && ok.length > 1){
        let best = Infinity;
        for (const x of ok){ const cst = layoutCost(z, it, x, busy) - (x === lastX[it.cropId] ? 0.4 : 0); if (cst < best - 1e-9){ best = cst; pick = x; } }
      }
      it.x = pick; placed.push(it); lastX[it.cropId] = pick; return true;
    },
    remove(it){ const i = placed.indexOf(it); if (i >= 0) placed.splice(i, 1); it.x = null; }
  };
}
/* pots: each pot is a slot; a planting takes as many free pots as it needs */
function potPacker(z){
  const slots = potSlots(z), placed = [];
  return {
    kind: 'pots', z, slots, cap: slots.length, placed,
    tryPlace(it, c){
      const need = potNeed(c), share = potShare(c);
      const cand = slots.filter(s => s.l >= need * 0.7 && !placed.some(q => q.p < it.end && it.p < q.end && q.slots.indexOf(s.i) >= 0));
      let left = it.plants; const use = [];
      for (const s of cand){
        if (left <= 0) break;
        const cap = clamp(Math.floor(s.l / need), 1, share);
        use.push(s.i); left -= cap;
      }
      if (left > 0) return false;
      it.slots = use; it.area = 0; it.len = 0; it.x = 0; it.potsUsed = use.length;
      it.potL = Math.min.apply(null, use.map(i => slots[i].l));
      placed.push(it); return true;
    },
    remove(it){ const i = placed.indexOf(it); if (i >= 0) placed.splice(i, 1); it.x = null; it.slots = null; }
  };
}

/* ---------- the whole garden ----------
   env: { C, Cn }   G: garden {zones, entries, succ, hor}   o: { scale, ov, cache }
   → { items, byEntry, zones:[{z, packer, items, overflow}], overflow, scale }          */
function planGarden(env, G, o){
  o = o || {};
  const smart = o.smart !== false && G.smart !== false;
  const r1 = planGardenOnce(env, G, Object.assign({}, o, { smart }));
  if (smart && r1.overflow.length){
    const r0 = planGardenOnce(env, G, Object.assign({}, o, { smart: false }));
    if (r0.overflow.length < r1.overflow.length){ r0.smart = false; return r0; }
  }
  r1.smart = smart;
  return r1;
}
function planGardenOnce(env, G, o){
  o = o || {};
  LAYOUT.north = (G.plan && G.plan.north) || 'up';
  const scale = o.scale != null ? o.scale : 1, cache = o.cache || {}, ov = o.ov || {};
  const zs = (G.zones || []).filter(z => z.type === 'bed' || z.type === 'pots');
  const packers = zs.map(z => z.type === 'bed' ? bedPacker(z, !!o.smart) : potPacker(z));
  const zres = zs.map((z, i) => ({ z, packer: packers[i], items: [], overflow: [] }));
  const byEntry = {}, all = [], overflow = [];
  const entries = (G.entries || []).filter(e => CROP_BY_ID[e.crop] && e.qty > 0);
  const zi = id => zs.findIndex(z => z.id === id);

  const planIn = (e, eff, z) => {
    const k = e.id + '|' + (e.how || 'auto') + '|' + (z.cover || 'open') + '|' + (z.light || 'sun');
    return cache[k] || (cache[k] = planCrop(env.C, eff, { succ: G.succ, hor: G.hor, ov, key: e.id, ctx: { cover: z.cover, light: z.light } }));
  };
  /* explicit zones first, then the rest by how choosy they are */
  const explicit = entries.filter(e => e.zone && e.zone !== 'auto' && zi(e.zone) >= 0);
  const auto = entries.filter(e => !(e.zone && e.zone !== 'auto' && zi(e.zone) >= 0));
  const opts = auto.map(e => {
    const c0 = CROP_BY_ID[e.crop], eff = effCrop(c0, e);
    const cands = zs.map((z, i) => ({ z, i, pls: planIn(e, eff, z) })).filter(x => x.pls.length);
    return { e, c0, eff, cands };
  }).sort((a, b) => a.cands.length - b.cands.length || (b.c0.warm | 0) - (a.c0.warm | 0));

  const place = (e, c0, eff, z, i, pls) => {
    const pk = packers[i], items = [];
    const plants = pk.kind === 'bed' ? Math.max(1, Math.round(e.qty * scale)) : e.qty;
    let ok = true;
    for (const pl of pls){
      const it = Object.assign({}, pl, { entryId: e.id, zoneId: z.id, plants, x: null, area: 0, len: 0,
        nur: eff.nur, how: eff.how, kind: eff.kind, name: e.name || '' });
      items.push(it);
      if (ok && !pk.tryPlace(it, eff)) ok = false;
    }
    return { ok, items };
  };
  const finish = (e, c0, eff, z, i, res) => {
    res.items.forEach(it => { zres[i].items.push(it); all.push(it); if (it.x == null){ zres[i].overflow.push(it); overflow.push(it); } });
    byEntry[e.id] = { entry: e, crop: c0, eff, zoneId: z.id, zone: z, items: res.items, fits: res.ok, reason: null };
  };
  const rollback = (i, res) => res.items.forEach(it => { if (it.x != null) packers[i].remove(it); });

  for (const e of explicit){
    const c0 = CROP_BY_ID[e.crop], eff = effCrop(c0, e), i = zi(e.zone), z = zs[i];
    const pls = planIn(e, eff, z);
    if (!pls.length){ byEntry[e.id] = { entry: e, crop: c0, eff, zoneId: z.id, zone: z, items: [], fits: false, reason: whyNot(env.C, eff, { hor: G.hor, ctx: { cover: z.cover, light: z.light } }) }; continue; }
    finish(e, c0, eff, z, i, place(e, c0, eff, z, i, pls));
  }
  for (const a of opts){
    const { e, c0, eff, cands } = a;
    if (!cands.length){
      byEntry[e.id] = { entry: e, crop: c0, eff, zoneId: null, zone: null, items: [], fits: false,
        reason: zs.length ? (whyNot(env.C, eff, { hor: G.hor, ctx: { cover: zs[0].cover, light: zs[0].light } }) || { code: 'none', text: 'no window found in any of your spaces' }) : { code: 'nozone', text: 'you haven’t added a bed or pots yet' } };
      continue;
    }
    const need = potNeed(eff);
    const scored = cands.map(x => {
      const n = x.pls.length, first = x.pls[0];
      let s = 100 * n - (first.m - OFF) * 0.1;
      if (x.pls.some(p => p.light)) s -= 20;
      if (x.z.type === 'pots'){ const big = Math.max.apply(null, potSlots(x.z).map(q => q.l).concat([0])); s += eff.pots ? 8 : -8; if (big < need * 0.7) s -= 500; else if (need > 30) s -= 25; }
      else s += 4;
      if (x.z.cover && x.z.cover !== 'open' && !eff.warm) s -= 6;
      return Object.assign({ s }, x);
    }).sort((p, q) => q.s - p.s);
    let done = false;
    for (const x of scored){
      const res = place(a.e, a.c0, a.eff, x.z, x.i, x.pls);
      if (res.ok){ finish(a.e, a.c0, a.eff, x.z, x.i, res); done = true; break; }
      rollback(x.i, res);
    }
    if (!done){ const x = scored[0], res = place(a.e, a.c0, a.eff, x.z, x.i, x.pls); finish(a.e, a.c0, a.eff, x.z, x.i, res); }
  }

  /* rotation: the same plant family following itself in the same bed */
  zres.forEach(zr => {
    if (zr.packer.kind !== 'bed') return;
    const its = zr.items.filter(i => i.x != null).slice().sort((a, b) => a.p - b.p);
    for (const b of its){
      const cb = CROP_BY_ID[b.cropId], fb = BOT[cb.bot];
      if (!fb || fb.rest < 2 || cb.bot === 'legume' || cb.perennial || isCover(cb)) continue;
      for (const a of its){
        if (a === b || a.entryId === b.entryId || a.end > b.p + 7 || b.p - a.end > 400) continue;
        const ca = CROP_BY_ID[a.cropId]; if (ca.bot !== cb.bot || ca.perennial) continue;
        if (a.x < b.x + b.len && b.x < a.x + a.len){ b.rot = ca.n; break; }
      }
    }
  });
  return { items: all, byEntry, zones: zres, overflow, scale };
}

/* shrink bed quantities until everything fits (pots aren't scaled) */
function autoFitGarden(env, G, o){
  const cache = (o && o.cache) || {};
  for (let s = 1; s >= 0.25; s -= 0.05){
    const r = planGarden(env, G, Object.assign({}, o, { scale: s, cache }));
    if (!r.overflow.length) return Math.round(s * 100) / 100;
  }
  return 0.25;
}

/* how full is each zone over time (beds: m², pots: number of pots) */
function utilisationZones(plan, from, to, step){
  return plan.zones.map(zr => {
    const cap = zr.packer.cap, out = [];
    for (let t = from; t < to; t += step){
      let used = 0;
      for (const it of zr.items) if (it.x != null && it.p <= t && t < it.end) used += zr.packer.kind === 'bed' ? it.area : it.potsUsed;
      out.push({ t, used, pct: cap > 0 ? used / cap : 0 });
    }
    return { z: zr.z, kind: zr.packer.kind, cap, series: out };
  });
}
function peakUse(series){ return series.reduce((m, u) => u.used > m.used ? u : m, { used: 0, t: OFF, pct: 0 }); }

/* ---------- shopping list ---------- */
function shopping(items, waterMult, plan){
  const byKey = {};
  for (const it of items){
    const c = CROP_BY_ID[it.cropId], k = c.id + '|' + it.how;
    const e = byKey[k] || (byKey[k] = { crop: c, how: it.how, kind: it.kind, plants: 0, rounds: 0, sow: c.sow });
    e.plants += it.plants; e.rounds++;
  }
  const rows = Object.values(byKey).map(e => {
    const c = e.crop; let buy = '', extra = '';
    const pk = n => { const p = Math.max(1, Math.ceil(n / c.pack)); return p + ' packet' + (p > 1 ? 's' : ''); };
    if (e.kind === 'seedling' && e.how === 'buy'){ buy = e.plants + ' seedlings'; extra = 'buy from a garden centre'; }
    else if (e.kind === 'seedling'){ const n = Math.ceil(e.plants * 1.3); buy = n + ' seeds'; extra = 'to raise ' + e.plants + ' seedlings in trays' + (c.pack > 1 ? ' (' + pk(n) + ')' : '') + ' — or buy ' + e.plants + ' seedlings'; }
    else if (e.kind === 'direct'){ const seeds = Math.ceil(e.plants * (c.sow || 1.5)); buy = seeds + ' seeds'; extra = pk(seeds); }
    else if (e.kind === 'tuber'){ buy = (Math.ceil(e.plants * 0.07 * 2) / 2).toFixed(1) + ' kg seed potatoes'; extra = 'certified seed, ~' + e.plants + ' tubers'; }
    else if (e.kind === 'clove'){ buy = Math.ceil(e.plants / 7) + ' bulbs of seed garlic'; extra = 'split into ~' + e.plants + ' cloves'; }
    else if (e.kind === 'slip'){ buy = e.plants + ' kumara slips'; extra = 'or sprout your own from tubers'; }
    else if (e.kind === 'bulb'){ buy = e.plants + ' ' + (c.bunit || 'bulbs'); extra = 'plant at the right depth for the size'; }
    return { id: c.id, name: c.n, group: c.g, plants: e.plants, rounds: e.rounds, buy, extra, how: e.how, unit: c.u || 'kg',
             kg: Math.round(e.plants * c.kg * 10) / 10, water: c.water };
  });
  rows.sort((a, b) => GROUPS[a.group].slot - GROUPS[b.group].slot || a.name.localeCompare(b.name));
  const P = id => { const its = items.filter(i => i.cropId === id); if (!its.length) return 0; const rs = new Set(its.map(i => i.key)).size; return its.reduce((s, i) => s + i.plants, 0) / Math.max(1, rs / Math.max(1, new Set(its.map(i => i.entryId)).size)); };
  const supplies = [];
  const bedA = plan ? plan.zones.filter(z => z.packer.kind === 'bed').reduce((s, z) => s + (z.items.length ? z.packer.cap : 0), 0) : 0;
  if (bedA > 0){
    supplies.push({ name: 'Compost (top-dress 2.5 cm)', qty: Math.ceil(bedA * 25 / 40) + ' × 40 L bags' });
    supplies.push({ name: 'Mulch (pea straw / bark, 5 cm)', qty: Math.ceil(bedA * 50 / 40) + ' × 40 L bags' });
  }
  const potL = plan ? plan.zones.filter(z => z.packer.kind === 'pots').reduce((s, z) => { const used = new Set(); z.items.forEach(i => (i.slots || []).forEach(x => used.add(x))); return s + Array.from(used).reduce((t, x) => t + z.packer.slots[x].l, 0); }, 0) : 0;
  if (potL > 0) supplies.push({ name: 'Potting mix (refresh about a third of each pot’s volume each season)', qty: Math.ceil(potL / 3) + ' L, or ' + Math.ceil(potL) + ' L if starting fresh' });
  const stakes = Math.ceil(P('tomato') + P('cherry'));
  if (stakes) supplies.push({ name: 'Tall stakes or string for vine tomatoes', qty: stakes });
  const cages = Math.ceil(P('tomatodet') + P('paste'));
  if (cages) supplies.push({ name: 'Short stakes or cages for bush tomatoes', qty: cages });
  if (items.some(i => i.cropId === 'cbean')) supplies.push({ name: 'Bean poles / teepee canes', qty: Math.ceil(P('cbean') / 3) + ' × 2 m canes' });
  if (items.some(i => i.cropId === 'sweetpea')) supplies.push({ name: 'Netting or canes for sweet peas', qty: Math.max(1, Math.ceil(P('sweetpea') / 10)) + ' m of support' });
  if (items.some(i => i.cropId === 'cucumber')) supplies.push({ name: 'Trellis / netting for cucumbers', qty: Math.max(1, Math.ceil(P('cucumber') * 0.3)) + ' m' });
  if (items.some(i => i.cropId === 'dahlia' || i.cropId === 'sunflower')) supplies.push({ name: 'Stakes for dahlias and tall sunflowers', qty: Math.ceil(P('dahlia') + P('sunflower') / 2) });
  const brassArea = items.filter(i => CROP_BY_ID[i.cropId].g === 'bras' && i.area).reduce((s, i) => Math.max(s, i.area), 0);
  if (brassArea > 0) supplies.push({ name: 'Insect netting for brassicas', qty: '≈ ' + Math.ceil(brassArea * 1.3) + ' m²' });
  /* feeds & amendments */
  const profs = {}; items.forEach(i => { const c = CROP_BY_ID[i.cropId], pr = FEEDS[c.feed]; if (pr && pr.buy){ const e = profs[c.feed] || (profs[c.feed] = { pr, plants: 0 }); e.plants += i.plants; } });
  Object.keys(profs).forEach(k => supplies.push({ name: profs[k].pr.buy, qty: 'for about ' + profs[k].plants + ' plants (' + profs[k].pr.name.split(',')[0].toLowerCase() + ' …)' }));
  return { rows, supplies };
}

/* ---------- agenda events ---------- */
function events(items){
  const ev = [];
  for (const it of items){
    const c = CROP_BY_ID[it.cropId], nm = (it.name ? it.name + ' ' : '') + c.n.toLowerCase();
    if (it.nur > 0){
      if (it.how === 'buy'){
        ev.push({ t: it.p - 7, key: it.key, cropId: c.id, kind: 'sow', text: 'Buy ' + nm + ' seedlings (harden off before planting)', r: it.r });
      } else {
        const t = it.p - it.nur * 7;
        ev.push({ t, key: it.key, cropId: c.id, kind: 'sow', text: (t < OFF ? 'Buy ' + nm + ' seedlings' : 'Sow ' + nm + ' seed in trays'), r: it.r });
      }
    }
    const verb = it.kind === 'direct' ? 'Sow ' + nm + ' direct' : it.kind === 'tuber' ? 'Plant ' + nm : it.kind === 'clove' ? 'Plant ' + nm + ' cloves' : it.kind === 'slip' ? 'Plant out ' + nm + ' slips' : it.kind === 'bulb' ? 'Plant ' + nm + ' (' + (c.bunit || 'bulbs') + ')' : 'Plant out ' + nm;
    ev.push({ t: it.p, key: it.key, cropId: c.id, kind: 'plant', text: verb, r: it.r });
    if (c.kg > 0) ev.push({ t: it.m, key: it.key, cropId: c.id, kind: 'harvest', text: (c.g === 'flow' ? 'First ' + nm + ' to cut' : 'First ' + nm + ' harvest'), r: it.r });
  }
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

/* ---------- soil amendments + feeding, from each crop's profile ---------- */
function careTasks(items){
  const out = [];
  for (const it of items){
    const c = CROP_BY_ID[it.cropId], pr = FEEDS[c.feed]; if (!pr) continue;
    out.push({ key: it.key + '|pre', t: it.p - 7, kind: 'pre', item: it, prof: pr });
    if (pr.feed){
      const from = it.p + pr.feed.from, stop = Math.min(it.end, it.m + pr.feed.to);
      let n = 0;
      for (let t = from; t <= stop && n < 40; t += pr.feed.every) out.push({ key: it.key + '|f' + (n++), t, kind: 'feed', item: it, prof: pr });
    }
    out.push({ key: it.key + '|post', t: it.end, kind: 'post', item: it, prof: pr });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}
/* feed state for one running planting, from the log (dates as timeline indices) */
function feedState(it, lastFeedT, todayT){
  const c = CROP_BY_ID[it.cropId], pr = FEEDS[c.feed];
  if (!pr || !pr.feed) return null;
  const f = pr.feed, stop = Math.min(it.end, it.m + f.to), first = it.p + f.from;
  if (todayT > stop) return { state: 'done', next: null, f };
  const next = lastFeedT != null ? lastFeedT + f.every : first;
  if (next > stop) return { state: 'done', next: null, f };
  const st = next <= todayT ? 'due' : next <= todayT + 3 ? 'soon' : 'later';
  return { state: st, next: Math.max(next, first), f, late: todayT - next };
}

/* ---------- watering guidance ----------
   wx: { tMean: mean air temp next few days, rainPast: mm over the last 7 days, rainSoon: mm expected in the next 2 days, rainYest: mm yesterday+today } */
function waterAdvice(zr, todayT, wx, lastWaterT){
  const z = zr.z, active = zr.items.filter(i => i.x != null && i.p - 3 <= todayT && todayT < i.end);
  if (!active.length) return null;
  const glass = z.cover === 'glass', pots = zr.packer.kind === 'pots';
  const lvl = active.reduce((s, i) => s + CROP_BY_ID[i.cropId].water, 0) / active.length;
  const T = wx.tMean;
  const f = clamp(1 - 0.07 * (T - 16), 0.45, 1.5);
  let base = lvl >= 2.5 ? 3 : lvl >= 1.6 ? 4 : 6;
  if (pots) base *= 0.5;
  if (glass) base *= 0.85; else if (z.cover === 'cloche') base *= 0.92;
  const interval = Math.max(1, Math.round(base * f * 2) / 2);
  const rainOK = !glass && z.cover !== 'cloche';
  const rainY = rainOK ? wx.rainYest || 0 : 0, rainS = rainOK ? wx.rainSoon || 0 : 0, rainP = rainOK ? wx.rainPast || 0 : 0;
  const mmWeek = clamp(1.7 * (T - 4), 6, 34) * (lvl / 2);
  const usedArea = active.reduce((s, i) => s + (i.area || 0), 0);
  let volume = '';
  if (pots){
    const slots = new Set(); active.forEach(i => (i.slots || []).forEach(x => slots.add(x)));
    const avg = Array.from(slots).reduce((s, x) => s + zr.packer.slots[x].l, 0) / Math.max(1, slots.size);
    const per = Math.max(0.3, Math.round(avg * (0.13 + 0.05 * (lvl - 1)) * (f > 1 ? 0.9 : 1.1) * 10) / 10);
    volume = 'about ' + per + ' L per pot, until it runs from the bottom (' + slots.size + ' pot' + (slots.size === 1 ? '' : 's') + ' in use)';
  } else {
    const net = Math.max(0, mmWeek - rainP * 0.8);
    volume = '~' + Math.round(net) + ' L per m² this week' + (usedArea > 0 ? ' (about ' + Math.round(net * usedArea) + ' L for the ' + (Math.round(usedArea * 10) / 10) + ' m² in use)' : '') + (rainP >= 2 ? ', after counting ' + Math.round(rainP) + ' mm of rain' : '');
  }
  const since = lastWaterT != null ? todayT - lastWaterT : null;
  let state, note;
  if (rainY >= 5){ state = 'skip'; note = 'Rain today or yesterday (' + Math.round(rainY) + ' mm) — skip watering.'; }
  else if (rainS >= 6 && (since == null || since < interval + 2)){ state = 'skip'; note = 'Rain forecast (' + Math.round(rainS) + ' mm) — probably skip today.'; }
  else if (since == null){ state = 'unknown'; note = 'No watering logged yet — check the soil about 5 cm down.'; }
  else if (since >= interval){ state = since >= interval * 1.5 ? 'over' : 'due'; note = 'Last watered ' + since + ' day' + (since === 1 ? '' : 's') + ' ago.'; }
  else { state = 'ok'; note = 'Watered ' + since + ' day' + (since === 1 ? '' : 's') + ' ago; next about ' + Math.max(1, Math.ceil(interval - since)) + ' day' + (Math.ceil(interval - since) === 1 ? '' : 's') + '.'; }
  return { state, note, interval, volume, active: active.length, pots, glass };
}

/* ============ perennials: grapes, fruit trees, flowering shrubs ============ */
const P_ANCHOR = 213;   // 1 Aug: the season's degree-days start counting here
function pOffset(doy){ return ((doy - P_ANCHOR) % 365 + 365) % 365; }
/* how much of a glasshouse's warmth reaches a plant: deciduous trees are dormant through the cold months, evergreens aren't */
const PHEN_SHIFT = 12;     // citrus: days earlier per °C warmer growing season
const PHEN_KAPPA = 0.45;   // share of a temperature anomaly that reaches bloom/ripening dates
const COVER_SCALE = { pome: 0.4, stone: 0.4, vine: 0.4, orn: 0.4, citrus: 1 };
/* work out how many degree-days each stage needs (and the fastest it can plausibly go), from the reference town's typical dates */
function calibratePerennials(){
  PERENNIALS.forEach(p => {
    const reg = REGIONS.find(r => r.id === p.ref) || REGIONS[0], b = baselineFromRegion(reg);
    const gd = [], gap = []; let prevOff = -1;
    p.st.forEach((s, i) => {
      const off = pOffset(mmddToDoy(s[2]));
      let g = 0;
      for (let k = prevOff + 1; k <= off; k++){ const d = ((P_ANCHOR - 1 + k) % 365) + 1; g += Math.max(0, b.air0[d] - p.tb); }
      gd.push(Math.max(g, 0.01));
      gap.push(i === 0 ? Math.max(0, off - 25) : Math.round(0.88 * (off - prevOff)));   // fastest plausible: a bit quicker than the reference
      prevOff = off;
    });
    p.gd = gd; p.gapMin = gap; p.refAir0 = b.air0;
    p.refGap = p.st.length > 1 ? pOffset(mmddToDoy(p.st[p.st.length - 1][2])) - pOffset(mmddToDoy(p.st[p.st.length - 2][2])) : null;
  });
}
calibratePerennials();

/* predict the stages of a tree/vine/shrub for the season in progress and the next one.
   tree: { type, cover, light, cal (days) }   → seasons: [{ t:[stage times], ripe, end, ok, ... }]      */
function predictPerennial(C, tree, Cn){
  const p = PERENNIAL_BY_ID[tree.type]; if (!p) return null;
  const cover = tree.cover || 'open', light = tree.light || 'sun', cs = COVER_SCALE[p.g] != null ? COVER_SCALE[p.g] : 0.5;
  /* phenology responds less than one-for-one to warmth (κ): measured against the reference town's normal temperatures, so the calibration dates hold exactly there */
  const cumPh = CC => {
    const v = CC.variant(cover, light, cs), key = 'ph|' + v.key + '|' + p.tb + '|' + p.id;
    if (CC._cum[key]) return CC._cum[key];
    const c = new Float64Array(CC.N + 1), ra = p.refAir0;
    for (let i = 0; i < CC.N; i++){
      const r0 = ra[CC.doy[i]], T = r0 + PHEN_KAPPA * (v.air[i] - r0);
      c[i+1] = c[i] + Math.max(0, T - p.tb);
    }
    return CC._cum[key] = c;
  };
  const run = (CC, a) => {
    const v = CC.variant(cover, light, cs), cum = cumPh(CC), out = [];
    let cur = a;
    for (let i = 0; i < p.st.length; i++){
      const target = cum[cur] + p.gd[i];
      if (cum[CC.N] < target) return null;
      let lo = cur, hi = CC.N - 1;
      while (lo < hi){ const mid = (lo + hi) >> 1; if (cum[mid+1] >= target) hi = mid; else lo = mid + 1; }
      const floor = i === 0 ? a + p.gapMin[0] : out[i-1] + p.gapMin[i];
      const ti = Math.max(lo, floor);
      out.push(ti); cur = ti + 1;
    }
    return out;
  };
  /* citrus ripens over the winter, when there are almost no degree-days to count, so a degree-day model is jumpy.
     Instead shift the reference dates by how much warmer or cooler the growing season (Nov–Apr) is than at the reference town. */
  let shiftD = new WeakMap();
  const refT = (() => { if (!p.shift) return 0; let sm = 0, n = 0; for (let i = 91; i <= 270; i++){ sm += p.refAir0[((P_ANCHOR - 1 + i) % 365) + 1]; n++; } return sm / n; })();
  const runShift = (CC, a) => {
    const v = CC.variant(cover, light, cs); let sm = 0, n = 0;
    for (let i = a + 91; i <= a + 270; i++){ if (i >= CC.N) return null; sm += v.air[i]; n++; }
    const dT = sm / n - refT, d = Math.round(clamp(-PHEN_SHIFT * dT, -45, 45));
    const last = a + pOffset(mmddToDoy(p.st[p.st.length - 1][2])) + d; if (last >= CC.N - 1) return null;
    const out = p.st.map(x => a + pOffset(mmddToDoy(x[2])) + d); out.dT = dT; return out;
  };
  const anchors = [];
  for (let t = 0; t < C.N; t++) if (C.doy[t] === P_ANCHOR) anchors.push(t);
  const cal = tree.cal || 0, seasons = [];
  let sawAny = false;
  for (const a of anchors){
    const st = p.shift ? runShift(C, a) : run(C, a); if (!st) continue;
    sawAny = true;
    const stN = Cn ? (p.shift ? runShift(Cn, a) : run(Cn, a)) : null;
    const ripeT = st[st.length - 1] + cal, endT = ripeT + p.win;
    if (endT < OFF - 20) continue;
    const v = C.variant(cover, light, cs);
    const bloomT = st[0] + cal, bd = C.doy[Math.min(C.N - 1, bloomT)];
    const gapNow = st.length > 1 ? st[st.length - 1] - st[st.length - 2] : null;
    seasons.push({ p, anchor: a, st: st.map(x => x + cal), ripe: ripeT, end: endT,
      normalRipe: stN ? stN[stN.length - 1] + cal : null,
      marginal: p.shift ? st.dT < -1.5 : (gapNow != null && p.refGap ? gapNow > 1.3 * p.refGap : false),
      unlikely: p.shift ? st.dT < -3.2 : (gapNow != null && p.refGap ? gapNow > 1.7 * p.refGap : false),
      frostGap: (p.frost === 'blossom' || p.frost === 'budburst') && v.lsf - bd > 0 ? v.lsf - bd : null,
      year: C.dateOf(ripeT).getUTCFullYear() });
    if (seasons.length >= 2) break;
  }
  return { seasons, never: !sawAny || (seasons.length > 0 && seasons.every(x => x.unlikely)) };
}
/* days between the model's normal-year ripe date and a date the owner says is typical */
function calFromTypical(C, Cn, tree, typicalT){
  const r = predictPerennial(Cn, Object.assign({}, tree, { cal: 0 }));
  if (!r || !r.seasons.length) return 0;
  let best = r.seasons[0]; r.seasons.forEach(x => { if (Math.abs(x.ripe - typicalT) < Math.abs(best.ripe - typicalT)) best = x; });
  return Math.round(typicalT - best.ripe);
}

/* ---------- climate stats for the briefing ---------- */
function climateStats(C){
  const v = C.v.base;
  let warm = 0; for (let t = OFF; t < OFF + 365; t++) if (v.air[t] >= 14) warm++;
  const lsfT = nextDoy(C, OFF - 60, v.lsf), fafT = nextDoy(C, Math.max(OFF - 60, 0), v.faf);
  return { warmDays: warm, lsfT, fafT, lsf: v.lsf, faf: v.faf };
}

/* first feasible plant date from today (or null) */
function firstFeasible(C, crop, hor, ctx){
  const pMax = Math.min(C.N - 2, OFF + (hor || 365));
  for (let q = OFF; q < pMax; q++){ const e = evalPlant(C, crop, q, ctx); if (e) return e; }
  return null;
}

if (typeof module !== 'undefined') module.exports = { OFF, NDAYS, DAY, CROP_BY_ID, PERENNIAL_BY_ID, COVERS, LIGHTS, PROTECTION, utcMidnight, doyOfMs, mmddToDoy, baselineFromRegion, baselineFromNormals, seasonalAnom, buildClimate, evalPlant, planCrop, planGarden, autoFitGarden, utilisationZones, peakUse, effCrop, howOptions, potNeed, potShare, potSlots, bedArea, bedStrip, shopping, events, careTasks, feedState, waterAdvice, predictPerennial, calFromTypical, whyNot, climateStats, firstFeasible, MONTHS };
