/* ============================================================
   UI RENDER — sidebar, briefing, crops, results tabs, events
   ============================================================ */
const sw = c => '<i class="sw" style="background:var(--g' + GROUPS[c.g].slot + ')"></i>';
const round1 = x => Math.round(x * 10) / 10;
const signed = (x, u) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(round1(x)) + (u || '');
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

/* ---------------- sidebar (built once) ---------------- */
function renderSidebar(){
  const opts = ['North Island', 'South Island'].map(isl =>
    '<optgroup label="' + isl + '">' + REGIONS.filter(r => r.isl === isl).map(r => '<option value="' + r.id + '">' + esc(r.name) + '</option>').join('') + '</optgroup>').join('');
  $('#side').innerHTML = `
  <section class="panel">
    <h3>Where</h3>
    <label class="fld" for="region">Region</label>
    <select id="region" data-bind="region">${opts}</select>
    <div class="place">
      <label class="fld" for="placeQ">…or search any NZ town or suburb</label>
      <div class="row"><input id="placeQ" type="search" placeholder="e.g. Waiuku, Havelock North" autocomplete="off"><button class="btn" data-act="search" type="button">Search</button></div>
      <div id="placeRes" class="placeRes" role="listbox"></div>
    </div>
  </section>
  <section class="panel">
    <h3>Your space</h3>
    <div class="grid2">
      <div><label class="fld" for="len">Length (m)</label><input id="len" type="number" min="0.5" max="200" step="0.5" data-bind="len"></div>
      <div><label class="fld" for="wid">Width (m)</label><input id="wid" type="number" min="0.5" max="200" step="0.5" data-bind="wid"></div>
      <div><label class="fld" for="paths">Paths &amp; gaps (%)</label><input id="paths" type="number" min="0" max="60" step="5" data-bind="paths"></div>
      <div><label class="fld" for="bedW">Bed width (m)</label><input id="bedW" type="number" min="0.6" max="2.4" step="0.1" data-bind="bedW"></div>
    </div>
    <div class="presets"><button class="chip sm" data-act="size" data-l="2.4" data-w="1.2" type="button">One raised bed</button><button class="chip sm" data-act="size" data-l="4" data-w="3" type="button">Small patch</button><button class="chip sm" data-act="size" data-l="6" data-w="4" type="button">Backyard plot</button><button class="chip sm" data-act="size" data-l="10" data-w="6" type="button">Big garden</button></div>
    <p class="hint" id="areaOut"></p>
  </section>
  <section class="panel">
    <h3>Weather</h3>
    <label class="fld" for="outlook">Season outlook</label>
    <select id="outlook" data-bind="outlook">${Object.keys(OUTLOOK_PRESETS).map(k => '<option value="' + k + '">' + esc(OUTLOOK_PRESETS[k].label) + '</option>').join('')}</select>
    <label class="fld" for="tweak">Your own nudge: <b id="tweakOut"></b></label>
    <input id="tweak" type="range" min="-2" max="2" step="0.5" data-bind="tweak">
    <div class="scale"><span>cooler</span><span>as forecast</span><span>hotter</span></div>
    <label class="fld" for="rain">Rainfall</label>
    <select id="rain" data-bind="rain"><option value="auto">Follow the outlook</option><option value="dry">Dry season</option><option value="normal">Normal</option><option value="wet">Wet season</option></select>
    <label class="fld" for="soilNow">Soil temperature today, if you’ve measured it (°C)</label>
    <input id="soilNow" type="number" min="0" max="35" step="0.5" placeholder="e.g. 14" data-bind="soilNow">
    <label class="chk"><input id="useLive" type="checkbox" data-bind="useLive"> Use live forecast &amp; recent weather</label>
    <div id="status" class="status"></div>
  </section>
  <section class="panel">
    <h3>Growing setup</h3>
    <label class="fld" for="protect">Protection</label>
    <select id="protect" data-bind="protect">${Object.keys(PROTECTION).map(k => '<option value="' + k + '">' + esc(PROTECTION[k].label) + '</option>').join('')}</select>
    <label class="fld" for="hor">Plan length</label>
    <select id="hor" data-bind="hor"><option value="183">Next 6 months</option><option value="365">Next 12 months</option><option value="545">Next 18 months</option></select>
    <label class="chk"><input id="succ" type="checkbox" data-bind="succ"> Squeeze in follow-on rounds when the season allows</label>
  </section>`;
  syncSidebar();
}
function syncSidebar(){
  const set = (id, v) => { const el = $('#' + id); if (el && document.activeElement !== el) el.value = v; };
  ['len','wid','paths','bedW','outlook','tweak','rain','soilNow','protect','hor'].forEach(k => set(k, S[k]));
  $('#useLive').checked = !!S.useLive; $('#succ').checked = !!S.succ;
  /* region select: show searched place as first option when active */
  const sel = $('#region');
  const old = sel.querySelector('option[value="__place"]'); if (old) old.remove();
  if (S.place){
    const o = document.createElement('option'); o.value = '__place'; o.textContent = 'Searched: ' + S.place.name + (S.place.admin ? ', ' + S.place.admin : '');
    sel.insertBefore(o, sel.firstChild); sel.value = '__place';
  } else sel.value = S.region;
  $('#tweakOut').textContent = S.tweak === 0 ? 'none' : signed(S.tweak, ' °C');
}

function renderStatus(){
  const el = $('#status'); if (!el) return;
  const row = (label, st) => {
    const cls = st.s === 'ok' ? 'ok' : st.s === 'loading' ? 'load' : st.s === 'error' ? 'err' : 'off';
    const word = st.s === 'ok' ? (label === 'Seasonal outlook' ? 'Updated' : 'Live') : st.s === 'loading' ? 'Loading…' : st.s === 'error' ? 'Offline' : st.s === 'builtin' ? 'Built-in' : '—';
    return '<li><span class="dot ' + cls + '"></span><span><b>' + label + ':</b> ' + word + (st.msg ? ' <em>' + esc(st.msg) + '</em>' : '') + '</span></li>';
  };
  el.innerHTML = '<details><summary>Data sources</summary><ul>' + row('Forecast &amp; soil', LIVE.st.fc) + row('Climate history', LIVE.st.clim) + row('Seasonal outlook', LIVE.st.outlook) +
    '</ul><p class="hint">If a source is offline the planner uses its built-in regional table and NIWA outlook, so it still works. <button class="lnk" data-act="refresh" type="button">Refresh live data</button></p></details>';
}

/* ---------------- briefing ---------------- */
function tempWords(){
  if (S.outlook === 'neutral') return 'Planning for a normal year — no weather adjustment applied.';
  const t = R.anchors.t.sum + S.tweak, r = R.anchors.r.sum;
  const tp = t >= 0.4 ? 'warmer than normal' : t <= -0.4 ? 'cooler than normal' : 'near-normal temperatures';
  const rp = r <= -0.4 ? 'drier than normal' : r >= 0.4 ? 'wetter than normal' : 'near-normal rainfall';
  return cap(tp) + ' and ' + rp + ' expected this summer (' + signed(t, ' °C') + ').';
}

