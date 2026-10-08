import { useState } from "react";
import api, { errMsg } from "../api.js";
import useSpeechRecognition from "../hooks/useSpeechRecognition.js";
import { fmtDate, fmtTime } from "../utils.jsx";

const speak = (text) => {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  window.speechSynthesis.speak(u);
};

export default function VoiceAgent({ onBooked }) {
  const [heard, setHeard] = useState("");
  const [msg, setMsg] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const say = (m) => { setMsg(m); speak(m); };

  const confirm = async (slotId) => {
    setBusy(true);
    try {
      const { data } = await api.post("/bookings", { slot_id: slotId, source: "voice" });
      setSuggestions([]);
      setDone(data);
      say(`Booked with ${data.worker_name} on ${fmtDate(data.date)} at ${fmtTime(data.start_time)}.`);
      onBooked?.(data);
    } catch (e) {
      say(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleText = async (text) => {
    setHeard(text);
    setDone(null);
    const t = text.toLowerCase();

    // while a suggestion is waiting, "yes" / "no" answer it
    if (suggestions.length) {
      if (/\b(yes|yeah|confirm|ok|okay|sure|book it|do it)\b/.test(t)) return confirm(suggestions[0].slot_id);
      if (/\b(no|cancel|stop|nope)\b/.test(t)) { setSuggestions([]); return say("Okay, cancelled."); }
    }

    setBusy(true);
    try {
      const { data } = await api.post("/voice/parse", { text });
      setSuggestions(data.suggestions);
      say(data.message);
    } catch (e) {
      setSuggestions([]);
      say(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const { supported, listening, start } = useSpeechRecognition(handleText);

  const submitTyped = (e) => {
    e.preventDefault();
    if (typed.trim()) { handleText(typed.trim()); setTyped(""); }
  };

  return (
    <section className="card voice">
      <div className="voice-top">
        <button className={`mic ${listening ? "live" : ""}`} onClick={start} disabled={!supported || busy} title={supported ? "Tap and speak" : "Use Chrome or Edge for voice"}>
          🎤
        </button>
        <div>
          <h3>Voice booking</h3>
          <p className="muted">
            {supported
              ? listening ? "Listening…" : <>Tap the mic and say: <em>"Book a plumber tomorrow at 5 PM in Chennai"</em></>
              : "Voice is not supported in this browser (use Chrome/Edge). You can type the command below."}
          </p>
        </div>
      </div>

      <form onSubmit={submitTyped} className="row">
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="…or type: book an electrician friday at 10 am" />
        <button className="btn" disabled={busy}>Send</button>
      </form>

      {heard && <p className="muted">You said: “{heard}”</p>}
      {msg && <p className="agent-msg">🤖 {msg}</p>}

      {suggestions.map((s, i) => (
        <div key={s.slot_id} className="suggestion">
          <div>
            <strong>{s.worker_name}</strong> · {s.job} · 📍 {s.location} · ★ {s.avg_rating || "New"}
            <div className="muted">{fmtDate(s.date)}, {fmtTime(s.start_time)} – {fmtTime(s.end_time)}{i === 0 ? " · best match" : ""}</div>
          </div>
          <button className="btn small" disabled={busy} onClick={() => confirm(s.slot_id)}>Confirm</button>
        </div>
      ))}
      {suggestions.length > 0 && <button className="btn small ghost" onClick={() => { setSuggestions([]); say("Okay, cancelled."); }}>Cancel</button>}

      {done && <p className="ok">✅ Booking #{done.id} saved (status: {done.status}).</p>}
    </section>
  );
}
