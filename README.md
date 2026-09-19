# Total Garden Planner 4000

A weather-aware vegetable garden planner for New Zealand. Pick your place, garden size and crops and it gives you a planting calendar, a bed layout, a shopping list and a progress tracker. Dates move with your local climate, the NIWA seasonal outlook and the live forecast.

It's a static site: no server, no build step, no API keys. Everything runs in the browser.

## Put it on GitHub Pages

1. Create a new repository (for example `garden-planner`).
2. Upload everything in this folder except `src/` if you like (`index.html`, `outlook.json`, `manifest.webmanifest`, `icon.svg`, `.nojekyll`). Uploading `src/` too is harmless and keeps the editable source with it.
3. In the repo go to **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute it's live at `https://<your-username>.github.io/<repo-name>/`.
5. On a phone, open that link and use **Share → Add to Home Screen** for an app-style icon.

Plans and tracker progress are saved in each browser (localStorage), so they don't sync between devices.

## How the weather adjustment works

Each crop has a base temperature and a "thermal time" requirement (growing degree-days). The planner builds a daily temperature curve for your spot and runs every crop through it, so warmer weather brings harvest dates forward, and a longer warm season can fit an extra round. That is how it decides whether a second round of beans or zucchini fits before autumn.

The temperature curve is built from three layers:

- **Your local climate.** Ten years of daily temperatures for your exact coordinates (Open-Meteo historical data), including last and first frost dates. If the call fails it falls back to a built-in table for 25 NZ regions.
- **The seasonal outlook.** The NIWA outlook for your region is converted to a temperature shift by season. The Sep–Nov 2026 outlook (issued 2 Sep 2026, very strong El Niño) is built in.
- **The live weather.** The last 30 days of real temperatures, the 16-day forecast, and today's soil temperature. You can override soil temperature with your own probe reading. The planner blends these into the seasonal curve for the next few weeks.

You can add your own nudge (−2 to +2 °C), choose a normal-year / El Niño / La Niña pattern, and add cloches or a greenhouse.

The **Data sources** panel (sidebar → Weather) shows which of these loaded live and which fell back to built-in data.

## Keeping the seasonal outlook current

NIWA / Earth Sciences NZ publishes a new outlook about monthly. To update it, edit **`outlook.json`** in the repo (the pencil icon on GitHub) and change:

- `updated`, `title`, `enso`, `notes`.
- For each group, `t` (temperature shift in °C by season: `spr`, `sum`, `aut`, `win`) and `r` (rainfall index, −1 dry to +1 wet). Roughly: "50% chance above average" is about +0.5 °C, "near average" is 0, "50% chance below" is about −0.5 °C.

The page shows a warning once the outlook is over 100 days old. The summer and autumn values in the current file are an El Niño-pattern assumption, not published NIWA numbers, so replace them when NIWA issues the Dec–Feb outlook.

## Editing the crop data

All crop rules are in `src/data.js`: base temperature, days to harvest, spacing, frost buffer and so on. After editing, run `cd src && python3 build.py` to regenerate `index.html` (needs Python 3 and Node), or edit the same array inside `index.html` directly.

## Limits worth knowing

- The model is a guide, not a guarantee. Regional numbers and crop timings are typical values and worth tuning against your own experience. Always check the 7-day forecast before planting out tender seedlings.
- Frost dates from reanalysis data smooth out local frost hollows. If you're in a cold pocket, add a cool nudge or use the protection setting.
- Open-Meteo is free for non-commercial use with attribution (already in the page). If this ever becomes a commercial product, check their terms.

## Credits

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0). Seasonal outlook from [NIWA / Earth Sciences NZ](https://niwa.co.nz/climate-and-weather/seasonal-climate-outlook).