function renderBriefing(){
  const loc = R.loc, C = R.C, Cn = R.Cn, st = R.stats, sn = R.statsN;
  const dl = (t) => fmtT(t);
  const frostFree = LIVE.clim && LIVE.clim.frostFree;
  const dLsf = R.C.v.base.lsf - R.Cn.v.base.lsf, dFaf = R.C.v.base.faf - R.Cn.v.base.faf;
  const dWarm = st.warmDays - sn.warmDays;
  const shifts = shiftList();
  const ms = R.soil;
  const week = weekStrip();
  const alert = coldAlert();
  const outlookLine = S.outlook === 'auto' || S.outlook === 'elnino'
    ? '<p class="src">' + esc(CURRENT_OUTLOOK.title) + '. ' + esc(CURRENT_OUTLOOK.enso) + '. ' + esc((CURRENT_OUTLOOK.groups[R.grp] || {}).blurb || '') + ' ' + esc(CURRENT_OUTLOOK.notes || '') + '</p>' + staleOutlook()
    : '';
  $('#briefing').innerHTML = `
  <div class="brief-head">
    <div>
      <p class="eyebrow">Season briefing</p>
      <h2>${esc(loc.name)}</h2>
      <p class="lede">${esc(tempWords())}</p>
    </div>
    <div class="pills">
      <span class="pill ${S.outlook === 'neutral' ? '' : 'on'}">${esc(S.outlook === 'neutral' ? 'Normal year' : OUTLOOK_PRESETS[S.outlook].label.split(' — ')[0])}</span>
      <span class="pill ${LIVE.fc && S.useLive ? 'on' : ''}">${LIVE.fc && S.useLive ? 'Live forecast' : (LIVE.st.fc.s === 'loading' ? 'Loading forecast…' : 'Built-in climate')}</span>
      ${S.protect !== 'none' ? '<span class="pill on">' + esc(PROTECTION[S.protect].label) + '</span>' : ''}
    </div>
  </div>
  ${alert}
  <div class="stats">
    <div class="stat"><span class="k">Last spring frost</span><span class="v">${frostFree ? 'Rare' : dl(st.lsfT)}</span><span class="s">${frostFree ? 'effectively frost-free' : 'normally ' + dl(sn.lsfT) + (dLsf ? ' · ' + Math.abs(dLsf) + ' days ' + (dLsf < 0 ? 'earlier' : 'later') : '')}</span></div>
    <div class="stat"><span class="k">First autumn frost</span><span class="v">${frostFree ? 'Rare' : dl(st.fafT)}</span><span class="s">${frostFree ? 'protect only in cold snaps' : 'normally ' + dl(sn.fafT) + (dFaf ? ' · ' + Math.abs(dFaf) + ' days ' + (dFaf > 0 ? 'later' : 'earlier') : '')}</span></div>
    <div class="stat"><span class="k">Warm-crop season</span><span class="v">${st.warmDays} days</span><span class="s">days averaging 14 °C+ · normally ${sn.warmDays}${dWarm ? ' (' + signed(dWarm) + ')' : ''}</span></div>
    <div class="stat"><span class="k">Soil today</span><span class="v">${ms ? round1(ms.v) + ' °C' : '—'}</span><span class="s">${ms ? (ms.src === 'you' ? 'your reading' : 'forecast model, 6 cm') : 'enter a reading, or wait for live data'}</span></div>
  </div>
  <div class="chartbox">
    <div class="legend"><span><i class="ln adj"></i>Expected mean temperature</span><span><i class="ln nor"></i>Normal</span><span><i class="ln thr"></i>14 °C — warm crops grow</span></div>
    <div class="chart" id="tchart">${tempChart()}<div class="tip" id="tip" hidden></div></div>
    <details class="tbl"><summary>Table view</summary>${monthTable()}</details>
  </div>
  ${week}
  <div class="shifts"><h3>What the weather changes for your crops</h3>${shifts}</div>
  ${outlookLine}
  <p class="src">${loc.ms ? '<a href="https://www.metservice.com/towns-cities/locations/' + loc.ms + '" target="_blank" rel="noopener">MetService 7-day forecast for this area</a> · ' : '<a href="https://www.metservice.com/" target="_blank" rel="noopener">MetService</a> · '}Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (CC BY 4.0) · Seasonal outlook by <a href="https://niwa.co.nz/climate-and-weather/seasonal-climate-outlook" target="_blank" rel="noopener">NIWA / Earth Sciences NZ</a></p>`;
  attachChartHover();
}

function staleOutlook(){
  const age = Math.round((TODAY - Date.parse(CURRENT_OUTLOOK.updated + 'T00:00:00Z')) / DAY);
  return age > 100 ? '<p class="warn">This built-in outlook is ' + age + ' days old — check NIWA for a newer one, or set your own nudge above.</p>' : '';
}

function coldAlert(){
  if (!LIVE.fc || !S.useLive) return '';
  const cold = LIVE.fc.days.filter(d => d.t >= 0 && d.t <= 6 && d.min != null && d.min <= 4);
  const tender = R.plantings.some(p => CROP_BY_ID[p.cropId].warm && p.p <= OFF + 14);
  if (!cold.length) return '';
  const worst = cold.reduce((m, d) => d.min < m.min ? d : m, cold[0]);
  const frost = worst.min <= 2;
  return '<div class="alert"><b>' + (frost ? 'Frost risk this week' : 'Cold nights this week') + '.</b> Forecast low of ' + round1(worst.min) + ' °C on ' + fmtT(OFF + worst.t, true) + (cold.length > 1 ? ' (' + plural(cold.length, 'night') + ' at or below 4 °C)' : '') + '. ' + (tender ? 'Hold off planting out tender seedlings, or cover them overnight.' : 'Cover tender seedlings overnight.') + '</div>';
}

function weekStrip(){
  if (!LIVE.fc || !S.useLive) return '';
  const days = LIVE.fc.days.filter(d => d.t >= 0 && d.t <= 6);
  if (!days.length) return '';
  return '<div class="week" aria-label="Seven day forecast">' + days.map(d => {
    const frost = d.min != null && d.min <= 4;
    return '<div class="wd' + (frost ? ' cold' : '') + '"><span class="dn">' + (d.t === 0 ? 'Today' : DOW[dateOfT(OFF + d.t).getUTCDay()]) + '</span><span class="hi">' + Math.round(d.max) + '°</span><span class="lo">' + Math.round(d.min) + '°</span><span class="rn">' + (d.rain >= 0.5 ? round1(d.rain) + ' mm' : 'dry') + '</span></div>';
  }).join('') + '</div>';
}

