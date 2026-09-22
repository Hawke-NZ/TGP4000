/* ============================================================
   SYNC — optional sync between your devices through YOUR OWN Google Drive.
   Each person signs in with their own Google account. Their gardens are written to the hidden
   "app data" folder of their own Drive, which only this planner can open (scope drive.appdata).
   Nothing goes to any server run by whoever hosts this page, so friends stay completely separate.

   How the merge works: every garden is one file. Each device remembers the version it last synced (the "base").
   When both sides have changed, a three-way merge compares base, this device and the cloud:
   plants, spaces, notes and log entries are merged one by one (by id), so two devices adding different things
   both keep them. Only a genuine clash on the same value falls back to "most recent edit wins".
   Deleted gardens are remembered as tombstones so a deletion reaches every device.
   ============================================================ */
const SYNC_VER = 1;
const SYNC_KEY = 'tgp4000.sync', SYNC_TOKEN_KEY = 'tgp4000.sync.tok', SYNC_BASE_KEY = 'tgp4000.sync.base', SYNC_BAK_KEY = 'tgp4000.sync.bak', SYNC_CID_KEY = 'tgp4000.sync.cid';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files', DRIVE_UP = 'https://www.googleapis.com/upload/drive/v3/files';
const SYNC_SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email';
const ACCT_NAME = 'tgp-account.json';
const gname = id => 'tgp-g-' + id + '.json', bgname = id => 'tgp-bg-' + id + '.json';
const TOMB_DAYS = 90, LOCAL_ONLY = ['tab', 'viewT', 'focus', 'mod'];

