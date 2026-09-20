/* ============================================================
   UI SITE — draw your beds, pots, glasshouse and trees; tag light and cover; trace over a photo
   ============================================================ */
const VW = 640;                                   // plan is drawn in a 640-unit-wide box
const NS = 'http://www.w3.org/2000/svg';
const SITE = { sel: null, tool: null, calib: null, drag: null, dims: null, bgmove: false, msg: '' };
const TREE_SLOT = { pome: 6, stone: 8, vine: 7, citrus: 4, orn: 9 };
const ZKIND = { bed: 'Bed', pots: 'Pots', feature: 'Other (house, path…)' };
const TOOL_DEF = { bed: [3, 1.2], pots: [2, 1], glass: [2.4, 1.8], feature: [4, 3] };
const snapV = v => Math.round(v * 10) / 10;
const zPeople = z => z.type === 'bed' || z.type === 'pots';
const potCount = z => (z.pots || []).reduce((s, g) => s + (+g.n || 0), 0);
const potLitres = z => (z.pots || []).reduce((s, g) => s + (+g.n || 0) * (+g.l || 0), 0);
const zoneFacts = z => z.type === 'bed' ? round1(z.w * z.h) + ' m²' : z.type === 'pots' ? plural(potCount(z), 'pot') + ' · ' + potLitres(z) + ' L' : round1(z.w * z.h) + ' m²';
const viewTNow = () => clamp(S.viewT == null ? OFF : S.viewT, OFF - 30, OFF + Math.min(S.hor, 545) + 30);

/* ---------- geometry ---------- */
function planDims(){
  if (SITE.dims) return SITE.dims;
  const P = S.plan, bg = P.bg && bgGet(S.id) ? P.bg : null;
  let W = Math.max(+P.w || 12, 3), H = W * 0.62;
  S.zones.forEach(z => { W = Math.max(W, z.x + z.w + 0.6); H = Math.max(H, z.y + z.h + 0.6); });
  S.trees.forEach(t => { if (t.x != null){ W = Math.max(W, t.x + 1); H = Math.max(H, t.y + 1); } });
  if (bg){ W = Math.max(W, bg.ox + bg.w); H = Math.max(H, bg.oy + bg.w * (bg.asp || 0.66)); }
  return { W, H, k: VW / W };
}
function svgPt(ev){
  const svg = $('#plansvg'); if (!svg) return null;
  const r = svg.getBoundingClientRect(); if (!r.width) return null;
  const d = planDims();
  return { x: (ev.clientX - r.left) / r.width * d.W, y: (ev.clientY - r.top) / r.height * d.H };
}
function freeSpot(w, h){
  const d = planDims();
  const rects = S.zones.map(z => [z.x, z.y, z.w, z.h]).concat(S.trees.filter(t => t.x != null).map(t => [t.x - 0.7, t.y - 0.7, 1.4, 1.4]));
  const hit = (x, y) => rects.some(r => x < r[0] + r[2] + 0.1 && r[0] < x + w + 0.1 && y < r[1] + r[3] + 0.1 && r[1] < y + h + 0.1);
  for (let y = 0.5; y < d.H + 40; y += 0.5) for (let x = 0.5; x + w <= Math.max(d.W, 12) + 0.01; x += 0.5) if (!hit(x, y)) return { x, y };
  return { x: 1, y: 1 };
}
function potFlow(z, slots){
  const gap = 0.06, dOf = l => 0.115 * Math.cbrt(l || 10), sorted = slots.slice().sort((a, b) => b.l - a.l);
  let last = null;
  for (let f = 1; f >= 0.2; f -= 0.05){
    let x = 0, y = 0, rowH = 0; const pts = [];
    for (const s of sorted){
      const d = dOf(s.l) * f;
      if (x + d > z.w + 1e-6 && x > 0){ x = 0; y += rowH + gap * f; rowH = 0; }
      pts.push({ cx: x + d / 2, cy: y + d / 2, r: d / 2, s });
      x += d + gap * f; rowH = Math.max(rowH, d);
    }
    last = { pts, f, ok: y + rowH <= z.h + 1e-6 };
    if (last.ok) return last;
  }
  return last;
}
/* which bed segments does a planting occupy? (a bed packs along a strip; unfold the strip into rows) */
function bedSegs(z, it){
  const horiz = z.w >= z.h, long = horiz ? z.w : z.h, short = horiz ? z.h : z.w, bw = Math.max(0.3, Math.min(z.bw || 1.2, z.w, z.h));
  const segs = []; let s0 = it.x; const s1 = it.x + it.len;
  while (s0 < s1 - 1e-6){
    const row = Math.floor(s0 / long + 1e-9), e = Math.min(s1, (row + 1) * long), a = s0 - row * long, b = e - row * long, t0 = row * bw, th = Math.min(bw, short - t0);
    if (th <= 0) break;
    segs.push(horiz ? { x: a, y: t0, w: b - a, h: th } : { x: t0, y: a, w: th, h: b - a });
    s0 = e;
  }
  return segs;
}
const zoneRes = z => R.plan.zones.find(q => q.z.id === z.id);
const activeAt = (zr, t) => zr.items.filter(it => it.x != null && it.p <= t && t < it.end);

