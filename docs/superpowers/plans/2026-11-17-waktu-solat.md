# Waktu Solat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable, responsive website showing JAKIM prayer times for a chosen Malaysian zone, with a countdown, monthly table, and switchable language and time format.

**Architecture:** Static site, vanilla ES modules, no build step. Pure logic (`time.js`, `i18n.js`, `data.js`, `settings.js`) is unit-tested with `node --test`; `app.js` wires the DOM. The browser fetches e-solat directly and caches each zone-month in localStorage; a service worker caches the app shell.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), Node 26 `node:test` for tests (no npm dependencies), Python `http.server` for local serving.

**Spec:** `docs/superpowers/specs/2026-11-17-waktu-solat-design.md`

## Global Constraints

- No runtime or dev npm dependencies. `package.json` exists only for `"type": "module"` and `"scripts": {"test": "node --test"}`.
- Data source: `POST https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=duration&zone=<ZONE>` with form body `datestart=YYYY-MM-DD&dateend=YYYY-MM-DD` (send as `URLSearchParams` so it is a CORS "simple" request — the server returns 500 to preflight `OPTIONS`). Response: `{status:"OK!", prayerTime:[{hijri:"1448-06-07", date:"17-Nov-2026", imsak:"05:39:00", fajr, syuruk, dhuhr, asr, maghrib, isha, ...}]}`.
- `date` uses **Malay** month abbreviations: Jan Feb Mac Apr Mei Jun Jul Ogos Sep Okt Nov Dis (accept English Mar/May/Aug/Oct/Dec too).
- All time math is in Malaysia time, UTC+8, no DST, independent of the device timezone.
- Defaults: language `ms`, zone `WLY01`, time format `24`. All three persisted in localStorage; every storage access wrapped in try/catch (app must work with storage unavailable).
- Labels — ms: Imsak, Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak. en: Imsak, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha.
- Countdown targets only the five prayers (subuh, zohor, asar, maghrib, isyak) — imsak and syuruk are listed but never "next". (Builder's call, noted for user.)
- 12-hour format: `h:mm AM` / `h:mm PM` in both languages (e.g. `1:01 PM`, `12:05 AM`).
- No alerts/notifications, no Dhuha, no geolocation.

## Review Focus

1. **Device clock in another timezone** (e.g. traveller's laptop on UTC): today's date, next prayer and countdown must still be Malaysia-time correct. → Task 1 test `nextPrayer uses MYT regardless of host TZ`.
2. **After Isyak on the last day of a month**: countdown must target the 1st's Subuh from next month's data. → Task 3 test `loadDays fetches next month for tomorrow on month end`.
3. **App left open past midnight / phone resumed next day**: date, list and countdown must roll over without reload. → Task 4 step (tick detects ymd change and on `visibilitychange`).
4. **Offline with no cache, or e-solat down/returns non-OK**: show a clear error message, not a blank or stale page. → Task 3 tests `loadMonth throws on non-OK status` and `loadMonth uses cache when offline`.
5. **localStorage unavailable or containing junk JSON**: app runs on defaults. → Task 3 test `loadSettings falls back on throwing/corrupt storage`.

---

### Task 1: Project setup and time logic

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules/`), `js/time.js`
- Test: `tests/time.test.js`

**Interfaces:**
- Produces (`js/time.js`):
  - `type Day = { ymd: "YYYY-MM-DD", hijri: "YYYY-MM-DD", times: { imsak, subuh, syuruk, zohor, asar, maghrib, isyak: "HH:MM" } }`
  - `PRAYER_KEYS = ["imsak","subuh","syuruk","zohor","asar","maghrib","isyak"]`
  - `COUNTDOWN_KEYS = ["subuh","zohor","asar","maghrib","isyak"]`
  - `parseDays(json) -> Day[]` — maps `fajr→subuh, dhuhr→zohor, asr→asar, isha→isyak`, strips seconds, converts `date` to `ymd`. Throws `Error("bad-response")` if `json.status !== "OK!"` or `prayerTime` isn't an array.
  - `myt(nowMs = Date.now()) -> { ymd: "YYYY-MM-DD", year, month (1-12), day }`
  - `addDays(ymd, n) -> ymd`
  - `toEpoch(ymd, "HH:MM") -> number` (ms; Malaysia wall time → UTC epoch)
  - `nextPrayer(today: Day, tomorrow: Day|null, nowMs) -> { key, at: number, isTomorrow: bool } | null`
  - `formatTime("HH:MM", "24"|"12") -> string`
  - `formatCountdown(ms) -> "HH:MM:SS"` (clamps negatives to `00:00:00`)

- [ ] **Step 1:** `git init`; create `package.json` `{"name":"waktu-solat","private":true,"type":"module","scripts":{"test":"node --test"}}` and `.gitignore`.
- [ ] **Step 2: Write failing tests** in `tests/time.test.js`:
  - `parseDays maps fields`: input with one entry `{hijri:"1448-06-07",date:"17-Nov-2026",imsak:"05:39:00",fajr:"05:49:00",syuruk:"06:58:00",dhuhr:"13:01:00",asr:"16:23:00",maghrib:"18:59:00",isha:"20:12:00"}` → `[{ymd:"2026-11-17",hijri:"1448-06-07",times:{imsak:"05:39",subuh:"05:49",syuruk:"06:58",zohor:"13:01",asar:"16:23",maghrib:"18:59",isyak:"20:12"}}]`.
  - `parseDays handles Malay months`: `"01-Dis-2026"→"2026-12-01"`, `"05-Ogos-2026"→"2026-08-05"`, `"09-Mac-2026"→"2026-03-09"`, `"10-Mei-2026"→"2026-05-10"`, `"11-Okt-2026"→"2026-10-11"`.
  - `parseDays throws on non-OK`: `{status:"NO_RECORD!"}` throws `/bad-response/`.
  - `myt crosses midnight`: `myt(Date.UTC(2026,10,17,16,30))` → `ymd "2026-11-18"`; `myt(Date.UTC(2026,10,17,15,59))` → `"2026-11-17"`.
  - `addDays crosses month/year`: `addDays("2026-11-30",1)==="2026-12-01"`, `addDays("2026-12-31",1)==="2027-01-01"`.
  - `toEpoch`: `toEpoch("2026-11-17","13:01") === Date.UTC(2026,10,17,5,1)`.
  - `nextPrayer picks next of five`: with the 17 Nov day, now = `toEpoch("2026-11-17","06:00")` → `{key:"zohor", isTomorrow:false}` (syuruk skipped); now = `13:01` exactly → `asar` (a prayer whose time has arrived is no longer "next").
  - `nextPrayer after isyak uses tomorrow`: now `20:30` with tomorrow day → `{key:"subuh", isTomorrow:true, at: toEpoch(tomorrow.ymd, tomorrow.times.subuh)}`; with tomorrow `null` → `null`.
  - `nextPrayer uses MYT regardless of host TZ`: separate file `tests/time-tz.test.js` whose first statement is `process.env.TZ = "America/New_York"`, then `await import("../js/time.js")`; assert `myt(Date.UTC(2026,10,17,16,30)).ymd === "2026-11-18"` and the 06:00 case still returns `zohor`.
  - `formatTime`: `("13:01","24")→"13:01"`, `("13:01","12")→"1:01 PM"`, `("00:05","12")→"12:05 AM"`, `("12:00","12")→"12:00 PM"`, `("05:49","12")→"5:49 AM"`.
  - `formatCountdown`: `4325000→"01:12:05"`, `-5→"00:00:00"`, `90061000→"25:01:01"`.
- [ ] **Step 3:** Run `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `js/time.js`. Use only `Date.UTC` and `getUTC*` on `new Date(ms + 8*3600e3)`; never local-time getters.
- [ ] **Step 5:** Run `npm test` → all PASS.
- [ ] **Step 6:** Commit `feat: time parsing and next-prayer logic`.

### Task 2: Zones and translations

**Files:**
- Create: `js/zones.js`, `js/i18n.js`, `scripts/check-zones.js`
- Test: `tests/i18n.test.js`, `tests/zones.test.js`

**Interfaces:**
- Produces (`js/zones.js`): `ZONES: Array<{ code, state, name }>`; `STATES` order: Johor, Kedah, Kelantan, Melaka, Negeri Sembilan, Pahang, Perak, Perlis, Pulau Pinang, Sabah, Sarawak, Selangor, Terengganu, Wilayah Persekutuan. `findZone(code) -> zone|undefined`.
- Produces (`js/i18n.js`):
  - `t(lang: "ms"|"en", key) -> string` — keys: every `PRAYER_KEYS` entry, plus `next` ("Seterusnya"/"Next"), `in` ("dalam"/"in"), `zone` ("Zon"/"Zone"), `today` ("Hari ini"/"Today"), `month` ("Jadual Bulanan"/"Monthly Timetable"), `date` ("Tarikh"/"Date"), `loading` ("Memuatkan…"/"Loading…"), `error` ("Tidak dapat memuatkan waktu solat. Semak sambungan internet anda."/"Couldn't load prayer times. Check your internet connection."), `retry` ("Cuba lagi"/"Retry"), `tomorrow` ("esok"/"tomorrow").
  - `formatGregorian(ymd, lang) -> string` — `"2026-11-17","ms"` → `"Selasa, 17 November 2026"`; `"en"` → `"Tuesday, 17 November 2026"`. Hardcoded day/month names (ms days: Ahad Isnin Selasa Rabu Khamis Jumaat Sabtu; ms months: Januari Februari Mac April Mei Jun Julai Ogos September Oktober November Disember). Do not use `Intl` (ICU output varies).
  - `formatHijri(hijri, lang)` — `"1448-06-07","ms"` → `"7 Jamadilakhir 1448H"`; `"en"` → `"7 Jumada al-Akhirah 1448 AH"`. ms months: Muharram, Safar, Rabiulawal, Rabiulakhir, Jamadilawal, Jamadilakhir, Rejab, Syaaban, Ramadan, Syawal, Zulkaedah, Zulhijjah. en: Muharram, Safar, Rabi' al-Awwal, Rabi' al-Thani, Jumada al-Ula, Jumada al-Akhirah, Rajab, Sha'ban, Ramadan, Shawwal, Dhu al-Qa'dah, Dhu al-Hijjah.

Zone list (code — name), grouped by state:

```
Johor: JHR01 Pulau Aur dan Pulau Pemanggil; JHR02 Johor Bahru, Kota Tinggi, Mersing, Kulai; JHR03 Kluang, Pontian; JHR04 Batu Pahat, Muar, Segamat, Gemas Johor, Tangkak
Kedah: KDH01 Kota Setar, Kubang Pasu, Pokok Sena; KDH02 Kuala Muda, Yan, Pendang; KDH03 Padang Terap, Sik; KDH04 Baling; KDH05 Bandar Baharu, Kulim; KDH06 Langkawi; KDH07 Puncak Gunung Jerai
Kelantan: KTN01 Bachok, Kota Bharu, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat, Kuala Krai, Mukim Chiku; KTN02 Gua Musang, Jeli, Jajahan Kecil Lojing
Melaka: MLK01 Seluruh Negeri Melaka
Negeri Sembilan: NGS01 Tampin, Jempol; NGS02 Jelebu, Kuala Pilah, Rembau; NGS03 Port Dickson, Seremban
Pahang: PHG01 Pulau Tioman; PHG02 Kuantan, Pekan, Muadzam Shah; PHG03 Jerantut, Temerloh, Maran, Bera, Chenor, Jengka; PHG04 Bentong, Lipis, Raub; PHG05 Genting Sempah, Janda Baik, Bukit Tinggi; PHG06 Cameron Highlands, Genting Highlands, Bukit Fraser; PHG07 Rompin, Endau, Pontian
Perak: PRK01 Tapah, Slim River, Tanjung Malim; PRK02 Kuala Kangsar, Sg. Siput, Ipoh, Batu Gajah, Kampar; PRK03 Lenggong, Pengkalan Hulu, Grik; PRK04 Temengor, Belum; PRK05 Kg Gajah, Teluk Intan, Bagan Datuk, Seri Iskandar, Beruas, Parit, Lumut, Sitiawan, Pulau Pangkor; PRK06 Selama, Taiping, Bagan Serai, Parit Buntar; PRK07 Bukit Larut
Perlis: PLS01 Kangar, Padang Besar, Arau
Pulau Pinang: PNG01 Seluruh Negeri Pulau Pinang
Sabah: SBH01 Sandakan (Timur), Bukit Garam, Semawang, Temanggong, Tambisan, Sukau; SBH02 Beluran, Telupid, Pinangah, Terusan, Kuamut, Sandakan (Barat); SBH03 Lahad Datu, Silabukan, Kunak, Sahabat, Semporna, Tungku, Tawau (Timur); SBH04 Bandar Tawau, Balong, Merotai, Kalabakan, Tawau (Barat); SBH05 Kudat, Kota Marudu, Pitas, Pulau Banggi; SBH06 Gunung Kinabalu; SBH07 Kota Kinabalu, Ranau, Kota Belud, Tuaran, Penampang, Papar, Putatan; SBH08 Pensiangan, Keningau, Tambunan, Nabawan; SBH09 Beaufort, Kuala Penyu, Sipitang, Tenom, Long Pasia, Membakut, Weston
Sarawak: SWK01 Limbang, Lawas, Sundar, Trusan; SWK02 Miri, Niah, Bekenu, Sibuti, Marudi; SWK03 Pandan, Belaga, Suai, Tatau, Sebauh, Bintulu; SWK04 Sibu, Mukah, Dalat, Song, Igan, Oya, Balingian, Kanowit, Kapit; SWK05 Sarikei, Matu, Julau, Rajang, Daro, Bintangor, Belawai; SWK06 Lubok Antu, Sri Aman, Roban, Debak, Kabong, Lingga, Engkelili, Betong, Spaoh, Pusa, Saratok; SWK07 Serian, Simunjan, Samarahan, Sebuyau, Meludam; SWK08 Kuching, Bau, Lundu, Sematan; SWK09 Zon Khas (Kampung Patarikan)
Selangor: SGR01 Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam; SGR02 Kuala Selangor, Sabak Bernam; SGR03 Klang, Kuala Langat
Terengganu: TRG01 Kuala Terengganu, Marang, Kuala Nerus; TRG02 Besut, Setiu; TRG03 Hulu Terengganu; TRG04 Dungun, Kemaman
Wilayah Persekutuan: WLY01 Kuala Lumpur, Putrajaya; WLY02 Labuan
```

- [ ] **Step 1: Write failing tests**: `zones.test.js` — 60 zones, codes unique, every code matches `/^[A-Z]{3}\d{2}$/`, `findZone("WLY01").name === "Kuala Lumpur, Putrajaya"`. `i18n.test.js` — the exact `formatGregorian` / `formatHijri` examples above; `t("en","subuh")==="Fajr"`, `t("ms","isyak")==="Isyak"`; every key exists in both languages (iterate ms keys, assert en has each).
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `js/zones.js` and `js/i18n.js`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Write `scripts/check-zones.js` (not part of `npm test`, hits the network): for each zone, POST a 1-day `duration` request, print codes whose `status !== "OK!"`. Run `node scripts/check-zones.js` → prints `all 60 zones OK`. Fix any code it reports.
- [ ] **Step 6:** Commit `feat: zone list and BM/EN translations`.

### Task 3: Data loading, caching and settings

**Files:**
- Create: `js/data.js`, `js/settings.js`
- Test: `tests/data.test.js`, `tests/settings.test.js`

**Interfaces:**
- Consumes: `parseDays`, `addDays`, `Day` from Task 1.
- Produces (`js/data.js`):
  - `API = "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=duration&zone="`
  - `loadMonth(zone, year, month, { fetchFn = fetch, storage = localStorage }) -> Promise<Day[]>` — cache key `ws:m:<zone>:<YYYY-MM>`; on cache hit with a valid array, return it without fetching; else POST `datestart` = 1st, `dateend` = last day of month, `parseDays`, store, return. Network/parse failure with no cache → throw. Storage errors ignored.
  - `loadDays(zone, ymd, deps) -> Promise<{ today: Day, tomorrow: Day|null, month: Day[] }>` — loads ymd's month; `tomorrow` from same month or, if `addDays(ymd,1)` is in the next month, from `loadMonth` of next month (failure → `null`). Throws `Error("no-day")` if today isn't in the data.
  - `pruneCache(storage, currentYm)` — removes `ws:m:*` keys whose month is before `currentYm`.
- Produces (`js/settings.js`):
  - `DEFAULTS = { lang: "ms", zone: "WLY01", fmt: "24" }`
  - `loadSettings(storage = localStorage) -> {lang, zone, fmt}` — key `ws:settings`; invalid values per field (lang ∉ {ms,en}, unknown zone via `findZone`, fmt ∉ {"24","12"}) fall back to default for that field.
  - `saveSettings(settings, storage = localStorage) -> void` (swallows errors).

Tests use a fake storage (`Map`-backed object with `getItem/setItem/removeItem/key/length`) and a fake `fetchFn` recording calls and returning `{ ok: true, json: async () => sample }`.

- [ ] **Step 1: Write failing tests**:
  - `loadMonth fetches and caches`: first call → fetchFn called once with URL `API+"WLY01"`, `method:"POST"`, body string containing `datestart=2026-11-01` and `dateend=2026-11-30`; second call → fetchFn not called again, same result.
  - `loadMonth dateend for February`: 2028-02 → `dateend=2028-02-29`; 2026-02 → `2026-02-28`.
  - `loadMonth throws on non-OK status`: fetch returns `{status:"NO_RECORD!"}`, empty cache → rejects.
  - `loadMonth uses cache when offline`: cache pre-filled, fetchFn rejects → resolves with cached days.
  - `loadDays fetches next month for tomorrow on month end`: ymd `2026-11-30` → `tomorrow.ymd === "2026-12-01"`, fetchFn called for both months; when the December fetch rejects → `tomorrow === null`, `today` still present.
  - `pruneCache` removes `ws:m:WLY01:2026-10`, keeps `ws:m:WLY01:2026-11` and `ws:m:WLY01:2026-12` and non-`ws:m:` keys.
  - `loadSettings falls back on throwing/corrupt storage`: storage whose `getItem` throws → `DEFAULTS`; stored `"{not json"` → `DEFAULTS`; stored `{lang:"en",zone:"XXX99",fmt:"12"}` → `{lang:"en",zone:"WLY01",fmt:"12"}`. `saveSettings` with throwing `setItem` does not throw; round-trip with fake storage returns what was saved.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `js/data.js` and `js/settings.js`. Body as `new URLSearchParams({datestart, dateend})` (no custom headers — keeps it a simple CORS request).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: e-solat loading with month cache, settings persistence`.

### Task 4: UI

**Files:**
- Create: `index.html`, `css/styles.css`, `js/app.js`

**Interfaces:**
- Consumes everything above: `myt`, `nextPrayer`, `formatTime`, `formatCountdown`, `PRAYER_KEYS` (Task 1); `ZONES`, `STATES`, `findZone`, `t`, `formatGregorian`, `formatHijri` (Task 2); `loadDays`, `pruneCache`, `loadSettings`, `saveSettings` (Task 3).

Layout (from spec):

```
 Kuala Lumpur, Putrajaya ▾   [BM|EN] [24j|12j]
 Selasa, 17 November 2026
 7 Jamadilakhir 1448H
        Isyak dalam 01:12:05
 Imsak 05:39 … Isyak 20:12 ◀ (next row highlighted)
 ───── Jadual Bulanan ───── (table: Tarikh + 7 columns, today's row highlighted)
```

- Phone (< 900px): one column; card, then monthly table in a horizontally scrollable wrapper (page itself never scrolls sideways). Desktop (≥ 900px): card (max ~420px) left, table right.
- Zone picker: native `<select>` with `<optgroup>` per state, option text `CODE — name`; header shows the zone name.
- Toggles: two segmented buttons (language, time format) with `aria-pressed`. Time format labels: ms `24j`/`12j`, en `24h`/`12h`.
- Theme: CSS custom properties on `:root`, dark values under `@media (prefers-color-scheme: dark)`. System font stack. Tap targets ≥ 44px. `<html lang>` updated with language.
- States: loading text (`t(lang,"loading")`), error text + Retry button (`t(lang,"error")`, `t(lang,"retry")`).
- Countdown line: `<next label> <t("in")> HH:MM:SS`, suffixed `(<t("tomorrow")>)` when `isTomorrow`; hidden if `nextPrayer` returns `null`.

- [ ] **Step 1:** Write `index.html` (meta viewport, `<script type="module" src="js/app.js">`), `css/styles.css`, `js/app.js`. In `app.js`: state `{settings, data, ymd}`; `render()` rebuilds text from state (no refetch on language/format change); changing zone saves settings and reloads data; `pruneCache` on start.
- [ ] **Step 2:** Implement the tick: `setInterval(1000)` updates the countdown; if `myt().ymd !== state.ymd` (midnight passed) reload data and re-render; when the countdown reaches zero, re-render so the highlight moves. Also re-run this check on `document.visibilitychange` → visible.
- [ ] **Step 3: Verify in browser.** Run `python -m http.server 8000` in the project root, open `http://localhost:8000`. Check: WLY01 times match `curl -s "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=today&zone=WLY01"`; switch to SGR03 → times change and survive reload; EN/BM and 24/12 toggles update all labels and the table instantly and survive reload; countdown ticks; DevTools device toolbar at 375px wide shows no horizontal page scroll; dark mode emulation looks correct; DevTools "Offline" + reload of a new zone shows the error message and Retry.
- [ ] **Step 4:** `npm test` still PASS. Commit `feat: responsive prayer times UI`.

### Task 5: Installable + offline (PWA)

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`
- Modify: `index.html` (manifest link, `theme-color`, apple-touch-icon), `js/app.js` (register service worker)

**Interfaces:**
- Consumes: file list from Tasks 1–4 (shell to precache).

- Manifest: `name "Waktu Solat"`, `short_name "Waktu Solat"`, `start_url "./"`, `scope "./"`, `display "standalone"`, theme/background colors matching the light theme, icons 192/512 PNG (`purpose "any maskable"`) plus the SVG.
- `sw.js`: `CACHE = "ws-shell-v1"`; precache `./`, `index.html`, `css/styles.css`, all `js/*.js`, manifest, icons; network-first for same-origin navigations/assets falling back to cache (so updates show up when online); do **not** intercept requests to e-solat (data caching is localStorage's job); delete old caches on `activate`.
- Icon: simple crescent/mosque-dome glyph on the theme colour; generate PNGs from the SVG (any method; e.g. headless browser screenshot or Python Pillow if available).
- Register only when `"serviceWorker" in navigator`, using relative path `./sw.js` (works under a GitHub Pages subpath).

- [ ] **Step 1:** Create the files above and wire them into `index.html` / `app.js`.
- [ ] **Step 2: Verify.** Serve with `python -m http.server 8000`; in Chrome DevTools → Application: manifest has no errors and shows installable; service worker activated. Load once, tick "Offline", reload → app loads and shows today's times for the visited zone. Lighthouse (mobile) PWA/Best Practices show no installability errors.
- [ ] **Step 3:** `npm test` PASS. Commit `feat: installable PWA with offline shell`.
- [ ] **Step 4:** Add `README.md`: what it is, `npm test`, `python -m http.server`, deploy = upload the folder to any static host (GitHub Pages / Netlify). Commit `docs: readme`.
