/* ============================================================
   DATA — ADVICE: plant families and rotation, heights, companion pairs (with how good the evidence is),
   pests and diseases (NZ), techniques, monthly jobs, orchard care, harvest and storage notes.
   Everything here is plain data so it is easy to check and correct.
   ============================================================ */

/* ---------- plant families (for rotation and shared pests) ----------
   rest = years to keep the same family out of a bed after it has grown there
   heavy = how hungry the family is: 3 heavy feeder · 2 medium · 1 light · 0 gives nitrogen back */
const BOT = {
  solanum: { n:'tomato family (tomatoes, potatoes, capsicums, chillies, eggplant)', short:'Tomato family', rest:3, heavy:3, dz:'late blight, wilt diseases and root-knot nematodes build up in the soil and old plants, and psyllids overwinter on nightshade weeds' },
  brassica:{ n:'cabbage family (cabbage, broccoli, kale, radish, daikon, turnip, swede, rocket, wasabi)', short:'Cabbage family', rest:3, heavy:3, dz:'clubroot spores live in soil for many years, and caterpillars and aphids overwinter on old plants' },
  allium:  { n:'onion family (garlic, onions, leeks, spring onions)', short:'Onion family', rest:3, heavy:2, dz:'white rot fungus survives in soil for 15 years or more, and rust and downy mildew persist in leftovers' },
  cucurbit:{ n:'pumpkin family (zucchini, cucumber, pumpkin, melons)', short:'Pumpkin family', rest:2, heavy:3, dz:'powdery mildew, viruses and soil fungi build up' },
  legume:  { n:'legumes (peas, beans, edamame, sweet peas)', short:'Legumes', rest:2, heavy:0, dz:'root rots and bean and pea diseases build up' },
  umbel:   { n:'carrot family (carrot, parsnip, celery, parsley, coriander, fennel, dill)', short:'Carrot family', rest:2, heavy:1, dz:'carrot rust fly, cavity spot and nematodes build up' },
  beet:    { n:'beet family (beetroot, silverbeet, spinach)', short:'Beet family', rest:2, heavy:2, dz:'leaf spots, leaf miners and nematodes build up' },
  daisy:   { n:'daisy family (lettuce, sunflowers, zinnias, dahlias, marigolds, calendula)', short:'Daisy family', rest:1, heavy:1, dz:'sclerotinia and other daisy-family diseases build up' },
  grass:   { n:'grass family (sweetcorn, popcorn)', short:'Corn', rest:1, heavy:3, dz:'stalk rots and corn pests carry over' },
  morning: { n:'sweet potato family (kumara)', short:'Kumara', rest:2, heavy:1, dz:'soil pests and scurf build up' },
  rose:    { n:'rose family (strawberries)', short:'Strawberries', rest:2, heavy:2, dz:'crown rot and verticillium wilt build up' },
  mint:    { n:'mint family (basil)', short:'Basil', rest:0, heavy:1, dz:'' },
  bulb:    { n:'flowering bulbs and corms', short:'Bulbs', rest:0, heavy:1, dz:'' },
  other:   { n:'other plants', short:'Other', rest:0, heavy:1, dz:'' }
};

/* per-crop traits: [family, mature height cm, support, difficulty 1 easy – 3 fussy]
   support: '' none · stake · cage · trellis */
const CROP_ADV = {
  tomato:['solanum',180,'stake',2], cherry:['solanum',180,'stake',1], tomatodet:['solanum',90,'cage',1], paste:['solanum',90,'cage',1],
  capsicum:['solanum',60,'stake',2], chilli:['solanum',60,'',1], eggplant:['solanum',80,'stake',2], potato:['solanum',60,'',1],
  zucchini:['cucurbit',60,'',1], cucumber:['cucurbit',180,'trellis',1], pumpkin:['cucurbit',40,'',2], rockmelon:['cucurbit',30,'',3], watermelon:['cucurbit',30,'',3],
  corn:['grass',200,'',1], popcorn:['grass',200,'',2],
  dbean:['legume',45,'',1], cbean:['legume',200,'trellis',1], peas:['legume',120,'trellis',1], broadbean:['legume',120,'stake',1], edamame:['legume',60,'',2],
  sweetpea:['legume',180,'trellis',1], greenman:['other',80,'',1],
  lettuce:['daisy',25,'',1], spinach:['beet',25,'',1], silverbeet:['beet',60,'',1], rocket:['brassica',30,'',1], parsley:['umbel',30,'',1], celery:['umbel',60,'',3],
  broccoli:['brassica',60,'',2], cabbage:['brassica',40,'',2], cauli:['brassica',60,'',3], kale:['brassica',80,'',1], sprouts:['brassica',90,'stake',3], bokchoy:['brassica',30,'',1],
  kohlrabi:['brassica',40,'',2], mizuna:['brassica',30,'',1], radish:['brassica',20,'',1], daikon:['brassica',40,'',2], turnip:['brassica',30,'',1], swede:['brassica',40,'',2], wasabi:['brassica',40,'',3],
  carrot:['umbel',30,'',2], beetroot:['beet',30,'',1], parsnip:['umbel',50,'',2], kumara:['morning',30,'',2],
  garlic:['allium',60,'',1], onion:['allium',50,'',2], springon:['allium',40,'',1], leek:['allium',60,'',2], chives:['allium',30,'',1],
  basil:['mint',45,'',1], coriander:['umbel',40,'',2], fennel:['umbel',120,'',2], dill:['umbel',100,'',1], borage:['other',60,'',1],
  strawberry:['rose',20,'',1],
  sunflower:['daisy',200,'stake',1], zinnia:['daisy',70,'',1], cosmos:['daisy',120,'',1], dahlia:['daisy',120,'stake',2], marigold:['daisy',35,'',1],
  nasturtium:['other',30,'',1], calendula:['daisy',50,'',1], snapdragon:['other',60,'',2], cornflower:['daisy',70,'',1],
  tulip:['bulb',40,'',2], daffodil:['bulb',40,'',1], ranunculus:['bulb',40,'',2], gladiolus:['bulb',100,'stake',2],
  alyssum:['brassica',12,'',1], phacelia:['other',80,'',1]
};
/* what a custom crop gets if you don't tell the planner: by its group */
const GROUP_ADV = { fruit:['solanum',100,'stake',2], vine:['cucurbit',60,'',2], legu:['legume',60,'',1], leaf:['daisy',30,'',1], bras:['brassica',50,'',2], root:['other',35,'',2], alli:['allium',50,'',1], herb:['mint',40,'',1], flow:['other',60,'',1] };
/* the older rotation-family names that earlier versions of the crop editor saved */
const FAM_TO_BOT = { solanum:'solanum', cucurbit:'cucurbit', legume:'legume', leafy:'daisy', brassica:'brassica', root:'other', allium:'allium', herb:'mint', flower:'other', grass:'grass', beet:'beet', umbel:'umbel', bindweed:'morning', aster:'daisy' };
const CROP_EXTRA = {
  alyssum:{ tip_add:' It is in the cabbage family, so keep it at the edge of beds rather than in a rotation if clubroot is a worry.' }
};
/* crops that behave as beneficial-insect habitat and pollinator food */
const HABITAT = ['alyssum','dill','borage','phacelia','calendula','cosmos','marigold','cornflower','zinnia','sunflower','coriander','chives','nasturtium','fennel','sweetpea'];
/* shade-loving salads and greens that do better in the shade of tall summer crops */
const SHADE_FRIENDLY = ['lettuce','spinach','rocket','coriander','mizuna','bokchoy','silverbeet','parsley','radish','celery','wasabi'];
/* the tomato types */
const TOMATOES = ['tomato','cherry','tomatodet','paste'];

function applyAdvice(c){
  const a = CROP_ADV[c.id] || GROUP_ADV[c.g] || ['other',50,'',1];
  if (c.bot == null) c.bot = a[0];
  if (c.hcm == null) c.hcm = a[1];
  if (c.sup == null) c.sup = a[2];
  if (c.dif == null) c.dif = a[3];
  if (CROP_EXTRA[c.id] && CROP_EXTRA[c.id].tip_add && c.tip && c.tip.indexOf(CROP_EXTRA[c.id].tip_add) < 0) c.tip += CROP_EXTRA[c.id].tip_add;
  return c;
}
CROPS.forEach(applyAdvice);
BASE_CROPS.length = 0; CROPS.forEach(c => BASE_CROPS.push(Object.assign({}, c)));

/* ---------- companion planting ----------
   rel  + helps · − keep apart · ~ care needed
   ev   sci   backed by controlled studies
        mixed some studies, results vary
        prac  ordinary horticulture (shade, support, space, timing), not folklore
        trad  traditional advice with little or no research behind it
   sev  how much it matters when they are neighbours: 3 serious · 2 worth avoiding · 1 minor
   A side is a list of crop ids, or a family token such as '@brassica', or '@tomato' (all four tomato types).            */
const PAIRS = [];
function pair(a, b, rel, ev, sev, why){ PAIRS.push({ a: [].concat(a), b: [].concat(b), rel, ev, sev, why }); }
const _T = '@tomato';

