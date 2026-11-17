// Pure time logic. All maths is in Malaysia time (UTC+8, no DST) using only
// UTC getters, so the device's own timezone never matters.

export const PRAYER_KEYS = ["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"];
export const COUNTDOWN_KEYS = ["subuh", "zohor", "asar", "maghrib", "isyak"];

const MYT_OFFSET = 8 * 3600e3;
const SOURCE_FIELD = { imsak: "imsak", subuh: "fajr", syuruk: "syuruk", zohor: "dhuhr", asar: "asr", maghrib: "maghrib", isyak: "isha" };
const MONTHS = {
  jan: 1, feb: 2, mac: 3, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
  ogos: 8, ogo: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dis: 12, dec: 12,
};

const pad = (n) => String(n).padStart(2, "0");
const ymdOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function parseDate(s) {
  const [d, mon, y] = String(s).split("-");
  const m = MONTHS[(mon || "").toLowerCase()];
  if (!m || !y || !d) throw new Error("bad-response");
  return ymdOf(Number(y), m, Number(d));
}

export function parseDays(json) {
  if (!json || json.status !== "OK!" || !Array.isArray(json.prayerTime)) throw new Error("bad-response");
  return json.prayerTime.map((p) => {
    const times = {};
    for (const key of PRAYER_KEYS) times[key] = String(p[SOURCE_FIELD[key]]).slice(0, 5);
    return { ymd: parseDate(p.date), hijri: p.hijri, times };
  });
}

export function myt(nowMs = Date.now()) {
  const d = new Date(nowMs + MYT_OFFSET);
  const year = d.getUTCFullYear(), month = d.getUTCMonth() + 1, day = d.getUTCDate();
  return { ymd: ymdOf(year, month, day), year, month, day };
}

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return ymdOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function toEpoch(ymd, hhmm) {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - MYT_OFFSET;
}

export function nextPrayer(today, tomorrow, nowMs) {
  for (const key of COUNTDOWN_KEYS) {
    const at = toEpoch(today.ymd, today.times[key]);
    if (at > nowMs) return { key, at, isTomorrow: false };
  }
  if (!tomorrow) return null;
  return { key: "subuh", at: toEpoch(tomorrow.ymd, tomorrow.times.subuh), isTomorrow: true };
}

export function formatTime(hhmm, fmt) {
  if (fmt !== "12") return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