/* ---------- the tab ---------- */
function tabSite(){
  if (SITE.sel && !S.zones.some(z => z.id === SITE.sel) && !S.trees.some(t => t.id === SITE.sel)) SITE.sel = null;
  const bg = S.plan.bg && bgGet(S.id);
  const tb = (type, label) => '<button type="button" class="btn ' + (SITE.tool === type ? 'on' : '') + '" data-act="sitetool" data-type="' + type + '" aria-pressed="' + (SITE.tool === type) + '">' + label + '</button>';
  const vmax = OFF + Math.min(S.hor, 545) + 30, vmin = OFF - 30, vt = viewTNow();
  const chips = S.zones.map(z => '<button type="button" class="gchip ' + (SITE.sel === z.id ? 'on' : '') + '" data-act="zsel" data-id="' + z.id + '">' + esc(z.name) + ' <em>' + esc(z.type === 'feature' ? 'other' : tagText(z)) + ' · ' + esc(zoneFacts(z)) + '</em></button>').join('') +
    S.trees.filter(t => t.x != null).map(t => '<button type="button" class="gchip ' + (SITE.sel === t.id ? 'on' : '') + '" data-act="zsel" data-id="' + t.id + '">' + esc(treeTitle(t)) + ' <em>tree</em></button>').join('');
  return '<p class="muted">Draw the places you grow — beds, pots, glasshouse shelves. Tag each as <b>full sun, part shade or shade</b> and <b>open ground, cloche or glasshouse</b>: the planner then picks the right plants and timing for each one. Drag to move, use the corner dots to resize, or type exact sizes in the box beside the plan.</p>' +
    '<div class="tools">' +
      '<div class="tgrp"><span class="tl">Draw a space</span>' + tb('bed', '+ Bed') + tb('pots', '+ Pots') + tb('glass', '+ Glasshouse pots') + tb('feature', '+ House / path') + '</div>' +
      '<div class="tgrp"><span class="tl">Photo to trace</span><label class="btn filebtn">' + (bg ? 'Change photo' : 'Choose photo') + '<input type="file" accept="image/*" data-bind="bgfile" hidden></label>' +
        (bg ? '<button type="button" class="btn ' + (SITE.calib ? 'on' : '') + '" data-act="calibstart">Set scale</button><button type="button" class="btn ' + (SITE.bgmove ? 'on' : '') + '" data-act="bgmove" aria-pressed="' + SITE.bgmove + '">Move photo</button><button type="button" class="btn x" data-act="bgremove">Remove</button>' : '') + '</div>' +
      (bg ? '<div class="tgrp"><label class="fld tl" for="bgop">Photo strength</label><input id="bgop" type="range" min="0.1" max="1" step="0.05" value="' + (S.plan.bgOp || 0.6) + '" data-bind="bgop" aria-label="Photo opacity"></div>' : '') +
      '<div class="tgrp"><label class="fld tl" for="planw">Plan width (m)</label><input id="planw" type="number" min="3" max="200" step="1" value="' + (S.plan.w || 12) + '" data-bind="planw"></div>' +
    '</div>' +
    '<p class="hint" id="sitehint" role="status">' + esc(siteHint()) + '</p>' +
    '<div class="sitegrid"><div class="planside">' +
      '<div class="planwrap" id="planwrap"><svg id="plansvg" role="group" aria-label="Site plan of ' + esc(S.name) + '"><defs>' +
        '<pattern id="sh-part" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="none"/><line x1="0" y1="0" x2="0" y2="9" stroke="#000" stroke-opacity=".28" stroke-width="3"/></pattern>' +
        '<pattern id="sh-shade" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#000" fill-opacity=".14"/><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-opacity=".42" stroke-width="3.5"/></pattern>' +
      '</defs><g id="bglayer"></g><g id="dynlayer"></g></svg></div>' +
      '<div class="dater"><label for="viewT">Show the plan on</label><input type="range" id="viewT" data-bind="viewT" min="' + vmin + '" max="' + vmax + '" step="1" value="' + vt + '"><output id="viewlbl" for="viewT"></output><button type="button" class="btn" data-act="viewtoday">Today</button></div>' +
      '<div id="planleg" class="planleg"></div>' +
    '</div><aside id="zinsp" class="insp card" aria-live="polite"></aside></div>' +
    (chips ? '<div class="gtabs zchips" aria-label="Spaces on the plan">' + chips + '</div>' : '') +
    spaceUse();
}
function siteHint(){
  if (SITE.calib) return SITE.calib.pts.length < 2 ? 'Set scale: click the ' + (SITE.calib.pts.length ? 'second' : 'first') + ' of two points on the photo that you know the real distance between (for example both ends of a bed).' : 'Now enter the real distance between those two points and press Apply.';
  if (SITE.tool) return 'Drag on the plan to draw it — or just tap where you want it and it drops in at a standard size. You can adjust afterwards.';
  if (SITE.bgmove) return 'Drag the photo to line it up with your spaces. Press “Move photo” again when done.';
  if (SITE.msg) return SITE.msg;
  if (!S.zones.length) return 'Start with “+ Bed” or “+ Pots”, then drag on the plan. Add a photo of your garden to trace over it if you like.';
  return 'Tap a space to select it. The date slider shows what’s planted in each space on any day.';
}
function afterSite(){
  fitSvgText(); redrawPlan(); renderInspector();
}
let FS = 12.5;
function fitSvgText(){
  const svg = $('#plansvg'); if (!svg || !svg.clientWidth) return false;
  const fs = +(12.5 * VW / svg.clientWidth).toFixed(2), changed = Math.abs(fs - FS) > 0.05;
  FS = fs; svg.style.setProperty('--fs', fs + 'px'); return changed;
}
window.addEventListener('resize', () => { if (S.tab === 'site' && fitSvgText()) redrawPlan(); });

