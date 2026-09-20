/* ============================================================
   STORE — gardens, custom crops, persistence, import / export / share links
   Everything lives in this browser's localStorage. Photos are kept under separate keys.
   ============================================================ */
const STORE_KEY = 'tgp4000.v2', V1_KEY = 'tgp4000.v1', BG_PREFIX = 'tgp4000.bg.';
const uid = p => (p || 'x') + Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-3);
const clone = o => JSON.parse(JSON.stringify(o));
const isoToday = () => new Date(Date.now() + 0).toISOString().slice(0, 10);

/* the crops picked for a brand-new garden */
const STARTER = [['tomato', 4], ['capsicum', 3], ['zucchini', 2], ['cucumber', 3], ['corn', 12], ['dbean', 24], ['lettuce', 6], ['basil', 4], ['carrot', 60]];

function defaultZone(name, extra){
  return Object.assign({ id: uid('z'), type: 'bed', name: name || 'Main bed', x: 1, y: 1, w: 6, h: 4, bw: 1.2, light: 'sun', cover: 'open', pots: [], note: '', hist: {} }, extra || {});
}
function newGarden(name, inherit){
  const g = Object.assign({
    id: uid('g'), name: name || 'My garden', region: 'pukekohe', place: null, outlook: 'auto', tweak: 0, rain: 'auto', useLive: true, soilNow: '',
    hor: 365, succ: true, fit: false,
    zones: [], entries: [], trees: [], notes: {}, care: { log: [], amend: {} }, prog: {},
    plan: { w: 12, bg: null, bgOp: 0.6, north: 'up' }, tab: 'calendar', viewT: null, focus: null, created: Date.now(),
    smart: true, profile: { soil: 'unknown', wind: '', exp: 'some', goals: [], organic: true, done: false }, adv: { sec: 'week', dismissed: {}, jobs: {} }
  }, inherit || {});
  g.zones = g.zones.length ? g.zones : [defaultZone('Main bed')];
  return g;
}
function starterEntries(){ return STARTER.map(([c, n]) => ({ id: uid('e'), crop: c, qty: n, zone: 'auto', how: 'auto', name: '' })); }

/* make sure an older or partial garden has every field the newer features expect */
function fillGarden(g){
  g.plan = Object.assign({ w: 12, bg: null, bgOp: 0.6, north: 'up' }, g.plan || {});
  if (['up', 'right', 'down', 'left'].indexOf(g.plan.north) < 0) g.plan.north = 'up';
  g.profile = Object.assign({ soil: 'unknown', wind: '', exp: 'some', goals: [], organic: true, done: false }, g.profile || {});
  if (!Array.isArray(g.profile.goals)) g.profile.goals = [];
  g.adv = Object.assign({ sec: 'week', dismissed: {}, jobs: {} }, g.adv || {});
  g.adv.dismissed = g.adv.dismissed || {}; g.adv.jobs = g.adv.jobs || {};
  if (g.smart == null) g.smart = true;
  (g.zones || []).forEach(z => { if (!z.hist || typeof z.hist !== 'object') z.hist = {}; });
  g.care = g.care || { log: [], amend: {} }; g.care.log = g.care.log || []; g.care.amend = g.care.amend || {};
  return g;
}

/* ---------- v1 → v2 ---------- */
function migrateV1(o){
  const g = newGarden('My garden', {
    region: o.region || 'pukekohe', place: o.place || null, outlook: o.outlook || 'auto', tweak: o.tweak || 0, rain: o.rain || 'auto',
    useLive: o.useLive !== false, soilNow: o.soilNow || '', hor: o.hor || 365, succ: o.succ !== false, fit: !!o.fit, prog: o.prog || {}, tab: o.tab === 'layout' ? 'site' : (o.tab || 'calendar')
  });
  const len = +o.len || 6, wid = +o.wid || 4, paths = +o.paths || 0;
  g.zones = [defaultZone('Main bed', { w: len, h: Math.round(wid * (1 - paths / 100) * 100) / 100, bw: +o.bedW || 1.2, cover: o.protect === 'glass' ? 'glass' : o.protect === 'cloche' ? 'cloche' : 'open' })];
  g.entries = Object.keys(o.sel || {}).filter(id => o.sel[id] > 0).map(id => ({ id, crop: id, qty: o.sel[id], zone: 'auto', how: 'auto', name: '' }));
  return g;
}

/* ---------- load / save ---------- */
let STORE = null, STORE_ERR = null;
function loadStore(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw){
      const o = JSON.parse(raw);
      if (o && o.v === 2 && o.gardens && o.order && o.order.length){ o.custom = o.custom || []; o.overrides = o.overrides || {}; Object.keys(o.gardens).forEach(k => fillGarden(o.gardens[k])); return o; }
    }
  } catch(e){}
  let g = null;
  try { const raw1 = localStorage.getItem(V1_KEY); if (raw1) g = migrateV1(JSON.parse(raw1)); } catch(e){}
  if (!g){ g = newGarden('My garden'); g.entries = starterEntries(); }
  return { v: 2, cur: g.id, order: [g.id], gardens: { [g.id]: g }, custom: [], overrides: {} };
}
let _saveTimer = null;
function saveStore(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(STORE)); STORE_ERR = null; }
    catch(e){ STORE_ERR = 'This browser wouldn’t save your changes (storage full or blocked). Use Share → Export to keep a copy.'; }
  }, 250);
}

