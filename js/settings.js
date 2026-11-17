// User settings (language, zone, time format), persisted when storage allows.
import { findZone } from "./zones.js";

export const DEFAULTS = Object.freeze({ lang: "ms", zone: "WLY01", fmt: "24" });
const KEY = "ws:settings";
const defaultStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export function loadSettings(storage = defaultStorage()) {
  let s = {};
  try { s = JSON.parse(storage?.getItem(KEY)) ?? {}; } catch { s = {}; }
  return {
    lang: ["ms", "en"].includes(s.lang) ? s.lang : DEFAULTS.lang,
    zone: typeof s.zone === "string" && findZone(s.zone) ? s.zone : DEFAULTS.zone,
    fmt: ["24", "12"].includes(s.fmt) ? s.fmt : DEFAULTS.fmt,
  };
}

export function saveSettings(settings, storage = defaultStorage()) {
  try { storage?.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}
