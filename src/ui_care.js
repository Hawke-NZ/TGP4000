/* ============================================================
   UI CARE — watering, feeding, soil prep (Care tab) and notes (Notes tab)
   ============================================================ */
const todayIso = () => isoOfMs(TODAY);
const careLog = () => S.care.log;
function lastLogT(pred){
  let best = null;
  careLog().forEach(l => { if (pred(l)){ const t = tOfIso(l.d); if (best == null || t > best) best = t; } });
  return best;
}
const seasonOf = iso => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return m >= 7 ? y + '/' + String((y + 1) % 100).padStart(2, '0') : (y - 1) + '/' + String(y % 100).padStart(2, '0'); };

/* ---- running plantings + their feed / water state ---- */
function activeItems(){ return R.items.filter(i => i.x != null && i.p <= OFF + 2 && i.end > OFF); }
function feedRows(){
  const seen = {}, rows = [];
  activeItems().sort((a, b) => a.p - b.p).forEach(it => {
    if (seen[it.entryId]) return; seen[it.entryId] = 1;
    const c = CROP_BY_ID[it.cropId], pr = FEEDS[c.feed]; if (!pr || !pr.feed) return;
    const last = lastLogT(l => l.k === 'feed' && l.ent === it.entryId && tOfIso(l.d) >= it.p - 3);
    const st = feedState(it, last, OFF); if (!st) return;
    rows.push({ it, c, pr, last, st });
  });
  const order = { due: 0, soon: 1, later: 2, done: 3 };
  rows.sort((a, b) => order[a.st.state] - order[b.st.state] || (a.st.next || 9999) - (b.st.next || 9999));
  return rows;
}
function waterRows(){
  return R.plan.zones.map(zr => {
    const last = lastLogT(l => l.k === 'water' && l.zone === zr.z.id);
    return { zr, adv: waterAdvice(zr, OFF, R.wx, last), last };
  }).filter(x => x.adv);
}
function amendRows(){
  const out = [];
  R.care.forEach(t => {
    if (t.kind === 'feed') return;
    const it = t.item;
    if (t.kind === 'pre' && !(t.t >= OFF - 10 && t.t <= OFF + 30 && it.p > OFF - 4)) return;
    if (t.kind === 'post' && !(t.t >= OFF - 14 && t.t <= OFF + 30 && it.p <= OFF)) return;
    if (it.status === 'actual' && t.kind === 'pre') return;
    out.push(t);
  });
  return out;
}
function careDueNow(){
  let n = 0;
  feedRows().forEach(r => { if (r.st.state === 'due') n++; });
  waterRows().forEach(r => { if (r.adv.state === 'due' || r.adv.state === 'over') n++; });
  amendRows().forEach(t => { if (!S.care.amend[t.key] && t.t <= OFF + 3) n++; });
  return n;
}

const STATE_TAG = { due: ['Due', 'warn'], over: ['Overdue', 'crit'], soon: ['Soon', ''], later: ['Later', ''], done: ['Finished', ''], ok: ['OK', 'good'], skip: ['Skip — rain', 'good'], unknown: ['Check', ''] };
const stateTag = s => { const t = STATE_TAG[s] || ['', '']; return '<span class="tag ' + t[1] + '">' + t[0] + '</span>'; };

