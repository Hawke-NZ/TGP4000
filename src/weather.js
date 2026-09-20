/* ============================================================
   WEATHER — live data from Open-Meteo (free, no API key, CORS-enabled)
   https://open-meteo.com  ·  data licensed CC BY 4.0
   Every call is optional: if anything fails the planner quietly falls back to the
   built-in regional climate table + NIWA outlook and reports what happened in the
   "Data sources" panel.
   ============================================================ */
const OM = {
  geocode:  'https://geocoding-api.open-meteo.com/v1/search',
  forecast: 'https://api.open-meteo.com/v1/forecast',
  archive:  'https://archive-api.open-meteo.com/v1/archive'
};
const NZ_TZ = 'Pacific/Auckland';

/* today's calendar date in New Zealand, whatever the viewer's device timezone is */
function nzToday(){
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: NZ_TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const [y,m,d] = s.split('-').map(Number);
  return Date.UTC(y, m-1, d);
}
function isoOfMs(ms){ return new Date(ms).toISOString().slice(0,10); }

async function omGet(base, params, timeoutMs){
  const qs = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs || 15000);
  try {
    const res = await fetch(base + '?' + qs, { signal: ctl.signal });
    if (!res.ok){
      let reason = '';
      try { const j = await res.json(); reason = j && j.reason ? ' — ' + j.reason : ''; } catch(e){}
      throw new Error('HTTP ' + res.status + reason);
    }
    return await res.json();
  } catch (e){
    if (e.name === 'AbortError') throw new Error('timed out');
    throw e;
  } finally { clearTimeout(timer); }
}

/* --- place search (NZ only) --- */
async function searchPlaces(q){
  const j = await omGet(OM.geocode, { name: q, count: 8, language: 'en', format: 'json', countryCode: 'NZ' }, 10000);
  return (j.results || []).map(r => ({
    name: r.name, admin: r.admin2 || r.admin1 || '', lat: r.latitude, lon: r.longitude, elev: r.elevation
  }));
}

/* --- forecast + last 30 days + soil temperature --- */
async function loadForecast(lat, lon, todayMs){
  const params = {
    latitude: lat.toFixed(4), longitude: lon.toFixed(4),
    daily: 'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max',
    hourly: 'soil_temperature_6cm',
    past_days: 92, forecast_days: 16, timezone: NZ_TZ
  };
  let j;
  try { j = await omGet(OM.forecast, params); }
  catch (e){
    if (!/HTTP 400/.test(e.message)) throw e;
    params.daily = 'temperature_2m_max,temperature_2m_min,precipitation_sum';       // older API without daily mean or gusts
    j = await omGet(OM.forecast, params);
  }
  const d = j.daily;
  if (!d || !d.time || !d.temperature_2m_max || !d.temperature_2m_min) throw new Error('unexpected response shape');
  const days = d.time.map((s, i) => ({
    t: Math.round((Date.parse(s + 'T00:00:00Z') - todayMs) / DAY),   // 0 = today, negative = past
    date: s, max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], rain: d.precipitation_sum ? d.precipitation_sum[i] : 0, gust: d.wind_gusts_10m_max && d.wind_gusts_10m_max[i] != null ? d.wind_gusts_10m_max[i] : null,
    mean: d.temperature_2m_mean && d.temperature_2m_mean[i] != null ? d.temperature_2m_mean[i] : (d.temperature_2m_max[i] != null && d.temperature_2m_min[i] != null ? (d.temperature_2m_max[i] + d.temperature_2m_min[i]) / 2 : null)
  }));
  /* soil: mean of today's hourly values */
  let soilToday = null;
  const h = j.hourly;
  if (h && h.time && h.soil_temperature_6cm){
    const todayStr = isoOfMs(todayMs); let s = 0, n = 0;
    h.time.forEach((ts, i) => { if (ts.slice(0,10) === todayStr && h.soil_temperature_6cm[i] != null){ s += h.soil_temperature_6cm[i]; n++; } });
    if (n) soilToday = s / n;
  }
  return { days, soilToday, fetched: Date.now() };
}