/* ---- helps ---- */
pair(['corn','popcorn'], 'cbean', '+', 'prac', 1, 'The “three sisters” trick: climbing beans use the corn as a living pole, so no trellis is needed, and the corn block holds the beans up in the wind.');
pair(['corn','popcorn'], ['pumpkin','zucchini','watermelon','rockmelon','cucumber'], '+', 'prac', 1, 'Big leaves shade the soil between the corn rows, which keeps it damp and holds weeds down.');
pair('cbean', 'pumpkin', '+', 'prac', 1, 'The sprawling pumpkin vines shade the ground under the beans and suppress weeds.');
pair(_T, 'basil', '+', 'mixed', 1, 'Traditional partners. Some trials show fewer whitefly and thrips near basil, and it likes the same warm, sunny, well-watered conditions. The effect is modest, with little downside.');
pair(_T, 'marigold', '+', 'mixed', 1, 'French marigolds (Tagetes patula) grown as a dense, full-season cover crop before tomatoes and then dug in can suppress root-knot nematodes, although results vary with the variety. Marigolds interplanted between the tomatoes do much less, but single-flowered types feed hoverflies.');
pair(_T, ['garlic','chives'], '+', 'trad', 1, 'Old advice: the onion-family smell deters aphids and spider mites. Garlic sprays have some support; planting alongside is unproven, but harmless.');
pair(_T, 'borage', '+', 'trad', 1, 'Borage draws bees and hoverflies. Tomatoes largely pollinate themselves by wind and vibration, so the gain is small, but it is a good plant to have nearby.');
pair(_T, 'lettuce', '+', 'prac', 1, 'Lettuce planted in the shade of tomatoes and other tall summer crops bolts later and stays sweeter.');
pair(['capsicum','chilli','eggplant'], 'basil', '+', 'trad', 1, 'Same needs (warmth, sun, regular water), and the scent is said to put off some pests.');
pair('@brassica', '@allium', '+', 'mixed', 1, 'Onion-family scent can mask brassicas from cabbage white butterflies and aphids. Trials are mixed, but alliums and brassicas are otherwise good neighbours.');
pair('@brassica', ['dill','alyssum','coriander'], '+', 'sci', 2, 'Flowers with easy nectar feed hoverflies and parasitic wasps, which kill aphids and caterpillars. It is one of the best-supported companion tricks, though how much it protects the crop varies. The nectar can also feed cabbage white and diamondback moths, so keep the mesh on.');
pair('@brassica', 'calendula', '+', 'mixed', 1, 'Calendula draws hoverflies and other helpful insects, but there is little proof that it protects brassicas.');
pair('@brassica', 'nasturtium', '+', 'mixed', 1, 'White butterflies and aphids often pick nasturtiums first, so they act as a decoy. Check and pick the caterpillars off the nasturtiums.');
pair('@brassica', ['celery','chives'], '+', 'trad', 1, 'Traditional partners; the strong smell may confuse some pests.');
pair('carrot', ['onion','leek','garlic','chives','springon'], '+', 'mixed', 2, 'Onion-family scent may confuse carrot rust fly, but results are mixed. Fine insect mesh over the bed is far more reliable.');
pair('carrot', 'radish', '+', 'prac', 1, 'Radish sprouts in days and marks the row while the slow carrot seed germinates, and is out of the way before carrots need the room.');
pair('carrot', 'lettuce', '+', 'prac', 1, 'Shallow-rooted lettuce and deep-rooted carrots use different layers of soil, and lettuce is cut before the carrots need the room.');
pair('lettuce', ['radish','springon','onion','beetroot'], '+', 'prac', 1, 'Quick, compact crops share a bed without competing: each is picked before the other needs the space.');
pair('lettuce', ['corn','popcorn','cbean','sunflower','cucumber'], '+', 'prac', 1, 'Shade from the taller crop delays bolting in the hot months.');
pair('cucumber', ['dill','nasturtium'], '+', 'mixed', 1, 'Dill and nasturtium attract beneficial insects and pollinators.');
pair('cucumber', ['sunflower','corn'], '+', 'prac', 1, 'The tall plant works as a trellis and gives light afternoon shade.');
pair(['zucchini','pumpkin','watermelon','rockmelon'], ['borage','nasturtium','alyssum'], '+', 'mixed', 1, 'More bees and hoverflies visiting means better pollination of the big yellow flowers.');
pair('strawberry', ['borage','alyssum'], '+', 'mixed', 1, 'Flowers that draw pollinators help berries set fully, and reduce misshapen fruit.');
pair('strawberry', ['lettuce','spinach'], '+', 'prac', 1, 'Shallow-rooted greens fill the gaps between strawberry plants and are picked before the berries need the room. Leave enough space for air to move, because crowded strawberries get grey mould.');
pair(['peas','dbean','broadbean'], ['carrot','radish','lettuce'], '+', 'trad', 1, 'Old partners; the legumes are undemanding neighbours and shade the soil lightly.');
pair(['alyssum','phacelia','dill'], ['tomato','cherry','tomatodet','paste','capsicum','zucchini','cucumber','pumpkin','broccoli','cabbage','cauli','kale','lettuce'], '+', 'sci', 1, 'Small open flowers with easy nectar feed hoverflies, lacewings and tiny parasitic wasps that eat aphids and caterpillars, and also bring in pollinators. It is the best-supported companion trick, though how much it cuts pests on the crop itself varies.');
pair(['cosmos','calendula','cornflower','zinnia','marigold','borage'], ['tomato','cherry','tomatodet','paste','capsicum','zucchini','cucumber','pumpkin','broccoli','cabbage','cauli','kale','lettuce'], '+', 'mixed', 1, 'Flowers like these draw hoverflies, bees and other helpful insects. How much that helps the crop next door varies, and double-flowered forms give insects little nectar, so choose single, open flowers.');

/* ---- keep apart ---- */
pair('potato', ['tomato','cherry','tomatodet','paste','capsicum','eggplant','chilli'], '-', 'sci', 2, 'Same family, shared diseases and pests: late blight and the tomato-potato psyllid move between potatoes and tomatoes (the psyllid also attacks capsicum and eggplant). Spores and psyllids travel on the wind, so distance helps only a little. What matters most is not following one with the other, using certified seed potatoes, and pulling volunteer potatoes and nightshade weeds.');
pair('corn', 'popcorn', '-', 'sci', 3, 'They cross-pollinate. Popcorn pollen makes sweetcorn kernels starchy and tough, and seed from crossed cobs is no use. Grow only one, sow them so they tassel at least 2–3 weeks apart, or separate them by as much distance as you can (75 m or more is the usual advice).');
pair(['corn','popcorn'], _T, '-', 'mixed', 1, 'The same caterpillar (the corn earworm, Helicoverpa armigera) attacks both. Moths favour fresh corn silks, so corn can act as a decoy or as a nursery for caterpillars that move on to the tomatoes. Check the fruit from midsummer.');
pair('fennel', [_T,'capsicum','eggplant','chilli','dbean','cbean','peas','broadbean','kohlrabi','coriander','carrot'], '-', 'trad', 2, 'Fennel is said to hold back neighbouring plants. Lab studies show its oils can slow seed germination, but proof in gardens is thin. It is easiest to grow it on its own, in a pot or at the edge of the garden.');
pair('@allium', '@legume', '-', 'trad', 1, 'Traditional advice says onions and garlic stunt peas and beans. The evidence is thin, but keeping them a metre apart costs nothing.');
pair('@brassica', 'strawberry', '-', 'trad', 1, 'Old advice: both are hungry and compete. Keep them in separate beds if you can.');
pair(_T, '@brassica', '-', 'trad', 1, 'Long-standing advice, mostly because both are hungry crops that compete and need different care (brassicas like firm, limed soil). There is little evidence either way, and separate beds simply make each easier to look after.');
pair('carrot', 'dill', '-', 'trad', 1, 'Traditional: mature dill is said to stunt carrots and they share pests. Grow dill at the edge.');
pair('carrot', 'parsnip', '~', 'mixed', 1, 'Both attract carrot rust fly, so pests move between them. Net them together, and rotate them the same way.');
pair('beetroot', 'cbean', '-', 'trad', 1, 'Traditional: said to stunt each other. Harmless to separate.');
pair('sunflower', ['cbean','dbean','potato'], '-', 'mixed', 1, 'Sunflower roots and rotting stalks release compounds that can hold back some neighbours. Beans and potatoes are often mentioned. Give them a metre.');

/* ---------- pests, diseases and problems (New Zealand) ----------
   hits   crop ids, '@family' tokens, '*' for most garden plants, or 'T:pome' / 'T:stone' / 'T:citrus' / 'T:vine' / 'T:orn' or 'T:<tree id prefix>'
   mo     months when it is a live problem (1 = Jan)
   wx     what weather makes it worse: t = mean air °C range, rain = 'wet' (15 mm or more in the last week) or 'dry' (under 6 mm), glass = a big problem under glass
   kind   insect · disease · disorder · pest (animals)                                                                    */
