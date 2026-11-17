# Waktu Solat

Malaysian prayer times (JAKIM, from [e-solat.gov.my](https://www.e-solat.gov.my)) for phone and desktop.
Pick your zone, see today's times with a countdown to the next prayer, and the monthly timetable.
Times switch between 24-hour and 12-hour.
It can be installed to the home screen and works offline for months already loaded.

Plain HTML/CSS/JavaScript with no build step and no dependencies. Fonts (Lora, Raleway) are bundled in `fonts/` under the SIL Open Font License.

## Run locally

```sh
python -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` directly from disk won't work, because ES modules and the service worker need http.)

## Tests

```sh
npm test                      # unit tests (Node 20+)
node scripts/check-zones.js   # checks every zone code against the live e-solat API
```

## Deploy

Upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages). Leave out `docs/`, `tests/` and `scripts/` if you like. HTTPS is needed for installing and offline mode.

When you change any app file, bump `CACHE` in `sw.js` (e.g. `ws-shell-v2`) so returning visitors drop the old cached copy.

## How it works

- `js/data.js` asks e-solat for a whole month per zone and saves it in the browser (`localStorage`), so each zone-month is fetched once.
- All time maths is done in Malaysia time (UTC+8), whatever timezone the device is set to.
- `sw.js` caches the app files so it opens without a connection.
