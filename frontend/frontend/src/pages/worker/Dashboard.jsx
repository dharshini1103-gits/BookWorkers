import { useEffect, useState } from "react";
import api, { errMsg } from "../../api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { fmtDate, fmtTime, today, Stars, money } from "../../utils.jsx";

/* ---------- Booking requests ---------- */
function Requests() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const load = async () => {
    try { setRows((await api.get("/bookings/requests")).data); } catch (e) { setErr(errMsg(e)); }
  };
  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    try { await api.patch(`/bookings/${id}/status`, { status }); load(); }
    catch (e) { setErr(errMsg(e)); }
  };

  return (
    <>
      {err && <p className="error">{err}</p>}
      {!rows.length && <p className="muted">No booking requests yet.</p>}
      {rows.map((b) => (
        <div key={b.id} className="card booking">
          <div>
            <strong>{b.customer_name}</strong> <span className={`badge ${b.status}`}>{b.status}</span>
            {b.source === "voice" && <span className="badge voice">🎤 voice</span>}
            <div className="muted">{fmtDate(b.date)}, {fmtTime(b.start_time)} – {fmtTime(b.end_time)}</div>
            {b.fee != null && <div className="muted">Fee offered: <strong>{money(b.fee)}</strong></div>}
            {b.notes && <div className="muted">“{b.notes}”</div>}
          </div>
          <div className="row">
            {b.status === "pending" && (<><button className="btn small" onClick={() => act(b.id, "confirmed")}>Accept</button><button className="btn small ghost" onClick={() => act(b.id, "rejected")}>Reject</button></>)}
            {b.status === "confirmed" && (<><button className="btn small" onClick={() => act(b.id, "completed")}>Mark completed</button><button className="btn small ghost" onClick={() => act(b.id, "rejected")}>Cancel</button></>)}
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- Availability ---------- */
function Availability({ workerId }) {
  const [slots, setSlots] = useState([]);
  const [f, setF] = useState({ date: today(), start_time: "10:00", end_time: "11:00" });
  const [err, setErr] = useState("");
  const load = async () => {
    try { setSlots((await api.get(`/availability/worker/${workerId}`, { params: { only_free: false } })).data); }
    catch (e) { setErr(errMsg(e)); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault(); setErr("");
    try { await api.post("/availability", f); load(); } catch (e) { setErr(errMsg(e)); }
  };
  const del = async (id) => {
    try { await api.delete(`/availability/${id}`); load(); } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <>
      <form className="card row wrap" onSubmit={add}>
        <label>Date<input type="date" min={today()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></label>
        <label>From<input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} required /></label>
        <label>To<input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} required /></label>
        <button className="btn">Add slot</button>
      </form>
      {err && <p className="error">{err}</p>}
      {!slots.length && <p className="muted">No slots yet. Add your available times above.</p>}
      <div className="chips">
        {slots.map((s) => (
          <div key={s.id} className={`slot ${s.is_booked ? "booked" : ""}`}>
            {fmtDate(s.date)} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
            {s.is_booked ? <em> (booked)</em> : <button onClick={() => del(s.id)} title="Delete">✕</button>}
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Profile ---------- */
function Profile({ workerId }) {
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api.get(`/workers/${workerId}`).then((r) => setP(r.data)); }, [workerId]);
  if (!p) return <p className="muted">Loading…</p>;
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put("/workers/me/profile", {
        job: p.job, location: p.location, bio: p.bio,
        hourly_rate: p.hourly_rate === "" || p.hourly_rate == null ? null : Number(p.hourly_rate),
      });
      setMsg("Saved ✅");
    } catch (e) { setMsg(errMsg(e)); }
  };

  return (
    <form className="card form" onSubmit={save}>
      <p><Stars rating={p.avg_rating} count={p.review_count} /></p>
      <label>Job<input value={p.job} onChange={set("job")} /></label>
      <label>Location<input value={p.location} onChange={set("location")} /></label>
      <label>Hourly rate (₹)<input type="number" value={p.hourly_rate ?? ""} onChange={set("hourly_rate")} /></label>
      <label>Bio<textarea rows={3} value={p.bio} onChange={set("bio")} /></label>
      {msg && <p className="ok">{msg}</p>}
      <button className="btn">Save profile</button>
    </form>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("requests");
  return (
    <>
      <h2>Worker dashboard</h2>
      <div className="chips">
        {[["requests", "Booking requests"], ["availability", "My availability"], ["profile", "My profile"]].map(([k, label]) => (
          <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === "requests" && <Requests />}
      {tab === "availability" && <Availability workerId={user.user_id} />}
      {tab === "profile" && <Profile workerId={user.user_id} />}
    </>
  );
}
