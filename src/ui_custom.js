/* ============================================================
   UI CUSTOM — dialogs: gardens (add, rename, share, import), your own crops, incoming share links; boot
   ============================================================ */
function openDlg(html, cls){
  const d = $('#dlg'); d.className = cls || ''; d.innerHTML = '<div class="dlg-in">' + html + '</div>';
  if (!d.open){ if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
}
function closeDlg(){ const d = $('#dlg'); if (d.open){ if (d.close) d.close(); else d.removeAttribute('open'); } d.innerHTML = ''; }
ACT.dlgclose = closeDlg;
(function(){
  const d = $('#dlg'); if (!d) return;
  d.addEventListener('click', ev => { if (ev.target === d) closeDlg(); });
  d.addEventListener('close', () => { d.innerHTML = ''; });
})();
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'garden';
function downloadJson(name, obj){
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const dlgMsg = t => { const m = $('#dlgmsg'); if (m) m.textContent = t; };

/* ================= gardens ================= */
function gmanageHtml(msg){
  const only = STORE.order.length < 2;
  return '<div class="card-h"><h2>Your gardens</h2><button type="button" class="btn ic x" data-act="dlgclose" aria-label="Close">×</button></div>' +
    '<p class="muted">Each garden has its own place, spaces, plants, care log and notes — use one for each house, plot or friend. Switch between them with the tabs above the plan.</p>' +
    '<label class="fld" for="gname">Name of this garden</label><div class="row"><input id="gname" type="text" maxlength="40" value="' + esc(S.name) + '"><button type="button" class="btn" data-act="grename">Rename</button></div>' +
    '<div class="row wrap" style="margin-top:.6rem"><button type="button" class="btn" data-act="gdup">Duplicate it</button><button type="button" class="btn danger" data-act="gdel"' + (only ? ' disabled title="You need at least one garden"' : '') + '>Delete this garden</button></div>' +
    '<h3 class="sub">Share or back up</h3>' +
    '<p class="hint">A share link or file carries this garden’s spaces, plants, notes and any custom crops. Care logs and progress stay with you. Your photo only travels in the downloaded file.</p>' +
    '<div class="row wrap"><button type="button" class="btn primary" data-act="gshare">Make a share link</button><button type="button" class="btn" data-act="gexport">Download this garden</button><button type="button" class="btn" data-act="gexportall">Download all gardens</button></div>' +
    '<div id="sharebox"></div>' +
    '<h3 class="sub">Import</h3>' +
    '<p class="hint">Bring in a garden from a file or a link that someone sent you. It’s added as a <b>new</b> garden — nothing you already have is changed.</p>' +
    '<div class="row wrap"><label class="btn filebtn">Choose a garden file<input id="impfile" type="file" accept=".json,application/json" hidden></label></div>' +
    '<label class="fld" for="implink">…or paste a share link</label><div class="row"><input id="implink" type="text" placeholder="https://…#share=…" autocomplete="off"><button type="button" class="btn" data-act="gimport">Import</button></div>' +
    '<p id="dlgmsg" class="hint" role="status">' + esc(msg || '') + '</p>' +
    '<div class="row end"><button type="button" class="btn primary" data-act="dlgclose">Done</button></div>';
}
ACT.gmanage = () => openDlg(gmanageHtml());
ACT.grename = () => { const v = $('#gname').value.trim().slice(0, 40); if (!v) return; S.name = v; update(); dlgMsg('Renamed.'); };
ACT.gdup = () => { const g = duplicateGarden(S.id, false); if (!g) return; useGarden(g.id); openDlg(gmanageHtml('Duplicated as “' + g.name + '”. It has the same spaces and plants, with a fresh care log.')); };
ACT.gdel = () => {
  if (STORE.order.length < 2) return;
  if (!confirm('Delete “' + S.name + '” for good? Export it first if you might want it back.')) return;
  deleteGarden(S.id); useGarden(STORE.cur); closeDlg();
};
ACT.gexport = () => { downloadJson('garden-' + slug(S.name) + '-' + isoToday() + '.json', exportGarden(S.id)); dlgMsg('Downloaded. Keep the file somewhere safe, or send it to a friend to import.'); };
ACT.gexportall = () => { downloadJson('all-gardens-' + isoToday() + '.json', exportAll()); dlgMsg('Downloaded every garden in one file.'); };
ACT.gshare = async () => {
  try {
    const code = await packShare(exportGarden(S.id, { share: true }));
    const url = location.href.split('#')[0] + '#share=' + code;
    const box = $('#sharebox');
    box.innerHTML = '<label class="fld" for="sharelink">Share link (' + Math.round(url.length / 1000) + ' KB)</label><div class="row"><input id="sharelink" type="text" readonly value="' + esc(url) + '"><button type="button" class="btn" data-act="gcopy">Copy</button></div>' +
      (url.length > 8000 ? '<p class="hint warn">This link is long — some chat apps cut long links. If it doesn’t open, send the downloaded file instead.</p>' : '<p class="hint">Anyone who opens this link can add a copy of the garden. They can’t change yours.</p>');
    const inp = $('#sharelink'); inp.focus(); inp.select();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => dlgMsg('Link copied to the clipboard.'), () => dlgMsg('Select the link and copy it.'));
  } catch(e){ dlgMsg('Couldn’t make a link: ' + e.message); }
};
ACT.gcopy = () => { const inp = $('#sharelink'); if (!inp) return; inp.focus(); inp.select(); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).then(() => dlgMsg('Copied.'), () => dlgMsg('Select the link and copy it.')); else { try { document.execCommand('copy'); dlgMsg('Copied.'); } catch(e){} } };
function doImport(payload){
  const before = STORE.order.length, g = importPayload(payload);
  useGarden(g.id);
  return g;
}
ACT.gimport = async () => {
  const raw = ($('#implink').value || '').trim(); if (!raw){ dlgMsg('Paste a link first, or choose a file.'); return; }
  try {
    const m = /share=([A-Za-z0-9_\-]+)/.exec(raw);
    const p = m ? await unpackShare(m[1]) : JSON.parse(raw);
    const g = doImport(p); openDlg(gmanageHtml('Added “' + g.name + '”. You’re looking at it now.'));
  } catch(e){ dlgMsg('That didn’t work: ' + e.message); }
};
document.addEventListener('change', async ev => {
  if (!ev.target || ev.target.id !== 'impfile') return;
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  try {
    const p = JSON.parse(await f.text()), g = doImport(p);
    openDlg(gmanageHtml('Added “' + g.name + '”' + (p.format === 'tgp4000-all' ? ' (and the other gardens in the file)' : '') + '. You’re looking at it now.'));
  } catch(e){ dlgMsg('That didn’t work: ' + (e instanceof SyntaxError ? 'the file isn’t valid JSON.' : e.message)); }
});

