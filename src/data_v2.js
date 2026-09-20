/* ============================================================
   DATA v2 — more crops (incl. flowers), crop traits, soil & feed profiles,
   tomato guide, perennials (grapes, fruit trees, citrus, flowering shrubs)
   ============================================================ */

/* ---------- more crops ---------- */
CROPS.push(
 // tomatoes: determinate (bush) and paste types
 { id:'tomatodet', n:'Tomato — determinate (bush)', g:'fruit', warm:1, tb:10, d:65, rt:18, span:28, minSoil:13, fb:10, nur:6, pm:4, kg:3.5, mode:'stag', gap:21, max:2, def:4, kind:'seedling', water:3, sp:'45 cm apart, short stakes or a cage', comp:'Basil, carrots, marigolds', avoid:'Potatoes, fennel, brassicas', tip:'Sets most of its fruit at once, then finishes — plant a second batch 3 weeks later to spread the harvest. Don’t pinch out the side shoots.', pack:30, per:'per batch', tt:'det', potL:20 },
 { id:'paste', n:'Paste tomato (Roma type)', g:'fruit', warm:1, tb:10, d:75, rt:18, span:25, minSoil:13, fb:10, nur:6, pm:4, kg:5, mode:'seq', max:1, def:6, kind:'seedling', water:2, sp:'45 cm apart, cage or short stakes', comp:'Basil, garlic', avoid:'Potatoes, fennel', tip:'Determinate: the whole crop ripens in a few weeks — ideal for a big batch of sauce.', pack:30, tt:'det', potL:20 },
 // vegetables
 { id:'daikon', n:'Daikon radish', g:'root', warm:0, tb:4, d:60, rt:15, span:21, minSoil:8, nur:0, pm:16, kg:0.6, mode:'stag', gap:21, max:4, def:12, kind:'direct', sow:1.5, water:2, hmax:19, months:[1,2,3,4,5,8,9], sp:'15 cm apart, rows 30 cm; loose, deep soil', comp:'Lettuce, spinach, peas', avoid:'Other brassicas in the same bed last year', tip:'Sow late summer to autumn for the best roots — spring sowings bolt as days lengthen. Loosen the soil 30 cm deep and skip fresh manure so roots don’t fork.', pack:200, per:'per sowing', potL:12, lt:1 },
 { id:'wasabi', n:'Wasabi', g:'root', warm:0, tb:3, d:540, rt:11, span:120, minSoil:4, nur:0, pm:4, kg:0.15, mode:'seq', max:1, def:4, kind:'seedling', water:3, hmax:16, slow:1.6, months:[3,4,5,9,10,11], sp:'30 cm apart in cool shade with constant moisture', comp:'Ferns, hostas (same conditions)', avoid:'Full sun and hot, dry spots', tip:'Wants shade, cool roots (8–18 °C), rich damp soil and humidity. Leaves and stems can be picked from about 8 months; the rhizome takes 18–24 months. Tends to struggle above 21 °C.', pack:5, potL:12, lt:2, minShade:1, dsow:false, fam:'brassica', feed:'wasabi' },
 { id:'popcorn', n:'Popcorn', g:'vine', warm:1, tb:10, d:105, rt:18, span:35, minSoil:14, fb:7, nur:0, pm:6, kg:0.12, mode:'seq', max:1, def:16, kind:'direct', sow:1.3, water:2, sp:'25 cm apart, in a block (not a row)', comp:'Beans, pumpkin', avoid:'Sweetcorn nearby (cross-pollination makes it starchy); tomatoes', tip:'Needs a long, warm season. Leave the cobs on the plant until husks are brown and dry, then dry them indoors 2–3 weeks. “Harvest” here is dry kernels.', pack:50, tray:3, potL:15, endT:12 },
 { id:'watermelon', n:'Watermelon', g:'vine', warm:1, tb:12, d:95, rt:19, span:20, minSoil:15, fb:10, nur:4, pm:0.35, kg:6, mode:'seq', max:1, def:2, kind:'seedling', water:3, sp:'150 cm apart, or trained up a strong trellis', comp:'Corn, marigolds', avoid:'Potatoes', tip:'Needs real heat: in cooler regions grow under glass, or use black mulch and cloches. Ripe when the tendril nearest the fruit browns and the ground spot turns creamy yellow.', pack:8, dsow:true, potL:40 },
 { id:'edamame', n:'Edamame (soybean)', g:'legu', warm:1, tb:10, d:75, rt:20, span:14, minSoil:15, fb:10, nur:0, pm:25, kg:0.08, mode:'stag', gap:14, max:3, def:20, kind:'direct', sow:1.3, water:2, sp:'10 cm apart, rows 40 cm', comp:'Corn, carrots', avoid:'Onions, garlic', tip:'Pick pods when plump but still green. Sow in small batches two weeks apart.', pack:100, per:'per sowing', tray:3, potL:3 },
 { id:'turnip', n:'Turnip', g:'root', warm:0, tb:3, d:50, rt:14, span:21, minSoil:6, nur:0, pm:25, kg:0.15, mode:'stag', gap:21, max:4, def:25, kind:'direct', sow:1.5, water:2, hmax:20, sp:'10 cm apart', comp:'Peas, lettuce', avoid:'Other brassicas last year', tip:'Quick and cool-season; pick young for the best flavour.', pack:200, per:'per sowing', lt:1 },
 { id:'swede', n:'Swede', g:'root', warm:0, tb:3, d:120, rt:12, span:45, minSoil:8, nur:0, pm:12, kg:0.7, mode:'seq', max:1, def:12, kind:'direct', sow:1.5, water:2, hmax:19, months:[10,11,12,1], sp:'20 cm apart', comp:'Peas, beans', avoid:'Other brassicas last year', tip:'Sow late spring to midsummer for a winter crop. Boron-deficient soil gives brown-hearted roots.', pack:200 },
 { id:'kohlrabi', n:'Kohlrabi', g:'bras', warm:0, tb:4, d:55, rt:14, span:14, minSoil:6, nur:4, pm:12, kg:0.3, mode:'stag', gap:21, max:4, def:8, kind:'seedling', water:2, hmax:20, sp:'20 cm apart', comp:'Onions, beetroot', avoid:'Tomatoes', tip:'Pick at tennis-ball size — bigger goes woody.', pack:100, per:'per sowing', dsow:true },
 { id:'fennel', n:'Florence fennel', g:'herb', warm:0, tb:5, d:90, rt:15, span:21, minSoil:9, nur:0, pm:9, kg:0.3, mode:'seq', max:1, def:6, kind:'direct', sow:1.5, water:2, hmax:20, sp:'25 cm apart', comp:'Dill, lettuce', avoid:'Tomatoes, beans, most other crops (it stunts neighbours)', tip:'Bolts if stressed or transplanted late — sow direct. Keep it apart from tomatoes and beans.', pack:100 },
 { id:'celery', n:'Celery', g:'leaf', warm:0, tb:6, d:120, rt:15, span:30, minSoil:9, nur:10, pm:8, kg:0.8, mode:'seq', max:1, def:6, kind:'seedling', water:3, hmax:20, sp:'25 cm apart', comp:'Leeks, beans, cabbage', avoid:'Lettuce', tip:'Thirsty and slow: needs constant moisture and rich soil. Buy seedlings unless you like growing from fine seed.', pack:300 },
 { id:'mizuna', n:'Mizuna / Asian greens', g:'bras', warm:0, tb:3, d:30, rt:14, span:20, minSoil:5, nur:0, pm:40, kg:0.04, mode:'stag', gap:14, max:6, def:30, kind:'direct', sow:1.5, water:2, hmax:20, sp:'5 cm apart, cut-and-come-again', comp:'Lettuce, carrots', avoid:'—', tip:'Cut-and-come-again salad greens for cool weather. Net against white butterfly.', pack:500, per:'per sowing', potL:2, lt:1 },
 { id:'strawberry', n:'Strawberries', g:'fruit', warm:0, tb:5, d:85, rt:15, span:60, minSoil:8, nur:0, pm:5, kg:0.6, mode:'seq', max:1, def:6, kind:'seedling', water:2, hmax:24, months:[4,5,6,7,8,9,10], sp:'35 cm apart', comp:'Lettuce, spinach, borage', avoid:'Brassicas', tip:'Plant runners in autumn or spring; net against birds and mulch under the fruit. Replace plants every 3 years.', pack:1, potL:4, lt:0 },
 { id:'greenman', n:'Green manure (lupin / mustard / oats)', g:'legu', warm:0, tb:3, d:60, rt:12, span:30, minSoil:5, nur:0, pm:200, kg:0, mode:'seq', max:2, def:400, kind:'direct', sow:1, water:1, months:[3,4,5,6,8,9,10], sp:'Broadcast thickly and rake in', comp:'—', avoid:'—', tip:'Sown into a resting bed, then chopped and dug in before it flowers to feed the soil. Legumes such as lupin add nitrogen; mustard helps clear pests.', pack:1000, per:'per sowing', lt:1, potL:1, feed:'greenman' },

 // flowers ------------------------------------------------------------
 { id:'sunflower', n:'Sunflowers', g:'flow', u:'stems', warm:1, tb:8, d:80, rt:18, span:14, minSoil:12, fb:7, nur:0, pm:4, kg:1, mode:'stag', gap:14, max:5, def:8, kind:'direct', sow:1.3, water:2, sp:'30–45 cm apart', comp:'Cucumber, corn', avoid:'—', tip:'Sow every two weeks for a long cut-flower season. Tall types need a windbreak or stakes.', pack:30, per:'per sowing', tray:3, potL:10, fam:'aster' },
 { id:'zinnia', n:'Zinnias', g:'flow', u:'stems', warm:1, tb:10, d:65, rt:19, span:60, minSoil:14, fb:10, nur:4, pm:12, kg:15, mode:'seq', max:1, def:12, kind:'seedling', water:2, sp:'25 cm apart', comp:'Tomatoes, beans', avoid:'—', tip:'Pinch out the top when 20 cm tall for bushier plants and many more stems. Cut often; water at the base to avoid mildew.', pack:50, dsow:true, potL:3, fam:'aster' },
 { id:'cosmos', n:'Cosmos', g:'flow', u:'stems', warm:1, tb:8, d:70, rt:17, span:70, minSoil:12, fb:7, nur:4, pm:9, kg:20, mode:'seq', max:1, def:9, kind:'seedling', water:1, sp:'30 cm apart', comp:'Vegetables (attracts pollinators)', avoid:'—', tip:'Tough and generous; thrives on poor soil — too much feed gives leaves over flowers. Deadhead to keep it flowering.', pack:100, dsow:true, potL:4, fam:'aster' },
 { id:'dahlia', n:'Dahlias (tubers)', g:'flow', u:'stems', warm:1, tb:8, d:95, rt:17, span:90, minSoil:12, fb:7, nur:0, pm:2, kg:12, mode:'seq', max:1, def:4, kind:'bulb', bunit:'tubers', water:2, sp:'60 cm apart, tubers 10 cm deep, staked', comp:'—', avoid:'Very wet, cold soil (tubers rot)', tip:'Plant tubers once frost has passed. Stake tall types at planting. Pinch out the tip at 30 cm for more stems; keep picking and they flower to frost. Lift or mulch heavily in cold areas.', pack:1, potL:15, lt:0, fam:'aster' },
 { id:'sweetpea', n:'Sweet peas', g:'flow', u:'stems', warm:0, tb:3, d:100, rt:12, span:60, minSoil:5, nur:0, pm:20, kg:25, mode:'seq', max:1, def:20, kind:'direct', sow:1.4, water:2, hmax:20, months:[3,4,5,6,7,8,9], sp:'10 cm apart up netting or canes', comp:'—', avoid:'—', tip:'Sow in autumn for early spring flowers or in late winter. Needs a tall support. Keep picking, and don’t let seed pods form or flowering stops.', pack:40, tray:6, potL:3, lt:0, fam:'legume' },
 { id:'marigold', n:'Marigolds', g:'flow', u:'stems', warm:1, tb:8, d:55, rt:17, span:90, minSoil:12, fb:7, nur:5, pm:16, kg:20, mode:'seq', max:1, def:12, kind:'seedling', water:2, sp:'20 cm apart', comp:'Tomatoes and most veg (deters some pests)', avoid:'—', tip:'A good companion around tomato beds. Deadhead for a long season.', pack:100, dsow:true, potL:2, fam:'aster', lt:0 },
 { id:'nasturtium', n:'Nasturtiums', g:'flow', u:'blooms', warm:1, tb:8, d:55, rt:16, span:100, minSoil:11, fb:0, nur:0, pm:8, kg:30, mode:'seq', max:1, def:8, kind:'direct', sow:1.5, water:1, sp:'25 cm apart', comp:'Brassicas, beans, cucumbers', avoid:'—', tip:'Edible flowers and leaves. Poor soil gives more flowers; a good sacrificial crop for aphids.', pack:25, potL:4, lt:1 },
 { id:'calendula', n:'Calendula', g:'flow', u:'stems', warm:0, tb:4, d:65, rt:14, span:120, minSoil:6, nur:0, pm:12, kg:25, mode:'seq', max:1, def:12, kind:'direct', sow:1.5, water:1, hmax:23, sp:'25 cm apart', comp:'Tomatoes, most veg', avoid:'—', tip:'Flowers through winter in mild areas. Deadhead, or let a few self-seed.', pack:60, tray:4, potL:3, lt:1, fam:'aster' },
 { id:'snapdragon', n:'Snapdragons', g:'flow', u:'stems', warm:0, tb:4, d:90, rt:14, span:40, minSoil:6, nur:8, pm:16, kg:8, mode:'seq', max:1, def:12, kind:'seedling', water:2, hmax:21, sp:'20 cm apart', comp:'—', avoid:'—', tip:'Buy seedlings for reliable spring colour; pinch once to branch. Cool-season flowers that fade in summer heat.', pack:500, potL:2, lt:1 },
 { id:'cornflower', n:'Cornflowers', g:'flow', u:'stems', warm:0, tb:3, d:90, rt:12, span:35, minSoil:5, nur:0, pm:25, kg:10, mode:'stag', gap:21, max:3, def:20, kind:'direct', sow:1.4, water:1, hmax:19, months:[3,4,5,8,9,10], sp:'15 cm apart', comp:'Vegetables', avoid:'—', tip:'Sow in autumn or early spring. Pick every second day at flowering time.', pack:100, per:'per sowing', potL:2 },
 { id:'tulip', n:'Tulips', g:'flow', u:'stems', warm:0, tb:3, d:150, rt:9, span:12, minSoil:3, nur:0, pm:40, kg:1, mode:'seq', max:1, def:30, kind:'bulb', bunit:'bulbs', water:1, hmax:15, months:[4,5,6], sp:'10 cm apart, 15 cm deep', comp:'—', avoid:'Wet, heavy soil', tip:'In mild regions (Auckland north) pre-chill bulbs in the fridge for 6–8 weeks before planting. Feed after flowering and leave the foliage until it yellows.', pack:1, potL:2, lt:1 },
 { id:'daffodil', n:'Daffodils', g:'flow', u:'stems', warm:0, tb:3, d:150, rt:9, span:14, minSoil:3, nur:0, pm:30, kg:1, mode:'seq', max:1, def:25, kind:'bulb', bunit:'bulbs', water:1, hmax:15, months:[3,4,5], sp:'12 cm apart, 15 cm deep', comp:'—', avoid:'—', tip:'Will naturalise and come back year after year. Leave the foliage six weeks after flowering.', pack:1, potL:2, lt:2 },
 { id:'ranunculus', n:'Ranunculus & anemones', g:'flow', u:'stems', warm:0, tb:3, d:140, rt:10, span:21, minSoil:4, nur:0, pm:30, kg:8, mode:'seq', max:1, def:25, kind:'bulb', bunit:'corms', water:2, hmax:17, months:[3,4,5,6], sp:'12 cm apart, claws down', comp:'—', avoid:'Waterlogged soil', tip:'Soak corms 3–4 hours before planting, claws pointing down. Great cut flowers in spring.', pack:1, potL:2, lt:1 },
 { id:'gladiolus', n:'Gladioli', g:'flow', u:'stems', warm:1, tb:7, d:90, rt:16, span:14, minSoil:10, fb:0, nur:0, pm:25, kg:1, mode:'stag', gap:14, max:5, def:12, kind:'bulb', bunit:'corms', water:2, months:[9,10,11,12], sp:'12 cm apart, 12 cm deep', comp:'—', avoid:'—', tip:'Plant a batch every two weeks for a long run of spikes. Stake in windy spots.', pack:1, per:'per planting', potL:3 }
);

