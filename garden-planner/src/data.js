/* ============================================================
   DATA — regions, seasonal outlook, crops
   Everything here is the OFFLINE FALLBACK. Live data (Open-Meteo)
   overrides climate + outlook when it loads.
   ============================================================ */

/* Groups match NIWA / Earth Sciences NZ seasonal outlook regions */
const OUTLOOK_GROUPS = {
  north:     { label: 'Northland, Auckland, Waikato, Bay of Plenty' },
  central:   { label: 'Central North Island, Taranaki, Whanganui, Manawatū, Wellington' },
  east:      { label: 'Gisborne, Hawke’s Bay, Wairarapa' },
  nelson:    { label: 'Tasman, Nelson, Marlborough, Buller' },
  southwest: { label: 'West Coast, Southern Alps, inland Otago, Southland' },
  canterbury:{ label: 'Coastal Canterbury, east Otago' }
};

/* Seasonal anomaly anchors (°C vs normal) and rainfall index (-1 dry … +1 wet)
   at mid-spring (Oct 15), mid-summer (Jan 15), mid-autumn (Apr 15), mid-winter (Jul 15).
   Spring values are read from the NIWA Sep–Nov 2026 outlook (issued 2 Sep 2026).
   Summer/autumn values are an El Niño-pattern assumption (NIWA: "recurring pattern of an
   unusually dry summer in the north and east, wetter in the south and west"). */
const OUTLOOK = {
  updated: '2026-09-02',
  title: 'NIWA / Earth Sciences NZ seasonal outlook, Sep–Nov 2026 (issued 2 Sep 2026)',
  enso: 'Very strong El Niño, expected to peak Nov–Dec 2026 and fade by Apr–May 2027',
  notes: 'Windy, changeable spring with occasional cold outbreaks despite the warm tilt. Drier than normal north and east; wetter in the south-west.',
  groups: {
    north:     { t: { spr: 0.5, sum: 0.6, aut: 0.3, win: 0.1 }, r: { spr: -1.0, sum: -1.0, aut: -0.5, win: 0 },
                 blurb: 'Warmer than normal (about 50% chance above average) and drier than normal (about 50% chance below).' },
    central:   { t: { spr: 0.3, sum: 0.3, aut: 0.2, win: 0.0 }, r: { spr: -0.6, sum: -0.6, aut: -0.3, win: 0 },
                 blurb: 'Near or above average temperatures; rainfall near or below normal.' },
    east:      { t: { spr: 0.5, sum: 0.7, aut: 0.3, win: 0.1 }, r: { spr: -1.0, sum: -1.0, aut: -0.5, win: 0 },
                 blurb: 'Warmer than normal (about 50% chance above) and drier (about 50% chance below normal rainfall).' },
    nelson:    { t: { spr: 0.2, sum: 0.4, aut: 0.2, win: 0.0 }, r: { spr: -0.5, sum: -0.7, aut: -0.3, win: 0 },
                 blurb: 'Near or above average temperatures; rainfall below or near normal.' },
    southwest: { t: { spr: 0.0, sum: -0.3, aut: 0.0, win: 0.0 }, r: { spr: 1.0, sum: 0.6, aut: 0.3, win: 0 },
                 blurb: 'Near average temperatures; wetter than normal (about 60% chance above).' },
    canterbury:{ t: { spr: 0.3, sum: 0.5, aut: 0.2, win: 0.0 }, r: { spr: -0.6, sum: -0.8, aut: -0.4, win: 0 },
                 blurb: 'Above or near average temperatures; rainfall below or near normal.' }
  }
};

const OUTLOOK_PRESETS = {
  auto:    { label: 'Auto — use the latest outlook for my area' },
  elnino:  { label: 'El Niño pattern' },
  neutral: { label: 'Normal year (no adjustment)' },
  lanina:  { label: 'La Niña pattern' }
};
const LANINA = {
  north:     { t: { spr: 0.5, sum: 0.7, aut: 0.5, win: 0.3 }, r: { spr: 0.7, sum: 0.7, aut: 0.5, win: 0.2 } },
  east:      { t: { spr: 0.5, sum: 0.7, aut: 0.5, win: 0.3 }, r: { spr: 0.6, sum: 0.7, aut: 0.4, win: 0.2 } },
  central:   { t: { spr: 0.4, sum: 0.5, aut: 0.4, win: 0.2 }, r: { spr: 0.4, sum: 0.4, aut: 0.3, win: 0.1 } },
  nelson:    { t: { spr: 0.4, sum: 0.5, aut: 0.4, win: 0.2 }, r: { spr: -0.3, sum: -0.3, aut: -0.2, win: 0 } },
  southwest: { t: { spr: 0.2, sum: 0.3, aut: 0.2, win: 0.0 }, r: { spr: -0.3, sum: -0.3, aut: -0.2, win: 0 } },
  canterbury:{ t: { spr: 0.3, sum: 0.4, aut: 0.3, win: 0.1 }, r: { spr: -0.3, sum: -0.3, aut: -0.2, win: 0 } }
};

