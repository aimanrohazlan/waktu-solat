// Network check (not part of npm test): every zone code returns OK from e-solat.
import { ZONES } from "../js/zones.js";
import { myt } from "../js/time.js";

const API = "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=duration&zone=";
const { ymd } = myt();
const bad = [];
for (const z of ZONES) {
  try {
    const res = await fetch(API + z.code, { method: "POST", body: new URLSearchParams({ datestart: ymd, dateend: ymd }) });
    const json = await res.json();
    if (json.status !== "OK!" || !json.prayerTime?.length) bad.push(`${z.code} (${json.status})`);
  } catch (e) {
    bad.push(`${z.code} (${e.message})`);
  }
}
console.log(bad.length ? `bad zones: ${bad.join(", ")}` : `all ${ZONES.length} zones OK`);
process.exitCode = bad.length ? 1 : 0;