const lsGet = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch(e){ return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch(e){} };
const jget = k => { try { return JSON.parse(lsGet(k)); } catch(e){ return null; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- comparing and hashing ---------- */
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function deq(a, b){
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)){ if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!deq(a[i], b[i])) return false; return true; }
  const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
  if (ka.length !== kb.length) return false;
  for (const k of ka){ if (b[k] === undefined || !deq(a[k], b[k])) return false; }
  return true;
}
/* cyrb53: a fast, well-spread 53-bit string hash (not for security — only to notice changes) */
function h53(str){
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++){ const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/* ---------- three-way merge ----------
   base = what both sides last agreed on (may be undefined), L = this device, R = the cloud.
   pref = which side wins a genuine clash on a single value ('L' or 'R'). */
const hasIds = a => a.length > 0 && a.every(x => isObj(x) && typeof x.id === 'string');
function m3(base, L, R, pref){
  if (deq(L, R)) return clone(L);
  if (base !== undefined){
    if (deq(L, base)) return clone(R);
    if (deq(R, base)) return clone(L);
  }
  const win = () => clone(pref === 'R' ? R : L);
  if (isObj(L) && isObj(R)){
    const B = isObj(base) ? base : {}, out = {};
    const keys = Object.keys(L).concat(Object.keys(R).filter(k => !(k in L)));
    keys.forEach(k => {
      const inL = L[k] !== undefined, inR = R[k] !== undefined, b = B[k];
      if (inL && inR) out[k] = m3(b, L[k], R[k], pref);
      else if (inL){ if (b === undefined || !deq(L[k], b)) out[k] = clone(L[k]); }      /* gone from the cloud: keep it unless we hadn't touched it */
      else if (inR){ if (b === undefined || !deq(R[k], b)) out[k] = clone(R[k]); }      /* gone from this device: same rule */
    });
    return out;
  }
  if (Array.isArray(L) && Array.isArray(R)){
    const B = Array.isArray(base) ? base : [];
    if ((hasIds(L) || !L.length) && (hasIds(R) || !R.length) && (hasIds(B) || !B.length)){
      const idx = a => { const m = new Map(); a.forEach(x => m.set(x.id, x)); return m; };
      const bm = idx(B), lm = idx(L), rm = idx(R), out = [];
      /* the winning side's order first, then anything only the other side has: both devices reach the same order */
      const P = pref === 'R' ? R : L, Q = pref === 'R' ? L : R, pm = pref === 'R' ? rm : lm;
      const ids = P.map(x => x.id).concat(Q.filter(x => !pm.has(x.id)).map(x => x.id));
      ids.forEach(id => {
        const b = bm.get(id), l = lm.get(id), r = rm.get(id);
        if (l && r) out.push(m3(b, l, r, pref));
        else if (l){ if (!b || !deq(l, b)) out.push(clone(l)); }
        else if (r){ if (!b || !deq(r, b)) out.push(clone(r)); }
      });
      return out;
    }
    if (L.every(x => typeof x === 'string') && R.every(x => typeof x === 'string') && B.every(x => typeof x === 'string')){
      const out = [], P = pref === 'R' ? R : L, Q = pref === 'R' ? L : R;
      const keep = (x, o) => !(B.indexOf(x) >= 0 && o.indexOf(x) < 0);       /* dropped by the other side and untouched here → gone */
      P.forEach(x => { if (keep(x, Q) && out.indexOf(x) < 0) out.push(x); });
      Q.forEach(x => { if (P.indexOf(x) < 0 && B.indexOf(x) < 0 && out.indexOf(x) < 0) out.push(x); });
      return out;
    }
  }
  return win();
}

/* ---------- what gets synced ---------- */
/* a garden without the things that belong to this device only (which tab you're on, the view, what's selected) */
function gdoc(g){
  const d = clone(g); LOCAL_ONLY.forEach(k => delete d[k]);
  if (d.adv) delete d.adv.sec;
  return d;
}
const gHash = g => h53(JSON.stringify(gdoc(g)));
function acctDoc(){ return { order: STORE.order.slice(), custom: clone(STORE.custom), overrides: clone(STORE.overrides), tomb: clone(STORE.tomb || {}) }; }
const aHash = () => h53(JSON.stringify(acctDoc()));

/* which gardens/settings have changed since we last looked → stamp them with the time (used to settle clashes) */
const LASTH = {}; let LASTA = null, SYNC_DIRTY = false;
function syncInit(){
  Object.keys(STORE.gardens).forEach(id => { const g = STORE.gardens[id]; LASTH[id] = gHash(g); if (!g.mod) g.mod = g.created || Date.now(); });
  if (!STORE.amod) STORE.amod = Date.now();
  LASTA = aHash();
}
function syncStamp(){
  let changed = false;
  Object.keys(STORE.gardens).forEach(id => {
    const g = STORE.gardens[id], h = gHash(g);
    if (LASTH[id] !== h){ LASTH[id] = h; g.mod = Date.now(); changed = true; }
  });
  Object.keys(LASTH).forEach(id => { if (!STORE.gardens[id]) delete LASTH[id]; });
  const a = aHash(); if (a !== LASTA){ LASTA = a; STORE.amod = Date.now(); changed = true; }
  if (changed) SYNC_DIRTY = true;
  return changed;
}

/* a brand-new install that hasn't been touched (so signing in on it should simply take your cloud gardens) */
function pristineShape(g){
  const d = gdoc(g); delete d.id; delete d.created;
  d.entries = (d.entries || []).map(e => ({ crop: e.crop, qty: e.qty, zone: e.zone, how: e.how, name: e.name }));
  d.zones = (d.zones || []).map(z => { const c = Object.assign({}, z); delete c.id; return c; });
  return d;
}
function isPristine(){
  if (STORE.order.length !== 1 || STORE.custom.length || Object.keys(STORE.overrides).length || Object.keys(STORE.tomb || {}).length) return false;
  const g = STORE.gardens[STORE.order[0]]; if (!g) return false;
  const ref = fillGarden(newGarden('My garden')); ref.entries = starterEntries();
  return deq(pristineShape(g), pristineShape(ref));       /* every setting exactly as a brand-new install has it */
}

/* ---------- state kept on this device (never uploaded) ---------- */
const SYNC = Object.assign({ on: false, email: '', owner: '', last: 0 }, jget(SYNC_KEY) || {});
SYNC.state = SYNC.on ? 'idle' : 'off';     /* off · idle · syncing · ok · auth · offline · error */
SYNC.msg = ''; SYNC.busy = false; SYNC.again = false; SYNC.note = '';
let SBASE = null;
function blankBase(){ return { acct: null, am: {}, g: {}, m: {}, bg: {}, seen: {}, mine: {}, prev: {} }; }     /* prev: what the cloud held just before our last write (to recover if someone overwrites it) */
function loadBase(){ const b = jget(SYNC_BASE_KEY) || {}; const o = blankBase(); Object.keys(o).forEach(k => { if (b[k] && typeof b[k] === 'object') o[k] = b[k]; }); return o; }
SBASE = loadBase();
const saveSync = () => lsSet(SYNC_KEY, JSON.stringify({ on: SYNC.on, email: SYNC.email, owner: SYNC.owner, last: SYNC.last }));
function saveBase(){
  /* never throw away the stored base if storage is tight: free the undo backup, then the recovery copies, and keep the old base if it still won't fit */
  const ser = () => JSON.stringify(SBASE);
  if (lsSet(SYNC_BASE_KEY, ser())) return true;
  lsDel(SYNC_BAK_KEY); if (lsSet(SYNC_BASE_KEY, ser())) return true;
  const p = SBASE.prev; SBASE.prev = {}; if (lsSet(SYNC_BASE_KEY, ser())) return true;
  SBASE.prev = p; SYNC.note = 'This browser is short of storage, so sync couldn’t save its progress.'; return false;
}
function resetBase(){ SBASE = blankBase(); lsDel(SYNC_BASE_KEY); }

/* sign-in token (Google gives an hour). Kept so a reload inside the hour doesn't ask again. */
let TOK = jget(SYNC_TOKEN_KEY);
const tokenOk = () => !!(TOK && TOK.t && Date.now() < TOK.exp - 30000);
function setToken(t, secs){ TOK = { t, exp: Date.now() + (secs || 3600) * 1000 }; lsSet(SYNC_TOKEN_KEY, JSON.stringify(TOK)); }
function dropToken(){ TOK = null; lsDel(SYNC_TOKEN_KEY); }

class SyncErr extends Error { constructor(kind, msg){ super(msg || kind); this.kind = kind; this.msg = msg || ''; } }

/* ---------- Google Drive (app data folder) ---------- */
async function gfetch(url, opts, tries){
  tries = tries || 0;
  if (!tokenOk()) throw new SyncErr('auth');
  opts = opts || {}; opts.headers = Object.assign({ Authorization: 'Bearer ' + TOK.t }, opts.headers || {});
  let res; const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 60000);
  opts.signal = ac.signal;
  try { res = await fetch(url, opts); } catch(e){ throw new SyncErr('net', e && e.name === 'AbortError' ? 'Google Drive took too long to answer.' : e.message); } finally { clearTimeout(tm); }
  if (res.status === 401){ dropToken(); throw new SyncErr('auth'); }
  if ((res.status === 429 || res.status >= 500) && tries < 3){ await sleep(700 * Math.pow(2, tries)); return gfetch(url, opts, tries + 1); }
  if (res.status === 403){
    const t = await res.text().catch(() => '');
    if (/rateLimit/i.test(t) && tries < 3){ await sleep(900 * Math.pow(2, tries)); return gfetch(url, opts, tries + 1); }
    if (/storageQuota|quotaExceeded/i.test(t)) throw new SyncErr('full', 'Your Google Drive is full.');
    throw new SyncErr('http', '403 ' + t.slice(0, 160));
  }
  if (!res.ok) throw new SyncErr('http', String(res.status));
  return res;
}
async function driveList(){
  const out = []; let pt = '';
  do {
    const u = DRIVE_API + '?spaces=appDataFolder&pageSize=1000&fields=' + encodeURIComponent('nextPageToken,files(id,name,createdTime,modifiedTime,md5Checksum,size,appProperties)') + (pt ? '&pageToken=' + encodeURIComponent(pt) : '');
    const j = await (await gfetch(u)).json();
    (j.files || []).forEach(f => out.push(f)); pt = j.nextPageToken || '';
  } while (pt);
  return out;
}
async function driveGetJson(id){
  const t = await (await gfetch(DRIVE_API + '/' + id + '?alt=media')).text();
  try { return JSON.parse(t); } catch(e){ throw new SyncErr('data', 'A synced file couldn’t be read.'); }
}
async function drivePut(name, obj, id, props){
  const b = 'tgp' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const meta = id ? {} : { name, parents: ['appDataFolder'] }; if (props) meta.appProperties = props;
  const body = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(obj) + '\r\n--' + b + '--';
  const fields = 'id,name,createdTime,modifiedTime,md5Checksum,size,appProperties';
  const url = (id ? DRIVE_UP + '/' + id : DRIVE_UP) + '?uploadType=multipart&fields=' + encodeURIComponent(fields);
  const res = await gfetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
  return res.json();
}
async function driveDel(id){
  try { await gfetch(DRIVE_API + '/' + id, { method: 'DELETE' }); }
  catch(e){ if (!(e instanceof SyncErr && e.msg === '404')) throw e; }
}
const ftok = f => (f.md5Checksum || '') + '|' + (f.modifiedTime || '') + '|' + (f.size || '');
function readEnv(json){
  if (!json || typeof json !== 'object' || (json.garden === undefined && json.acct === undefined)) throw new SyncErr('data', 'A synced file has an unexpected format.');
  if ((json.v || 1) > SYNC_VER) throw new SyncErr('newer', 'Another device saved this with a newer version of the planner. Reload this page to update it.');
  return { doc: json.garden !== undefined ? json.garden : json.acct, mod: json.mod || 0, revs: Array.isArray(json.revs) ? json.revs : [] };
}

