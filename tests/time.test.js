import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDays, myt, addDays, toEpoch, nextPrayer, formatTime, formatCountdown,
  PRAYER_KEYS, COUNTDOWN_KEYS,
} from "../js/time.js";

const raw = (date, hijri = "1448-06-07") => ({
  hijri, date, day: "Tuesday", imsak: "05:39:00", fajr: "05:49:00", syuruk: "06:58:00",
  dhuha: "07:23:00", dhuhr: "13:01:00", asr: "16:23:00", maghrib: "18:59:00", isha: "20:12:00",
});
const ok = (...entries) => ({ status: "OK!", prayerTime: entries });

const today = parseDays(ok(raw("17-Nov-2026")))[0];
const tomorrow = { ...parseDays(ok(raw("18-Nov-2026", "1448-06-08")))[0] };

test("key lists", () => {
  assert.deepEqual(PRAYER_KEYS, ["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"]);
  assert.deepEqual(COUNTDOWN_KEYS, ["subuh", "zohor", "asar", "maghrib", "isyak"]);
});

test("parseDays maps fields", () => {
  assert.deepEqual(parseDays(ok(raw("17-Nov-2026"))), [{
    ymd: "2026-11-17", hijri: "1448-06-07",
    times: { imsak: "05:39", subuh: "05:49", syuruk: "06:58", zohor: "13:01", asar: "16:23", maghrib: "18:59", isyak: "20:12" },
  }]);
});

test("parseDays handles Malay months", () => {
  const cases = { "01-Dis-2026": "2026-12-01", "05-Ogos-2026": "2026-08-05", "09-Mac-2026": "2026-03-09",
    "10-Mei-2026": "2026-05-10", "11-Okt-2026": "2026-10-11", "12-Dec-2026": "2026-12-12" };
  for (const [d, ymd] of Object.entries(cases)) assert.equal(parseDays(ok(raw(d)))[0].ymd, ymd);
});

test("parseDays throws on non-OK", () => {
  assert.throws(() => parseDays({ status: "NO_RECORD!" }), /bad-response/);
  assert.throws(() => parseDays({ status: "OK!" }), /bad-response/);
});

test("myt crosses midnight", () => {
  assert.equal(myt(Date.UTC(2026, 10, 17, 16, 30)).ymd, "2026-11-18");
  assert.deepEqual(myt(Date.UTC(2026, 10, 17, 15, 59)), { ymd: "2026-11-17", year: 2026, month: 11, day: 17 });
});

test("addDays crosses month/year", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("toEpoch", () => {
  assert.equal(toEpoch("2026-11-17", "13:01"), Date.UTC(2026, 10, 17, 5, 1));
});

test("nextPrayer picks next of five", () => {
  const a = nextPrayer(today, tomorrow, toEpoch("2026-11-17", "06:00"));
  assert.deepEqual(a, { key: "zohor", at: toEpoch("2026-11-17", "13:01"), isTomorrow: false });
  assert.equal(nextPrayer(today, tomorrow, toEpoch("2026-11-17", "13:01")).key, "asar");
  assert.equal(nextPrayer(today, tomorrow, toEpoch("2026-11-17", "00:10")).key, "subuh");
});

test("nextPrayer after isyak uses tomorrow", () => {
  const now = toEpoch("2026-11-17", "20:30");
  assert.deepEqual(nextPrayer(today, tomorrow, now),
    { key: "subuh", at: toEpoch("2026-11-18", "05:49"), isTomorrow: true });
  assert.equal(nextPrayer(today, null, now), null);
});

test("formatTime", () => {
  assert.equal(formatTime("13:01", "24"), "13:01");
  assert.equal(formatTime("13:01", "12"), "1:01 PM");
  assert.equal(formatTime("00:05", "12"), "12:05 AM");
  assert.equal(formatTime("12:00", "12"), "12:00 PM");
  assert.equal(formatTime("05:49", "12"), "5:49 AM");
});

test("formatCountdown", () => {
  assert.equal(formatCountdown(4325000), "01:12:05");
  assert.equal(formatCountdown(-5), "00:00:00");
  assert.equal(formatCountdown(90061000), "25:01:01");
});