/* new garden */
ACT.gnew = () => {
  const regionOpts = ['North Island', 'South Island'].map(isl => '<optgroup label="' + isl + '">' + REGIONS.filter(r => r.isl === isl).map(r => '<option value="' + r.id + '">' + esc(r.name) + '</option>').join('') + '</optgroup>').join('');
  openDlg('<div class="card-h"><h2>Add a garden</h2><button type="button" class="btn ic x" data-act="dlgclose" aria-label="Close">×</button></div>' +
    '<p class="muted">A separate garden for another house, plot, the glasshouse, or the flower beds out the front.</p>' +
    '<form id="gnewform" onsubmit="return false"><label class="fld" for="gn-name">Name</label><input id="gn-name" type="text" maxlength="40" placeholder="e.g. Christchurch glasshouse" autofocus>' +
    '<label class="fld" for="gn-where">Where is it?</label><select id="gn-where"><option value="same">Same place as “' + esc(S.name) + '” (' + esc(R.loc.name) + ')</option>' + regionOpts + '</select>' +
    '<fieldset class="radios"><legend class="fld">Start with</legend>' +
    '<label class="chk"><input type="radio" name="gn-start" value="bed" checked> One blank bed (edit it on the Site plan)</label>' +
    '<label class="chk"><input type="radio" name="gn-start" value="blank"> Nothing — I’ll draw my own spaces</label>' +
    '<label class="chk"><input type="radio" name="gn-start" value="copy"> A copy of this garden’s spaces (no plants)</label></fieldset></form>' +
    '<div class="row end"><button type="button" class="btn" data-act="dlgclose">Cancel</button><button type="button" class="btn primary" data-act="gcreate">Create garden</button></div>');
  setTimeout(() => { const i = $('#gn-name'); if (i) i.focus(); }, 30);
};
ACT.gcreate = () => {
  const name = ($('#gn-name').value || '').trim() || 'New garden', where = $('#gn-where').value, start = ($('#gnewform input[name=gn-start]:checked') || {}).value || 'bed';
  const src = S;
  const g = addGarden(name, { blank: start === 'blank' });
  if (where !== 'same'){ g.region = where; g.place = null; }
  if (start === 'copy'){
    g.zones = clone(src.zones).map(z => Object.assign(z, { id: uid('z') })); g.plan = clone(src.plan);
    const bg = bgGet(src.id); if (bg) bgSet(g.id, bg);
  }
  g.tab = start === 'bed' ? 'calendar' : 'site';
  closeDlg(); useGarden(g.id);
};