/* ---------- photos ---------- */
const BGH = {};
function bgHash(gid, data){
  const k = data.length + ':' + data.slice(0, 40) + data.slice(-40), c = BGH[gid];
  if (c && c.k === k) return c.h;
  const h = h53(data); BGH[gid] = { k, h }; return h;
}
const BG_MAX = 4600000;

/* ---------- applying a merged garden to this device ---------- */
function putGarden(gid, doc, mod){
  const old = STORE.gardens[gid], g = fillGarden(clone(doc));
  g.id = gid; g.mod = mod || Date.now();
  if (old){ g.tab = old.tab; g.viewT = old.viewT; g.focus = old.focus; if (old.adv && old.adv.sec) g.adv.sec = old.adv.sec; }
  else { g.tab = 'calendar'; g.viewT = null; g.focus = null; }
  g.entries = g.entries || []; g.zones = g.zones || []; g.trees = g.trees || []; g.notes = g.notes || {}; g.prog = g.prog || {};
  STORE.gardens[gid] = g; LASTH[gid] = gHash(g);
  if (STORE.cur === gid) S = g;
}
function removeLocalGarden(gid){
  delete STORE.gardens[gid]; delete LASTH[gid]; delete SBASE.g[gid]; delete SBASE.m[gid]; delete SBASE.mine[gid]; delete SBASE.bg[gid];
  STORE.order = STORE.order.filter(x => x !== gid);
  try { localStorage.removeItem(BG_PREFIX + gid); } catch(e){} delete BG[gid];
}
function usedCustomIds(){
  const s = new Set(); Object.keys(STORE.gardens).forEach(k => (STORE.gardens[k].entries || []).forEach(e => s.add(e.crop))); return s;
}