/* ta = long-term annual mean air temp (°C); amp = half the Jan–Jul difference;
   lsf / faf = typical last spring / first autumn light frost (MM-DD); ms = MetService slug.
   Approximate long-term normals — live climate history replaces these when available. */
const REGIONS = [
  { id:'kerikeri',    name:'Kerikeri / Bay of Islands', isl:'North Island', grp:'north',   lat:-35.23, lon:173.95, ta:15.6, amp:4.6, lsf:'07-25', faf:'06-15', ms:'kerikeri' },
  { id:'whangarei',   name:'Whangārei',                 isl:'North Island', grp:'north',   lat:-35.73, lon:174.32, ta:15.7, amp:4.4, lsf:'08-05', faf:'06-10', ms:'whangarei' },
  { id:'auckland',    name:'Auckland (city & coast)',   isl:'North Island', grp:'north',   lat:-36.85, lon:174.76, ta:15.2, amp:4.3, lsf:'08-01', faf:'06-05', ms:'auckland' },
  { id:'pukekohe',    name:'Pukekohe / South Auckland', isl:'North Island', grp:'north',   lat:-37.20, lon:174.90, ta:14.3, amp:4.6, lsf:'09-10', faf:'05-10', ms:'pukekohe' },
  { id:'hamilton',    name:'Hamilton',                  isl:'North Island', grp:'north',   lat:-37.79, lon:175.28, ta:14.0, amp:5.0, lsf:'09-25', faf:'05-01', ms:'hamilton' },
  { id:'tauranga',    name:'Tauranga',                  isl:'North Island', grp:'north',   lat:-37.69, lon:176.17, ta:14.9, amp:4.5, lsf:'08-25', faf:'05-25', ms:'tauranga' },
  { id:'whakatane',   name:'Whakatāne',                 isl:'North Island', grp:'north',   lat:-37.95, lon:177.00, ta:14.6, amp:4.6, lsf:'09-01', faf:'05-20', ms:'whakatane' },
  { id:'rotorua',     name:'Rotorua',                   isl:'North Island', grp:'north',   lat:-38.14, lon:176.25, ta:12.8, amp:4.8, lsf:'10-15', faf:'04-20', ms:'rotorua' },
  { id:'taupo',       name:'Taupō',                     isl:'North Island', grp:'central', lat:-38.69, lon:176.08, ta:11.6, amp:5.0, lsf:'10-28', faf:'04-10', ms:'taupo' },
  { id:'gisborne',    name:'Gisborne',                  isl:'North Island', grp:'east',    lat:-38.66, lon:178.02, ta:14.6, amp:5.0, lsf:'09-05', faf:'05-20', ms:'gisborne' },
  { id:'napier',      name:'Napier / Hastings',         isl:'North Island', grp:'east',    lat:-39.49, lon:176.91, ta:14.4, amp:5.1, lsf:'09-15', faf:'05-05', ms:'napier' },
  { id:'newplymouth', name:'New Plymouth',              isl:'North Island', grp:'central', lat:-39.06, lon:174.08, ta:13.9, amp:4.2, lsf:'08-15', faf:'06-01', ms:'new-plymouth' },
  { id:'whanganui',   name:'Whanganui',                 isl:'North Island', grp:'central', lat:-39.93, lon:175.05, ta:14.0, amp:4.5, lsf:'08-30', faf:'05-25', ms:'whanganui' },
  { id:'palmerston',  name:'Palmerston North',          isl:'North Island', grp:'central', lat:-40.36, lon:175.61, ta:12.8, amp:4.8, lsf:'09-20', faf:'05-05', ms:'palmerston-north' },
  { id:'masterton',   name:'Masterton / Wairarapa',     isl:'North Island', grp:'east',    lat:-40.95, lon:175.66, ta:12.2, amp:5.3, lsf:'10-05', faf:'04-25', ms:'masterton' },
  { id:'wellington',  name:'Wellington',                isl:'North Island', grp:'central', lat:-41.29, lon:174.78, ta:12.8, amp:4.3, lsf:'08-20', faf:'06-05', ms:'wellington' },
  { id:'nelson',      name:'Nelson',                    isl:'South Island', grp:'nelson',  lat:-41.27, lon:173.28, ta:12.7, amp:5.0, lsf:'09-15', faf:'05-10', ms:'nelson' },
  { id:'blenheim',    name:'Blenheim / Marlborough',    isl:'South Island', grp:'nelson',  lat:-41.51, lon:173.96, ta:13.0, amp:5.5, lsf:'09-25', faf:'05-01', ms:'blenheim' },
  { id:'greymouth',   name:'Greymouth / West Coast',    isl:'South Island', grp:'southwest', lat:-42.45, lon:171.21, ta:11.4, amp:4.2, lsf:'09-05', faf:'05-15', ms:'greymouth' },
  { id:'christchurch',name:'Christchurch',              isl:'South Island', grp:'canterbury', lat:-43.53, lon:172.64, ta:11.7, amp:5.4, lsf:'10-01', faf:'04-25', ms:'christchurch' },
  { id:'timaru',      name:'Timaru / South Canterbury', isl:'South Island', grp:'canterbury', lat:-44.40, lon:171.25, ta:10.9, amp:4.8, lsf:'10-10', faf:'04-20', ms:'timaru' },
  { id:'dunedin',     name:'Dunedin',                   isl:'South Island', grp:'canterbury', lat:-45.87, lon:170.50, ta:10.8, amp:4.3, lsf:'10-05', faf:'05-01', ms:'dunedin' },
  { id:'queenstown',  name:'Queenstown / Wānaka',       isl:'South Island', grp:'southwest', lat:-45.03, lon:168.66, ta:9.8,  amp:6.2, lsf:'11-05', faf:'04-01', ms:'queenstown' },
  { id:'alexandra',   name:'Central Otago (Alexandra, Cromwell)', isl:'South Island', grp:'southwest', lat:-45.25, lon:169.38, ta:10.4, amp:7.6, lsf:'10-25', faf:'04-10', ms:'alexandra' },
  { id:'invercargill',name:'Invercargill / Southland',  isl:'South Island', grp:'southwest', lat:-46.41, lon:168.35, ta:9.8,  amp:4.5, lsf:'10-20', faf:'04-20', ms:'invercargill' }
];

