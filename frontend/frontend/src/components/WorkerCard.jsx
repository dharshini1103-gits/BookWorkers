import { Link } from "react-router-dom";
import { Stars, money } from "../utils.jsx";

export default function WorkerCard({ w }) {
  return (
    <Link to={`/customer/worker/${w.user_id}`} className="card worker-card">
      <div className="avatar">{w.name[0]?.toUpperCase()}</div>
      <div className="wc-body">
        <h3>{w.name}</h3>
        <p className="muted">📍 {w.location || "—"}</p>
        <div className="wc-meta">
          <Stars rating={w.avg_rating} count={w.review_count} />
          {w.hourly_rate ? <span className="price">{money(w.hourly_rate)}/hr</span> : null}
        </div>
      </div>
      <span className="arrow">→</span>
    </Link>
  );
}