/* ============================================================
   one sync round: read the cloud → merge here (in one uninterrupted step, so nothing you type is lost) → write back
   ============================================================ */
async function syncCycle(){
  flushStore();
  /* ---- 1. read ---- */
  const files = await driveList();
  files.sort((a, b) => (a.createdTime || '').localeCompare(b.createdTime || '') || a.id.localeCompare(b.id));
  const byName = {}, dups = [];
  files.forEach(f => { if (byName[f.name]) dups.push(f); else byName[f.name] = f; });
  const first = !SBASE.acct && !Object.keys(SBASE.g).length;
  const remoteIds = Object.keys(byName).map(n => (/^tgp-g-(.+)\.json$/.exec(n) || [])[1]).filter(Boolean);

  let racct = null, acctBad = false;
  const af = byName[ACCT_NAME], acctDups = dups.filter(x => x.name === ACCT_NAME);
  if (af){
    if (SBASE.acct && SBASE.seen[ACCT_NAME] === ftok(af) && !acctDups.length) racct = { doc: SBASE.acct, mod: SBASE.am.mod || 0, revs: SBASE.am.revs || [], cached: true };
    else {
      try {
        racct = readEnv(await driveGetJson(af.id));
        for (const d of acctDups){          /* two devices created it at once: fold them together */
          const e2 = readEnv(await driveGetJson(d.id));
          racct = { doc: m3(undefined, racct.doc, e2.doc, racct.mod >= e2.mod ? 'L' : 'R'), mod: Math.max(racct.mod, e2.mod), revs: racct.revs.concat(e2.revs), cached: false };
          racct.doc.tomb = Object.assign({}, e2.doc.tomb || {}, racct.doc.tomb || {});
        }
      } catch(e){
        if (e instanceof SyncErr && (e.kind === 'data' || e.msg === '404')){ racct = null; acctBad = true; SYNC.note = 'The synced settings file couldn’t be read, so it was left alone this time.'; }
        else throw e;
      }
    }
  }
  const renv = {}, bad = {};
  for (const gid of remoteIds){
    const f = byName[gname(gid)];
    if (SBASE.g[gid] && SBASE.seen[f.name] === ftok(f)) renv[gid] = { doc: SBASE.g[gid], mod: (SBASE.m[gid] || {}).mod || 0, revs: (SBASE.m[gid] || {}).revs || [], cached: true };
    else {
      try { renv[gid] = readEnv(await driveGetJson(f.id)); }
      catch(e){
        if (e instanceof SyncErr && e.kind === 'data'){ bad[gid] = 1; SYNC.note = 'One synced garden couldn’t be read, so it was left alone.'; }
        else if (e instanceof SyncErr && e.msg === '404'){ bad[gid] = 1; }       /* deleted while we were reading: next round sorts it out */
        else throw e;
      }
    }
  }

  /* ---- 2. merge (no awaits from here to the end of this block) ---- */
  if (!syncCanApply()) return { retry: true };
  syncStamp(); SYNC_DIRTY = false;         /* everything up to now is being handled by this round */
  const now = Date.now(), out = { uploads: [], deletes: [], applied: false, pulled: 0, pushed: 0 };
  let bakDone = false;
  const backup = () => { if (!bakDone){ bakDone = true; lsSet(SYNC_BAK_KEY, JSON.stringify({ t: now, store: STORE })); } };
  const baseFor = (rv, mine, base, key) => { if (rv && !rv.cached && mine && mine.rev && rv.revs.indexOf(mine.rev) >= 0) delete SBASE.prev[key]; return baseFor2(rv, mine, base, key); };
  const baseFor2 = (rv, mine, base, key) => (rv && !rv.cached && mine && mine.rev && rv.revs.indexOf(mine.rev) < 0 && !deq(rv.doc, base)) ? (SBASE.prev[key] == null ? undefined : SBASE.prev[key]) : base;

  if (first && remoteIds.length && isPristine()){ backup(); Object.keys(STORE.gardens).forEach(id => { delete STORE.gardens[id]; delete LASTH[id]; }); STORE.order = []; out.applied = true; }

  /* the account-wide part: order, custom crops, edited crops, deletions */
  const La = acctDoc(), Ba = SBASE.acct || undefined;
  let Ma;
  if (!racct) Ma = clone(La);
  else {
    Ma = m3(baseFor(racct, SBASE.mine[ACCT_NAME], Ba, ACCT_NAME), La, racct.doc, (STORE.amod || 0) >= (racct.mod || 0) ? 'L' : 'R');
    Ma.tomb = Object.assign({}, racct.doc.tomb || {}); Object.keys(La.tomb).forEach(k => { Ma.tomb[k] = Math.max(Ma.tomb[k] || 0, La.tomb[k]); });
  }
  Ma.tomb = Ma.tomb || {}; Object.keys(Ma.tomb).forEach(k => { if (now - Ma.tomb[k] > TOMB_DAYS * 86400000) delete Ma.tomb[k]; });

  const ids = STORE.order.filter(id => STORE.gardens[id]).concat(remoteIds.filter(id => !STORE.gardens[id]));
  const gNew = {};      /* garden id → { env, mod, prev } to upload, or null when already in step */
  ids.forEach(gid => {
    if (bad[gid]) return;
    const g = STORE.gardens[gid], rv = renv[gid], file = byName[gname(gid)], ts = Ma.tomb[gid];
    if (ts){
      const alive = Math.max(g ? g.mod || 0 : 0, rv ? rv.mod || 0 : 0) > ts;
      if (!alive){
        if (g){ backup(); removeLocalGarden(gid); out.applied = true; }
        [gname(gid), bgname(gid)].forEach(n => { if (byName[n]) out.deletes.push(byName[n]); });
        delete SBASE.g[gid]; delete SBASE.m[gid]; delete SBASE.mine[gid]; delete SBASE.bg[gid];
        return;
      }
      delete Ma.tomb[gid];
    }
    if (g && rv){
      const Ld = gdoc(g), b = baseFor(rv, SBASE.mine[gid], SBASE.g[gid], gid);
      const M = m3(b, Ld, rv.doc, (g.mod || 0) >= (rv.mod || 0) ? 'L' : 'R');
      const toLocal = !deq(M, Ld), toRemote = !deq(M, rv.doc);
      const mod = toLocal && toRemote ? now : toLocal ? rv.mod : g.mod;
      if (toLocal){ backup(); putGarden(gid, M, mod); out.applied = true; out.pulled++; }
      if (toRemote) gNew[gid] = { doc: M, mod, prev: rv.doc, revs: rv.revs, file };
      else { SBASE.g[gid] = M; SBASE.m[gid] = { mod, revs: rv.revs }; if (file) SBASE.seen[file.name] = ftok(file); }
    } else if (!g && rv){
      backup(); putGarden(gid, rv.doc, rv.mod); out.applied = true; out.pulled++;
      SBASE.g[gid] = rv.doc; SBASE.m[gid] = { mod: rv.mod, revs: rv.revs }; if (file) SBASE.seen[file.name] = ftok(file);
      if (STORE.order.indexOf(gid) < 0) STORE.order.push(gid);
    } else if (g && !rv){
      gNew[gid] = { doc: gdoc(g), mod: g.mod || now, prev: null, revs: [], file: null };
    }
  });

  /* apply the account-wide part */
  const beforeCustom = JSON.stringify([STORE.custom, STORE.overrides]);
  STORE.custom = Ma.custom || []; STORE.overrides = Ma.overrides || {}; STORE.tomb = Ma.tomb;
  const used = usedCustomIds();       /* never let a crop disappear from under a garden that still uses it */
  used.forEach(cid => {
    if (BASE_CROPS.find(b => b.id === cid) || STORE.custom.find(c => c.id === cid)) return;
    const src = [La.custom, racct && racct.doc.custom, Ba && Ba.custom].map(a => (a || []).find(c => c.id === cid)).find(Boolean);
    if (src) STORE.custom.push(clone(src));
  });
  let order = (Ma.order || []).filter(id => STORE.gardens[id]);
  STORE.order.forEach(id => { if (order.indexOf(id) < 0) order.push(id); });
  Object.keys(STORE.gardens).forEach(id => { if (order.indexOf(id) < 0) order.push(id); });
  STORE.order = order;
  if (!STORE.order.length){ const g = newGarden('My garden'); STORE.gardens[g.id] = g; STORE.order = [g.id]; LASTH[g.id] = gHash(g); g.mod = now; gNew[g.id] = { doc: gdoc(g), mod: now, prev: null, revs: [], file: null }; }
  if (!STORE.gardens[STORE.cur]){ STORE.cur = STORE.order[0]; out.applied = true; }
  S = curGarden();
  if (beforeCustom !== JSON.stringify([STORE.custom, STORE.overrides])) out.applied = true;
  if (out.applied) rebuildCrops();

  const Mf = acctDoc();
  const aToLocal = !deq(Mf, La), aToRemote = !acctBad && (!racct || !deq(Mf, racct.doc) || acctDups.length > 0);
  if (aToLocal) STORE.amod = aToRemote ? now : (racct ? racct.mod : now);
  LASTA = aHash();
  const acctUp = aToRemote ? { doc: Mf, mod: STORE.amod || now, prev: racct ? racct.doc : null, revs: racct ? racct.revs : [], file: af || null } : null;
  if (!aToRemote && racct){ SBASE.acct = Mf; SBASE.am = { mod: racct.mod, revs: racct.revs }; SBASE.seen[ACCT_NAME] = ftok(af); }
  if (out.applied) syncApplied();

  /* ---- 3. write ---- */
  const rev = () => 'r' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const put = async (name, key, u, isAcct) => {
    const r = rev(), revs = u.revs.concat(r).slice(-40);
    const meta = await drivePut(name, isAcct ? { v: SYNC_VER, mod: u.mod, revs, acct: u.doc } : { v: SYNC_VER, id: key, mod: u.mod, revs, garden: u.doc }, u.file && u.file.id, null);
    SBASE.seen[name] = ftok(meta); SBASE.mine[key] = { rev: r }; if (u.prev != null) SBASE.prev[key] = u.prev; else delete SBASE.prev[key];
    if (isAcct){ SBASE.acct = u.doc; SBASE.am = { mod: u.mod, revs }; } else { SBASE.g[key] = u.doc; SBASE.m[key] = { mod: u.mod, revs }; }
    out.pushed++;
  };
  try {
    if (acctUp) await put(ACCT_NAME, ACCT_NAME, acctUp, true);
    for (const gid of Object.keys(gNew)) await put(gname(gid), gid, gNew[gid], false);
    for (const f of out.deletes.concat(acctUp ? acctDups : [])){ await driveDel(f.id); delete SBASE.seen[f.name]; }

    /* photos: a plan photo lives in its own file so a big photo is only sent when it changes */
    let bgApplied = false;
    for (const gid of Object.keys(STORE.gardens)){
      const g = STORE.gardens[gid], local = bgGet(gid), lh = local ? bgHash(gid, local) : '';
      const st = SBASE.bg[gid] || (SBASE.bg[gid] = { h: '' }), rf = byName[bgname(gid)], rh = (rf && rf.appProperties && rf.appProperties.h) || '';
      if (!g.plan || !g.plan.bg){
        if (lh && lh === st.h){ bgSet(gid, null); bgApplied = true; }
        if (rf){ await driveDel(rf.id); delete SBASE.seen[rf.name]; }
        st.h = ''; continue;
      }
      if (lh && lh !== st.h){
        if (local.length > BG_MAX){ SYNC.note = 'A plan photo is too large to sync (' + g.name + ').'; continue; }
        const meta = await drivePut(bgname(gid), { v: SYNC_VER, h: lh, data: local }, rf && rf.id, { h: lh });
        st.h = lh; SBASE.seen[bgname(gid)] = ftok(meta); out.pushed++;
      } else if (rf && rh && (!lh || rh !== st.h)){
        try {
          const j = await driveGetJson(rf.id);
          if (j && typeof j.data === 'string' && /^data:image\//.test(j.data)){ if (bgSet(gid, j.data)){ st.h = rh; bgApplied = true; } }
        } catch(e){ if (!(e instanceof SyncErr && (e.kind === 'data' || e.msg === '404'))) throw e; }
      }
    }
    if (bgApplied) syncApplied();
  } finally { saveBase(); }
  return out;
}

/* ---------- scheduling ---------- */
let _syncTimer = null, _pollTimer = null;
function syncNotify(){                      /* called after every local save */
  if (!SYNC_DIRTY) return; SYNC_DIRTY = false;
  if (SYNC.on) syncSoon(6000);
}
function syncSoon(ms){ clearTimeout(_syncTimer); _syncTimer = setTimeout(() => syncNow('change'), ms == null ? 1500 : ms); }
async function syncNow(reason, o){
  o = o || {};
  if (!SYNC.on) return;
  if (SYNC.busy){ SYNC.again = true; return; }
  clearTimeout(_syncTimer);                  /* this round covers any change that was waiting */
  if (!syncCanApply() && reason !== 'manual' && reason !== 'connect'){ syncSoon(2800); return; }
  if (!tokenOk()){ SYNC.state = 'auth'; SYNC.msg = ''; syncRender(); return; }
  SYNC.busy = true; SYNC.state = 'syncing'; SYNC.msg = ''; SYNC.note = ''; syncRender();
  try {
    const r = await syncCycle();
    if (r && r.retry){ SYNC.state = 'idle'; syncSoon(3000); }
    else { SYNC.state = 'ok'; SYNC.last = Date.now(); SYNC.lastOut = r; saveSync(); }
  } catch(e){
    if (e instanceof SyncErr){
      SYNC.state = e.kind === 'auth' ? 'auth' : e.kind === 'net' ? 'offline' : 'error';
      SYNC.msg = e.kind === 'net' ? '' : e.kind === 'http' ? 'Google Drive said “' + e.msg + '”. It will try again.' : e.msg;
    } else { SYNC.state = 'error'; SYNC.msg = 'Something went wrong while syncing (' + (e && e.message || e) + ').'; if (window.console) console.warn('sync', e); }
  }
  SYNC.busy = false; syncRender();
  if (SYNC.again){ SYNC.again = false; syncSoon(800); }
}

if (typeof module !== 'undefined') module.exports = { m3, deq, h53, gdoc };
