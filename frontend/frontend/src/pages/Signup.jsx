import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import AuthShell from "../components/AuthShell.jsx";

export default function Signup() {
  const [f, setF] = useState({ name: "", email: "", password: "", role: "customer", job: "", location: "" });
  const [err, setErr] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      const { data } = await api.post("/auth/signup", f);
      login(data);
      nav(data.role === "worker" ? "/worker" : "/customer");
    } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <AuthShell>
      <form className="form-plain" onSubmit={submit}>
        <h2>Create your account</h2>
        <div className="role-switch">
          {[["customer", "🙋 I need a worker"], ["worker", "🧰 I am a worker"]].map(([r, label]) => (
            <button type="button" key={r} className={`role ${f.role === r ? "on" : ""}`} onClick={() => setF({ ...f, role: r })}>{label}</button>
          ))}
        </div>
        <label>Full name<input value={f.name} onChange={set("name")} required /></label>
        <label>Email<input type="email" value={f.email} onChange={set("email")} required /></label>
        <label>Password (min 6)<input type="password" minLength={6} value={f.password} onChange={set("password")} required /></label>
        {f.role === "worker" && (
          <>
            <label>Your job (e.g. plumber, painter)<input value={f.job} onChange={set("job")} required /></label>
            <label>Location (city)<input value={f.location} onChange={set("location")} required /></label>
          </>
        )}
        {err && <div className="alert">⚠️ {err}</div>}
        <button className="btn block">Sign up</button>
        <p className="muted">Have an account? <Link to="/login">Login</Link></p>
      </form>
    </AuthShell>
  );
}
