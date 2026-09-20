/* ============================================================
   ADVICE ENGINE — companions, rotation, light and height, soil balance, diversity, harvest spread,
   crop suggestions, weather alerts and pest watch. Pure functions over the plan (R) and the garden (S).
   ============================================================ */
'use strict';

/* smart layout settings (set by planGarden before it packs) */
const LAYOUT = { north: 'up', smart: true };
let ADV_VER = 0;                       // bumped whenever the crop list changes, so cached relations are dropped
const _relMemo = {};

const EV_W = { sci: 1, prac: 0.8, mixed: 0.7, trad: 0.4 };
const EV_TXT = { sci: 'research-backed', mixed: 'mixed evidence', prac: 'practical', trad: 'traditional advice' };
const EV_HINT = {
  sci: 'Supported by controlled studies.',
  mixed: 'Some studies support this and others don’t. Worth trying, but don’t rely on it alone.',
  prac: 'A practical reason (shade, support, space or timing), not folklore.',
  trad: 'Traditional advice with little or no research behind it. Harmless to follow, but don’t worry if you can’t.'
};

/* ---------- families and pairs ---------- */
const famOf = c => BOT[c.bot] ? c.bot : 'other';
const isTomato = c => TOMATOES.indexOf(c.id) >= 0;
const isCover = c => c.id === 'greenman' || !!c.greenman;
const isHabitat = c => HABITAT.indexOf(c.id) >= 0;

function matchTok(c, t){
  if (t.charAt(0) === '@'){ const k = t.slice(1); return k === 'tomato' ? isTomato(c) : c.bot === k && !(k === 'brassica' && c.g === 'flow'); }   // sweet alyssum is a brassica but not one of the vegetable ones
  return c.id === t;
}
const matchSide = (c, side) => side.some(t => matchTok(c, t));
function relsBetween(ca, cb){
  if (!ca || !cb || ca.id === cb.id) return [];
  const k = ADV_VER + '|' + ca.id + '|' + cb.id;
  if (_relMemo[k]) return _relMemo[k];
  const out = PAIRS.filter(p => (matchSide(ca, p.a) && matchSide(cb, p.b)) || (matchSide(cb, p.a) && matchSide(ca, p.b)));
  return (_relMemo[k] = out);
}
/* crop ids that a pair side names, for suggestions */
function sideCrops(side){ return CROPS.filter(c => matchSide(c, side)); }

/* ---------- geometry (metres on the site plan; north can point up, right, down or left) ---------- */
function rectGap(a, b){
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  return Math.hypot(dx, dy);
}
const zRect = z => ({ x: z.x || 0, y: z.y || 0, w: z.w || 1, h: z.h || 1 });
function itRects(z, it){
  if (z.type === 'bed' && it.x != null && it.len > 0) return bedSegs(z, it).map(s => ({ x: (z.x || 0) + s.x, y: (z.y || 0) + s.y, w: s.w, h: s.h }));
  return [zRect(z)];
}
function minGap(ra, rb){
  let best = { d: 1e9, a: ra[0], b: rb[0] };
  for (const a of ra) for (const b of rb){ const d = rectGap(a, b); if (d < best.d) best = { d, a, b }; }
  return best;
}
const rc = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
function southVec(n){ return n === 'down' ? [0, -1] : n === 'left' ? [1, 0] : n === 'right' ? [-1, 0] : [0, 1]; }

/* does `tall` shade `short` (both { c: crop, it: planting }, with their rectangles)? → 'harm' | 'help' | null.
   In NZ the midday sun is in the north, so shade falls to the south. */
function shadeOn(tall, short, ta, sa){
  const ct = tall.c, cs = short.c;
  if (ct.hcm < 120 || cs.hcm > ct.hcm * 0.6 || ct.id === cs.id) return null;
  const s0 = Math.max(tall.it.p + 0.4 * (tall.it.m - tall.it.p), short.it.p), s1 = Math.min(tall.it.end, short.it.end);
  if (s1 - s0 < 14) return null;
  const g = minGap(ta, sa); if (g.d > ct.hcm / 100 * 1.2) return null;
  const A = rc(g.a), B = rc(g.b), sv = southVec(LAYOUT.north);
  const dx = B.x - A.x, dy = B.y - A.y, s = dx * sv[0] + dy * sv[1], l = Math.abs(dx * sv[1] - dy * sv[0]);
  if (s < 0.3 || s > ct.hcm / 100 * 1.2 + 0.6 || l > Math.max(1, s)) return null;
  if (SHADE_FRIENDLY.indexOf(cs.id) >= 0){ const m = monthOfT(Math.round((s0 + s1) / 2)); return (m >= 11 || m <= 3) ? 'help' : null; }
  return (cs.lt || 0) === 0 ? 'harm' : null;
}

/* cost of putting planting `it` at strip position x in bed z, given the plantings already there at the same time (lower is better) */
function layoutCost(z, it, x, busy){
  const c = CROP_BY_ID[it.cropId]; if (!c) return 0;
  const mr = itRects(z, { x, len: it.len }); let cost = 0;
  /* tall crops like the south side, where their shade falls outside the bed */
  if (c.hcm >= 120){
    const sv = southVec(LAYOUT.north), zc = rc(zRect(z)), me = rc(mr[mr.length - 1]);
    const span = Math.max(0.5, Math.abs((z.w || 1) * sv[0]) + Math.abs((z.h || 1) * sv[1]));
    cost -= 0.6 * Math.max(-1, Math.min(1, ((me.x - zc.x) * sv[0] + (me.y - zc.y) * sv[1]) / (span / 2)));
  }
  for (const q of busy){
    const cq = CROP_BY_ID[q.cropId]; if (!cq || q.entryId === it.entryId) continue;
    const qr = itRects(z, q), g = minGap(mr, qr); if (g.d > 1.3) continue;
    if (Math.min(it.end, q.end) - Math.max(it.p, q.p) < 14) continue;
    relsBetween(c, cq).forEach(p => {
      const w = EV_W[p.ev] || 0.5;
      if (p.rel === '-') cost += (p.sev >= 3 ? 12 : p.sev === 2 ? 6 : 2) * w;
      else if (p.rel === '+') cost -= 2.5 * w * Math.max(1, p.sev);
      else cost += 1;
    });
    const a = { c, it: Object.assign({}, it, { x, len: it.len }) }, b = { c: cq, it: q };
    let sh = shadeOn(a, b, mr, qr); if (sh === 'harm') cost += 5; else if (sh === 'help') cost -= 1;
    sh = shadeOn(b, a, qr, mr); if (sh === 'harm') cost += 5; else if (sh === 'help') cost -= 1;
  }
  return cost;
}