function shiftList(){
  const rows = [];
  Object.keys(R.sel).forEach(id => {
    const c = CROP_BY_ID[id], a = R.plantings.filter(p => p.cropId === id), n = R.normalBy[id] || [];
    if (!a.length && !n.length){ rows.push({ w: 0, c, html: '<b>' + esc(c.n) + '</b> won’t reach harvest here in the time you’ve chosen' + (S.protect === 'none' ? ' — try cloches or a greenhouse.' : '.') }); return; }
    if (a.length && !n.length){ rows.push({ w: 100, c, html: '<b>' + esc(c.n) + '</b> becomes possible: plant ' + fmtT(a[0].p) + ' (a normal year wouldn’t give it enough warmth).', good: true }); return; }
    if (!a.length && n.length){ rows.push({ w: 90, c, html: '<b>' + esc(c.n) + '</b> loses its window under this outlook.' }); return; }
    const dr = a.length - n.length, dp = n[0].p - a[0].p, dm = n[0].m - a[0].m;
    if (dr !== 0) rows.push({ w: 80 + Math.abs(dr), c, good: dr > 0, html: '<b>' + esc(c.n) + '</b>: ' + plural(a.length, 'round') + ' instead of ' + n.length + ' — ' + (dr > 0 ? 'the longer warm season fits an extra planting.' : 'the season is too short for the last round.') });
    else if (Math.abs(dp) >= 3 || Math.abs(dm) >= 3) rows.push({ w: Math.max(Math.abs(dp), Math.abs(dm)), c, good: dm > 0, html: '<b>' + esc(c.n) + '</b>: ' + (Math.abs(dp) >= 3 ? 'plant ' + Math.abs(dp) + ' days ' + (dp > 0 ? 'earlier' : 'later') + ' (' + fmtT(a[0].p) + ')' : 'plant ' + fmtT(a[0].p)) + ', first harvest ' + Math.abs(dm) + ' days ' + (dm > 0 ? 'sooner' : 'later') + ' (' + fmtT(a[0].m) + ').' });
  });
  if (!rows.length) return '<p class="muted">For your current crops the outlook doesn’t move dates by more than a few days.</p>';
  rows.sort((x, y) => y.w - x.w);
  return '<ul class="shiftlist">' + rows.slice(0, 8).map(r => '<li class="' + (r.good ? 'good' : '') + '">' + sw(r.c) + '<span>' + r.html + '</span></li>').join('') + '</ul>';
}

/* temperature chart */
let CH = null;
function tempChart(){
  const W = 680, H = 230, ml = 34, mr = 12, mt = 12, mb = 26;
  const a = R.C.v.base.air, b = R.Cn.v.base.air, N = 365;
  let lo = 99, hi = -99; for (let i = 0; i < N; i++){ lo = Math.min(lo, a[OFF+i], b[OFF+i]); hi = Math.max(hi, a[OFF+i], b[OFF+i]); }
  lo = Math.floor(lo / 5) * 5 - 0; hi = Math.ceil(hi / 5) * 5;
  const x = i => ml + i / N * (W - ml - mr), y = v => mt + (1 - (v - lo) / (hi - lo)) * (H - mt - mb);
  CH = { W, H, ml, mr, mt, mb, N, x, y, lo, hi };
  let ticks = '', grid = '';
  for (let v = lo; v <= hi; v += 5) grid += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gl"/><text x="' + (ml - 6) + '" y="' + (y(v) + 3.5) + '" class="ax" text-anchor="end">' + v + '°</text>';
  for (let i = 0; i < N; i++){ const d = dateOfT(OFF + i); if (d.getUTCDate() === 1) ticks += '<text x="' + x(i) + '" y="' + (H - 8) + '" class="ax" text-anchor="middle">' + MONTHS[d.getUTCMonth()] + '</text>'; }
  let pa = '', pb = '', band = '';
  for (let i = 0; i < N; i += 2){ pa += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(a[OFF+i]).toFixed(1); pb += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(b[OFF+i]).toFixed(1); }
  band = pa; for (let i = N - (N % 2 ? 1 : 2); i >= 0; i -= 2) band += 'L' + x(i).toFixed(1) + ' ' + y(b[OFF+i]).toFixed(1); band += 'Z';
  const y14 = y(14);
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Expected versus normal daily mean temperature over the next 12 months"><rect x="' + ml + '" y="' + mt + '" width="' + (W - ml - mr) + '" height="' + (H - mt - mb) + '" class="pl"/>' + grid + ticks +
    '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y14 + '" y2="' + y14 + '" class="thr"/>' +
    '<path d="' + band + '" class="band"/><path d="' + pb + '" class="nor"/><path d="' + pa + '" class="adj"/>' +
    '<line id="cx" x1="0" x2="0" y1="' + mt + '" y2="' + (H - mb) + '" class="cx" style="display:none"/>' +
    '<circle id="cda" r="4" class="cda" style="display:none"/></svg>';
}
function attachChartHover(){
  const box = $('#tchart'); if (!box || !CH) return;
  const svg = box.querySelector('svg'), tip = $('#tip'), cx = $('#cx'), cda = $('#cda');
  const move = ev => {
    const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * CH.W;
    let i = Math.round((px - CH.ml) / (CH.W - CH.ml - CH.mr) * CH.N); i = clamp(i, 0, CH.N - 1);
    const va = R.C.v.base.air[OFF+i], vb = R.Cn.v.base.air[OFF+i];
    cx.setAttribute('x1', CH.x(i)); cx.setAttribute('x2', CH.x(i)); cx.style.display = '';
    cda.setAttribute('cx', CH.x(i)); cda.setAttribute('cy', CH.y(va)); cda.style.display = '';
    tip.hidden = false; tip.innerHTML = '<b>' + fmtT(OFF + i, true) + '</b><br>Expected ' + round1(va) + ' °C<br>Normal ' + round1(vb) + ' °C<br><span class="d">' + signed(va - vb, ' °C') + '</span>';
    const left = clamp(CH.x(i) / CH.W * r.width + 10, 0, r.width - 130);
    tip.style.left = left + 'px'; tip.style.top = '8px';
  };
  const leave = () => { tip.hidden = true; cx.style.display = 'none'; cda.style.display = 'none'; };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerleave', leave);
}
function monthTable(){
  const rows = []; const seen = {};
  for (let i = 0; i < 365; i++){ const d = dateOfT(OFF + i), k = d.getUTCFullYear() * 12 + d.getUTCMonth(); const e = seen[k] || (seen[k] = { label: MONTHS[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2), a: 0, b: 0, n: 0 }); e.a += R.C.v.base.air[OFF+i]; e.b += R.Cn.v.base.air[OFF+i]; e.n++; }
  Object.keys(seen).forEach(k => rows.push(seen[k]));
  return '<div class="scrollx"><table class="t"><thead><tr><th>Month</th><th class="num">Normal (°C)</th><th class="num">Expected (°C)</th><th class="num">Difference</th></tr></thead><tbody>' +
    rows.map(e => '<tr><td>' + e.label + '</td><td class="num">' + round1(e.b / e.n) + '</td><td class="num">' + round1(e.a / e.n) + '</td><td class="num">' + signed((e.a - e.b) / e.n) + '</td></tr>').join('') + '</tbody></table></div>';
}