/* ---------- helper plants: flowers and herbs that bring beneficial insects and pollinators ---------- */
CROPS.push(
 { id:'dill', n:'Dill', g:'herb', warm:0, tb:5, d:60, rt:16, span:60, minSoil:10, nur:0, pm:9, kg:0.1, mode:'stag', gap:21, max:3, def:8, kind:'direct', sow:1.5, water:2, hmax:21, months:[8,9,10,11,12,1,2,3], sp:'20 cm apart; sow where it will grow (it dislikes being moved)', comp:'Brassicas, cucumbers, lettuce', avoid:'Carrots, fennel', tip:'Pick the leaves young; let a few plants flower — the umbrella heads feed hoverflies and tiny parasitic wasps that eat aphids and caterpillars. It crosses with fennel, so don’t save seed from both.', pack:200, per:'per sowing', potL:3, lt:1, feed:'herb' },
 { id:'alyssum', n:'Sweet alyssum', g:'flow', u:'stems', warm:0, tb:4, d:50, rt:14, span:150, minSoil:8, nur:0, pm:25, kg:0, mode:'seq', max:1, def:10, kind:'direct', sow:1.3, water:1, months:[8,9,10,11,12,1,2,3,4], sp:'Scatter along bed edges, 15–20 cm apart', comp:'Nearly everything (feeds beneficial insects)', avoid:'—', tip:'The best edge plant for a vegetable garden: tiny flowers all season feed hoverflies and parasitic wasps, which keep aphids and caterpillars down. Sow from spring to autumn; it self-seeds gently.', pack:500, potL:2, lt:1, feed:'flower' },
 { id:'borage', n:'Borage', g:'herb', warm:0, tb:6, d:60, rt:16, span:90, minSoil:10, nur:0, pm:2, kg:0.05, mode:'seq', max:1, def:3, kind:'direct', sow:1.5, water:1, months:[8,9,10,11,12,1,2], sp:'45–60 cm apart; it sprawls', comp:'Strawberries, tomatoes, zucchini, pumpkin', avoid:'—', tip:'Blue edible flowers that bees adore, so it helps pollination of strawberries, tomatoes and cucurbits. Self-seeds freely; pull the seedlings you don’t want. The leaves are prickly, so wear gloves to cut it.', pack:30, potL:15, lt:1, feed:'flower' },
 { id:'chives', n:'Chives', g:'alli', warm:0, tb:5, d:90, rt:14, span:300, minSoil:8, nur:6, pm:8, kg:0.1, mode:'seq', max:1, def:4, kind:'seedling', water:2, months:[8,9,10,11,3,4], sp:'Clumps 25 cm apart; divide every 2–3 years', comp:'Carrots, tomatoes, roses, apples, lettuce', avoid:'Peas and beans', tip:'A perennial clump that comes back every spring. The purple pom-pom flowers are edible and attract bees; the onion scent may confuse pests such as aphids and carrot rust fly.', pack:200, potL:3, lt:1, feed:'herb', perennial:1 },
 { id:'phacelia', n:'Phacelia (bee flower & green manure)', g:'flow', u:'stems', warm:0, tb:3, d:50, rt:14, span:30, minSoil:6, nur:0, pm:60, kg:0, mode:'seq', max:2, def:60, kind:'direct', sow:1, water:1, months:[9,10,11,12,1,2,3,4], sp:'Broadcast thinly and rake in', comp:'Everything (feeds hoverflies and bees)', avoid:'—', tip:'Fast, ferny cover crop with lavender-blue flowers that hoverflies and bees love. Chop it down and dig it in (or leave it as mulch) before it sets seed. It is not a brassica, so it is safe where clubroot is a worry.', pack:1000, per:'per sowing', potL:3, lt:1, feed:'greenman', greenman:1 }
);