/* ---------- helpers on the plan ---------- */
const seasonYear = t => { const d = dateOfT(t), y = d.getUTCFullYear(); return d.getUTCMonth() >= 6 ? y : y - 1; };   // season starts 1 July
const seasonLabel = y => y + '/' + String((y + 1) % 100).padStart(2, '0');
const monthOfT = t => dateOfT(t).getUTCMonth() + 1;
function placedItems(R){ return R.items.filter(i => i.x != null); }
const overlapDays = (a, b) => Math.min(a.end, b.end) - Math.max(a.p, b.p);
const entryOf = (S, id) => S.entries.find(e => e.id === id);
const cropNames = list => { const a = Array.from(new Set(list)); return a.length <= 2 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
const lc = s => s.charAt(0).toLowerCase() + s.slice(1);

/* neighbouring plantings that share time and space, as entry pairs with the relations between them */
function neighbourPairs(R){
  const zs = {}; R.plan.zones.forEach(zr => zs[zr.z.id] = zr.z);
  const its = placedItems(R).filter(i => zs[i.zoneId]);
  const rects = new Map(); its.forEach(i => rects.set(i, itRects(zs[i.zoneId], i)));
  const byKey = {};
  for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++){
    const a = its[i], b = its[j];
    if (a.entryId === b.entryId) continue;
    const ca = CROP_BY_ID[a.cropId], cb = CROP_BY_ID[b.cropId], rel = relsBetween(ca, cb);
    if (!rel.length) continue;
    const ov = overlapDays(a, b); if (ov < 14) continue;
    const za = zs[a.zoneId], zb = zs[b.zoneId];
    let d;
    if (a.zoneId === b.zoneId) d = za.type === 'pots' ? 0 : minGap(rects.get(a), rects.get(b)).d;
    else d = rectGap(zRect(za), zRect(zb));
    const near = d <= (a.zoneId === b.zoneId ? 1.3 : 1.5);
    const same = a.zoneId === b.zoneId;
    const k = a.entryId < b.entryId ? a.entryId + '|' + b.entryId : b.entryId + '|' + a.entryId;
    const cur = byKey[k];
    if (!cur || (near && !cur.near) || (near === cur.near && ov > cur.ov)) byKey[k] = { a, b, ca, cb, rel, ov, d, near, same, key: k };
  }
  return Object.values(byKey);
}
const SEV_TXT = { 3: 'serious', 2: 'worth avoiding', 1: 'minor' };