/* ---------- drawing the plan ---------- */
function redrawPlan(){
  const svg = $('#plansvg'); if (!svg) return;
  const d = planDims(), k = d.k, t = viewTNow();
  const fz = document.activeElement && document.activeElement.dataset && (document.activeElement.dataset.z || document.activeElement.dataset.t) || null;
  svg.setAttribute('viewBox', '0 0 ' + VW + ' ' + (d.H * k).toFixed(1));
  svg.setAttribute('class', SITE.tool || SITE.calib ? 'tool' : SITE.bgmove ? 'bgmove' : '');
  syncBg(svg, d);
  /* grid + scale bar */
  const step = d.W <= 15 ? 1 : d.W <= 40 ? 5 : 10; let g = '';
  for (let m = step; m < d.W; m += step) g += '<line class="gl" x1="' + m * k + '" x2="' + m * k + '" y1="0" y2="' + d.H * k + '"/>';
  for (let m = step; m < d.H; m += step) g += '<line class="gl" y1="' + m * k + '" y2="' + m * k + '" x1="0" x2="' + d.W * k + '"/>';
  g += '<g class="scalebar" transform="translate(8 ' + (d.H * k - 10) + ')"><line x1="0" x2="' + step * k + '" y1="0" y2="0"/><line x1="0" x2="0" y1="-4" y2="4"/><line x1="' + step * k + '" x2="' + step * k + '" y1="-4" y2="4"/><text x="' + (step * k + 6) + '" y="4">' + step + ' m</text></g>';
  /* spaces (the selected one last, so its handles are reachable) */
  const zs = S.zones.slice().sort((a, b) => (a.id === SITE.sel) - (b.id === SITE.sel));
  let body = zs.map(z => zoneSvg(z, t, d)).join('');
  body += S.trees.filter(tr => tr.x != null).map(tr => treeSvg(tr, t, d)).join('');
  const sz = S.zones.find(z => z.id === SITE.sel);
  if (sz) body += handlesSvg(sz, d);
  const st = S.trees.find(x => x.id === SITE.sel);
  if (SITE.drag && SITE.drag.kind === 'draw'){
    const a = SITE.drag.a, b = SITE.drag.b;
    body += '<rect class="preview" x="' + Math.min(a.x, b.x) * k + '" y="' + Math.min(a.y, b.y) * k + '" width="' + Math.abs(a.x - b.x) * k + '" height="' + Math.abs(a.y - b.y) * k + '"/>';
  }
  if (SITE.calib){
    const pts = SITE.calib.pts;
    body += pts.map((p, i) => '<circle class="cpt" cx="' + p.x * k + '" cy="' + p.y * k + '" r="6"/><text class="cpl" x="' + (p.x * k + 9) + '" y="' + (p.y * k - 8) + '">' + (i + 1) + '</text>').join('');
    if (pts.length === 2) body += '<line class="cln" x1="' + pts[0].x * k + '" y1="' + pts[0].y * k + '" x2="' + pts[1].x * k + '" y2="' + pts[1].y * k + '"/>';
  }
  $('#dynlayer').innerHTML = g + body;
  const lbl = $('#viewlbl'); if (lbl) lbl.textContent = fmtTY(t) + (t === OFF ? ' (today)' : '');
  const sl = $('#viewT'); if (sl && sl.value != t && document.activeElement !== sl) sl.value = t;
  renderLegend(t);
  const hint = $('#sitehint'); if (hint) hint.textContent = siteHint();
  if (fz){ const el = svg.querySelector('[data-z="' + fz + '"],[data-t="' + fz + '"]'); if (el && el.focus) el.focus({ preventScroll: true }); }
}
function syncBg(svg, d){
  const P = S.plan.bg, url = P && bgGet(S.id), layer = $('#bglayer', svg); if (!layer) return;
  if (!url){ layer.innerHTML = ''; return; }
  let im = layer.firstChild;
  if (!im){ im = document.createElementNS(NS, 'image'); im.setAttribute('preserveAspectRatio', 'none'); im.setAttribute('href', url); layer.appendChild(im); }
  else if (im.getAttribute('href') !== url) im.setAttribute('href', url);
  const k = d.k;
  im.setAttribute('x', (P.ox || 0) * k); im.setAttribute('y', (P.oy || 0) * k);
  im.setAttribute('width', P.w * k); im.setAttribute('height', P.w * (P.asp || 0.66) * k);
  im.setAttribute('opacity', S.plan.bgOp == null ? 0.6 : S.plan.bgOp);
}
function zoneSvg(z, t, d){
  const k = d.k, w = z.w * k, h = z.h * k, sel = SITE.sel === z.id, light = z.light || 'sun', cover = z.cover || 'open', live = zPeople(z);
  let inner = '', label = '';
  const zr = live ? zoneRes(z) : null;
  if (z.type === 'bed' && zr){
    const its = activeAt(zr, t); let best = null;
    its.forEach(it => {
      const c = CROP_BY_ID[it.cropId], segs = bedSegs(z, it), col = 'var(--g' + GROUPS[c.g].slot + ')';
      inner += '<g class="seg">' + segs.map(s => '<rect x="' + s.x * k + '" y="' + s.y * k + '" width="' + Math.max(1, s.w * k) + '" height="' + Math.max(1, s.h * k) + '" fill="' + col + '"/>').join('') + '<title>' + esc(entryName({ crop: c.id, name: it.name })) + ' — ' + it.plants + ' plants, until ' + fmtT(it.end) + '</title></g>';
      const big = segs.reduce((m, s) => (!m || s.w * s.h > m.w * m.h) ? s : m, null);
      if (big && big.w * k > 34 && big.h * k > 14 && (!best || big.w * big.h > best.s.w * best.s.h)) best = { s: big, c, it };
      if (big && big.w * k > 34 && big.h * k > 14) inner += '<text class="segt" x="' + (big.x + big.w / 2) * k + '" y="' + ((big.y + big.h / 2) * k + 4) + '" text-anchor="middle">' + esc(c.n.length * 7.2 > big.w * k ? c.n.slice(0, Math.max(3, Math.floor(big.w * k / 7.2))) : c.n) + '</text>';
    });
  } else if (z.type === 'pots' && zr){
    const fl = potFlow(z, zr.packer.slots);
    fl.pts.forEach(p => {
      const use = zr.items.find(it => it.x != null && it.p <= t && t < it.end && it.slots && it.slots.indexOf(p.s.i) >= 0);
      const c = use && CROP_BY_ID[use.cropId];
      inner += '<circle class="pot ' + (c ? 'full' : '') + '" cx="' + p.cx * k + '" cy="' + p.cy * k + '" r="' + Math.max(2.5, p.r * k) + '"' + (c ? ' fill="var(--g' + GROUPS[c.g].slot + ')"' : '') + '><title>' + p.s.l + ' L pot' + (c ? ' — ' + esc(c.n) : ' — empty') + '</title></circle>';
    });
    if (!fl.ok) inner += '<text class="warnt2" x="4" y="' + (h - 5) + '">pots don’t fit — make this space bigger</text>';
  }
  const tag = live ? (LIGHT_LABEL[light] + ' · ' + COVER_LABEL[cover]) : '';
  label = '<g clip-path="url(#cp-' + z.id + ')"><text class="zl" x="6" y="' + (FS * 1.15).toFixed(1) + '">' + esc(z.name) + '</text>' + (live && h > FS * 3.6 ? '<text class="zl2" x="6" y="' + (FS * 2.25).toFixed(1) + '">' + esc(tag) + '</text>' : '') + '</g>';
  return '<g class="zn zt-' + z.type + ' c-' + cover + (sel ? ' sel' : '') + '" data-z="' + z.id + '" tabindex="0" role="button" aria-label="' + esc(z.name + (live ? ', ' + tag : '')) + '" transform="translate(' + z.x * k + ' ' + z.y * k + ')">' +
    '<clipPath id="cp-' + z.id + '"><rect width="' + w + '" height="' + h + '"/></clipPath>' +
    '<rect class="zr" width="' + w + '" height="' + h + '" rx="4"/>' +
    (live && light !== 'sun' ? '<rect class="zsh" width="' + w + '" height="' + h + '" rx="4" fill="url(#sh-' + light + ')"/>' : '') +
    inner + (cover === 'glass' && live ? '<rect class="gin" x="4" y="4" width="' + Math.max(0, w - 8) + '" height="' + Math.max(0, h - 8) + '" rx="2"/>' : '') + label + '</g>';
}
function handlesSvg(z, d){
  const k = d.k, x = z.x * k, y = z.y * k, w = z.w * k, h = z.h * k;
  return [['nw', x, y], ['ne', x + w, y], ['sw', x, y + h], ['se', x + w, y + h]].map(a =>
    '<g class="hd" data-h="' + a[0] + '" data-z="' + z.id + '"><circle class="hit" cx="' + a[1] + '" cy="' + a[2] + '" r="15"/><rect class="dot" x="' + (a[1] - 5) + '" y="' + (a[2] - 5) + '" width="10" height="10" rx="2"/></g>').join('');
}
function treeSvg(tr, t, d){
  const p = treeDef(tr), k = d.k; if (!p) return '';
  const r = clamp(0.7 * k, 9, 22), col = 'var(--g' + (TREE_SLOT[p.g] || 6) + ')';
  const pr = R.trees.find(q => q.tree.id === tr.id), s = pr && pr.pred && pr.pred.seasons[0];
  const inFruit = s && t >= s.ripe && t <= s.end, sel = SITE.sel === tr.id;
  let stage = ''; if (s){ let li = -1; s.st.forEach((tt, i) => { if (tt <= t) li = i; }); if (li >= 0) stage = ' — ' + p.st[li][1] + ' ' + fmtT(s.st[li]); }
  const nm = treeTitle(tr), short = nm.length > 16 ? nm.slice(0, 15) + '…' : nm;
  return '<g class="tr ' + (sel ? 'sel' : '') + '" data-t="' + tr.id + '" tabindex="0" role="button" aria-label="' + esc(nm) + '" transform="translate(' + tr.x * d.k + ' ' + tr.y * d.k + ')">' +
    '<circle class="tc" r="' + r + '" fill="' + col + '"/>' + (inFruit ? '<circle class="fruit" r="' + (r + 4) + '"/>' : '') +
    (tr.count > 1 ? '<text class="segt" text-anchor="middle" y="4">×' + tr.count + '</text>' : '') +
    '<text class="zl" text-anchor="middle" y="' + (r + FS * 1.2).toFixed(1) + '">' + esc(short) + '</text><title>' + esc(nm + stage) + '</title></g>';
}
function renderLegend(t){
  const el = $('#planleg'); if (!el) return;
  const seen = {};
  R.plan.zones.forEach(zr => activeAt(zr, t).forEach(it => { const k = it.cropId; seen[k] = (seen[k] || 0) + 1; }));
  const items = Object.keys(seen).map(id => { const c = CROP_BY_ID[id]; return '<li>' + sw(c) + esc(c.n) + '</li>'; }).join('');
  el.innerHTML = (items ? '<ul class="lgd2">' + items + '</ul>' : '<p class="hint">Nothing is in the ground on this date' + (R.items.length ? ' — slide the date to see the plantings.' : '.') + '</p>') +
    '<p class="hint">Diagonal stripes = part shade · dark stripes = shade · double border = glasshouse · dashed border = cloche or tunnel · ring on a tree = in fruit or bloom.</p>';
}