/* ---------- trait defaults by group (applied to every crop that doesn't set its own) ----------
   lt   shadiest zone the crop will still crop in: 0 sun only · 1 part shade ok · 2 shade ok
   fam  botanical family, used for rotation warnings
   feed soil/feed profile id (see FEEDS) */
const GROUP_TRAITS = {
  fruit: { fam:'solanum', lt:0, feed:'fruit' },  vine:  { fam:'cucurbit', lt:0, feed:'cucurb' }, legu: { fam:'legume', lt:1, feed:'legume' },
  leaf:  { fam:'leafy', lt:1, feed:'leaf' },      bras:  { fam:'brassica', lt:1, feed:'bras' },  root: { fam:'root', lt:1, feed:'root' },
  alli:  { fam:'allium', lt:0, feed:'allium' },   herb:  { fam:'herb', lt:1, feed:'herb' },      flow: { fam:'flower', lt:0, feed:'flower' }
};
/* per-crop trait tweaks for the original crops */
const CROP_TRAITS = {
  tomato:{ tt:'ind', potL:30, lt:0 }, cherry:{ tt:'ind', potL:15, dsow:false }, capsicum:{ potL:12 }, chilli:{ potL:8, pots:1 }, eggplant:{ potL:20 },
  zucchini:{ potL:40, dsow:true }, cucumber:{ potL:15, dsow:true }, pumpkin:{ potL:60, dsow:true }, rockmelon:{ potL:40, dsow:true },
  corn:{ fam:'grass', feed:'corn', tray:3, potL:15, lt:0 }, dbean:{ lt:0, potL:3 }, cbean:{ lt:0, potL:5 }, peas:{ potL:2, lt:1 }, broadbean:{ potL:5, lt:1 },
  lettuce:{ potL:2, dsow:true, pots:1 }, spinach:{ potL:2 }, silverbeet:{ fam:'beet', potL:8, dsow:true }, rocket:{ potL:2, pots:1 }, parsley:{ fam:'umbel', potL:5, pots:1, dsow:true },
  broccoli:{ potL:15, dsow:true }, cabbage:{ potL:15, dsow:true }, cauli:{ potL:15, dsow:true }, kale:{ potL:10, dsow:true }, sprouts:{ potL:20 }, bokchoy:{ potL:3 },
  carrot:{ fam:'umbel', potL:8, lt:0 }, beetroot:{ fam:'beet', potL:3, lt:1 }, radish:{ potL:1 }, parsnip:{ fam:'umbel', potL:20, lt:0 },
  potato:{ fam:'solanum', feed:'potato', potL:20, lt:0 }, kumara:{ fam:'bindweed', potL:30, lt:0 },
  garlic:{ potL:3 }, onion:{ potL:3 }, springon:{ potL:1, pots:1 }, leek:{ potL:3 },
  basil:{ potL:2, pots:1, dsow:true }, coriander:{ fam:'umbel', potL:2, pots:1 },
  tulip:{}, daffodil:{}
};
CROPS.forEach(c => {
  const gt = GROUP_TRAITS[c.g] || {}, ct = CROP_TRAITS[c.id] || {};
  Object.keys(gt).forEach(k => { if (c[k] == null) c[k] = gt[k]; });
  Object.keys(ct).forEach(k => { c[k] = ct[k]; });
  if (c.u == null) c.u = 'kg';
});
/* the crops above, frozen, so custom crops and user edits can be layered on top later */
const BASE_CROPS = CROPS.map(c => Object.assign({}, c));

