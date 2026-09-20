# Total Garden Planner 4000

A weather-aware garden planner for New Zealand: vegetables, herbs, flowers, pots, fruit trees and grape vines. Set up one or more gardens, draw them (or trace a photo), pick what you grow, and it gives you planting dates, a layout, a shopping list, a care schedule and harvest expectations. Dates move with your local climate, the seasonal outlook and the live forecast.

It's a static site: no server, no build step, no API keys. Everything runs in the browser.

## Put it on GitHub Pages

1. Create a new repository (for example `garden-planner`), or reuse the one you already have.
2. Upload `index.html`, `outlook.json`, `manifest.webmanifest`, `icon.svg` and `.nojekyll`. Uploading `src/` as well is harmless and keeps the editable source with it.
3. In the repo go to **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute it's live at `https://<your-username>.github.io/<repo-name>/`.
5. On a phone, open that link and use **Share → Add to Home Screen** for an app-style icon.

Gardens are saved in each browser (localStorage), so they don't sync between devices by themselves. Use the share features below to move or share them. If you're replacing an older version of this planner, your existing garden migrates automatically the first time you open the new page.

## What's in it

- **Multiple gardens.** Front bed, back yard, glasshouse, Christchurch: each is its own garden with its own place, plots, crops and notes. Switch from the bar at the top.
- **Sharing.** From the garden menu you can copy a share link (the whole garden packed into the URL, no server involved), export a `.json` file, or import one. Importing never overwrites anything of yours. Care logs and progress stay with you and aren't shared.
- **Site plan.** Draw beds, borders and pots on a scaled plan, drag and resize them, or load a photo of your yard, set the scale with one known distance and trace over it. Each area can be tagged as open sun, part shade or shade, and as open ground, under a cloche or under glass. The planner uses those tags to shift dates and pick suitable crops. Pots have a count and a size in litres, and the planner works out what fits in each.
- **Crops.** 66 built in (vegetables, herbs, flowers), including daikon, wasabi, popcorn, watermelon, determinate and indeterminate tomatoes, and a green manure. Every crop shows when to start seed indoors versus sow direct versus plant seedlings.
- **Your own crops.** In **Crops**, choose *Add a crop* and fill in days to maturity, temperature needs, spacing and so on. The preview shows your dates straight away. You can also tweak a built-in crop (your change is stored as an override, and you can reset it).
- **Care.** Feeding and watering schedules per plant, with weather-adjusted watering advice and a log. Soil amendment suggestions before and after each crop.
- **Trees and vines.** 33 perennials: apples, pears, stone fruit, figs, citrus, feijoas, grape varieties, plus roses, lavender, hydrangea and agapanthus. Expected flowering and harvest dates come from this season's temperatures so far and the seasonal outlook, with a stage timeline for each. You can enter your own observed dates to calibrate.
- **Notes.** A notes box on every planting and tree, to refer back to next year.
- **Flowers.** Treated like any other crop: succession sowing, cut-flower seasons, pots, notes.

## How the weather adjustment works

Each crop has a base temperature and a thermal-time requirement (growing degree-days). The planner builds a daily temperature curve for your spot and runs every crop through it, so warmer weather brings harvest dates forward, and a longer warm season can fit a second round. That is how it decides whether a second round of beans or zucchini fits before autumn.

The temperature curve is built from three layers:

- **Your local climate.** Ten years of daily temperatures for your exact coordinates (Open-Meteo historical data), including last and first frost dates. If the call fails it falls back to a built-in table for 25 NZ regions.
- **The seasonal outlook.** The regional outlook is converted to a temperature shift by season. The Sep–Nov 2026 outlook (issued 2 Sep 2026, very strong El Niño) is built in.
- **The live weather.** This season's real temperatures so far, the 16-day forecast and today's soil temperature. You can override soil temperature with your own probe reading.

Every area gets its own variant of the curve: glass and cloches run warmer, shade runs cooler.

Fruit and vine dates start counting warmth from 1 August, are calibrated against reference-town dates, and are damped so one hot week doesn't swing them wildly. Citrus uses a different rule (a shift from typical dates based on how warm the season has been) because it ripens over many months. These are estimates of typical timing, useful for "roughly when", not a forecast to the day.

The **Data sources** panel shows which of these loaded live and which fell back to built-in data.

## Keeping the seasonal outlook current

NIWA / Earth Sciences NZ publishes a new outlook about monthly. To update it, edit **`outlook.json`** in the repo (the pencil icon on GitHub) and change:

- `updated`, `title`, `enso`, `notes`.
- For each group, `t` (temperature shift in °C by season: `spr`, `sum`, `aut`, `win`) and `r` (rainfall index, −1 dry to +1 wet). Roughly: "50% chance above average" is about +0.5 °C, "near average" is 0, "50% chance below" is about −0.5 °C.

The page shows a warning once the outlook is over 100 days old. The summer and autumn values in the current file are an El Niño-pattern assumption, not published NIWA numbers, so replace them when NIWA issues the Dec–Feb outlook.

## Editing the built-in data

Crop rules are in `src/data.js` and `src/data_v2.js`: base temperature, days to harvest, spacing, frost buffer and so on. Perennials (trees, vines, shrubs) are in `src/data_v2.js`. After editing, run `cd src && python3 build.py` (needs Python 3 and Node). It writes `src/dist/index.html` and `src/dist/outlook.json`; copy those over the ones in the repo root.

## Limits worth knowing

- The model is a guide, not a guarantee. Regional numbers, crop timings and the fruit and vine reference dates are typical values, worth tuning against your own experience (that's what the notes and the calibration inputs are for). Always check the 7-day forecast before planting out tender seedlings.
- The live weather calls were tested against mocked responses in a sandbox that couldn't reach Open-Meteo. If a source fails on your device, the Data sources panel says which, and the planner carries on with built-in data.
- Frost dates from reanalysis data smooth out local frost hollows. If you're in a cold pocket, tag the area as shade or add a cool nudge.
- Photos you trace over are stored in the browser. They're included in exported `.json` files but not in share links, to keep the links short.
- Open-Meteo is free for non-commercial use with attribution (already in the page). If this ever becomes a commercial product, check their terms.

## Credits

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0). Seasonal outlook from [NIWA / Earth Sciences NZ](https://niwa.co.nz/climate-and-weather/seasonal-climate-outlook).
