export function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

const MON = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];

// Builds an e-solat style response for every day between datestart and dateend.
export function esolatResponse(datestart, dateend) {
  const out = [];
  let t = Date.parse(datestart + "T00:00:00Z");
  const end = Date.parse(dateend + "T00:00:00Z");
  for (; t <= end; t += 864e5) {
    const d = new Date(t);
    out.push({
      hijri: "1448-06-07",
      date: `${String(d.getUTCDate()).padStart(2, "0")}-${MON[d.getUTCMonth()]}-${d.getUTCFullYear()}`,
      imsak: "05:39:00", fajr: "05:49:00", syuruk: "06:58:00", dhuhr: "13:01:00",
      asr: "16:23:00", maghrib: "18:59:00", isha: "20:12:00",
    });
  }
  return { status: "OK!", prayerTime: out };
}

// fetchFn that answers like e-solat; `fail(url, body)` returning true makes it reject.
export function fakeFetch({ fail = () => false, json } = {}) {
  const calls = [];
  const fn = async (url, opts) => {
    const body = String(opts?.body ?? "");
    calls.push({ url, method: opts?.method, body });
    if (fail(url, body)) throw new TypeError("Failed to fetch");
    const p = new URLSearchParams(body);
    const payload = json ?? esolatResponse(p.get("datestart"), p.get("dateend"));
    return { ok: true, json: async () => payload };
  };
  fn.calls = calls;
  return fn;
}