const PESTS = [
 { id:'aphids', n:'Aphids', kind:'insect', hits:['*'], mo:[8,9,10,11,12,1,2,3,4,5], wx:{ t:[12,26], rain:'dry' },
   sym:'Clusters of small soft insects on new growth and under leaves, sticky honeydew, curled or distorted leaves, sometimes black sooty mould.',
   prev:'Don’t over-feed with nitrogen (soft growth attracts them). Grow alyssum, dill or calendula nearby for hoverflies and lacewings, and leave ladybirds alone. Nasturtiums can act as a decoy.',
   org:'Knock them off with a strong jet of water, or squash them by hand. Repeat a soap spray every 3 days for two weeks, and spray in the evening so bees are not caught.' },
 { id:'wfly', n:'Whitefly', kind:'insect', hits:['@solanum','cucumber','zucchini','dbean','cbean','@brassica','basil'], mo:[10,11,12,1,2,3,4,5], wx:{ t:[16,30], glass:true },
   sym:'Clouds of tiny white flies when you brush the leaves, sticky honeydew, sooty mould, yellowing leaves.',
   prev:'Yellow sticky traps early in the season, good ventilation, and pull out old crops promptly. Keep weeds down around glasshouses. Marigolds nearby may help.',
   org:'Vacuum the flies off in the morning while they are sluggish, or spray soap solution under the leaves every 3–4 days.' },
 { id:'mite', n:'Spider mites (red spider)', kind:'insect', hits:['dbean','cbean','tomato','cherry','tomatodet','paste','cucumber','eggplant','strawberry','capsicum','rose','T:stone','T:pome'], mo:[11,12,1,2,3,4], wx:{ t:[20,32], rain:'dry', glass:true },
   sym:'Fine yellow speckling on the top of leaves, bronzing, and very fine webbing on the undersides in hot, dry weather.',
   prev:'They love dry, dusty heat. Damp down paths, keep pots and plants watered, and mist or hose the undersides of leaves.',
   org:'Hose the undersides of leaves every couple of days, or use a soap or oil spray. Pull out badly infested plants.' },
 { id:'thrips', n:'Thrips', kind:'insect', hits:['@allium','gladiolus','rose','capsicum','tomato','cherry'], mo:[11,12,1,2,3], wx:{ t:[18,32], rain:'dry' },
   sym:'Silvery streaks or white flecks on leaves and petals, tiny slender black or yellow insects, distorted flowers.',
   prev:'Keep plants watered (stress makes it worse), mulch, and avoid planting onions beside cereal crops or long grass.',
   org:'Sticky traps and soap spray; a hard rain or overhead watering knocks numbers back.' },
 { id:'wbfly', n:'White butterfly caterpillars', kind:'insect', hits:['@brassica'], mo:[9,10,11,12,1,2,3,4,5], wx:{ t:[13,28] },
   sym:'Velvety green caterpillars that chew large holes in leaves and hearts, leaving green droppings.',
   prev:'Cover brassicas with fine insect mesh (2 mm or finer) from planting, sealed at the edges. Check the undersides of leaves weekly for yellow eggs.',
   org:'Pick off caterpillars and eggs, or spray Bt (Bacillus thuringiensis) on the leaves. NZ also has a tiny parasitic wasp (Cotesia) that keeps them down, so avoid broad-spectrum sprays.' },
 { id:'dbm', n:'Diamondback moth caterpillars', kind:'insect', hits:['@brassica'], mo:[10,11,12,1,2,3,4], wx:{ t:[15,30], rain:'dry' },
   sym:'Small slim green caterpillars that wriggle backwards when touched; “windowing” of leaves and tiny holes.',
   prev:'Fine insect mesh from planting time. Removing old brassica plants after harvest stops them breeding.',
   org:'Bt spray, and spinosad-based products if you use them (spray in the evening, because spinosad is toxic to bees). Rotate the sprays because the moths become resistant quickly.' },
 { id:'cutworm', n:'Cutworm and armyworm', kind:'insect', hits:['*'], mo:[9,10,11,12,1,2,3,4], wx:{},
   sym:'Seedlings cut off at ground level overnight; fat grey-brown caterpillars curled in the soil just below the surface.',
   prev:'Put a collar (cardboard tube or cut-off can) around seedlings when you plant them, and clear weeds before planting.',
   org:'Go out with a torch after dark and hand-pick; scratch around damaged seedlings to find the culprit.' },
 { id:'slug', n:'Slugs and snails', kind:'pest', hits:['*'], mo:[1,2,3,4,5,6,7,8,9,10,11,12], wx:{ t:[6,22], rain:'wet' },
   sym:'Ragged holes in leaves and seedlings, silvery slime trails, mostly on damp nights.',
   prev:'Water in the morning so the surface is dry at night, remove hiding places (boards, dense leaf litter), and protect young seedlings until they are tough. Copper tape helps on pots.',
   org:'Beer traps, night patrols, and iron-phosphate baits (safer for pets and birds than metaldehyde). Encourage birds and ground beetles where you can.' },
 { id:'psyllid', n:'Tomato-potato psyllid', kind:'insect', hits:['@solanum'], mo:[10,11,12,1,2,3,4,5], wx:{ t:[14,28] },
   sym:'Tiny jumping sap-suckers; leaves curl up and turn yellow or purple at the edges; sugary white crystals on leaves; stunted plants.',
   prev:'Keep plants growing strongly, cover young plants with fine mesh, and remove nightshade weeds and old solanum plants nearby. Check the undersides of leaves weekly from spring.',
   org:'Soap or oil sprays and spinosad-based products can reduce numbers if applied early (spray in the evening, because spinosad is toxic to bees); once plants are yellowed, recovery is slow.',
   nz:'First found in NZ in 2006 and now widespread. It also spreads a bacterium linked to “zebra chip” in potatoes.' },
 { id:'lblight', n:'Late blight (tomatoes and potatoes)', kind:'disease', hits:['potato','@tomato'], mo:[11,12,1,2,3,4], wx:{ t:[10,25], rain:'wet' },
   sym:'Dark, water-soaked blotches on leaves with a pale rim, white fuzz underneath on humid mornings, brown patches on fruit and stems, and firm brown rot in potatoes. It spreads fast in warm, humid, wet weather.',
   prev:'Space plants and stake them to keep leaves dry, water the soil (not the leaves) in the morning, keep tomatoes and potatoes apart, and remove lower leaves. Copper sprays before a wet spell give some protection.',
   org:'Remove and bin (don’t compost) affected plants. Lift potatoes soon after the tops die.' },
 { id:'eblight', n:'Early blight and leaf spots', kind:'disease', hits:['@tomato','potato','capsicum','eggplant'], mo:[12,1,2,3,4], wx:{ t:[18,30], rain:'wet' },
   sym:'Brown spots with concentric rings on the lowest leaves, which then yellow and drop.',
   prev:'Mulch to stop soil splashing on leaves, strip the lowest leaves, rotate crops, and give plants room.',
   org:'Remove affected leaves; copper spray can slow it.' },
 { id:'pmildew', n:'Powdery mildew', kind:'disease', hits:['@cucurbit','peas','T:vine','T:pome','rose','zinnia','strawberry','calendula','sweetpea'], mo:[12,1,2,3,4,5], wx:{ t:[18,30], rain:'dry' },
   sym:'White, floury patches on leaves that spread until they yellow and die back.',
   prev:'Give plants space and airflow, water at the base in the morning, and grow resistant varieties. Dry days with humid nights are its favourite weather.',
   org:'Remove worst leaves. Spray weekly with potassium bicarbonate or diluted milk (about 1 part milk to 9 of water). Avoid sulphur on cucurbits in heat.' },
 { id:'dmildew', n:'Downy mildew', kind:'disease', hits:['@allium','lettuce','T:vine','@brassica','peas','@cucurbit','spinach'], mo:[3,4,5,6,9,10,11], wx:{ t:[7,20], rain:'wet' },
   sym:'Yellow patches on top of leaves, with grey-purple fuzz below in cool, damp weather; onion leaves collapse.',
   prev:'Wide spacing, no overhead watering late in the day, and clear old crop debris. Rotate alliums and brassicas.',
   org:'Remove infected leaves; copper can protect if applied before the wet weather.' },
 { id:'botrytis', n:'Grey mould (botrytis)', kind:'disease', hits:['strawberry','T:vine','lettuce','@tomato','rose','onion','cucumber'], mo:[9,10,11,12,1,2,3,4,5], wx:{ t:[10,24], rain:'wet', glass:true },
   sym:'Soft brown rot covered with grey fuzzy mould on fruit, flowers and stems, often after damp weather.',
   prev:'Open the canopy, ventilate the glasshouse well (especially at night and in humid weather), pick or remove dead flowers and old leaves, and net strawberries off the ground.',
   org:'Remove and bin affected fruit quickly; don’t leave fallen material.' },
 { id:'blackspot', n:'Black spot (roses)', kind:'disease', hits:['rose'], mo:[9,10,11,12,1,2,3,4,5], wx:{ t:[12,26], rain:'wet' },
   sym:'Black spots with fringed edges on leaves, which yellow and drop.',
   prev:'Clear fallen leaves in winter, keep foliage dry when watering, and prune for air. Pick resistant varieties.',
   org:'Strip and bin affected leaves; sulphur or copper sprays every 10–14 days while it is wet.' },
 { id:'scab', n:'Apple and pear scab', kind:'disease', hits:['T:pome'], mo:[9,10,11,12], wx:{ t:[8,20], rain:'wet' },
   sym:'Olive-green to black scabs on leaves and fruit, worst after wet spring weather.',
   prev:'Rake up and remove fallen leaves in autumn, keep the canopy open, and choose less susceptible varieties.',
   org:'Copper at green tip (it can russet fruit if applied later), then sulphur or lime sulphur before wet spells.' },
 { id:'codling', n:'Codling moth', kind:'insect', hits:['T:pome'], mo:[10,11,12,1,2,3], wx:{ t:[14,28] },
   sym:'A “worm” tunnel with brown frass at the eye end of apples and pears.',
   prev:'Hang a pheromone trap in October to see when moths fly. Bag fruit when they are marble-sized (about 6 weeks after petal fall), band trunks with corrugated cardboard in January and destroy the larvae, and clear fallen fruit weekly.',
   org:'If you spray, time it to trap catches (a product label will say how often).' },
 { id:'fireblight', n:'Fire blight', kind:'disease', hits:['T:pome'], mo:[10,11,12,1,2], wx:{ t:[18,28], rain:'wet' },
   sym:'Shoot tips and blossom clusters wilt, turn black and curl into a shepherd’s crook, as if scorched by fire.',
   prev:'Avoid heavy nitrogen feeding (soft growth is most vulnerable), and remove wild hawthorn and quince nearby.',
   nz:'Established in NZ. Some regional councils require control around commercial pipfruit orchards, so check with yours.',
   org:'Cut out affected shoots 30 cm below the visible damage in dry weather, disinfect tools between cuts, and burn or bin the cuttings.' },
 { id:'wapple', n:'Woolly aphid (apples)', kind:'insect', hits:['T:pome'], mo:[10,11,12,1,2,3,4,5], wx:{ t:[14,26] },
   sym:'White cottony patches on branches and pruning wounds, with lumpy galls.',
   prev:'A tiny wasp (Aphelinus mali) keeps woolly aphid in check, so avoid broad-spectrum sprays. Prune out infested wood.',
   org:'Scrub with a soapy brush or spray oil on small infestations.' },
 { id:'guavamoth', n:'Guava moth', kind:'insect', hits:['T:feijoa','T:citrus','T:stone'], mo:[12,1,2,3,4,5,6], wx:{ t:[14,28] },
   sym:'Fruit that drop early or rot from inside, with small holes and a pink-white caterpillar; feijoas are the favourite host, but mandarins, lemons, plums, peaches and others are hit too.',
   prev:'Hang a pheromone trap from spring to see when moths fly (damage builds from flower fall to fruit drop), pick up and bin fallen fruit every few days, and clear leaf litter under trees.',
   org:'Spray labelled neem or spinosad products once the trap catches moths, repeating as directed (spray in the evening, because spinosad is toxic to bees).' },
 { id:'pleafcurl', n:'Peach leaf curl', kind:'disease', hits:['peach','nectarine'], mo:[6,7,8,9,10], wx:{ t:[6,16], rain:'wet' },
   sym:'Thick, red, blistered, curled leaves in spring; the tree loses vigour and cropping falls.',
   prev:'This is prevented, not cured: spray with copper or lime sulphur at leaf fall (May–June) and again at bud swell in late winter (July to early August) before flower buds open. Keep the tree dry if you can.',
   org:'Once symptoms show, spraying doesn’t help. Pick the curled leaves off, feed and water well, and spray properly next winter.' },
 { id:'brownrot', n:'Brown rot', kind:'disease', hits:['T:stone'], mo:[11,12,1,2,3], wx:{ t:[15,28], rain:'wet' },
   sym:'Fruit rots quickly with rings of tan-grey spores, and dried “mummies” stay on the tree.',
   prev:'Thin fruit so they don’t touch, prune to an open shape, and remove mummies and fallen fruit.',
   org:'Bin infected fruit. A copper or sulphur fungicide from petal fall, repeated every 10–14 days until harvest (follow the label), can lower the amount of disease, and copper at bud swell in winter helps too.' },
 { id:'lemonborer', n:'Lemon tree borer', kind:'insect', hits:['T:citrus'], mo:[10,11,12,1,2,3], wx:{},
   sym:'Sawdust-like frass and small holes on twigs and branches, wilting shoots, and a big longhorn beetle in spring. It is a native NZ insect that attacks citrus and many other trees.',
   prev:'Keep the tree healthy, prune out dead twigs, and check for frass every spring.',
   org:'Probe the tunnel with a stiff wire to kill the grub, and cut out and destroy badly infested twigs.' },
 { id:'scale', n:'Scale insects and sooty mould', kind:'insect', hits:['T:citrus','T:orn','T:stone'], mo:[9,10,11,12,1,2,3,4,5], wx:{ t:[14,28] },
   sym:'Little waxy bumps on stems and leaves, sticky honeydew, black sooty mould, and ants farming them.',
   prev:'Control ants (they protect scale), avoid too much nitrogen, and prune to let light in.',
   org:'Wipe off with a soapy cloth; spray horticultural (white or vegetable) oil, and repeat as the label says.' },
 { id:'hopper', n:'Passionvine hopper', kind:'insect', hits:['*'], mo:[11,12,1,2,3,4], wx:{ t:[16,30] }, band:['warm'],
   sym:'White woolly tufts on stems, hopping grey-brown insects, and black sooty mould on plants below them.',
   prev:'Hose them off as soon as you see them, and check the underside of leaves in summer.',
   org:'Wash off with a jet of water or spray with soap; they seldom kill mature plants.' },
 { id:'earworm', n:'Corn earworm', kind:'insect', hits:['corn','popcorn','@tomato','capsicum','dbean','cbean'], mo:[1,2,3,4], wx:{ t:[18,30] },
   sym:'Caterpillars in the cob tip or in fruit, and droppings in the silks.',
   prev:'Plant early so the corn is over before the peak moth flights, and keep corn and tomatoes apart.',
   org:'Spray Bt onto the silks as they first appear, or pick out caterpillars and cut off damaged tips.' },
 { id:'gvbug', n:'Green vegetable bug', kind:'insect', hits:['@tomato','dbean','cbean','edamame','corn','T:citrus','capsicum'], mo:[12,1,2,3,4], wx:{ t:[18,30] },
   sym:'Bright green shield bugs that pierce fruit and pods, leaving pale spots and dimples.',
   prev:'Check plants in the morning when the bugs are sluggish, and keep the area free of weeds where they shelter.',
   org:'Hand-pick into soapy water. NZ has a tiny parasitic wasp (Trissolcus) that kills their eggs, so avoid broad-spectrum sprays.' },
 { id:'leafminer', n:'Leaf miners', kind:'insect', hits:['@beet','tomato','dbean','cbean'], mo:[9,10,11,12,1,2,3,4,5], wx:{ t:[12,26] },
   sym:'Pale winding tunnels or blotches inside leaves; silverbeet and beetroot leaves get papery patches.',
   prev:'Cover young plants with fine mesh, and remove the affected leaves promptly.',
   org:'Squash the maggots in the leaf with your fingers and bin the worst leaves; the plant will regrow.' },
 { id:'crf', n:'Carrot rust fly', kind:'insect', hits:['@umbel'], mo:[10,11,12,1,2,3,4,5], wx:{ t:[12,26] },
   sym:'Rusty-brown tunnels in the roots, wilting or reddening foliage, and stunted roots.',
   prev:'Cover the crop with fine mesh from sowing; the flies fly low, so raised beds help. Sow thinly to avoid thinning, or thin in the evening and bury thinnings, because bruised leaves release scent. Rotate carrots each year. Onion-family plants nearby may confuse the fly, but the mesh does the real work.',
   org:'There is no easy spray, so barriers work best.',
   nz:'Present in NZ carrot-growing regions, including Canterbury and Pukekohe.' },
 { id:'clubroot', n:'Clubroot', kind:'disease', hits:['@brassica'], mo:[1,2,3,4,5,6,7,8,9,10,11,12], wx:{ rain:'wet' },
   sym:'Plants wilt on hot days and are stunted; roots are swollen, knobbly and distorted. Spores can live in soil for many years.',
   prev:'Don’t grow brassicas in a bed where it has appeared: spores last up to about 20 years, so rotation only lowers the risk. Lime to keep the soil around pH 7 to 7.2, improve drainage, raise your own seedlings in clean mix, and clean boots and tools. Mustard green manures are brassicas, so avoid them.',
   org:'There is no cure. Dig the plants out with their roots and bin them; don’t compost them.' },
 { id:'whiterot', n:'White rot (onions and garlic)', kind:'disease', hits:['@allium'], mo:[4,5,6,7,8,9,10,11], wx:{ t:[8,20] },
   sym:'Yellowing, wilting leaves; a white fluffy mould at the base of the bulb with tiny black dots that are resting spores.',
   prev:'Buy certified clean seed garlic and sets, don’t plant alliums where the disease has appeared, and don’t move soil on tools or boots. The resting spores last for 15 to 20 years.',
   org:'Bin infected plants; there is no cure. Grow alliums in pots of fresh mix if the soil is infested.' },
 { id:'arust', n:'Garlic and leek rust', kind:'disease', hits:['garlic','leek','onion','chives'], mo:[9,10,11,12,1], wx:{ t:[10,24], rain:'wet' },
   sym:'Orange powdery pustules on leaves, most common in spring and early summer.',
   prev:'Give plants space, avoid over-feeding with nitrogen, rotate, and remove infected leaves; save seed cloves only from clean plants.',
   org:'Remove worst leaves; bulbs are usually still fine to use.' },
 { id:'ber', n:'Blossom end rot', kind:'disorder', hits:['@tomato','capsicum','zucchini','eggplant','cucumber'], mo:[12,1,2,3], wx:{ t:[20,32], rain:'dry' },
   sym:'A dark, sunken leathery patch on the bottom of the fruit.',
   prev:'It comes from swings between wet and dry soil that stop calcium reaching the fruit, not a lack of calcium. Water steadily, mulch, and keep pots from drying out.',
   org:'Pick off affected fruit; later fruit will be fine once the watering is steady.' },
 { id:'split', n:'Cracked fruit', kind:'disorder', hits:['@tomato','cherry'], mo:[1,2,3,4], wx:{ rain:'wet' },
   sym:'Splits across or around the top of tomatoes, often after rain following dry weather.',
   prev:'Keep watering even, mulch, and pick ripe fruit promptly, or slightly early, before a big downpour.',
   org:'Use split fruit first; they rot quickly.' },
 { id:'heat', n:'Heat stress and bolting', kind:'disorder', hits:['lettuce','spinach','coriander','rocket','@brassica','celery','fennel','dill','beetroot','silverbeet'], mo:[11,12,1,2,3], wx:{ t:[20,40] },
   sym:'A flower stem shoots up (bolts), leaves go bitter or tip-burnt, and plants stop cropping.',
   prev:'Give afternoon shade (30–40% shade cloth), water more often, mulch, sow bolt-resistant varieties, and sow small batches every two weeks.',
   org:'Harvest what you can and resow; when it starts to bolt, it is finished.' },
 { id:'noset', n:'Fruit not setting in heat', kind:'disorder', hits:['@tomato','capsicum','eggplant','chilli','cucumber'], mo:[12,1,2], wx:{ t:[24,40] },
   sym:'Flowers drop without making fruit when days are above about 32 °C or nights stay above about 21 °C, and when it is cold below 10 °C at night.',
   prev:'Provide light shade in a heatwave, ventilate glasshouses fully, water well, and tap the flower trusses at midday to release pollen.',
   org:'Fruit set resumes when temperatures ease.' },
 { id:'nematode', n:'Root-knot nematodes', kind:'pest', hits:['@tomato','cucumber','carrot','beetroot','capsicum','eggplant','zucchini'], mo:[10,11,12,1,2,3,4], wx:{ t:[18,32], glass:true },
   sym:'Knobbly galls on the roots, poor stunted growth and wilting in warm weather; carrots become forked.',
   prev:'Rotate, use fresh potting mix in pots, grow a dense crop of French marigolds for a full season, and solarise infected soil for 4–6 weeks under clear plastic in midsummer.',
   org:'There is no easy cure. Remove infected roots, and don’t reuse the soil for susceptible crops.' },
 { id:'wilt', n:'Fusarium and verticillium wilt', kind:'disease', hits:['@tomato','capsicum','eggplant','potato','strawberry'], mo:[11,12,1,2,3,4], wx:{ t:[20,32], glass:true },
   sym:'Lower leaves yellow and wilt on one side, and the stem shows brown streaks inside; plants collapse in warm weather.',
   prev:'Rotate for 3 or more years, use resistant varieties (look for V, F and N on the label), grow in fresh mix in pots or glasshouses, and remove infected plants.',
   org:'Bin infected plants. In glasshouses, replace the soil or grow in pots of new mix.' },
 { id:'scabpot', n:'Potato scab', kind:'disease', hits:['potato','beetroot','carrot'], mo:[9,10,11,12,1,2], wx:{ rain:'dry' },
   sym:'Rough, corky patches on the skin of tubers; the flesh is fine.',
   prev:'Keep soil evenly moist for the first month after the tubers form, avoid lime, and don’t use fresh manure.',
   org:'Peel and use them; grow less-susceptible varieties.' },
 { id:'birds', n:'Birds', kind:'pest', hits:['T:stone','T:pome','T:vine','strawberry','T:citrus'], mo:[11,12,1,2,3,4,5], wx:{},
   sym:'Half-eaten fruit, and pecked or missing berries, cherries and grapes.',
   prev:'Net soft fruit and vines before it colours (fine bird mesh over a frame so birds can’t get trapped in it).',
   org:'Use bird netting or scare devices that move, and check nets often for trapped birds.' },
 { id:'possums', n:'Possums', kind:'pest', hits:['T:stone','T:pome','T:vine','T:citrus','T:orn','strawberry'], mo:[1,2,3,4,5,6,7,8,9,10,11,12], wx:{},
   sym:'Stripped leaves, blossom and new shoots, gnawed bark and half-eaten fruit, mostly overnight, with droppings and claw marks on trunks.',
   prev:'Wrap a smooth metal band around the trunk about a metre above the ground, and trim branches that touch a fence, roof or other tree so they can’t jump across. Net young trees and blossom.',
   org:'Traps made for possums work well; follow the maker’s instructions and your regional council’s rules.' },
 { id:'wasabipest', n:'Slugs and root rot (wasabi)', kind:'disease', hits:['wasabi'], mo:[1,2,3,4,5,6,7,8,9,10,11,12], wx:{ t:[8,22], rain:'wet' },
   sym:'Rotted or collapsing stems and leaves; slug damage to leaves.',
   prev:'Good drainage with constant moisture, cool shade, clean fresh soil each planting, and slug control.',
   org:'Remove rotting material and give the plant more airflow.' }
];


