import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import AuthShell from "../components/AuthShell.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data);
      nav(data.role === "worker" ? "/worker" : "/customer");
    } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <AuthShell>
      <form className="form-plain" onSubmit={submit}>
        <h2>Welcome back 👋</h2>
        <p className="muted">Login as a customer or a worker.</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <div className="alert">⚠️ {err}</div>}
        <button className="btn block">Login</button>
        <p className="muted">New here? <Link to="/signup">Create an account</Link></p>
        <p className="muted small">Demo: customer@test.com or ravi@test.com · password 123456</p>
      </form>
    </AuthShell>
  );
}