/* ---------- the analysis ---------- */
function analyse(R, S){
  const F = [], good = [];
  const add = (id, sev, cat, title, body, o) => { if (S.adv && S.adv.dismissed && S.adv.dismissed[id]) return; F.push(Object.assign({ id, sev, cat, title, body }, o || {})); };
  const zonesOf = k => S.zones.filter(z => z.type === k);
  const beds = zonesOf('bed'), pots = zonesOf('pots');
  const entries = S.entries.filter(e => CROP_BY_ID[e.crop]);
  const P = S.profile || {};

  /* ---- setup ---- */
  if (!beds.length && !pots.length) add('setup:space', 3, 'Setup', 'Add somewhere to grow', 'There is no bed or pot on the site plan yet, so the planner cannot lay anything out.', { fix: { label: 'Open the site plan', act: 'advgo', tab: 'site' } });
  else if (!entries.length) add('setup:crops', 2, 'Setup', 'Choose some plants', 'Pick a few plants in the list above and this page will start giving advice.', {});
  if (!(P.soil && P.soil !== 'unknown') && !P.done) add('setup:profile', 1, 'Setup', 'Tell me about your soil and site', 'Soil type, wind and how much experience you have change the advice, for example which techniques to suggest.', { fix: { label: 'Fill in the garden profile', act: 'advgo', tab: 'advisor', sec: 'profile' } });

  /* ---- light and fit ---- */
  const unfit = [];
  entries.forEach(e => {
    const b = R.plan.byEntry[e.id]; if (!b) return; const c = b.crop;
    if (!b.fits && b.items.length === 0){
      unfit.push({ e, b });
      if (b.reason && b.reason.code === 'shade'){
        const alt = S.zones.filter(z => (z.type === 'bed' || z.type === 'pots') && (LIGHTS[z.light || 'sun'].rank <= (c.lt || 0)));
        add('nofit:' + e.id, 3, 'Light and space', c.n + ' won’t grow well where it is', 'The space is too shady for it. ' + (alt.length ? 'It needs more light than ' + (b.zone ? b.zone.name : 'the spaces you have set up') + ' gets.' : 'None of your spaces has enough light.'),
          alt.length ? { fix: { label: 'Try ' + alt[0].name, act: 'advmove', ent: e.id, zone: alt[0].id } } : { fix: { label: 'Open the site plan', act: 'advgo', tab: 'site' } });
      }
      return;
    }
    const shady = b.items.find(i => i.light === 'shady'), sunny = b.items.find(i => i.light === 'sunny');
    if (shady){
      const alt = S.zones.filter(z => z.id !== b.zoneId && (z.type === 'bed' || z.type === 'pots') && LIGHTS[z.light || 'sun'].rank <= (c.lt || 0));
      add('shady:' + e.id, 2, 'Light and space', c.n + ' is in a shadier spot than it likes', 'In ' + (b.zone ? b.zone.name : 'this space') + ' it will crop about 25% less and take longer. It does best in full sun.',
        alt.length ? { fix: { label: 'Move to ' + alt[0].name, act: 'advmove', ent: e.id, zone: alt[0].id } } : {});
    } else if (sunny && c.minShade){
      const alt = S.zones.filter(z => z.id !== b.zoneId && (z.type === 'bed' || z.type === 'pots') && LIGHTS[z.light || 'sun'].rank >= c.minShade);
      add('sunny:' + e.id, 2, 'Light and space', c.n + ' wants some shade', 'In ' + (b.zone ? b.zone.name : 'this space') + ' the full sun will stress it, and it will crop less. Put it in part shade, or shade it with a taller crop or shade cloth in summer.',
        alt.length ? { fix: { label: 'Move to ' + alt[0].name, act: 'advmove', ent: e.id, zone: alt[0].id } } : {});
    }
  });
  const nofitOthers = unfit.filter(u => !(u.b.reason && u.b.reason.code === 'shade'));
  if (nofitOthers.length) add('nofit:others', 2, 'Light and space', plural(nofitOthers.length, 'plant') + ' can’t be scheduled', nofitOthers.map(u => u.b.crop.n + (u.b.reason ? ' — ' + u.b.reason.text : '')).join('; ') + '.', { fix: { label: 'See “Your plants”', act: 'advgo', tab: 'calendar' } });
  if (R.overflow.length){
    const n = new Set(R.overflow.map(i => i.entryId)).size;
    add('overflow', 2, 'Light and space', plural(n, 'plant') + ' won’t fit in the space you have', 'Some plantings overlap in time and there isn’t enough bed or pot room. Make a bed bigger, add pots, or shrink the quantities.', { fix: { label: 'Shrink quantities to fit', act: 'fit' } });
  }

  /* ---- companions ---- */
  const nb = neighbourPairs(R);
  const conflicts = nb.filter(x => x.rel.some(p => p.rel === '-')), goods = nb.filter(x => x.rel.some(p => p.rel === '+') && x.near);
  /* one finding per rule, listing every plant it applies to (so one potato bed doesn't raise four separate tips) */
  const cgroups = {};
  conflicts.forEach(x => {
    const bad = x.rel.filter(p => p.rel === '-').sort((p, q) => q.sev - p.sev)[0];
    const isPoll = x.ca.bot === 'grass' && x.cb.bot === 'grass';
    if (!x.near && !isPoll && bad.sev < 3) return;
    if (!x.near && isPoll && x.d > 25) return;
    const sev = bad.sev >= 3 ? 3 : bad.sev === 2 ? 2 : 1, pi = PAIRS.indexOf(bad);
    const g = cgroups[pi] || (cgroups[pi] = { bad, pi, A: {}, B: {}, near: false, sev: 0, zones: [] });
    const fwd = matchSide(x.ca, bad.a) && matchSide(x.cb, bad.b), cA = fwd ? x.ca : x.cb, cB = fwd ? x.cb : x.ca;
    g.A[cA.id] = cA; g.B[cB.id] = cB; g.near = g.near || x.near; g.sev = Math.max(g.sev, x.near ? sev : Math.max(1, sev - 1));
    [x.a.zoneId, x.b.zoneId].forEach(id => { const n = zoneName(id); if (n && g.zones.indexOf(n) < 0) g.zones.push(n); });
  });
  Object.keys(cgroups).forEach(k => {
    const g = cgroups[k], A = Object.values(g.A), B = Object.values(g.B), nm = list => cropNames(list.map(c => c.n));
    const same = g.zones.length === 1;
    add('comp:' + g.pi + ':' + Object.keys(g.A).sort().join(',') + '|' + Object.keys(g.B).sort().join(','), g.sev, 'Companions',
      g.near ? nm(A) + ' planted close to ' + nm(B) : nm(A) + ' and ' + nm(B) + ' are growing at the same time',
      g.bad.why + ' ' + (same ? 'Both groups are in ' + g.zones[0] : 'They are in ' + cropNames(g.zones)) + (g.near ? ', within arm’s reach' : '') + '.',
      { ev: g.bad.ev, fix: { label: 'See the layout', act: 'advgo', tab: 'site' }, hint: 'Move one of them to another space, or ' + (same ? 'put a few metres between them.' : 'stagger the sowings.') });
  });
  const goodSeen = {};
  goods.forEach(x => {
    x.rel.filter(p => p.rel === '+').forEach(p => { const k = x.ca.id + '|' + x.cb.id; if (!goodSeen[k]){ goodSeen[k] = 1; good.push({ ca: x.ca, cb: x.cb, p }); } });
  });

  /* ---- height and shade (tall crops on the south side) ---- */
  {
    const zs = {}; R.plan.zones.forEach(zr => zs[zr.z.id] = zr.z);
    const its = placedItems(R).filter(i => zs[i.zoneId] && zs[i.zoneId].type === 'bed');
    const rects = new Map(); its.forEach(i => rects.set(i, itRects(zs[i.zoneId], i)));
    const seen = {};
    for (const t of its){
      const ct = CROP_BY_ID[t.cropId]; if (ct.hcm < 120) continue;
      for (const s of its){
        if (s === t || s.zoneId !== t.zoneId || s.entryId === t.entryId) continue;
        const cs = CROP_BY_ID[s.cropId];
        const r = shadeOn({ c: ct, it: t }, { c: cs, it: s }, rects.get(t), rects.get(s));
        if (!r) continue;
        const k = t.entryId + '|' + s.entryId;
        if (seen[k]) continue; seen[k] = 1;
        if (r === 'harm') add('shade:' + k, 2, 'Layout', ct.n + ' is shading ' + cs.n, ct.n + ' grows to about ' + (ct.hcm / 100).toFixed(1) + ' m and sits just north of ' + cs.n + ', which needs full sun. In NZ the sun is in the north, so tall crops belong on the south side of a bed.',
          { fix: S.smart ? null : { label: 'Turn on smart layout', act: 'advsmart' }, hint: 'Put ' + lc(ct.n) + ' at the south end of the bed, or move ' + lc(cs.n) + ' to another bed.' });
        else good.push({ shade: true, tall: ct, short: cs });
      }
    }
  }

  /* ---- rotation ---- */
  {
    const rot = {};
    R.plan.zones.forEach(zr => { if (zr.packer.kind !== 'bed') return;
      zr.items.forEach(it => { if (it.rot) rot[zr.z.id + '|' + it.entryId] = { zr, it, prev: it.rot }; }); });
    Object.keys(rot).forEach(k => {
      const { zr, it, prev } = rot[k], c = CROP_BY_ID[it.cropId], f = BOT[famOf(c)];
      add('rot:' + k, 2, 'Rotation', c.n + ' follows the same family in ' + zr.z.name, 'You have ' + prev + ' and ' + c.n + ' one after the other in this bed, and both are ' + f.short.toLowerCase() + ' plants. ' + (f.dz ? cap(f.dz) + '.' : ''),
        { fix: { label: 'Choose another bed', act: 'advgo', tab: 'calendar' }, hint: 'Put the second crop in a different bed, or follow with a different family.' });
    });
    /* history the gardener has recorded, against what the plan puts in each bed this year */
    beds.forEach(z => {
      const zr = R.plan.zones.find(q => q.z.id === z.id); if (!zr) return;
      const seen = {};
      zr.items.forEach(it => {
        if (it.x == null) return; const c = CROP_BY_ID[it.cropId], f = famOf(c), fam = BOT[f];
        if (!fam || fam.rest < 1 || c.perennial || isCover(c) || seen[f]) return; seen[f] = 1;
        const last = z.hist && z.hist[f]; if (last == null) return;
        const gap = seasonYear(it.p) - last;
        if (gap < fam.rest) add('hist:' + z.id + '|' + f, gap <= 0 ? 3 : 2, 'Rotation', fam.short + ' were in ' + z.name + ' in ' + seasonLabel(last),
          'The plan puts ' + c.n + ' there in ' + seasonLabel(seasonYear(it.p)) + '. Leave at least ' + fam.rest + ' year' + (fam.rest === 1 ? '' : 's') + ' between crops of the same family in one bed' + (fam.dz ? ', because ' + fam.dz : '') + '.',
          { fix: { label: 'Choose another space', act: 'advgo', tab: 'advisor', sec: 'rotation' } });
      });
    });
  }

  /* ---- soil balance and idle beds ---- */
  {
    const its = placedItems(R).filter(i => i.area > 0);
    let heavy = 0, giver = 0, all = 0;
    its.forEach(i => { const c = CROP_BY_ID[i.cropId], f = BOT[famOf(c)], a = i.area * Math.max(20, Math.min(i.end - i.p, 200)); all += a; if (isCover(c) || f && f.heavy === 0) giver += a; else if (f && f.heavy >= 3) heavy += a; });
    if (all > 0 && heavy / all >= 0.55 && giver / all < 0.08)
      add('soil:balance', 2, 'Soil', 'Mostly hungry crops, nothing to put nitrogen back', Math.round(heavy / all * 100) + '% of your bed time is tomato, cabbage, pumpkin or corn family plants, which take a lot from the soil, and there are almost no legumes or green manures to give some back.',
        { fix: { label: 'See suggestions', act: 'advgo', tab: 'advisor', sec: 'improve', focus: 'sug' }, hint: 'Slot in a legume (beans, peas) or a green manure between the heavy crops, and add compost.' });
    /* empty windows in beds that are otherwise used */
    R.util.filter(u => u.kind === 'bed' && u.cap > 0).forEach(u => {
      const ser = u.series.filter(s => s.t >= OFF - 3), anyUse = u.series.some(s => s.used > 0);
      if (!anyUse){ if (entries.length) add('idle:' + u.z.id, 1, 'Soil', u.z.name + ' has nothing planned', 'This bed is empty for the whole plan. Add plants to it, choose it for one of your crops, or sow a green manure to look after the soil.', { fix: { label: 'Choose plants', act: 'advgo', tab: 'calendar' } }); return; }
      let run = 0, start = null, out = [];
      ser.forEach((s, i) => { if (s.used === 0){ if (!run) start = s.t; run++; } else { if (run >= 8 && start > OFF - 3 - 1) out.push({ from: start, to: ser[i - 1].t }); run = 0; } });
      if (out.length){ const g = out[0], m = monthOfT(g.from + 14);
        const cool = m >= 3 && m <= 8;
        add('idle:' + u.z.id, 1, 'Soil', u.z.name + ' sits empty from ' + fmtT(g.from) + ' to ' + fmtT(g.to), 'A bare bed loses nutrients and grows weeds. ' + (cool ? 'Sow oats or lupin as a green manure, which can be dug in before the next crop.' : 'Sow phacelia or buckwheat, or a quick crop such as radish, as a green manure over the gap.'),
          { fix: { label: 'See the idea list', act: 'advgo', tab: 'site' } });
      }
    });
  }

  /* ---- diversity and habitat ---- */
  {
    const veg = entries.map(e => CROP_BY_ID[e.crop]).filter(c => c.g !== 'flow' && !isCover(c));
    const fams = new Set(veg.map(c => famOf(c)));
    if (veg.length >= 5 && fams.size <= 2) add('div:fam', 2, 'Diversity', 'Mostly one or two plant families', 'Only ' + fams.size + ' plant famil' + (fams.size === 1 ? 'y' : 'ies') + ' in the plan. A mix helps rotation, spreads risk from a pest or disease, and makes better use of the soil.', {});
    const hab = entries.filter(e => isHabitat(CROP_BY_ID[e.crop]));
    if (veg.length && !hab.length) add('div:habitat', 2, 'Diversity', 'No flowers for beneficial insects', 'Hoverflies, lacewings and small wasps eat aphids and caterpillars, but they need nectar. Sweet alyssum, dill, calendula or borage along a bed edge is one of the best-supported ways to cut down on pests.',
      { ev: 'sci', fix: { label: 'Add sweet alyssum', act: 'advadd', crop: 'alyssum' } });
    else if (hab.length) good.push({ plain: 'Flowers for beneficial insects and bees: ' + cropNames(hab.map(e => CROP_BY_ID[e.crop].n.toLowerCase())) + '.' });
    const leg = entries.filter(e => { const c = CROP_BY_ID[e.crop]; return c.bot === 'legume' || isCover(c); });
    if (veg.length >= 4 && !leg.length) add('div:legume', 1, 'Diversity', 'No legumes or green manures', 'Beans, peas and green manures feed the soil with nitrogen and break up a rotation. Even one row helps.', { fix: { label: 'Add dwarf beans', act: 'advadd', crop: 'dbean' } });
    const kids = (P.goals || []).indexOf('flowers') >= 0;
    if (kids && !entries.some(e => CROP_BY_ID[e.crop].g === 'flow' && !isHabitat(CROP_BY_ID[e.crop]) && CROP_BY_ID[e.crop].kg > 0)) add('div:cutflowers', 1, 'Diversity', 'You said you grow flowers, but none are in the plan', 'Add some cut flowers such as sunflowers, zinnias, cosmos or dahlias.', { fix: { label: 'Add zinnias', act: 'advadd', crop: 'zinnia' } });
  }

  /* ---- harvest spread ---- */
  const cov = harvestCoverage(R);
  {
    const total = cov.veg.reduce((s, x) => s + x, 0);
    if (total > 0){
      const gaps = []; cov.veg.forEach((n, i) => { if (n === 0 && cov.known[i]) gaps.push(i + 1); });
      if (gaps.length >= 3) add('harv:gaps', 1, 'Harvest', 'Nothing to pick in ' + gaps.slice(0, 5).map(m => MONTHS[m - 1]).join(', ') + (gaps.length > 5 ? ' and more' : ''), 'A garden that crops all year needs some winter and early-spring crops (kale, silverbeet, leeks, broad beans, carrots and garlic are good) as well as the summer ones. Fruit trees aren’t counted here.',
        { fix: { label: 'See suggestions', act: 'advgo', tab: 'advisor', sec: 'improve', focus: 'sug' } });
      else if (gaps.length === 0) good.push({ plain: cov.known.every(Boolean) ? 'Something to harvest in every month of the year.' : 'Something to harvest in every month the plan covers.' });
      if (!cov.known.every(Boolean)) add('harv:hor', 0, 'Harvest', 'Look further ahead to check winter', 'The plan only reaches ' + Math.round(Math.min(S.hor, 365) / 30.4) + ' months, so the winter and early-spring harvest can’t be checked. Set “Plan length” in the sidebar to 12 months or more.', {});
    }
  }

  /* ---- pots and glasshouse ---- */
  R.plan.zones.forEach(zr => {
    if (zr.packer.kind !== 'pots') return;
    const small = zr.items.filter(i => i.x != null && i.potL && potNeed(CROP_BY_ID[i.cropId]) > i.potL * 1.15);
    if (small.length){
      const s = small[0], c = CROP_BY_ID[s.cropId];
      add('pot:' + zr.z.id, 1, 'Pots', cropNames(small.map(i => CROP_BY_ID[i.cropId].n)) + (small.length > 1 ? ' are' : ' is') + ' in small pots', c.n + ' would like about ' + potNeed(c) + ' L per plant and gets ' + s.potL + ' L. It will work, but expect more frequent watering and feeding, and a smaller harvest.', { fix: { label: 'Adjust the pots', act: 'advgo', tab: 'site' } });
    }
    if (zr.z.cover === 'glass' && zr.items.some(i => i.x != null && CROP_BY_ID[i.cropId].warm))
      add('glass:' + zr.z.id, 0, 'Pots', zr.z.name + ': keep it ventilated', 'Glasshouse tomatoes and cucurbits do better with the vents open on any sunny morning above about 25 °C, shade cloth from December to February, and yellow sticky traps for whitefly.', { tech: 'glasshouse' });
  });

  /* ---- water ---- */
  {
    const dry = (R.anchors && R.anchors.r && R.anchors.r.sum <= -0.3) || S.rain === 'dry';
    const thirsty = entries.filter(e => CROP_BY_ID[e.crop].water >= 3);
    if (dry && thirsty.length >= 2)
      add('water:dry', 1, 'Water', 'A dry summer is forecast and you are growing thirsty crops', cropNames(thirsty.map(e => CROP_BY_ID[e.crop].n.toLowerCase())) + ' need steady moisture. Mulch, drip irrigation or ollas will cut watering by a lot and prevent split and rotting fruit.', { tech: 'drip' });
  }

  /* ---- trees and vines ---- */
  {
    const bySpecies = {};
    (S.trees || []).forEach(tr => { const info = POLLINATION[tr.type]; if (info) (bySpecies[info.sp] = bySpecies[info.sp] || []).push({ tr, info }); });
    Object.keys(bySpecies).forEach(sp => {
      const list = bySpecies[sp], distinct = new Set(list.map(x => x.tr.type));
      if (distinct.size >= 2) return;
      const x = list[0], spN = { apple: 'apple', pear: 'pear', nashi: 'nashi pear', cherry: 'cherry', plum: 'plum', feijoa: 'feijoa' }[sp];
      const nm = treeTitle(x.tr);
      add('pollen:' + sp, x.info.need >= 2 ? 2 : 1, 'Trees', 'Add a second ' + spN + ' variety to improve the crop', nm + (x.info.need >= 2 ? ' crops poorly on its own.' : ' sets fruit best with another variety.') + ' It wants a different ' + spN + ' variety flowering at the same time, within about 30 m (a neighbour’s tree counts' + (sp === 'apple' ? ', and so does a crab apple' : '') + ').' + (sp === 'apple' || sp === 'pear' ? ' Apple pollen won’t pollinate pears, or the other way round.' : ''),
        { fix: { label: 'A neighbour has one: hide this', act: 'advdismiss', id: 'pollen:' + sp } });
    });
    (S.trees || []).forEach(tr => {
      const pd = PERENNIAL_BY_ID[tr.type]; if (!pd) return;
      if (pd.frost === 'blossom' && (climateBand(R) === 'cool')) add('frost:' + tr.id, 1, 'Trees', treeTitle(tr) + ' flowers before the last frosts', 'In a cold region the blossom can be caught by late frost, which costs the whole crop. Keep a piece of frost cloth handy for the flowering weeks, or plant it against a warm wall.', { tech: 'cloches' });
    });
  }

  /* ordering + score */
  F.sort((a, b) => b.sev - a.sev);
  return { findings: F, good, coverage: cov, nb, score: scoreOf(F, R, S, cov, entries) };
}

