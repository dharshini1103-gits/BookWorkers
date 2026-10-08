import { useEffect, useRef, useState } from "react";
import api, { errMsg } from "../api.js";
import useSpeechRecognition from "../hooks/useSpeechRecognition.js";
import { availabilitySummary, dayLabel, fmtDate, fmtTime, isNo, isYes, money, parseAmount } from "../utils.jsx";

/*
  Step-by-step booking assistant:
  ask_book -> ask_datetime -> (check availability) -> ask_fee -> confirm -> booked
  Works by voice (mic) or by typing / tapping quick replies.
*/
export default function BookingAssistant({ worker, slots, onBooked, onChanged }) {
  const first = worker.name.split(" ")[0];
  const [msgs, setMsgs] = useState([]);
  const [step, setStepState] = useState("idle");
  const [alts, setAlts] = useState([]);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);

  const stepRef = useRef("idle");
  const draft = useRef({ date: null, time: null, slot: null, fee: null });
  const autoMic = useRef(false);
  const startRef = useRef(() => {});
  const speakRef = useRef(true);
  const slotsRef = useRef(slots);
  const endRef = useRef(null);
  speakRef.current = speakOn;
  slotsRef.current = slots;

  const setStep = (s) => { stepRef.current = s; setStepState(s); };
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  /* ---------- assistant talks ---------- */
  const ai = (text, kind = "info") => {
    setMsgs((m) => [...m, { from: "ai", text, kind }]);
    if (speakRef.current && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[\u26A0\u2705\uFE0F]/g, ""));
      u.lang = "en-IN";
      u.onend = () => {
        if (autoMic.current && !["idle", "done"].includes(stepRef.current)) startRef.current();
      };
      window.speechSynthesis.speak(u);
    }
  };

  const reset = () => { draft.current = { date: null, time: null, slot: null, fee: null }; setAlts([]); };

  const start = () => {
    window.speechSynthesis?.cancel();
    reset(); setMsgs([]);
    autoMic.current = supported;
    if (!slotsRef.current.length) {
      setStep("done");
      return ai(`⚠️ Sorry, ${first} has no free slots right now. Please check again later.`, "alert");
    }
    setStep("ask_book");
    ai(`Hi! I'm your booking assistant. ${first} is available ${availabilitySummary(slotsRef.current)}. Would you like to book?`);
  };

  const cancel = () => { setStep("idle"); reset(); ai("Okay, cancelled. Tap Start whenever you are ready."); };

  /* ---------- steps ---------- */
  const understand = async (text, expectTime) => {
    const { data } = await api.post("/voice/datetime", { text, expect: expectTime ? "time" : undefined });
    return data;
  };

  const runCheck = async () => {
    const d = draft.current;
    const req = { date: d.date, time: d.time };
    setBusy(true);
    try {
      const { data } = await api.post("/availability/check", { worker_id: worker.user_id, date: req.date, time: req.time });
      if (data.available) {
        d.slot = data.slot; setAlts([]); setStep("ask_fee");
        ai(`Good news! ${first} is available ${dayLabel(req.date)} at ${fmtTime(req.time)}. ${worker.hourly_rate ? `The usual rate is ${worker.hourly_rate} rupees per hour. ` : ""}What fee are you ready to pay?`, "ok");
      } else {
        d.date = null; d.time = null; d.slot = null;
        setAlts(data.alternatives); setStep("ask_datetime");
        const why = data.reason === "past" ? "That time has already passed." :
          `Sorry, ${first} is ${data.reason === "booked" ? "already booked" : "not available"} ${dayLabel(req.date)} at ${fmtTime(req.time)}.`;
        const alt = data.alternatives.slice(0, 3).map((a) => `${dayLabel(a.date)} at ${fmtTime(a.start_time)}`).join(", ");
        ai(`⚠️ ${why} ${alt ? `Nearest free times: ${alt}. Which one would you like?` : "Please try another date or time."}`, "alert");
      }
    } catch (e) { ai(`⚠️ ${errMsg(e)}`, "alert"); }
    setBusy(false);
  };

  const afterDatetime = () => {
    const d = draft.current;
    if (d.date && d.time) return runCheck();
    if (d.date) return ai(`${dayLabel(d.date)}, got it. At what time?`);
    if (d.time) return ai(`${fmtTime(d.time)}, got it. On which date?`);
  };

  const book = async () => {
    const d = draft.current;
    setBusy(true);
    try {
      const { data } = await api.post("/bookings", { slot_id: d.slot.id, fee: d.fee, source: "voice" });
      setStep("done");
      ai(`✅ Booked! ${first}, ${dayLabel(d.slot.date)} at ${fmtTime(d.slot.start_time)}. ${first} will confirm your request soon.`, "ok");
      onBooked?.(data);
    } catch (e) {
      reset(); setStep("ask_datetime"); onChanged?.();
      ai(`⚠️ ${errMsg(e)}. Please choose another time.`, "alert");
    }
    setBusy(false);
  };

  const handle = async (raw) => {
    const text = (raw || "").trim();
    const s = stepRef.current;
    if (!text || busy || ["idle", "done"].includes(s)) return;
    setMsgs((m) => [...m, { from: "me", text }]);
    const t = text.toLowerCase();
    const d = draft.current;
    try {
      if (s === "ask_book") {
        if (isNo(t) && !/\d/.test(t)) return cancel();
        const p = await understand(text);              // user may directly say "tomorrow at 5"
        if (p.date || p.time) { if (p.date) d.date = p.date; if (p.time) d.time = p.time; setStep("ask_datetime"); return afterDatetime(); }
        if (isYes(t)) { setStep("ask_datetime"); return ai("Great! Which date and time would you like? For example: tomorrow at 5 PM."); }
        return ai("Please say yes or no.");
      }
      if (s === "ask_datetime") {
        if (isNo(t) && !/\d/.test(t)) return cancel();
        const p = await understand(text, d.date && !d.time);
        if (!p.date && !p.time) return ai("Sorry, I didn't catch that. Please say a date and time, like tomorrow at 5 PM.");
        if (p.date) d.date = p.date;
        if (p.time) d.time = p.time;
        return afterDatetime();
      }
      if (s === "ask_fee") {
        if (/\b(skip|negotiable|any|whatever|not sure|you decide|later)\b/.test(t)) d.fee = null;
        else {
          const n = parseAmount(t);
          if (n == null) return ai("Please tell me the fee in rupees, for example 500. Or say skip.");
          d.fee = n;
        }
        setStep("confirm");
        return ai(`Let me confirm. ${first}, ${dayLabel(d.slot.date)} at ${fmtTime(d.slot.start_time)}, ${d.fee != null ? `fee ${d.fee} rupees` : "fee to be discussed"}. Shall I book it?`);
      }
      if (s === "confirm") {
        if (isNo(t)) return cancel();
        if (isYes(t)) return book();
        return ai("Please say yes to confirm, or no to cancel.");
      }
    } catch (e) { ai(`⚠️ ${errMsg(e)}`, "alert"); }
  };

  const { supported, listening, start: micStart } = useSpeechRecognition(handle);
  startRef.current = micStart;

  const tapMic = () => { window.speechSynthesis?.cancel(); autoMic.current = true; micStart(); };
  const send = (e) => { e.preventDefault(); if (typed.trim()) { handle(typed); setTyped(""); } };

  const pickSlot = (a) => {
    draft.current.date = a.date; draft.current.time = a.start_time;
    setMsgs((m) => [...m, { from: "me", text: `${dayLabel(a.date)} at ${fmtTime(a.start_time)}` }]);
    runCheck();
  };

  const d = draft.current;
  const quick = {
    ask_book: ["Yes", "No"],
    ask_fee: [...(worker.hourly_rate ? [String(worker.hourly_rate)] : []), "Skip"],
    confirm: ["Yes, confirm", "No, cancel"],
  }[step];

  /* ---------- UI ---------- */
  if (step === "idle" && !msgs.length) {
    return (
      <div className="assistant-start">
        <div className="bigmic">🎤</div>
        <p>Let the assistant book {first} for you. It will tell you the availability, then ask the date, time and your fee.</p>
        <button className="btn block" onClick={start}>Start voice booking</button>
        {!supported && <p className="muted small">Voice input needs Chrome or Edge. You can still type your answers.</p>}
      </div>
    );
  }

  const active = !["idle", "done"].includes(step);
  const slotChips = step === "ask_datetime" ? (alts.length ? alts : slots.slice(0, 5)) : [];

  return (
    <div className="assistant">
      <div className="chat">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.from} ${m.kind || ""}`}>{m.from === "ai" && <span className="who-ai">🤖</span>}{m.text}</div>
        ))}
        {busy && <div className="bubble ai typing">…</div>}
        {step === "confirm" && d.slot && (
          <div className="summary">
            <div><b>Worker</b><span>{worker.name}</span></div>
            <div><b>When</b><span>{fmtDate(d.slot.date)}, {fmtTime(d.slot.start_time)}</span></div>
            <div><b>Fee</b><span>{d.fee != null ? money(d.fee) : "To be discussed"}</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {active && (
        <>
          {slotChips.length > 0 && (
            <div className="chips tight">
              {slotChips.map((a) => <button key={a.id} className="chip" disabled={busy} onClick={() => pickSlot(a)}>{fmtDate(a.date)} · {fmtTime(a.start_time)}</button>)}
            </div>
          )}
          {quick && (
            <div className="chips tight">
              {quick.map((q) => <button key={q} className="chip" disabled={busy} onClick={() => handle(q)}>{/^\d+$/.test(q) ? `₹${q}` : q}</button>)}
            </div>
          )}
          <form className="chat-input" onSubmit={send}>
            <button type="button" className={`mic sm ${listening ? "live" : ""}`} onClick={tapMic} disabled={!supported || busy} title={supported ? "Tap and speak" : "Voice needs Chrome/Edge"}>🎤</button>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={listening ? "Listening…" : "Type your answer…"} />
            <button className="btn small" disabled={busy}>Send</button>
          </form>
        </>
      )}

      <div className="assistant-foot">
        <button className="linkbtn" onClick={() => setSpeakOn(!speakOn)}>{speakOn ? "🔊 Voice replies on" : "🔇 Voice replies off"}</button>
        {(step === "done" || step === "idle") && <button className="linkbtn" onClick={start}>↻ Start again</button>}
        {active && <button className="linkbtn" onClick={cancel}>Cancel</button>}
      </div>
    </div>
  );
}
