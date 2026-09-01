import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signUp } from "../lib/supabase";
import AuthShowcase from "../components/AuthShowcase";
import "./Auth.css";

export default function Signup({ showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      showToast("Please fill in all fields", "error");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      showToast("Passwords do not match", "error");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      showToast("Password must be at least 6 characters", "error");
      setLoading(false);
      return;
    }

    const { error: authError } = await signUp(email, password);

    if (authError) {
      setError(authError.message);
      showToast(`Signup failed: ${authError.message}`, "error");
      setLoading(false);
    } else {
      showToast("Account created! Please log in.", "success");
      navigate("/login");
    }
  };

  return (
    <div className="auth-page">
      <AuthShowcase quote="&ldquo;Start the scrapbook of every story you fall for.&rdquo;" />

      <section className="auth-panel">
        <div className="auth-panel__blob auth-panel__blob--top" aria-hidden="true" />
        <div className="auth-panel__blob auth-panel__blob--bottom" aria-hidden="true" />

        <div className="auth-panel__inner">
          <div className="glass-effect auth-card">
            <header className="auth-card__header">
              <h1>Create your account</h1>
              <p>Your personal K-drama scrapbook starts here</p>
            </header>

            {error && (
              <div className="error-banner" role="alert" style={{ marginBottom: "var(--margin-md)" }}>
                <span className="material-symbols-outlined" aria-hidden="true">error</span>
                <span>{error}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSignup}>
              <label className="ghost-field">
                <span className="material-symbols-outlined" aria-hidden="true">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  aria-label="Email"
                />
              </label>

              <label className="ghost-field">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="new-password"
                  aria-label="Password"
                />
              </label>
              <p className="auth-hint">At least 6 characters.</p>

              <label className="ghost-field">
                <span className="material-symbols-outlined" aria-hidden="true">lock_reset</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  aria-label="Confirm password"
                />
              </label>

              <button className="btn btn--press" type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <p className="auth-footer">
              Already have an account?
              <Link to="/login">Log in</Link>
            </p>
          </div>

          <p className="auth-legal">DramaLog Cinematic Tracking © {new Date().getFullYear()}</p>
        </div>
      </section>
    </div>
  );
}
