import { useEffect, useState } from "react";
import api, { errMsg } from "../../api.js";
import { fmtDate, fmtTime, money } from "../../utils.jsx";

function ReviewForm({ booking, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    try {
      await api.post("/reviews", { booking_id: booking.id, rating, comment });
      onDone();
    } catch (e) { setErr(errMsg(e)); }
  };
  return (
    <div className="review-form">
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
      </select>
      <input placeholder="Write a review" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn small" onClick={submit}>Submit</button>
      {err && <span className="error">{err}</span>}
    </div>
  );
}

export default function MyBookings() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [reviewing, setReviewing] = useState(null);

  const load = async () => {
    try { setRows((await api.get("/bookings/my")).data); } catch (e) { setErr(errMsg(e)); }
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    try { await api.patch(`/bookings/${id}/status`, { status: "cancelled" }); load(); }
    catch (e) { setErr(errMsg(e)); }
  };

  return (
    <>
      <h2>My bookings</h2>
      {err && <p className="error">{err}</p>}
      {!rows.length && <p className="muted">No bookings yet.</p>}
      {rows.map((b) => (
        <div key={b.id} className="card booking">
          <div>
            <strong>{b.worker_name}</strong> <span className={`badge ${b.status}`}>{b.status}</span>
            {b.source === "voice" && <span className="badge voice">🎤 voice</span>}
            <div className="muted">{fmtDate(b.date)}, {fmtTime(b.start_time)} – {fmtTime(b.end_time)}</div>
            {b.fee != null && <div className="muted">Fee offered: <strong>{money(b.fee)}</strong></div>}
            {b.notes && <div className="muted">“{b.notes}”</div>}
          </div>
          <div>
            {["pending", "confirmed"].includes(b.status) && <button className="btn small ghost" onClick={() => cancel(b.id)}>Cancel</button>}
            {b.status === "completed" && <button className="btn small" onClick={() => setReviewing(reviewing === b.id ? null : b.id)}>Review</button>}
          </div>
          {reviewing === b.id && <ReviewForm booking={b} onDone={() => { setReviewing(null); load(); }} />}
        </div>
      ))}
    </>
  );
}
