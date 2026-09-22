/* ============================================================
   UI SYNC — the Sync button, sign-in with Google, the Sync dialog, timers
   ============================================================ */
const syncCid = () => ((window.TGP_CONFIG && window.TGP_CONFIG.googleClientId) || lsGet(SYNC_CID_KEY) || '').trim();
let LAST_TYPED = 0;
['input', 'keydown'].forEach(ev => document.addEventListener(ev, () => { LAST_TYPED = Date.now(); }, true));

/* only swap in changes from the cloud when you're not halfway through typing or dragging */
function syncCanApply(){
  if (typeof SITE !== 'undefined' && SITE.drag) return false;
  return Date.now() - LAST_TYPED > 2500;
}
function syncApplied(){
  S = curGarden();
  try { refreshLive(false); } catch(e){}
  update();
}

/* ---------- Google sign-in (loaded only once someone turns sync on) ---------- */
function gisReady(){ return !!(window.google && google.accounts && google.accounts.oauth2); }
let _gisP = null;
function loadGis(){
  if (gisReady()) return Promise.resolve();
  if (_gisP) return _gisP;
  _gisP = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => { _gisP = null; s.remove(); rej(new SyncErr('net', 'Couldn’t reach Google. Check your connection.')); };
    document.head.appendChild(s);
    setTimeout(() => { if (!gisReady()){ _gisP = null; rej(new SyncErr('net', 'Google sign-in didn’t load.')); } }, 20000);
  });
  return _gisP;
}
/* must be called straight from a tap so the browser lets the sign-in window open */
function requestToken(){
  return new Promise((resolve, reject) => {
    let done = false; const fin = (fn, v) => { if (!done){ done = true; fn(v); } };
    if (!gisReady()) return reject(new SyncErr('net', 'Google sign-in isn’t loaded yet. Tap again in a moment.'));
    try {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: syncCid(), scope: SYNC_SCOPE,
        callback: r => {
          if (!r || r.error) return fin(reject, new SyncErr('denied', (r && (r.error_description || r.error)) || 'Sign-in failed.'));
          if (r.scope && r.scope.indexOf('drive.appdata') < 0) return fin(reject, new SyncErr('scope', 'Sync needs the “app data” permission. Tick it on Google’s screen and try again.'));
          setToken(r.access_token, +r.expires_in || 3600); fin(resolve);
        },
        error_callback: e => fin(reject, new SyncErr(e && e.type === 'popup_closed' ? 'closed' : 'popup', e && e.type === 'popup_closed' ? 'Sign-in was cancelled.' : 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and tap again.'))
      });
      tc.requestAccessToken(SYNC.email ? { hint: SYNC.email } : {});
    } catch(e){ fin(reject, new SyncErr('denied', 'Google sign-in failed: ' + (e && e.message))); }
    setTimeout(() => fin(reject, new SyncErr('closed', 'Sign-in timed out.')), 240000);
  });
}
async function fetchEmail(){
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + TOK.t } });
    if (r.ok){ const j = await r.json(); return (j.email || '').toLowerCase(); }
  } catch(e){}
  return '';
}

