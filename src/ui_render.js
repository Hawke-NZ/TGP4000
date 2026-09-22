/* ============================================================
   UI RENDER — header, sidebar, briefing, plants, calendar, shopping, tracker, events
   ============================================================ */
const sw = c => '<i class="sw" style="background:var(--g' + GROUPS[c.g].slot + ')"></i>';
const round1 = x => Math.round(x * 10) / 10;
const signed = (x, u) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(round1(x)) + (u || '');
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const ACT = {}, BIND = {};
const entryName = e => { const c = CROP_BY_ID[e.crop]; return (c ? c.n : e.crop) + (e.name ? ' — ' + e.name : ''); };
const fmtYield = (c, v) => c.kg <= 0 ? '' : '~' + (c.u === 'kg' ? round1(v) + ' kg' : Math.round(v) + ' ' + c.u);
const zoneName = id => { const z = S.zones.find(x => x.id === id); return z ? z.name : ''; };
const LIGHT_LABEL = { sun: 'Full sun', part: 'Part shade', shade: 'Shade' };
const COVER_LABEL = { open: 'Open ground', cloche: 'Cloche / tunnel', glass: 'Glasshouse' };
const tagText = z => LIGHT_LABEL[z.light || 'sun'] + ' · ' + COVER_LABEL[z.cover || 'open'];

