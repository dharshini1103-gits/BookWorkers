import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="navbar">
      <Link to="/" className="brand"><span className="logo">🛠️</span> BookWorker</Link>
      <nav>
        {!user && (<><NavLink to="/login">Login</NavLink><NavLink to="/signup" className="btn small">Sign up</NavLink></>)}
        {user?.role === "customer" && (<><NavLink to="/customer" end>Services</NavLink><NavLink to="/customer/bookings">My bookings</NavLink></>)}
        {user?.role === "worker" && <NavLink to="/worker">Dashboard</NavLink>}
        {user && (
          <>
            <span className="who"><span className="dot" />{user.name} · {user.role}</span>
            <button className="btn small ghost" onClick={() => { logout(); nav("/login"); }}>Logout</button>
          </>
        )}
      </nav>
    </header>
  );
}