/* ---------- the button at the top ---------- */
const CLOUD_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8.6 4.7 4.7 0 0 1 17 18H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
function ago(t){
  if (!t) return 'not yet';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago';
}
function syncWords(){
  const st = SYNC.state;
  if (!SYNC.on) return { chip: 'Sync', cls: 'off', label: 'Sync your gardens between devices' };
  if (st === 'syncing') return { chip: 'Syncing…', cls: 'busy', label: 'Syncing' };
  if (st === 'auth') return { chip: 'Reconnect', cls: 'warn', label: 'Sync is paused. Tap to sign in again.' };
  if (st === 'offline') return { chip: 'Sync paused', cls: 'warn', label: 'Sync is paused: no connection' };
  if (st === 'error') return { chip: 'Sync problem', cls: 'err', label: 'Sync problem' };
  if (st === 'ok') return { chip: 'Synced', cls: 'ok', label: 'Synced ' + ago(SYNC.last) };
  return { chip: 'Sync', cls: 'busy', label: 'Sync is on' };
}
function renderSyncChip(){
  const b = $('#syncChip'); if (!b) return;
  const w = syncWords();
  b.className = 'syncchip ' + w.cls; b.innerHTML = '<span class="sdot"></span>' + CLOUD_SVG + '<span class="stxt">' + esc(w.chip) + '</span>';
  b.title = w.label; b.setAttribute('aria-label', w.label);
}
function syncRender(){
  renderSyncChip();
  const body = $('#syncbody'); if (body && $('#dlg') && $('#dlg').open) body.innerHTML = syncBodyHtml();
}
ACT.syncchip = () => {
  if (SYNC.on && SYNC.state === 'auth'){ return syncReconnect(); }
  ACT.syncopen();
};

