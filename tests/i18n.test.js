import { test } from "node:test";
import assert from "node:assert/strict";
import { t, formatGregorian, formatHijri, dayName, monthName } from "../js/i18n.js";
import { PRAYER_KEYS } from "../js/time.js";

test("prayer labels are English", () => {
  const expected = { imsak: "Imsak", subuh: "Fajr", syuruk: "Sunrise", zohor: "Dhuhr", asar: "Asr", maghrib: "Maghrib", isyak: "Isha" };
  for (const k of PRAYER_KEYS) assert.equal(t(k), expected[k]);
});

test("UI strings are English", () => {
  assert.equal(t("in"), "in");
  assert.equal(t("tomorrow"), "tomorrow");
  assert.equal(t("loading"), "Loading…");
  assert.equal(t("error"), "Couldn't load prayer times. Check your internet connection.");
  assert.equal(t("retry"), "Retry");
  assert.equal(t("month"), "Monthly Timetable");
});

test("formatGregorian", () => {
  assert.equal(formatGregorian("2026-11-17"), "Tuesday, 17 November 2026");
  assert.equal(formatGregorian("2026-08-02"), "Sunday, 2 August 2026");
});

test("formatHijri", () => {
  assert.equal(formatHijri("1448-06-07"), "7 Jumada al-Akhirah 1448 AH");
  assert.equal(formatHijri("1448-09-01"), "1 Ramadan 1448 AH");
});

test("dayName and monthName", () => {
  assert.equal(dayName("2026-11-20"), "Friday");
  assert.equal(monthName(12), "December");
});
