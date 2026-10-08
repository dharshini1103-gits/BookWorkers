import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errMsg } from "../../api.js";
import BookingPanel from "../../components/BookingPanel.jsx";
import { Stars, cap, iconFor, money } from "../../utils.jsx";

export default function WorkerProfile() {
  const { id } = useParams();
  const [w, setW] = useState(null);
  const [slots, setSlots] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const [a, b] = await Promise.all([api.get(`/workers/${id}`), api.get(`/availability/worker/${id}`)]);
      setW(a.data); setSlots(b.data);
    } catch (e) { setErr(errMsg(e)); }
  };
  useEffect(() => { setW(null); load(); }, [id]); // eslint-disable-line

  if (!w) return err ? <div className="alert">⚠️ {err}</div> : <p className="muted">Loading…</p>;

  return (
    <>
      <Link to={`/customer/category/${encodeURIComponent(w.job)}`} className="back">← Back to {w.job}s</Link>

      <section className="card profile-head">
        <div className="avatar big">{w.name[0]?.toUpperCase()}</div>
        <div className="ph-body">
          <h2>{w.name}</h2>
          <p className="muted">{iconFor(w.job)} {cap(w.job)} · 📍 {w.location}</p>
          <div className="wc-meta">
            <Stars rating={w.avg_rating} count={w.review_count} />
            {w.hourly_rate ? <span className="price">{money(w.hourly_rate)}/hr</span> : null}
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <div className="left-col">
          <section className="card">
            <h3>About</h3>
            <p>{w.bio || "No bio yet."}</p>
          </section>

          <section className="card">
            <h3>Reviews <span className="count">{w.review_count}</span></h3>
            {!w.reviews.length && <p className="muted">No reviews yet.</p>}
            {w.reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="review-top">
                  <div className="avatar xs">{r.customer_name[0]?.toUpperCase()}</div>
                  <strong>{r.customer_name}</strong>
                  <span className="stars">{"★".repeat(r.rating)}<span className="off">{"★".repeat(5 - r.rating)}</span></span>
                </div>
                {r.comment && <p>{r.comment}</p>}
              </div>
            ))}
          </section>
        </div>

        <div className="right-col">
          <BookingPanel worker={w} slots={slots} reload={load} />
        </div>
      </div>
    </>
  );
}