/* ---------- the dialog ---------- */
let SYNC_DLG_MSG = '', PENDING_EMAIL = '';
function syncBodyHtml(){
  const cid = syncCid();
  if (PENDING_EMAIL) return switchHtml();
  if (!SYNC.on){
    return '<p class="muted">Sign in with Google and your gardens follow you to your phone, laptop or any other device. Everything stays yours:</p>' +
      '<ul class="notes"><li><b>Private.</b> Your gardens are saved in a hidden folder in <em>your own</em> Google Drive that only this planner can open. Nobody else can see them, including whoever runs this site.</li>' +
      '<li><b>Separate.</b> Each person signs in with their own Google account, so a friend’s gardens never mix with yours. Sharing a garden still works with a link or file, and gives the other person their own copy.</li>' +
      '<li><b>Still works offline.</b> Gardens are also kept on this device, so nothing waits on the internet. Changes are merged when you’re back online.</li></ul>' +
      (cid ? '<div class="row wrap" style="margin-top:.7rem"><button type="button" class="btn primary" data-act="syncsignin">Sign in with Google</button></div>' +
        '<p class="hint">This loads Google’s sign-in from accounts.google.com and asks for permission to a private app-data folder in your Drive, plus your email address (to show which account is signed in). It can’t see any of your other files.</p>'
        : '<div class="card warnbox"><b>Sync isn’t switched on for this site yet.</b><p class="hint" style="margin:.3rem 0 .5rem">Whoever hosts the planner needs to add a free Google “client ID” once (the README has the steps). If you host your own copy, paste it here to try it:</p>' +
          '<div class="row"><input id="sync-cid" type="text" placeholder="1234567890-abc….apps.googleusercontent.com" autocomplete="off" spellcheck="false" value="' + esc(lsGet(SYNC_CID_KEY) || '') + '"><button type="button" class="btn" data-act="synccid">Save</button></div></div>') +
      '<p id="syncmsg" class="hint" role="status">' + esc(SYNC_DLG_MSG) + '</p>';
  }
  const w = syncWords(), bak = jget(SYNC_BAK_KEY);
  return '<div class="syncstat ' + w.cls + '"><span class="sdot"></span><b>' + esc(w.cls === 'ok' ? 'Up to date' : w.cls === 'busy' ? 'Syncing…' : w.cls === 'warn' && SYNC.state === 'auth' ? 'Sign in again to sync' : w.cls === 'warn' ? 'Paused (no connection)' : 'Needs attention') + '</b>' +
    '<span class="muted"> · last synced ' + esc(ago(SYNC.last)) + '</span></div>' +
    '<p>Signed in as <b>' + esc(SYNC.email || 'your Google account') + '</b>. Your gardens are saved in a private folder in that account’s Google Drive.</p>' +
    (SYNC.msg ? '<p class="hint warn" role="alert">' + esc(SYNC.msg) + '</p>' : '') + (SYNC.note ? '<p class="hint warn">' + esc(SYNC.note) + '</p>' : '') +
    '<div class="row wrap">' +
      (SYNC.state === 'auth' ? '<button type="button" class="btn primary" data-act="syncreconnect">Sign in again</button>' : '<button type="button" class="btn primary" data-act="syncnow"' + (SYNC.busy ? ' disabled' : '') + '>Sync now</button>') +
      '<button type="button" class="btn" data-act="syncout">Sign out on this device</button></div>' +
    '<p class="hint">Changes save on this device first, then sync a few seconds later. Google keeps a website signed in for about an hour at a time, so when you come back to the planner you may need to tap <b>Reconnect</b> at the top once.</p>' +
    '<details class="fold"><summary>More options</summary><div class="syncmore">' +
      '<p class="hint">Signing out keeps your gardens on this device and stops syncing. Signing in again later picks up where it left off.</p>' +
      '<div class="row wrap"><button type="button" class="btn" data-act="syncoutclear">Sign out and clear this device</button>' +
      (bak ? '<button type="button" class="btn" data-act="syncrestore">Undo the last sync’s changes here</button>' : '') + '</div>' +
      '<p class="hint">“Clear this device” is for a shared or borrowed device: it downloads a backup file, then removes the gardens from this browser. Your Drive copy stays.' + (bak ? ' “Undo” puts this browser back the way it was just before the last sync that changed it (' + esc(ago(bak.t)) + '), then syncs that.' : '') + '</p>' +
      '<div class="row wrap"><button type="button" class="btn danger" data-act="syncdelcloud">Turn off sync and delete my cloud copy</button></div>' +
      '<p class="hint">Deletes every synced file from your Drive’s private folder. Gardens on your devices are not touched. Other devices that are still signed in will upload their copy again, so sign them out too if you want it gone.</p></div></details>' +
    '<p id="syncmsg" class="hint" role="status">' + esc(SYNC_DLG_MSG) + '</p>';
}
function switchHtml(){
  return '<div class="card warnbox"><b>This browser already has gardens from another account.</b>' +
    '<p style="margin:.4rem 0">The gardens here were synced with <b>' + esc(SYNC.owner) + '</b>, and you’ve just signed in as <b>' + esc(PENDING_EMAIL) + '</b>. What should happen to them?</p>' +
    '<div class="row wrap"><button type="button" class="btn primary" data-act="syncswitchadd">Add them to ' + esc(PENDING_EMAIL) + '’s account</button>' +
    '<button type="button" class="btn" data-act="syncswitchfresh">Keep them separate</button></div>' +
    '<p class="hint">“Keep them separate” downloads a backup file of the gardens on this browser, clears them, and starts fresh with only ' + esc(PENDING_EMAIL) + '’s gardens.</p>' +
    '<div class="row"><button type="button" class="btn" data-act="syncswitchcancel">Cancel</button></div></div>';
}
function syncDlgHtml(){
  return '<div class="card-h"><h2>Sync your gardens</h2><button type="button" class="btn ic x" data-act="dlgclose" aria-label="Close">×</button></div><div id="syncbody">' + syncBodyHtml() + '</div>' +
    '<div class="row end"><button type="button" class="btn" data-act="dlgclose">Close</button></div>';
}
ACT.syncopen = () => { SYNC_DLG_MSG = ''; PENDING_EMAIL = ''; openDlg(syncDlgHtml()); if (syncCid()) loadGis().catch(() => {}); };
const syncMsg = t => { SYNC_DLG_MSG = t; const m = $('#syncmsg'); if (m) m.textContent = t; };
ACT.synccid = () => {
  const v = ($('#sync-cid') || {}).value || '';
  if (v.trim() && !/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(v.trim())){ syncMsg('That doesn’t look like a Google client ID. It ends in .apps.googleusercontent.com.'); return; }
  if (v.trim()) lsSet(SYNC_CID_KEY, v.trim()); else lsDel(SYNC_CID_KEY);
  SYNC_DLG_MSG = v.trim() ? 'Saved.' : ''; syncRender(); if (syncCid()) loadGis().catch(() => {});
};

