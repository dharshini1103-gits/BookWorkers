import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BookingAssistant from "./BookingAssistant.jsx";
import ManualBooking from "./ManualBooking.jsx";
import { fmtDate, fmtTime, money } from "../utils.jsx";

export default function BookingPanel({ worker, slots, reload }) {
  const [mode, setMode] = useState("voice");
  const [prefill, setPrefill] = useState(null);
  const [booked, setBooked] = useState(null);
  const first = worker.name.split(" ")[0];

  const byDate = useMemo(() => {
    const g = {};
    slots.forEach((s) => (g[s.date] ||= []).push(s));
    return Object.entries(g);
  }, [slots]);

  const pick = (s) => { setPrefill({ ...s }); setMode("manual"); };
  const onBooked = (b) => { setBooked(b); reload(); };

  return (
    <aside className="card book-panel">
      <h3>Book {first}</h3>

      <div className="avail">
        <div className="avail-title">Available slots {slots.length ? <span className="count">{slots.length}</span> : null}</div>
        {!slots.length && <p className="muted">No free slots right now. Please check back later.</p>}
        {byDate.slice(0, 4).map(([date, list]) => (
          <div key={date} className="avail-row">
            <span className="avail-date">{fmtDate(date)}</span>
            <div className="chips tight">
              {list.map((s) => <button key={s.id} className="chip time" onClick={() => pick(s)} title="Use this slot in manual booking">{fmtTime(s.start_time)}</button>)}
            </div>
          </div>
        ))}
        {byDate.length > 4 && <p className="muted small">+ {byDate.length - 4} more days</p>}
      </div>

      {booked ? (
        <div className="success">
          <div className="tick">✅</div>
          <h4>Booking requested!</h4>
          <p>{fmtDate(booked.date)}, {fmtTime(booked.start_time)} – {fmtTime(booked.end_time)}{booked.fee != null ? ` · ${money(booked.fee)}` : ""}</p>
          <p className="muted">{first} will accept or reject your request.</p>
          <Link to="/customer/bookings" className="btn block">View my bookings</Link>
          <button className="btn ghost block" onClick={() => setBooked(null)}>Book another time</button>
        </div>
      ) : (
        <>
          <div className="tabs">
            <button className={mode === "voice" ? "on" : ""} onClick={() => setMode("voice")}>🎤 Voice assistant</button>
            <button className={mode === "manual" ? "on" : ""} onClick={() => setMode("manual")}>✍️ Manual</button>
          </div>
          {mode === "voice"
            ? <BookingAssistant worker={worker} slots={slots} onBooked={onBooked} onChanged={reload} />
            : <ManualBooking worker={worker} prefill={prefill} onBooked={onBooked} onChanged={reload} />}
        </>
      )}
    </aside>
  );
}
