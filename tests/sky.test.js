import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDays, toEpoch, skyPhase, prayerProgress } from "../js/time.js";

const raw = (date) => ({ hijri: "1448-06-07", date, imsak: "05:39:00", fajr: "05:49:00", syuruk: "06:58:00",
  dhuhr: "13:01:00", asr: "16:23:00", maghrib: "18:59:00", isha: "20:12:00" });
const [today, tomorrow] = parseDays({ status: "OK!", prayerTime: [raw("17-Nov-2026"), raw("18-Nov-2026")] });
const at = (hhmm) => toEpoch("2026-11-17", hhmm);

test("skyPhase follows the day's prayer times", () => {
  assert.equal(skyPhase(today, at("03:00")), "night");
  assert.equal(skyPhase(today, at("05:39")), "dawn");
  assert.equal(skyPhase(today, at("07:27")), "dawn");
  assert.equal(skyPhase(today, at("07:28")), "day");
  assert.equal(skyPhase(today, at("18:13")), "day");
  assert.equal(skyPhase(today, at("18:14")), "dusk");
  assert.equal(skyPhase(today, at("20:11")), "dusk");
  assert.equal(skyPhase(today, at("20:12")), "night");
});

test("prayerProgress between two prayers", () => {
  assert.ok(Math.abs(prayerProgress(today, tomorrow, at("06:00")) - 11 / 432) < 1e-9);
  assert.equal(prayerProgress(today, tomorrow, at("13:01")), 0);
});

test("prayerProgress after Isha runs to tomorrow's Fajr", () => {
  assert.ok(Math.abs(prayerProgress(today, tomorrow, at("21:00")) - 48 / 577) < 1e-9);
  assert.equal(prayerProgress(today, null, at("21:00")), null);
});

test("prayerProgress before Fajr starts from last night's Isha", () => {
  assert.ok(Math.abs(prayerProgress(today, tomorrow, at("03:00")) - 408 / 577) < 1e-9);
});