/* ---------------- crop picker ---------------- */
function coldHold(c){
  if (!c.warm || !LIVE.fc || !S.useLive) return false;
  return LIVE.fc.days.some(d => d.t >= 0 && d.t <= 4 && d.min != null && d.min <= 4);
}
function cropNow(c){
  const f = firstFeasible(R.C, c, S.hor);
  if (!f){
    const fc = R.Cc && firstFeasible(R.Cc, c, S.hor);
    return fc ? { k: 'cover', t: 'needs cloches' } : { k: 'no', t: 'not viable here' };
  }
  if (f.p <= OFF + 3) return coldHold(c) ? { k: 'hold', t: 'hold — cold snap' } : { k: 'now', t: 'plant now' };
  return { k: 'later', t: 'from ' + fmtT(f.p) };
}
function renderCrops(){
  const groups = Object.keys(GROUPS).sort((a, b) => GROUPS[a].slot - GROUPS[b].slot);
  const picker = groups.map(g => '<div class="cg"><h4><i class="sw" style="background:var(--g' + GROUPS[g].slot + ')"></i>' + GROUPS[g].name + '</h4><div class="chips">' +
    CROPS.filter(c => c.g === g).map(c => { const on = S.sel[c.id] > 0, n = cropNow(c);
      return '<button type="button" class="chip crop ' + (on ? 'on' : '') + ' k-' + n.k + '" data-act="toggle" data-id="' + c.id + '" aria-pressed="' + on + '"><span>' + esc(c.n) + '</span><small>' + esc(n.t) + '</small></button>'; }).join('') + '</div></div>').join('');
  const sel = Object.keys(S.sel).filter(id => S.sel[id] > 0 && CROP_BY_ID[id]);
  const rowsHtml = sel.map(id => {
    const c = CROP_BY_ID[id], n = S.sel[id], rounds = R.plantings.filter(p => p.cropId === id).length;
    const area = n / c.pm;
    return '<div class="yc"><span class="nm">' + sw(c) + esc(c.n) + '</span>' +
      '<span class="stp"><button type="button" class="btn ic" data-act="dec" data-id="' + id + '" aria-label="Fewer ' + esc(c.n) + '">−</button><input type="number" min="1" max="999" value="' + n + '" data-bind="plants" data-id="' + id + '" aria-label="Number of ' + esc(c.n) + ' ' + (c.per || 'per round') + '"><button type="button" class="btn ic" data-act="inc" data-id="' + id + '" aria-label="More ' + esc(c.n) + '">+</button></span>' +
      '<span class="meta">' + (c.per || 'per round') + ' · ' + round1(area) + ' m²</span>' +
      '<span class="rd ' + (rounds ? '' : 'no') + '">' + (rounds ? plural(rounds, 'planting') : 'no window') + '</span>' +
      '<button type="button" class="btn ic x" data-act="remove" data-id="' + id + '" aria-label="Remove ' + esc(c.n) + '">×</button></div>';
  }).join('');
  const over = R.packed.overflow.length;
  $('#crops').innerHTML = `
  <div class="sec-head"><div><p class="eyebrow">What to grow</p><h2>Pick your crops</h2></div>
    <div class="acts"><button class="btn" data-act="starter" type="button">Summer starter set</button><button class="btn" data-act="clear" type="button">Clear</button></div></div>
  <p class="muted">The tag on each crop is where it stands <em>right now</em> for your area, weather and protection. Tap to add or remove.</p>
  <div class="picker">${picker}</div>
  <h3 class="yc-h">Your crops <span class="muted">${sel.length ? '· quantities are per round / per sowing' : ''}</span></h3>
  <div class="ycs">${rowsHtml || '<p class="muted">Nothing selected yet — pick a few crops above.</p>'}</div>
  <p class="fit ${over ? 'bad' : ''}">${fitLine(over)}</p>`;
}
function fitLine(over){
  const u = R.peak;
  const base = 'You have about <b>' + round1(R.growArea) + ' m²</b> of growing space. At its busiest (' + fmtT(u.t) + ') your plan uses <b>' + round1(u.used) + ' m²</b> (' + Math.round(u.pct * 100) + '%).';
  if (S.fit && R.scale < 1) return base + ' Plant numbers are scaled to ' + Math.round(R.scale * 100) + '% so everything fits. <button class="lnk" data-act="unfit" type="button">Use my numbers instead</button>';
  if (over) return '<b>' + plural(over, 'planting') + ' won’t fit</b> in your space. <button class="lnk" data-act="fit" type="button">Shrink plant numbers to fit</button> or make the garden bigger. ' + base;
  return base;
}

/* ---------------- results ---------------- */
function renderResults(){
  const tabs = [['calendar', 'Calendar'], ['layout', 'Garden layout'], ['shop', 'Shopping list'], ['track', 'Tracker']];
  const nav = '<div class="tabs" role="tablist">' + tabs.map(t => '<button role="tab" class="tab ' + (S.tab === t[0] ? 'on' : '') + '" aria-selected="' + (S.tab === t[0]) + '" data-act="tab" data-t="' + t[0] + '" type="button">' + t[1] + '</button>').join('') + '</div>';
  let body = '';
  if (!R.packed.items.length) body = Object.keys(R.sel).length
    ? '<div class="empty"><h3>No planting windows found</h3><p>None of your crops can reach harvest here in the time you’ve chosen. Try cloches or a greenhouse under <b>Growing setup</b>, a longer plan, or different crops.</p></div>'
    : '<div class="empty"><h3>Nothing to schedule yet</h3><p>Pick some crops above and your plan appears here.</p></div>';
  else if (S.tab === 'calendar') body = tabCalendar();
  else if (S.tab === 'layout') body = tabLayout();
  else if (S.tab === 'shop') body = tabShop();
  else body = tabTrack();
  $('#results').innerHTML = nav + '<div class="tabbody" role="tabpanel">' + body + '</div>';
  if (S.tab === 'layout' && (R.placed.length || R.packed.items.length)) renderBeds();
}