/* Crop groups — colours come from the validated categorical palette (CSS vars --g1…--g8). */
const GROUPS = {
  bras:  { name:'Brassicas',       slot:1 },
  root:  { name:'Roots & tubers',  slot:2 },
  herb:  { name:'Herbs',           slot:3 },
  vine:  { name:'Vines & corn',    slot:4 },
  alli:  { name:'Alliums',         slot:5 },
  leaf:  { name:'Leafy greens',    slot:6 },
  legu:  { name:'Legumes',         slot:7 },
  fruit: { name:'Fruiting',        slot:8 }
};

/* Crop model
   warm   frost-tender, needs warm soil + must finish before autumn cools
   tb     base temperature for growth (°C)
   d, rt  days from in-ground date to first harvest at a reference mean temperature rt
          → thermal time gdd = d × (rt − tb); the engine then uses the real (adjusted) temperatures
   span   days the harvest lasts (also how long the space stays occupied)
   minSoil  soil temp to sow/plant
   fb     days after the last spring frost before planting out (negative = before)
   nur    weeks raising seedlings before planting out (0 = sown direct)
   pm     plants per m² · kg  kg harvested per plant per round
   mode   seq = replant same space after harvest · stag = staggered sowings every `gap` days
   max    most rounds / sowings the planner will schedule
   months allowed planting months (1–12) · hmax  mean °C above which it bolts / sulks
   kind   seedling | direct | tuber | clove | slip     */