/* ---------- soil & feeding profiles ----------
   pre   before planting · post  after the crop is finished
   feed  from = days after planting out to the first feed, every = days between feeds,
         to = days after first harvest to stop (999 = keep feeding to the end)        */
const FEEDS = {
  fruit: { name:'Tomatoes, capsicums, eggplants, chillies, strawberries', ph:'6.0–6.8', buy:'Tomato food (high-potassium)',
    pre:['Fork in 5 cm of compost plus a handful of blood & bone (or sheep pellets) per m² about two weeks before planting.','If soil is acidic (pH under 6) add garden lime or dolomite, about 100 g per m².','In pots: fresh potting mix with slow-release fertiliser, plus a teaspoon of dolomite lime per 10 L.'],
    feed:{ from:21, every:10, to:999, what:'tomato food (high potassium), liquid or granules', tip:'Start when the first flowers open. Too much nitrogen gives leaves, not fruit.' },
    post:['Pull plants at the end of the season; bin any with blight or wilt rather than composting them.','Top up with 3–5 cm of compost and sow a green manure (lupin, mustard, oats) over winter.','Don’t follow with another tomato-family crop, potatoes included, for 2–3 years. In pots, replace at least half the mix.'] },
  cucurb: { name:'Zucchini, cucumber, pumpkin, melons', ph:'6.0–7.0', buy:'Compost + general fertiliser',
    pre:['Dig a generous hole or mound and fill it with compost and sheep pellets — these are hungry plants.','Work in a handful of general fertiliser per plant a week before planting.','Water the planting site well the day before.'],
    feed:{ from:28, every:14, to:999, what:'general liquid feed or seaweed, then tomato food once fruit sets', tip:'Water at the base; wet leaves invite powdery mildew.' },
    post:['Clear the vines; mildewed foliage goes in the bin, not the compost.','Add compost, and follow with leafy greens or brassicas that like the leftover nitrogen.','Avoid another cucurbit in the same spot for 2 years.'] },
  corn: { name:'Sweetcorn & popcorn', ph:'6.0–7.0', buy:'Blood & bone (nitrogen)',
    pre:['Fork in compost and 100 g/m² of blood & bone or sheep pellets — corn is a heavy nitrogen feeder.','Plant in a block of short rows, not one long row, for pollination.'],
    feed:{ from:28, every:21, to:0, what:'side-dress with blood & bone or a nitrogen feed', tip:'Feed at knee height and again when the tassels appear. Stop once cobs form.' },
    post:['Chop the stalks and dig them in or add to the compost.','Follow with legumes (beans, peas) — they refill the nitrogen corn removed.'] },
  legume: { name:'Peas, beans, edamame, green manures', ph:'6.0–7.5', buy:'Garden lime + potash',
    pre:['Skip nitrogen feeds — legumes make their own. Fork in compost only.','Add a little lime if soil is acid, and a sprinkle of potash to help flowering and pods.'],
    feed:{ from:35, every:21, to:999, what:'a light seaweed or potash feed', tip:'Optional: if plants are pale and not flowering, a light seaweed feed helps. Avoid high-nitrogen fertilisers.' },
    post:['Cut the plants at ground level and leave the roots in the soil — they release nitrogen to the next crop.','Follow with leafy greens, brassicas or corn, which use that nitrogen.'] },
  leaf: { name:'Lettuce, spinach, silverbeet, celery, rocket', ph:'6.0–7.5', buy:'Sheep pellets / fish fertiliser',
    pre:['Fork in 3–5 cm of compost and a handful of sheep pellets or blood & bone per m².','Keep the seedbed moist and finely raked for direct sowings.'],
    feed:{ from:14, every:14, to:999, what:'fish or seaweed fertiliser (nitrogen-rich)', tip:'Little and often keeps leaves tender. Stop feeding a week before harvest for pot-grown lettuce.' },
    post:['Add a thin layer of compost.','Follow with a root crop or legume.'] },
  bras: { name:'Broccoli, cabbage, cauliflower, kale, bok choy, mizuna, kohlrabi', ph:'6.5–7.5', buy:'Garden lime + borage/boron + blood & bone',
    pre:['Brassicas like a firm, limed soil: add garden lime (about 100–150 g/m²) if pH is under 6.5. Lime also helps prevent clubroot.','Fork in compost and blood & bone. Many NZ soils are short of boron — a very light dusting of borax (1 teaspoon per 10 m²) prevents hollow stems.','Firm the soil well before planting; loose beds give loose heads.'],
    feed:{ from:21, every:21, to:0, what:'blood & bone or a nitrogen-rich liquid feed', tip:'Feed every 3 weeks until heads form. Net the crop against white butterfly.' },
    post:['Pull out the stalks (chop them up so they rot faster) and clear old leaves that harbour aphids.','Add compost and follow with legumes or roots. Keep brassicas out of this bed for 3 years to avoid clubroot and pests.'] },
  root: { name:'Carrots, beetroot, parsnip, radish, daikon, turnip, swede', ph:'6.0–7.0', buy:'Sulphate of potash, compost',
    pre:['Loosen the soil 25–30 cm deep and remove stones so roots run straight.','Use well-rotted compost only — fresh manure or high-nitrogen feeds make roots fork and hairy.','Add a little potash and, for beetroot and swede, a pinch of borax.'],
    feed:{ from:30, every:21, to:0, what:'a light potash or seaweed feed (not nitrogen)', tip:'Root crops need little feeding. Too much nitrogen gives leaves, not roots.' },
    post:['Break up compacted soil and add compost.','Follow with leafy crops or legumes; avoid growing the same root family here again for 2 years.'] },
  allium: { name:'Garlic, onions, leeks, spring onions', ph:'6.0–7.0', buy:'Sheep pellets, sulphate of potash',
    pre:['Well-drained soil, fed but not fresh: compost and a little sheep pellets. Add lime for garlic if acid.','Garlic and onions rot in wet soil — add coarse compost or sand to heavy clay.','A little potash at planting helps bulbs.'],
    feed:{ from:21, every:21, to:-60, what:'a nitrogen-rich feed (fish emulsion or sheep pellets tea)', tip:'Stop feeding as bulbs start to swell (roughly 2 months before harvest). Stop watering when tops fall over.' },
    post:['Lift, cure and store bulbs; remove any diseased plants from the garden.','Add compost. Grow legumes or brassicas next; don’t replant alliums here for 3 years (white rot).'] },
  herb: { name:'Basil, parsley, coriander, fennel', ph:'6.0–7.5', buy:'Compost, seaweed feed',
    pre:['Mediterranean herbs like lean, well-drained soil — no extra feed. Basil, parsley and coriander like richer, moist soil.','Fork in a little compost for the leafy herbs.'],
    feed:{ from:21, every:21, to:999, what:'diluted seaweed or fish feed', tip:'Feed lightly: too much makes leaves less flavourful.' },
    post:['Add a thin layer of compost.','Herbs like coriander and fennel can self-seed — let one or two go to seed if you want more.'] },
  flower: { name:'Annual & cut flowers', ph:'6.0–7.0', buy:'Compost, potash feed (e.g. rose/flower food)',
    pre:['Fork in 3–5 cm of compost and a light dressing of general fertiliser.','Many flowers do best on modest soil — too much nitrogen gives leaves and few blooms.'],
    feed:{ from:28, every:14, to:999, what:'a flower or potash-rich liquid feed', tip:'Feed every two weeks once buds form. Pick or deadhead often — it keeps them flowering.' },
    post:['Pull spent plants; compost healthy ones and bin mildewed ones.','Refresh with compost and a green manure or a vegetable crop before the next planting.'] },
  bulb: { name:'Tulips, daffodils, ranunculus, dahlias, gladioli', ph:'6.0–7.0', buy:'Bulb fertiliser / potash',
    pre:['Free-draining soil is the key — bulbs and tubers rot in wet ground. Add coarse compost or sand to heavy clay.','Mix a spoonful of bulb fertiliser or bone meal into the planting hole.','Plant at about three times the bulb’s height.'],
    feed:{ from:35, every:21, to:999, what:'potash-rich flower feed after buds show', tip:'Feed as flowers finish so the bulb recharges. Leave foliage until it yellows (about six weeks).' },
    post:['Leave foliage to die back naturally; lift dahlias and gladioli in cold areas.','Refresh with compost. Rest tulips: they often flower best only in the first year in warm areas.'] },
  potato: { name:'Potatoes', ph:'5.5–6.5', buy:'Potato fertiliser / compost',
    pre:['Dig in compost and a balanced potato fertiliser. Avoid lime on the day (it encourages scab) unless soil is very acid.','Don’t use fresh manure.'],
    feed:{ from:28, every:21, to:0, what:'potash-rich feed; earth up plants as they grow', tip:'Earth up twice; keep tubers covered so they don’t turn green.' },
    post:['Remove all small potatoes (volunteers carry disease).','Add compost, then follow with brassicas or legumes; not tomatoes or another potato crop for 3 years.'] },
  greenman: { name:'Green manure', ph:'any', buy:null,
    pre:['Rake the bed level and broadcast the seed thickly; no fertiliser needed.'],
    feed:null,
    post:['Chop the crop down and dig it in (or lay it on the surface as mulch) just before it flowers, then wait 2–3 weeks before sowing or planting into it.'] },
  wasabi: { name:'Wasabi', ph:'6.0–7.0', buy:'Compost, leaf mould, fish/seaweed feed',
    pre:['Rich, moist, humus-heavy soil: mix in plenty of compost and leaf mould, with good drainage but constant moisture.','Choose a shaded, sheltered spot (or a shade-cloth tunnel) out of the afternoon sun.'],
    feed:{ from:45, every:28, to:999, what:'diluted fish or seaweed feed', tip:'Light feeds only. Mulch heavily to keep roots cool and moist.' },
    post:['Harvest rhizomes; replant side shoots (offsets) for the next crop.','Refresh the compost and leaf mould before replanting.'] }
};

