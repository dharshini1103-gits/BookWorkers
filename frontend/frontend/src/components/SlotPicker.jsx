import { useMemo, useState } from "react";
import { fmtDate, fmtTime } from "../utils.jsx";

// Shows free dates as chips; picking a date shows its free time slots.
export default function SlotPicker({ slots, selected, onSelect }) {
  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))], [slots]);
  const [date, setDate] = useState(dates[0] || null);
  const active = date && dates.includes(date) ? date : dates[0];

  if (!slots.length) return <p className="muted">No free slots right now.</p>;

  return (
    <div>
      <div className="chips">
        {dates.map((d) => (
          <button key={d} type="button" className={`chip ${d === active ? "on" : ""}`} onClick={() => setDate(d)}>
            {fmtDate(d)}
          </button>
        ))}
      </div>
      <div className="chips">
        {slots.filter((s) => s.date === active).map((s) => (
          <button key={s.id} type="button" className={`chip time ${selected === s.id ? "on" : ""}`} onClick={() => onSelect(s.id)}>
            {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
          </button>
        ))}
      </div>
    </div>
  );
}
