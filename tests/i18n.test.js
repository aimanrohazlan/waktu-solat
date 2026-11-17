import { test } from "node:test";
import assert from "node:assert/strict";
import { t, formatGregorian, formatHijri, STRINGS } from "../js/i18n.js";
import { PRAYER_KEYS } from "../js/time.js";

test("prayer labels", () => {
  assert.equal(t("en", "subuh"), "Fajr");
  assert.equal(t("ms", "isyak"), "Isyak");
  assert.equal(t("en", "syuruk"), "Sunrise");
  for (const k of PRAYER_KEYS) { assert.ok(t("ms", k)); assert.ok(t("en", k)); }
});

test("every key exists in both languages", () => {
  assert.deepEqual(Object.keys(STRINGS.en).sort(), Object.keys(STRINGS.ms).sort());
  for (const k of ["next", "in", "zone", "today", "month", "date", "loading", "error", "retry", "tomorrow"])
    assert.ok(STRINGS.ms[k] && STRINGS.en[k], k);
});

test("formatGregorian", () => {
  assert.equal(formatGregorian("2026-11-17", "ms"), "Selasa, 17 November 2026");
  assert.equal(formatGregorian("2026-11-17", "en"), "Tuesday, 17 November 2026");
  assert.equal(formatGregorian("2026-11-20", "ms"), "Jumaat, 20 November 2026");
  assert.equal(formatGregorian("2026-08-02", "ms"), "Ahad, 2 Ogos 2026");
});

test("formatHijri", () => {
  assert.equal(formatHijri("1448-06-07", "ms"), "7 Jamadilakhir 1448H");
  assert.equal(formatHijri("1448-06-07", "en"), "7 Jumada al-Akhirah 1448 AH");
  assert.equal(formatHijri("1448-09-01", "ms"), "1 Ramadan 1448H");
});
