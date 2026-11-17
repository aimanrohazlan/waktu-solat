process.env.TZ = "America/New_York";
const { test } = await import("node:test");
const assert = (await import("node:assert/strict")).default;
const { myt, nextPrayer, toEpoch, parseDays } = await import("../js/time.js");

test("nextPrayer uses MYT regardless of host TZ", () => {
  assert.equal(new Date(Date.UTC(2026, 10, 17, 12)).getHours(), 7); // TZ really applied
  assert.equal(myt(Date.UTC(2026, 10, 17, 16, 30)).ymd, "2026-11-18");
  const today = parseDays({ status: "OK!", prayerTime: [{ hijri: "1448-06-07", date: "17-Nov-2026",
    imsak: "05:39:00", fajr: "05:49:00", syuruk: "06:58:00", dhuhr: "13:01:00", asr: "16:23:00",
    maghrib: "18:59:00", isha: "20:12:00" }] })[0];
  assert.equal(toEpoch("2026-11-17", "13:01"), Date.UTC(2026, 10, 17, 5, 1));
  assert.equal(nextPrayer(today, null, Date.UTC(2026, 10, 16, 22, 0)).key, "zohor"); // 06:00 MYT
});
