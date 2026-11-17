import { myt, nextPrayer, formatTime, formatCountdown, toEpoch, skyPhase, prayerProgress, PRAYER_KEYS, COUNTDOWN_KEYS } from "./time.js";
import { ZONES, STATES, findZone } from "./zones.js";
import { t, formatGregorian, formatHijri, dayName, monthName } from "./i18n.js";
import { loadDays, pruneCache } from "./data.js";
import { loadSettings, saveSettings } from "./settings.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// Preview switches (used by the design comparison page): ?v=b picks the second font pairing,
// ?t=HH:MM pretends it is that Malaysia time today.
const params = new URLSearchParams(location.search);
if (params.get("v") === "b") document.documentElement.dataset.variant = "b";
const fakeTime = /^\d{2}:\d{2}$/.test(params.get("t") || "") ? params.get("t") : null;
const offset = fakeTime ? toEpoch(myt().ymd, fakeTime) - Date.now() : 0;
const now = () => Date.now() + offset;

const ICONS = {
  imsak: '<path d="M14 4a6 6 0 1 0 6 8.5A5 5 0 1 1 14 4z"/><path d="M5 4v3M3.5 5.5h3"/>',
  subuh: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 7v3M5.6 11.6l1.5 1.5M18.4 11.6l-1.5 1.5"/>',
  syuruk: '<path d="M4 20h16M7 20a5 5 0 0 1 10 0M12 4v6M9 7l3-3 3 3"/>',
  zohor: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  asar: '<circle cx="10" cy="10" r="4"/><path d="M10 2v2M2 10h2M4.3 4.3l1.4 1.4M15.7 4.3l-1.4 1.4M8 20h12M11 16h9"/>',
  maghrib: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v6M9 7l3 3 3-3"/>',
  isyak: '<path d="M15 3a8 8 0 1 0 6 12.5A6.5 6.5 0 1 1 15 3z"/><path d="M8 6.5v2M7 7.5h2"/>',
};

const state = {
  settings: loadSettings(),
  ymd: myt(now()).ymd,
  data: null,
  loading: true,
  error: false,
  nextKey: null,
};
let loadToken = 0;

function buildZoneSelect() {
  const sel = $("zone");
  for (const st of STATES) {
    const group = document.createElement("optgroup");
    group.label = st;
    for (const z of ZONES.filter((z) => z.state === st)) {
      const o = el("option", null, `${z.code} — ${z.name}`);
      o.value = z.code;
      group.append(o);
    }
    sel.append(group);
  }
  sel.addEventListener("change", () => {
    state.settings.zone = sel.value;
    saveSettings(state.settings);
    load();
  });
}

function bindToggles() {
  for (const b of document.querySelectorAll("[data-fmt]")) {
    b.addEventListener("click", () => { state.settings.fmt = b.dataset.fmt; saveSettings(state.settings); render(); });
  }
  $("retry").addEventListener("click", load);
}

async function load() {
  const token = ++loadToken;
  state.ymd = myt(now()).ymd;
  // Never show times belonging to a different zone or date while the new ones load.
  if (state.data && (state.data.zone !== state.settings.zone || state.data.today.ymd !== state.ymd)) state.data = null;
  state.loading = true;
  state.error = false;
  render();
  try {
    const data = await loadDays(state.settings.zone, state.ymd);
    if (token !== loadToken) return;
    state.data = data;
  } catch {
    if (token !== loadToken) return;
    state.data = null;
    state.error = true;
  }
  state.loading = false;
  render();
}

function render() {
  const { zone } = state.settings;
  for (const b of document.querySelectorAll("[data-fmt]")) b.setAttribute("aria-pressed", String(b.dataset.fmt === state.settings.fmt));

  $("zone").value = zone;
  const z = findZone(zone);
  $("zone-name").textContent = z ? z.name : zone;
  $("greg").textContent = formatGregorian(state.ymd);
  $("hijri").textContent = state.data ? formatHijri(state.data.today.hijri) : "";

  const status = $("status");
  status.hidden = !(state.loading || state.error);
  $("status-text").textContent = state.error ? t("error") : t("loading");
  $("retry").hidden = !state.error;

  $("hero").dataset.phase = state.data ? skyPhase(state.data.today, now()) : "night";
  renderTimes();
  renderMonth();
  renderCountdown();
}