/* how many plantings can be harvested in each month (next 12 months from today) */
function harvestCoverage(R){
  const veg = new Array(12).fill(0), flow = new Array(12).fill(0), known = new Array(12).fill(false);
  /* only the months the plan actually reaches can be judged */
  const hor = Math.min(typeof S !== 'undefined' && S && S.hor ? S.hor : 365, 365);
  for (let t = OFF; t <= OFF + hor; t++) known[monthOfT(t) - 1] = true;
  placedItems(R).forEach(it => {
    const c = CROP_BY_ID[it.cropId]; if (!c || !(c.kg > 0)) return;
    const a = Math.max(it.m, OFF), b = Math.min(it.end, OFF + 365, it.m + Math.max(21, Math.min(c.span || 30, 150)));
    for (let t = a; t <= b; t += 7){ const m = monthOfT(t) - 1; (c.g === 'flow' ? flow : veg)[m]++; }
  });
  return { veg, flow, known };
}

const CAT_ORDER = ['Light and space', 'Companions', 'Layout', 'Rotation', 'Soil', 'Diversity', 'Harvest', 'Pots', 'Water', 'Trees', 'Setup'];
function scoreOf(F, R, S, cov, entries){
  const hit = (cats) => F.filter(f => cats.indexOf(f.cat) >= 0).reduce((s, f) => s + (f.sev >= 3 ? 30 : f.sev === 2 ? 15 : f.sev === 1 ? 6 : 0), 0);
  const rows = [
    { k: 'Light and layout', v: 100 - hit(['Light and space', 'Layout', 'Pots']) },
    { k: 'Companions', v: 100 - hit(['Companions']) },
    { k: 'Rotation', v: 100 - hit(['Rotation']) },
    { k: 'Soil care', v: 100 - hit(['Soil', 'Water']) },
    { k: 'Variety and wildlife', v: 100 - hit(['Diversity']) },
    { k: cov.known.every(Boolean) ? 'Harvest through the year' : 'Harvest through the plan', v: Math.round(100 * cov.veg.filter((n, i) => n > 0 && cov.known[i]).length / Math.max(1, cov.known.filter(Boolean).length)) }
  ].map(r => ({ k: r.k, v: Math.max(0, Math.min(100, Math.round(r.v))) }));
  const has = entries.length > 0 && (S.zones.some(z => z.type === 'bed' || z.type === 'pots'));
  return { rows, total: has ? Math.round(rows.reduce((s, r) => s + r.v, 0) / rows.length) : null };
}

