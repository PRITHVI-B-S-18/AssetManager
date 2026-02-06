import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signUp } from "../services/auth";
import logo from "../assets/logo.png";

export function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign up failed. Email may already be in use."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <img src={logo} alt="iamneo" className="login-logo" />
        <h1>Asset Manager</h1>
        <p>Create an account (view-only by default)</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="input-group">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