const CROPS = [
 // ---- Fruiting
 { id:'tomato',   n:'Tomato',            g:'fruit', warm:1, tb:10, d:75,  rt:18, span:70, minSoil:13, fb:10, nur:6, pm:3,   kg:4,    mode:'seq', max:1, def:4,  kind:'seedling', water:3, sp:'50 cm apart, staked', comp:'Basil, carrots, marigolds', avoid:'Potatoes, fennel, brassicas', tip:'Feed weekly once fruit sets; mulch to hold moisture.', pack:30 },
 { id:'cherry',   n:'Cherry tomato',     g:'fruit', warm:1, tb:10, d:65,  rt:18, span:80, minSoil:13, fb:10, nur:6, pm:3,   kg:3,    mode:'seq', max:1, def:2,  kind:'seedling', water:3, sp:'50 cm apart, staked', comp:'Basil, carrots', avoid:'Potatoes, fennel', tip:'Earliest fruit of the tomatoes — a good first planting.', pack:30 },
 { id:'capsicum', n:'Capsicum',          g:'fruit', warm:1, tb:12, d:85,  rt:19, span:60, minSoil:15, fb:14, nur:8, pm:4,   kg:1.2,  mode:'seq', max:1, def:3,  kind:'seedling', water:2, sp:'40 cm apart', comp:'Basil, onions', avoid:'Fennel', tip:'Needs real warmth — wait for settled weather.', pack:20 },
 { id:'chilli',   n:'Chilli',            g:'fruit', warm:1, tb:12, d:90,  rt:19, span:70, minSoil:15, fb:14, nur:8, pm:4,   kg:0.5,  mode:'seq', max:1, def:2,  kind:'seedling', water:2, sp:'40 cm apart', comp:'Basil, tomatoes', avoid:'Fennel', tip:'Slightly stressed (a bit dry) plants are hotter.', pack:20 },
 { id:'eggplant', n:'Eggplant',          g:'fruit', warm:1, tb:12, d:95,  rt:19, span:50, minSoil:16, fb:14, nur:8, pm:3,   kg:2,    mode:'seq', max:1, def:2,  kind:'seedling', water:2, sp:'50 cm apart', comp:'Beans, basil', avoid:'Fennel', tip:'The fussiest of the warm crops — cloche it early.', pack:20 },
 // ---- Vines & corn
 { id:'zucchini', n:'Zucchini',          g:'vine',  warm:1, tb:10, d:50,  rt:18, span:60, minSoil:14, fb:10, nur:3, pm:0.8, kg:6,    mode:'seq', nxt:0.5, max:2, def:2,  kind:'seedling', water:3, sp:'120 cm apart', comp:'Beans, corn, nasturtium', avoid:'Potatoes', tip:'A second planting replaces the first once mildew arrives.', pack:10 },
 { id:'cucumber', n:'Cucumber',          g:'vine',  warm:1, tb:12, d:55,  rt:19, span:45, minSoil:15, fb:10, nur:3, pm:3,   kg:3,    mode:'seq', nxt:0.5, max:2, def:3,  kind:'seedling', water:3, sp:'30 cm apart on a trellis', comp:'Beans, corn, dill', avoid:'Potatoes, strong herbs', tip:'Trellis them to save space and cut fungal problems.', pack:15 },
 { id:'pumpkin',  n:'Pumpkin / butternut', g:'vine', warm:1, tb:10, d:100, rt:17.5, span:30, minSoil:14, fb:10, nur:3, pm:0.4, kg:6,    mode:'seq', max:1, def:2,  kind:'seedling', water:2, sp:'150 cm apart', comp:'Corn, beans', avoid:'Potatoes', tip:'Hungry and sprawling — give it the edge of the plot.', pack:8 },
 { id:'rockmelon',n:'Rockmelon',         g:'vine',  warm:1, tb:12, d:110, rt:20, span:25, minSoil:17, fb:14, nur:3, pm:0.6, kg:2.5,  mode:'seq', max:1, def:1,  kind:'seedling', water:2, sp:'100 cm apart', comp:'Corn', avoid:'Potatoes', tip:'Only worth it in the warmest spots (or under cover).', pack:10 },
 { id:'corn',     n:'Sweetcorn',         g:'vine',  warm:1, tb:10, d:90,  rt:18, span:14, minSoil:13, fb:7,  nur:0, pm:6,   kg:0.35, mode:'seq', max:2, def:12, kind:'direct', sow:1.3, water:2, sp:'30 cm apart, in a block', comp:'Beans, pumpkin, cucumber', avoid:'Tomatoes', tip:'Plant in a block, not a row, so it pollinates.', pack:50 },
 // ---- Legumes
 { id:'dbean',    n:'Dwarf beans',       g:'legu',  warm:1, tb:10, d:60,  rt:18, span:28, minSoil:14, fb:10, nur:0, pm:16,  kg:0.15, mode:'seq', nxt:0.75, max:3, def:24, kind:'direct', sow:1.2, water:2, sp:'10 cm apart, rows 40 cm', comp:'Carrots, corn, cucumber', avoid:'Onions, garlic', tip:'Fastest summer crop — ideal for a second round.', pack:40 },
 { id:'cbean',    n:'Climbing beans',    g:'legu',  warm:1, tb:10, d:70,  rt:18, span:45, minSoil:14, fb:10, nur:0, pm:12,  kg:0.35, mode:'seq', max:2, def:8,  kind:'direct', sow:1.3, water:2, sp:'15 cm apart up a trellis', comp:'Corn, cucumber', avoid:'Onions, garlic', tip:'Grow up a teepee or fence — tiny footprint, big crop.', pack:30 },
 { id:'peas',     n:'Peas',              g:'legu',  warm:0, tb:4,  d:70,  rt:12, span:21, minSoil:6,  nur:0, pm:40,  kg:0.06, mode:'seq', max:2, def:40, kind:'direct', sow:1.3, water:2, hmax:15.5, sp:'5 cm apart, double row', comp:'Carrots, radish', avoid:'Onions, garlic', tip:'Cool-season: sow in autumn or early spring, not summer.', pack:80 },
 { id:'broadbean',n:'Broad beans',       g:'legu',  warm:0, tb:3,  d:150, rt:10, span:28, minSoil:5,  nur:0, pm:12,  kg:0.25, mode:'seq', max:1, def:12, kind:'direct', sow:1.2, water:1, months:[4,5,6,7,8], sp:'20 cm apart', comp:'Potatoes, carrots', avoid:'Onions, garlic', tip:'Autumn/winter sowing; also fixes nitrogen for the next crop.', pack:30 },
 // ---- Leafy
 { id:'lettuce',  n:'Lettuce',           g:'leaf',  warm:0, tb:4,  d:45,  rt:14, span:21, minSoil:5,  nur:4, pm:12,  kg:0.25, mode:'stag', gap:21, max:8, def:6, kind:'seedling', water:2, hmax:19, sp:'25 cm apart', comp:'Carrots, radish, onions', avoid:'Celery', tip:'Sow a few every 3 weeks; shade cloth in hot spells.', pack:500, per:'per sowing' },
 { id:'spinach',  n:'Spinach',           g:'leaf',  warm:0, tb:3,  d:45,  rt:12, span:30, minSoil:5,  nur:0, pm:30,  kg:0.05, mode:'stag', gap:21, max:5, def:15, kind:'direct', sow:1.5, water:2, hmax:15.5, sp:'12 cm apart', comp:'Peas, brassicas', avoid:'—', tip:'Bolts in heat — this is a cool-season crop.', pack:100, per:'per sowing' },
 { id:'silverbeet',n:'Silverbeet',       g:'leaf',  warm:0, tb:5,  d:70,  rt:15, span:200,minSoil:8,  nur:4, pm:6,   kg:0.8,  mode:'seq', max:1, def:4,  kind:'seedling', water:2, sp:'30 cm apart', comp:'Beans, onions', avoid:'—', tip:'Pick outer leaves and it keeps going for months.', pack:50 },
 { id:'rocket',   n:'Rocket',            g:'leaf',  warm:0, tb:4,  d:30,  rt:14, span:25, minSoil:5,  nur:0, pm:60,  kg:0.03, mode:'stag', gap:21, max:5, def:30, kind:'direct', sow:1.5, water:2, hmax:18, sp:'8 cm apart', comp:'Lettuce, beetroot', avoid:'—', tip:'Quick and peppery; goes hot and bitter in summer.', pack:500, per:'per sowing' },
 { id:'parsley',  n:'Parsley',           g:'herb',  warm:0, tb:5,  d:75,  rt:15, span:220,minSoil:8,  nur:6, pm:9,   kg:0.4,  mode:'seq', max:1, def:3,  kind:'seedling', water:2, sp:'25 cm apart', comp:'Tomatoes, asparagus', avoid:'Lettuce', tip:'Slow to germinate — buy seedlings if you’re impatient.', pack:200 },
 // ---- Brassicas
 { id:'broccoli', n:'Broccoli',          g:'bras',  warm:0, tb:4,  d:75,  rt:14, span:30, minSoil:6,  nur:5, pm:3,   kg:0.5,  mode:'stag', gap:28, max:3, def:4, kind:'seedling', water:2, hmax:20, sp:'45 cm apart', comp:'Onions, beetroot, herbs', avoid:'Tomatoes, strawberries', tip:'Net against white butterfly; side shoots keep coming after the head.', pack:100, per:'per sowing' },
 { id:'cabbage',  n:'Cabbage',           g:'bras',  warm:0, tb:4,  d:90,  rt:14, span:21, minSoil:6,  nur:5, pm:3.5, kg:1.2,  mode:'stag', gap:30, max:3, def:4, kind:'seedling', water:2, hmax:21, sp:'40 cm apart', comp:'Onions, herbs', avoid:'Tomatoes', tip:'Net against white butterfly.', pack:100, per:'per sowing' },
 { id:'cauli',    n:'Cauliflower',       g:'bras',  warm:0, tb:4,  d:100, rt:14, span:14, minSoil:6,  nur:5, pm:3,   kg:0.8,  mode:'stag', gap:30, max:2, def:3, kind:'seedling', water:2, hmax:20, sp:'50 cm apart', comp:'Onions, beetroot', avoid:'Tomatoes', tip:'Steady water and cool weather stop it “buttoning”.', pack:100, per:'per sowing' },
 { id:'kale',     n:'Kale',              g:'bras',  warm:0, tb:4,  d:70,  rt:14, span:150,minSoil:6,  nur:5, pm:4,   kg:0.8,  mode:'seq', max:1, def:3,  kind:'seedling', water:1, sp:'40 cm apart', comp:'Onions, beetroot', avoid:'Tomatoes', tip:'Tough, cold-hardy, and it just keeps giving.', pack:100 },
 { id:'sprouts',  n:'Brussels sprouts',  g:'bras',  warm:0, tb:4,  d:150, rt:13, span:60, minSoil:6,  nur:6, pm:2.5, kg:0.6,  mode:'seq', max:1, def:3,  kind:'seedling', water:2, sp:'50 cm apart', comp:'Onions, herbs', avoid:'Tomatoes', tip:'Long season — plant in early summer for winter sprouts.', pack:100 },
 { id:'bokchoy',  n:'Bok choy',          g:'bras',  warm:0, tb:4,  d:45,  rt:15, span:14, minSoil:6,  nur:0, pm:16,  kg:0.25, mode:'stag', gap:21, max:4, def:8, kind:'direct', sow:1.5, water:2, hmax:20, sp:'20 cm apart', comp:'Onions', avoid:'—', tip:'Quick in spring and autumn; bolts if it gets hot.', pack:200, per:'per sowing' },
 // ---- Roots & tubers
 { id:'carrot',   n:'Carrots',           g:'root',  warm:0, tb:4,  d:90,  rt:14, span:45, minSoil:7,  nur:0, pm:60,  kg:0.07, mode:'stag', gap:28, max:4, def:60, kind:'direct', sow:2.5, water:2, sp:'5 cm apart, rows 20 cm', comp:'Onions, lettuce, peas', avoid:'Dill', tip:'Keep the seedbed damp until they’re up.', pack:800, per:'per sowing' },
 { id:'beetroot', n:'Beetroot',          g:'root',  warm:0, tb:5,  d:60,  rt:15, span:45, minSoil:8,  nur:0, pm:25,  kg:0.12, mode:'stag', gap:28, max:4, def:30, kind:'direct', sow:1.8, water:2, sp:'10 cm apart', comp:'Onions, brassicas', avoid:'Climbing beans', tip:'Each “seed” is a cluster — thin to one.', pack:100, per:'per sowing' },
 { id:'radish',   n:'Radish',            g:'root',  warm:0, tb:4,  d:28,  rt:15, span:14, minSoil:5,  nur:0, pm:100, kg:0.02, mode:'stag', gap:14, max:6, def:60, kind:'direct', sow:1.2, water:2, hmax:21, sp:'3 cm apart', comp:'Carrots, lettuce, cucumber', avoid:'Hyssop', tip:'Ready in a month — fill any gap with them.', pack:200, per:'per sowing' },
 { id:'parsnip',  n:'Parsnip',           g:'root',  warm:0, tb:4,  d:150, rt:12, span:60, minSoil:6,  nur:0, pm:20,  kg:0.15, mode:'seq', max:1, def:30, kind:'direct', sow:2.5, water:1, months:[8,9,10,11], sp:'10 cm apart', comp:'Onions, garlic', avoid:'Carrots', tip:'Slow to germinate — use fresh seed every year.', pack:200 },
 { id:'potato',   n:'Potatoes',          g:'root',  warm:0, tb:7,  d:100, rt:14, span:30, minSoil:8,  fb:-21, nur:0, pm:5, kg:0.8,  mode:'seq', max:2, def:10, kind:'tuber', water:3, months:[7,8,9,10,11,12,1], sp:'30 cm apart, rows 60 cm', comp:'Beans, cabbage', avoid:'Tomatoes, pumpkin', tip:'Plant early, then a “Christmas” crop for winter harvest.', pack:1 },
 { id:'kumara',   n:'Kumara',            g:'root',  warm:1, tb:12, d:110, rt:20, span:25, minSoil:16, fb:14, nur:0, pm:3,   kg:1.0,  mode:'seq', max:1, def:8,  kind:'slip', water:2, sp:'40 cm apart on mounds', comp:'—', avoid:'—', tip:'Needs a long warm season — best in the north or under cover.', pack:1 },
 // ---- Alliums
 { id:'garlic',   n:'Garlic',            g:'alli',  warm:0, tb:3,  d:190, rt:13.5, span:21, minSoil:2, nur:0, pm:25,  kg:0.05, mode:'seq', max:1, def:25, kind:'clove', water:1, months:[5,6,7], sp:'10 cm apart, rows 25 cm', comp:'Tomatoes, roses', avoid:'Beans, peas', tip:'Traditionally planted on the shortest day (21 June).', pack:1 },
 { id:'onion',    n:'Onions (bulb)',     g:'alli',  warm:0, tb:3,  d:200, rt:13, span:30, minSoil:5,  nur:8, pm:30,  kg:0.12, mode:'seq', max:1, def:30, kind:'seedling', water:1, months:[5,6,7,8], sp:'10 cm apart, rows 25 cm', comp:'Carrots, beetroot, brassicas', avoid:'Peas, beans', tip:'Plant out winter seedlings for a summer harvest.', pack:300 },
 { id:'springon', n:'Spring onions',     g:'alli',  warm:0, tb:4,  d:70,  rt:14, span:30, minSoil:6,  nur:0, pm:100, kg:0.02, mode:'stag', gap:28, max:5, def:60, kind:'direct', sow:1.5, water:1, sp:'3 cm apart', comp:'Carrots, lettuce', avoid:'Peas, beans', tip:'Handy little space-filler all year.', pack:300, per:'per sowing' },
 { id:'leek',     n:'Leeks',             g:'alli',  warm:0, tb:4,  d:150, rt:13, span:60, minSoil:8,  nur:8, pm:20,  kg:0.15, mode:'seq', max:1, def:12, kind:'seedling', water:2, months:[9,10,11,12,1], sp:'15 cm apart', comp:'Carrots, celery', avoid:'Beans, peas', tip:'Plant deep into holes and let them blanch.', pack:200 },
 // ---- Herbs
 { id:'basil',    n:'Basil',             g:'herb',  warm:1, tb:10, d:42,  rt:18, span:90, minSoil:15, fb:14, nur:5, pm:9,   kg:0.3,  mode:'seq', nxt:0.5, max:2, def:4,  kind:'seedling', water:2, sp:'25 cm apart', comp:'Tomatoes, capsicum', avoid:'Rue', tip:'Pinch the tips to keep it bushy and stop flowering.', pack:150 },
 { id:'coriander',n:'Coriander',         g:'herb',  warm:0, tb:4,  d:40,  rt:15, span:20, minSoil:6,  nur:0, pm:40,  kg:0.02, mode:'stag', gap:21, max:4, def:30, kind:'direct', sow:1.5, water:2, hmax:17, sp:'8 cm apart', comp:'Spinach, peas', avoid:'Fennel', tip:'Bolts quickly in heat — sow little and often.', pack:100, per:'per sowing' }
];