/* ================= share links that arrive in the address bar ================= */
let PENDING_SHARE = null;
async function handleShareHash(){
  const m = /^#share=([A-Za-z0-9_\-]+)$/.exec(location.hash); if (!m) return;
  try {
    const p = await unpackShare(m[1]);
    if (!p || p.format !== 'tgp4000-garden' || !p.garden) throw new Error('That link doesn’t contain a garden.');
    PENDING_SHARE = p;
    const g = p.garden, nz = (g.zones || []).length, ne = (g.entries || []).length, nt = (g.trees || []).length, nc = (p.custom || []).length;
    const pl = g.place ? g.place.name : ((REGIONS.find(r => r.id === g.region) || {}).name || '');
    openDlg('<h2>Someone shared a garden with you</h2><p><b>' + esc(g.name || 'A garden') + '</b>' + (pl ? ' — ' + esc(pl) : '') + '</p>' +
      '<p class="muted">' + plural(nz, 'space') + ', ' + plural(ne, 'plant') + (nt ? ', ' + plural(nt, 'tree or vine') : '') + (nc ? ', ' + plural(nc, 'custom crop') : '') + '. It’s added as a new garden here — nothing you already have is changed, and your edits don’t affect the original.</p>' +
      '<div class="row end"><button type="button" class="btn" data-act="shareno">No thanks</button><button type="button" class="btn primary" data-act="shareyes">Add to my gardens</button></div>');
  } catch(e){
    openDlg('<h2>That link didn’t work</h2><p class="muted">' + esc(e.message) + ' Ask for a fresh link, or for the garden as a file (you can import it from “Rename · share · import”).</p><div class="row end"><button type="button" class="btn primary" data-act="shareno">OK</button></div>');
  }
}
function clearHash(){ try { history.replaceState(null, '', location.pathname + location.search); } catch(e){ location.hash = ''; } }
ACT.shareyes = () => { try { const g = doImport(PENDING_SHARE); PENDING_SHARE = null; clearHash(); closeDlg(); if (g) { g.tab = 'calendar'; update(); } } catch(e){ openDlg('<h2>Couldn’t add it</h2><p class="muted">' + esc(e.message) + '</p><div class="row end"><button type="button" class="btn primary" data-act="dlgclose">OK</button></div>'); } };
ACT.shareno = () => { PENDING_SHARE = null; clearHash(); closeDlg(); };