/* ---------- the box beside the plan ---------- */
function renderInspector(){ const el = $('#zinsp'); if (!el) return; const fd = focusDesc(); el.innerHTML = inspHtml(); restoreFocus(fd); }
function inspHtml(){
  if (SITE.calib) return calibHtml();
  const z = S.zones.find(x => x.id === SITE.sel), tr = S.trees.find(x => x.id === SITE.sel);
  if (z) return zoneInsp(z);
  if (tr) return treeInsp(tr);
  const beds = S.zones.filter(q => q.type === 'bed'), pots = S.zones.filter(q => q.type === 'pots');
  return '<h3>Your spaces</h3><p class="muted">' + (S.zones.length ? 'Tap a bed, pot area or tree on the plan to edit it.' : 'Nothing drawn yet.') + '</p>' +
    '<ul class="facts"><li><b>' + round1(beds.reduce((s, q) => s + q.w * q.h, 0)) + ' m²</b> of beds in ' + plural(beds.length, 'space') + '</li><li><b>' + pots.reduce((s, q) => s + potCount(q), 0) + '</b> pots in ' + plural(pots.length, 'space') + ' (' + pots.reduce((s, q) => s + potLitres(q), 0) + ' L in total)</li></ul>' +
    '<p class="hint">Tip: trace a photo to get the shapes right. Choose a photo, then use “Set scale” and click two points a known distance apart.</p>';
}
function optsOf(map, cur){ return Object.keys(map).map(k => '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + esc(map[k]) + '</option>').join(''); }
function zoneInsp(z){
  const live = zPeople(z), t = viewTNow(), zr = live ? zoneRes(z) : null;
  const num = (label, prop, v, min, step) => '<div><label class="fld">' + label + '</label><input type="number" min="' + min + '" step="' + step + '" value="' + round1(v) + '" data-bind="znum" data-prop="' + prop + '" data-id="' + z.id + '"></div>';
  let h = '<div class="card-h"><h3>' + esc(z.name) + '</h3><button type="button" class="btn ic x" data-act="zsel" data-id="" aria-label="Done">×</button></div>' +
    '<label class="fld">Name</label><input type="text" maxlength="40" value="' + esc(z.name) + '" data-bind="zprop" data-prop="name" data-id="' + z.id + '">' +
    '<label class="fld">Kind of space</label><select data-bind="ztype" data-id="' + z.id + '">' + optsOf(ZKIND, z.type) + '</select>' +
    '<div class="grid2">' + num('Across (m)', 'w', z.w, 0.3, 0.1) + num('Down (m)', 'h', z.h, 0.3, 0.1) + num('Left edge (m)', 'x', z.x, 0, 0.1) + num('Top edge (m)', 'y', z.y, 0, 0.1) + '</div>';
  if (z.type === 'bed') h += '<div><label class="fld">Working width of the bed (m)</label><input type="number" min="0.3" max="3" step="0.1" value="' + (z.bw || 1.2) + '" data-bind="znum" data-prop="bw" data-id="' + z.id + '"><small>How wide you plant across — about 1.2 m lets you reach the middle from a path. Area: ' + round1(z.w * z.h) + ' m².</small></div>';
  if (z.type === 'pots'){
    h += '<h4 class="sub">Pots in this space</h4><div class="potrows">' + (z.pots || []).map((g, i) =>
      '<div class="potrow"><input type="number" min="0" max="999" value="' + (g.n || 0) + '" data-bind="potn" data-id="' + z.id + '" data-i="' + i + '" aria-label="Number of pots"><span>pots of</span><input type="number" min="1" max="500" value="' + (g.l || 10) + '" data-bind="potl" data-id="' + z.id + '" data-i="' + i + '" aria-label="Litres per pot"><span>litres</span><button type="button" class="btn ic x" data-act="potdel" data-id="' + z.id + '" data-i="' + i + '" aria-label="Remove this pot size">×</button></div>').join('') + '</div>' +
      '<div class="row"><button type="button" class="btn" data-act="potadd" data-id="' + z.id + '">+ Another pot size</button></div><p class="hint">' + plural(potCount(z), 'pot') + ', ' + potLitres(z) + ' L of potting mix in total. Tomatoes and melons want 20 L+, herbs and lettuce are happy in 5–10 L.</p>';
  }
  if (live){
    h += '<div class="grid2"><div><label class="fld">Light</label><select data-bind="zprop" data-prop="light" data-id="' + z.id + '">' + optsOf(LIGHT_LABEL, z.light || 'sun') + '</select></div>' +
      '<div><label class="fld">Cover</label><select data-bind="zprop" data-prop="cover" data-id="' + z.id + '">' + optsOf(COVER_LABEL, z.cover || 'open') + '</select></div></div>' +
      '<details class="fold"><summary>What do these mean?</summary><p class="hint"><b>Full sun</b> — 6+ hours of direct sun. <b>Part shade</b> — about 3–5 hours (a fence, house or tree shades it for part of the day). <b>Shade</b> — under 3 hours. Shade slows plants and cuts yields; some (lettuce, silverbeet, herbs) cope well, tomatoes and melons don’t.<br><b>Cloche / tunnel</b> — a few degrees warmer and frost-protected. <b>Glasshouse</b> — much warmer, so you can start early and grow warm crops (melons, chillies, wasabi in the cool) — but it can get too hot in mid-summer for cool-season crops.</p></details>';
  }
  h += '<label class="fld">Note about this space</label><input type="text" maxlength="120" value="' + esc(z.note || '') + '" data-bind="zprop" data-prop="note" data-id="' + z.id + '" placeholder="e.g. gets afternoon shade from the fence">';
  if (zr){
    const its = activeAt(zr, t), up = zr.items.filter(it => it.x != null && it.p > t && it.p < t + 60).sort((a, b) => a.p - b.p);
    const u = R.util.find(q => q.z.id === z.id), pk = u ? peakUse(u.series) : null;
    h += '<div class="zin"><h4 class="sub">In this space on ' + esc(fmtT(t)) + '</h4>' +
      (its.length ? '<ul class="fl2">' + its.map(it => { const c = CROP_BY_ID[it.cropId]; return '<li>' + sw(c) + '<span><b>' + esc(entryName({ crop: c.id, name: it.name })) + '</b> — ' + (z.type === 'bed' ? it.plants + ' plants, ' + round1(it.area) + ' m²' : plural(it.potsUsed, 'pot')) + ' <em>until ' + esc(fmtT(it.end)) + '</em></span></li>'; }).join('') + '</ul>' : '<p class="hint">Empty on this date.</p>') +
      (up.length ? '<p class="hint">Coming up: ' + up.slice(0, 4).map(it => esc(CROP_BY_ID[it.cropId].n) + ' from ' + fmtT(it.p)).join(', ') + '.</p>' : '') +
      (pk && u.cap ? '<p class="hint">Busiest: ' + esc(fmtT(pk.t)) + ' — ' + (z.type === 'bed' ? round1(pk.used) + ' of ' + round1(u.cap) + ' m²' : pk.used + ' of ' + u.cap + ' pots') + ' (' + Math.round(pk.pct * 100) + '%).</p>' : '') + gapHtml(z, zr, t) + '</div>';
  }
  h += '<details class="fold" ' + ((S.notes['zone:' + z.id] || []).length ? 'open' : '') + '><summary>Notes for next year' + ((S.notes['zone:' + z.id] || []).length ? ' (' + S.notes['zone:' + z.id].length + ')' : '') + '</summary>' + notesBlock('zone:' + z.id) + '</details>' +
    '<div class="row wrap" style="margin-top:.8rem"><button type="button" class="btn" data-act="zdup" data-id="' + z.id + '">Duplicate</button><button type="button" class="btn danger" data-act="zdel" data-id="' + z.id + '">Delete this space</button></div>';
  return h;
}
function treeInsp(tr){
  const p = treeDef(tr), pr = R.trees.find(q => q.tree.id === tr.id), s = pr && pr.pred && pr.pred.seasons[0], t = viewTNow();
  let stage = '';
  if (s){ let li = -1; s.st.forEach((tt, i) => { if (tt <= t) li = i; }); stage = li >= 0 ? p.st[li][1] + ' (' + fmtT(s.st[li]) + ')' : 'before ' + p.st[0][1].toLowerCase() + ' (' + fmtT(s.st[0]) + ')'; }
  return '<div class="card-h"><h3>' + esc(treeTitle(tr)) + '</h3><button type="button" class="btn ic x" data-act="zsel" data-id="" aria-label="Done">×</button></div>' +
    '<p class="hint">' + esc(PGROUPS[p.g].name) + ' · ' + esc(tagText({ light: tr.light || 'sun', cover: tr.cover || 'open' })) + '</p>' +
    (s ? '<p>On ' + esc(fmtT(t)) + ': <b>' + esc(stage) + '</b></p><p class="muted">' + (isBloomType(p) ? 'Peak bloom' : p.g === 'vine' ? 'Harvest' : 'Ripe') + ' about ' + esc(fmtT(s.ripe)) + '.</p>' : '<p class="muted">No dates for this plant here.</p>') +
    '<div class="grid2"><div><label class="fld">Left (m)</label><input type="number" step="0.1" min="0" value="' + round1(tr.x) + '" data-bind="tpos" data-prop="x" data-id="' + tr.id + '"></div><div><label class="fld">Top (m)</label><input type="number" step="0.1" min="0" value="' + round1(tr.y) + '" data-bind="tpos" data-prop="y" data-id="' + tr.id + '"></div></div>' +
    '<div class="row wrap" style="margin-top:.8rem"><button type="button" class="btn" data-act="tab" data-t="trees">Open its card</button><button type="button" class="btn" data-act="treeunplace" data-id="' + tr.id + '">Hide from plan</button></div>';
}
function calibHtml(){
  const c = SITE.calib, two = c.pts.length === 2;
  return '<h3>Set the photo’s scale</h3><ol class="steps"><li class="' + (c.pts.length > 0 ? 'done' : '') + '">Click the first point on the plan.</li><li class="' + (two ? 'done' : '') + '">Click a second point a known distance away.</li><li>Type the real distance.</li></ol>' +
    (two ? '<label class="fld" for="calibd">Real distance between the two points (metres)</label><div class="row"><input id="calibd" type="number" min="0.1" step="0.1" placeholder="e.g. 4.5" autofocus><button type="button" class="btn primary" data-act="calibapply">Apply</button></div><p class="hint">Tip: a bed’s length, a fence panel or the house wall are easy to measure.</p>' : '<p class="hint">Points so far: ' + c.pts.length + ' of 2.</p>') +
    '<div class="row" style="margin-top:.8rem"><button type="button" class="btn" data-act="calibcancel">Cancel</button></div>';
}

/* what could go in the gap on this date? */
function gapIdeas(z, zr, t){
  const pk = zr.packer, ctx = zoneCtx(z);
  let used = 0; activeAt(zr, t).forEach(it => { used += pk.kind === 'bed' ? it.area : it.potsUsed; });
  const free = pk.cap - used;
  if (t < OFF) return { free, past: true, ideas: [] };
  if (pk.kind === 'bed' ? free < 0.2 : free < 1) return { free, ideas: [] };
  const out = [];
  CROPS.forEach(c => {
    if (S.entries.some(e => e.crop === c.id)) return;
    const eff = effCrop(c, { how: 'auto' }), pl = evalPlant(R.C, eff, t, ctx); if (!pl) return;
    let qty;
    if (pk.kind === 'bed'){ qty = Math.min(c.def, Math.floor(free * c.pm)); if (qty < Math.min(3, c.def)) return; }
    else {
      const need = potNeed(eff), share = potShare(eff);
      const fs = pk.slots.filter(s => s.l >= need * 0.7 && !zr.items.some(it => it.x != null && it.slots && it.p < pl.end && t < it.end && it.slots.indexOf(s.i) >= 0));
      qty = Math.min(c.def, fs.reduce((a, s) => a + clamp(Math.floor(s.l / need), 1, share), 0)); if (qty < 1) return;
    }
    out.push({ c, qty, pl, sc: (pl.light ? 30 : 0) + pl.days + (pl.status !== 'ok' ? 20 : 0) - (c.pots && pk.kind === 'pots' ? 15 : 0) });
  });
  out.sort((a, b) => a.sc - b.sc);
  return { free, ideas: out.slice(0, 10) };
}
function gapHtml(z, zr, t){
  const g = gapIdeas(z, zr, t), fr = zr.packer.kind === 'bed' ? round1(g.free) + ' m² free' : Math.floor(g.free) + ' pots free';
  if (g.past) return '<p class="hint">Slide the date to today or later to see ideas for gaps.</p>';
  if (!g.ideas.length) return '<p class="hint">' + fr + ' on this date — nothing else suits the space and season.</p>';
  return '<h4 class="sub">Ideas for the gap <em>' + fr + '</em></h4><p class="hint">Things that can go in on ' + esc(fmtT(t)) + ' in this space. Add one and the planner slots it in as early as there’s room.</p><div class="chips">' +
    g.ideas.map(i => '<button type="button" class="chip sm" data-act="gapadd" data-id="' + z.id + '" data-crop="' + esc(i.c.id) + '" data-qty="' + i.qty + '" title="Ready about ' + esc(fmtT(i.pl.m)) + '">' + sw(i.c) + esc(i.c.n) + ' <em>×' + i.qty + '</em></button>').join('') + '</div>';
}

/* space use across the season, per space */
function spaceUse(){
  const us = R.util.filter(u => u.cap > 0); if (!us.length) return '';
  const W = 560, H = 54;
  const charts = us.map(u => {
    const n = u.series.length, bw = W / n, pk = peakUse(u.series);
    const bars = u.series.map((s, i) => { const hh = clamp(s.pct, 0, 1.15) * (H - 6); return '<rect class="ub ' + (s.pct > 1.001 ? 'over' : '') + '" x="' + (i * bw).toFixed(1) + '" y="' + (H - hh).toFixed(1) + '" width="' + Math.max(1, bw - 1).toFixed(1) + '" height="' + hh.toFixed(1) + '"/>'; }).join('');
    const td = (OFF - u.series[0].t) / (u.series[n - 1].t - u.series[0].t) * W;
    return '<div class="util1"><div class="uh"><b>' + esc(u.z.name) + '</b> <em>' + esc(tagText(u.z)) + '</em><span>busiest ' + esc(fmtT(pk.t)) + ' · ' + Math.round(pk.pct * 100) + '% full</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="How full ' + esc(u.z.name) + ' is over the season">' + bars + '<line class="tdl" x1="' + td + '" x2="' + td + '" y1="0" y2="' + H + '"/></svg></div>';
  }).join('');
  return '<section class="util"><h3>How full each space is</h3><p class="hint">Weekly, from today to the end of your plan. The vertical line is today.</p>' + charts + '</section>';
}

/* ---------- pointer interaction ---------- */
function commitZoneEdit(){
  SITE.dims = null; SITE.drag = null;
  update();
}
document.addEventListener('pointerdown', ev => {
  const svg = ev.target.closest && ev.target.closest('#plansvg'); if (!svg || ev.button > 0) return;
  const pt = svgPt(ev); if (!pt) return;
  if (SITE.calib){ if (SITE.calib.pts.length < 2){ SITE.calib.pts.push(pt); redrawPlan(); renderInspector(); } ev.preventDefault(); return; }
  const dims = SITE.dims = planDims(), px = dims.k;
  const hd = ev.target.closest('[data-h]'), zg = ev.target.closest('.zn'), tg = ev.target.closest('.tr');
  if (SITE.tool){ SITE.drag = { kind: 'draw', a: pt, b: pt, type: SITE.tool, moved: false }; }
  else if (SITE.bgmove && S.plan.bg){ SITE.drag = { kind: 'bg', start: pt, orig: { ox: S.plan.bg.ox || 0, oy: S.plan.bg.oy || 0 }, moved: false }; }
  else if (hd){ const z = S.zones.find(q => q.id === hd.dataset.z); SITE.drag = { kind: 'resize', z, handle: hd.dataset.h, start: pt, orig: { x: z.x, y: z.y, w: z.w, h: z.h }, moved: false }; }
  else if (tg){ const tr = S.trees.find(q => q.id === tg.dataset.t); SITE.sel = tr.id; SITE.drag = { kind: 'tree', tr, start: pt, orig: { x: tr.x, y: tr.y }, moved: false }; }
  else if (zg){ const z = S.zones.find(q => q.id === zg.dataset.z); SITE.sel = z.id; SITE.drag = { kind: 'move', z, start: pt, orig: { x: z.x, y: z.y }, moved: false }; }
  else { SITE.dims = null; if (SITE.sel){ SITE.sel = null; redrawPlan(); renderInspector(); } return; }
  ev.preventDefault();
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragEnd);
});
function onDragMove(ev){
  const dr = SITE.drag; if (!dr) return;
  const pt = svgPt(ev); if (!pt) return; const k = SITE.dims.k;
  const s0 = dr.start || dr.a, dx = pt.x - s0.x, dy = pt.y - s0.y;
  if (dr.kind === 'draw'){ dr.b = pt; if (Math.hypot((pt.x - dr.a.x) * k, (pt.y - dr.a.y) * k) > 4) dr.moved = true; redrawPlan(); return; }
  if (!dr.moved && Math.hypot(dx * k, dy * k) < 4) return;
  dr.moved = true;
  if (dr.kind === 'move'){ dr.z.x = Math.max(0, snapV(dr.orig.x + dx)); dr.z.y = Math.max(0, snapV(dr.orig.y + dy)); }
  else if (dr.kind === 'tree'){ dr.tr.x = Math.max(0, snapV(dr.orig.x + dx)); dr.tr.y = Math.max(0, snapV(dr.orig.y + dy)); }
  else if (dr.kind === 'bg'){ S.plan.bg.ox = snapV(dr.orig.ox + dx); S.plan.bg.oy = snapV(dr.orig.oy + dy); }
  else if (dr.kind === 'resize'){
    const o = dr.orig, z = dr.z, hd = dr.handle, MIN = 0.3; let x = o.x, y = o.y, w = o.w, h = o.h;
    if (hd.indexOf('e') >= 0) w = Math.max(MIN, o.w + dx);
    if (hd.indexOf('s') >= 0) h = Math.max(MIN, o.h + dy);
    if (hd.indexOf('w') >= 0){ const nw = Math.max(MIN, o.w - dx); x = o.x + o.w - nw; w = nw; }
    if (hd.indexOf('n') >= 0){ const nh = Math.max(MIN, o.h - dy); y = o.y + o.h - nh; h = nh; }
    z.x = Math.max(0, snapV(x)); z.y = Math.max(0, snapV(y)); z.w = Math.max(MIN, snapV(w)); z.h = Math.max(MIN, snapV(h));
  }
  redrawPlan();
}
function onDragEnd(){
  window.removeEventListener('pointermove', onDragMove); window.removeEventListener('pointerup', onDragEnd); window.removeEventListener('pointercancel', onDragEnd);
  const dr = SITE.drag; if (!dr){ SITE.dims = null; return; }
  if (dr.kind === 'draw'){
    const key = dr.type, def = TOOL_DEF[key] || [3, 1.2], a = dr.a, b = dr.b;
    let x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
    if (!dr.moved || w < 0.4 || h < 0.4){ w = def[0]; h = def[1]; x = a.x; y = a.y; }
    const type = key === 'glass' ? 'pots' : key, n = S.zones.filter(q => q.type === type).length + 1;
    const nm = key === 'feature' ? (S.zones.some(q => /house/i.test(q.name)) ? 'Path ' + n : 'House') : key === 'glass' ? 'Glasshouse' + (S.zones.some(q => q.name === 'Glasshouse') ? ' ' + n : '') : (type === 'bed' ? 'Bed ' : 'Pots ') + n;
    const z = defaultZone(nm, { type, x: Math.max(0, snapV(x)), y: Math.max(0, snapV(y)), w: Math.max(0.3, snapV(w)), h: Math.max(0.3, snapV(h)), light: 'sun', cover: key === 'glass' ? 'glass' : 'open' });
    if (type === 'pots') z.pots = [{ n: key === 'glass' ? 8 : 6, l: 10 }];
    S.zones.push(z); SITE.sel = z.id; SITE.tool = null; SITE.drag = null; SITE.dims = null;
    update(); return;
  }
  const kind = dr.kind, moved = dr.moved; SITE.drag = null; SITE.dims = null;
  if (kind === 'resize' && moved){ update(); return; }
  if (moved){ saveState(); renderResults(); return; }
  redrawPlan(); renderInspector();
}
/* keyboard: arrow keys nudge the focused space or tree */
document.addEventListener('keydown', ev => {
  const g = ev.target.closest && ev.target.closest('#plansvg .zn, #plansvg .tr'); if (!g) return;
  if (ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); SITE.sel = g.dataset.z || g.dataset.t; redrawPlan(); renderInspector(); return; }
  const dv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key]; if (!dv) return;
  ev.preventDefault();
  const o = S.zones.find(q => q.id === g.dataset.z) || S.trees.find(q => q.id === g.dataset.t); if (!o) return;
  const st = ev.shiftKey ? 0.5 : 0.1;
  o.x = Math.max(0, snapV(o.x + dv[0] * st)); o.y = Math.max(0, snapV(o.y + dv[1] * st));
  SITE.sel = o.id; SITE.dims = null; redrawPlan(); renderInspector(); saveState();
});

