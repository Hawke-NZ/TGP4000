/* ============================================================
   UI ADVICE — the Advisor tab: this week, improve my garden, companions, pests, techniques,
   crop guide, rotation, season review, garden profile; plus the calendar (.ics) export
   ============================================================ */
'use strict';
const ADVUI = { comp: null, guide: null, pestQ: '', pestKind: '', techCat: '', openTech: null, openPest: null, showAllPests: false, hv: null };
const ADV_SECS = [['week', 'This week'], ['improve', 'Improve my garden'], ['companions', 'Companions'], ['pests', 'Pests & diseases'], ['techniques', 'Techniques'], ['guide', 'Crop guide'], ['rotation', 'Rotation'], ['review', 'Season review'], ['profile', 'My garden']];

/* analysis is worked out once per plan */
function advAn(){ if (!R._an){ try { R._an = analyse(R, S); } catch(e){ console.error('advisor:', e); R._an = { findings: [], good: [], coverage: { veg: new Array(12).fill(0), flow: new Array(12).fill(0) }, nb: [], score: { rows: [], total: null }, failed: true }; } } return R._an; }
function advAlerts(){ if (!R._al){ try { R._al = weekAlerts(R, S); } catch(e){ console.error('alerts:', e); R._al = []; } } return R._al; }
function advBadge(){ try { return advAlerts().filter(a => a.sev >= 2).length + advAn().findings.filter(f => f.sev >= 3).length; } catch(e){ return 0; } }

const evBadge = ev => ev ? '<span class="ev ev-' + ev + '" title="' + esc(EV_HINT[ev] || '') + '">' + esc(EV_TXT[ev]) + '</span>' : '';
const sevWord = s => s >= 3 ? ['Fix first', 'crit'] : s === 2 ? ['Worth doing', 'warn'] : s === 1 ? ['Nice to have', ''] : ['Good to know', ''];
const cropLink = c => sw(c) + esc(c.n);
function monthSpan(mo){
  if (mo.length >= 12) return 'all year';
  const has = {}; mo.forEach(m => has[m] = true); const runs = [];
  for (let m = 1; m <= 12; m++){
    if (!has[m] || has[m === 1 ? 12 : m - 1]) continue;
    let e = m, n = 1; while (has[e % 12 + 1] && n < 12){ e = e % 12 + 1; n++; }
    runs.push(n === 1 ? MONTHS[m - 1] : n === 2 ? MONTHS[m - 1] + ', ' + MONTHS[e - 1] : MONTHS[m - 1] + '–' + MONTHS[e - 1]);
  }
  return runs.join(', ');
}
function joinC(list){ return list.length <= 2 ? list.join(' and ') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }

/* ---------- the tab ---------- */
function tabAdvisor(){
  let sec = S.adv.sec; if (!ADV_SECS.some(s => s[0] === sec)) sec = S.adv.sec = 'week';
  const nav = '<div class="gtabs advnav" role="tablist" aria-label="Advisor sections">' + ADV_SECS.map(s => '<button type="button" role="tab" class="gchip ' + (sec === s[0] ? 'on' : '') + '" aria-selected="' + (sec === s[0]) + '" data-act="advsec" data-sec="' + s[0] + '">' + s[1] + (s[0] === 'improve' && advAn().findings.filter(f => f.sev >= 2).length ? ' <em>' + advAn().findings.filter(f => f.sev >= 2).length + '</em>' : '') + (s[0] === 'week' && advAlerts().filter(a => a.sev >= 2).length ? ' <em>' + advAlerts().filter(a => a.sev >= 2).length + '</em>' : '') + '</button>').join('') + '</div>';
  let body = '';
  try {
    body = { week: secWeek, improve: secImprove, companions: secCompanions, pests: secPests, techniques: secTech, guide: secGuide, rotation: secRotation, review: secReview, profile: secProfile }[sec]();
  } catch(e){ console.error('advisor section', sec, e); body = '<div class="empty"><h3>Something went wrong drawing this section</h3><p>' + esc(e.message) + '</p></div>'; }
  return nav + '<div class="advbody" id="advbody">' + body + '</div>';
}
/* how far the sticky tab bar at the top of the page covers, so a manual scroll doesn't tuck content under it */
const navOffset = () => { const n = $('#topnav'); return (n ? n.offsetHeight : 0) + 8; };
ACT.advsec = el => { S.adv.sec = el.dataset.sec; renderResults(); saveState(); const b = $('.advnav'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }); };
ACT.advgo = el => {
  const d = el.dataset;
  if (d.tab) S.tab = d.tab;
  if (d.sec) S.adv.sec = d.sec;
  renderResults(); saveState();
  if (d.focus){ const t = document.getElementById('adv-' + d.focus); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  else window.scrollTo({ top: Math.max(0, ($('#results') || document.body).getBoundingClientRect().top + window.scrollY - navOffset()), behavior: 'smooth' });
};

/* =============== THIS WEEK =============== */
function secWeek(){
  const m = monthOfT(OFF), alerts = advAlerts(), watch = pestWatch(R, S).filter(x => x.risk === 'high' || x.risk === 'watch').slice(0, 6), jobs = monthJobs(R, S, m);
  const band = climateBand(R), bandTxt = { warm: 'a warm, near frost-free climate', temperate: 'a mild climate with light frosts', cool: 'a cold-winter climate with late frosts' }[band];
  const alHtml = alerts.length ? '<div class="alerts">' + alerts.map(a => '<div class="alert a' + a.sev + '" role="note"><h4>' + esc(a.title) + '</h4><p>' + esc(a.body) + '</p></div>').join('') + '</div>'
    : '<p class="muted">' + (R.wx.live ? 'Nothing unusual in the forecast for the next week. ' : 'The live forecast isn’t loaded, so weather alerts are off. Open the Data sources panel in the sidebar to check. ') + '</p>';
  /* the next ten days of sowing, planting and picking */
  const from = OFF - 3, to = OFF + 10;
  const evs = R.ev.filter(e => e.t >= from && e.t <= to).slice(0, 14);
  const evHtml = evs.length ? '<ul class="agenda">' + evs.map(e => { const c = CROP_BY_ID[e.cropId]; return '<li><span class="dt">' + fmtT(e.t, true) + '</span><span class="tx">' + (c ? sw(c) : '') + esc(e.text) + '</span>' + eventNote(e) + '</li>'; }).join('') + '</ul>'
    : '<p class="muted">No sowing, planting or harvesting is scheduled for the next ten days.</p>';
  const due = careDueNow();
  const doneKey = t => S.adv.jobs[(seasonYear(OFF)) + '|' + m + '|' + t.slice(0, 24)];
  const jobHtml = jobs.length ? '<ul class="agenda jobs">' + jobs.map((j, i) => '<li class="' + (doneKey(j.t) ? 'done' : '') + '"><input type="checkbox" ' + (doneKey(j.t) ? 'checked' : '') + ' data-act="jobdone" data-k="' + esc(j.t.slice(0, 24)) + '" aria-label="Mark done"><span class="tx">' + (j.cat !== 'Month' ? '<span class="tag">' + esc(j.cat) + '</span> ' : '') + esc(j.t) + '</span></li>').join('') + '</ul>' : '<p class="muted">No general jobs for this month.</p>';
  const pw = watch.length ? '<div class="pests">' + watch.map(pestCard).join('') + '</div><p><button type="button" class="lnk" data-act="advsec" data-sec="pests">All pests and diseases for my plants</button></p>' : '<p class="muted">Nothing is flagged for your plants this month.</p>';
  const next = m % 12 + 1, nextJobs = monthJobs(R, S, next).slice(0, 4);
  return '<p class="muted">Today for ' + esc(R.loc.name) + ': ' + esc(bandTxt) + '. This page combines the live forecast, what’s planned in your garden and the NZ gardening year.</p>' +
    '<h3 id="adv-alerts">Weather</h3>' + alHtml +
    '<h3>Coming up in the garden</h3>' + evHtml +
    (due ? '<p class="callout"><b>' + plural(due, 'care job') + '</b> due now (watering, feeding or soil prep). <button type="button" class="lnk" data-act="advgo" data-tab="care">Open the Care tab</button></p>' : '') +
    '<h3>Jobs for ' + MONTHS[m - 1] + ' <em>(tick them off)</em></h3>' + jobHtml +
    (nextJobs.length ? '<details class="fold"><summary>Looking ahead to ' + MONTHS[next - 1] + '</summary><ul class="notes">' + nextJobs.map(j => '<li>' + esc(j.t) + '</li>').join('') + '</ul></details>' : '') +
    '<h3>Watch for</h3>' + pw +
    '<div class="actions" style="margin-top:1rem"><button type="button" class="btn" data-act="icsopen">Add my dates to a calendar (.ics)</button></div>' + icsPanel();
}
ACT.jobdone = el => { const k = seasonYear(OFF) + '|' + monthOfT(OFF) + '|' + el.dataset.k; if (el.checked) S.adv.jobs[k] = 1; else delete S.adv.jobs[k]; saveState(); renderResults(); };

function pestCard(w, opts){
  opts = opts || {};
  const p = w.p, open = ADVUI.openPest === p.id, tag = { high: ['Likely now', 'crit'], watch: ['In season', 'warn'], soon: ['Coming up', ''], off: ['Out of season', ''] }[w.risk];
  const seen = (S.care.log || []).filter(l => l.k === 'issue' && l.pest === p.id);
  const last = seen.slice().sort((a, b) => b.d.localeCompare(a.d))[0];
  const yours = joinC(w.crops.concat(w.trees.filter(Boolean)).slice(0, 4)).toLowerCase();
  return '<details class="pest" data-pest="' + p.id + '"' + (open ? ' open' : '') + '><summary><span class="pn">' + esc(p.n) + '</span> <span class="tag ' + tag[1] + '">' + tag[0] + '</span>' + (last ? ' <span class="tag good" title="You logged this on ' + esc(last.d) + '">you’ve seen it (' + esc(seasonOf(last.d)) + ')</span>' : '') + '<small class="muted">' + (yours ? 'affects your ' + esc(yours) : 'affects ' + esc(pestTargets(p))) + '</small></summary>' +
    '<div class="pbody"><p><b>Active:</b> ' + esc(monthSpan(p.mo)) + '</p>' + (w.why.length ? '<p class="whynow"><b>Why now:</b> ' + esc(w.why.join(', ')) + '.</p>' : '') +
    '<p><b>What it looks like:</b> ' + esc(p.sym) + '</p><p><b>Prevent it:</b> ' + esc(p.prev) + '</p><p><b>' + (S.profile && S.profile.organic === false ? 'If it gets out of hand' : 'Organic control') + ':</b> ' + esc(p.org) + '</p>' +
    (p.nz ? '<p class="hint">' + esc(p.nz) + '</p>' : '') +
    '<div class="row wrap"><button type="button" class="btn" data-act="pestlog" data-pest="' + p.id + '">I’ve seen this</button>' + (seen.length ? '<small class="muted">logged ' + plural(seen.length, 'time') + '</small>' : '') + '</div></div></details>';
}
document.addEventListener('toggle', ev => { const d = ev.target; if (d && d.classList && d.classList.contains('pest') && d.dataset.pest){ if (d.open) ADVUI.openPest = d.dataset.pest; else if (ADVUI.openPest === d.dataset.pest) ADVUI.openPest = null; } }, true);
ACT.pestlog = el => { S.care.log.push(newLog({ k: 'issue', pest: el.dataset.pest })); update(); };

/* =============== IMPROVE =============== */
function secImprove(){
  const an = advAn(), sc = an.score;
  const dis = Object.keys(S.adv.dismissed).length;
  const scoreHtml = sc.total == null ? '' : '<div class="score card"><div class="big"><span class="n">' + sc.total + '</span><span class="of">/100</span><small>garden health</small></div><div class="bars">' +
    sc.rows.map(r => '<div class="bar-row"><span class="bl">' + esc(r.k) + '</span><span class="bt"><i style="width:' + r.v + '%" class="' + (r.v >= 80 ? 'g' : r.v >= 55 ? 'a' : 'r') + '"></i></span><span class="bv">' + r.v + '</span></div>').join('') +
    '</div><p class="hint">A rule-of-thumb check of light, companions, rotation, soil care, variety and year-round cropping. It’s a prompt for ideas, not a grade.</p></div>';
  const groups = [[3, 'Fix first'], [2, 'Worth doing'], [1, 'Nice to have'], [0, 'Good to know']];
  const fHtml = groups.map(([s, label]) => {
    const list = an.findings.filter(f => f.sev === s); if (!list.length) return '';
    return '<h3>' + label + ' <em>(' + list.length + ')</em></h3><div class="finds">' + list.map(findCard).join('') + '</div>';
  }).join('') || (S.entries.length ? '<div class="empty"><h3>Nothing to fix</h3><p>Nothing in the plan stands out. Look at the plants worth adding below, or the Techniques tab for ideas.</p></div>' : '');
  const good = an.good.filter((g, i, a) => g.plain ? a.findIndex(x => x.plain === g.plain) === i : true);
  const gpairs = good.filter(g => g.p), gshade = good.filter(g => g.shade), gplain = good.filter(g => g.plain);
  const seenP = {}, gp = gpairs.filter(g => { const k = g.ca.id + '|' + g.cb.id; if (seenP[k]) return false; seenP[k] = 1; return true; }).slice(0, 6);
  const gHtml = (gp.length || gplain.length || gshade.length) ? '<h3>What’s already working</h3><ul class="goods">' +
    gp.map(g => '<li><span class="ck">✓</span> <b>' + esc(g.ca.n) + '</b> next to <b>' + esc(g.cb.n) + '</b>: ' + esc(g.p.why) + ' ' + evBadge(g.p.ev) + '</li>').join('') +
    gshade.slice(0, 2).map(g => '<li><span class="ck">✓</span> <b>' + esc(g.short.n) + '</b> in the shade of ' + esc(g.tall.n.toLowerCase()) + ': summer shade keeps leafy crops sweeter and slower to bolt.</li>').join('') +
    gplain.map(g => '<li><span class="ck">✓</span> ' + esc(g.plain) + '</li>').join('') + '</ul>' : '';
  const smart = '<label class="chk smart"><input type="checkbox" data-bind="smart" ' + (S.smart ? 'checked' : '') + '> <span><b>Smart layout:</b> arrange plants by companions and sun, with tall crops on the south side <em>(recommended; plants that can’t be placed this way fall back to the simple layout)</em></span></label>';
  const sug = suggestCrops(R, S, an);
  const sHtml = '<h3 id="adv-sug">Plants worth adding</h3>' + (sug.length ? '<p class="muted">Ranked by whether they can be planted soon in your spaces, whether they suit what you already grow, the gaps in your harvest and your goals.</p><div class="cards sugs">' + sug.slice(0, 8).map(sugCard).join('') + '</div>' : '<p class="muted">No good matches right now: add a bed or some space, or check back when the season changes.</p>');
  return '<p class="muted">Suggestions for your layout, plant choices and soil, checked against how plants really behave together. Each one says why. Fix what you like, or hide anything that doesn’t apply.</p>' +
    smart + scoreHtml + fHtml + gHtml + sHtml +
    (dis ? '<p class="hint"><button type="button" class="lnk" data-act="advrestore">Show the ' + plural(dis, 'tip') + ' I hid</button></p>' : '');
}
function findCard(f){
  const fix = f.fix ? '<button type="button" class="btn' + (f.fix.act === 'advdismiss' ? '' : ' primary') + '" data-act="' + f.fix.act + '"' + Object.keys(f.fix).filter(k => k !== 'label' && k !== 'act').map(k => ' data-' + k + '="' + esc(f.fix[k]) + '"').join('') + '>' + esc(f.fix.label) + '</button>' : '';
  const tech = f.tech ? '<button type="button" class="btn" data-act="advtech" data-id="' + f.tech + '">How to</button>' : '';
  return '<article class="find s' + f.sev + '"><div class="find-h"><span class="cat">' + esc(f.cat) + '</span><h4>' + esc(f.title) + '</h4><button type="button" class="btn ic x" data-act="advdismiss" data-id="' + esc(f.id) + '" aria-label="Hide this tip" title="Hide this tip">×</button></div>' +
    '<p>' + esc(f.body) + '</p>' + (f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '') + '<div class="row wrap">' + fix + tech + evBadge(f.ev) + '</div></article>';
}
function sugCard(s){
  const c = s.c, z = s.zone, when = s.startIn <= 0 ? 'Plant now' : s.startIn <= 30 ? 'From ' + fmtT(s.start) : 'From ' + fmtT(s.start);
  return '<div class="card sug"><div class="card-h"><h4>' + cropLink(c) + '</h4><span class="tag ' + (s.startIn <= 30 ? 'good' : '') + '">' + esc(when) + '</span></div>' +
    '<ul class="why">' + s.why.map(w => '<li>' + esc(cap(w)) + '</li>').join('') + '</ul><p class="hint">Best in ' + esc(z.name) + '. ' + (c.tip ? esc(c.tip.split('. ')[0].replace(/\.$/, '')) + '.' : '') + '</p>' +
    '<div class="row wrap"><button type="button" class="btn primary" data-act="advadd" data-crop="' + c.id + '" data-zone="' + z.id + '">Add to my plan</button><button type="button" class="btn" data-act="advguide" data-crop="' + c.id + '">Grow guide</button></div></div>';
}
ACT.advadd = el => {
  const c = CROP_BY_ID[el.dataset.crop]; if (!c) return;
  const zr = R.plan.zones.find(q => q.z.id === el.dataset.zone);
  S.entries.push({ id: uid('e'), crop: c.id, qty: suggestQty(c, zr), zone: zr ? zr.z.id : 'auto', how: 'auto', name: '' });
  update();
};
ACT.advmove = el => { const e = S.entries.find(x => x.id === el.dataset.ent); if (e){ e.zone = el.dataset.zone; update(); } };
ACT.advsmart = () => { S.smart = true; update(); };
BIND.smart = (el, v) => { S.smart = !!v; update(); };
ACT.advdismiss = el => { S.adv.dismissed[el.dataset.id] = 1; update(); };
ACT.advrestore = () => { S.adv.dismissed = {}; update(); };
ACT.advtech = el => { ADVUI.openTech = el.dataset.id; ADVUI.techCat = ''; S.adv.sec = 'techniques'; renderResults(); saveState(); const t = document.getElementById('tech-' + el.dataset.id); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' }); };
ACT.advguide = el => { ADVUI.guide = el.dataset.crop; S.adv.sec = 'guide'; renderResults(); saveState(); window.scrollTo({ top: Math.max(0, ($('#results') || document.body).getBoundingClientRect().top + window.scrollY - navOffset()) }); };

/* small helpers shared by the sections below */
function cropOptions(cur){
  const mine = Array.from(new Set(S.entries.map(e => e.crop))).map(id => CROP_BY_ID[id]).filter(Boolean);
  const opt = c => '<option value="' + esc(c.id) + '"' + (c.id === cur ? ' selected' : '') + '>' + esc(c.n) + '</option>';
  let h = mine.length ? '<optgroup label="In your plan">' + mine.map(opt).join('') + '</optgroup>' : '';
  Object.keys(GROUPS).forEach(g => {
    const l = CROPS.filter(c => c.g === g).sort((a, b) => a.n.localeCompare(b.n));
    if (l.length) h += '<optgroup label="' + esc(GROUPS[g].name) + '">' + l.map(opt).join('') + '</optgroup>';
  });
  return h;
}
const inPlan = id => S.entries.some(e => e.crop === id);
const bestRel = list => list.slice().sort((x, y) => (EV_W[y.ev] * y.sev) - (EV_W[x.ev] * x.sev))[0];

/* a pairing and the plants it applies to: plants already in the plan are bold */
function groupRow(g){
  const names = g.cs.map(x => inPlan(x.id) ? '<b>' + esc(x.n) + '</b>' : esc(x.n));
  return '<li>' + (names.length > 8 ? names.slice(0, 8).join(', ') + ' and ' + (names.length - 8) + ' more' : joinC(names)) + ' ' + evBadge(g.p.ev) + '<br><span class="muted">' + esc(g.p.why) + '</span></li>';
}
/* =============== COMPANIONS =============== */
function secCompanions(){
  const an = advAn();
  const legend = ['sci', 'prac', 'mixed', 'trad'].map(k => '<li>' + evBadge(k) + ' <span>' + esc(EV_HINT[k]) + '</span></li>').join('');
  /* pairs in the plan that are close together at the same time */
  const seen = {}, rows = [];
  an.nb.forEach(n => {
    const p = bestRel(n.rel), k = n.ca.id + '|' + n.cb.id + '|' + p.rel;
    if (seen[k]) return; seen[k] = 1;
    rows.push({ n, p, near: n.near });
  });
  const line = r => '<li><b>' + esc(r.n.ca.n) + '</b> and <b>' + esc(r.n.cb.n) + '</b>' + (r.n.same ? ' <span class="muted">· in ' + esc(zoneName(r.n.a.zoneId)) + '</span>' : ' <span class="muted">· in ' + esc(zoneName(r.n.a.zoneId)) + ' and ' + esc(zoneName(r.n.b.zoneId)) + '</span>') + '<br><span class="muted">' + esc(r.p.why) + '</span> ' + evBadge(r.p.ev) + '</li>';
  const good = rows.filter(r => r.p.rel === '+' && r.near), bad = rows.filter(r => r.p.rel === '-' && r.near), care = rows.filter(r => r.p.rel === '~' && r.near);
  const apart = rows.filter(r => r.p.rel === '-' && !r.near);
  const mineHtml = rows.length ? (
    (good.length ? '<h4>Helping each other</h4><ul class="pairs good">' + good.map(line).join('') + '</ul>' : '') +
    (bad.length ? '<h4>Too close together</h4><ul class="pairs bad">' + bad.map(line).join('') + '</ul>' : '') +
    (care.length ? '<h4>Worth a little care</h4><ul class="pairs care">' + care.map(line).join('') + '</ul>' : '') +
    (apart.length ? '<p class="hint">Already kept apart, which is what you want: ' + esc(cropNames(apart.map(r => r.n.ca.n + ' and ' + r.n.cb.n))) + '.</p>' : '')
  ) : '<p class="muted">' + (S.entries.length ? 'None of your plants have a known companion or clash with each other at the moment. Try the lookup below to find good partners for them.' : 'Add some plants and this shows which of them help or hinder each other.') + '</p>';
  /* the lookup */
  let id = ADVUI.comp; if (!CROP_BY_ID[id]) id = ADVUI.comp = (S.entries.find(e => CROP_BY_ID[e.crop]) || { crop: 'tomato' }).crop;
  const c = CROP_BY_ID[id] || CROPS[0], co = companionsOf(c);
  const list = (title, arr, cls, none) => '<div class="cl ' + cls + '"><h4>' + title + '</h4>' + (arr.length ? '<ul class="pairs">' + arr.slice(0, 10).map(groupRow).join('') + '</ul>' + (arr.length > 10 ? '<p class="hint">…and ' + (arr.length - 10) + ' more.</p>' : '') : '<p class="muted">' + none + '</p>') + '</div>';
  return '<p class="muted">Some plants really do help each other, some just share the space well, and a lot of the folklore isn’t backed by research. Each pairing below says which it is.</p>' +
    '<ul class="evlegend">' + legend + '</ul>' + '<p class="hint">Plants already in your plan are in bold.</p>' +
    '<h3>In your garden</h3>' + mineHtml +
    '<h3>Look up a plant</h3><label class="fld" for="compsel">Show the neighbours for</label><select id="compsel" data-bind="compsel">' + cropOptions(id) + '</select>' +
    '<div class="cols3">' + list('Grows well with', co.helps, 'good', 'No well-known partners in this list.') + list('Keep apart', co.avoid, 'bad', 'Nothing in this list needs to be kept away.') + list('Take some care', co.care, 'care', 'Nothing to add.') + '</div>' +
    '<p class="row wrap"><button type="button" class="btn" data-act="advguide" data-crop="' + esc(c.id) + '">Grow guide for ' + esc(c.n.toLowerCase()) + '</button> <button type="button" class="btn" data-act="advtech" data-id="guilds">How to use companion planting well</button></p>';
}
BIND.compsel = (el, v) => { ADVUI.comp = v; renderResults(); };

/* =============== PESTS =============== */
const PEST_KINDS = { insect: 'Insects', disease: 'Diseases', disorder: 'Growing problems', pest: 'Birds, animals and other pests' };
function pestTargets(p){
  if (p.hits.indexOf('*') >= 0) return 'many plants';
  const names = CROPS.filter(c => pestHits(p, c)).map(c => c.n.replace(/ —.*$/, '').toLowerCase());
  const t = p.hits.some(h => h.slice(0, 2) === 'T:') ? ['fruit trees'] : [];
  return joinC(names.slice(0, 4).concat(t)) + (names.length > 4 ? ' and more' : '');
}
function pestListHtml(){
  const q = ADVUI.pestQ.trim().toLowerCase(), kind = ADVUI.pestKind, all = ADVUI.showAllPests || !!q || !!kind;
  let list = pestWatch(R, S, all);
  if (kind) list = list.filter(w => w.p.kind === kind);
  if (q) list = list.filter(w => (w.p.n + ' ' + w.p.sym + ' ' + w.p.kind + ' ' + pestTargets(w.p)).toLowerCase().indexOf(q) >= 0);
  if (!list.length) return '<p class="muted">' + (all ? 'Nothing matches that.' : 'None of your plants have a known problem coming up. Tick “Show every pest and disease” to browse them all.') + '</p>';
  return '<div class="pests">' + list.map(w => pestCard(w)).join('') + '</div>';
}
function secPests(){
  const kinds = '<option value="">All kinds</option>' + Object.keys(PEST_KINDS).map(k => '<option value="' + k + '"' + (ADVUI.pestKind === k ? ' selected' : '') + '>' + PEST_KINDS[k] + '</option>').join('');
  return '<p class="muted">Pests and diseases that hit the plants in your garden, ordered by what’s likely now. “Likely now” means the season and this week’s weather both suit it. The advice puts prevention and low-toxicity control first.</p>' +
    '<div class="toolbar"><input id="pestq" type="search" placeholder="Search, e.g. aphids, tomato, mildew" value="' + esc(ADVUI.pestQ) + '" aria-label="Search pests and diseases"><select data-bind="pestkind" aria-label="Kind of problem">' + kinds + '</select>' +
    '<label class="chk"><input type="checkbox" data-bind="pestall" ' + (ADVUI.showAllPests ? 'checked' : '') + '> Show every pest and disease</label></div>' +
    '<div id="pestlist">' + pestListHtml() + '</div>' +
    '<p class="hint">If you find something you don’t recognise on a fruit tree or vegetable, especially if it spreads quickly, report it to the MPI Exotic Pest and Disease Hotline on 0800 80 99 66.</p>';
}
BIND.pestkind = (el, v) => { ADVUI.pestKind = v; renderResults(); };
BIND.pestall = (el, v) => { ADVUI.showAllPests = !!v; renderResults(); };
document.addEventListener('input', ev => {
  if (ev.target && ev.target.id === 'pestq'){ ADVUI.pestQ = ev.target.value; const box = document.getElementById('pestlist'); if (box) box.innerHTML = pestListHtml(); }
});

/* =============== TECHNIQUES =============== */
function techCard(t, why, withId){
  return '<details class="pest tech" data-tech="' + t.id + '"' + (withId ? ' id="tech-' + t.id + '"' : '') + (ADVUI.openTech === t.id ? ' open' : '') + '><summary><span class="pn">' + esc(t.n) + '</span> <span class="tag">' + esc(t.cat) + '</span>' + (why && why.length ? '<small class="muted">Suits you because ' + esc(joinC(why)) + '</small>' : '') + '</summary><div class="pbody">' +
    '<p>' + esc(t.sum) + '</p>' + (why && why.length ? '<p class="whynow"><b>Why it suits you:</b> ' + esc(cap(joinC(why))) + '.</p>' : '') +
    '<p><b>How to do it</b></p><ol class="notes">' + t.how.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>' +
    '<p><b>Works best for:</b> ' + esc(t.best) + '</p><p><b>Watch out for:</b> ' + esc(t.watch) + '</p></div></details>';
}
function secTech(){
  const fit = techniqueFit(R, S), strong = fit.filter(x => x.score >= 2), top = strong.filter(x => x.site).slice(0, 5).concat(strong.filter(x => !x.site).slice(0, 4));
  const cats = Array.from(new Set(TECHS.map(t => t.cat)));
  const chips = '<div class="gtabs" role="group" aria-label="Technique categories"><button type="button" class="gchip ' + (!ADVUI.techCat ? 'on' : '') + '" data-act="techcat" data-cat="">All</button>' + cats.map(k => '<button type="button" class="gchip ' + (ADVUI.techCat === k ? 'on' : '') + '" data-act="techcat" data-cat="' + esc(k) + '">' + esc(k) + '</button>').join('') + '</div>';
  const all = TECHS.filter(t => !ADVUI.techCat || t.cat === ADVUI.techCat);
  return '<p class="muted">Ways of gardening that could suit your site, climate and plants. The first few are picked for you using your garden profile: soil, wind, glasshouse or pots, and this season’s forecast.</p>' +
    (top.length ? '<h3>Suggested for you</h3><div class="pests">' + top.map(x => techCard(x.t, x.why, false)).join('') + '</div>' : '<p class="callout">Fill in “My garden” (soil, wind, goals) and this list is tailored to you. <button type="button" class="lnk" data-act="advsec" data-sec="profile">Do it now</button></p>') +
    '<h3>All techniques</h3>' + chips + '<div class="pests">' + all.map(t => techCard(t, null, true)).join('') + '</div>';
}
ACT.techcat = el => { ADVUI.techCat = el.dataset.cat; renderResults(); };
document.addEventListener('toggle', ev => { const d = ev.target; if (d && d.classList && d.classList.contains('tech')){ if (d.open) ADVUI.openTech = d.dataset.tech; else if (ADVUI.openTech === d.dataset.tech) ADVUI.openTech = null; } }, true);

/* =============== CROP GUIDE =============== */
function guideWindows(c){
  const seen = {}, out = [];
  R.plan.zones.forEach(zr => {
    const z = zr.z; if (z.type !== 'bed' && z.type !== 'pots') return;
    const ctx = zoneCtx(z), key = 'sug|' + c.id + '|' + (z.cover || 'open') + '|' + (z.light || 'sun');
    if (seen[key]){ seen[key].zones.push(z.name); return; }
    const ec = effCrop(c, {});
    const pls = R.cache[key] || (R.cache[key] = planCrop(R.C, ec, { succ: S.succ, hor: S.hor, key, ctx }));
    const o = { zones: [z.name], zoneId: z.id, z, pls, ec, why: pls.length ? null : whyNot(R.C, ec, { hor: S.hor, ctx }) };
    seen[key] = o; out.push(o);
  });
  return out;
}
const DIF_TXT = ['', 'Easy', 'Moderate', 'Fussy'], WATER_TXT = ['', 'Low water needs', 'Moderate water needs', 'Thirsty'], SUP_TXT = { stake: 'Stake or tie to a support', cage: 'Grow in a cage', trellis: 'Grow up a trellis or netting' };
function secGuide(){
  let id = ADVUI.guide; if (!CROP_BY_ID[id]) id = ADVUI.guide = (S.entries.find(e => CROP_BY_ID[e.crop]) || { crop: 'tomato' }).crop;
  const c = CROP_BY_ID[id] || CROPS[0], f = BOT[famOf(c)], g = GUIDE[c.id] || GUIDE_GROUP[c.g] || {}, co = companionsOf(c);
  const wins = guideWindows(c);
  const fact = (k, v) => v ? '<div class="fact"><dt>' + k + '</dt><dd>' + esc(v) + '</dd></div>' : '';
  const facts = '<dl class="facts">' +
    fact('Kind', GROUPS[c.g].name + (c.perennial ? ' · comes back each year' : '')) + fact('Difficulty', DIF_TXT[c.dif] || '') +
    fact('Height', c.hcm ? 'about ' + c.hcm + ' cm' : '') + fact('Spacing', c.sp || '') + fact('Support', SUP_TXT[c.sup] || '') +
    fact('Light', ['Full sun', 'Sun or part shade', 'Copes with shade'][c.lt || 0]) + fact('Water', WATER_TXT[c.water] || '') +
    fact('Climate', c.warm ? 'Warm-season plant: wait until the soil is at least ' + c.minSoil + ' °C' : 'Cool-season plant: hardy, and bolts or struggles in hot weather') +
    fact('Time to harvest', c.d && c.kg > 0 ? 'about ' + c.d + ' days' + (c.kind === 'seedling' ? ' from planting out' : ' from sowing') + ' in warm weather' : '') +
    fact('Plant family', f ? f.short + (f.rest ? ' · leave ' + f.rest + ' year' + (f.rest === 1 ? '' : 's') + ' before it goes back in the same bed' : '') : '') + '</dl>';
  const winHtml = wins.length ? wins.map(o => {
    const head = '<h5>' + esc(joinC(o.zones)) + ' <small class="muted">' + esc(tagText(o.z)) + '</small></h5>';
    if (!o.pls.length) return head + '<p class="muted">No planting window: ' + esc(o.why ? o.why.text : 'nothing suits this space and season') + '.</p>';
    return head + '<ul class="agenda">' + o.pls.slice(0, 3).map((pl, i) => {
      const ec = o.ec, sow = ec.nur > 0 ? pl.p - ec.nur * 7 : null, bits = [];
      if (sow != null) bits.push((ec.how === 'buy' || sow < OFF ? 'buy seedlings <b>' + fmtT(Math.max(OFF, pl.p - 7)) : 'sow in trays <b>' + fmtT(sow)) + '</b>');
      bits.push((ec.kind === 'direct' ? 'sow direct' : ec.kind === 'tuber' || ec.kind === 'clove' || ec.kind === 'bulb' ? 'plant' : 'plant out') + ' <b>' + fmtT(pl.p) + '</b>');
      if (c.kg > 0) bits.push((c.g === 'flow' ? 'first blooms' : 'first harvest') + ' <b>' + fmtT(pl.m) + '</b>');
      return '<li><span class="wintx">' + (o.pls.length > 1 ? '<em>Round ' + (i + 1) + ':</em> ' : '') + bits.join(' → ') + (pl.status === 'caution' ? ' <span class="tag warn">hot-spell risk at harvest</span>' : '') + '</span></li>';
    }).join('') + '</ul>';
  }).join('') : '<p class="muted">Add a bed or pots on the Site plan tab to see when this plant can go in.</p>';
  const nice = arr => arr.length ? '<ul class="pairs">' + arr.slice(0, 8).map(groupRow).join('') + '</ul>' : '<p class="muted">Nothing specific.</p>';
  const pests = PESTS.filter(p => pestHits(p, c) && p.hits.indexOf('*') < 0);
  const pestHtml = pests.length ? '<ul class="notes">' + pests.map(p => '<li><b>' + esc(p.n) + '</b> <span class="muted">' + esc(monthSpan(p.mo)) + '</span> <button type="button" class="lnk" data-act="advpest" data-pest="' + p.id + '">Details</button></li>').join('') + '</ul>' : '<p class="muted">No crop-specific pests are listed. General ones (slugs, aphids, caterpillars) can visit anything.</p>';
  const add = inPlan(c.id) ? '<span class="tag good">In your plan</span>' : (() => { const w = wins.find(o => o.pls.length); return w ? '<button type="button" class="btn primary" data-act="advadd" data-crop="' + c.id + '" data-zone="' + w.zoneId + '">Add to my plan</button>' : ''; })();
  return '<p class="muted">Everything about one plant in one place, worked out for your spaces and this season’s weather.</p>' +
    '<label class="fld" for="guidesel">Plant</label><select id="guidesel" data-bind="guidesel">' + cropOptions(c.id) + '</select>' +
    '<div class="card cguide"><div class="card-h"><h3>' + cropLink(c) + '</h3><span class="row">' + add + '<button type="button" class="btn" data-act="enotes" data-crop="' + c.id + '">My notes</button></span></div>' +
    (c.tip ? '<p>' + esc(c.tip) + '</p>' : '') + facts +
    '<h4>When to grow it here</h4>' + winHtml +
    '<h4>Picking, storing and saving seed</h4><ul class="notes">' + (g.h ? '<li><b>Picking:</b> ' + esc(g.h) + '</li>' : '') + (g.s ? '<li><b>Storing:</b> ' + esc(g.s) + '</li>' : '') + (g.sd ? '<li><b>Seed saving:</b> ' + esc(g.sd) + '</li>' : '') + '</ul>' +
    '<div class="cols3"><div class="cl good"><h4>Grows well with</h4>' + nice(co.helps) + '</div><div class="cl bad"><h4>Keep apart</h4>' + nice(co.avoid) + '</div><div class="cl care"><h4>Take some care</h4>' + nice(co.care) + '</div></div>' +
    '<h4>Pests and diseases to watch for</h4>' + pestHtml + '</div>';
}
BIND.guidesel = (el, v) => { ADVUI.guide = v; renderResults(); };
ACT.advpest = el => { ADVUI.openPest = el.dataset.pest; ADVUI.pestQ = ''; ADVUI.pestKind = ''; ADVUI.showAllPests = true; S.adv.sec = 'pests'; renderResults(); saveState(); const t = document.querySelector('[data-pest="' + el.dataset.pest + '"]'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' }); };

/* =============== ROTATION =============== */
const ROT_FAMS = ['solanum', 'brassica', 'cucurbit', 'allium', 'umbel', 'beet', 'legume', 'grass', 'daisy', 'rose', 'morning'];
function bedFamilies(zr, year){
  const out = {};
  zr.items.forEach(it => {
    if (it.x == null) return; const c = CROP_BY_ID[it.cropId]; if (!c || c.perennial || isCover(c)) return;
    if (year != null && seasonYear(it.p) !== year) return;
    const f = famOf(c), fam = BOT[f]; if (!fam || fam.rest < 1) return;
    (out[f] || (out[f] = [])).push(c.n);
  });
  return out;
}
function nextAdvice(fams){
  const ks = Object.keys(fams); if (!ks.length) return '';
  const heavy = Math.max.apply(null, ks.map(k => BOT[k].heavy));
  if (heavy >= 3) return 'These are hungry crops. Follow them with peas or beans, or a green manure, to put nitrogen back, and then with roots or onions, which don’t like fresh feed.';
  if (ks.length === 1 && ks[0] === 'legume') return 'Legumes leave nitrogen in the soil. Follow them with a hungry crop: brassicas, corn, pumpkins or tomatoes.';
  return 'A gentle crop load. Follow with legumes to build up the soil, or with leafy crops. Save the hungriest crops (tomatoes, pumpkins, brassicas) for after a legume.';
}
function secRotation(){
  const cy = seasonYear(OFF), beds = R.plan.zones.filter(zr => zr.packer.kind === 'bed');
  if (!beds.length) return '<div class="empty"><h3>No garden beds yet</h3><p>Rotation is about moving plant families around your beds. Add a bed on the Site plan tab first. In pots, refresh at least half the mix between crops instead.</p></div>';
  const hint = '<p class="muted">Growing the same plant family in the same place year after year lets its diseases and pests build up and drains the same nutrients. Tell me what grew in each bed before this season and the planner warns you when the plan repeats it.</p>';
  const cards = beds.map(zr => {
    const z = zr.z, hist = z.hist || {}, now = bedFamilies(zr, cy), later = bedFamilies(zr, cy + 1);
    const nowTxt = Object.keys(now).length ? Object.keys(now).map(k => '<b>' + esc(BOT[k].short) + '</b> <span class="muted">(' + esc(cropNames(now[k])) + ')</span>').join(', ') : '<span class="muted">nothing planned</span>';
    const laterTxt = Object.keys(later).length ? Object.keys(later).map(k => '<b>' + esc(BOT[k].short) + '</b>').join(', ') : '';
    /* when each family may return */
    const block = {};
    Object.keys(now).forEach(k => { if (BOT[k].rest > 0) block[k] = Math.max(block[k] || 0, cy + BOT[k].rest); });
    ROT_FAMS.forEach(k => { if (hist[k] != null && BOT[k].rest > 0) block[k] = Math.max(block[k] || 0, hist[k] + BOT[k].rest); });
    const wait = Object.keys(block).filter(k => block[k] > cy + 1).sort((a, b) => block[a] - block[b]);
    const waitTxt = wait.length ? '<ul class="notes">' + wait.map(k => '<li><b>' + esc(BOT[k].short) + '</b>: not before ' + seasonLabel(block[k]) + '</li>').join('') + '</ul>' : '<p class="muted">Every family is fine here next season.</p>';
    const yrs = [cy - 1, cy - 2, cy - 3];
    const sel = k => '<label class="rh"><span>' + esc(BOT[k].short) + '</span><select data-bind="hist" data-zone="' + z.id + '" data-fam="' + k + '" aria-label="When ' + esc(BOT[k].short) + ' last grew in ' + esc(z.name) + '"><option value="">Not sure or not grown</option>' +
      yrs.concat(hist[k] != null && yrs.indexOf(hist[k]) < 0 && hist[k] < cy ? [hist[k]] : []).sort((a, b) => b - a).map(y => '<option value="' + y + '"' + (hist[k] === y ? ' selected' : '') + '>' + seasonLabel(y) + (y === cy - 1 ? ' (last season)' : '') + '</option>').join('') + '</select></label>';
    return '<div class="card rot"><div class="card-h"><h4>' + esc(z.name) + '</h4><span class="tag">' + esc(tagText(z)) + '</span></div>' +
      '<p><b>This season (' + seasonLabel(cy) + '):</b> ' + nowTxt + '</p>' + (laterTxt ? '<p><b>Next season in the plan:</b> ' + laterTxt + '</p>' : '') +
      (Object.keys(now).length ? '<p>' + esc(nextAdvice(now)) + '</p>' : '') +
      '<h5>When can each family come back?</h5>' + waitTxt +
      '<details class="fold"><summary>What grew here before this season?</summary><div class="rgrid">' + ROT_FAMS.map(sel).join('') + '</div><p class="hint">Pick the last season each family grew in this bed. Leave blank if you’re not sure, or it was longer ago than that.</p></details></div>';
  }).join('');
  return hint + '<div class="cards">' + cards + '</div><p class="hint"><button type="button" class="lnk" data-act="advtech" data-id="rotation">How to plan a rotation</button> · Seasons run from July to June, so a crop planted in December ' + cy + ' is in the ' + seasonLabel(cy) + ' season.</p>';
}
BIND.hist = (el, v) => {
  const z = S.zones.find(x => x.id === el.dataset.zone); if (!z) return;
  z.hist = z.hist || {}; if (v === '') delete z.hist[el.dataset.fam]; else z.hist[el.dataset.fam] = +v;
  update();
};

/* =============== SEASON REVIEW =============== */
const HV_UNITS = ['kg', 'items', 'bunches', 'stems', 'blooms'];
function logSubject(l){
  if (l.tree){ const t = S.trees.find(x => x.id === l.tree), p = t && PERENNIAL_BY_ID[t.type]; return t ? (t.label || (p ? p.n : 'Tree')) : 'Tree (removed)'; }
  const c = CROP_BY_ID[l.crop]; return c ? c.n : (l.crop || 'Plant');
}
/* one line of the care history for harvest and problem entries */
function logLine(l){
  if (l.k === 'harvest') return logSubject(l) + ': ' + l.qty + ' ' + l.unit;
  if (l.k === 'issue'){ const p = PESTS.find(x => x.id === l.pest); return (p ? p.n : (l.what || 'Problem')) + (l.crop ? ' on ' + logSubject(l).toLowerCase() : '') + (p && l.what ? ' — ' + l.what : ''); }
  return '';
}
const fmtQty = q => (Math.round(q * 10) / 10).toString();
function secReview(){
  const log = S.care.log, now = seasonOf(todayIso());
  const hv = log.filter(l => l.k === 'harvest'), iss = log.filter(l => l.k === 'issue');
  const seasons = Array.from(new Set(hv.concat(iss).map(l => seasonOf(l.d)))); if (seasons.indexOf(now) < 0) seasons.push(now);
  seasons.sort().reverse();
  const cur = ADVUI.hv && (CROP_BY_ID[ADVUI.hv] || ADVUI.hv.slice(0, 5) === 'tree:') ? ADVUI.hv : (S.entries.find(e => CROP_BY_ID[e.crop]) || {}).crop || 'tomato';
  const c0 = CROP_BY_ID[cur], defUnit = c0 && (c0.u === 'stems' || c0.u === 'blooms') ? c0.u : 'kg';
  const treeOpts = S.trees.length ? '<optgroup label="Trees and vines">' + S.trees.map(t => { const p = PERENNIAL_BY_ID[t.type]; return '<option value="tree:' + t.id + '"' + (cur === 'tree:' + t.id ? ' selected' : '') + '>' + esc(t.label || (p ? p.n : 'Tree')) + '</option>'; }).join('') + '</optgroup>' : '';
  const form = '<div class="logform"><label class="fld" for="hvw">What did you pick?</label><select id="hvw" data-bind="hvsel">' + cropOptions(cur) + treeOpts + '</select>' +
    '<div class="grid2"><div><label class="fld" for="hvq">How much</label><input id="hvq" type="number" min="0" step="0.1" placeholder="e.g. 2.5" inputmode="decimal"></div><div><label class="fld" for="hvu">Unit</label><select id="hvu">' + HV_UNITS.map(u => '<option' + (u === defUnit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></div></div>' +
    '<label class="fld" for="hvd">Date</label><input id="hvd" type="date" value="' + todayIso() + '"><div class="row" style="margin-top:.8rem"><button type="button" class="btn primary" data-act="hvadd">Add to harvest log</button></div></div>';
  const cards = seasons.slice(0, 4).map(sn => {
    const h = hv.filter(l => seasonOf(l.d) === sn), is = iss.filter(l => seasonOf(l.d) === sn).sort((a, b) => b.d.localeCompare(a.d));
    const by = {}; let kg = 0;
    h.forEach(l => { const k = logSubject(l); const o = by[k] || (by[k] = {}); o[l.unit] = (o[l.unit] || 0) + (+l.qty || 0); if (l.unit === 'kg') kg += +l.qty || 0; });
    const rows = Object.keys(by).sort().map(k => '<tr><td>' + esc(k) + '</td><td>' + Object.keys(by[k]).map(u => fmtQty(by[k][u]) + ' ' + u).join(' + ') + '</td></tr>').join('');
    const hh = h.length ? '<div class="scrollx"><table class="t"><thead><tr><th>Plant</th><th>Picked</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + (kg ? '<p class="hint">About <b>' + fmtQty(kg) + ' kg</b> picked in total.</p>' : '') : '<p class="muted">No harvests logged' + (sn === now ? ' yet' : '') + '.</p>';
    const ii = is.length ? '<ul class="hist">' + is.map(l => '<li><span class="dt">' + fmtT(tOfIso(l.d)) + '</span><span>' + esc(logLine(l)) + '</span><button type="button" class="btn ic x" data-act="logDel" data-id="' + l.id + '" aria-label="Delete this entry">×</button></li>').join('') + '</ul>' : '<p class="muted">No problems logged' + (sn === now ? ' yet' : '') + '.</p>';
    return '<div class="card"><div class="card-h"><h4>' + sn + (sn === now ? ' <span class="tag good">this season</span>' : '') + '</h4></div><h5>Harvest</h5>' + hh + '<h5>Problems you’ve had</h5>' + ii + '</div>';
  }).join('');
  /* things you told yourself to try, from earlier seasons */
  const todo = []; Object.keys(S.notes).forEach(s => S.notes[s].forEach(n => { if ((n.tag === 'todo' || n.tag === 'problem') && seasonOf(n.d) !== now) todo.push({ s, n }); }));
  todo.sort((a, b) => b.n.d.localeCompare(a.n.d));
  const tHtml = todo.length ? '<h3>From your notes: try or avoid</h3><ul class="notes">' + todo.slice(0, 8).map(x => '<li><b>' + esc(subjectTitle(x.s)) + '</b> <span class="muted">(' + esc(seasonOf(x.n.d)) + ', ' + esc(NOTE_TAGS[x.n.tag]) + ')</span>: ' + esc(x.n.txt) + '</li>').join('') + '</ul>' : '';
  const pestOpts = '<option value="">Choose…</option>' + PESTS.slice().sort((a, b) => a.n.localeCompare(b.n)).map(p => '<option value="' + p.id + '">' + esc(p.n) + '</option>').join('') + '<option value="other">Something else</option>';
  const iform = '<div class="logform"><label class="fld" for="isp">What went wrong?</label><select id="isp">' + pestOpts + '</select>' +
    '<label class="fld" for="isc">On which plant? (optional)</label><select id="isc"><option value="">Not one plant</option>' + cropOptions('') + '</select>' +
    '<label class="fld" for="isn">Notes (optional)</label><input id="isn" type="text" maxlength="120" placeholder="e.g. lost half the crop, worst on the west side">' +
    '<label class="fld" for="isd">Date</label><input id="isd" type="date" value="' + todayIso() + '"><div class="row" style="margin-top:.8rem"><button type="button" class="btn" data-act="issueadd">Add to problem log</button></div></div>';
  return '<p class="muted">Keep a harvest and problem log through the year and it becomes a season review: what you grew, what it gave you and what to do differently. Problems you log also feed the pest watch.</p>' +
    '<h3>Log a harvest</h3>' + form + '<h3>By season</h3><div class="cards">' + cards + '</div>' + tHtml +
    '<details class="fold"><summary>Log a pest, disease or other problem</summary>' + iform + '</details>' +
    '<p><button type="button" class="lnk" data-act="advgo" data-tab="notes">Open my plant notes</button></p>';
}
BIND.hvsel = (el, v) => { ADVUI.hv = v; renderResults(); };
ACT.hvadd = () => {
  const w = $('#hvw').value, q = parseFloat($('#hvq').value), u = $('#hvu').value, d = $('#hvd').value || todayIso();
  if (!(q > 0)){ $('#hvq').focus(); return; }
  const l = newLog({ k: 'harvest', d, qty: Math.round(q * 100) / 100, unit: u });
  if (w.slice(0, 5) === 'tree:') l.tree = w.slice(5); else l.crop = w;
  S.care.log.push(l); update();
};
ACT.issueadd = () => {
  const p = $('#isp').value, c = $('#isc').value, n = $('#isn').value.trim(), d = $('#isd').value || todayIso();
  if (!p || (p === 'other' && !n)){ $('#isp').focus(); return; }
  const l = newLog({ k: 'issue', d }); if (p !== 'other') l.pest = p; if (c) l.crop = c; if (n) l.what = n;
  S.care.log.push(l); update();
};

/* =============== MY GARDEN (profile) =============== */
const SOILS = [['unknown', 'Not sure'], ['clay', 'Heavy clay'], ['loam', 'Loam or good garden soil'], ['sand', 'Sandy or free-draining']];
const EXPS = [['beginner', 'Just starting out'], ['some', 'Some experience'], ['expert', 'Experienced']];
function secProfile(){
  const P = S.profile, goals = P.goals || [];
  const sel = (f, list, v) => '<select id="pf-' + f + '" data-bind="pf" data-f="' + f + '">' + list.map(o => '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  const chips = Object.keys(GOAL_LABEL).map(g => '<button type="button" class="gchip ' + (goals.indexOf(g) >= 0 ? 'on' : '') + '" aria-pressed="' + (goals.indexOf(g) >= 0) + '" data-act="goal" data-g="' + g + '">' + esc(cap(GOAL_LABEL[g])) + '</button>').join('');
  return '<p class="muted">A few details so the advice fits you. They stay on this device with the rest of this garden, and you can change them at any time.</p>' +
    '<div class="profile"><label class="fld" for="pf-soil">Your soil</label>' + sel('soil', SOILS, P.soil || 'unknown') + '<small class="muted">Squeeze a damp handful: if it forms a sticky ribbon it’s clay, and if it falls apart it’s sand.</small>' +
    '<label class="fld" for="pf-wind">Wind</label>' + sel('wind', [['', 'Sheltered or average'], ['exposed', 'Exposed and often windy']], P.wind || '') +
    '<label class="fld" for="pf-exp">Gardening experience</label>' + sel('exp', EXPS, P.exp || 'some') +
    '<label class="fld">What matters most to you?</label><div class="gtabs goalchips" role="group" aria-label="Goals">' + chips + '</div>' +
    '<label class="chk"><input type="checkbox" data-bind="pf" data-f="organic" ' + (P.organic !== false ? 'checked' : '') + '> <span>Organic methods first <em class="muted">(the advice puts non-chemical control first)</em></span></label>' +
    '<label class="fld" for="pf-north">Which way is north on your site plan?</label><select id="pf-north" data-bind="north">' + [['up', 'At the top of the plan (default)'], ['right', 'On the right'], ['down', 'At the bottom'], ['left', 'On the left']].map(o => '<option value="' + o[0] + '"' + ((S.plan.north || 'up') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select><small class="muted">In New Zealand the sun is in the north. This tells the planner which side is sunny and where tall crops will cast shade.</small>' +
    '<label class="chk smart"><input type="checkbox" data-bind="smart" ' + (S.smart ? 'checked' : '') + '> <span><b>Smart layout</b> <em class="muted">(arrange plants by companions and sun)</em></span></label></div>' +
    '<details class="fold"><summary>How the advice works, and its limits</summary><ul class="notes">' +
    '<li>Companion pairs are graded. “Research-backed” means controlled trials found an effect, “practical” means there is a sound physical reason (shade, support, timing), “mixed evidence” means results differ between studies, and “traditional advice” means it is folklore with little research. Traditional pairs count for less in the scoring and are never presented as fact.</li>' +
    '<li>Pest and disease windows, monthly jobs and tree care are guides for New Zealand. They shift by a few weeks between the north and south and from year to year, so treat the months as a prompt to look, not a schedule.</li>' +
    '<li>Weather alerts use the live forecast when it loads. The health score is a rough check of light, companions, rotation, soil care, variety and year-round harvest. It doesn’t judge how good a garden is.</li>' +
    '<li>For local conditions such as soil tests, regional pests and council rules, a local garden centre or your regional council is the best source.</li></ul></details>';
}
ACT.goal = el => {
  const g = el.dataset.g, P = S.profile; P.goals = P.goals || [];
  const i = P.goals.indexOf(g); if (i >= 0) P.goals.splice(i, 1); else P.goals.push(g);
  P.done = true; update();
};
BIND.pf = (el, v) => { S.profile[el.dataset.f] = el.type === 'checkbox' ? !!v : v; S.profile.done = true; update(); };
BIND.north = (el, v) => { S.plan.north = v; update(); };

/* =============== CALENDAR EXPORT (.ics) =============== */
const ICS = { open: false, sow: true, plant: true, harvest: true, jobs: true };
function icsEvents(){
  const out = [];
  R.ev.forEach(e => {
    if (e.t < OFF || !ICS[e.kind]) return;
    const it = R.items.find(i => i.key === e.key), c = CROP_BY_ID[e.cropId];
    out.push({ t: e.t, uid: e.kind + '-' + e.key + '-' + e.t, title: cap(e.text), desc: [it ? 'Where: ' + zoneName(it.zoneId) : '', c && c.tip ? c.tip : ''].filter(Boolean).join('\n') });
  });
  if (ICS.jobs){
    const m0 = monthOfT(OFF);
    for (let i = 0; i < 6; i++){
      const m = (m0 - 1 + i) % 12 + 1, jobs = monthJobs(R, S, m); if (!jobs.length) continue;
      const first = i === 0 ? OFF : (() => { let t = OFF; while (monthOfT(t) !== m) t++; return t; })();
      out.push({ t: first, uid: 'jobs-' + m + '-' + first, title: 'Garden jobs for ' + MONTHS[m - 1], desc: jobs.map(j => '- ' + j.t).join('\n') });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsFold(line){
  const out = []; let s = line;
  while (s.length > 70){ out.push(s.slice(0, 70)); s = ' ' + s.slice(70); }
  out.push(s); return out.join('\r\n');
}
function buildIcs(){
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Total Garden Planner 4000//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(S.name + ' garden')];
  icsEvents().forEach(e => {
    const d0 = isoOfT(e.t).replace(/-/g, ''), d1 = isoOfT(e.t + 1).replace(/-/g, '');
    L.push('BEGIN:VEVENT', 'UID:' + e.uid.replace(/[^A-Za-z0-9|_-]/g, '') + '@garden-planner', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d0, 'DTEND;VALUE=DATE:' + d1, 'SUMMARY:' + icsEsc(e.title), 'TRANSP:TRANSPARENT');
    if (e.desc) L.push('DESCRIPTION:' + icsEsc(e.desc));
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n') + '\r\n';
}
function icsPanel(){
  if (!ICS.open) return '';
  const n = icsEvents().length;
  const box = (k, label) => '<label class="chk"><input type="checkbox" data-bind="icsopt" data-k="' + k + '" ' + (ICS[k] ? 'checked' : '') + '> ' + label + '</label>';
  return '<div class="card icspanel"><h4>Add your dates to a calendar</h4><p class="muted">Downloads a file that Google Calendar, Apple Calendar and Outlook can import. Every date becomes an all-day event with no reminders. It’s a snapshot, so download it again if your plan changes.</p>' +
    box('sow', 'Sowing seeds and buying seedlings') + box('plant', 'Planting out') + box('harvest', 'First harvest or bloom') + box('jobs', 'Monthly gardening jobs (the next six months)') +
    '<div class="row wrap" style="margin-top:.6rem"><button type="button" class="btn primary" data-act="icsdl"' + (n ? '' : ' disabled') + '>Download ' + plural(n, 'date') + '</button><button type="button" class="btn" data-act="icsopen">Close</button></div></div>';
}
ACT.icsopen = () => { ICS.open = !ICS.open; renderResults(); };
BIND.icsopt = (el, v) => { ICS[el.dataset.k] = !!v; renderResults(); };
ACT.icsdl = () => {
  const blob = new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = (S.name || 'garden').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() + '-garden.ics';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
};