/* ---------- companions for a crop (for the lookup and the crop guide) ---------- */
function companionsOf(c){
  const boxes = { '+': new Map(), '-': new Map(), '~': new Map() };
  CROPS.forEach(o => {
    if (o.id === c.id) return;
    relsBetween(c, o).forEach(p => { const m = boxes[p.rel]; if (!m) return; if (!m.has(p)) m.set(p, []); m.get(p).push(o); });
  });
  /* one group per pairing: the plants that share the same reason are listed together */
  const arr = m => Array.from(m, ([p, cs]) => ({ p, cs: cs.slice().sort((x, y) => x.n.localeCompare(y.n)) }))
    .sort((x, y) => (EV_W[y.p.ev] * y.p.sev) - (EV_W[x.p.ev] * x.p.sev) || x.cs.length - y.cs.length || x.cs[0].n.localeCompare(y.cs[0].n));
  return { helps: arr(boxes['+']), avoid: arr(boxes['-']), care: arr(boxes['~']) };
}

/* ---------- crop suggestions ---------- */
function suggestCrops(R, S, an){
  if (R._sug) return R._sug;
  const entries = S.entries.filter(e => CROP_BY_ID[e.crop]), have = new Set(entries.map(e => e.crop));
  const haveC = entries.map(e => CROP_BY_ID[e.crop]);
  const zones = R.plan.zones.filter(zr => zr.z.type === 'bed' || zr.z.type === 'pots');
  const goals = (S.profile && S.profile.goals) || [], exp = (S.profile && S.profile.exp) || 'some';
  const cov = an ? an.coverage : harvestCoverage(R);
  const gapMonths = cov.veg.map((n, i) => n === 0 && (!cov.known || cov.known[i]) ? i + 1 : 0).filter(Boolean);
  const famCount = {}; haveC.forEach(c => famCount[famOf(c)] = (famCount[famOf(c)] || 0) + 1);
  const hasHab = haveC.some(isHabitat), hasLeg = haveC.some(c => c.bot === 'legume' || isCover(c));
  const out = [];
  const utilOf = id => R.util.find(u => u.z.id === id);
  CROPS.forEach(c => {
    if (have.has(c.id)) return;
    if (isCover(c) && !(gapMonths.length || goals.indexOf('easy') >= 0)) return;
    let best = null;
    zones.forEach(zr => {
      const z = zr.z, ctx = zoneCtx(z);
      if (zr.packer.kind === 'pots'){ const big = Math.max.apply(null, potSlots(z).map(q => q.l).concat([0])); if (big < potNeed(c) * 0.7) return; }
      else if (c.kind === 'bulb' && false) return;
      const key = 'sug|' + c.id + '|' + (z.cover || 'open') + '|' + (z.light || 'sun');
      const pls = R.cache[key] || (R.cache[key] = planCrop(R.C, effCrop(c, {}), { succ: S.succ, hor: S.hor, key, ctx }));
      if (!pls.length) return;
      const pl = pls[0], startIn = pl.p - OFF;
      if (startIn > 150) return;
      /* free room at planting time */
      const u = utilOf(z.id); let free = zr.packer.cap;
      if (u){ const s = u.series.find(x => x.t >= pl.p) || u.series[u.series.length - 1]; if (s) free = u.cap - s.used; }
      const need = zr.packer.kind === 'bed' ? Math.max(0.3, Math.min(c.def, 6) / c.pm) : 1;
      if (free + 1e-6 < need) return;
      const sc = { z, pl, startIn, free, first: pls[0] };
      if (!best || sc.startIn < best.startIn) best = sc;
    });
    if (!best) return;
    let s = 0; const why = [];
    if (best.startIn <= 30){ s += 30; why.push(best.startIn <= 0 ? 'you can plant it now' : 'it can go in within ' + Math.max(1, best.startIn) + ' days'); }
    else if (best.startIn <= 90){ s += 14; why.push('it goes in from ' + fmtT(best.pl.p)); }
    else { s += 4; why.push('next window opens ' + fmtT(best.pl.p)); }
    /* companion value with what you already grow */
    let help = 0, hurt = 0; const helpers = [], hurters = [];
    haveC.forEach(h => relsBetween(c, h).forEach(p => { const w = EV_W[p.ev]; if (p.rel === '+'){ help += w * Math.max(1, p.sev); if (helpers.indexOf(h.n) < 0) helpers.push(h.n); } else if (p.rel === '-'){ hurt += w * p.sev; if (hurters.indexOf(h.n) < 0) hurters.push(h.n); } }));
    if (help > 0){ s += Math.min(18, help * 5); why.push('a good neighbour for ' + cropNames(helpers.slice(0, 3).map(x => x.toLowerCase()))); }
    if (hurt > 0){ s -= Math.min(24, hurt * 8); why.push('keep it away from ' + cropNames(hurters.slice(0, 2).map(lc))); }
    /* variety */
    const f = famOf(c);
    if (!famCount[f] && BOT[f] && BOT[f].rest > 0){ s += 8; why.push('adds a plant family you don’t have'); }
    else if ((famCount[f] || 0) >= 3) s -= 6;
    /* fill the harvest gaps */
    const wm = []; if (c.kg > 0) for (let t = Math.max(best.pl.m, OFF); t <= Math.min(best.pl.end, best.pl.m + 90, OFF + 365); t += 7){ const m = monthOfT(t); if (wm.indexOf(m) < 0) wm.push(m); }
    const fills = gapMonths.filter(m => wm.indexOf(m) >= 0);
    if (fills.length){ s += Math.min(16, fills.length * 5); why.push('fills a harvest gap in ' + fills.slice(0, 3).map(m => MONTHS[m - 1]).join(', ')); }
    /* roles */
    if (!hasHab && isHabitat(c) && c.kg === 0){ s += 14; why.push('brings hoverflies and bees to the garden'); }
    if (!hasLeg && (c.bot === 'legume' || isCover(c))){ s += 8; why.push('puts nitrogen back in the soil'); }
    /* the gardener's goals */
    if (goals.indexOf('flowers') >= 0 && c.g === 'flow' && c.kg > 0){ s += 8; why.push('you said you grow flowers'); }
    if (goals.indexOf('pollinators') >= 0 && isHabitat(c)){ s += 8; why.push('supports pollinators'); }
    if (goals.indexOf('kids') >= 0 && ['sunflower','radish','strawberry','peas','cherry','nasturtium','dbean','pumpkin'].indexOf(c.id) >= 0){ s += 6; why.push('a fun one for kids'); }
    if (goals.indexOf('preserve') >= 0 && ['paste','tomato','cucumber','dbean','fruit','beetroot','cabbage'].indexOf(c.id) >= 0){ s += 5; why.push('good for preserving'); }
    if (goals.indexOf('easy') >= 0 && c.dif <= 1){ s += 5; why.push('easy to grow'); }
    if (goals.indexOf('seeds') >= 0 && ['dbean','cbean','peas','lettuce','tomato','calendula','sunflower','sweetpea'].indexOf(c.id) >= 0){ s += 5; why.push('easy to save seed from'); }
    if (exp === 'beginner'){ if (c.dif >= 3) s -= 12; else if (c.dif <= 1) s += 4; }
    if (exp === 'expert' && c.dif >= 3) s += 3;
    if (c.kg === 0 && !isHabitat(c) && !isCover(c)) s -= 4;
    if (c.g === 'flow' && c.kg > 0 && goals.indexOf('flowers') < 0) s -= 6;
    if (s <= 6) return;
    out.push({ c, score: s, why: why.slice(0, 3), zone: best.z, start: best.pl.p, startIn: best.startIn });
  });
  out.sort((a, b) => b.score - a.score);
  return (R._sug = out.slice(0, 12));
}
/* a sensible starting quantity for a suggestion */
function suggestQty(c, zr){
  if (zr && zr.packer.kind === 'pots') return Math.max(1, Math.min(c.def, potShare(c) * 2));
  return Math.max(1, Math.min(c.def, Math.round(c.def * 0.6)));
}

