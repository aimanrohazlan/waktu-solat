// English UI strings and date formatting (no Intl: output must be stable).
const STRINGS = {
  imsak: "Imsak", subuh: "Fajr", syuruk: "Sunrise", zohor: "Dhuhr", asar: "Asr", maghrib: "Maghrib", isyak: "Isha",
  in: "in", zone: "Zone", month: "Monthly Timetable", date: "Date",
  loading: "Loading…",
  error: "Couldn't load prayer times. Check your internet connection.",
  retry: "Retry", tomorrow: "tomorrow",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HIJRI = ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'dah", "Dhu al-Hijjah"];

export const t = (key) => STRINGS[key] ?? key;

export const dayName = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

export const monthName = (month) => MONTHS[month - 1];

export function formatGregorian(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${dayName(ymd)}, ${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatHijri(hijri) {
  const [y, m, d] = hijri.split("-").map(Number);
  return `${d} ${HIJRI[m - 1]} ${y} AH`;
}