/* --- 10 years of history → this place's own climate normals + frost dates --- */
async function loadClimate(lat, lon){
  const y1 = new Date().getUTCFullYear() - 1, y0 = y1 - 9;
  const params = {
    latitude: lat.toFixed(4), longitude: lon.toFixed(4),
    start_date: y0 + '-01-01', end_date: y1 + '-12-31',
    daily: 'temperature_2m_mean,temperature_2m_min', timezone: NZ_TZ
  };
  let j;
  try { j = await omGet(OM.archive, params, 30000); }
  catch (e){
    if (!/HTTP 400/.test(e.message)) throw e;
    params.daily = 'temperature_2m_max,temperature_2m_min';
    j = await omGet(OM.archive, params, 30000);
  }
  const d = j.daily;
  if (!d || !d.time || !d.temperature_2m_min) throw new Error('unexpected response shape');
  if (!d.temperature_2m_mean){
    if (!d.temperature_2m_max) throw new Error('unexpected response shape');
    d.temperature_2m_mean = d.temperature_2m_max.map((x, i) => (x != null && d.temperature_2m_min[i] != null) ? (x + d.temperature_2m_min[i]) / 2 : null);
  }
  const sum = new Float64Array(367), cnt = new Float64Array(367);
  const lsfs = [], fafs = [];
  const byYear = {};
  d.time.forEach((s, i) => {
    const ms = Date.parse(s + 'T00:00:00Z'), dy = doyOfMs(ms), yr = +s.slice(0,4);
    const tm = d.temperature_2m_mean[i], tn = d.temperature_2m_min[i];
    if (tm != null){ sum[dy] += tm; cnt[dy]++; }
    (byYear[yr] || (byYear[yr] = [])).push({ dy, tn });
  });
  const raw = new Float64Array(367);
  for (let k = 1; k <= 366; k++) raw[k] = cnt[k] ? sum[k] / cnt[k] : NaN;
  if (isNaN(raw[366])) raw[366] = raw[365];
  /* circular smoothing (±10 days) */
  const air0 = new Float64Array(367);
  for (let k = 1; k <= 366; k++){
    let s = 0, n = 0;
    for (let o = -10; o <= 10; o++){ let kk = k + o; while (kk < 1) kk += 365; while (kk > 365 && kk !== 366) kk -= 365; const v = raw[kk]; if (!isNaN(v)){ s += v; n++; } }
    air0[k] = s / n;
  }
  /* frost: air min ≤ 3 °C at 2 m ≈ light ground frost */
  const FROST = 3.0;
  let frostYears = 0;
  for (const yr in byYear){
    const arr = byYear[yr];
    let last = null, first = null;
    for (const r of arr){
      if (r.tn == null) continue;
      if (r.tn <= FROST){
        if (r.dy >= 182 && (last == null || r.dy > last)) last = r.dy;     // Jul 1 → Dec 31: latest = last spring frost
        if (r.dy >= 60 && r.dy < 244 && (first == null || r.dy < first)) first = r.dy;  // Mar 1 → Aug 31: earliest = first autumn frost
      }
    }
    if (last != null && first != null){ lsfs.push(last); fafs.push(first); frostYears++; }
  }
  const nYears = Object.keys(byYear).length;
  let lsf, faf, frostFree = false;
  if (frostYears < Math.max(3, nYears * 0.4)){
    lsf = mmddToDoy('07-25'); faf = mmddToDoy('06-15'); frostFree = true;     // effectively frost-free
  } else {
    lsfs.sort((a,b) => a - b); fafs.sort((a,b) => a - b);
    lsf = lsfs[Math.min(lsfs.length - 1, Math.floor(lsfs.length * 0.75))];     // later-than-typical last frost
    faf = fafs[Math.floor(fafs.length * 0.25)];                                // earlier-than-typical first frost
  }
  return { air0: Array.from(air0), lsf, faf, frostFree, years: nYears, span: y0 + '–' + y1, fetched: Date.now() };
}

/* --- the season so far: daily mean temperatures from a year ago up to ~3 months ago (the forecast call covers the last 92 days).
       Used so bloom/ripening for fruit trees and vines counts the warmth that has really happened. --- */
async function loadSeason(lat, lon, todayMs){
  const start = isoOfMs(todayMs - 365 * DAY), end = isoOfMs(todayMs - 93 * DAY);
  const params = { latitude: lat.toFixed(4), longitude: lon.toFixed(4), start_date: start, end_date: end, daily: 'temperature_2m_mean', timezone: NZ_TZ };
  let j;
  try { j = await omGet(OM.archive, params, 30000); }
  catch (e){
    if (!/HTTP 400/.test(e.message)) throw e;
    params.daily = 'temperature_2m_max,temperature_2m_min';
    j = await omGet(OM.archive, params, 30000);
  }
  const d = j.daily;
  if (!d || !d.time) throw new Error('unexpected response shape');
  const mean = d.temperature_2m_mean || (d.temperature_2m_max && d.temperature_2m_min ? d.temperature_2m_max.map((x, i) => (x != null && d.temperature_2m_min[i] != null) ? (x + d.temperature_2m_min[i]) / 2 : null) : null);
  if (!mean) throw new Error('unexpected response shape');
  const days = d.time.map((s, i) => ({ t: Math.round((Date.parse(s + 'T00:00:00Z') - todayMs) / DAY), mean: mean[i] })).filter(x => x.mean != null);
  return { days, fetched: Date.now(), todayMs };
}

/* --- small localStorage cache (per-viewer convenience only) --- */
function cacheGet(key, maxAgeMs){
  try { const raw = localStorage.getItem(key); if (!raw) return null; const o = JSON.parse(raw); if (Date.now() - o.at > maxAgeMs) return null; return o.v; } catch(e){ return null; }
}
function cacheSet(key, v){ try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), v })); } catch(e){} }

/* --- Optional: same-site outlook.json overrides the built-in NIWA outlook --- */
async function loadOutlookFile(){
  const res = await fetch('outlook.json?ts=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  if (!j.groups || !j.updated) throw new Error('missing groups/updated');
  return j;
}

/* haversine km, for nearest-region fallback */
function kmBetween(a, b){
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function nearestRegion(lat, lon){
  let best = REGIONS[0], bd = 1e9;
  for (const r of REGIONS){ const d = kmBetween({ lat, lon }, r); if (d < bd){ bd = d; best = r; } }
  return best;
}