/* ---------- this week: weather alerts, jobs and pest watch ---------- */
function fcDays(){ return (typeof LIVE !== 'undefined' && LIVE.fc && S.useLive) ? LIVE.fc.days : null; }
function weekAlerts(R, S){
  const out = [], days = fcDays();
  const active = R.items.filter(i => i.x != null && i.p <= OFF + 7 && i.end > OFF);
  const nameList = (its, max) => cropNames(its.map(i => CROP_BY_ID[i.cropId].n.toLowerCase()).slice(0, max || 6));
  if (days){
    const ahead = days.filter(d => d.t >= 0 && d.t <= 6 && d.min != null);
    const dl = d => (d.t === 0 ? 'today' : d.t === 1 ? 'tomorrow' : DOW[new Date(Date.parse(d.date + 'T00:00:00Z')).getUTCDay()]);
    const cold = ahead.filter(d => d.min <= 3).sort((a, b) => a.t - b.t);
    if (cold.length){
      const c0 = cold[0], hard = cold.some(d => d.min <= 0), low = Math.min.apply(null, cold.map(d => d.min));
      const tender = active.filter(i => { const c = CROP_BY_ID[i.cropId]; const z = R.plan.zones.find(q => q.z.id === i.zoneId); return (c.warm || c.fb > 0) && !(z && z.z.cover === 'glass' && low > -2); });
      out.push({ sev: hard ? 3 : 2, kind: 'frost', title: (hard ? 'Frost' : 'Ground frost possible') + ' ' + dl(c0) + ' (low of ' + round1(low) + ' °C)',
        body: (hard ? 'A frost can kill tender plants. ' : 'Clear, still nights can produce a ground frost even when the forecast is a few degrees above zero. ') + (tender.length ? 'Cover or bring in ' + nameList(tender) + ' tonight, ' : 'Cover any seedlings or pots ') + 'with frost cloth, old sheets or cloches, and remove the covers in the morning. Water the soil in the afternoon; damp soil holds more warmth. Citrus, feijoa, and new growth on vines and blossom on fruit trees are at risk too.' });
    }
    const hot = ahead.filter(d => d.max != null && d.max >= 29);
    if (hot.length){
      const hi = Math.max.apply(null, hot.map(d => d.max));
      const glass = S.zones.some(z => z.cover === 'glass');
      out.push({ sev: hi >= 33 ? 3 : 2, kind: 'heat', title: 'Hot weather: up to ' + Math.round(hi) + ' °C ' + dl(hot[0]),
        body: 'Water in the early morning and again on the hottest days if pots are drying. Put shade cloth over lettuce, brassicas and seedlings, and mulch. Tomato and capsicum flowers often drop above about 32 °C, and it’s normal.' + (glass ? ' Open the glasshouse vents and door fully, and damp down the floor (above 35 °C plants are damaged).' : '') });
    }
    const wind = ahead.filter(d => d.gust != null && d.gust >= 60);
    if (wind.length) out.push({ sev: wind.some(d => d.gust >= 80) ? 3 : 2, kind: 'wind', title: 'Strong wind ' + dl(wind[0]) + ' (gusts to ' + Math.round(Math.max.apply(null, wind.map(d => d.gust))) + ' km/h)',
      body: 'Stake tall crops (tomatoes, corn, sunflowers, dahlias, climbing beans), take down or secure any frames and cloches, and shelter pots. Hold off spraying and planting out seedlings until it eases.' });
    const wet = ahead.filter(d => d.rain >= 25), wet3 = ahead.slice(0, 3).reduce((s, d) => s + (d.rain || 0), 0);
    if (wet.length || wet3 >= 40) out.push({ sev: 2, kind: 'rain', title: 'Heavy rain: about ' + Math.round(wet.length ? Math.max.apply(null, wet.map(d => d.rain)) : wet3) + ' mm ' + (wet.length ? dl(wet[0]) : 'over three days'),
      body: 'Check that water can drain away from beds and pots, hold off sowing fine seed, and stake or tie up top-heavy plants. Slugs and fungal diseases (blight, botrytis, mildew) are more likely after the rain, so watch for them, and skip watering.' });
    const rainNext = ahead.reduce((s, d) => s + (d.rain || 0), 0), past = R.wx.rainPast || 0;
    if (past < 3 && rainNext < 5 && R.wx.tMean >= 15) out.push({ sev: 1, kind: 'dry', title: 'A dry spell: little rain in the last week or the next', body: 'Water deeply in the early morning, mulch bare soil, and check pots daily. New seedlings need attention first; the Care tab shows when each space is due.' });
  }
  const A = R.anchors;
  if (A && A.r && A.t){
    const m = monthOfT(OFF);
    if ((m >= 9 || m <= 2) && A.t.sum >= 0.3 && A.r.sum <= -0.3) out.push({ sev: 0, kind: 'season', title: 'A warm, dry summer is expected', body: 'This is an El Niño-style outlook. Mulch early, consider drip irrigation, put shade cloth over the leafy greens, and choose heat-tolerant varieties. A long warm season also allows a second round of fast summer crops.' });
    else if ((m >= 9 || m <= 2) && A.r.sum >= 0.3) out.push({ sev: 0, kind: 'season', title: 'A wetter summer is expected', body: 'Watch for blight, mildew and botrytis, leave more space between plants, and use a raised bed or good drainage for anything that hates wet feet.' });
  }
  return out.sort((a, b) => b.sev - a.sev);
}

