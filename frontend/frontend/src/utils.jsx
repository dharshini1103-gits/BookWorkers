const pad = (n) => String(n).padStart(2, "0");

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${pad(m)} ${ap}`;
};

export const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

// "today", "tomorrow" or "Friday, 9 October"  (used in sentences the assistant speaks)
export const dayLabel = (iso) => {
  const t = new Date(today() + "T00:00:00");
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d - t) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
};

export const money = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const ICONS = {
  plumber: "🔧", electrician: "⚡", carpenter: "🔨", painter: "🎨", cleaner: "🧹",
  mechanic: "🚗", "ac technician": "❄️", driver: "🚕", gardener: "🌿",
};
export const iconFor = (job) => ICONS[(job || "").toLowerCase()] || "🛠️";

const joinList = (arr) => (arr.length < 2 ? arr.join("") : arr.slice(0, -1).join(", ") + " and " + arr.at(-1));

// "tomorrow at 10:00 AM, 2:00 PM and 5:00 PM; Saturday, 10 October at ..."
export const availabilitySummary = (slots) => {
  const byDate = {};
  slots.forEach((s) => (byDate[s.date] ||= []).push(fmtTime(s.start_time)));
  const dates = Object.keys(byDate).sort();
  const parts = dates.slice(0, 3).map((d) => `${dayLabel(d)} at ${joinList(byDate[d])}`);
  return parts.join("; ") + (dates.length > 3 ? "; and more days after that" : "");
};

/* ---- understanding what the customer said ---- */
export const isYes = (t) => /\b(yes|yeah|yep|yup|sure|ok|okay|confirm|please|go ahead|do it|correct|right|book it|book)\b/i.test(t);
export const isNo = (t) => /\b(no|nope|nah|cancel|stop|not now|never mind|dont|don't)\b/i.test(t);

const WORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

// "500", "₹1,200", "2k", "five hundred", "one thousand five hundred"  ->  number (or null)
export const parseAmount = (text) => {
  const t = text.toLowerCase().replace(/,/g, "");
  const m = t.match(/(\d+(?:\.\d+)?)\s*(k|thousand|hundred)?/);
  if (m) {
    let n = parseFloat(m[1]);
    if (m[2] === "k" || m[2] === "thousand") n *= 1000;
    else if (m[2] === "hundred") n *= 100;
    return n;
  }
  let total = 0, cur = 0, found = false;
  for (const w of t.split(/[^a-z]+/)) {
    if (w in WORDS) { cur += WORDS[w]; found = true; }
    else if (w === "hundred") { cur = (cur || 1) * 100; found = true; }
    else if (w === "thousand") { total += (cur || 1) * 1000; cur = 0; found = true; }
  }
  return found ? total + cur : null;
};

export function Stars({ rating, count }) {
  return (
    <span className="stars">
      ★ {rating ? rating.toFixed(1) : "New"}
      {count !== undefined && <small> ({count})</small>}
    </span>
  );
}