/* ---------- techniques ----------
   for: the situations where this is especially worth doing.
     soil (clay|sand|loam) · wind (exposed) · pots · glass · dry (dry summer forecast) · hot (hot summer forecast) · cool (cold-winter region) ·
     warm (frost-free or nearly) · small (under 12 m² of beds) · begin (beginner) · goal:[flowers|easy|water|kids|pollinators|seeds|preserve|food] · trees · beds
   cat: Soil · Water · Layout · Season · Pests · Pots and glass · Feeding · Seeds · Trees                                                    */
const TECHS = [
 { id:'nodig', n:'No-dig and sheet-mulch beds', cat:'Soil', for:{ soil:['clay'], goal:['easy'], begin:1 },
   sum:'Build fertile beds on top of the soil instead of digging: less weeding, better soil life, and no back-breaking work.',
   how:['Mow or slash the weeds and leave them in place. Lay overlapping sheets of plain cardboard (tape and staples removed) and wet it.','Cover with 10–15 cm of compost and, if you like, a layer of straw or leaf mould. Plant straight into the compost, or make holes in the cardboard for deep-rooted plants.','Each year top up with 2–3 cm of compost instead of digging.'],
   best:'Compacted or weedy ground, heavy clay, and new beds.', watch:'Slugs love the damp cover, so protect seedlings. Watch for weed seed in cheap compost, and test bought compost and manure for weed-killer residue (see Deep mulching for how).' },
 { id:'raised', n:'Raised beds', cat:'Soil', for:{ soil:['clay'], cool:1, small:1 },
   sum:'Beds 20–40 cm above the ground drain fast, warm earlier in spring, and can be filled with good soil whatever is underneath.',
   how:['Keep the bed about 1.2 m wide so you can reach the middle from both sides without stepping on it.','Build with untreated durable timber (macrocarpa or cedar), steel or concrete. Avoid old railway sleepers, creosoted timber and timber of unknown treatment.','Fill with a mix of about 60% topsoil or loam and 40% compost.'],
   best:'Wet or clay sites, cold-climate regions, and where you want tidy paths.', watch:'They dry out faster, so plan for mulch and regular watering. Don’t use CCA-treated (copper-chrome-arsenic) timber, which is still common in NZ. Use untreated macrocarpa or cedar, steel or concrete, or timber the supplier confirms is not CCA-treated.' },
 { id:'mulch', n:'Deep mulching', cat:'Water', for:{ dry:1, hot:1, goal:['water','easy'], soil:['sand'] },
   sum:'A 5–8 cm blanket of straw, pea straw, leaves or bark keeps soil cooler, can cut evaporation by around a third, and suppresses weeds.',
   how:['Water the bed well, then spread mulch 5–8 cm deep. Keep it a hand’s width away from stems and trunks.','Use loose straw or pea straw on vegetables and bark on trees and perennials.','Don’t mulch cool soil in early spring until it has warmed, or seedlings will be slow, and add slug control.'],
   best:'Summer vegetable beds, trees, and any dry summer (El Niño).', watch:'Hay, straw, pea straw, manure and compost, and clippings from sprayed lawns, can carry persistent weed-killers (clopyralid, aminopyralid, picloram) that survive composting and curl and stunt tomatoes, beans, peas, potatoes and lettuce. Ask the supplier, or test first: grow peas or beans in a pot of the material beside a pot of clean potting mix and look for twisted, cupped leaves after 2–3 weeks.' },
 { id:'drip', n:'Drip irrigation and timers', cat:'Water', for:{ dry:1, hot:1, goal:['water','easy'], pots:1, beds:1 },
   sum:'Water delivered slowly at the base of each plant uses far less water, keeps leaves dry (less mildew and blight), and works while you’re away.',
   how:['Use 13 mm mains hose with drippers 30 cm apart along each row, or 4 mm micro-tubing with a dripper per pot.','Add a battery timer on the tap and set morning cycles. Check for blockages each month.','Run it long and less often rather than short and daily, so roots go deep.'],
   best:'Long dry spells, holiday cover, tomatoes and cucurbits, pots and glasshouses.', watch:'Check it works after every wet spell and that seedlings get enough water, since drippers wet only a small area.' },
 { id:'wicking', n:'Self-watering pots and wicking beds', cat:'Pots and glass', for:{ pots:1, glass:1, dry:1, hot:1 },
   sum:'A reservoir under the growing mix feeds moisture upwards, so plants don’t swing between wet and dry, which is a common trigger for blossom end rot and split fruit.',
   how:['For a pot: use a self-watering pot, or make one with a bucket inside a bucket and a wick of cotton rope, or a reservoir of clean gravel.','For a bed: line a raised bed with pond liner, put 20 cm of gravel or coarse sand as the reservoir with a fill pipe, cover with a permeable fabric and fill with potting mix.','Top up the reservoir every few days in summer.'],
   best:'Tomatoes, cucumbers and capsicums in pots; holidays; hot glasshouses.', watch:'Use a light potting mix (not heavy soil), flush the reservoir occasionally so salts don’t build up, screen the fill pipe with mesh so mosquitoes can’t breed, and fit an overflow so the bed can’t waterlog.' },
 { id:'olla', n:'Ollas (buried clay pots)', cat:'Water', for:{ dry:1, goal:['water'] },
   sum:'An unglazed terracotta pot buried to its neck and filled with water seeps moisture straight to the roots and needs filling once a week or so.',
   how:['Bury two joined terracotta pots (glue the rims and seal the drain hole) or a purpose-made olla so only the top shows.','Plant thirsty crops (tomatoes, zucchini, cucumber) within 20–30 cm of it.','Fill it and cover the top with a saucer to stop mosquitoes and evaporation.'],
   best:'Dry summers and thirsty crops in small beds.', watch:'It doesn’t replace watering seedlings until they root down.' },
 { id:'succession', n:'Succession sowing and catch cropping', cat:'Layout', for:{ small:1, goal:['food'], begin:1 },
   sum:'Sow small batches every 2–3 weeks so you don’t get a glut, and slot fast crops between slow ones so the ground never rests bare.',
   how:['Sow lettuce, radish, spinach, beans, beetroot and carrots in small batches, 2–3 weeks apart.','Fill the gap between young slow crops (cabbage, tomatoes, corn) with radish or lettuce that will be gone before the big plants need the room.','As soon as a crop finishes, put the next one in (the planner shows when).'],
   best:'Small gardens and anyone who wants steady picking.', watch:'Feed and compost between crops, because you’re asking a lot of the soil.' },
 { id:'guilds', n:'Companion planting — how to use it well', cat:'Layout', for:{ goal:['pollinators','food'], beds:1 },
   sum:'Some pairings are well-supported (flowers for beneficial insects, shade for lettuce, corn-and-bean supports), and some are folklore. Use the evidence rating in the Companions view.',
   how:['Put flowers such as alyssum, dill, calendula or borage at the ends and edges of beds, to feed hoverflies, lacewings and wasps that eat pests.','Use tall plants to shade lettuce and other greens in summer; put tall crops on the south side of the bed so they don’t shade shorter sun-lovers.','Interplant onion-family plants around carrots and brassicas, but add insect mesh as well.'],
   best:'Any vegetable garden.', watch:'Companion planting won’t stop a serious pest by itself. Rotation, healthy soil, mesh and watering matter more.' },
 { id:'sisters', n:'Three Sisters block (corn, climbing beans, pumpkin)', cat:'Layout', for:{ goal:['kids','food'], corn:1 },
   sum:'A traditional Native American way of growing: corn holds up beans, beans add nitrogen to the soil for later crops, and pumpkin covers the ground.',
   how:['In a block (not a row), sow corn in a 30 cm grid. When it is 15 cm tall, sow 2–3 climbing beans around each plant.','Plant pumpkin or squash seeds around the edges of the block once frost has passed.','Water well through flowering.'],
   best:'Popcorn and sweetcorn blocks, and gardens with room.', watch:'Choose a small-fruited climbing bean and a bush or small-vine squash so the plants don’t overwhelm the corn.' },
 { id:'vertical', n:'Vertical growing and trellises', cat:'Layout', for:{ small:1, pots:1, goal:['food'] },
   sum:'Growing up instead of out can greatly increase what a small space produces, and keeps fruit clean and airy.',
   how:['Use sturdy trellis, netting between posts, or teepees for climbing beans, peas, cucumbers, small pumpkins and sweet peas.','Put the trellis on the south side of the bed so it doesn’t shade the crops beside it.','Tie in tomatoes with soft string as they grow.'],
   best:'Small gardens, balconies, and cucumbers and beans.', watch:'Heavy fruit such as pumpkins and melons need slings, and posts must be well set for wind.' },
 { id:'rotation', n:'Crop rotation', cat:'Layout', for:{ beds:1, goal:['food'] },
   sum:'Moving crops between beds in a fixed cycle breaks the life cycle of the pests and diseases that live in soil and spreads nutrient demands evenly.',
   how:['Divide your beds into three or four groups, with each group of families going into a different bed every year.','A simple 4-year order: legumes → leafy brassicas → fruiting crops (tomato, cucurbits, corn) → roots and alliums, then back to legumes.','Keep a record of what grew where (the planner’s Rotation view does this).'],
   best:'Everyone with more than one bed.', watch:'With one small bed, use the rest periods to guide what you plant, and consider pots for the crops with the longest breaks.' },
 { id:'greenmanure', n:'Green manures and cover crops', cat:'Soil', for:{ beds:1, goal:['easy','food'], soil:['sand','clay'] },
   sum:'Fast-growing crops sown on resting beds smother weeds, add organic matter and, if legumes, add nitrogen.',
   how:['In autumn and winter, sow oats, blue (narrow-leaf) lupin or a mix of both; in spring and summer sow phacelia or buckwheat once the frosts are over (lablab only in warm, frost-free regions).','Chop at first flower, then dig in or lay on the surface as mulch, and wait 2–3 weeks before planting.','Avoid mustard in beds where clubroot is a worry (it is a brassica).'],
   best:'Gaps of two months or more between crops, and tired soil.', watch:'Don’t let it set seed. Keep it out of the way of quick crops that need the room.' },
 { id:'compost', n:'Compost, worms and bokashi', cat:'Soil', for:{ goal:['easy','food'], begin:1, beds:1 },
   sum:'Compost is the cheapest fertiliser and soil improver you will ever have. Worm farms and bokashi handle kitchen scraps in small spaces.',
   how:['Mix roughly equal parts of green (kitchen scraps, fresh clippings) and brown (dry leaves, shredded paper, straw), keep it as damp as a wrung-out sponge, and turn it every couple of weeks for hot compost.','Worm farms (with tiger worms) handle vegetable scraps and produce worm juice for feeding.','Bokashi ferments scraps, including cooked food, in a bucket; bury or add the result to compost.'],
   best:'Every garden.', watch:'Don’t compost diseased plants (late blight, clubroot, white rot), and stay away from cat and dog waste and weeds gone to seed.' },
 { id:'liquidfeed', n:'Liquid feeds: seaweed, comfrey and worm juice', cat:'Feeding', for:{ pots:1, goal:['flowers','food'] },
   sum:'Home-made or bought liquid feeds give a quick boost to hungry plants, especially in pots that leach nutrients.',
   how:['Seaweed tonic every 2–3 weeks helps plants cope with stress.','Comfrey leaves soaked in water for 3–4 weeks make a potassium-rich feed for tomatoes and flowers (dilute about 1 part to 10 of water; it smells).','Worm-farm liquid diluted to a light tea colour is a gentle general feed.'],
   best:'Pots, fruiting crops and flower beds.', watch:'Wash your hands, and don’t pour liquid feeds on leaves you’ll eat within a few days.' },
 { id:'cloches', n:'Cloches, frost cloth and low tunnels', cat:'Season', for:{ cool:1, goal:['food'] },
   sum:'Simple covers add a degree or more (light frost cloth about 1–3 °C, and more under polythene), so you can plant a couple of weeks earlier in spring and keep going into autumn. They won’t save tender plants from a hard frost.',
   how:['Cut the bottoms off clear plastic bottles for individual cloches, or bend hoops of alkathene pipe over the bed and cover with frost cloth (or polythene for warmth).','Frost cloth (17–30 gsm) on cold nights protects tender seedlings. Pin it down at the edges.','Open covers on sunny days: plastic can cook plants above 30 °C.'],
   best:'Cool regions, early tomatoes and capsicums, and late lettuces.', watch:'Remove or vent in hot weather, and lift for pollination once flowering starts.' },
 { id:'blackplastic', n:'Soil-warming mulch for heat lovers', cat:'Season', for:{ cool:1 },
   sum:'Black plastic or dark mulch warms the soil by a few degrees so melons, pumpkins, kumara, corn and capsicums establish faster in cool regions.',
   how:['Lay black plastic (or dark, permeable weed mat) over the bed 2 weeks before planting to preheat the soil.','Cut holes and plant through it; water underneath with drip line.','Cover with light-coloured straw in midsummer if it gets too hot.'],
   best:'Watermelon, rockmelon, pumpkin, corn and capsicum in cool regions; kumara only in mild, sheltered sites.', watch:'Plastic stops rain reaching the soil, so add drip irrigation under it (weed mat lets some rain through).' },
 { id:'glasshouse', n:'Running a glasshouse well', cat:'Pots and glass', for:{ glass:1 },
   sum:'A glasshouse heats up fast and stays humid, which suits tomatoes and melons but also mildew, botrytis and whitefly, so airflow and hygiene matter.',
   how:['Open the vents and door every sunny morning (above about 25 °C) and leave a gap at night in humid weather.','Damp down the floor on hot days for humidity, and use shade cloth from late December to February to stop scorching.','Hang yellow sticky traps early, clear old leaves, and hose plants weekly.','Refresh the soil or use fresh potting mix each year to avoid soil-borne disease.'],
   best:'Every glasshouse.', watch:'Above about 30 °C tomato fruit set falls, and above about 35 °C plants are damaged.' },
 { id:'potcare', n:'Growing well in pots', cat:'Pots and glass', for:{ pots:1 },
   sum:'Pots dry out fast and wash out nutrients. A big pot, good mix and a routine make the difference.',
   how:['Match pot size to the plant: about 30 L for a tomato, 15–20 L for capsicum or eggplant, 10 L for a bean, and 2–5 L for herbs and lettuce.','Use fresh potting mix each year (or replace at least half), and mulch the top.','Feed every 1–2 weeks with a liquid feed, and stand pots in saucers only in summer.','Group pots by water needs, and out of the afternoon sun in the hottest months.'],
   best:'Every pot garden.', watch:'Dark pots and thin pots overheat in summer. Big pots are more forgiving than small pots.' },
 { id:'windbreak', n:'Windbreaks', cat:'Layout', for:{ wind:['exposed'], cool:1 },
   sum:'Wind dries and tears plants and slows growth. A half-permeable screen slows it far better than a solid wall.',
   how:['Use a shade-cloth or mesh screen about 50% open, or a hedge of hardy shrubs, on the windward side.','Protection reaches about 10 times the height of the screen downwind, but is best within 5 times.','A solid wall causes turbulence on the leeward side.'],
   best:'Nor’wester-prone sites in Canterbury, coastal gardens, and Wellington.', watch:'Don’t plant windbreaks that will shade the beds. Keep tall trees at least twice their height away.' },
 { id:'mesh', n:'Insect mesh and bird netting', cat:'Pests', for:{ goal:['food'], beds:1 },
   sum:'A physical barrier is the most reliable pest control. The right mesh stops white butterfly, carrot fly, leaf miners and psyllids without sprays.',
   how:['Cover crops from planting, over hoops, sealed all around with soil, boards or pegs. Match the mesh to the pest: about 5–7 mm butterfly netting held clear of the leaves stops white butterfly on brassicas, about 1.3 mm or finer keeps out carrot fly, and leaf miners and psyllids need finer mesh again (around 0.8 mm or less), so check the product says it excludes them.','Use bird mesh (about 12–15 mm) on a frame for strawberries, grapes and cherries.','Lift the cover for pollination on crops that need it.'],
   best:'Brassicas, carrots, silverbeet, strawberries, fruit trees.', watch:'Make sure no gaps. Birds can get tangled in loose netting, so use taut, fine-woven mesh.' },
 { id:'habitat', n:'Habitat for beneficial insects', cat:'Pests', for:{ goal:['pollinators','flowers','food'], beds:1 },
   sum:'Hoverflies, lacewings, ladybirds and parasitic wasps do most of the pest control for you if you give them nectar and shelter.',
   how:['Grow small-flowered plants such as alyssum, dill, coriander in flower, calendula, phacelia, borage and cosmos along the edges of veg beds.','Leave a patch of long grass or hollow stems for shelter, and provide a shallow dish of water with stones.','Avoid broad-spectrum sprays; if you must spray, use soap in the evening and don’t spray open flowers.'],
   best:'Every garden.', watch:'The benefits build over a season or two, so start early in spring.' },
 { id:'seedraising', n:'Raising seedlings well', cat:'Season', for:{ begin:1, goal:['food','seeds'] },
   sum:'Strong seedlings are half the harvest. Warmth, light and hardening off are what most people get wrong.',
   how:['Sow into a seed-raising mix. Most warm crops (tomato, capsicum, eggplant, cucumber, pumpkin) germinate best at 20–25 °C, which is where a heat mat or a warm windowsill helps.','After germination give as much light as you can (a bright windowsill, glasshouse or grow light) so seedlings don’t stretch.','Harden off for 7–10 days: a few hours outside in a sheltered spot, longer each day, before planting out.'],
   best:'Starting from seed.', watch:'Overwatering causes damping off; water from below and keep air moving.' },
 { id:'pollination', n:'Helping pollination', cat:'Pests', for:{ glass:1, goal:['food'] },
   sum:'Fruit that doesn’t set is often a pollination problem: no bees under glass, or wet, cold or very hot weather.',
   how:['Grow flowers that attract bees close by, and open glasshouse doors and vents.','Tap or gently shake tomato flower trusses at midday to release pollen.','Hand-pollinate zucchini, pumpkin and cucumber in the morning: pick a male flower, remove the petals and dab the pollen onto the centre of a female flower (the one with a mini fruit behind it).','Grow corn in blocks rather than a single long row.'],
   best:'Glasshouse tomatoes and cucurbits.', watch:'Cucumber varieties sold as “parthenocarpic” or “all-female” don’t need pollination, and pollinated ones can taste bitter.' },
 { id:'soiltest', n:'Test your soil', cat:'Soil', for:{ begin:1, soil:['clay','sand'] },
   sum:'A pH test costs a few dollars and tells you whether lime or sulphur is needed, which matters for brassicas (want 6.5–7.5), potatoes (5.5–6.5) and most other vegetables (6.0–7.0).',
   how:['Use a kit from a garden centre, or send a sample to a laboratory for a full nutrient analysis every 2–3 years.','Take samples from several spots 10–15 cm deep, mix them and test.','Adjust with lime (raise pH) or elemental sulphur (lower) in small amounts, and retest a couple of months later.'],
   best:'A new garden, or anywhere crops always struggle.', watch:'Don’t lime the potato bed, and don’t add fertiliser blindly.' },
 { id:'weeds', n:'Weed control that works', cat:'Soil', for:{ goal:['easy'], begin:1 },
   sum:'Stopping weeds early is much easier than fighting them later. Little and often works.',
   how:['Mulch bare soil, and hoe on dry mornings so the weeds shrivel.','Do a “stale seedbed”: water the bed, wait a fortnight, hoe off the flush of weeds, then sow.','Never let weeds set seed.'],
   best:'All beds.', watch:'Avoid digging deep, which brings up new seed.' },
 { id:'solarise', n:'Solarising soil', cat:'Soil', for:{ warm:1, hot:1 },
   sum:'Clear plastic laid tight over moist bare soil for 4–6 weeks in midsummer cooks weed seeds and many soil pests and diseases.',
   how:['Clear away debris, level and wet the soil, then cover with clear polythene, burying the edges.','Leave in place through the hottest weeks (about 4–6 weeks from December to February).','Remove it and plant without digging, to avoid bringing weed seeds back up.'],
   best:'Warm regions, and beds with nematodes or persistent weeds.', watch:'It also kills beneficial organisms in the top layer, so add compost afterwards. It is weak against perennial weeds such as kikuyu, oxalis and convolvulus.' },
 { id:'seedsave', n:'Saving your own seed', cat:'Seeds', for:{ goal:['seeds'] },
   sum:'Some crops give true seed with almost no effort, saving money and building a strain adapted to your garden.',
   how:['Easy: beans, peas, lettuce, tomatoes, calendula, sweet peas and sunflowers. Choose open-pollinated (not F1 hybrid) varieties, and the healthiest plants.','Dry the seed thoroughly and store it cool, dark and dry, labelled with the date.','Corn is wind-pollinated, so isolate varieties by 200 m or more or grow only one. Pumpkins and squash cross within the same species (bees carry pollen a long way), so bag and hand-pollinate the flowers or save from just one variety. Beans, peas, lettuce and tomatoes mostly self-pollinate, but sunflowers cross freely, so they won’t come true unless isolated.'],
   best:'Anyone wanting cheap, local seed.', watch:'Never save seed from plants with disease (rust in garlic, blight in tomatoes).' },
 { id:'waterwise', n:'Water-wise gardening', cat:'Water', for:{ dry:1, hot:1, goal:['water'] },
   sum:'A dry summer forecast means less rain and more evaporation. Small habits save a lot of water.',
   how:['Water early in the morning, deeply and infrequently, at the base of the plant.','Mulch everything. Group thirsty plants together and put them in the shadiest spot that suits them.','Collect roof water in a tank or water butt, and check local water restrictions.','Choose heat-tolerant crops and varieties in dry years.'],
   best:'Dry summers, town water restrictions, and El Niño years.', watch:'Newly planted seedlings and pots still need regular attention.' },
 { id:'espalier', n:'Small-space fruit: dwarf trees, espalier and pots', cat:'Trees', for:{ small:1, trees:1, pots:1 },
   sum:'Dwarf rootstocks, espaliered trees along a fence, and trees in big pots give fruit in a small garden.',
   how:['Choose dwarf or semi-dwarf rootstocks (they’re labelled) for apples and pears, and columnar or compact types for small yards.','Train espaliers along horizontal wires on a sunny fence; prune in summer to keep them flat.','In pots use 50–70 L containers, a good potting mix, and feed and water regularly.'],
   best:'Small sections and courtyards.', watch:'Pot trees need water every day in summer. Some apples, pears and plums also need a second variety nearby for pollination, so check the label.' }
];

