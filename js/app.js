import { myt, nextPrayer, formatTime, formatCountdown, PRAYER_KEYS, COUNTDOWN_KEYS } from "./time.js";
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

const state = {
  settings: loadSettings(),
  ymd: myt().ymd,
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
  for (const b of document.querySelectorAll("[data-lang]")) {
    b.addEventListener("click", () => { state.settings.lang = b.dataset.lang; saveSettings(state.settings); render(); });
  }
  for (const b of document.querySelectorAll("[data-fmt]")) {
    b.addEventListener("click", () => { state.settings.fmt = b.dataset.fmt; saveSettings(state.settings); render(); });
  }
  $("retry").addEventListener("click", load);
}

async function load() {
  const token = ++loadToken;
  state.ymd = myt().ymd;
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
  const { lang, fmt, zone } = state.settings;
  document.documentElement.lang = lang;
  for (const n of document.querySelectorAll("[data-i18n]")) n.textContent = t(lang, n.dataset.i18n);
  for (const b of document.querySelectorAll("[data-lang]")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  for (const b of document.querySelectorAll("[data-fmt]")) b.setAttribute("aria-pressed", String(b.dataset.fmt === fmt));
  $("lang-group").setAttribute("aria-label", t(lang, "language"));
  $("fmt-group").setAttribute("aria-label", t(lang, "timeFormat"));

  $("zone").value = zone;
  const z = findZone(zone);
  $("zone-name").textContent = z ? z.name : zone;
  $("greg").textContent = formatGregorian(state.ymd, lang);
  $("hijri").textContent = state.data ? formatHijri(state.data.today.hijri, lang) : "";

  const status = $("status");
  status.hidden = !(state.loading || state.error);
  $("status-text").textContent = state.error ? t(lang, "error") : t(lang, "loading");
  $("retry").hidden = !state.error;

  renderTimes();
  renderMonth();
  renderCountdown();
}

function renderTimes() {
  const list = $("times");
  list.replaceChildren();
  if (!state.data) return;
  const { lang, fmt } = state.settings;
  const next = nextPrayer(state.data.today, state.data.tomorrow, Date.now());
  state.nextKey = next ? next.key + (next.isTomorrow ? ":t" : "") : null;
  for (const key of PRAYER_KEYS) {
    const li = el("li", COUNTDOWN_KEYS.includes(key) ? "" : "minor");
    if (next && !next.isTomorrow && next.key === key) li.classList.add("next");
    li.append(el("span", "n", t(lang, key)), el("span", "t", formatTime(state.data.today.times[key], fmt)));
    list.append(li);
  }
}

function renderMonth() {
  const section = $("month-section");
  section.hidden = !state.data;
  if (!state.data) return;
  const { lang, fmt } = state.settings;
  const [y, m] = state.ymd.split("-").map(Number);
  $("month-title").textContent = `${t(lang, "month")} · ${monthName(m, lang)} ${y}`;

  const headRow = $("month-table").tHead.rows[0];
  headRow.replaceChildren(el("th", null, t(lang, "date")), ...PRAYER_KEYS.map((k) => el("th", null, t(lang, k))));

  const body = $("month-table").tBodies[0];
  body.replaceChildren();
  for (const d of state.data.month) {
    const tr = el("tr", d.ymd === state.ymd ? "today" : "");
    const first = el("td", null, String(Number(d.ymd.slice(8))));
    first.append(el("span", "dow", dayName(d.ymd, lang).slice(0, 3)));
    tr.append(first, ...PRAYER_KEYS.map((k) => el("td", null, formatTime(d.times[k], fmt))));
    body.append(tr);
  }
}

function renderCountdown() {
  const box = $("countdown");
  const next = state.data && nextPrayer(state.data.today, state.data.tomorrow, Date.now());
  box.hidden = !next;
  if (!next) return;
  const { lang } = state.settings;
  const suffix = next.isTomorrow ? ` (${t(lang, "tomorrow")})` : "";
  $("cd-label").textContent = `${t(lang, next.key)} ${t(lang, "in")}${suffix}`;
  $("cd-time").textContent = formatCountdown(next.at - Date.now());
}

function tick() {
  if (myt().ymd !== state.ymd) { load(); return; }
  if (!state.data) return;
  const next = nextPrayer(state.data.today, state.data.tomorrow, Date.now());
  const key = next ? next.key + (next.isTomorrow ? ":t" : "") : null;
  if (key !== state.nextKey) renderTimes();
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
