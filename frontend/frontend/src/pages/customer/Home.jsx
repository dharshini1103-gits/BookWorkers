import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { cap, iconFor } from "../../utils.jsx";

const TONES = ["#e0e7ff", "#fce7f3", "#dcfce7", "#fef3c7", "#e0f2fe", "#fae8ff", "#ffedd5", "#ccfbf1"];

export default function Home() {
  const { user } = useAuth();
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/workers/categories").then((r) => setCats(r.data)).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false));
  }, []);

  const shown = cats.filter((c) => c.job.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <section className="hero">
        <p className="hello">Hi {user?.name?.split(" ")[0]} 👋</p>
        <h1>What service do you need today?</h1>
        <input className="hero-search" placeholder="Search a service: plumber, painter…" value={q} onChange={(e) => setQ(e.target.value)} />
      </section>

      {err && <div className="alert">⚠️ {err}</div>}
      {loading && <p className="muted">Loading services…</p>}
      {!loading && !shown.length && <p className="muted">No service found{q ? ` for “${q}”` : ""}.</p>}

      <div className="cat-grid">
        {shown.map((c, i) => (
          <Link key={c.job} to={`/customer/category/${encodeURIComponent(c.job)}`} className="cat" style={{ "--tone": TONES[i % TONES.length] }}>
            <div className="cat-icon">{iconFor(c.job)}</div>
            <h3>{cap(c.job)}</h3>
            <p>{c.count} {c.count === 1 ? "worker" : "workers"}{c.avg_rating ? ` · ★ ${c.avg_rating.toFixed(1)}` : ""}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