/* ---------- monthly jobs (the things that aren't sowing and planting, which the calendar already covers) ----------
   band: all · warm (frost-free or nearly, e.g. Auckland north) · cool (frosty winters, e.g. Canterbury, Otago, the central plateau)      */
const MONTHLY = [
 // January
 { m:1, band:'all', t:'Water deeply in the early morning and mulch beds; a good soak twice a week beats a sprinkle daily.' },
 { m:1, band:'all', t:'Pick tomatoes, beans, courgettes and cucumbers every couple of days. Harvest garlic and shallots when the lower leaves brown, then cure them.' },
 { m:1, band:'all', t:'Pinch out the tops of climbing beans and tomatoes as they reach the top of their support.' },
 { m:1, band:'all', t:'Net ripening fruit (grapes, strawberries, stone fruit) before the birds find it.' },
 { m:1, band:'all', t:'Prune plums and cherries after fruiting, in dry weather (this lowers the risk of silver leaf disease).' },
 { m:1, band:'warm', t:'Watch for spider mites, powdery mildew and passionvine hopper in hot, dry spells.' },
 // February
 { m:2, band:'all', t:'Harvest onions when the tops fall over; dry them in the sun for a week and hang them in a shed.' },
 { m:2, band:'all', t:'Save seed from your best beans, lettuce, tomatoes and flowers. Let the pods dry on the plant.' },
 { m:2, band:'all', t:'Keep picking to keep plants cropping, and feed hungry crops (tomatoes, corn, cucurbits).' },
 { m:2, band:'all', t:'Sow winter brassicas and autumn crops now if you haven’t yet, while the soil is still warm.' },
 { m:2, band:'all', t:'Pick up and bin fallen fruit weekly (codling and guava moth).' },
 { m:2, band:'cool', t:'Watch the forecast for early frosts, and be ready to cover tender crops in March.' },
 // March
 { m:3, band:'all', t:'Sow green manures on beds that are finishing, and start clearing summer crops as they finish.' },
 { m:3, band:'all', t:'Harvest pumpkins and melons; cure pumpkins in the sun for a week or two before storing.' },
 { m:3, band:'all', t:'Pick apples, pears, grapes and figs as they ripen; feijoas start dropping from now.' },
 { m:3, band:'all', t:'Make compost from finished crops and autumn leaves; don’t compost blighted or mildewed material.' },
 { m:3, band:'cool', t:'Harvest tender crops such as basil, capsicums and tomatoes before the first frost, and ripen green tomatoes indoors.' },
 { m:4, band:'cool', t:'After frost blackens the dahlia foliage (April to May), lift the tubers or cover them with heavy mulch.' },
 // April
 { m:4, band:'all', t:'Plant garlic from late April through June, into well-drained soil (the old saying is “shortest day to longest day”).' },
 { m:4, band:'all', t:'Lift kumara before the first frost, cure them in a warm place for a week or so, then store them cool and dry.' },
 { m:4, band:'all', t:'Plant spring bulbs (daffodils, tulips, ranunculus); pre-chill tulips for 6–8 weeks in warm regions.' },
 { m:4, band:'all', t:'Dig in or lay down green manures, and add compost to empty beds.' },
 { m:4, band:'all', t:'Harvest the last apples, pears and citrus that are ripe, and collect feijoas as they fall.' },
 { m:4, band:'warm', t:'Keep watering for the last of the summer crops if autumn stays dry.' },
 // May
 { m:5, band:'all', t:'Clear away the spent summer crops and any diseased leaves; add compost or plant a cover crop.' },
 { m:5, band:'all', t:'Sow broad beans and peas in mild areas, and plant out garlic and cabbage seedlings while the soil is still workable.' },
 { m:5, band:'all', t:'Keep brassicas netted against white butterfly, and plant garlic if you haven’t.' },
 { m:5, band:'all', t:'Spray peach and nectarine trees with copper at leaf fall to prevent leaf curl.' },
 { m:5, band:'cool', t:'Cover frost-tender plants (citrus, young feijoas) on frosty nights and bring pots under cover.' },
 // June
 { m:6, band:'all', t:'Prune grape vines, apples and pears once they are dormant, on dry days (winter is the main pruning time for them).' },
 { m:6, band:'all', t:'Plant garlic (the traditional planting day is the shortest day, 21 June), and plant bare-root roses, fruit trees and vines from now to August.' },
 { m:6, band:'all', t:'Turn the compost, make leaf mould, and order seed catalogues for spring.' },
 { m:6, band:'all', t:'Protect frost-tender plants: shelter citrus and pots, and cover young trees on frosty nights.' },
 { m:6, band:'all', t:'Clean and sharpen tools, service the lawnmower, and check stakes and trellis.' },
 // July
 { m:7, band:'all', t:'Prune apple, pear and grape vines on dry days, while dormant. Do not prune plums or cherries now (silver leaf risk).' },
 { m:7, band:'all', t:'Spray peaches and nectarines with copper at bud swell for leaf curl, before the flowers open (blossom can open by late July in warm areas).' },
 { m:7, band:'all', t:'Start seeds in trays under cover: onions, leeks, lettuce and early brassicas; chit seed potatoes in a light, cool place.' },
 { m:7, band:'all', t:'Plan crop rotation for spring, and test soil pH if you never have.' },
 { m:7, band:'warm', t:'Plant early potatoes and peas in frost-free areas.' },
 // August
 { m:8, band:'all', t:'Feed the soil: add compost to beds, and scatter lime on brassica beds, based on a soil test.' },
 { m:8, band:'all', t:'Start tomatoes, capsicums, eggplants and chillies in trays on a warm windowsill or heated glasshouse (6–8 weeks before planting out).' },
 { m:8, band:'all', t:'Prune roses, and finish pruning apples and pears before buds burst. Copper spray at bud swell if you haven’t.' },
 { m:8, band:'all', t:'Plant early potatoes where frost is not a risk; earth them up as shoots appear.' },
 { m:8, band:'cool', t:'Warm the soil under cloches or black plastic for two weeks before sowing early crops.' },
 // September
 { m:9, band:'all', t:'Sow beans, cucumbers and sweetcorn in trays under cover. In cool regions wait until mid-October to sow them direct (the soil needs to be at least 15 °C); harden off tomatoes before planting out.' },
 { m:9, band:'all', t:'Feed citrus, fruit trees and roses as buds break; mulch under trees.' },
 { m:9, band:'all', t:'Watch for late frosts on blossom, fruit and new growth on vines, and be ready with frost cloth.' },
 { m:9, band:'all', t:'Slugs and snails wake up: protect seedlings; harvest asparagus and broad beans as they come.' },
 { m:9, band:'cool', t:'Wait for the soil to warm (12–15 °C for most tender crops) before planting out; Labour Weekend (late October) is the traditional tender-crop date in the south.' },
 // October
 { m:10, band:'all', t:'Plant out tomatoes, capsicums, eggplants, cucumbers, zucchini, pumpkins and corn once frost risk has passed (the planner uses your frost dates).' },
 { m:10, band:'all', t:'Mulch beds as soon as the soil has warmed up, and set up drip irrigation before it is hot.' },
 { m:10, band:'all', t:'Hang a codling moth pheromone trap in apples and pears to time your bagging or spraying.' },
 { m:10, band:'all', t:'Check citrus twigs for lemon tree borer frass and probe holes with a wire.' },
 { m:10, band:'all', t:'Support tall sunflowers and sweet peas; sow more salad crops in the shade of taller crops.' },
 // November
 { m:11, band:'all', t:'Thin fruit on apples, pears, peaches and plums, leaving apples, pears and peaches about 10–15 cm apart and plums 5–10 cm apart.' },
 { m:11, band:'all', t:'Tie tomatoes to stakes and remove side shoots on indeterminate types; start regular feeds.' },
 { m:11, band:'all', t:'Sow beans, corn and cucumber for a second round; sow small batches of lettuce, radish and carrots every 2–3 weeks.' },
 { m:11, band:'all', t:'Hose plants for aphids and keep weeds down while everything is growing fast.' },
 { m:11, band:'cool', t:'Plant the last frost-tender crops, watching for late frosts until the end of the month.' },
 // December
 { m:12, band:'all', t:'Harvest garlic (usually around the longest day, 21 December), and hang it to dry in shade. Hang a guava moth trap in feijoas and citrus.' },
 { m:12, band:'all', t:'Put shade cloth over lettuce and glasshouses for the hottest weeks, and keep glasshouse vents open.' },
 { m:12, band:'all', t:'Pick peas, broad beans, courgettes, and early tomatoes; water deeply, mulch, and check for mildew.' },
 { m:12, band:'all', t:'Put bird netting over ripening fruit and grape vines, and thin bunches of grapes.' },
 { m:12, band:'warm', t:'Sow a second round of beans and courgettes for autumn if the season allows.' }
];

