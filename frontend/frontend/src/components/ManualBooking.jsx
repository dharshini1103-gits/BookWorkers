import { useEffect, useState } from "react";
import api, { errMsg } from "../api.js";
import { dayLabel, fmtDate, fmtTime, today } from "../utils.jsx";

export default function ManualBooking({ worker, prefill, onBooked, onChanged }) {
  const first = worker.name.split(" ")[0];
  const [f, setF] = useState({ date: "", time: "", fee: "", notes: "" });
  const [res, setRes] = useState(null);   // availability result
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefill) { setF((x) => ({ ...x, date: prefill.date, time: prefill.start_time })); setRes(null); }
  }, [prefill]);

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (k === "date" || k === "time") setRes(null); };

  const check = async (date = f.date, time = f.time) => {
    if (!date || !time) return setErr("Please choose a date and a time");
    setBusy(true); setErr("");
    try {
      const { data } = await api.post("/availability/check", { worker_id: worker.user_id, date, time });
      setRes({ ...data, req: { date, time } });
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  const confirm = async () => {
    setBusy(true); setErr("");
    try {
      const { data } = await api.post("/bookings", {
        slot_id: res.slot.id, notes: f.notes, source: "manual",
        fee: f.fee === "" ? null : Number(f.fee),
      });
      onBooked(data);
    } catch (e) { setErr(errMsg(e)); setRes(null); onChanged?.(); }
    setBusy(false);
  };

  const useAlt = (a) => { setF({ ...f, date: a.date, time: a.start_time }); check(a.date, a.start_time); };

  return (
    <div className="manual">
      <div className="grid2">
        <label>Date<input type="date" min={today()} value={f.date} onChange={set("date")} /></label>
        <label>Time<input type="time" value={f.time} onChange={set("time")} /></label>
      </div>
      <label>Fee you are ready to pay (₹)
        <input type="number" min="0" placeholder={worker.hourly_rate ? `Usual rate: ₹${worker.hourly_rate}/hr` : "e.g. 500"} value={f.fee} onChange={set("fee")} />
      </label>
      <label>Notes (optional)
        <textarea rows={2} placeholder="Describe the work / your address" value={f.notes} onChange={set("notes")} />
      </label>

      {err && <div className="alert">⚠️ {err}</div>}

      {res && !res.available && (
        <div className="alert">
          ⚠️ <strong>{first} is {res.reason === "past" ? "not bookable at a past time" : res.reason === "booked" ? "already booked" : "not available"}</strong>
          {res.reason !== "past" && <> {dayLabel(res.req.date)} at {fmtTime(res.req.time)}</>}.
          {res.alternatives.length > 0 && (
            <>
              <div className="alt-title">Nearest free times:</div>
              <div className="chips">
                {res.alternatives.map((a) => (
                  <button type="button" key={a.id} className="chip" onClick={() => useAlt(a)}>{fmtDate(a.date)} · {fmtTime(a.start_time)}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {res?.available && (
        <div className="okbox">
          ✅ <strong>{first} is available</strong> on {fmtDate(res.slot.date)}, {fmtTime(res.slot.start_time)} – {fmtTime(res.slot.end_time)}
          {f.fee !== "" && <> · Fee ₹{f.fee}</>}
        </div>
      )}

      {res?.available
        ? <button className="btn block" onClick={confirm} disabled={busy}>Confirm booking</button>
        : <button className="btn block" onClick={() => check()} disabled={busy}>Check availability</button>}
    </div>
  );
}