/* ---- calendar ---- */
function eventNote(e){
  const c = CROP_BY_ID[e.cropId];
  if (e.kind === 'plant' && coldHold(c) && e.t <= OFF + 6) return '<span class="tag warn">cold snap forecast — hold or cover</span>';
  if (e.kind === 'sow' && e.t < OFF) return '<span class="tag">too late to raise from seed — buy seedlings</span>';
  return '';
}
function agenda(){
  const from = OFF - 21, to = OFF + 45;
  const evs = R.ev.filter(e => e.t >= from && e.t <= to && e.kind !== 'harvest' || (e.kind === 'harvest' && e.t >= OFF && e.t <= to));
  const done = e => { const p = S.prog[e.key]; return p && ((e.kind === 'plant' && (p.s >= 1 || p.a)) || (e.kind === 'sow' && (p.s >= 1 || p.a))); };
  if (!evs.length) return '<p class="muted">Nothing due in the next six weeks.</p>';
  return '<ul class="agenda">' + evs.slice(0, 16).map(e => {
    const c = CROP_BY_ID[e.cropId], d = done(e), late = e.t < OFF && !d && e.kind === 'plant';
    return '<li class="' + (d ? 'done' : '') + (late ? ' late' : '') + '">' +
      (e.kind === 'plant' ? '<input type="checkbox" ' + (d ? 'checked' : '') + ' data-act="donePlant" data-key="' + esc(e.key) + '" data-t="' + e.t + '" aria-label="Mark ' + esc(e.text) + ' as done">' : '<span class="nb"></span>') +
      '<span class="dt">' + fmtT(e.t, true) + '</span><span class="tx">' + sw(c) + esc(cap(e.text)) + (e.r ? ' <em>(round ' + (e.r + 1) + ')</em>' : '') + '</span>' + eventNote(e) + (late ? '<span class="tag warn">overdue</span>' : '') + '</li>';
  }).join('') + '</ul>';
}
function tabCalendar(){
  return '<div class="two"><div><h3>Next six weeks</h3>' + agenda() + '</div><div class="legendbox"><h3>Reading the calendar</h3><p class="lg"><span class="key nur"></span> raising seedlings</p><p class="lg"><span class="key grow"></span> growing</p><p class="lg"><span class="key harv"></span> harvesting</p><p class="lg"><span class="key harv caution"></span> hot-spell risk at harvest</p><p class="lg"><span class="key noroom"></span> doesn’t fit your space</p><p class="muted">Tap any bar for the detail, weather notes and to log what you actually planted.</p></div></div>' + gantt() + detailPanel();
}
function gantt(){
  const t0 = OFF - (dateOfT(OFF).getUTCDate() - 1), t1 = t0 + Math.min(S.hor + 75, 540), span = t1 - t0;
  const P = t => clamp((t - t0) / span * 100, 0, 100);
  /* month header + grid */
  let head = '', grid = '';
  for (let t = t0; t < t1; t++){ const d = dateOfT(t); if (d.getUTCDate() === 1){ let nt = t + 1; while (nt < t1 && dateOfT(nt).getUTCDate() !== 1) nt++;
    head += '<span class="mh" style="left:' + P(t) + '%;width:' + (P(nt) - P(t)) + '%">' + MONTHS[d.getUTCMonth()] + (d.getUTCMonth() === 0 ? ' ' + String(d.getUTCFullYear()).slice(2) : '') + '</span>'; grid += '<span class="gd" style="left:' + P(t) + '%"></span>'; } }
  const byCrop = {}; R.packed.items.forEach(it => (byCrop[it.cropId] || (byCrop[it.cropId] = [])).push(it));
  const ids = Object.keys(byCrop).sort((a, b) => GROUPS[CROP_BY_ID[a].g].slot - GROUPS[CROP_BY_ID[b].g].slot || byCrop[a][0].p - byCrop[b][0].p);
  const rows = ids.map(id => {
    const c = CROP_BY_ID[id], items = byCrop[id].slice().sort((a, b) => a.p - b.p);
    const lanes = [];
    const bars = items.map(it => {
      const s0 = it.p - c.nur * 7; let lane = 0; while (lanes[lane] != null && lanes[lane] > s0) lane++; lanes[lane] = it.end + 1;
      const seg = (a, b) => [clamp(a, t0, t1), clamp(b, t0, t1)];
      const [ba, bb] = seg(s0, it.end); if (bb <= ba) return '';
      const tot = bb - ba, w = (a, b) => { const [x, y] = seg(a, b); return Math.max(0, (y - x) / tot * 100); };
      const cls = (it.status === 'caution' ? ' caution' : '') + (it.x == null ? ' noroom' : '') + (S.focus === it.key ? ' sel' : '');
      const label = fmtT(it.p) + ' → first harvest ' + fmtT(it.m) + (it.x == null ? ' (no room)' : '');
      return '<button type="button" class="bar' + cls + '" data-act="pick" data-key="' + esc(it.key) + '" style="--c:var(--g' + GROUPS[c.g].slot + ');left:' + P(ba) + '%;width:' + (P(bb) - P(ba)) + '%;top:' + (lane * 18 + 5) + 'px" title="' + esc(c.n + ': ' + label) + '" aria-label="' + esc(c.n + ' round ' + (it.r + 1) + ': ' + label) + '">' +
        '<span class="s nur" style="width:' + w(s0, it.p) + '%"></span><span class="s grow" style="width:' + w(it.p, it.m) + '%"></span><span class="s harv" style="width:' + w(it.m, it.end) + '%"></span></button>';
    }).join('');
    const h = Math.max(30, lanes.length * 18 + 10);
    return '<div class="gr"><div class="gl2">' + sw(c) + '<span>' + esc(c.n) + '<small>' + (byCrop[id].length > 1 ? plural(byCrop[id].length, c.mode === 'stag' ? 'sowing' : 'round') : '') + '</small></span></div><div class="gt" style="height:' + h + 'px">' + bars + '</div></div>';
  }).join('');
  return '<div class="gantt-wrap"><div class="gantt" style="--td:' + P(OFF) + '"><div class="gh"><div class="gl2"></div><div class="gt hd">' + head + '</div></div><div class="ggrid">' + grid + '</div>' + rows + '<div class="today"><span>Today</span></div></div></div>';
}
function notesFor(it){
  const c = CROP_BY_ID[it.cropId], out = [];
  if (S.outlook !== 'neutral'){
    const rs = seasonalAnom(R.C.doy[Math.min(it.m, R.C.N - 1)], R.anchors.r);
    if (rs <= -0.4 && c.water >= 2) out.push('Drier than normal expected while it grows — plan on extra watering and mulch (roughly ' + Math.round((R.rainMult - 1) * 100) + '% more than usual).');
    if (rs >= 0.4 && ['tomato','cherry','cucumber','zucchini','pumpkin','onion','garlic','rockmelon'].indexOf(c.id) >= 0) out.push('Wetter than normal expected — watch for blight and mildew; water at the base and give plants air.');
    const mo = R.C.month[it.p];
    if ((S.outlook === 'auto' || S.outlook === 'elnino') && /wind/i.test(CURRENT_OUTLOOK.notes || '') && mo >= 8 && mo <= 11 && ['tomato','cherry','corn','cbean','capsicum','eggplant','cucumber'].indexOf(c.id) >= 0)
      out.push('A windy spring is expected — stake early and shelter young plants.');
  }
  const n = (R.normalBy[c.id] || [])[it.r];
  if (c.warm && n && n.p - it.p >= 4 && it.status !== 'actual') out.push('About ' + (n.p - it.p) + ' days earlier than in a normal year — keep frost cloth or cloches handy for cold snaps' + (/cold outbreak/i.test(CURRENT_OUTLOOK.notes || '') && S.outlook !== 'neutral' ? ' (NIWA expects occasional cold outbreaks this spring)' : '') + '.');
  if (it.flag === 'heat') out.push('Hot-spell risk around harvest — use shade cloth and a heat-tolerant variety.');
  if (it.flag === 'unfinished') out.push('At your actual planting date it may not finish before the season ends — consider cloches.');
  if (c.tip) out.push(c.tip);
  return out;
}
function detailPanel(){
  const it = R.packed.items.find(i => i.key === S.focus); if (!it) return '<p class="muted pickhint">Select a bar above for dates, weather notes and companion planting.</p>';
  const c = CROP_BY_ID[it.cropId], n = (R.normalBy[c.id] || [])[it.r];
  const prog = S.prog[it.key] || {};
  const dm = n ? n.m - it.m : 0;
  return '<div class="detail"><div class="dh">' + sw(c) + '<h3>' + esc(c.n) + (it.r ? ' <em>round ' + (it.r + 1) + '</em>' : '') + '</h3><button type="button" class="btn ic x" data-act="unpick" aria-label="Close">×</button></div>' +
    '<dl class="dl"><div><dt>' + (c.nur ? 'Raise seedlings' : 'Get ready') + '</dt><dd>' + (c.nur ? fmtT(it.p - c.nur * 7, true) + ' (' + c.nur + ' weeks before planting out)' : '—') + '</dd></div>' +
    '<div><dt>' + (c.kind === 'direct' ? 'Sow' : 'Plant') + '</dt><dd>' + fmtT(it.p, true) + (it.status === 'actual' ? ' <em>(your date)</em>' : '') + '</dd></div>' +
    '<div><dt>First harvest</dt><dd>' + fmtT(it.m, true) + ' · ' + it.days + ' days' + (n && Math.abs(dm) >= 2 ? ' <em>(' + Math.abs(dm) + ' days ' + (dm > 0 ? 'sooner' : 'later') + ' than a normal year)</em>' : '') + '</dd></div>' +
    '<div><dt>Harvest window</dt><dd>' + fmtT(it.m) + ' – ' + fmtT(it.end) + '</dd></div>' +
    '<div><dt>Quantity</dt><dd>' + it.plants + ' plants · ' + round1(it.area) + ' m² · ~' + round1(it.plants * c.kg) + ' kg</dd></div>' +
    '<div><dt>Spacing</dt><dd>' + esc(c.sp) + '</dd></div>' +
    (c.comp && c.comp !== '—' ? '<div><dt>Good neighbours</dt><dd>' + esc(c.comp) + '</dd></div>' : '') + (c.avoid && c.avoid !== '—' ? '<div><dt>Keep apart from</dt><dd>' + esc(c.avoid) + '</dd></div>' : '') + '</dl>' +
    '<ul class="notes">' + notesFor(it).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    '<div class="log"><label class="fld" for="act-' + esc(it.key) + '">I actually ' + (c.kind === 'direct' ? 'sowed' : 'planted') + ' this on</label><input id="act-' + esc(it.key) + '" type="date" value="' + (prog.a || '') + '" data-bind="actual" data-key="' + esc(it.key) + '"><small class="muted">The harvest window and any follow-on rounds recalculate from your date and the weather.</small></div></div>';
}