/* ---------- actions ---------- */
ACT.sitetool = el => { const ty = el.dataset.type; SITE.tool = SITE.tool === ty ? null : ty; SITE.bgmove = false; SITE.calib = null; renderResults(); };
ACT.zsel = el => { SITE.sel = el.dataset.id || null; redrawPlan(); renderInspector(); if (S.tab === 'site') $$('.zchips .gchip').forEach(b => b.classList.toggle('on', b.dataset.id === SITE.sel)); };
ACT.zdup = el => { const z = S.zones.find(q => q.id === el.dataset.id); if (!z) return; const c = clone(z); c.id = uid('z'); c.name = z.name + ' (copy)'; const sp = freeSpot(z.w, z.h); c.x = sp.x; c.y = sp.y; S.zones.push(c); SITE.sel = c.id; update(); };
ACT.zdel = el => {
  const z = S.zones.find(q => q.id === el.dataset.id); if (!z) return;
  const n = S.entries.filter(e => e.zone === z.id).length;
  if (!confirm('Delete “' + z.name + '”?' + (n ? ' The ' + plural(n, 'plant') + ' assigned to it will move to “Auto”.' : ''))) return;
  S.entries.forEach(e => { if (e.zone === z.id) e.zone = 'auto'; });
  S.zones = S.zones.filter(q => q.id !== z.id); SITE.sel = null; update();
};
ACT.potadd = el => { const z = S.zones.find(q => q.id === el.dataset.id); if (!z) return; const last = (z.pots || [])[z.pots.length - 1]; (z.pots = z.pots || []).push({ n: 4, l: last ? last.l : 10 }); update(); };
ACT.potdel = el => { const z = S.zones.find(q => q.id === el.dataset.id); if (!z) return; z.pots.splice(+el.dataset.i, 1); update(); };
ACT.gapadd = el => {
  const c = CROP_BY_ID[el.dataset.crop]; if (!c) return;
  S.entries.push({ id: uid('e'), crop: c.id, qty: Math.max(1, +el.dataset.qty || c.def), zone: el.dataset.id, how: 'auto', name: '' }); update();
};
ACT.viewtoday = () => { S.viewT = null; const s = $('#viewT'); if (s) s.value = OFF; redrawPlan(); saveState(); };
ACT.treeplace = el => {
  const t = S.trees.find(q => q.id === el.dataset.id); if (!t) return;
  if (t.x == null){ const sp = freeSpot(1.4, 1.4); t.x = sp.x + 0.7; t.y = sp.y + 0.7; }
  SITE.sel = t.id; S.tab = 'site'; update();
  const tabs = $('.tabs'); if (tabs) tabs.scrollIntoView({ block: 'start', behavior: 'smooth' });
};
ACT.treeunplace = el => { const t = S.trees.find(q => q.id === el.dataset.id); if (t){ t.x = null; t.y = null; if (SITE.sel === t.id) SITE.sel = null; update(); } };
ACT.bgmove = () => { SITE.bgmove = !SITE.bgmove; SITE.tool = null; SITE.calib = null; renderResults(); };
ACT.bgremove = () => { if (!confirm('Remove the photo from this plan?')) return; bgSet(S.id, null); S.plan.bg = null; SITE.bgmove = false; update(); };
ACT.calibstart = () => { SITE.calib = SITE.calib ? null : { pts: [] }; SITE.tool = null; SITE.bgmove = false; renderResults(); };
ACT.calibcancel = () => { SITE.calib = null; renderResults(); };
ACT.calibapply = () => {
  const D = parseFloat(($('#calibd') || {}).value), c = SITE.calib, bg = S.plan.bg;
  if (!c || c.pts.length < 2 || !bg || !(D > 0)){ SITE.msg = 'Enter a distance in metres (e.g. 4.5).'; const h = $('#sitehint'); if (h) h.textContent = SITE.msg; SITE.msg = ''; return; }
  const p1 = c.pts[0], p2 = c.pts[1], dp = Math.hypot(p2.x - p1.x, p2.y - p1.y); if (dp < 0.01) return;
  const f = D / dp;
  bg.w = Math.max(1, bg.w * f); bg.ox = p1.x - (p1.x - (bg.ox || 0)) * f; bg.oy = p1.y - (p1.y - (bg.oy || 0)) * f;
  SITE.calib = null; SITE.msg = 'Scale set: the photo now matches real metres, so what you draw on it is the right size. Use “Move photo” to line it up with your spaces.'; update(); SITE.msg = '';
};

