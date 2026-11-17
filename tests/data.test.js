import { test } from "node:test";
import assert from "node:assert/strict";
import { API, loadMonth, loadDays, pruneCache } from "../js/data.js";
import { fakeStorage, fakeFetch, esolatResponse } from "./helpers/fakes.js";

test("loadMonth fetches and caches", async () => {
  const storage = fakeStorage(), fetchFn = fakeFetch();
  const a = await loadMonth("WLY01", 2026, 11, { fetchFn, storage });
  assert.equal(fetchFn.calls.length, 1);
  assert.equal(fetchFn.calls[0].url, API + "WLY01");
  assert.equal(fetchFn.calls[0].method, "POST");
  assert.match(fetchFn.calls[0].body, /datestart=2026-11-01/);
  assert.match(fetchFn.calls[0].body, /dateend=2026-11-30/);
  assert.equal(a.length, 30);
  assert.equal(a[16].ymd, "2026-11-17");
  const b = await loadMonth("WLY01", 2026, 11, { fetchFn, storage });
  assert.equal(fetchFn.calls.length, 1);
  assert.deepEqual(b, a);
});

test("loadMonth dateend for February", async () => {
  const fetchFn = fakeFetch();
  await loadMonth("WLY01", 2028, 2, { fetchFn, storage: fakeStorage() });
  await loadMonth("WLY01", 2026, 2, { fetchFn, storage: fakeStorage() });
  assert.match(fetchFn.calls[0].body, /dateend=2028-02-29/);
  assert.match(fetchFn.calls[1].body, /dateend=2026-02-28/);
});

test("loadMonth throws on non-OK status", async () => {
  const fetchFn = fakeFetch({ json: { status: "NO_RECORD!" } });
  await assert.rejects(loadMonth("WLY01", 2026, 11, { fetchFn, storage: fakeStorage() }));
});

test("loadMonth uses cache when offline", async () => {
  const storage = fakeStorage();
  const cached = await loadMonth("WLY01", 2026, 11, { fetchFn: fakeFetch(), storage });
  const offline = fakeFetch({ fail: () => true });
  assert.deepEqual(await loadMonth("WLY01", 2026, 11, { fetchFn: offline, storage }), cached);
  await assert.rejects(loadMonth("SGR01", 2026, 11, { fetchFn: offline, storage }));
});

test("loadMonth ignores corrupt cache and works with throwing storage", async () => {
  const storage = fakeStorage({ "ws:m:WLY01:2026-11": "{oops" });
  assert.equal((await loadMonth("WLY01", 2026, 11, { fetchFn: fakeFetch(), storage })).length, 30);
  const boom = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.equal((await loadMonth("WLY01", 2026, 11, { fetchFn: fakeFetch(), storage: boom })).length, 30);
});

test("loadDays returns today and tomorrow within month", async () => {
  const r = await loadDays("WLY01", "2026-11-17", { fetchFn: fakeFetch(), storage: fakeStorage() });
  assert.equal(r.today.ymd, "2026-11-17");
  assert.equal(r.tomorrow.ymd, "2026-11-18");
  assert.equal(r.month.length, 30);
});

test("loadDays fetches next month for tomorrow on month end", async () => {
  const fetchFn = fakeFetch();
  const r = await loadDays("WLY01", "2026-11-30", { fetchFn, storage: fakeStorage() });
  assert.equal(r.tomorrow.ymd, "2026-12-01");
  assert.equal(fetchFn.calls.length, 2);
  const failDec = fakeFetch({ fail: (url, body) => body.includes("2026-12") });
  const r2 = await loadDays("WLY01", "2026-11-30", { fetchFn: failDec, storage: fakeStorage() });
  assert.equal(r2.tomorrow, null);
  assert.equal(r2.today.ymd, "2026-11-30");
});

test("loadDays throws no-day when today missing", async () => {
  const fetchFn = fakeFetch({ json: esolatResponse("2026-11-01", "2026-11-05") });
  await assert.rejects(loadDays("WLY01", "2026-11-17", { fetchFn, storage: fakeStorage() }), /no-day/);
});

test("pruneCache", () => {
  const s = fakeStorage({ "ws:m:WLY01:2026-10": "[]", "ws:m:SGR01:2025-12": "[]", "ws:m:WLY01:2026-11": "[]",
    "ws:m:WLY01:2026-12": "[]", "ws:settings": "{}" });
  pruneCache(s, "2026-11");
  assert.deepEqual([...s._map.keys()].sort(), ["ws:m:WLY01:2026-11", "ws:m:WLY01:2026-12", "ws:settings"]);
  pruneCache({ get length() { throw new Error("denied"); } }, "2026-11"); // must not throw
});

test("loadMonth times out a hanging request", async () => {
  const hang = (url, opts) => new Promise((_, reject) => {
    opts.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  });
  const start = Date.now();
  await assert.rejects(loadMonth("WLY01", 2026, 11, { fetchFn: hang, storage: fakeStorage(), timeoutMs: 50 }));
  assert.ok(Date.now() - start < 2000);
});

test("loadDays result names its zone", async () => {
  const r = await loadDays("SGR03", "2026-11-17", { fetchFn: fakeFetch(), storage: fakeStorage() });
  assert.equal(r.zone, "SGR03");
});
