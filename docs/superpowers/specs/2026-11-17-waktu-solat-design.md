# Waktu Solat — Design

Date: 2026-11-17 · Status: awaiting approval

## Intent

A Malaysian prayer-times app that works well on phone and desktop, using the
official JAKIM times from e-solat.gov.my. Its job is to answer "what are today's
times, and how long until the next one?" at a glance.

## Goals

- Show today's times (Imsak, Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak) for a chosen JAKIM zone.
- Live countdown to the next prayer; highlight the next prayer in the list.
- Gregorian + Hijri date.
- Zone picker (all JAKIM zones, grouped by state); remembered between visits.
- English only (changed 2026-11-17 at user's request; originally BM/EN switchable).
- Time format switchable between 24-hour and 12-hour; choice remembered.
- Monthly timetable view for the selected zone.
- Installable to the home screen (PWA); works offline for the cached month.
- Responsive: single column on phone; centred card + monthly table side by side on desktop.

## Non-goals

- Alerts, notifications, azan sound (explicitly ruled out).
- Qibla compass, user accounts, settings beyond zone and time format.
- Calculating times ourselves — JAKIM data only.

## Anti-goals

- Showing times that are wrong for the zone or date (e.g. stale cache from last month, wrong timezone). Times must always be JAKIM's for the shown date, interpreted in Malaysia time (UTC+8) regardless of the device's timezone.

## Constraints

- Data source: `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=<ZONE>`
  returns JSON with `prayerTime[]` entries (`date`, `hijri`, `imsak`, `fajr`, `syuruk`, `dhuhr`, `asr`, `maghrib`, `isha`, …).
  Verified it sends `Access-Control-Allow-Origin: *`, so the browser can call it directly.
- No backend; static hosting only.

## Approaches considered

1. **Plain installable website (HTML/CSS/vanilla JS, no build) — chosen.** Simplest, free static hosting, minimal maintenance. Risk: if e-solat drops CORS, a relay must be added later.
2. React + Vite — same result, adds a build step and dependencies; only worthwhile for a much larger app.
3. Website + relay server — more resilient to feed changes, but requires hosting and maintaining a server. Overkill now.

## Design

- **Files:** `index.html`, `styles.css`, `app.js`, `zones.js` (zone list), `i18n.js` (English strings, Hijri month names), `manifest.webmanifest`, `sw.js`, icons.
- **Data flow:** on load, read zone (default WLY01) and time format (default 24h) from localStorage. Use cached month for that zone if it covers today; otherwise fetch `period=month`, store it, render. If offline and no cache, show a clear message.
- **Countdown:** ticks every second; after Isyak, counts down to the next day's Subuh (from cached month, or fetched).
- **Service worker:** caches the app shell; API responses cached via localStorage as above.
- **Theme:** follows system light/dark.

## Calls I made (correct any)

- Default zone WLY01 (KL/Putrajaya). Colours: kept the original green after comparing 4 alternatives.
- Time format switchable between 24-hour and 12-hour (am/pm); default 24-hour; choice remembered.
- No "use my location" zone detection in v1 — manual picker only.
- Dhuha is not shown (not in the agreed list); easy to add.

## Left to the builder

- Visual styling details, icon design, exact layout breakpoints.
- Zone list sourced from JAKIM's published zone codes.