/* which climate band are we in (frost-free · temperate · cold-winter)? */
function climateBand(R){
  const st = R.stats; if (!st) return 'temperate';
  if (R.loc && R.loc.lat > -38.2) return 'warm';
  if (LIVE && LIVE.clim && LIVE.clim.frostFree) return 'warm';
  const lsf = st.lsf;   // day of year of the last spring frost
  if (lsf != null){ if (lsf <= 225) return 'warm'; if (lsf >= 268) return 'cool'; }
  return 'temperate';
}
function monthJobs(R, S, m){
  const band = climateBand(R), out = [];
  MONTHLY.filter(j => j.m === m && (j.band === 'all' || j.band === band || (band === 'temperate' && j.band === 'warm' && false))).forEach(j => out.push({ cat: 'Month', t: j.t }));
  const ts = S.trees || [], seen = {};
  ts.forEach(t => { const p = PERENNIAL_BY_ID[t.type]; if (!p) return; (TREE_CARE[p.g] || []).forEach(j => { if (j.m.indexOf(m) >= 0){ const k = p.g + j.t; if (seen[k]) return; seen[k] = 1; out.push({ cat: PGROUPS[p.g].name, t: j.t }); } }); });
  return out;
}

/* what to watch for right now (season + weather) */
function pestHits(p, c){
  return p.hits.some(h => {
    if (h === '*') return true;
    if (h.slice(0, 2) === 'T:') return false;
    if (h.charAt(0) === '@') return matchTok(c, h);
    return c.id === h;
  });
}
function treeHits(p, t, pd){
  const id = t.type || '', g = pd ? pd.g : '';
  return p.hits.some(h => h.slice(0, 2) === 'T:' && (h === 'T:' + g || id === h.slice(2) || id.indexOf(h.slice(2)) === 0 || (h === 'T:feijoa' && id.indexOf('feijoa') === 0)))
      || p.hits.some(h => h !== '*' && h.slice(0, 2) !== 'T:' && h.charAt(0) !== '@' && h === id);
}
function pestWatch(R, S, all){
  const m = monthOfT(OFF), m2 = (m % 12) + 1, band = climateBand(R), out = [];
  const cs = Array.from(new Set(S.entries.map(e => e.crop))).map(id => CROP_BY_ID[id]).filter(Boolean);
  const trees = (S.trees || []).map(t => ({ t, pd: PERENNIAL_BY_ID[t.type] }));
  const glassCrops = new Set(); R.plan.zones.forEach(zr => { if (zr.z.cover === 'glass') zr.items.forEach(i => glassCrops.add(i.cropId)); });
  const wx = R.wx || {};
  /* what is in the ground now, and what goes in within about six weeks: a pest only matters to plants that are there */
  const act = new Set(), up = new Set();
  R.items.forEach(i => { if (i.x == null) return; if (i.p <= OFF + 7 && i.end >= OFF) act.add(i.cropId); else if (i.p > OFF + 7 && i.p <= OFF + 45) up.add(i.cropId); });
  PESTS.forEach(p => {
    if (p.band && p.band.indexOf(band) < 0 && !all) return;
    const hitC = cs.filter(c => pestHits(p, c)), hitT = trees.filter(x => treeHits(p, x.t, x.pd));
    const hitA = hitC.filter(c => act.has(c.id)), hitU = hitC.filter(c => !act.has(c.id) && up.has(c.id));
    if (!hitA.length && !hitU.length && !hitT.length && !all) return;
    const now = p.mo.indexOf(m) >= 0, soon = !now && p.mo.indexOf(m2) >= 0;
    if (!now && !soon && !all) return;
    const live = hitA.length || hitT.length;
    let risk = now && live ? 'watch' : (now || soon) ? 'soon' : 'off', why = [];
    const w = p.wx || {};
    if (now && live && wx.live !== false){
      let n = 0, ok = true;
      if (w.t){ n++; if (wx.tMean >= w.t[0] && wx.tMean <= w.t[1]) why.push('it is a mild ' + Math.round(wx.tMean) + ' °C'); else ok = false; }
      if (w.rain === 'wet'){ n++; if (wx.rainPast >= 15) why.push('after ' + Math.round(wx.rainPast) + ' mm of rain this week'); else ok = false; }
      if (w.rain === 'dry'){ n++; if (wx.rainPast <= 6) why.push('a dry week'); else ok = false; }
      if (n && ok && wx.live) risk = 'high';
    }
    if (w.glass && now && live && hitA.some(c => glassCrops.has(c.id))){ if (risk === 'watch') risk = 'high'; why.push('glasshouses trap heat and humidity'); }
    out.push({ p, risk, why, crops: (hitA.length ? hitA : hitU.length ? hitU : hitC).slice(0, 4).map(c => c.n), trees: hitT.map(x => x.pd ? x.pd.n : ''), now, soon });
  });
  const order = { high: 0, watch: 1, soon: 2, off: 3 };
  out.sort((a, b) => order[a.risk] - order[b.risk] || a.p.n.localeCompare(b.p.n));
  return out;
}