/* ---- layout ---- */
function tabLayout(){
  const tmax = OFF + S.hor + 30;
  if (S.viewT == null || S.viewT < OFF || S.viewT > tmax) S.viewT = R.peak.t;
  const fill = fillers();
  return '<div class="viewer"><label class="fld" for="vt">View the garden on <b id="vtOut">' + fmtTY(S.viewT) + '</b></label><input id="vt" type="range" min="' + OFF + '" max="' + tmax + '" step="1" value="' + S.viewT + '" data-bind="viewT"><div class="scale"><span>' + fmtT(OFF) + '</span><span>busiest: ' + fmtT(R.peak.t) + '</span><span>' + fmtT(tmax) + '</span></div></div>' +
    '<div id="bedsBox"></div>' + utilChart() + fill;
}
const BED_MAXLEN = 3;
function renderBeds(){
  const box = $('#bedsBox'); if (!box) return;
  const vt = S.viewT, Ltot = R.Ltot, bw = S.bedW;
  const nB = Math.max(1, Math.ceil(Ltot / BED_MAXLEN - 1e-6)), bl = Ltot / nB;
  const cols = nB <= 2 ? nB : nB <= 6 ? 2 : nB <= 12 ? 3 : 4, rows = Math.ceil(nB / cols);
  const U = 100, gap = 0.55, pad = 0.15;
  const Wm = cols * bl + (cols - 1) * gap + pad * 2, Hm = rows * bw + (rows - 1) * gap + pad * 2;
  const active = R.placed.filter(it => it.p <= vt && vt < it.end);
  let svg = '';
  for (let b = 0; b < nB; b++){
    const cx = pad + (b % cols) * (bl + gap), cy = pad + Math.floor(b / cols) * (bw + gap);
    svg += '<rect class="bed" x="' + cx * U + '" y="' + cy * U + '" width="' + bl * U + '" height="' + bw * U + '" rx="6"/>';
    const lo = b * bl, hi = lo + bl;
    for (const it of active){
      const a = Math.max(it.x, lo), z = Math.min(it.x + it.len, hi);
      if (z - a <= 1e-6) continue;
      const c = CROP_BY_ID[it.cropId], w = (z - a) * U;
      svg += '<g><rect class="seg" x="' + (cx + a - lo) * U + '" y="' + cy * U + '" width="' + w + '" height="' + bw * U + '" rx="4" style="fill:var(--g' + GROUPS[c.g].slot + ')"><title>' + esc(c.n + ' — ' + it.plants + ' plants, ' + round1(it.area) + ' m²') + '</title></rect>';
      if (w > 46) svg += '<text class="segt" x="' + ((cx + a - lo) * U + w / 2) + '" y="' + (cy * U + bw * U / 2 + 4) + '" text-anchor="middle">' + esc(w > 96 ? c.n : c.n.split(' ')[0]) + '</text>';
      svg += '</g>';
    }
  }
  const usedNow = active.reduce((s, i) => s + i.area, 0);
  const legend = Array.from(new Set(active.map(i => i.cropId))).map(id => { const c = CROP_BY_ID[id]; const its = active.filter(i => i.cropId === id); return '<li>' + sw(c) + '<span>' + esc(c.n) + '</span><em>' + its.reduce((s, i) => s + i.plants, 0) + ' plants · ' + round1(its.reduce((s, i) => s + i.area, 0)) + ' m²</em></li>'; }).join('');
  box.innerHTML = '<div class="bedsvg"><svg viewBox="0 0 ' + Wm * U + ' ' + Hm * U + '" role="img" aria-label="Bed layout on ' + fmtTY(vt) + '">' + svg + '</svg></div>' +
    '<p class="muted">' + plural(nB, 'bed') + ' about ' + round1(bl) + ' m × ' + bw + ' m (schematic — crops keep the same spot for their whole life). On this date <b>' + round1(usedNow) + ' m²</b> of ' + round1(R.growArea) + ' m² is in use (' + Math.round(usedNow / R.growArea * 100) + '%).</p>' +
    '<ul class="lgd">' + (legend || '<li class="muted">Nothing is in the ground on this date.</li>') + '</ul>';
}
function utilChart(){
  const u = R.util, W = 680, H = 140, ml = 34, mr = 12, mt = 8, mb = 22;
  const t0 = u[0].t, t1 = u[u.length - 1].t + 7, x = t => ml + (t - t0) / (t1 - t0) * (W - ml - mr), y = p => mt + (1 - p) * (H - mt - mb);
  let bars = '', ax = '';
  const bw = (W - ml - mr) / u.length;
  u.forEach(s => { const h = Math.min(1, s.pct) * (H - mt - mb); bars += '<rect x="' + (x(s.t) + 0.5) + '" y="' + (H - mb - h) + '" width="' + Math.max(1, bw - 1) + '" height="' + h + '" class="ub" rx="2"><title>' + fmtT(s.t) + ': ' + round1(s.used) + ' m² in use (' + Math.round(s.pct * 100) + '%)</title></rect>'; });
  [0, 0.5, 1].forEach(p => ax += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(p) + '" y2="' + y(p) + '" class="gl"/><text x="' + (ml - 6) + '" y="' + (y(p) + 3.5) + '" class="ax" text-anchor="end">' + Math.round(p * 100) + '%</text>');
  for (let t = t0; t < t1; t++){ if (dateOfT(t).getUTCDate() === 1) ax += '<text x="' + x(t) + '" y="' + (H - 6) + '" class="ax" text-anchor="middle">' + MONTHS[dateOfT(t).getUTCMonth()] + '</text>'; }
  const cur = '<line x1="' + x(S.viewT) + '" x2="' + x(S.viewT) + '" y1="' + mt + '" y2="' + (H - mb) + '" class="cx"/>';
  return '<div class="util"><h3>How much of your space is in use</h3><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Share of growing space in use each week">' + ax + bars + cur + '</svg><p class="muted">Low bars are free space — good moments for a follow-on crop.</p></div>';
}
function fillers(){
  if (!R.growArea) return '';
  const selIds = Object.keys(R.sel), cands = [];
  CROPS.forEach(c => {
    if (R.sel[c.id]) return;
    const pl = planCrop(R.C, c, { succ: false, hor: S.hor })[0]; if (!pl) return;
    const sel2 = Object.assign({}, R.sel); sel2[c.id] = c.def;
    const all = R.plantings.concat([Object.assign({}, pl, { cropId: c.id, r: 0, key: c.id + '|0' })]);
    const pk = packPlan(all, sel2, R.scale, R.Ltot, S.bedW);
    if (pk.overflow.length) return;
    const area = c.def / c.pm;
    cands.push({ c, pl, area, kg: c.def * c.kg, score: pl.p * 1 - (c.def * c.kg / area) * 4 });
  });
  cands.sort((a, b) => a.score - b.score);
  if (!cands.length) return '<div class="fill"><h3>Fill the gaps</h3><p class="muted">Your space is well used — no extra crops fit without squeezing something out.</p></div>';
  return '<div class="fill"><h3>Fill the gaps</h3><p class="muted">Crops that fit into the free space in your plan, soonest first:</p><ul class="fl">' + cands.slice(0, 8).map(o => '<li>' + sw(o.c) + '<span class="fn"><b>' + esc(o.c.n) + '</b> — ' + (o.c.kind === 'direct' ? 'sow ' : 'plant ') + fmtT(o.pl.p) + ', first harvest ' + fmtT(o.pl.m) + ' <em>(' + o.c.def + ' plants, ' + round1(o.area) + ' m², ~' + round1(o.kg) + ' kg)</em></span><button type="button" class="btn" data-act="toggle" data-id="' + o.c.id + '">Add</button></li>').join('') + '</ul></div>';
}