/* ---------- field changes ---------- */
const zById = id => S.zones.find(q => q.id === id);
BIND.zprop = (el, v) => {
  const z = zById(el.dataset.id); if (!z) return; const k = el.dataset.prop;
  if (k === 'name') z.name = v.trim().slice(0, 40) || z.name;
  else if (k === 'note') z.note = v.trim().slice(0, 120);
  else z[k] = v;
  update();
};
BIND.znum = (el, v) => {
  const z = zById(el.dataset.id); if (!z) return; const k = el.dataset.prop, n = parseFloat(v); if (isNaN(n)) return;
  if (k === 'w' || k === 'h') z[k] = clamp(n, 0.3, 500);
  else if (k === 'bw') z.bw = clamp(n, 0.3, 3);
  else z[k] = Math.max(0, n);
  update();
};
BIND.ztype = (el, v) => { const z = zById(el.dataset.id); if (!z) return; z.type = v; if (v === 'pots' && !(z.pots || []).length) z.pots = [{ n: 6, l: 10 }]; update(); };
BIND.potn = (el, v) => { const z = zById(el.dataset.id); if (!z) return; z.pots[+el.dataset.i].n = clamp(parseInt(v, 10) || 0, 0, 999); update(); };
BIND.potl = (el, v) => { const z = zById(el.dataset.id); if (!z) return; z.pots[+el.dataset.i].l = clamp(parseFloat(v) || 10, 1, 500); update(); };
BIND.tpos = (el, v) => { const t = S.trees.find(q => q.id === el.dataset.id), n = parseFloat(v); if (!t || isNaN(n)) return; t[el.dataset.prop] = Math.max(0, n); update(); };
BIND.planw = (el, v) => { const n = parseFloat(v); if (isNaN(n)) return; S.plan.w = clamp(n, 3, 200); update(); };
BIND.viewT = (el, v, live) => { S.viewT = +v; redrawPlan(); if (!live) saveState(); };
BIND.bgop = (el, v, live) => { S.plan.bgOp = clamp(parseFloat(v) || 0.6, 0.1, 1); const im = $('#bglayer image'); if (im) im.setAttribute('opacity', S.plan.bgOp); if (!live) saveState(); };
BIND.bgfile = async (el) => {
  const f = el.files && el.files[0]; if (!f) return;
  try {
    const url = URL.createObjectURL(f);
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file isn’t an image this browser can open.')); i.src = url; });
    URL.revokeObjectURL(url);
    const mx = 1400, sc = Math.min(1, mx / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement('canvas');
    cv.width = Math.round(im.naturalWidth * sc); cv.height = Math.round(im.naturalHeight * sc);
    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
    const data = cv.toDataURL('image/jpeg', 0.78);
    if (!bgSet(S.id, data)){ SITE.msg = 'That photo is too big for this browser to keep. Try a smaller one, or remove the photo from another garden first.'; renderResults(); SITE.msg = ''; return; }
    S.plan.bg = { w: Math.max(+S.plan.w || 12, 4), asp: cv.height / cv.width, ox: 0, oy: 0, has: true };
    SITE.msg = 'Photo added. Next, press “Set scale” and click two points on it that you know the real distance between — then trace your beds over it.';
    update(); SITE.msg = '';
  } catch(e){ SITE.msg = e.message; renderResults(); SITE.msg = ''; }
};
