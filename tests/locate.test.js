import { test } from "node:test";
import assert from "node:assert/strict";
import { GEO_API, zoneFromCoords, locateMessage } from "../js/locate.js";

const reply = (status, body) => {
  const calls = [];
  const fn = async (url, opts) => { calls.push({ url, opts }); return { ok: status === 200, status, json: async () => body }; };
  fn.calls = calls;
  return fn;
};

test("zoneFromCoords returns the JAKIM zone", async () => {
  const fetchFn = reply(200, { zone: "JHR02", state: "JHR", district: "Johor Bahru" });
  assert.equal(await zoneFromCoords(1.492712, 103.741398, { fetchFn }), "JHR02");
});

test("coordinates are rounded to 3 decimals before sending", async () => {
  const fetchFn = reply(200, { zone: "WLY01" });
  await zoneFromCoords(3.1390449, 101.6868551, { fetchFn });
  assert.equal(fetchFn.calls[0].url, GEO_API + "3.139/101.687");
});

test("outside Malaysia rejects with outside", async () => {
  const fetchFn = reply(500, { error: "No zone found for the given coordinates." });
  await assert.rejects(zoneFromCoords(1.3521, 103.8198, { fetchFn }), /outside/);
});

test("unknown zone code rejects with outside", async () => {
  const fetchFn = reply(200, { zone: "XXX99" });
  await assert.rejects(zoneFromCoords(3, 101, { fetchFn }), /outside/);
});

test("network failure rejects with network", async () => {
  const fetchFn = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(zoneFromCoords(3, 101, { fetchFn }), /network/);
});

test("hanging request times out with network", async () => {
  const fetchFn = (url, opts) => new Promise((_, reject) => opts.signal.addEventListener("abort", () => reject(new Error("aborted"))));
  await assert.rejects(zoneFromCoords(3, 101, { fetchFn, timeoutMs: 30 }), /network/);
});

test("locateMessage confirms a precise fix", () => {
  assert.equal(locateMessage("PRK05", 50), "Zone set to PRK05.");
});

test("locateMessage warns when the fix is rough", () => {
  assert.equal(locateMessage("PRK01", 25000),
    "Zone set to PRK01, but your device only knows your location to within about 25 km. If the zone is wrong, pick it from the list.");
  assert.equal(locateMessage("PRK01", 2400),
    "Zone set to PRK01, but your device only knows your location to within about 2 km. If the zone is wrong, pick it from the list.");
});

test("locateMessage treats missing accuracy as precise", () => {
  assert.equal(locateMessage("WLY01", undefined), "Zone set to WLY01.");
});