/* ---- shopping ---- */
function tabShop(){
  const sh = R.shop, kg = sh.rows.reduce((s, r) => s + r.kg, 0);
  const weekly = Math.round(R.peak.used * 25 * R.rainMult);
  const over = R.packed.overflow.length;
  return '<div class="tiles"><div class="tile"><span class="k">Expected harvest</span><span class="v">' + Math.round(kg) + ' kg</span><span class="s">over the whole plan, typical home-garden yields</span></div><div class="tile"><span class="k">Peak watering</span><span class="v">~' + weekly.toLocaleString('en-NZ') + ' L / week</span><span class="s">about ' + Math.round(25 * R.rainMult) + ' L per m² when it’s busiest' + (R.rainMult > 1.05 ? ' (dry season allowance)' : R.rainMult < 0.95 ? ' (wet season discount)' : '') + '</span></div><div class="tile"><span class="k">Space used at peak</span><span class="v">' + Math.round(R.peak.pct * 100) + '%</span><span class="s">' + round1(R.peak.used) + ' of ' + round1(R.growArea) + ' m²</span></div></div>' +
    (over ? '<p class="warn">' + plural(over, 'planting') + ' that don’t fit your space are left off this list.</p>' : '') +
    '<div class="scrollx"><table class="t shoptbl"><thead><tr><th>Crop</th><th class="num">Plants</th><th>Buy</th><th class="num">Harvest</th></tr></thead><tbody>' +
    sh.rows.map(r => '<tr><td>' + sw(CROP_BY_ID[r.id]) + esc(r.name) + (r.rounds > 1 ? ' <em>× ' + r.rounds + ' rounds</em>' : '') + '</td><td class="num">' + r.plants + '</td><td>' + esc(r.buy) + '<br><small class="muted">' + esc(r.extra) + '</small></td><td class="num">~' + r.kg + ' kg</td></tr>').join('') + '</tbody></table></div>' +
    '<h3>Supplies</h3><ul class="sup">' + sh.supplies.map(s => '<li><span>' + esc(s.name) + '</span><b>' + esc(String(s.qty)) + '</b></li>').join('') + '</ul>' +
    '<div class="actions"><button class="btn" data-act="copyList" type="button">Copy list to clipboard</button><button class="btn" data-act="print" type="button">Print plan</button></div>';
}

