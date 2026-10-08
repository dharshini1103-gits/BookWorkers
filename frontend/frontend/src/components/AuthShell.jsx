export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <div className="auth-hero">
        <h1>Find a trusted worker.<br />Book in a minute.</h1>
        <ul>
          <li>🔎 Pick a service: plumber, painter, electrician…</li>
          <li>⭐ Read real reviews on every profile</li>
          <li>🎤 Book by voice or by typing: your choice</li>
        </ul>
      </div>
      <div className="auth-form">{children}</div>
    </div>
  );
}