/* ---------- photos ---------- */
const BG = {};
function bgGet(gid){
  if (BG[gid] !== undefined) return BG[gid];
  try { BG[gid] = localStorage.getItem(BG_PREFIX + gid); } catch(e){ BG[gid] = null; }
  return BG[gid];
}
function bgSet(gid, dataUrl){
  BG[gid] = dataUrl || null;
  try { if (dataUrl) localStorage.setItem(BG_PREFIX + gid, dataUrl); else localStorage.removeItem(BG_PREFIX + gid); return true; }
  catch(e){ return false; }
}

/* ---------- crops: built-ins + your overrides + your own ---------- */
const CROP_FIELDS = ['n', 'g', 'warm', 'tb', 'd', 'rt', 'span', 'minSoil', 'fb', 'nur', 'pm', 'kg', 'mode', 'gap', 'max', 'def', 'kind', 'sow', 'water', 'hmax', 'months', 'sp', 'comp', 'avoid', 'tip', 'pack', 'per', 'u', 'lt', 'minShade', 'potL', 'dsow', 'tray', 'fam', 'feed', 'tt', 'bunit', 'slow', 'endT', 'nxt', 'pots'];
function normalizeCrop(c){
  const gt = GROUP_TRAITS[c.g] || GROUP_TRAITS.leaf;
  const o = Object.assign({ warm: 0, tb: 5, rt: 15, d: 60, span: 30, minSoil: 8, nur: 0, pm: 10, kg: 0.2, mode: 'seq', max: 1, def: 6, kind: 'direct', water: 2, sp: '', comp: '—', avoid: '—', tip: '', pack: 50, u: 'kg' }, gt, c);
  if (c.bot == null && c.fam && FAM_TO_BOT[c.fam]) o.bot = FAM_TO_BOT[c.fam];
  applyAdvice(o);
  if (o.mode === 'stag' && !o.gap) o.gap = 21;
  if (o.mode === 'stag' && o.max < 2) o.max = 4;
  if (o.kind !== 'seedling') o.nur = 0;
  if (o.warm && o.fb == null) o.fb = 10;
  return o;
}
function rebuildCrops(){
  CROPS.length = 0;
  BASE_CROPS.forEach(b => { const c = Object.assign({}, b); const ov = STORE.overrides[b.id]; if (ov){ Object.assign(c, ov); c.edited = true; } CROPS.push(c); });
  STORE.custom.forEach(cc => { const c = normalizeCrop(cc); c.custom = true; CROPS.push(c); });
  Object.keys(CROP_BY_ID).forEach(k => delete CROP_BY_ID[k]);
  CROPS.forEach(c => CROP_BY_ID[c.id] = c);
  ADV_VER++;
}

/* ---------- gardens ---------- */
function curGarden(){ return STORE.gardens[STORE.cur]; }
function uniqueName(base){
  const names = STORE.order.map(id => STORE.gardens[id].name);
  if (names.indexOf(base) < 0) return base;
  let i = 2; while (names.indexOf(base + ' (' + i + ')') >= 0) i++;
  return base + ' (' + i + ')';
}
function addGarden(name, opts){
  opts = opts || {};
  const cur = curGarden();
  const inherit = cur ? { region: cur.region, place: cur.place ? clone(cur.place) : null, outlook: cur.outlook, tweak: cur.tweak, rain: cur.rain, useLive: cur.useLive, hor: cur.hor, succ: cur.succ } : {};
  const g = newGarden(uniqueName(name || 'New garden'), inherit);
  if (opts.blank) g.zones = [];
  STORE.gardens[g.id] = g; STORE.order.push(g.id); STORE.cur = g.id;
  return g;
}
function duplicateGarden(id, keepLogs){
  const src = STORE.gardens[id]; if (!src) return null;
  const g = clone(src);
  g.id = uid('g'); g.name = uniqueName(src.name + ' — copy'); g.created = Date.now(); g.prog = {}; g.focus = null; g.viewT = null;
  if (!keepLogs) g.care = { log: [], amend: {} };
  const bg = bgGet(id); if (bg) bgSet(g.id, bg);
  STORE.gardens[g.id] = g; STORE.order.push(g.id); STORE.cur = g.id;
  return g;
}
function deleteGarden(id){
  if (STORE.order.length < 2) return false;
  delete STORE.gardens[id]; STORE.order = STORE.order.filter(x => x !== id);
  try { localStorage.removeItem(BG_PREFIX + id); } catch(e){}
  delete BG[id];
  if (STORE.cur === id) STORE.cur = STORE.order[0];
  return true;
}