/* ---- tracker ---- */
const STAGES = ['Planned', 'In the ground', 'Harvesting', 'Finished'];
function tabTrack(){
  const items = R.packed.items.slice().sort((a, b) => a.p - b.p);
  const done = items.filter(i => (S.prog[i.key] || {}).s === 3).length;
  const inG = items.filter(i => { const s = (S.prog[i.key] || {}).s; return s === 1 || s === 2; }).length;
  const rows = items.map(it => {
    const c = CROP_BY_ID[it.cropId], p = S.prog[it.key] || { s: 0 };
    return '<tr><td>' + sw(c) + esc(c.n) + (it.r ? ' <em>round ' + (it.r + 1) + '</em>' : '') + '</td><td>' + fmtT(it.p, true) + (it.status === 'actual' ? ' <em>(yours)</em>' : '') + '</td><td>' + fmtT(it.m) + ' – ' + fmtT(it.end) + '</td>' +
      '<td><input type="date" value="' + (p.a || '') + '" data-bind="actual" data-key="' + esc(it.key) + '" aria-label="Actual planting date for ' + esc(c.n) + '"></td>' +
      '<td><select data-bind="stage" data-key="' + esc(it.key) + '" aria-label="Status of ' + esc(c.n) + '">' + STAGES.map((s, i) => '<option value="' + i + '"' + ((p.s || 0) === i ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></td></tr>';
  }).join('');
  return '<div class="prog"><div class="bar2"><span style="width:' + (items.length ? Math.round(done / items.length * 100) : 0) + '%"></span></div><p><b>' + done + '</b> of ' + items.length + ' plantings finished · <b>' + inG + '</b> growing now</p></div>' +
    '<p class="muted">Enter the date you actually planted something and the planner re-works the harvest window and any follow-on rounds from that date and the weather. Everything is saved in this browser.</p>' +
    '<div class="scrollx"><table class="t"><thead><tr><th>Crop</th><th>Planned</th><th>Harvest window</th><th>Actual date</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="actions"><button class="btn" data-act="resetProg" type="button">Clear tracker</button></div>';
}

/* ---------------- main ---------------- */
function renderMain(){
  syncSidebar();
  const sm = $('#sideSum'); if (sm) sm.textContent = 'Settings · ' + R.loc.name + ' · ' + round1(R.growArea) + ' m²';
  $('#areaOut').innerHTML = 'About <b>' + round1(R.growArea) + ' m²</b> of growing space (' + round1(S.len * S.wid) + ' m² less paths).';
  renderBriefing(); renderCrops(); renderResults();
}

/* ---------------- events ---------------- */
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (a === 'toggle'){ if (S.sel[id] > 0) delete S.sel[id]; else S.sel[id] = CROP_BY_ID[id].def; update(); }
  else if (a === 'inc'){ S.sel[id] = (S.sel[id] || 0) + step(id); update(); }
  else if (a === 'dec'){ S.sel[id] = Math.max(1, (S.sel[id] || 1) - step(id)); update(); }
  else if (a === 'remove'){ delete S.sel[id]; update(); }
  else if (a === 'starter'){ S.sel = Object.assign({}, STARTER); update(); }
  else if (a === 'clear'){ S.sel = {}; update(); }
  else if (a === 'tab'){ S.tab = el.dataset.t; renderResults(); saveState(); }
  else if (a === 'pick'){ S.focus = el.dataset.key === S.focus ? null : el.dataset.key; renderResults(); const d = $('.detail'); if (d && S.focus) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); saveState(); }
  else if (a === 'unpick'){ S.focus = null; renderResults(); }
  else if (a === 'fit'){ S.fit = true; update(); }
  else if (a === 'unfit'){ S.fit = false; update(); }
  else if (a === 'size'){ S.len = +el.dataset.l; S.wid = +el.dataset.w; update(); }
  else if (a === 'search') doSearch();
  else if (a === 'pickPlace'){ const p = PLACES[+el.dataset.i]; if (p){ S.place = p; $('#placeRes').innerHTML = ''; $('#placeQ').value = ''; refreshLive(false); update(); } }
  else if (a === 'refresh'){ refreshLive(true); refreshOutlook(); }
  else if (a === 'donePlant'){ const key = el.dataset.key, t = +el.dataset.t; const p = S.prog[key] || (S.prog[key] = { s: 0 });
    if (el.checked){ p.s = Math.max(p.s || 0, 1); p.a = isoOfT(Math.min(t, OFF)); } else { p.s = 0; delete p.a; } update(); }
  else if (a === 'resetProg'){ if (confirm('Clear all tracker progress and actual dates?')){ S.prog = {}; update(); } }
  else if (a === 'copyList') copyList(el);
  else if (a === 'print') window.print();
});
function step(id){ const c = CROP_BY_ID[id]; return c.def >= 30 ? 10 : c.def >= 10 ? 2 : 1; }

document.addEventListener('change', ev => {
  const el = ev.target.closest('[data-bind]'); if (!el) return; bind(el, false);
});
document.addEventListener('input', ev => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  if (el.dataset.bind === 'viewT' || el.dataset.bind === 'tweak') bind(el, true);
});
function bind(el, live){
  const k = el.dataset.bind, v = el.type === 'checkbox' ? el.checked : el.value;
  if (k === 'region'){ if (v === '__place') return; S.place = null; S.region = v; refreshLive(false); update(); return; }
  if (k === 'plants'){ const n = Math.max(1, Math.min(999, parseInt(v, 10) || 1)); S.sel[el.dataset.id] = n; update(); return; }
  if (k === 'viewT'){ S.viewT = +v; const o = $('#vtOut'); if (o) o.textContent = fmtTY(S.viewT); renderBeds(); const u = $('.util'); if (u) u.outerHTML = utilChart(); saveState(); return; }
  if (k === 'actual'){ const p = S.prog[el.dataset.key] || (S.prog[el.dataset.key] = { s: 0 }); if (v) { p.a = v; p.s = Math.max(p.s || 0, 1); } else delete p.a; update(); return; }
  if (k === 'stage'){ const p = S.prog[el.dataset.key] || (S.prog[el.dataset.key] = { s: 0 }); p.s = +v; update(); return; }
  if (['len','wid','paths','bedW','tweak'].indexOf(k) >= 0){ const n = parseFloat(v); if (isNaN(n)) return; S[k] = n; if (k === 'tweak'){ $('#tweakOut').textContent = n === 0 ? 'none' : signed(n, ' °C'); if (live){ clearTimeout(bind.t); bind.t = setTimeout(update, 120); return; } } update(); return; }
  if (k === 'hor'){ S.hor = +v; S.viewT = null; update(); return; }
  if (k === 'soilNow'){ S.soilNow = v; update(); return; }
  S[k] = v; if (k === 'outlook' || k === 'protect') S.viewT = null; update();
}

/* place search */
let PLACES = [];
async function doSearch(){
  const q = $('#placeQ').value.trim(), out = $('#placeRes'); if (q.length < 2) return;
  out.innerHTML = '<p class="hint">Searching…</p>';
  try {
    PLACES = await searchPlaces(q);
    out.innerHTML = PLACES.length ? PLACES.map((p, i) => '<button type="button" class="pl" role="option" data-act="pickPlace" data-i="' + i + '"><b>' + esc(p.name) + '</b> <span>' + esc(p.admin) + '</span></button>').join('') : '<p class="hint">No NZ places found for that — try a nearby town.</p>';
  } catch(e){
    out.innerHTML = '<p class="hint">Place search needs a connection to Open-Meteo (' + esc(e.message) + '). You can still pick a region from the list.</p>';
  }
}
document.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'placeQ'){ ev.preventDefault(); doSearch(); } });

function copyList(btn){
  const lines = ['Total Garden Planner 4000 — shopping list (' + R.loc.name + ')', ''];
  R.shop.rows.forEach(r => lines.push('• ' + r.name + ': ' + r.buy + ' (' + r.extra + ')'));
  lines.push('', 'Supplies'); R.shop.supplies.forEach(s => lines.push('• ' + s.name + ': ' + s.qty));
  const txt = lines.join('\n');
  const done = () => { const o = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => btn.textContent = o, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => {}); else done();
}

/* ---------------- boot ---------------- */
renderSidebar();
renderStatus();
update();
refreshLive(false);
refreshOutlook();