/* ---------- signing in and out ---------- */
function syncFail(e){
  const m = e instanceof SyncErr ? e.msg || e.kind : (e && e.message) || 'Something went wrong.';
  if (e instanceof SyncErr && e.kind === 'closed') return syncMsg(m);
  syncMsg(m);
}
ACT.syncsignin = async () => {
  if (!syncCid()) return;
  syncMsg('Opening Google sign-in…');
  try {
    if (!gisReady()) await loadGis();
    await requestToken();
    const email = await fetchEmail();
    if (!email){ dropToken(); syncMsg('Couldn’t confirm which Google account that was. Check your connection and try again.'); return; }
    if (SYNC.owner && SYNC.owner !== email){
      if (isPristine()){ resetBase(); }
      else { PENDING_EMAIL = email; syncRender(); return; }
    }
    syncFinishConnect(email);
  } catch(e){ syncFail(e); }
};
function syncFinishConnect(email){
  SYNC.on = true; SYNC.email = email || SYNC.email; SYNC.owner = email || SYNC.owner || 'this account'; PENDING_EMAIL = '';
  saveSync(); SYNC_DLG_MSG = ''; SYNC.state = 'idle'; syncRender(); ensurePolling();
  syncNow('connect').then(() => {
    if (SYNC.state === 'ok'){
      const o = SYNC.lastOut || {};
      SYNC_DLG_MSG = o.pulled ? 'Signed in. Brought in ' + o.pulled + (o.pulled === 1 ? ' garden' : ' gardens') + ' from your Drive.' : 'Signed in. Your gardens are backed up and will stay in step.';
      syncRender();
    }
  });
}
ACT.syncswitchadd = () => { const e = PENDING_EMAIL; resetBase(); STORE.tomb = {}; syncFinishConnect(e); };
ACT.syncswitchfresh = () => {
  const e = PENDING_EMAIL;
  try { downloadJson('gardens-on-this-device-' + isoToday() + '.json', exportAll()); } catch(err){}
  wipeLocal(); resetBase(); syncFinishConnect(e);
};
ACT.syncswitchcancel = () => { PENDING_EMAIL = ''; dropToken(); syncRender(); };
async function syncReconnect(){
  try {
    if (!gisReady()) await loadGis();
    await requestToken();
    const email = await fetchEmail();
    if (!email){ dropToken(); ACT.syncopen(); syncMsg('Couldn’t confirm which Google account that was. Check your connection and try again.'); return; }
    if (SYNC.email && email !== SYNC.email){ dropToken(); ACT.syncopen(); syncMsg('You signed in as ' + email + ', but this device is syncing with ' + SYNC.email + '. Sign out first to switch accounts.'); return; }
    SYNC.state = 'idle'; SYNC.msg = ''; syncRender(); syncNow('reconnect');
  } catch(e){
    ACT.syncopen(); syncFail(e);
  }
}
ACT.syncreconnect = syncReconnect;
ACT.syncnow = () => { SYNC_DLG_MSG = ''; syncNow('manual'); };
ACT.syncout = () => {
  SYNC.on = false; SYNC.state = 'off'; SYNC.msg = ''; dropToken(); saveSync(); stopPolling();
  SYNC_DLG_MSG = 'Signed out. Your gardens are still on this device.'; syncRender();
};
function wipeLocal(){
  Object.keys(STORE.gardens).forEach(id => { try { localStorage.removeItem(BG_PREFIX + id); } catch(e){} delete BG[id]; });
  const g = newGarden('My garden'); g.entries = starterEntries();
  STORE = { v: 2, cur: g.id, order: [g.id], gardens: { [g.id]: g }, custom: [], overrides: {}, tomb: {} };
  Object.keys(LASTH).forEach(k => delete LASTH[k]);
  syncInit(); rebuildCrops(); S = curGarden(); lsDel(SYNC_BAK_KEY); update();
}
ACT.syncoutclear = () => {
  if (!confirm('Download a backup, then remove every garden from this browser? Your Google Drive copy stays, and you can sign in again to bring it back.')) return;
  try { downloadJson('gardens-on-this-device-' + isoToday() + '.json', exportAll()); } catch(e){}
  SYNC.on = false; SYNC.state = 'off'; SYNC.owner = ''; SYNC.email = ''; dropToken(); stopPolling(); resetBase(); saveSync(); wipeLocal();
  SYNC_DLG_MSG = 'Signed out and cleared. A backup file was downloaded.'; syncRender();
};
ACT.syncrestore = () => {
  const bak = jget(SYNC_BAK_KEY); if (!bak || !bak.store) return;
  if (!confirm('Put this browser back the way it was ' + ago(bak.t) + ', just before the last sync that changed it? That version will then sync to your other devices too.')) return;
  const cur = STORE.cur;
  Object.keys(STORE.gardens).forEach(id => { if (!bak.store.gardens[id]){ try { localStorage.removeItem(BG_PREFIX + id); } catch(e){} } });
  STORE = bak.store; STORE.tomb = STORE.tomb || {}; STORE.custom = STORE.custom || []; STORE.overrides = STORE.overrides || {};
  Object.keys(STORE.gardens).forEach(k => fillGarden(STORE.gardens[k]));
  if (!STORE.gardens[STORE.cur]) STORE.cur = STORE.gardens[cur] ? cur : STORE.order[0];
  rebuildCrops(); S = curGarden(); lsDel(SYNC_BAK_KEY); update(); syncSoon(1500);
  SYNC_DLG_MSG = 'Restored.'; syncRender();
};
ACT.syncdelcloud = async () => {
  if (!confirm('Delete your synced copy from Google Drive and turn sync off? The gardens on your devices stay as they are.')) return;
  if (!tokenOk()){ syncMsg('Sign in again first (tap “Sign in again”), then delete.'); return; }
  syncMsg('Deleting…');
  try {
    SYNC.on = false; clearTimeout(_syncTimer);                                  /* stop new rounds, let a running one finish */
    for (let i = 0; i < 100 && SYNC.busy; i++) await sleep(200);
    const files = await driveList(); for (const f of files) await driveDel(f.id);
    SYNC.state = 'off'; dropToken(); stopPolling(); resetBase(); saveSync(); STORE.tomb = {};
    SYNC_DLG_MSG = 'Deleted ' + files.length + (files.length === 1 ? ' file' : ' files') + ' from your Drive. Sync is off.'; syncRender();
  } catch(e){ SYNC.on = true; syncFail(e); }
};

/* ---------- keep going in the background ---------- */
function ensurePolling(){
  if (_pollTimer) return;
  _pollTimer = setInterval(() => { if (SYNC.on && !document.hidden && SYNC.state !== 'auth') syncNow('poll'); renderSyncChip(); const b = $('#syncbody'); if (b && $('#dlg').open && !SYNC.busy) b.innerHTML = syncBodyHtml(); }, 90000);
}
function stopPolling(){ clearInterval(_pollTimer); _pollTimer = null; }
document.addEventListener('visibilitychange', () => {
  if (document.hidden){ flushStore(); return; }
  if (SYNC.on && Date.now() - SYNC.last > 30000) syncNow('focus');
});
window.addEventListener('pagehide', () => flushStore());
window.addEventListener('online', () => { if (SYNC.on && (SYNC.state === 'offline' || SYNC.state === 'error')) syncNow('online'); });

/* ---------- boot ---------- */
syncInit();
renderSyncChip();
if (SYNC.on){
  ensurePolling();
  if (syncCid()) loadGis().catch(() => {});
  if (tokenOk()) syncSoon(1200); else { SYNC.state = 'auth'; renderSyncChip(); }
}