/* ---------- export / import ---------- */
function usedCropIds(g){
  const s = new Set();
  g.entries.forEach(e => s.add(e.crop));
  Object.keys(g.notes || {}).forEach(k => { if (CROP_BY_ID[k]) s.add(k); });
  return s;
}
function exportGarden(id, o){
  o = o || {};
  const g = clone(STORE.gardens[id]);
  g.focus = null;
  if (o.share){ g.care = { log: [], amend: {} }; g.prog = {}; }
  const used = usedCropIds(g);
  const payload = { format: 'tgp4000-garden', v: 2, exported: new Date().toISOString().slice(0, 10), garden: g,
    custom: clone(STORE.custom.filter(c => used.has(c.id))),
    overrides: (() => { const r = {}; Object.keys(STORE.overrides).forEach(k => { if (used.has(k)) r[k] = STORE.overrides[k]; }); return clone(r); })() };
  if (!o.share){ const bg = bgGet(id); if (bg) payload.bg = bg; }
  return payload;
}
function exportAll(){
  return { format: 'tgp4000-all', v: 2, exported: new Date().toISOString().slice(0, 10),
    gardens: STORE.order.map(id => exportGarden(id)), custom: clone(STORE.custom), overrides: clone(STORE.overrides) };
}
/* bring a payload into this browser as a NEW garden; never overwrites anything. returns the new garden */
function importPayload(p){
  if (!p || typeof p !== 'object') throw new Error('That doesn’t look like a garden file.');
  if (p.format === 'tgp4000-all'){ let last = null; (p.gardens || []).forEach(x => { last = importPayload(Object.assign({}, x, { custom: (x.custom || []).concat(p.custom || []), overrides: Object.assign({}, p.overrides || {}, x.overrides || {}) })); }); if (!last) throw new Error('The file has no gardens in it.'); return last; }
  if (p.format !== 'tgp4000-garden' || !p.garden) throw new Error('That doesn’t look like a Total Garden Planner file.');
  const g = clone(p.garden);
  /* custom crops: add the ones we don't have, rename on conflict */
  const rename = {};
  (p.custom || []).forEach(cc => {
    const have = STORE.custom.find(x => x.id === cc.id);
    if (!have && !BASE_CROPS.find(b => b.id === cc.id)){ STORE.custom.push(clone(cc)); return; }
    if (have && JSON.stringify(have) === JSON.stringify(cc)) return;
    let nid = cc.id + '-2', i = 2; while (STORE.custom.find(x => x.id === nid) || BASE_CROPS.find(b => b.id === nid)) nid = cc.id + '-' + (++i);
    const c2 = clone(cc); c2.id = nid; STORE.custom.push(c2); rename[cc.id] = nid;
  });
  Object.keys(p.overrides || {}).forEach(k => { if (!STORE.overrides[k] && BASE_CROPS.find(b => b.id === k)) STORE.overrides[k] = clone(p.overrides[k]); });
  if (Object.keys(rename).length){
    g.entries.forEach(e => { if (rename[e.crop]) e.crop = rename[e.crop]; });
    Object.keys(rename).forEach(o => { if (g.notes && g.notes[o]){ g.notes[rename[o]] = g.notes[o]; delete g.notes[o]; } });
  }
  rebuildCrops();
  /* fill in anything a newer/older file might lack */
  const base = newGarden(g.name || 'Imported garden');
  const out = Object.assign({}, base, g);
  out.id = uid('g'); out.name = uniqueName(out.name || 'Imported garden'); out.focus = null; out.viewT = null;
  fillGarden(out);
  out.zones = (out.zones || []).map(z => Object.assign(defaultZone(z.name), z));
  out.trees = out.trees || []; out.notes = out.notes || {}; out.prog = out.prog || {};
  out.entries = (out.entries || []).filter(e => CROP_BY_ID[e.crop]);
  STORE.gardens[out.id] = out; STORE.order.push(out.id); STORE.cur = out.id;
  if (p.bg){ out.plan.bg = out.plan.bg || { has: true }; bgSet(out.id, p.bg); }
  return out;
}

/* ---------- share links (#share=…): the garden without photo or logs, compressed when the browser can ---------- */
function b64u(bytes){ let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(str){ str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const s = atob(str), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
async function packShare(payload){
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream !== 'undefined'){
    try {
      const cs = new CompressionStream('deflate-raw'), w = cs.writable.getWriter(); w.write(bytes); w.close();
      const buf = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      return 'z' + b64u(buf);
    } catch(e){}
  }
  return 'j' + b64u(bytes);
}
async function unpackShare(s){
  const kind = s[0], bytes = unb64u(s.slice(1));
  let out = bytes;
  if (kind === 'z'){
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser can’t open compressed share links — ask for a file instead.');
    const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(bytes); w.close();
    out = new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }
  return JSON.parse(new TextDecoder().decode(out));
}

if (typeof module !== 'undefined') module.exports = { newGarden, defaultZone, migrateV1, normalizeCrop, packShare, unpackShare };
