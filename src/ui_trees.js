/* ============================================================
   UI TREES — grapes, fruit trees, citrus, flowering shrubs: expected dates from the season's weather
   ============================================================ */
const treeDef = t => PERENNIAL_BY_ID[t.type];
const treeTitle = t => { const p = treeDef(t); return t.label || (p ? p.n : 'Tree'); };
const isBloomType = p => p && p.unit === 'bloom';
const thisYear = () => dateOfT(OFF).getUTCFullYear();

function treeSeason(pred){
  if (!pred || !pred.seasons.length) return null;
  return { cur: pred.seasons[0], next: pred.seasons[1] || null };
}
/* small timeline: numbered stage markers, the pick window, today, and the last frost; the stages are listed underneath */
function treeTimeline(s, p, tree){
  const W = 420, H = 84, ml = 10, mr = 10, ax = 42;
  const t0 = s.anchor, span = 365, x = t => ml + clamp((t - t0) / span, 0, 1) * (W - ml - mr);
  let g = '', lab = '';
  for (let t = t0; t < t0 + span; t++){ const d = dateOfT(t); if (d.getUTCDate() === 1){ g += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="18" y2="' + (ax + 14) + '" class="gl"/>'; lab += '<text x="' + (x(t) + 2) + '" y="' + (H - 4) + '" class="ax">' + MONTHS[d.getUTCMonth()] + '</text>'; } }
  const band = '<rect x="' + x(s.ripe) + '" y="' + (ax - 11) + '" width="' + Math.max(3, x(s.end) - x(s.ripe)) + '" height="22" rx="5" class="pwin"/>';
  const cs = COVER_SCALE[p.g] != null ? COVER_SCALE[p.g] : 0.5;
  const v = R.C.variant(tree.cover || 'open', tree.light || 'sun', cs), lf = nextDoy(R.C, t0, v.lsf);
  const frost = lf > t0 && lf < t0 + span ? '<line x1="' + x(lf) + '" x2="' + x(lf) + '" y1="16" y2="' + (ax + 14) + '" class="frl"/><text x="' + clamp(x(lf), 30, W - 30) + '" y="11" class="ax" text-anchor="middle">last frost</text>' : '';
  const todayL = OFF > t0 && OFF < t0 + span ? '<line x1="' + x(OFF) + '" x2="' + x(OFF) + '" y1="18" y2="' + (ax + 14) + '" class="tdl"/><text x="' + clamp(x(OFF), 14, W - 14) + '" y="' + (ax + 26) + '" class="ax" text-anchor="middle">today</text>' : '';
  const dots = s.st.map((t, i) => {
    const last = i === s.st.length - 1;
    return '<circle cx="' + x(t) + '" cy="' + ax + '" r="' + (last ? 7 : 6) + '" class="' + (last ? 'pdot last' : 'pdot') + '"/><text x="' + x(t) + '" y="' + (ax + 3.6) + '" class="pn" text-anchor="middle">' + (i + 1) + '</text>';
  }).join('');
  const list = '<ol class="stg">' + s.st.map((t, i) => '<li><b>' + (i + 1) + '</b> ' + esc(p.st[i][1]) + ' <span>' + esc(fmtT(t)) + '</span></li>').join('') + '</ol>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Timeline of stages for ' + esc(treeTitle(tree)) + '">' + g + lab + frost + band + todayL + dots + '</svg>' + list;
}
function treeCard(r){
  const t = r.tree, p = treeDef(t); if (!p) return '';
  const pred = r.pred, ss = treeSeason(pred), bloom = isBloomType(p), ripeWord = bloom ? 'Peak bloom' : p.g === 'vine' ? 'Harvest' : 'Ripe';
  const tags = tagText({ light: t.light || 'sun', cover: t.cover || 'open' });
  let head = '', body = '', warns = [];
  if (!ss || (pred && pred.never)){
    head = '<p class="tbig no">Not expected to ripen reliably here</p><p class="muted">' + (t.cover === 'glass' ? 'Even under glass there isn’t enough warmth in the plan window.' : 'There aren’t enough warm days in your climate for it to ripen outdoors' + (p.g === 'citrus' ? ' — citrus and figs do best in a warm, sheltered spot or a glasshouse. Set this plant’s cover to Glasshouse to see what a glasshouse would do.' : ' — try a warmer, sheltered spot (or set the cover to Glasshouse) or a variety suited to a cooler climate.') + '</p>');
  } else {
    const s = ss.cur, daysTo = s.ripe - OFF, n = s.normalRipe != null ? s.ripe - s.normalRipe : 0;
    const sig = Math.round(4 + clamp(daysTo / 30, 0, 9));
    const age = t.planted ? dateOfT(s.ripe).getUTCFullYear() - t.planted : null;
    const young = age != null && p.first && age < p.first;
    const whenTxt = fmtT(s.ripe, true) + ' – ' + fmtT(s.end);
    head = '<p class="tbig">' + esc(ripeWord) + ' ' + esc(fmtT(s.ripe)) + ' <span class="tsub">to ' + esc(fmtT(s.end)) + '</span></p>' +
      '<p class="muted">' + (daysTo >= 0 ? 'About ' + daysTo + ' days from now' : (s.end >= OFF ? 'Under way now' : 'Just finished')) + ' · give or take ' + sig + ' days' + (Math.abs(n) >= 2 ? ' · <b>' + Math.abs(n) + ' days ' + (n < 0 ? 'earlier' : 'later') + '</b> than a normal year (' + fmtT(s.normalRipe) + ')' : ' · about a normal year') + '</p>';
    if (young) warns.push('Young tree: planted ' + t.planted + ', so a real crop isn’t likely until about ' + (t.planted + p.first) + '. The dates show when it would ripen once mature.');
    if (s.marginal) warns.push('Slow to ripen in your climate: expect a late, smaller or less sweet crop, and pick a late-season variety if you’re choosing one.');
    if (s.frostGap) warns.push((bloom ? 'New growth' : p.g === 'vine' ? 'Bud burst' : 'Blossom') + ' usually arrives ' + s.frostGap + ' days before the last frost here — keep frost cloth ready' + (p.frost === 'blossom' ? ' (a frost during blossom can take the crop)' : '') + '.');
    if (p.frost === 'winter'){
      const v = R.C.variant(t.cover || 'open', t.light || 'sun', COVER_SCALE[p.g] != null ? COVER_SCALE[p.g] : 0.5);
      let mn = 99; for (let i = OFF; i < OFF + 365; i++) mn = Math.min(mn, v.air[i]);
      if (mn < 7) warns.push('Frost-tender: cold winter nights are likely here, so cover it or keep it somewhere sheltered.');
    }
    if (ss.next) body += '<p class="hint">Following season: ' + esc(ripeWord.toLowerCase()) + ' around ' + fmtT(ss.next.ripe) + ' ' + dateOfT(ss.next.ripe).getUTCFullYear() + '.</p>';
    body = '<div class="chart tl">' + treeTimeline(s, p, t) + '</div>' + body;
  }
  /* jobs this month and next */
  const mo = dateOfT(OFF).getUTCMonth() + 1, nx = mo % 12 + 1;
  const jobs = (PTASKS[p.g] || []).filter(j => j[0].indexOf(mo) >= 0 || j[0].indexOf(nx) >= 0);
  const jobsHtml = jobs.length ? '<div class="jobs"><h4>Jobs around now</h4><ul class="notes">' + jobs.map(j => '<li>' + (j[0].indexOf(mo) >= 0 ? '' : '<em>' + MONTHS[nx - 1] + ':</em> ') + esc(j[1]) + '</li>').join('') + '</ul></div>' : '';
  const calHtml = '<div class="calrow"><label class="fld" for="cal-' + t.id + '">In a typical year, ' + (bloom ? 'the peak bloom' : 'my first pick') + ' is around</label><div class="row"><input id="cal-' + t.id + '" type="date" data-bind="tcal" data-id="' + t.id + '">' + (t.cal ? '<button type="button" class="btn" data-act="tcalreset" data-id="' + t.id + '">Reset (' + (t.cal > 0 ? '+' : '') + t.cal + ' days)</button>' : '') + '</div><small class="muted">Optional: shifts these dates to match your own tree. The weather adjustment still applies on top.</small></div>';
  const settings = '<details class="fold"><summary>Settings for this plant</summary><div class="grid2">' +
    '<div><label class="fld">Name / variety</label><input type="text" maxlength="40" value="' + esc(t.label || '') + '" placeholder="' + esc(p.n) + '" data-bind="tprop" data-prop="label" data-id="' + t.id + '"></div>' +
    '<div><label class="fld">Year planted</label><input type="number" min="1900" max="2100" value="' + (t.planted || '') + '" data-bind="tprop" data-prop="planted" data-id="' + t.id + '"></div>' +
    '<div><label class="fld">Where it grows</label><select data-bind="tprop" data-prop="cover" data-id="' + t.id + '">' + Object.keys(COVER_LABEL).map(k => '<option value="' + k + '"' + ((t.cover || 'open') === k ? ' selected' : '') + '>' + COVER_LABEL[k] + '</option>').join('') + '</select></div>' +
    '<div><label class="fld">Light</label><select data-bind="tprop" data-prop="light" data-id="' + t.id + '">' + Object.keys(LIGHT_LABEL).map(k => '<option value="' + k + '"' + ((t.light || 'sun') === k ? ' selected' : '') + '>' + LIGHT_LABEL[k] + '</option>').join('') + '</select></div></div>' +
    '<div class="row" style="margin-top:.8rem"><button type="button" class="btn" data-act="treeplace" data-id="' + t.id + '">' + (t.x != null ? 'Move on the site plan' : 'Show on the site plan') + '</button>' + (t.x != null ? '<button type="button" class="btn" data-act="treeunplace" data-id="' + t.id + '">Hide from plan</button>' : '') + '</div></details>';
  return '<article class="tree card"><div class="card-h"><h3>' + esc(treeTitle(t)) + (t.count > 1 ? ' <em>× ' + t.count + '</em>' : '') + '</h3><button type="button" class="btn ic x" data-act="treedel" data-id="' + t.id + '" aria-label="Remove ' + esc(treeTitle(t)) + '">×</button></div>' +
    '<p class="hint">' + esc(PGROUPS[p.g].name) + ' · ' + esc(tags) + (p.yl ? ' · typical yield ' + esc(p.yl) : '') + '</p>' + head +
    warns.map(w => '<p class="warn">' + esc(w) + '</p>').join('') + body + jobsHtml + (p.tip ? '<p class="tiptxt">' + esc(p.tip) + '</p>' : '') + calHtml + settings +
    '<details class="fold" ' + ((S.notes['tree:' + t.id] || []).length ? 'open' : '') + '><summary>Notes for next year' + ((S.notes['tree:' + t.id] || []).length ? ' (' + S.notes['tree:' + t.id].length + ')' : '') + '</summary>' + notesBlock('tree:' + t.id) + '</details></article>';
}
function tabTrees(){
  const groups = Object.keys(PGROUPS);
  const opts = groups.map(g => '<optgroup label="' + esc(PGROUPS[g].name) + '">' + PERENNIALS.filter(p => p.g === g).map(p => '<option value="' + p.id + '">' + esc(p.n) + '</option>').join('') + '</optgroup>').join('');
  const cards = R.trees.map(treeCard).join('');
  return '<p class="muted">Grapes, fruit trees and flowering shrubs aren’t planted each season, so this tab just tells you <b>when to expect fruit or blooms</b>. It counts the warmth (growing degree-days) from 1 August, using this season’s real weather so far and the outlook for the rest, then adjusts the typical dates for your place. Treat the dates as a guide, give or take a week or two, and use the calibration box to match your own trees.</p>' +
    '<div class="addtree card"><h3>Add a tree, vine or shrub</h3><div class="grid3">' +
    '<div><label class="fld" for="tt-type">Which one</label><select id="tt-type">' + opts + '</select></div>' +
    '<div><label class="fld" for="tt-cover">Where it grows</label><select id="tt-cover">' + Object.keys(COVER_LABEL).map(k => '<option value="' + k + '">' + COVER_LABEL[k] + '</option>').join('') + '</select></div>' +
    '<div><label class="fld" for="tt-light">Light</label><select id="tt-light">' + Object.keys(LIGHT_LABEL).map(k => '<option value="' + k + '">' + LIGHT_LABEL[k] + '</option>').join('') + '</select></div>' +
    '<div><label class="fld" for="tt-label">Your name for it (optional)</label><input id="tt-label" type="text" maxlength="40" placeholder="e.g. Back-fence grape"></div>' +
    '<div><label class="fld" for="tt-year">Year planted (optional)</label><input id="tt-year" type="number" min="1900" max="2100" placeholder="e.g. 2021"></div>' +
    '<div><label class="fld" for="tt-count">How many</label><input id="tt-count" type="number" min="1" max="99" value="1"></div></div>' +
    '<div class="row" style="margin-top:.8rem"><button type="button" class="btn primary" data-act="treeadd">Add</button></div></div>' +
    (cards ? '<div class="cards trees">' + cards + '</div>' : '<div class="empty"><h3>No trees or vines yet</h3><p>Add your grape vine, apple, plum, lemon or roses above and this tab shows when to expect fruit or flowers.</p></div>') +
    '<p class="hint">Reference dates are typical for Christchurch (pome, stone fruit, grapes, flowers) and Auckland (citrus, feijoa), then shifted with your local climate. They’re approximations from general NZ growing guides, not measured for your exact trees.</p>';
}
function afterTrees(){
  R.trees.forEach(r => { const t = r.tree, el = document.getElementById('cal-' + t.id); if (!el || !r.pred || !r.pred.seasons.length) return;
    const s = r.pred.seasons[0]; el.value = t.calDate || isoOfT(s.normalRipe != null ? s.normalRipe : s.ripe); });
}
ACT.treeadd = () => {
  const type = $('#tt-type').value, p = PERENNIAL_BY_ID[type]; if (!p) return;
  const yr = parseInt($('#tt-year').value, 10);
  S.trees.push({ id: uid('t'), type, label: $('#tt-label').value.trim(), count: Math.max(1, parseInt($('#tt-count').value, 10) || 1), planted: yr > 1900 ? yr : null,
    cover: $('#tt-cover').value, light: $('#tt-light').value, cal: 0, x: null, y: null });
  update();
};
ACT.treedel = el => { const t = S.trees.find(x => x.id === el.dataset.id); if (t && confirm('Remove ' + treeTitle(t) + '? Its notes will be kept.')){ S.trees = S.trees.filter(x => x.id !== t.id); update(); } };
ACT.tcalreset = el => { const t = S.trees.find(x => x.id === el.dataset.id); if (t){ t.cal = 0; delete t.calDate; update(); } };
BIND.tprop = (el, v) => {
  const t = S.trees.find(x => x.id === el.dataset.id); if (!t) return; const k = el.dataset.prop;
  if (k === 'planted'){ const n = parseInt(v, 10); t.planted = n > 1900 ? n : null; }
  else if (k === 'count') t.count = Math.max(1, parseInt(v, 10) || 1);
  else t[k] = v;
  update();
};
BIND.tcal = (el, v) => {
  const t = S.trees.find(x => x.id === el.dataset.id); if (!t || !v) return;
  const typical = tOfIso(v);
  t.cal = 0; t.calDate = v;
  t.cal = calFromTypical(R.C, R.Cn, t, typical);
  update();
};