function icon(key) {
  const span = el("span", "ico");
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key]}</svg>`; // static markup, no data
  return span;
}

function renderTimes() {
  const list = $("times");
  list.replaceChildren();
  $("times-card").hidden = !state.data;
  if (!state.data) return;
  const { fmt } = state.settings;
  const { today } = state.data;
  const nowMs = now();
  const next = nextPrayer(today, state.data.tomorrow, nowMs);
  state.nextKey = next ? next.key + (next.isTomorrow ? ":t" : "") : null;
  for (const key of PRAYER_KEYS) {
    const li = el("li", COUNTDOWN_KEYS.includes(key) ? "" : "minor");
    const isNext = next && !next.isTomorrow && next.key === key;
    if (isNext) li.classList.add("next");
    else if (toEpoch(today.ymd, today.times[key]) <= nowMs) li.classList.add("past");
    const name = el("span", "n", t(key));
    if (isNext) name.append(el("span", "tag", "Next"));
    li.append(icon(key), name, el("span", "t", formatTime(today.times[key], fmt)));
    list.append(li);
  }
}

function renderMonth() {
  const section = $("month-section");
  section.hidden = !state.data;
  if (!state.data) return;
  const { fmt } = state.settings;
  const [y, m] = state.ymd.split("-").map(Number);
  $("month-title").textContent = `${t("month")} · ${monthName(m)} ${y}`;

  const headRow = $("month-table").tHead.rows[0];
  headRow.replaceChildren(el("th", null, t("date")), ...PRAYER_KEYS.map((k) => el("th", null, t(k))));

  const body = $("month-table").tBodies[0];
  body.replaceChildren();
  for (const d of state.data.month) {
    const tr = el("tr", d.ymd === state.ymd ? "today" : "");
    const first = el("td", null, String(Number(d.ymd.slice(8))));
    first.append(el("span", "dow", dayName(d.ymd).slice(0, 3)));
    tr.append(first, ...PRAYER_KEYS.map((k) => el("td", null, formatTime(d.times[k], fmt))));
    body.append(tr);
  }
}

function renderCountdown() {
  const box = $("countdown");
  const next = state.data && nextPrayer(state.data.today, state.data.tomorrow, now());
  box.hidden = !next;
  if (!next) return;
  const nowMs = now();
  const suffix = next.isTomorrow ? ` (${t("tomorrow")})` : "";
  $("cd-label").textContent = `${t(next.key)} ${t("in")}${suffix}`;
  $("cd-time").textContent = formatCountdown(next.at - nowMs);
  const day = next.isTomorrow ? state.data.tomorrow : state.data.today;
  $("cd-at").textContent = `at ${formatTime(day.times[next.key], state.settings.fmt)}`;
  const p = prayerProgress(state.data.today, state.data.tomorrow, nowMs) ?? 0;
  $("ring-fill").style.strokeDashoffset = String(100 - p * 100);
}

function tick() {
  if (myt(now()).ymd !== state.ymd) { load(); return; }
  if (!state.data) return;
  const next = nextPrayer(state.data.today, state.data.tomorrow, now());
  const key = next ? next.key + (next.isTomorrow ? ":t" : "") : null;
  if (key !== state.nextKey) renderTimes();
  const phase = skyPhase(state.data.today, now());
  if ($("hero").dataset.phase !== phase) $("hero").dataset.phase = phase;
  renderCountdown();
}

buildZoneSelect();
bindToggles();
try { pruneCache(localStorage, myt().ymd.slice(0, 7)); } catch { /* storage blocked */ }
load();
setInterval(tick, 1000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") tick(); });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => { /* offline shell unavailable; app still works */ });
}