/* ---------- techniques that suit this garden ---------- */
function techniqueFit(R, S){
  const P = S.profile || {}, goals = P.goals || [];
  const bedA = S.zones.filter(z => z.type === 'bed').reduce((s, z) => s + (z.w || 0) * (z.h || 0), 0);
  const ctx = {
    soil: P.soil, wind: P.wind, pots: S.zones.some(z => z.type === 'pots'), glass: S.zones.some(z => z.cover === 'glass'),
    beds: S.zones.some(z => z.type === 'bed'), small: bedA > 0 && bedA < 12, begin: P.exp === 'beginner', trees: (S.trees || []).length > 0,
    dry: (R.anchors && R.anchors.r && R.anchors.r.sum <= -0.3) || S.rain === 'dry', hot: R.anchors && R.anchors.t && R.anchors.t.sum >= 0.3,
    band: climateBand(R), corn: S.entries.some(e => e.crop === 'corn' || e.crop === 'popcorn')
  };
  return TECHS.map(t => {
    const f = t.for || {}; let s = 0, site = false; const why = [];
    if (f.soil && f.soil.indexOf(ctx.soil) >= 0){ site = true; s += 4; why.push(ctx.soil === 'clay' ? 'you have heavy clay soil' : 'you have sandy, free-draining soil'); }
    if (f.wind && f.wind.indexOf(ctx.wind) >= 0){ site = true; s += 4; why.push('your site is exposed to wind'); }
    if (f.pots && ctx.pots){ site = true; s += 2; why.push('you grow in pots'); }
    if (f.glass && ctx.glass){ site = true; s += 3; why.push('you have a glasshouse'); }
    if (f.dry && ctx.dry){ s += 3; why.push('a dry summer is forecast'); }
    if (f.hot && ctx.hot){ s += 2; why.push('a warm summer is forecast'); }
    if (f.cool && ctx.band === 'cool'){ s += 2; why.push('you have cold winters and late frosts'); }
    if (f.warm && ctx.band === 'warm'){ s += 2; why.push('you have a warm, near frost-free climate'); }
    if (f.small && ctx.small){ s += 2; why.push('your beds are small'); }
    if (f.begin && ctx.begin){ s += 2; why.push('you’re starting out'); }
    if (f.trees && ctx.trees){ site = true; s += 2; why.push('you grow fruit trees'); }
    if (f.beds && ctx.beds){ s += 1; }
    if (f.corn && ctx.corn){ site = true; s += 3; why.push('you’re growing corn'); }
    if (f.goal) f.goal.forEach(g => { if (goals.indexOf(g) >= 0){ s += 2; why.push('you said “' + GOAL_LABEL[g] + '” matters to you'); } });
    return { t, score: s, site, why: Array.from(new Set(why)).slice(0, 3) };
  }).sort((a, b) => b.score - a.score || a.t.n.localeCompare(b.t.n));
}
const GOAL_LABEL = { food: 'grow lots of food', flowers: 'grow flowers', easy: 'low effort', water: 'save water', kids: 'fun for kids', pollinators: 'help bees and pollinators', seeds: 'save seed', preserve: 'preserve the harvest' };