const TOMATO_GUIDE = {
  ind: ['Indeterminate (vine) tomatoes keep growing and flowering until frost or cold stops them. Grow them up a stake or string and pinch out the side shoots (laterals) so each plant has one or two main stems.','Fruit ripens gradually over 2–3 months, good for steady picking and slicing (Moneymaker, Grosse Lisse, Beefsteak and most cherries).','They need a big root run: a bed, or a pot of about 25–30 L or more per plant.','Give them steady watering (don’t let the soil swing between dry and wet) and a tomato feed every 10 days once the first truss is flowering.'],
  det: ['Determinate (bush) tomatoes grow to a fixed height, set most of their fruit together, then finish. Don’t remove the side shoots — you’d be removing fruit.','Fruit ripens over about 3–4 weeks. That suits sauce, drying and bottling (Roma, Rutgers, Patio-type bush varieties). Plant a second batch three weeks later to spread the harvest.','They need less support (a cage or short stakes) and are good in pots of 15–20 L.','Same steady watering; feed with tomato food from first flowers, and stop feeding as the crop finishes.']
};

/* ---------- perennials: grapes, fruit trees, flowering shrubs ----------
   The model is thermal time (growing degree days above tb) counted from 1 July.
   `st` gives typical dates at a reference town for a normal year; the engine works out how many degree-days
   each stage needs from that reference climate, then predicts your dates from YOUR weather.
   [key, label, MM-DD]; the last stage is the harvest (or peak bloom for ornamentals). win = days it lasts.
   first = years from planting to first crop. */