function tabCare(){
  const wr = waterRows(), fr = feedRows(), ar = amendRows();
  const today = todayIso();
  const zoneOpts = R.plan.zones.map(zr => '<option value="z:' + zr.z.id + '">' + esc(zr.z.name) + '</option>').join('');
  const entOpts = S.entries.filter(e => CROP_BY_ID[e.crop]).map(e => '<option value="e:' + e.id + '">' + esc(entryName(e)) + '</option>').join('');

  /* watering */
  const wHtml = wr.length ? '<div class="cards">' + wr.map(({ zr, adv, last }) => {
    const z = zr.z;
    return '<div class="card"><div class="card-h"><h4>' + esc(z.name) + '</h4>' + stateTag(adv.state) + '</div><p class="hint">' + esc(tagText(z)) + ' · ' + plural(adv.active, 'planting') + ' growing</p>' +
      '<p>' + esc(adv.note) + '</p><p><b>Give:</b> ' + esc(adv.volume) + '</p><p class="hint">Aim to water about every ' + adv.interval + ' day' + (adv.interval === 1 ? '' : 's') + (adv.glass ? ' (glasshouses don’t get rain — check them even after a wet day)' : '') + '.</p>' +
      '<div class="row"><button type="button" class="btn" data-act="waterNow" data-zone="' + z.id + '">Watered today</button></div></div>';
  }).join('') + '</div><p class="hint">' + (R.wx.live ? 'Based on the live forecast: ' + round1(R.wx.tMean) + ' °C average over the next few days, ' + Math.round(R.wx.rainPast) + ' mm of rain in the last week.' : 'Live weather isn’t loaded, so this uses the built-in seasonal climate and can’t see recent rain — check the soil with a finger 5 cm down.') + ' Guidance only: soil, wind and mulch change how much plants need.</p>' : '<p class="muted">Nothing is growing right now, so there’s nothing to water yet.</p>';

  /* feeding */
  const fHtml = fr.length ? '<div class="scrollx"><table class="t"><thead><tr><th>Plant</th><th>Feed with</th><th>Last fed</th><th>Next</th><th></th></tr></thead><tbody>' + fr.map(r => {
    const en = S.entries.find(x => x.id === r.it.entryId) || {};
    const st = r.st;
    return '<tr><td>' + sw(r.c) + esc(entryName(en.crop ? en : { crop: r.c.id })) + '<br><small class="muted">' + esc(zoneName(r.it.zoneId)) + '</small></td><td>' + esc(cap(st.f.what)) + '<br><small class="muted">every ' + st.f.every + ' days</small></td>' +
      '<td>' + (r.last != null ? fmtT(r.last) : '—') + '</td><td>' + (st.next != null ? fmtT(st.next) + ' ' + stateTag(st.state) : stateTag('done')) + '</td>' +
      '<td><button type="button" class="btn" data-act="fedNow" data-ent="' + r.it.entryId + '" data-what="' + esc(r.pr.buy || st.f.what) + '">Fed today</button></td></tr>';
  }).join('') + '</tbody></table></div>' : '<p class="muted">No plants are at a feeding stage yet.</p>';

  /* soil prep + clean-up */
  const aHtml = ar.length ? '<ul class="agenda amend">' + ar.map(t => {
    const it = t.item, c = CROP_BY_ID[it.cropId], done = S.care.amend[t.key];
    const list = (t.kind === 'pre' ? t.prof.pre : t.prof.post);
    return '<li class="' + (done ? 'done' : '') + '"><input type="checkbox" ' + (done ? 'checked' : '') + ' data-act="amendDone" data-key="' + esc(t.key) + '" aria-label="Mark done"><span class="dt">' + fmtT(t.t, true) + '</span><span class="tx">' + sw(c) + (t.kind === 'pre' ? 'Prepare the soil for ' : 'Clean up and rest after ') + esc(c.n.toLowerCase()) + ' <em>· ' + esc(zoneName(it.zoneId)) + '</em></span>' +
      '<details class="how"><summary>What to do</summary><ul class="notes">' + list.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></details></li>';
  }).join('') + '</ul>' : '<p class="muted">No soil prep or clean-up is due in the next month.</p>';

  /* history */
  const hist = careLog().slice().sort((a, b) => b.d.localeCompare(a.d)).slice(0, 14);
  const kindWord = { water: 'Watered', feed: 'Fed', amend: 'Amended soil', harvest: 'Harvested', issue: 'Problem' };
  const hHtml = hist.length ? '<ul class="hist">' + hist.map(l => '<li><span class="dt">' + fmtT(tOfIso(l.d)) + '</span><span><b>' + kindWord[l.k] + '</b> ' + (l.k === 'harvest' || l.k === 'issue' ? esc(logLine(l)) : esc(l.zone ? zoneName(l.zone) : l.ent ? (() => { const e = S.entries.find(x => x.id === l.ent); return e ? entryName(e) : 'plant'; })() : '')) + (l.what && l.k !== 'issue' ? ' — ' + esc(l.what) : '') + '</span><button type="button" class="btn ic x" data-act="logDel" data-id="' + l.id + '" aria-label="Delete this entry">×</button></li>').join('') + '</ul>' : '<p class="muted">Nothing logged yet. Use the buttons above, or add an entry below.</p>';

  return '<div><h3>Watering</h3>' + wHtml + '</div>' +
    '<div><h3>Feeding</h3>' + fHtml + '</div>' +
    '<div><h3>Soil prep and clean-up</h3>' + aHtml + '</div>' +
    '<details class="fold"><summary>Log something else</summary><div class="logform"><label class="fld" for="lgk">What</label><select id="lgk"><option value="water">Watered</option><option value="feed">Fed</option><option value="amend">Added compost / lime / other</option></select>' +
    '<label class="fld" for="lgw">Where / which plant</label><select id="lgw">' + (zoneOpts ? '<optgroup label="Spaces">' + zoneOpts + '</optgroup>' : '') + (entOpts ? '<optgroup label="Plants">' + entOpts + '</optgroup>' : '') + '</select>' +
    '<label class="fld" for="lgd">Date</label><input id="lgd" type="date" value="' + today + '"><label class="fld" for="lgt">What did you use? (optional)</label><input id="lgt" type="text" maxlength="80" placeholder="e.g. tomato food, half strength">' +
    '<div class="row" style="margin-top:.8rem"><button type="button" class="btn" data-act="logAdd">Add to log</button></div></div></details>' +
    '<div><h3>Recent care</h3>' + hHtml + '</div>' + soilGuide();
}
function soilGuide(){
  const used = {}; S.entries.forEach(e => { const c = CROP_BY_ID[e.crop]; if (c && FEEDS[c.feed]) (used[c.feed] || (used[c.feed] = [])).push(c.n); });
  const keys = Object.keys(used); if (!keys.length) return '';
  return '<details class="fold"><summary>Soil and feeding guide for your plants</summary>' + keys.map(k => { const p = FEEDS[k]; return '<div class="guide"><h4>' + esc(p.name) + '</h4><p class="hint">Your plants: ' + esc(Array.from(new Set(used[k])).join(', ')) + ' · best pH ' + esc(p.ph) + '</p>' +
    '<p><b>Before:</b></p><ul class="notes">' + p.pre.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' + (p.feed ? '<p><b>Feeding:</b> ' + esc(cap(p.feed.what)) + ', every ' + p.feed.every + ' days from about ' + p.feed.from + ' days after planting. ' + esc(p.feed.tip) + '</p>' : '') +
    '<p><b>After:</b></p><ul class="notes">' + p.post.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>'; }).join('') + '</details>';
}
const newLog = o => Object.assign({ id: uid('l'), d: todayIso() }, o);
ACT.waterNow = el => { S.care.log.push(newLog({ k: 'water', zone: el.dataset.zone })); update(); };
ACT.fedNow = el => { S.care.log.push(newLog({ k: 'feed', ent: el.dataset.ent, what: el.dataset.what })); update(); };
ACT.amendDone = el => { if (el.checked) S.care.amend[el.dataset.key] = todayIso(); else delete S.care.amend[el.dataset.key]; update(); };
ACT.logDel = el => { S.care.log = S.care.log.filter(l => l.id !== el.dataset.id); update(); };
ACT.logAdd = () => {
  const k = $('#lgk').value, w = $('#lgw').value, d = $('#lgd').value || todayIso(), what = $('#lgt').value.trim();
  const l = newLog({ k, d, what });
  if (w.slice(0, 2) === 'z:') l.zone = w.slice(2); else if (w.slice(0, 2) === 'e:') l.ent = w.slice(2);
  S.care.log.push(l); update();
};

/* ============ notes ============ */
const NOTE_TAGS = { tip: 'Worked well', problem: 'Problem', variety: 'Variety', result: 'Result', todo: 'Try next time' };
const subjectTitle = s => {
  if (s.slice(0, 5) === 'tree:'){ const t = S.trees.find(x => x.id === s.slice(5)); const p = t && PERENNIAL_BY_ID[t.type]; return t ? (t.label || (p ? p.n : 'Tree')) : 'Tree (removed)'; }
  if (s.slice(0, 5) === 'zone:'){ const z = S.zones.find(x => x.id === s.slice(5)); return z ? 'Space: ' + z.name : 'Space (removed)'; }
  if (s === 'garden') return 'This garden';
  const c = CROP_BY_ID[s]; return c ? c.n : s;
};
function notesBlock(subject, opts){
  const list = (S.notes[subject] || []).slice().sort((a, b) => b.d.localeCompare(a.d));
  const cur = seasonOf(todayIso());
  const items = list.map(n => {
    const past = seasonOf(n.d) !== cur;
    return '<li class="note ' + (past ? 'past' : '') + '"><div class="nh"><span class="dt">' + fmtT(tOfIso(n.d)) + ' ' + n.d.slice(0, 4) + '</span>' + (n.tag ? '<span class="tag">' + esc(NOTE_TAGS[n.tag] || n.tag) + '</span>' : '') + (past ? '<span class="tag">' + esc(seasonOf(n.d)) + '</span>' : '') + (n.y ? '<span class="tag good">' + esc(String(n.y)) + '</span>' : '') +
      '<button type="button" class="btn ic x" data-act="noteDel" data-subject="' + esc(subject) + '" data-id="' + n.id + '" aria-label="Delete note">×</button></div><p>' + esc(n.txt).replace(/\n/g, '<br>') + '</p></li>';
  }).join('');
  const c = CROP_BY_ID[subject];
  return '<ul class="notelist">' + (items || '<li class="muted">No notes yet — add what you learn so you can refer back next season.</li>') + '</ul>' +
    '<div class="noteform" data-subject="' + esc(subject) + '"><textarea rows="2" maxlength="600" placeholder="e.g. Sweet 100 outcropped everything; needed ties every week" aria-label="New note"></textarea>' +
    '<div class="row"><select aria-label="Note type">' + Object.keys(NOTE_TAGS).map(k => '<option value="' + k + '">' + NOTE_TAGS[k] + '</option>').join('') + '</select>' +
    (c && c.kg > 0 ? '<input type="text" class="ny" maxlength="16" placeholder="Harvest (' + (c.u === 'kg' ? 'kg' : c.u) + ')" aria-label="Harvest amount">' : '') +
    '<button type="button" class="btn" data-act="noteAdd" data-subject="' + esc(subject) + '">Save note</button></div></div>';
}
ACT.noteAdd = el => {
  const form = el.closest('.noteform'), s = el.dataset.subject, txt = form.querySelector('textarea').value.trim();
  const y = (form.querySelector('.ny') || {}).value;
  if (!txt && !(y && y.trim())) return;
  (S.notes[s] || (S.notes[s] = [])).push({ id: uid('n'), d: todayIso(), txt: txt || 'Harvest logged', tag: form.querySelector('select').value, y: y ? y.trim() : '' });
  update();
};
ACT.noteDel = el => { const s = el.dataset.subject; S.notes[s] = (S.notes[s] || []).filter(n => n.id !== el.dataset.id); if (!S.notes[s].length) delete S.notes[s]; update(); };
ACT.enotes = el => { S.tab = 'notes'; S.noteFocus = el.dataset.crop; renderResults(); saveState(); const t = $('#nt-' + CSS.escape(S.noteFocus)); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

function tabNotes(){
  const cur = seasonOf(todayIso());
  const subjects = [];
  S.entries.forEach(e => { if (subjects.indexOf(e.crop) < 0) subjects.push(e.crop); });
  S.trees.forEach(t => subjects.push('tree:' + t.id));
  Object.keys(S.notes).forEach(k => { if (subjects.indexOf(k) < 0) subjects.push(k); });
  if (subjects.indexOf('garden') < 0) subjects.push('garden');
  /* the "look back" panel: notes from earlier seasons, newest first */
  const past = [];
  Object.keys(S.notes).forEach(s => S.notes[s].forEach(n => { if (seasonOf(n.d) !== cur) past.push({ s, n }); }));
  past.sort((a, b) => b.n.d.localeCompare(a.n.d));
  const lookBack = past.length ? '<div class="lookback"><h3>From earlier seasons</h3><p class="hint">What you wrote down before — worth a read before you plant.</p><ul class="notelist">' + past.slice(0, 12).map(p => '<li class="note past"><div class="nh"><b>' + esc(subjectTitle(p.s)) + '</b><span class="dt">' + p.n.d + '</span>' + (p.n.tag ? '<span class="tag">' + esc(NOTE_TAGS[p.n.tag] || p.n.tag) + '</span>' : '') + (p.n.y ? '<span class="tag good">' + esc(String(p.n.y)) + '</span>' : '') + '</div><p>' + esc(p.n.txt) + '</p></li>').join('') + '</ul></div>' : '';
  const blocks = subjects.map(s => {
    const c = CROP_BY_ID[s], n = (S.notes[s] || []).length;
    return '<section class="nsub" id="nt-' + esc(s) + '"><h4>' + (c ? sw(c) : '') + esc(subjectTitle(s)) + ' <em>' + (n ? plural(n, 'note') : '') + '</em></h4>' + notesBlock(s) + '</section>';
  }).join('');
  return '<p class="muted">Notes are kept per plant, so they’re still here when you plant it again next season. Old notes show up under “From earlier seasons”.</p>' + lookBack + '<div class="nsubs">' + blocks + '</div>' +
    '<div class="actions"><button class="btn" data-act="notesCopy" type="button">Copy all notes</button></div>';
}
ACT.notesCopy = el => {
  const lines = ['Total Garden Planner 4000 — notes (' + S.name + ')', ''];
  Object.keys(S.notes).forEach(s => { lines.push(subjectTitle(s)); S.notes[s].slice().sort((a, b) => a.d.localeCompare(b.d)).forEach(n => lines.push('  ' + n.d + (n.tag ? ' [' + (NOTE_TAGS[n.tag] || n.tag) + ']' : '') + (n.y ? ' (' + n.y + ')' : '') + ': ' + n.txt)); lines.push(''); });
  const txt = lines.join('\n'), done = () => { const o = el.textContent; el.textContent = 'Copied'; setTimeout(() => el.textContent = o, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => {}); else done();
};