/* ================= your own crops ================= */
const KINDS = { direct: 'Sow seed straight into the ground', seedling: 'Raise seedlings (or buy them) and plant out', tuber: 'Plant tubers or seed potatoes', clove: 'Plant cloves', bulb: 'Plant bulbs, corms or tubers', slip: 'Plant slips or runners' };
const FAMILIES = { solanum: 'Tomato family (tomato, potato, capsicum)', cucurbit: 'Cucumber family (pumpkin, melon)', legume: 'Legumes (peas, beans)', leafy: 'Leafy greens', brassica: 'Brassicas', root: 'Root crops', allium: 'Onion family', herb: 'Herbs', flower: 'Flowers', grass: 'Grasses (corn)', beet: 'Beet family', umbel: 'Carrot family', bindweed: 'Kumara', aster: 'Daisy family (sunflowers, zinnias)' };
const UNITS = ['kg', 'stems', 'blooms', 'heads', 'bunches', 'pieces'];
const CROP_NUM = ['hcm', 'd', 'span', 'pm', 'kg', 'def', 'gap', 'max', 'nur', 'tb', 'rt', 'minSoil', 'fb', 'hmax', 'endT', 'slow', 'potL', 'water', 'lt', 'minShade', 'tray', 'sow', 'pack'];
const CROP_TXT = ['n', 'g', 'kind', 'u', 'mode', 'feed', 'fam', 'bot', 'tt', 'bunit', 'per', 'sp', 'comp', 'avoid', 'tip'];
const BLANK_CROP = { n: '', g: 'leaf', kind: 'direct', d: 60, span: 30, warm: 0, pm: 9, kg: 0.2, u: 'kg', def: 6, mode: 'seq', max: 1, water: 2, tb: 4, rt: 14, minSoil: 6, hmax: 20, lt: 1 };
const WARM_DEF = { tb: 10, rt: 18, minSoil: 14, fb: 10, hmax: '' }, COOL_DEF = { tb: 4, rt: 14, minSoil: 6, fb: '', hmax: 20 };
const fld = (label, inner, hint) => '<div><label class="fld">' + label + '</label>' + inner + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
const inp = (name, type, extra) => '<input name="' + name + '" type="' + type + '" ' + (extra || '') + '>';
const sel = (name, map) => '<select name="' + name + '">' + Object.keys(map).map(k => '<option value="' + esc(k) + '">' + esc(map[k]) + '</option>').join('') + '</select>';