/* ---------------- garden bar ---------------- */
function renderGardenBar(){
  const el = $('#gbar'); if (!el) return;
  el.innerHTML = '<div class="gtabs" role="tablist" aria-label="Your gardens">' + STORE.order.map(id => { const g = STORE.gardens[id]; return '<button type="button" role="tab" class="gchip ' + (id === STORE.cur ? 'on' : '') + '" aria-selected="' + (id === STORE.cur) + '" data-act="garden" data-id="' + id + '">' + esc(g.name) + '</button>'; }).join('') +
    '<button type="button" class="gchip add" data-act="gnew" aria-label="Add a garden">+ Add a garden</button></div>' +
    '<div class="gacts"><button type="button" class="btn" data-act="gmanage">Rename · share · import</button></div>' +
    (STORE_ERR ? '<p class="alert" role="alert">' + esc(STORE_ERR) + '</p>' : '');
}

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
    <p class="hint">Each garden has its own place. Beds, pots, shade and glasshouse are set on the <b>Site plan</b> tab.</p>
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
    <h3>Planning</h3>
    <label class="fld" for="hor">Plan length</label>
    <select id="hor" data-bind="hor"><option value="183">Next 6 months</option><option value="365">Next 12 months</option><option value="545">Next 18 months</option></select>
    <label class="chk"><input id="succ" type="checkbox" data-bind="succ"> Squeeze in follow-on rounds when the season allows</label>
  </section>`;
  syncSidebar();
}
function syncSidebar(){
  const set = (id, v) => { const el = $('#' + id); if (el && document.activeElement !== el) el.value = v; };
  ['outlook','tweak','rain','soilNow','hor'].forEach(k => set(k, S[k]));
  $('#useLive').checked = !!S.useLive; $('#succ').checked = !!S.succ;
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
  el.innerHTML = '<details><summary>Data sources</summary><ul>' + row('Forecast &amp; soil', LIVE.st.fc) + row('Climate history', LIVE.st.clim) + row('Season so far', LIVE.st.season) + row('Seasonal outlook', LIVE.st.outlook) +
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
      <span class="pill">${plural(S.zones.length, 'space')} · ${esc(S.name)}</span>
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
  const tender = R.items.some(p => CROP_BY_ID[p.cropId].warm && p.p <= OFF + 14);
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
  S.entries.forEach(e => {
    const c = CROP_BY_ID[e.crop], b = R.plan.byEntry[e.id]; if (!c || !b) return;
    const a = b.items, n = R.normalBy[e.id] || [], nm = esc(entryName(e));
    if (!b.zone){ rows.push({ w: 0, c, html: '<b>' + nm + '</b> can’t be planned: ' + esc(b.reason ? b.reason.text : 'no space') + '.' }); return; }
    if (!a.length && !n.length){ rows.push({ w: 0, c, html: '<b>' + nm + '</b> won’t reach harvest in <i>' + esc(b.zone.name) + '</i>' + (b.reason ? ' — ' + esc(b.reason.text) : '') + (b.zone.cover === 'open' ? '. A cloche or glasshouse space may help.' : '.') }); return; }
    if (a.length && !n.length){ rows.push({ w: 100, c, html: '<b>' + nm + '</b> becomes possible: plant ' + fmtT(a[0].p) + ' (a normal year wouldn’t give it enough warmth).', good: true }); return; }
    if (!a.length && n.length){ rows.push({ w: 90, c, html: '<b>' + nm + '</b> loses its window under this outlook.' }); return; }
    const dr = a.length - n.length, dp = n[0].p - a[0].p, dm = n[0].m - a[0].m;
    if (dr !== 0) rows.push({ w: 80 + Math.abs(dr), c, good: dr > 0, html: '<b>' + nm + '</b>: ' + plural(a.length, 'round') + ' instead of ' + n.length + ' — ' + (dr > 0 ? 'the longer warm season fits an extra planting.' : 'the season is too short for the last round.') });
    else if (Math.abs(dp) >= 3 || Math.abs(dm) >= 3) rows.push({ w: Math.max(Math.abs(dp), Math.abs(dm)), c, good: dm > 0, html: '<b>' + nm + '</b>: ' + (Math.abs(dp) >= 3 ? 'plant ' + Math.abs(dp) + ' days ' + (dp > 0 ? 'earlier' : 'later') + ' (' + fmtT(a[0].p) + ')' : 'plant ' + fmtT(a[0].p)) + ', first harvest ' + Math.abs(dm) + ' days ' + (dm > 0 ? 'sooner' : 'later') + ' (' + fmtT(a[0].m) + ').' });
  });
  if (!rows.length) return '<p class="muted">For your current plants the outlook doesn’t move dates by more than a few days.</p>';
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



/* ---------------- plants: picker + your list ---------------- */
function coldHold(c){
  if (!c.warm || !LIVE.fc || !S.useLive) return false;
  return LIVE.fc.days.some(d => d.t >= 0 && d.t <= 4 && d.min != null && d.min <= 4);
}
const liveZones = () => S.zones.filter(z => z.type === 'bed' || z.type === 'pots');
function cropNow(c){
  const zs = liveZones();
  if (!zs.length) return { k: 'no', t: 'add a space first' };
  let best = null;
  for (const z of zs){ const f = firstFeasible(R.C, c, S.hor, zoneCtx(z)); if (f && (!best || f.p < best.p)) best = f; }
  if (!best){
    const z0 = zs.find(z => z.cover === 'open') || zs[0];
    const cl = firstFeasible(R.C, c, S.hor, { cover: 'cloche', light: z0.light });
    if (cl) return { k: 'cover', t: 'needs cloches' };
    const gl = firstFeasible(R.C, c, S.hor, { cover: 'glass', light: z0.light });
    return gl ? { k: 'cover', t: 'needs a glasshouse' } : { k: 'no', t: 'not viable here' };
  }
  if (best.p <= OFF + 3) return coldHold(c) ? { k: 'hold', t: 'hold — cold snap' } : { k: 'now', t: 'plant now' };
  return { k: 'later', t: 'from ' + fmtT(best.p) };
}
function renderCrops(){
  const _fd = focusDesc();
  const groups = Object.keys(GROUPS).sort((a, b) => GROUPS[a].slot - GROUPS[b].slot);
  const has = id => S.entries.some(e => e.crop === id);
  const picker = groups.map(g => '<div class="cg"><h4><i class="sw" style="background:var(--g' + GROUPS[g].slot + ')"></i>' + GROUPS[g].name + '</h4><div class="chips">' +
    CROPS.filter(c => c.g === g).map(c => { const on = has(c.id), n = cropNow(c);
      return '<button type="button" class="chip crop ' + (on ? 'on' : '') + ' k-' + n.k + '" data-act="toggle" data-id="' + esc(c.id) + '" aria-pressed="' + on + '"><span>' + esc(c.n) + (c.custom ? ' <i class="cm" title="Your own crop">★</i>' : '') + '</span><small>' + esc(n.t) + '</small></button>'; }).join('') + '</div></div>').join('');
  const zopt = e => '<option value="auto"' + (e.zone === 'auto' || !e.zone ? ' selected' : '') + '>Auto — best space</option>' + liveZones().map(z => '<option value="' + z.id + '"' + (e.zone === z.id ? ' selected' : '') + '>' + esc(z.name) + '</option>').join('');
  const rowsHtml = S.entries.filter(e => CROP_BY_ID[e.crop]).map(e => {
    const c = CROP_BY_ID[e.crop], b = R.plan.byEntry[e.id] || { items: [], zone: null }, rounds = b.items.length;
    const its = b.items, first = its[0];
    const hows = howOptions(c), nNotes = (S.notes[c.id] || []).length;
    let where = '', issues = [];
    if (b.zone) where = '→ ' + esc(b.zone.name) + (e.zone === 'auto' || !e.zone ? ' <em>(auto)</em>' : '');
    if (first){
      if (b.zone.type === 'bed') where += ' · ' + round1(first.plants / c.pm) + ' m²'; else if (first.potsUsed) where += ' · ' + plural(first.potsUsed, 'pot') + (first.potL ? ' (' + first.potL + ' L+)' : '');
    }
    if (!rounds) issues.push('<span class="rd no">no window' + (b.reason ? ': ' + esc(b.reason.text) : '') + '</span>');
    else {
      issues.push('<span class="rd">' + plural(rounds, c.mode === 'stag' ? 'sowing' : 'planting') + '</span>');
      if (its.some(i => i.x == null)) issues.push('<span class="rd no">' + (its.every(i => i.x == null) ? 'no room' : plural(its.filter(i => i.x == null).length, 'planting') + ' won’t fit') + ' in ' + esc(b.zone.name) + '</span>');
      if (its.some(i => i.light === 'shady')) issues.push('<span class="rd warnt">too shady for best yield</span>');
      if (its.some(i => i.light === 'sunny')) issues.push('<span class="rd warnt">wants more shade</span>');
      const rot = its.find(i => i.rot); if (rot) issues.push('<span class="rd warnt">follows ' + esc(rot.rot.toLowerCase()) + ' in this bed — rotate if you can</span>');
    }
    const howSel = hows.length > 1 ? '<label><span>Start from</span><select data-bind="ehow" data-id="' + e.id + '" aria-label="How to start ' + esc(c.n) + '">' + [['auto', 'Automatic']].concat(hows).map(h => '<option value="' + h[0] + '"' + ((e.how || 'auto') === h[0] ? ' selected' : '') + '>' + h[1] + '</option>').join('') + '</select></label>' : '';
    return '<div class="yc2"><div class="yh"><span class="nm">' + sw(c) + esc(c.n) + '</span>' +
      '<span class="stp"><button type="button" class="btn ic" data-act="dec" data-id="' + e.id + '" aria-label="Fewer ' + esc(c.n) + '">−</button><input type="number" min="1" max="999" value="' + e.qty + '" data-bind="eqty" data-id="' + e.id + '" aria-label="Number of ' + esc(c.n) + ' ' + (c.per || 'per round') + '"><button type="button" class="btn ic" data-act="inc" data-id="' + e.id + '" aria-label="More ' + esc(c.n) + '">+</button></span>' +
      '<span class="meta">' + (c.per || 'per round') + '</span>' +
      '<button type="button" class="btn ic x" data-act="edup" data-id="' + e.id + '" title="Add another of these in a different place" aria-label="Duplicate ' + esc(c.n) + '">⧉</button>' +
      '<button type="button" class="btn ic x" data-act="remove" data-id="' + e.id + '" aria-label="Remove ' + esc(c.n) + '">×</button></div>' +
      '<div class="ys"><label><span>Where</span><select data-bind="ezone" data-id="' + e.id + '" aria-label="Where to grow ' + esc(c.n) + '">' + zopt(e) + '</select></label>' + howSel +
      '<label><span>Variety / label</span><input type="text" data-bind="ename" data-id="' + e.id + '" value="' + esc(e.name || '') + '" placeholder="e.g. ' + (c.tt ? 'Moneymaker' : 'variety') + '" maxlength="40"></label></div>' +
      '<div class="yi"><span class="where">' + where + '</span>' + issues.join('') + '<span class="ylinks"><button type="button" class="lnk" data-act="enotes" data-crop="' + esc(c.id) + '">Notes' + (nNotes ? ' (' + nNotes + ')' : '') + '</button><button type="button" class="lnk" data-act="cropedit" data-id="' + esc(c.id) + '">Crop settings</button></span></div></div>';
  }).join('');
  const over = R.overflow.length;
  $('#crops').innerHTML = `
  <div class="sec-head"><div><p class="eyebrow">${esc(S.name)}</p><h2>What to grow</h2></div>
    <div class="acts"><button class="btn" data-act="cropnew" type="button">+ My own crop</button><button class="btn" data-act="starter" type="button">Summer starter set</button><button class="btn" data-act="clear" type="button">Clear</button></div></div>
  <p class="muted">The tag on each plant is where it stands <em>right now</em> for your area, weather and spaces. Tap to add or remove. Fruit trees, vines and flowering shrubs live on the <b>Trees &amp; vines</b> tab.</p>
  <div class="picker">${picker}</div>
  <h3 class="yc-h">Your plants <span class="muted">${S.entries.length ? '· quantities are per round / per sowing' : ''}</span></h3>
  <div class="ycs">${rowsHtml || '<p class="muted">Nothing selected yet — pick a few plants above.</p>'}</div>
  <p class="fit ${over ? 'bad' : ''}">${fitLine(over)}</p>`;
  restoreFocus(_fd);
}
function fitLine(over){
  const beds = R.util.filter(u => u.kind === 'bed'), pots = R.util.filter(u => u.kind === 'pots');
  const area = beds.reduce((s, u) => s + u.cap, 0), nPots = pots.reduce((s, u) => s + u.cap, 0);
  let base = 'You have ' + (area ? '<b>' + round1(area) + ' m²</b> of beds' : '') + (area && nPots ? ' and ' : '') + (nPots ? '<b>' + nPots + ' pots</b>' : '') + (!area && !nPots ? 'no growing space yet — add a bed or pots on the Site plan tab' : '') + '.';
  if (area){
    const peak = peakAll(beds); base += ' At its busiest (' + fmtT(peak.t) + ') the beds use <b>' + round1(peak.used) + ' m²</b> (' + Math.round(peak.pct * 100) + '%).';
  }
  if (S.fit && R.scale < 1) return base + ' Bed quantities are scaled to ' + Math.round(R.scale * 100) + '% so everything fits. <button class="lnk" data-act="unfit" type="button">Use my numbers instead</button>';
  if (over) return '<b>' + plural(over, 'planting') + ' won’t fit</b> in the space you’ve set aside. <button class="lnk" data-act="fit" type="button">Shrink bed quantities to fit</button>, make a bed bigger, or choose another place for them. ' + base;
  return base;
}
/* busiest moment across a set of zone utilisation series */
function peakAll(list){
  if (!list.length) return { t: OFF, used: 0, pct: 0, cap: 0 };
  const cap = list.reduce((s, u) => s + u.cap, 0);
  let best = { t: OFF, used: 0, pct: 0, cap };
  for (let i = 0; i < list[0].series.length; i++){
    let used = 0; list.forEach(u => used += u.series[i].used);
    if (used > best.used) best = { t: list[0].series[i].t, used, pct: cap ? used / cap : 0, cap };
  }
  return best;
}

/* ---------------- results ---------------- */
const TABS = [['calendar', 'Calendar'], ['advisor', 'Advisor'], ['site', 'Site plan'], ['care', 'Care'], ['trees', 'Trees & vines'], ['shop', 'Shopping list'], ['track', 'Tracker'], ['notes', 'Notes']];
/* the tab bar lives in its own sticky strip near the top of the page (#topnav), not inside #results,
   so you can jump between sections on a phone without scrolling past the weather settings and briefing first */
function navHtml(){
  return TABS.map(t => '<button role="tab" class="tab ' + (S.tab === t[0] ? 'on' : '') + '" aria-selected="' + (S.tab === t[0]) + '" data-act="tab" data-t="' + t[0] + '" type="button">' + t[1] + (t[0] === 'care' && careDueNow() ? ' <span class="badge">' + careDueNow() + '</span>' : '') + (t[0] === 'advisor' && advBadge() ? ' <span class="badge">' + advBadge() + '</span>' : '') + '</button>').join('');
}
function renderTopNav(){ const el = $('#topnav'); if (el) el.innerHTML = navHtml(); }
function renderResults(){
  const _fd = focusDesc();
  if (!TABS.some(t => t[0] === S.tab)) S.tab = 'calendar';
  renderTopNav();
  let body = '';
  const need = { calendar: 1, shop: 1, track: 1 }[S.tab];
  if (need && !R.items.length){
    body = S.entries.length
      ? '<div class="empty"><h3>No planting windows found</h3><p>None of your plants can reach harvest in the spaces you’ve set up in the time you’ve chosen. Try a cloche or glasshouse space (Site plan tab), a longer plan, or different plants. The “Your plants” list above says why each one has no window.</p></div>'
      : '<div class="empty"><h3>Nothing to schedule yet</h3><p>Pick some plants above and your plan appears here.</p></div>';
  }
  else if (S.tab === 'calendar') body = tabCalendar();
  else if (S.tab === 'site') body = tabSite();
  else if (S.tab === 'advisor') body = tabAdvisor();
  else if (S.tab === 'care') body = tabCare();
  else if (S.tab === 'trees') body = tabTrees();
  else if (S.tab === 'shop') body = tabShop();
  else if (S.tab === 'track') body = tabTrack();
  else body = tabNotes();
  $('#results').innerHTML = '<div class="tabbody" role="tabpanel">' + body + '</div>';
  if (S.tab === 'site') afterSite();
  if (S.tab === 'trees') afterTrees();
  restoreFocus(_fd);
}

/* ---- calendar ---- */
function eventNote(e){
  const c = CROP_BY_ID[e.cropId];
  if (e.kind === 'plant' && coldHold(c) && e.t <= OFF + 6) return '<span class="tag warn">cold snap forecast — hold or cover</span>';
  if (e.kind === 'sow' && e.t < OFF && /^Buy/.test(e.text)) return '<span class="tag">too late to raise from seed — buy seedlings</span>';
  return '';
}
function agenda(){
  const from = OFF - 21, to = OFF + 45;
  const evs = R.ev.filter(e => e.t >= from && e.t <= to && e.kind !== 'harvest' || (e.kind === 'harvest' && e.t >= OFF && e.t <= to));
  const done = e => { const p = S.prog[e.key]; return p && ((e.kind === 'plant' && (p.s >= 1 || p.a)) || (e.kind === 'sow' && (p.s >= 1 || p.a))); };
  if (!evs.length) return '<p class="muted">Nothing due in the next six weeks.</p>';
  return '<ul class="agenda">' + evs.slice(0, 16).map(e => {
    const c = CROP_BY_ID[e.cropId], d = done(e), late = e.t < OFF && !d && e.kind === 'plant';
    const it = R.items.find(i => i.key === e.key), zn = it ? zoneName(it.zoneId) : '';
    return '<li class="' + (d ? 'done' : '') + (late ? ' late' : '') + '">' +
      (e.kind === 'plant' ? '<input type="checkbox" ' + (d ? 'checked' : '') + ' data-act="donePlant" data-key="' + esc(e.key) + '" data-t="' + e.t + '" aria-label="Mark ' + esc(e.text) + ' as done">' : '<span class="nb"></span>') +
      '<span class="dt">' + fmtT(e.t, true) + '</span><span class="tx">' + sw(c) + esc(cap(e.text)) + (e.r ? ' <em>(round ' + (e.r + 1) + ')</em>' : '') + (zn ? ' <em>· ' + esc(zn) + '</em>' : '') + '</span>' + eventNote(e) + (late ? '<span class="tag warn">overdue</span>' : '') + '</li>';
  }).join('') + '</ul>';
}
function careDueLine(){
  const n = careDueNow();
  return n ? '<p class="careline"><b>' + plural(n, 'care job') + '</b> due now — feeding, watering or soil prep. <button class="lnk" type="button" data-act="tab" data-t="care">Open the Care tab</button></p>' : '';
}
function tabCalendar(){
  return '<div class="two"><div><h3>Next six weeks</h3>' + agenda() + careDueLine() + '</div><div class="legendbox"><h3>Reading the calendar</h3><p class="lg"><span class="key nur"></span> raising seedlings</p><p class="lg"><span class="key grow"></span> growing</p><p class="lg"><span class="key harv"></span> harvesting / flowering</p><p class="lg"><span class="key harv caution"></span> hot-spell risk at harvest</p><p class="lg"><span class="key noroom"></span> doesn’t fit your space</p><p class="muted">Tap any bar for the detail, weather notes, soil prep and to log what you actually planted.</p></div></div>' + gantt() + detailPanel();
}
function gantt(){
  const t0 = OFF - (dateOfT(OFF).getUTCDate() - 1), t1 = t0 + Math.min(S.hor + 75, 540), span = t1 - t0;
  const P = t => clamp((t - t0) / span * 100, 0, 100);
  let head = '', grid = '';
  for (let t = t0; t < t1; t++){ const d = dateOfT(t); if (d.getUTCDate() === 1){ let nt = t + 1; while (nt < t1 && dateOfT(nt).getUTCDate() !== 1) nt++;
    head += '<span class="mh" style="left:' + P(t) + '%;width:' + (P(nt) - P(t)) + '%">' + MONTHS[d.getUTCMonth()] + (d.getUTCMonth() === 0 ? ' ' + String(d.getUTCFullYear()).slice(2) : '') + '</span>'; grid += '<span class="gd" style="left:' + P(t) + '%"></span>'; } }
  const byE = {}; R.items.forEach(it => (byE[it.entryId] || (byE[it.entryId] = [])).push(it));
  const ids = Object.keys(byE).sort((a, b) => GROUPS[CROP_BY_ID[byE[a][0].cropId].g].slot - GROUPS[CROP_BY_ID[byE[b][0].cropId].g].slot || byE[a][0].p - byE[b][0].p);
  const rows = ids.map(id => {
    const items = byE[id].slice().sort((a, b) => a.p - b.p), c = CROP_BY_ID[items[0].cropId], en = S.entries.find(x => x.id === id);
    const lanes = [];
    const bars = items.map(it => {
      const s0 = it.p - (it.nur || 0) * 7; let lane = 0; while (lanes[lane] != null && lanes[lane] > s0) lane++; lanes[lane] = it.end + 1;
      const seg = (a, b) => [clamp(a, t0, t1), clamp(b, t0, t1)];
      const [ba, bb] = seg(s0, it.end); if (bb <= ba) return '';
      const tot = bb - ba, w = (a, b) => { const [x, y] = seg(a, b); return Math.max(0, (y - x) / tot * 100); };
      const cls = (it.status === 'caution' ? ' caution' : '') + (it.x == null ? ' noroom' : '') + (S.focus === it.key ? ' sel' : '');
      const label = fmtT(it.p) + ' → first harvest ' + fmtT(it.m) + (it.x == null ? ' (no room)' : '');
      return '<button type="button" class="bar' + cls + '" data-act="pick" data-key="' + esc(it.key) + '" style="--c:var(--g' + GROUPS[c.g].slot + ');left:' + P(ba) + '%;width:' + (P(bb) - P(ba)) + '%;top:' + (lane * 18 + 5) + 'px" title="' + esc(c.n + ': ' + label) + '" aria-label="' + esc(c.n + ' round ' + (it.r + 1) + ': ' + label) + '">' +
        '<span class="s nur" style="width:' + w(s0, it.p) + '%"></span><span class="s grow" style="width:' + w(it.p, it.m) + '%"></span><span class="s harv" style="width:' + w(it.m, it.end) + '%"></span></button>';
    }).join('');
    const h = Math.max(30, lanes.length * 18 + 10);
    const sub = [zoneName(items[0].zoneId), items.length > 1 ? plural(items.length, c.mode === 'stag' ? 'sowing' : 'round') : ''].filter(Boolean).join(' · ');
    return '<div class="gr"><div class="gl2">' + sw(c) + '<span>' + esc(c.n) + (en && en.name ? ' <em>' + esc(en.name) + '</em>' : '') + '<small>' + esc(sub) + '</small></span></div><div class="gt" style="height:' + h + 'px">' + bars + '</div></div>';
  }).join('');
  return '<div class="gantt-wrap"><div class="gantt" style="--td:' + P(OFF) + '"><div class="gh"><div class="gl2"></div><div class="gt hd">' + head + '</div></div><div class="ggrid">' + grid + '</div>' + rows + '<div class="today"><span>Today</span></div></div></div>';
}
function notesFor(it){
  const c = CROP_BY_ID[it.cropId], out = [];
  if (S.outlook !== 'neutral'){
    const rs = seasonalAnom(R.C.doy[Math.min(it.m, R.C.N - 1)], R.anchors.r);
    const z = S.zones.find(x => x.id === it.zoneId), covered = z && z.cover !== 'open';
    if (!covered && rs <= -0.4 && c.water >= 2) out.push('Drier than normal expected while it grows — plan on extra watering and mulch (roughly ' + Math.round((R.rainMult - 1) * 100) + '% more than usual).');
    if (!covered && rs >= 0.4 && ['tomato','cherry','tomatodet','paste','cucumber','zucchini','pumpkin','onion','garlic','rockmelon','watermelon'].indexOf(c.id) >= 0) out.push('Wetter than normal expected — watch for blight and mildew; water at the base and give plants air.');
    const mo = R.C.month[it.p];
    if ((S.outlook === 'auto' || S.outlook === 'elnino') && /wind/i.test(CURRENT_OUTLOOK.notes || '') && mo >= 8 && mo <= 11 && !covered && ['tomato','cherry','tomatodet','paste','corn','popcorn','cbean','capsicum','eggplant','cucumber','sunflower','dahlia'].indexOf(c.id) >= 0)
      out.push('A windy spring is expected — stake early and shelter young plants.');
  }
  const n = (R.normalBy[it.entryId] || [])[it.r];
  if (c.warm && n && n.p - it.p >= 4 && it.status !== 'actual') out.push('About ' + (n.p - it.p) + ' days earlier than in a normal year — keep frost cloth or cloches handy for cold snaps' + (/cold outbreak/i.test(CURRENT_OUTLOOK.notes || '') && S.outlook !== 'neutral' ? ' (NIWA expects occasional cold outbreaks this spring)' : '') + '.');
  if (it.flag === 'heat') out.push('Hot-spell risk around harvest — use shade cloth and a heat-tolerant variety.');
  if (it.flag === 'unfinished') out.push('At your actual planting date it may not finish before the season ends — consider cloches.');
  if (it.light === 'shady') out.push('This spot is shadier than it likes: expect slower growth and a smaller crop (about ' + Math.round((it.ymul || 1) * 100) + '% of normal).');
  if (it.light === 'sunny') out.push('This spot gets more sun than it likes: give it afternoon shade cloth and keep the roots cool.');
  if (it.rot) out.push('Follows ' + it.rot.toLowerCase() + ' in the same part of the bed — same plant family, so disease and pests can carry over. Rotate to another bed if you can.');
  if (c.tip) out.push(c.tip);
  return out;
}
function detailPanel(){
  const it = R.items.find(i => i.key === S.focus); if (!it) return '<p class="muted pickhint">Select a bar above for dates, weather notes, soil prep and companion planting.</p>';
  const c = CROP_BY_ID[it.cropId], n = (R.normalBy[it.entryId] || [])[it.r], en = S.entries.find(x => x.id === it.entryId) || {};
  const z = S.zones.find(x => x.id === it.zoneId), prof = FEEDS[c.feed];
  const prog = S.prog[it.key] || {};
  const dm = n ? n.m - it.m : 0;
  const start = it.nur ? (it.how === 'buy' ? 'Buy seedlings about ' + fmtT(it.p - 7, true) + ' (harden off a week)' : fmtT(it.p - it.nur * 7, true) + ' — sow in trays, ' + it.nur + ' weeks before planting out') : '—';
  const isFl = c.g === 'flow';
  const where = z ? esc(z.name) + ' <em>(' + esc(tagText(z)) + ')</em>' : '—';
  const qty = it.plants + ' plants · ' + (z && z.type === 'pots' ? (it.potsUsed ? plural(it.potsUsed, 'pot') : 'no pots free') : round1(it.area) + ' m²') + (c.kg > 0 ? ' · ' + fmtYield(c, it.plants * c.kg * (it.ymul || 1)) : '');
  return '<div class="detail"><div class="dh">' + sw(c) + '<h3>' + esc(entryName(en.crop ? en : { crop: c.id })) + (it.r ? ' <em>round ' + (it.r + 1) + '</em>' : '') + '</h3><button type="button" class="btn ic x" data-act="unpick" aria-label="Close">×</button></div>' +
    '<dl class="dl"><div><dt>' + (it.nur ? 'Start the seed' : 'Get ready') + '</dt><dd>' + start + '</dd></div>' +
    '<div><dt>' + (it.kind === 'direct' ? 'Sow' : 'Plant') + '</dt><dd>' + fmtT(it.p, true) + (it.status === 'actual' ? ' <em>(your date)</em>' : '') + '</dd></div>' +
    '<div><dt>' + (isFl ? 'First blooms' : 'First harvest') + '</dt><dd>' + fmtT(it.m, true) + ' · ' + it.days + ' days' + (n && Math.abs(dm) >= 2 ? ' <em>(' + Math.abs(dm) + ' days ' + (dm > 0 ? 'sooner' : 'later') + ' than a normal year)</em>' : '') + '</dd></div>' +
    '<div><dt>' + (isFl ? 'Flowering window' : 'Harvest window') + '</dt><dd>' + fmtT(it.m) + ' – ' + fmtT(it.end) + '</dd></div>' +
    '<div><dt>Where</dt><dd>' + where + '</dd></div>' +
    '<div><dt>Quantity</dt><dd>' + qty + '</dd></div>' +
    '<div><dt>Spacing</dt><dd>' + esc(c.sp) + '</dd></div>' +
    (z && z.type === 'pots' ? '<div><dt>Pot size</dt><dd>about ' + potNeed(c) + ' L per plant' + (potShare(c) > 1 ? ', up to ' + potShare(c) + ' per pot' : '') + '</dd></div>' : '') +
    (c.comp && c.comp !== '—' ? '<div><dt>Good neighbours</dt><dd>' + esc(c.comp) + '</dd></div>' : '') + (c.avoid && c.avoid !== '—' ? '<div><dt>Keep apart from</dt><dd>' + esc(c.avoid) + '</dd></div>' : '') + '</dl>' +
    '<ul class="notes">' + notesFor(it).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    (c.tt ? '<details class="tomato" open><summary>' + (c.tt === 'det' ? 'Determinate (bush) tomatoes: what to know' : 'Indeterminate (vine) tomatoes: what to know') + '</summary><ul class="notes">' + TOMATO_GUIDE[c.tt].map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></details>' : '') +
    (prof ? '<details class="soil"><summary>Soil prep, feeding and clean-up</summary>' + soilBlock(prof, it) + '</details>' : '') +
    '<div class="log"><label class="fld" for="act-' + esc(it.key) + '">I actually ' + (it.kind === 'direct' ? 'sowed' : 'planted') + ' this on</label><input id="act-' + esc(it.key) + '" type="date" value="' + (prog.a || '') + '" data-bind="actual" data-key="' + esc(it.key) + '"><small class="muted">The harvest window and any follow-on rounds recalculate from your date and the weather.</small></div>' +
    '<div class="detail-notes"><h4>Notes for next year — ' + esc(c.n) + '</h4>' + notesBlock(c.id) + '</div></div>';
}
function soilBlock(prof, it){
  const f = prof.feed;
  return '<p class="hint">Best soil pH ' + esc(prof.ph) + '.</p><h4>Before planting <em>(from ' + fmtT(it.p - 14) + ')</em></h4><ul class="notes">' + prof.pre.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    (f ? '<h4>Feeding</h4><p>' + esc(cap(f.what)) + ' every ' + f.every + ' days, starting about ' + f.from + ' days after planting' + (f.to < 999 ? (f.to <= 0 ? ' and stopping at first harvest' : ' until a couple of weeks into harvest') : ' through the season') + '. ' + esc(f.tip) + '</p>' : '<h4>Feeding</h4><p>No feeding needed.</p>') +
    '<h4>After the crop <em>(from ' + fmtT(it.end) + ')</em></h4><ul class="notes">' + prof.post.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
}

/* ---- shopping ---- */
function tabShop(){
  const sh = R.shop;
  const tot = {}; sh.rows.forEach(r => { tot[r.unit] = (tot[r.unit] || 0) + r.kg; });
  const harvest = Object.keys(tot).filter(u => tot[u] > 0).map(u => u === 'kg' ? Math.round(tot[u]) + ' kg' : Math.round(tot[u]) + ' ' + u).join(' + ') || '—';
  const beds = R.util.filter(u => u.kind === 'bed'), pk = peakAll(beds);
  const weekly = Math.round(pk.used * 25 * R.rainMult);
  const over = R.overflow.length;
  return '<div class="tiles"><div class="tile"><span class="k">Expected harvest</span><span class="v">' + harvest + '</span><span class="s">over the whole plan, typical home-garden yields</span></div>' +
    (beds.length ? '<div class="tile"><span class="k">Peak bed watering</span><span class="v">~' + weekly.toLocaleString('en-NZ') + ' L / week</span><span class="s">about ' + Math.round(25 * R.rainMult) + ' L per m² when it’s busiest' + (R.rainMult > 1.05 ? ' (dry season allowance)' : R.rainMult < 0.95 ? ' (wet season discount)' : '') + '</span></div>' : '') +
    '<div class="tile"><span class="k">Space used at peak</span><span class="v">' + (beds.length ? Math.round(pk.pct * 100) + '%' : '—') + '</span><span class="s">' + (beds.length ? round1(pk.used) + ' of ' + round1(pk.cap) + ' m² of beds' : 'no beds') + (R.util.some(u => u.kind === 'pots') ? ' · ' + R.util.filter(u => u.kind === 'pots').reduce((s, u) => s + peakUse(u.series).used, 0) + ' pots at peak' : '') + '</span></div></div>' +
    (over ? '<p class="warn">' + plural(over, 'planting') + ' that don’t fit your space are left off this list.</p>' : '') +
    '<div class="scrollx"><table class="t shoptbl"><thead><tr><th>Plant</th><th class="num">Plants</th><th>Buy</th><th class="num">Yield</th></tr></thead><tbody>' +
    sh.rows.map(r => '<tr><td>' + sw(CROP_BY_ID[r.id]) + esc(r.name) + (r.rounds > 1 ? ' <em>× ' + r.rounds + ' rounds</em>' : '') + '</td><td class="num">' + r.plants + '</td><td>' + esc(r.buy) + '<br><small class="muted">' + esc(r.extra) + '</small></td><td class="num">' + (r.kg > 0 ? '~' + r.kg + ' ' + r.unit : '—') + '</td></tr>').join('') + '</tbody></table></div>' +
    '<h3>Supplies</h3><ul class="sup">' + sh.supplies.map(s => '<li><span>' + esc(s.name) + '</span><b>' + esc(String(s.qty)) + '</b></li>').join('') + '</ul>' +
    '<div class="actions"><button class="btn" data-act="copyList" type="button">Copy list to clipboard</button><button class="btn" data-act="print" type="button">Print plan</button></div>';
}

/* ---- tracker ---- */
const STAGES = ['Planned', 'In the ground', 'Harvesting', 'Finished'];
function tabTrack(){
  const items = R.items.filter(i => i.x != null).sort((a, b) => a.p - b.p);
  const done = items.filter(i => (S.prog[i.key] || {}).s === 3).length;
  const inG = items.filter(i => { const s = (S.prog[i.key] || {}).s; return s === 1 || s === 2; }).length;
  const rows = items.map(it => {
    const c = CROP_BY_ID[it.cropId], p = S.prog[it.key] || { s: 0 }, en = S.entries.find(x => x.id === it.entryId) || {};
    return '<tr><td>' + sw(c) + esc(c.n) + (en.name ? ' <em>' + esc(en.name) + '</em>' : '') + (it.r ? ' <em>round ' + (it.r + 1) + '</em>' : '') + '<br><small class="muted">' + esc(zoneName(it.zoneId)) + '</small></td><td>' + fmtT(it.p, true) + (it.status === 'actual' ? ' <em>(yours)</em>' : '') + '</td><td>' + fmtT(it.m) + ' – ' + fmtT(it.end) + '</td>' +
      '<td><input type="date" value="' + (p.a || '') + '" data-bind="actual" data-key="' + esc(it.key) + '" aria-label="Actual planting date for ' + esc(c.n) + '"></td>' +
      '<td><select data-bind="stage" data-key="' + esc(it.key) + '" aria-label="Status of ' + esc(c.n) + '">' + STAGES.map((s, i) => '<option value="' + i + '"' + ((p.s || 0) === i ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></td></tr>';
  }).join('');
  return '<div class="prog"><div class="bar2"><span style="width:' + (items.length ? Math.round(done / items.length * 100) : 0) + '%"></span></div><p><b>' + done + '</b> of ' + items.length + ' plantings finished · <b>' + inG + '</b> growing now</p></div>' +
    '<p class="muted">Enter the date you actually planted something and the planner re-works the harvest window and any follow-on rounds from that date and the weather. Everything is saved in this browser.</p>' +
    '<div class="scrollx"><table class="t"><thead><tr><th>Plant</th><th>Planned</th><th>Harvest window</th><th>Actual date</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="actions"><button class="btn" data-act="resetProg" type="button">Clear tracker</button></div>';
}

/* ---------------- main ---------------- */
function renderMain(){
  syncSidebar(); renderGardenBar(); renderTopNav();
  const sm = $('#sideSum'); if (sm) sm.textContent = 'Settings · ' + R.loc.name;
  renderBriefing(); renderCrops(); renderResults();
}

/* ---------------- events ---------------- */
/* If you type in a field and then press a button, the field's change event re-draws the page between mouse-down and
   mouse-up and the browser drops the click. Remember what was pressed and replay it on the re-drawn button. */
let PRESS = null;
document.addEventListener('pointerdown', ev => {
  const el = ev.target.closest && ev.target.closest('[data-act]');
  PRESS = el ? { el, at: Date.now(), a: el.dataset.act, sel: '[data-act="' + el.dataset.act + '"]' + Object.keys(el.dataset).filter(k => k !== 'act').map(k => '[data-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()) + '="' + CSS.escape(String(el.dataset[k])) + '"]').join('') } : null;
}, true);
document.addEventListener('pointerup', ev => {
  const p = PRESS; if (!p) return; PRESS = null;
  if (p.el.isConnected || Date.now() - p.at > 1500) return;
  let el = null; try { el = document.querySelector(p.sel); } catch(e){}
  if (el && ACT[p.a]) ACT[p.a](el, ev);
});
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, fn = ACT[a];
  if (fn){ fn(el, ev); return; }
});
document.addEventListener('change', ev => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  /* wait a tick so focus has moved on (e.g. Tab to the next field) before the page is re-drawn */
  setTimeout(() => bind(el, false), 0);
});
document.addEventListener('input', ev => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  if (el.dataset.bind === 'viewT' || el.dataset.bind === 'tweak' || el.dataset.bind === 'bgop') bind(el, true);
});
function bind(el, live){
  const k = el.dataset.bind, v = el.type === 'checkbox' ? el.checked : el.value;
  if (BIND[k]){ BIND[k](el, v, live); return; }
  const n = parseFloat(v);
  if (k === 'tweak'){ if (isNaN(n)) return; S.tweak = n; $('#tweakOut').textContent = n === 0 ? 'none' : signed(n, ' °C'); if (live){ clearTimeout(bind.t); bind.t = setTimeout(update, 120); return; } update(); return; }
  if (k === 'hor'){ S.hor = +v; S.viewT = null; update(); return; }
  if (k === 'soilNow'){ S.soilNow = v; update(); return; }
  S[k] = v; if (k === 'outlook') S.viewT = null; update();
}
BIND.region = (el, v) => { if (v === '__place') return; S.place = null; S.region = v; refreshLive(false); update(); };
BIND.eqty = (el, v) => { const e = S.entries.find(x => x.id === el.dataset.id); if (!e) return; e.qty = Math.max(1, Math.min(999, parseInt(v, 10) || 1)); update(); };
BIND.ezone = (el, v) => { const e = S.entries.find(x => x.id === el.dataset.id); if (!e) return; e.zone = v; update(); };
BIND.ehow = (el, v) => { const e = S.entries.find(x => x.id === el.dataset.id); if (!e) return; e.how = v; update(); };
BIND.ename = (el, v) => { const e = S.entries.find(x => x.id === el.dataset.id); if (!e) return; e.name = v.trim().slice(0, 40); update(); };
BIND.actual = (el, v) => { const p = S.prog[el.dataset.key] || (S.prog[el.dataset.key] = { s: 0 }); if (v){ p.a = v; p.s = Math.max(p.s || 0, 1); } else delete p.a; update(); };
BIND.stage = (el, v) => { const p = S.prog[el.dataset.key] || (S.prog[el.dataset.key] = { s: 0 }); p.s = +v; update(); };

const stepFor = c => c.def >= 30 ? 10 : c.def >= 10 ? 2 : 1;
ACT.toggle = el => {
  const id = el.dataset.id, c = CROP_BY_ID[id]; if (!c) return;
  const have = S.entries.filter(e => e.crop === id);
  if (have.length){ S.entries = S.entries.filter(e => e.crop !== id); }
  else S.entries.push({ id: uid('e'), crop: id, qty: c.def, zone: 'auto', how: 'auto', name: '' });
  update();
};
ACT.inc = el => { const e = S.entries.find(x => x.id === el.dataset.id); if (e){ e.qty += stepFor(CROP_BY_ID[e.crop]); update(); } };
ACT.dec = el => { const e = S.entries.find(x => x.id === el.dataset.id); if (e){ e.qty = Math.max(1, e.qty - stepFor(CROP_BY_ID[e.crop])); update(); } };
ACT.remove = el => { S.entries = S.entries.filter(x => x.id !== el.dataset.id); update(); };
ACT.edup = el => { const e = S.entries.find(x => x.id === el.dataset.id); if (e){ S.entries.splice(S.entries.indexOf(e) + 1, 0, { id: uid('e'), crop: e.crop, qty: e.qty, zone: 'auto', how: e.how || 'auto', name: '' }); update(); } };
ACT.starter = () => { S.entries = starterEntries(); update(); };
ACT.clear = () => { S.entries = []; update(); };
ACT.tab = el => { S.tab = el.dataset.t; renderTopNav(); renderResults(); saveState(); };
ACT.pick = el => { S.focus = el.dataset.key === S.focus ? null : el.dataset.key; renderResults(); const d = $('.detail'); if (d && S.focus) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); saveState(); };
ACT.unpick = () => { S.focus = null; renderResults(); };
ACT.fit = () => { S.fit = true; update(); };
ACT.unfit = () => { S.fit = false; update(); };
ACT.search = () => doSearch();
ACT.pickPlace = el => { const p = PLACES[+el.dataset.i]; if (p){ S.place = p; $('#placeRes').innerHTML = ''; $('#placeQ').value = ''; refreshLive(false); update(); } };
ACT.refresh = () => { refreshLive(true); refreshOutlook(); };
ACT.donePlant = el => { const key = el.dataset.key, t = +el.dataset.t; const p = S.prog[key] || (S.prog[key] = { s: 0 });
  if (el.checked){ p.s = Math.max(p.s || 0, 1); p.a = isoOfT(Math.min(t, OFF)); } else { p.s = 0; delete p.a; } update(); };
ACT.resetProg = () => { if (confirm('Clear all tracker progress and actual dates?')){ S.prog = {}; update(); } };
ACT.copyList = el => copyList(el);
ACT.print = () => window.print();

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
  const lines = ['Total Garden Planner 4000 — shopping list (' + S.name + ', ' + R.loc.name + ')', ''];
  R.shop.rows.forEach(r => lines.push('• ' + r.name + ': ' + r.buy + ' (' + r.extra + ')'));
  lines.push('', 'Supplies'); R.shop.supplies.forEach(s => lines.push('• ' + s.name + ': ' + s.qty));
  const txt = lines.join('\n');
  const done = () => { const o = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => btn.textContent = o, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => {}); else done();
}

/* garden bar actions */
ACT.garden = el => { if (el.dataset.id !== STORE.cur) useGarden(el.dataset.id); };
