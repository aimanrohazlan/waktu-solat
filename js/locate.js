// Turns coordinates into a JAKIM zone using the waktusolat.app community API.
// Coordinates are rounded to ~100 m before they leave the device.
import { findZone } from "./zones.js";

export const GEO_API = "https://api.waktusolat.app/zones/";

const round = (n) => Math.round(n * 1000) / 1000;

export async function zoneFromCoords(lat, lon, { fetchFn = (...a) => fetch(...a), timeoutMs = 10000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res, body;
  try {
    res = await fetchFn(`${GEO_API}${round(lat)}/${round(lon)}`, { signal: ctrl.signal });
    body = await res.json().catch(() => null);
  } catch {
    throw new Error("network");
  } finally {
    clearTimeout(timer);
  }
  const code = body?.zone;
  if (!res.ok || typeof code !== "string" || !findZone(code)) throw new Error(res.status >= 500 && !body?.error ? "network" : "outside");
  return code;
}

// Message after a successful lookup; warns when the device's fix is rough (e.g. a desktop
// locating itself from Wi-Fi or its internet connection instead of GPS).
export function locateMessage(code, accuracyM) {
  if (!(accuracyM > 1500)) return `Zone set to ${code}.`;
  const km = Math.round(accuracyM / 1000);
  return `Zone set to ${code}, but your device only knows your location to within about ${km} km. If the zone is wrong, pick it from the list.`;
}