function cropFormHtml(mode, c){
  const groupMap = {}; Object.keys(GROUPS).forEach(k => groupMap[k] = GROUPS[k].name);
  const feedMap = { '': 'Automatic (by type)' }; Object.keys(FEEDS).forEach(k => feedMap[k] = FEEDS[k].name);
  const famMap = { '': 'Automatic (by type)' }; Object.keys(BOT).forEach(k => famMap[k] = BOT[k].n.replace(/ \(.*$/, '') + (BOT[k].n.indexOf('(') >= 0 ? ' — ' + BOT[k].n.replace(/^.*\(/, '').replace(/\)$/, '') : ''));
  const tmpl = '<option value="">— none, start blank —</option>' + Object.keys(GROUPS).map(g => '<optgroup label="' + esc(GROUPS[g].name) + '">' + CROPS.filter(x => x.g === g).map(x => '<option value="' + esc(x.id) + '">' + esc(x.n) + '</option>').join('') + '</optgroup>').join('');
  const months = MONTHS.map((m, i) => '<label class="mchk"><input type="checkbox" name="mo" value="' + (i + 1) + '" checked>' + m + '</label>').join('');
  const title = mode === 'new' ? 'Add your own plant' : 'Settings for ' + esc(c.n);
  return '<form class="cropform" id="cropform" data-mode="' + mode + '" data-id="' + esc(c && c.id || '') + '" onsubmit="return false">' +
    '<div class="card-h"><h2>' + title + '</h2><button type="button" class="btn ic x" data-act="dlgclose" aria-label="Close">×</button></div>' +
    '<p class="muted">' + (mode === 'new' ? 'Tell the planner what the seed packet or plant label says. It works out when to plant and when you’ll harvest — separately for each of your spaces — from your local weather.' : (c.custom ? 'This is your own plant. Change anything and the plan updates.' : 'You’re changing a built-in plant for every garden on this device. Reset it any time to go back to the original.')) + '</p>' +
    (mode === 'new' ? '<div class="tmpl">' + fld('Start from a similar plant <em>(optional, fills in sensible numbers)</em>', '<select name="_tmpl">' + tmpl + '</select>') + '</div>' : '') +
    '<div class="grid2">' + fld('Name', inp('n', 'text', 'maxlength="40" required placeholder="e.g. Butternut squash"')) + fld('What kind of plant is it?', sel('g', groupMap), 'Sets the colour and default feeding.') + '</div>' +
    '<div class="grid2">' + fld('How is it started?', sel('kind', KINDS)) + fld('Weeks raising seedlings before planting out', inp('nur', 'number', 'min="0" max="16" step="1"'), 'Only for seedlings; 0 if you sow straight in.') + '</div>' +
    '<div class="grid2">' + fld('Days from planting (or sowing) to first harvest', inp('d', 'number', 'min="7" max="900" step="1" required'), 'From the seed packet — for a warm, normal-weather spell.') + fld('How long the harvest lasts (days)', inp('span', 'number', 'min="1" max="400" step="1"'), 'Also how long the space stays occupied.') + '</div>' +
    '<label class="chk"><input type="checkbox" name="warm"> Frost-tender — wait until frosts have passed and the soil is warm</label>' +
    '<div class="grid3">' + fld('Plants per m²', inp('pm', 'number', 'min="0.1" max="400" step="any"'), 'Spacing: 100 ÷ (row gap cm × plant gap cm) × 100.') + fld('Harvest per plant', inp('kg', 'number', 'min="0" step="any"')) + fld('Measured in', sel('u', Object.fromEntries(UNITS.map(u => [u, u])))) + '</div>' +
    '<div class="grid3">' + fld('Usual number to grow', inp('def', 'number', 'min="1" max="999" step="1"')) + fld('Sowing pattern', sel('mode', { seq: 'One planting, then a follow-on', stag: 'Sow a little every few weeks' })) + fld('Most rounds / sowings', inp('max', 'number', 'min="1" max="12" step="1"')) + '</div>' +
    '<div class="grid3" id="gapwrap">' + fld('Days between sowings', inp('gap', 'number', 'min="7" max="120" step="1"')) + fld('Light it wants', sel('minShade', { 0: 'Full sun', 1: 'Some shade', 2: 'Shade' }), 'Sunnier than this cuts yield.') + fld('Shadiest it copes with', sel('lt', { 0: 'Full sun only', 1: 'Part shade', 2: 'Shade' })) + '</div>' +
    '<div class="grid3">' + fld('Water needs', sel('water', { 1: 'Low', 2: 'Medium', 3: 'High' })) + fld('Pot size per plant (litres)', inp('potL', 'number', 'min="1" max="200" step="1"'), 'Leave blank if it isn’t suited to pots.') + fld('Feeding &amp; soil', sel('feed', feedMap)) + '</div>' +
    '<div class="grid2">' + fld('Plant family', sel('bot', famMap), 'Used for rotation and companion advice (crops in the same family share pests and diseases).') + fld('Height when grown (cm)', inp('hcm', 'number', 'min="5" max="400" step="5"'), 'Tall plants (over 120 cm) shade shorter ones to their south.') + '</div>' +
    fld('Spacing note', inp('sp', 'text', 'maxlength="120" placeholder="e.g. 30 cm apart, rows 60 cm"')) +
    '<div class="grid2">' + fld('Good companions', inp('comp', 'text', 'maxlength="120"')) + fld('Keep away from', inp('avoid', 'text', 'maxlength="120"')) + '</div>' +
    fld('Growing tip', '<textarea name="tip" rows="2" maxlength="400" placeholder="Anything worth remembering about growing this"></textarea>') +
    '<details class="fold"><summary>Fine-tuning (temperatures, months, more)</summary><div class="grid3">' +
      fld('Lowest growing temperature (°C)', inp('tb', 'number', 'min="0" max="20" step="0.5"'), 'Growth stops below this.') + fld('Typical temperature for the days-to-harvest', inp('rt', 'number', 'min="5" max="30" step="0.5"'), 'The mean temperature that the packet’s days assume.') + fld('Soil warmth to go in (°C)', inp('minSoil', 'number', 'min="0" max="30" step="0.5"')) +
      fld('Days after last frost before planting out', inp('fb', 'number', 'min="-60" max="60" step="1"'), 'Blank for hardy plants.') + fld('Too hot above (°C mean)', inp('hmax', 'number', 'min="10" max="35" step="0.5"'), 'Cool-season plants bolt above this. Blank for heat-lovers.') + fld('Stops growing below (°C)', inp('endT', 'number', 'min="0" max="20" step="0.5"'), 'Warm crops: autumn cut-off.') +
      fld('Latest it can take', inp('slow', 'number', 'min="1" max="3" step="0.05"'), 'Multiplier on the packet’s days before it’s judged “too slow”.') + fld('Weeks in trays if you choose to raise it', inp('tray', 'number', 'min="1" max="16" step="1"'), 'For plants normally sown straight in.') + fld('Tomato-type habit', sel('tt', { '': 'Not a tomato', ind: 'Indeterminate (vine)', det: 'Determinate (bush)' })) +
    '</div><div class="grid3"><div><label class="fld">Count as “units” called</label>' + inp('bunit', 'text', 'maxlength="14" placeholder="bulbs, tubers…"') + '</div><div><label class="fld">Seeds or plants per packet</label>' + inp('pack', 'number', 'min="1" max="5000" step="1"') + '</div><div><label class="fld">Amount label</label>' + inp('per', 'text', 'maxlength="20" placeholder="per sowing"') + '</div></div>' +
    '<label class="chk"><input type="checkbox" name="pots"> Especially good in pots</label><label class="chk"><input type="checkbox" name="dsow"> Can be sown straight into the ground as well (for plants usually raised in trays)</label>' +
    '<p class="fld" style="margin-top:.8rem">Months it can go in <em>(untick to restrict; all ticked means any month)</em></p><div class="months">' + months + '</div></details>' +
    '<div id="cropprev" class="prev" aria-live="polite"></div>' +
    '<p id="dlgmsg" class="warn" role="alert"></p>' +
    '<div class="row end wrap">' +
      (mode === 'edit' && c.custom ? '<button type="button" class="btn danger" data-act="cropdel" data-id="' + esc(c.id) + '">Delete this plant</button>' : '') +
      (mode === 'edit' && !c.custom && c.edited ? '<button type="button" class="btn" data-act="cropreset" data-id="' + esc(c.id) + '">Reset to the original</button>' : '') +
      '<span class="sp"></span><button type="button" class="btn" data-act="dlgclose">Cancel</button><button type="button" class="btn primary" data-act="cropsave">' + (mode === 'new' ? 'Add to my plants' : 'Save changes') + '</button></div></form>';
}
function fillCropForm(f, c){
  const set = (name, v) => {
    const el = f.elements[name]; if (!el) return;
    if (el.type === 'checkbox'){ el.checked = !!v; return; }
    if (el.tagName === 'SELECT' && v != null && v !== '' && !Array.from(el.options).some(o => o.value === String(v))){ const o = document.createElement('option'); o.value = String(v); o.textContent = String(v); el.appendChild(o); }
    el.value = v == null ? '' : v;
  };
  CROP_NUM.concat(CROP_TXT).forEach(k => set(k, c[k]));
  set('warm', c.warm); set('pots', c.pots); set('dsow', c.dsow);
  if (f.elements.u && UNITS.indexOf(c.u || 'kg') < 0){ const o = document.createElement('option'); o.value = o.textContent = c.u; f.elements.u.appendChild(o); f.elements.u.value = c.u; }
  $$('input[name=mo]', f).forEach(b => b.checked = !c.months || c.months.indexOf(+b.value) >= 0);
  syncCropForm(f);
}
function readCropForm(f){
  const o = {}, el = n => f.elements[n];
  CROP_TXT.forEach(k => { const v = el(k) ? el(k).value.trim() : ''; if (v !== '') o[k] = v; });
  CROP_NUM.forEach(k => { const e = el(k); if (!e || e.value === '') return; const n = parseFloat(e.value); if (isNaN(n)) return; if (k === 'minShade' && n === 0) return; o[k] = k === 'lt' || k === 'minShade' || k === 'water' ? Math.round(n) : n; });
  o.warm = el('warm').checked ? 1 : 0;
  if (el('pots').checked) o.pots = 1;
  if (el('dsow').checked) o.dsow = true;
  const mo = $$('input[name=mo]', f), on = mo.filter(b => b.checked).map(b => +b.value);
  if (on.length && on.length < 12) o.months = on;
  if (o.kind !== 'seedling') o.nur = 0;
  if (o.mode !== 'stag') delete o.gap;
  if (!o.tt) delete o.tt;
  if (!o.u) o.u = 'kg';
  return o;
}
function syncCropForm(f){
  const kind = f.elements.kind.value, stag = f.elements.mode.value === 'stag';
  f.elements.nur.disabled = kind !== 'seedling'; if (kind !== 'seedling') f.elements.nur.value = 0;
  f.elements.gap.disabled = !stag; if (!stag) f.elements.gap.value = ''; else if (!f.elements.gap.value) f.elements.gap.value = 21;
  f.elements.tt.closest('div').style.display = f.elements.g.value === 'fruit' ? '' : 'none';
}
let _pvTimer = null;
function cropPreview(){
  const f = $('#cropform'), box = $('#cropprev'); if (!f || !box) return;
  const raw = readCropForm(f);
  if (!raw.d || !raw.pm){ box.innerHTML = ''; return; }
  let c; try { c = normalizeCrop(Object.assign({ id: '_pv', n: raw.n || 'This plant' }, raw)); } catch(e){ return; }
  const zs = liveZones(), list = zs.length ? zs : [{ name: 'Open ground', cover: 'open', light: 'sun' }];
  const eff = effCrop(c, { how: 'auto' });
  const rows = list.slice(0, 5).map(z => {
    const pls = planCrop(R.C, eff, { succ: S.succ, hor: S.hor, key: '_pv', ctx: zoneCtx(z) });
    const tag = z.type ? ' <em>' + esc(tagText(z)) + '</em>' : '';
    if (!pls.length){ const w = whyNot(R.C, eff, { hor: S.hor, ctx: zoneCtx(z) }); return '<li><b>' + esc(z.name) + '</b>' + tag + ': <span class="bad">no window — ' + esc(w ? w.text : 'nothing suits this space and season') + '.</span></li>'; }
    return '<li><b>' + esc(z.name) + '</b>' + tag + ': ' + pls.slice(0, 3).map(p => (eff.nur ? 'sow ' + esc(fmtT(p.p - eff.nur * 7)) + ', ' : '') + (eff.kind === 'direct' ? 'sow ' : 'plant ') + '<b>' + esc(fmtT(p.p)) + '</b> → harvest <b>' + esc(fmtT(p.m)) + '</b> to ' + esc(fmtT(p.end))).join('; ') + '</li>';
  }).join('');
  box.innerHTML = '<h4>What the planner makes of this, for your weather</h4><ul class="pvl">' + rows + '</ul><p class="hint">If the dates look off, check the “days to first harvest” and “frost-tender” settings. This uses the season outlook and forecast for ' + esc(R.loc.name) + '.</p>';
}
function openCropDlg(mode, c){
  openDlg(cropFormHtml(mode, c), 'wide');
  const f = $('#cropform');
  if (mode === 'edit') fillCropForm(f, c); else fillCropForm(f, BLANK_CROP);
  cropPreview();
}
ACT.cropnew = () => openCropDlg('new', null);
ACT.cropedit = el => { const c = CROP_BY_ID[el.dataset.id]; if (c) openCropDlg('edit', c); };
document.addEventListener('input', ev => {
  const f = ev.target.closest && ev.target.closest('#cropform'); if (!f) return;
  const nm = ev.target.name;
  if (nm === 'tb' || nm === 'rt' || nm === 'minSoil' || nm === 'fb' || nm === 'hmax') ev.target.dataset.touched = '1';
  clearTimeout(_pvTimer); _pvTimer = setTimeout(cropPreview, 160);
});
document.addEventListener('change', ev => {
  const f = ev.target.closest && ev.target.closest('#cropform'); if (!f) return;
  const nm = ev.target.name;
  if (nm === '_tmpl'){
    const c = CROP_BY_ID[ev.target.value]; if (!c) return;
    const keep = f.elements.n.value; fillCropForm(f, c); f.elements.n.value = keep;
    ['tb', 'rt', 'minSoil', 'fb', 'hmax'].forEach(k => delete f.elements[k].dataset.touched);
  }
  if (nm === 'warm'){
    const def = ev.target.checked ? WARM_DEF : COOL_DEF;
    Object.keys(def).forEach(k => { const e = f.elements[k]; if (e && !e.dataset.touched) e.value = def[k]; });
  }
  if (nm === 'g' && !f.elements.feed.value){ /* keep automatic */ }
  syncCropForm(f); cropPreview();
});
const uniqueCropId = name => { const base = 'my-' + slug(name); let id = base, i = 2; while (CROP_BY_ID[id] || STORE.custom.some(c => c.id === id)) id = base + '-' + (i++); return id; };
ACT.cropsave = () => {
  const f = $('#cropform'); if (!f) return;
  const raw = readCropForm(f);
  if (!raw.n){ dlgMsg('Give it a name.'); f.elements.n.focus(); return; }
  if (!(raw.d >= 7)){ dlgMsg('Enter the days from planting to first harvest (from the packet).'); f.elements.d.focus(); return; }
  if (!(raw.pm > 0)){ dlgMsg('Enter how many plants fit in a square metre.'); f.elements.pm.focus(); return; }
  const mode = f.dataset.mode, id = f.dataset.id;
  if (mode === 'new'){
    raw.id = uniqueCropId(raw.n); STORE.custom.push(raw); rebuildCrops();
    S.entries.push({ id: uid('e'), crop: raw.id, qty: raw.def || 6, zone: 'auto', how: 'auto', name: '' });
  } else if (STORE.custom.some(c => c.id === id)){
    const i = STORE.custom.findIndex(c => c.id === id); raw.id = id; STORE.custom[i] = raw; rebuildCrops();
  } else {
    const base = BASE_CROPS.find(b => b.id === id), ov = {};
    const nz = v => (v === false || v === null || v === '') ? undefined : v;
    CROP_NUM.concat(CROP_TXT, ['warm', 'pots', 'dsow', 'months']).forEach(k => { if (!f.elements[k] && k !== 'months') return; if (JSON.stringify(nz(raw[k])) !== JSON.stringify(nz(base[k]))) ov[k] = raw[k] === undefined ? null : raw[k]; });
    if (Object.keys(ov).length) STORE.overrides[id] = ov; else delete STORE.overrides[id];
    rebuildCrops();
  }
  closeDlg(); update();
};
ACT.cropreset = el => { delete STORE.overrides[el.dataset.id]; rebuildCrops(); closeDlg(); update(); };
ACT.cropdel = el => {
  const id = el.dataset.id, c = CROP_BY_ID[id]; if (!c) return;
  const n = Object.keys(STORE.gardens).reduce((s, k) => s + STORE.gardens[k].entries.filter(e => e.crop === id).length, 0);
  if (!confirm('Delete “' + c.n + '”?' + (n ? ' It will be removed from ' + plural(n, 'planting list') + ' in your gardens (notes are kept).' : ''))) return;
  STORE.custom = STORE.custom.filter(x => x.id !== id);
  Object.keys(STORE.gardens).forEach(k => { const g = STORE.gardens[k]; g.entries = g.entries.filter(e => e.crop !== id); });
  rebuildCrops(); closeDlg(); update();
};

/* ================= boot ================= */
renderSidebar(); renderStatus();
update();
refreshLive(false); refreshOutlook();
handleShareHash();
window.addEventListener('hashchange', handleShareHash);