/* ---------- orchard, vine and shrub care (by group) ---------- */
const TREE_CARE = {
  pome: [
    { m:[6,7,8], t:'Prune while dormant on a dry day: remove dead, crossing and crowded wood and keep the centre open.' },
    { m:[8,9], t:'Spray copper (or lime sulphur) at bud movement to reduce scab and canker if you have had problems.' },
    { m:[9,10,11], t:'Feed with a general fertiliser at bud break and mulch around (not against) the trunk.' },
    { m:[11,12], t:'Thin fruitlets to one per cluster (about 10–15 cm apart) for bigger fruit and to stop biennial bearing.' },
    { m:[10,11,12,1,2], t:'Look for fire blight shoots and codling moth; bag fruit or use traps.' },
    { m:[2,3,4,5], t:'Pick when the seeds are brown and fruit comes away with a slight lift and twist; store cool and dark.' },
    { m:[4,5], t:'Rake and bin fallen leaves to lower scab next spring.' }
  ],
  stone: [
    { m:[5,6,7,8], t:'Peach and nectarine: spray copper or lime sulphur at leaf fall and again at bud swell (before flowers open) to prevent leaf curl.' },
    { m:[12,1,2,3], t:'Prune plums, cherries and apricots after harvest, in dry summer weather, to avoid silver leaf and bacterial canker.' },
    { m:[8,9,12,1,2], t:'Prune peaches and nectarines from bud swell to blossom, or straight after harvest, and cut out the fruited shoots.' },
    { m:[8,9], t:'Protect blossom on frosty nights with frost cloth, especially apricots (they flower very early).' },
    { m:[10,11], t:'Thin heavy crops so limbs don’t snap: peaches about 10–15 cm apart, plums 5–10 cm apart.' },
    { m:[11,12,1,2], t:'Net cherries and ripening fruit against birds; bin fruit with brown rot as soon as you see it.' }
  ],
  citrus: [
    { m:[8,9,10], t:'Feed with citrus fertiliser in early spring, and give a little iron and magnesium (Epsom salts) if leaves are yellow between the veins.' },
    { m:[12,3], t:'Feed citrus again (early summer and autumn), and water it in well.' },
    { m:[6,7,8], t:'Protect young and frost-tender trees (lemon, lime, orange) from frost with cloth or by moving pots to shelter.' },
    { m:[8,9,10], t:'Prune lightly after fruiting to open up the centre and remove dead wood (feijoas after fruit drop).' },
    { m:[10,11,12], t:'Check for lemon tree borer frass and scale; wire-probe borer holes.' },
    { m:[1,2,3], t:'Water deeply in summer, mulch and keep the mulch clear of the trunk; a lack of water makes fruit drop.' },
    { m:[2,3,4,5], t:'Feijoas: collect the fruit as it falls; bin any with guava moth damage.' }
  ],
  vine: [
    { m:[6,7], t:'Prune hard while dormant, leaving spurs of 2–3 buds, or canes if you train to a wire.' },
    { m:[9,10], t:'Guard new shoots from late frost and check the trellis and wires.' },
    { m:[11,12], t:'Thin shoots and bunches so the crop is light enough to ripen, and tie in growth.' },
    { m:[12,1,2], t:'Remove leaves around bunches a few weeks before ripening for airflow, and net against birds before the fruit colours.' },
    { m:[11,12,1,2,3], t:'Watch for powdery mildew, botrytis and downy mildew; open the canopy and spray if needed.' }
  ],
  orn: [
    { m:[6,7,8], t:'Roses: prune in late July to August; clear fallen leaves and spray if you have had black spot.' },
    { m:[9,10], t:'Feed roses at bud break and again after the first flush.' },
    { m:[11,12,1,2,3], t:'Deadhead spent blooms to keep them flowering.' },
    { m:[2,3], t:'Trim lavender lightly after flowering (never into old wood), and divide overcrowded agapanthus clumps in autumn.' },
    { m:[5,6,7], t:'Hydrangeas: leave old flower heads as frost protection until spring, then prune above the first fat buds.' }
  ]
};

