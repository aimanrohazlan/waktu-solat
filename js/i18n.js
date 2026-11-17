// Bahasa Melayu / English strings and date formatting (no Intl: output must be stable).
export const STRINGS = {
  ms: {
    imsak: "Imsak", subuh: "Subuh", syuruk: "Syuruk", zohor: "Zohor", asar: "Asar", maghrib: "Maghrib", isyak: "Isyak",
    next: "Seterusnya", in: "dalam", zone: "Zon", today: "Hari ini", month: "Jadual Bulanan", date: "Tarikh",
    loading: "Memuatkan…",
    error: "Tidak dapat memuatkan waktu solat. Semak sambungan internet anda.",
    retry: "Cuba lagi", tomorrow: "esok", fmt24: "24j", fmt12: "12j",
    language: "Bahasa", timeFormat: "Format masa", source: "Sumber: JAKIM (e-solat.gov.my)",
  },
  en: {
    imsak: "Imsak", subuh: "Fajr", syuruk: "Sunrise", zohor: "Dhuhr", asar: "Asr", maghrib: "Maghrib", isyak: "Isha",
    next: "Next", in: "in", zone: "Zone", today: "Today", month: "Monthly Timetable", date: "Date",
    loading: "Loading…",
    error: "Couldn't load prayer times. Check your internet connection.",
    retry: "Retry", tomorrow: "tomorrow", fmt24: "24h", fmt12: "12h",
    language: "Language", timeFormat: "Time format", source: "Source: JAKIM (e-solat.gov.my)",
  },
};

const DAYS = {
  ms: ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};
const MONTHS = {
  ms: ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const HIJRI = {
  ms: ["Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir", "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah"],
  en: ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'dah", "Dhu al-Hijjah"],
};

const lng = (lang) => (lang === "en" ? "en" : "ms");

export const t = (lang, key) => STRINGS[lng(lang)][key] ?? key;

export const dayName = (ymd, lang) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return DAYS[lng(lang)][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

export function formatGregorian(ymd, lang) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${dayName(ymd, lang)}, ${d} ${MONTHS[lng(lang)][m - 1]} ${y}`;
}

export const monthName = (month, lang) => MONTHS[lng(lang)][month - 1];

export function formatHijri(hijri, lang) {
  const [y, m, d] = hijri.split("-").map(Number);
  return `${d} ${HIJRI[lng(lang)][m - 1]} ${y}${lng(lang) === "ms" ? "H" : " AH"}`;
}
