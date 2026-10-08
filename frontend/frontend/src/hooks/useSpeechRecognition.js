import { useRef, useState } from "react";

// Browser speech-to-text (free). Works best in Chrome / Edge.
export default function useSpeechRecognition(onText) {
  const [listening, setListening] = useState(false);
  const cb = useRef(onText);
  cb.current = onText;
  const active = useRef(false);
  const recRef = useRef(null);

  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = !!SR;

  const start = () => {
    if (!SR || active.current) return;
    const r = new SR();
    r.lang = "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => cb.current(e.results[0][0].transcript);
    const end = () => { active.current = false; setListening(false); };
    r.onend = end;
    r.onerror = end;
    recRef.current = r;
    active.current = true;
    setListening(true);
    try { r.start(); } catch { end(); }
  };

  const stop = () => recRef.current?.stop();
  return { supported, listening, start, stop };
}