const PGROUPS = {
  pome:  { name:'Apples & pears' },
  stone: { name:'Stone fruit & figs' },
  citrus:{ name:'Citrus & feijoa' },
  vine:  { name:'Grapes' },
  orn:   { name:'Flowering shrubs & perennials' }
};
const PERENNIALS = [
 // Apples & pears (reference: Christchurch)
 { id:'gala',      n:'Apple — Royal Gala',        g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-22'],['ripe','First pick','03-12']], win:21, first:3, yl:'20–60 kg', frost:'blossom', tip:'Early apple. It sets fruit alone but crops better with a pollination partner (e.g. Braeburn, Granny Smith or a crab apple).' },
 { id:'braeburn',  n:'Apple — Braeburn',          g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-25'],['ripe','First pick','04-15']], win:28, first:3, yl:'25–70 kg', frost:'blossom', tip:'Keeps well; can crop in alternate years unless fruit is thinned.' },
 { id:'fuji',      n:'Apple — Fuji',              g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-25'],['ripe','First pick','04-28']], win:21, first:3, yl:'25–60 kg', frost:'blossom', tip:'Needs a long warm season to sweeten; late in cool areas.' },
 { id:'granny',    n:'Apple — Granny Smith',      g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-28'],['ripe','First pick','05-08']], win:28, first:3, yl:'30–80 kg', frost:'blossom', tip:'Late; fruit keeps for months. Needs a warm autumn to ripen fully.' },
 { id:'cox',       n:'Apple — Cox’s Orange Pippin', g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-22'],['ripe','First pick','04-05']], win:21, first:3, yl:'20–40 kg', frost:'blossom', tip:'Best-flavoured but fussy; prone to disease in wet years.' },
 { id:'williams',  n:'Pear — Williams (Bartlett)', g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-08'],['ripe','First pick','03-02']], win:14, first:4, yl:'30–80 kg', frost:'blossom', tip:'Pick while still firm and ripen indoors; they go mealy on the tree.' },
 { id:'packham',   n:'Pear — Packham’s Triumph',   g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-12'],['ripe','First pick','04-10']], win:21, first:4, yl:'30–80 kg', frost:'blossom', tip:'Late pear; ripen in storage for a few weeks.' },
 { id:'bosc',      n:'Pear — Beurré Bosc',         g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-12'],['ripe','First pick','04-08']], win:21, first:4, yl:'30–70 kg', frost:'blossom', tip:'Brown, russeted skin; rich flavour.' },
 { id:'nashi',     n:'Nashi (Asian pear)',         g:'pome', tb:5, ref:'christchurch', st:[['bloom','Full blossom','10-05'],['ripe','First pick','03-15']], win:14, first:3, yl:'30–60 kg', frost:'blossom', tip:'Eat crisp and firm from the tree; needs thinning to one fruit per cluster.' },
 // Stone fruit & figs (reference: Christchurch)
 { id:'cherry',    n:'Cherry',                     g:'stone', tb:4.5, ref:'christchurch', st:[['bloom','Full blossom','09-28'],['ripe','First pick','01-08']], win:14, first:4, yl:'10–40 kg', frost:'blossom', tip:'Net early: birds take ripening cherries in days. Most need a pollination partner (Stella is self-fertile).' },
 { id:'apricot',   n:'Apricot',                    g:'stone', tb:4.5, ref:'christchurch', st:[['bloom','Full blossom','09-12'],['ripe','First pick','01-28']], win:14, first:3, yl:'15–50 kg', frost:'blossom', tip:'Flowers very early, so late frost often takes the crop — grow it against a warm wall or use frost cloth.' },
 { id:'peach',     n:'Peach',                      g:'stone', tb:4.5, ref:'christchurch', st:[['bloom','Full blossom','09-20'],['ripe','First pick','02-10']], win:21, first:3, yl:'20–50 kg', frost:'blossom', tip:'Spray with copper at leaf-fall and bud-swell for leaf curl; thin fruit to 10–15 cm apart.' },
 { id:'nectarine', n:'Nectarine',                  g:'stone', tb:4.5, ref:'christchurch', st:[['bloom','Full blossom','09-20'],['ripe','First pick','02-15']], win:21, first:3, yl:'20–50 kg', frost:'blossom', tip:'Same care as peach; copper spray in winter and thin the fruit.' },
 { id:'plum-early',n:'Plum — Santa Rosa (early)',  g:'stone', tb:4.5, ref:'christchurch', st:[['bloom','Full blossom','09-25'],['ripe','First pick','02-08']], win:21, first:3, yl:'20–60 kg', frost:'blossom', tip:'Thin heavy crops so limbs don’t snap.' },
 { id:'plum-late', n:'Plum — Black Doris (late)',  g:'stone', tb:4.5, ref:'christchurch', st:[['bloom','Full blossom','09-28'],['ripe','First pick','03-05']], win:21, first:3, yl:'20–60 kg', frost:'blossom', tip:'Dark, sweet fruit; needs a pollination partner (e.g. Santa Rosa).' },
 { id:'fig',       n:'Fig — Brown Turkey',         g:'stone', tb:10, ref:'christchurch', st:[['leaf','Leaf-out','10-25'],['ripe','First ripe fruit','03-18']], win:35, first:2, yl:'5–20 kg', frost:'winter', tip:'Loves a warm, sheltered wall. Figs ripen only with sustained heat: in cooler regions the crop can be small or fail to ripen before autumn.' },
 // Citrus & feijoa (reference: Auckland)
 { id:'lemon-meyer', n:'Lemon — Meyer',            g:'citrus', tb:8, shift:1, ref:'auckland', st:[['bloom','Main flowering','10-20'],['ripe','First ripe fruit','06-15']], win:120, first:2, yl:'20–100 fruit', frost:'winter', tip:'Cropping most of the year; frost-tender. Feed four times a year and protect from frost.' },
 { id:'lemon-lisbon', n:'Lemon — Lisbon / Eureka', g:'citrus', tb:8, shift:1, ref:'auckland', st:[['bloom','Main flowering','10-20'],['ripe','First ripe fruit','06-25']], win:120, first:3, yl:'50–200 fruit', frost:'winter', tip:'More tolerant of cold than most citrus but still frost-tender when young.' },
 { id:'mandarin',    n:'Mandarin — Satsuma',        g:'citrus', tb:8, shift:1, ref:'auckland', st:[['bloom','Main flowering','10-25'],['ripe','First ripe fruit','05-12']], win:56, first:3, yl:'50–200 fruit', frost:'winter', tip:'The most cold-tolerant mandarin. Fruit colours up as nights cool.' },
 { id:'orange',      n:'Orange — Navel',            g:'citrus', tb:8, shift:1, ref:'auckland', st:[['bloom','Main flowering','10-20'],['ripe','First ripe fruit','07-20']], win:90, first:3, yl:'50–200 fruit', frost:'winter', tip:'Needs a warm, sheltered site; may not sweeten in cool regions.' },
 { id:'grapefruit',  n:'Grapefruit',                g:'citrus', tb:8, shift:1, ref:'auckland', st:[['bloom','Main flowering','10-15'],['ripe','First ripe fruit','07-10']], win:120, first:4, yl:'30–100 fruit', frost:'winter', tip:'Needs plenty of warmth; sweeter after a warm summer.' },
 { id:'lime',        n:'Lime — Tahiti / Bearss',    g:'citrus', tb:8, shift:1, ref:'auckland', st:[['bloom','Main flowering','10-20'],['ripe','First ripe fruit','05-01']], win:90, first:3, yl:'50–150 fruit', frost:'winter', tip:'The most frost-tender citrus: best in a pot that can move under cover.' },
 { id:'feijoa-apollo', n:'Feijoa — Apollo (early)', g:'citrus', tb:3, ref:'auckland', st:[['bloom','Flowering','11-22'],['ripe','First fruit drop','03-20']], win:35, first:3, yl:'10–40 kg', frost:'none', tip:'Fruit is ripe when it drops or comes away with a gentle tug. Plant two varieties for better cropping.' },
 { id:'feijoa-unique', n:'Feijoa — Unique (mid)',   g:'citrus', tb:3, ref:'auckland', st:[['bloom','Flowering','11-25'],['ripe','First fruit drop','04-10']], win:35, first:3, yl:'10–40 kg', frost:'none', tip:'Self-fertile. Gather the fallen fruit every day or two.' },
 { id:'feijoa-kakapo', n:'Feijoa — Kakapo (late)',  g:'citrus', tb:3, ref:'auckland', st:[['bloom','Flowering','11-28'],['ripe','First fruit drop','05-01']], win:35, first:3, yl:'10–40 kg', frost:'none', tip:'Large, late fruit; good in cooler regions where early types may not finish. It needs another feijoa nearby for a good crop.' },
 // Grapes (reference: Christchurch)
 { id:'grape-albany', n:'Grape — Albany Surprise (table)', g:'vine', tb:10, ref:'christchurch', st:[['bud','Bud burst','10-05'],['flower','Flowering','12-08'],['veraison','Colour change','02-15'],['ripe','First pick','03-30']], win:28, first:3, yl:'5–20 kg', frost:'budburst', tip:'A hardy, old NZ favourite that ripens reliably in cool areas. Thin the bunches for bigger grapes.' },
 { id:'grape-pinot', n:'Grape — Pinot noir (wine)', g:'vine', tb:10, ref:'christchurch', st:[['bud','Bud burst','10-05'],['flower','Flowering','12-10'],['veraison','Colour change','02-18'],['ripe','First pick','04-10']], win:21, first:3, yl:'3–10 kg', frost:'budburst', tip:'Sugar (°Brix) tells you when to pick: taste seeds and skins, and use a refractometer if you make wine.' },
 { id:'grape-sauv', n:'Grape — Sauvignon blanc (wine)', g:'vine', tb:10, ref:'christchurch', st:[['bud','Bud burst','10-05'],['flower','Flowering','12-08'],['veraison','Colour change','02-15'],['ripe','First pick','04-12']], win:21, first:3, yl:'3–10 kg', frost:'budburst', tip:'Open the canopy a few weeks before harvest so bunches get air and stay disease-free.' },
 { id:'grape-muscat', n:'Grape — Muscat Hamburg (table)', g:'vine', tb:10, ref:'christchurch', st:[['bud','Bud burst','10-06'],['flower','Flowering','12-12'],['veraison','Colour change','02-20'],['ripe','First pick','04-16']], win:28, first:3, yl:'5–15 kg', frost:'budburst', tip:'Sweet and aromatic but wants a warm, sunny wall or a glasshouse in cooler regions.' },
 // Flowering shrubs & perennials (reference: Christchurch)
 { id:'rose',      n:'Roses — first flush',    g:'orn', tb:5, ref:'christchurch', st:[['bud','Buds break','09-05'],['ripe','First flush','11-12']], win:35, first:1, yl:'', frost:'none', unit:'bloom', tip:'Prune in late July or August; feed at bud break and again after the first flush for a repeat show.' },
 { id:'lavender',  n:'Lavender',               g:'orn', tb:5, ref:'christchurch', st:[['ripe','Peak bloom','12-28']], win:28, first:1, yl:'', frost:'none', unit:'bloom', tip:'Trim lightly after flowering; never cut into old wood.' },
 { id:'hydrangea', n:'Hydrangea',              g:'orn', tb:8, ref:'christchurch', st:[['ripe','Peak bloom','01-15']], win:56, first:1, yl:'', frost:'none', unit:'bloom', tip:'Late frosts scorch new shoots. Prune after flowering (or in late winter for panicle types).' },
 { id:'agapanthus',n:'Agapanthus',             g:'orn', tb:8, ref:'christchurch', st:[['ripe','Peak bloom','12-28']], win:28, first:1, yl:'', frost:'none', unit:'bloom', tip:'Tough and drought-tolerant; divide overcrowded clumps in autumn.' }
];
/* seasonal jobs per group: [months, text]. Months 1–12; southern-hemisphere seasons */
const PTASKS = {
  pome: [ [[6,7],'Winter prune while dormant; hard copper spray at leaf-fall.'], [[8],'Bud swell: copper or oil spray and a balanced feed.'], [[9,10],'Blossom time: protect from frost; hang codling moth traps at petal fall.'], [[11,12],'Thin fruit to one per cluster, 10–15 cm apart.'], [[12,1,2],'Codling moth: check traps, spray or use bands. Water deeply in dry spells.'], [[3,4,5],'Harvest: pick fruit that lifts with a twist. Collect windfalls to break pest cycles.'] ],
  stone: [ [[6,7],'Prune only lightly in dormant months; spray copper at leaf-fall (leaf curl, bacterial canker).'], [[8],'Bud swell: copper spray and a balanced feed.'], [[9,10],'Blossom time: protect from frost if you can.'], [[11,12],'Thin fruit (peach, plum, nectarine). Net cherries before they colour.'], [[1,2],'Harvest; prune stone fruit straight after picking (summer prune reduces silver leaf).'], [[3,4],'Water well until the leaves fall; clear rotten fruit.'] ],
  citrus: [ [[8,9],'Feed with citrus food and top up mulch; the first of four feeds a year.'], [[10,11],'Flowering: keep the water even; don’t prune.'], [[12,1],'Feed again; water deeply and mulch through summer.'], [[2,3],'Feed again. Check for borer, scale and sooty mould.'], [[5,6,7],'Frost nights: cover young trees with frost cloth or move pots under cover. Feed once more in May.'], [[6,7,8,9],'Harvest as fruit colours and sweetens; leave it on the tree until you need it.'] ],
  vine: [ [[6,7],'Winter prune: cut back to 2–3 buds per spur while dormant.'], [[8,9],'Feed with potassium-rich fertiliser; tie down new shoots.'], [[10],'Bud burst: watch for frost on new shoots.'], [[11,12],'Flowering: don’t water overhead. Tip shoots two leaves beyond the bunch.'], [[1,2],'Thin bunches; net against birds; keep water even.'], [[3,4,5],'Taste for sweetness and harvest when seeds are brown.'] ],
  orn: [ [[7,8],'Prune and feed at the end of winter.'], [[9,10],'Feed, mulch, and check new growth for aphids.'], [[11,12,1,2],'Deadhead to keep the flowers coming; water in dry spells.'], [[3,4],'Trim spent stems and divide clumps.'] ]
};