/* self-fertility: strong = crops poorly on its own; the species to pair with */
const POLLINATION = {
  gala:{ sp:'apple', need:1 }, braeburn:{ sp:'apple', need:1 }, fuji:{ sp:'apple', need:1 }, granny:{ sp:'apple', need:1 }, cox:{ sp:'apple', need:2 },
  williams:{ sp:'pear', need:1 }, packham:{ sp:'pear', need:1 }, bosc:{ sp:'pear', need:1 }, nashi:{ sp:'nashi', need:1 },
  cherry:{ sp:'cherry', need:2 }, 'plum-late':{ sp:'plum', need:2 }, 'plum-early':{ sp:'plum', need:1 },
  'feijoa-apollo':{ sp:'feijoa', need:1 }, 'feijoa-kakapo':{ sp:'feijoa', need:2 }
};

/* ---------- harvest, storage and seed saving ---------- */
const GUIDE = {
  tomato:{ h:'Pick when fully coloured but still firm. Ripening slows below about 13 °C and above 30 °C; at the end of the season pick green fruit and ripen indoors.', s:'Keep at room temperature, since the fridge dulls flavour. Freeze whole, or cook a glut into passata or sauce.', sd:'Easy from open-pollinated (not F1) varieties: ferment the seeds and pulp for 2–3 days, rinse and dry.' },
  cherry:{ h:'Pick when fully coloured; fruit ripens all along the truss over weeks.', s:'Room temperature for a few days, or dry or freeze for winter.', sd:'Easy from open-pollinated varieties.' },
  tomatodet:{ h:'The whole crop ripens within 3–4 weeks. Pick when deep red.', s:'Cook or bottle a glut into sauce; freeze whole for winter.', sd:'Easy from open-pollinated varieties.' },
  paste:{ h:'Pick when fully red and firm; most of the crop comes in a few weeks.', s:'Ideal for sauce, drying and bottling.', sd:'Easy from open-pollinated varieties.' },
  capsicum:{ h:'Pick green, or leave to colour to red or yellow for a sweeter fruit. Cut with secateurs.', s:'Fridge for 1–2 weeks; slice and freeze.', sd:'Possible, but hot chillies and sweet capsicums cross, so isolate varieties.' },
  chilli:{ h:'Pick when fully coloured for the most heat; wear gloves.', s:'Dry, freeze whole or ferment as hot sauce.', sd:'Easy, but different varieties cross-pollinate.' },
  eggplant:{ h:'Pick when the skin is glossy and springs back when pressed; dull, soft ones are overripe and bitter.', s:'Use within a week; don’t refrigerate for long.', sd:'Possible from open-pollinated varieties.' },
  zucchini:{ h:'Pick at 15–20 cm every 2–3 days; big ones slow new fruit.', s:'Fridge for a week; grate and freeze for winter baking.', sd:'They cross with other Cucurbita pepo (including some pumpkins); hand-pollinate and bag flowers to save true seed.' },
  cucumber:{ h:'Pick regularly while glossy and firm; yellow fruit is overripe and bitter.', s:'Fridge for about a week; pickle a glut.', sd:'Possible; let a fruit go yellow and soft before extracting seed.' },
  pumpkin:{ h:'Ripe when the skin is hard (a fingernail won’t mark it) and the stalk is dry and corky. Cut with a long stalk before frost.', s:'Cure in the sun for 1–2 weeks, then store cool and dry; butternut keeps about 3–6 months.', sd:'Cross-pollinates within the species; separate or hand-pollinate to keep it true.' },
  rockmelon:{ h:'Ripe when the stem slips easily from the fruit and it smells sweet.', s:'Eat within a few days; chill before serving.', sd:'Possible; keep varieties apart.' },
  watermelon:{ h:'Ready when the tendril nearest the fruit is dry and brown, the ground spot turns creamy yellow, and it sounds hollow when tapped.', s:'Keep cool and eat within a week or two.', sd:'Easy from open-pollinated varieties.' },
  corn:{ h:'Ready when the silks are brown and dry and a kernel squirts milky juice. Sugar turns to starch quickly, so cook or chill within hours.', s:'Eat fresh; blanch and freeze the cobs.', sd:'Corn is wind-pollinated and crosses with other corn, including popcorn and farm maize. Isolate by 200 m or more, or grow only one type; hybrid varieties won’t come true.' },
  popcorn:{ h:'Leave the cobs on the plant until the husks are brown and papery, then hang in a dry airy place until the kernels are hard (about 2–3 weeks).', s:'Rub off the kernels and keep in airtight jars; moisture of about 13–14% pops best.', sd:'Isolate from sweetcorn and other corn by 200 m or more; hybrid varieties won’t come true. Keep kernels from the best cobs.' },
  dbean:{ h:'Pick when pods are firm and snap crisply, every 2–3 days, to keep the plant cropping.', s:'Fridge for 5 days; blanch and freeze.', sd:'Easy: leave pods on the plant to dry, then shell and store.' },
  cbean:{ h:'Pick young and often; the plant stops when it sets seed.', s:'Fridge for 5 days; blanch and freeze.', sd:'Easy: leave pods on the plant to dry.' },
  peas:{ h:'Pick when pods are plump and bright green; sweetness turns to starch fast.', s:'Eat or freeze the same day.', sd:'Easy: leave pods to dry on the plant.' },
  broadbean:{ h:'Pick when beans are the size of a thumbnail. Pinch out the growing tip when flowers open to deter aphids.', s:'Blanch and freeze.', sd:'Easy: leave pods to dry on the plant.' },
  edamame:{ h:'Pick when pods are plump and green; boil in the pod.', s:'Blanch and freeze in pods.', sd:'Easy; dry on the plant.' },
  lettuce:{ h:'Cut whole heads in the morning, or pick outer leaves regularly. A rising centre means it is bolting.', s:'Fridge in a bag for up to a week.', sd:'Easy: let one plant bolt and collect the seed.' },
  spinach:{ h:'Pick outer leaves regularly; pull whole plants when they bolt.', s:'Fridge for a few days; blanch and freeze.', sd:'Possible; needs separate male and female plants.' },
  silverbeet:{ h:'Pick outer leaves and leave the centre to keep growing.', s:'Fridge for a few days; blanch and freeze.', sd:'Cross-pollinates with beetroot; save only one type.' },
  broccoli:{ h:'Cut the main head while the buds are tight, then side shoots keep coming for weeks.', s:'Fridge for a week; blanch and freeze.', sd:'Crosses with other brassicas; needs two years and space.' },
  cabbage:{ h:'Cut when the head is firm; leave the stump for a second flush of small heads.', s:'Whole heads keep several weeks in a cool place.', sd:'Two years and space; crosses with other brassicas.' },
  cauli:{ h:'Cut when the curd is firm and creamy; fold leaves over it on sunny days to keep it white.', s:'Fridge for a week.', sd:'Two years and space.' },
  kale:{ h:'Pick lower leaves and leave the growing tip. It is sweeter after frost.', s:'Fridge for a week; freezes well.', sd:'Two years; crosses with other brassicas.' },
  sprouts:{ h:'Pick from the bottom up as the buttons firm; nip out the top in late season.', s:'Keep on the stalk in a cool place, or freeze.', sd:'Two years and space.' },
  carrot:{ h:'Lift when the shoulders are 2 cm across. Roots keep well in the ground through winter in mild areas; mulch in frost.', s:'Twist off tops; store in damp sand or the fridge for months.', sd:'Biennial; crosses with wild carrot (Queen Anne’s lace).' },
  beetroot:{ h:'Pull at tennis-ball size; twist off leaves 3 cm above the root.', s:'Fridge for weeks; pickle or freeze cooked.', sd:'Biennial; crosses with silverbeet.' },
  parsnip:{ h:'Sweeter after a frost; lift from autumn through to spring.', s:'Store in damp sand or the fridge.', sd:'Biennial; seed must be fresh.' },
  potato:{ h:'New potatoes when the flowers open (about 10–12 weeks); main crop when the tops die back. Wait a week, lift on a dry day and let the skins dry.', s:'Store in the dark, cool and dry. Light turns them green and toxic.', sd:'Keep only disease-free tubers as seed for next season, or buy certified seed.' },
  kumara:{ h:'Lift before the first frost (Apr–May), handle gently, and cure in a warm place for about a week.', s:'Store at about 13–15 °C. Cold ruins them.', sd:'Grow next year’s slips from sprouted tubers.' },
  garlic:{ h:'Harvest when the lower third to half of the leaves are brown, usually around Christmas. Cure 3–4 weeks in an airy shade.', s:'Store cool and dry, in plaits or nets.', sd:'Replant your biggest cloves each year, only from clean plants free of rust or white rot.' },
  onion:{ h:'Lift when the tops fall over and the necks soften; dry in the sun for a week.', s:'Hang or store in a net in a dry, airy place.', sd:'Biennial.' },
  leek:{ h:'Lift as needed from autumn to spring.', s:'Keep in the ground until needed.', sd:'Biennial.' },
  springon:{ h:'Pull when about 20 cm tall.', s:'Fridge for a week.', sd:'Easy; let a plant flower.' },
  basil:{ h:'Pinch out flower buds and pick from the top down. Cold below about 10 °C blackens it.', s:'Freeze in oil or make pesto; don’t refrigerate whole leaves.', sd:'Easy.' },
  coriander:{ h:'Cut leaves early; it bolts fast in heat, so sow small batches. The seeds (coriander) are edible.', s:'Fridge in water; freeze chopped.', sd:'Easy; let it flower and dry.' },
  parsley:{ h:'Cut outer stems regularly.', s:'Freeze chopped.', sd:'Biennial.' },
  daikon:{ h:'Pull at 30–40 cm long, before roots turn woody or hollow; sow in autumn for best texture.', s:'Fridge for a couple of weeks; pickle or ferment.', sd:'Bolts in its first year if sown in spring, or overwinters if sown in autumn. Crosses with radish.' },
  wasabi:{ h:'Rhizomes are ready after about 18–24 months. Leaves and stems can be picked earlier. Grate fresh.', s:'Wrapped damp in the fridge for a few weeks; the flavour fades fast after grating.', sd:'Propagate from side offsets, which is faster and reliable.' },
  strawberry:{ h:'Pick fully red; check daily in warm weather, and net against birds.', s:'Eat within a day or two; freeze or make jam.', sd:'Grow new plants from runners; replace plants every 3 years.' },
  sunflower:{ h:'For cut flowers pick as the petals start to unfurl. For seed, leave heads until the backs turn brown.', s:'Dry seed heads in a dry, airy place.', sd:'Easy; keep the best heads.' },
  dahlia:{ h:'Cut when blooms are two-thirds to fully open. Lift tubers after frost blackens the foliage where winters are cold, and store them in a barely damp medium.', s:'Store tubers in barely damp peat or sawdust, in the cool and frost-free.', sd:'Tubers can be divided each year; seed varies.' },
  sweetpea:{ h:'Pick often to keep them flowering, since seed pods stop flower production.', s:'Cut stems last a week in water.', sd:'Easy. Seeds are not edible.' }
};
const GUIDE_GROUP = {
  fruit:{ h:'Pick ripe fruit regularly to keep the plants cropping.', s:'Use soon after picking.', sd:'Save from your best open-pollinated plants.' },
  vine:{ h:'Pick young and regularly.', s:'Best eaten fresh, or preserved.', sd:'Cross-pollinates within the species.' },
  legu:{ h:'Pick young and often.', s:'Blanch and freeze.', sd:'Easy: dry pods on the plant.' },
  leaf:{ h:'Cut outer leaves, or whole heads in the morning.', s:'Keep in a bag in the fridge.', sd:'Let one plant bolt.' },
  bras:{ h:'Cut when firm; side shoots follow.', s:'Fridge for a week.', sd:'Radish, rocket, mizuna and bok choy set seed in their first year; cabbage, kale and sprouts need two. All cross with related brassicas.' },
  root:{ h:'Lift when a good size and use before they go woody.', s:'Store cool and damp.', sd:'Often a two-year crop.' },
  alli:{ h:'Harvest when tops fall over and dry.', s:'Cure and store dry.', sd:'Biennial or replant bulbs.' },
  herb:{ h:'Pick little and often.', s:'Dry or freeze.', sd:'Let a few plants flower and self-seed.' },
  flow:{ h:'Cut in the cool of the morning, and put stems in water straight away.', s:'Vase life is about a week.', sd:'Save from your best plants; F1 hybrids don’t come true.' }
};
