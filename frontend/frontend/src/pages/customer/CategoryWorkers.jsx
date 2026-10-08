import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errMsg } from "../../api.js";
import WorkerCard from "../../components/WorkerCard.jsx";
import { cap, iconFor } from "../../utils.jsx";

export default function CategoryWorkers() {
  const { job } = useParams();
  const [q, setQ] = useState({ name: "", location: "", min_rating: "0", sort: "rating" });
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setQ({ ...q, [k]: e.target.value });

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true); setErr("");
      try {
        const params = { job, ...Object.fromEntries(Object.entries(q).filter(([, v]) => v !== "")) };
        setWorkers((await api.get("/workers", { params })).data);
      } catch (e) { setErr(errMsg(e)); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [job, q]);

  return (
    <>
      <Link to="/customer" className="back">← All services</Link>
      <div className="page-head">
        <div className="cat-icon big">{iconFor(job)}</div>
        <div>
          <h2>{cap(job)}s</h2>
          <p className="muted">Choose a worker to see reviews and available times.</p>
        </div>
      </div>

      <div className="filters">
        <input placeholder="Search by name" value={q.name} onChange={set("name")} />
        <input placeholder="Location" value={q.location} onChange={set("location")} />
        <select value={q.min_rating} onChange={set("min_rating")}>
          <option value="0">Any rating</option>
          <option value="3">3★ & up</option>
          <option value="4">4★ & up</option>
          <option value="4.5">4.5★ & up</option>
        </select>
        <select value={q.sort} onChange={set("sort")}>
          <option value="rating">Top rated</option>
          <option value="reviews">Most reviews</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {err && <div className="alert">⚠️ {err}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !workers.length && <p className="muted">No {job} found with these filters.</p>}
      <div className="grid">{workers.map((w) => <WorkerCard key={w.user_id} w={w} />)}</div>
    </>
  );
}
