// Loads JAKIM times from e-solat, one zone-month at a time, cached in localStorage.
import { parseDays, addDays } from "./time.js";

export const API = "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=duration&zone=";
const PREFIX = "ws:m:";

const pad = (n) => String(n).padStart(2, "0");
const defaultStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const defaultFetch = (...args) => fetch(...args);

function readCache(storage, key) {
  try {
    const v = JSON.parse(storage?.getItem(key));
    return Array.isArray(v) && v.length ? v : null;
  } catch { return null; }
}

function writeCache(storage, key, days) {
  try { storage?.setItem(key, JSON.stringify(days)); } catch { /* storage full or blocked */ }
}

export async function loadMonth(zone, year, month, { fetchFn = defaultFetch, storage = defaultStorage(), timeoutMs = 15000 } = {}) {
  const key = `${PREFIX}${zone}:${year}-${pad(month)}`;
  const cached = readCache(storage, key);
  if (cached) return cached;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const body = new URLSearchParams({ datestart: `${year}-${pad(month)}-01`, dateend: `${year}-${pad(month)}-${pad(lastDay)}` });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let json;
  try {
    const res = await fetchFn(API + zone, { method: "POST", body, signal: ctrl.signal });
    if (!res.ok) throw new Error("bad-response");
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }
  const days = parseDays(json);
  if (!days.length) throw new Error("bad-response");
  writeCache(storage, key, days);
  return days;
}

export async function loadDays(zone, ymd, deps = {}) {
  const [y, m] = ymd.split("-").map(Number);
  const month = await loadMonth(zone, y, m, deps);
  const today = month.find((d) => d.ymd === ymd);
  if (!today) throw new Error("no-day");
  const next = addDays(ymd, 1);
  let tomorrow = month.find((d) => d.ymd === next) ?? null;
  if (!tomorrow) {
    const [ny, nm] = next.split("-").map(Number);
    try {
      tomorrow = (await loadMonth(zone, ny, nm, deps)).find((d) => d.ymd === next) ?? null;
    } catch { tomorrow = null; }
  }
  return { zone, today, tomorrow, month };
}

export function pruneCache(storage, currentYm) {
  try {
    const stale = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(PREFIX) && k.slice(-7) < currentYm) stale.push(k);
    }
    stale.forEach((k) => storage.removeItem(k));
  } catch { /* storage unavailable */ }
}
