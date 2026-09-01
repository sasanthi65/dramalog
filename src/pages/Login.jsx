import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "../lib/supabase";
import AuthShowcase from "../components/AuthShowcase";
import "./Auth.css";

export default function Login({ showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      showToast("Please fill in all fields", "error");
      setLoading(false);
      return;
    }

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError(authError.message);
      showToast(`Login failed: ${authError.message}`, "error");
      setLoading(false);
    } else {
      showToast("Login successful! Welcome back.", "success");
      navigate("/watchlist");
    }
  };

  return (
    <div className="auth-page">
      <AuthShowcase quote="&ldquo;Every drama you&rsquo;ve lived through, in one place.&rdquo;" />

      <section className="auth-panel">
        <div className="auth-panel__blob auth-panel__blob--top" aria-hidden="true" />
        <div className="auth-panel__blob auth-panel__blob--bottom" aria-hidden="true" />

        <div className="auth-panel__inner">
          <div className="glass-effect auth-card">
            <header className="auth-card__header">
              <h1>Welcome back</h1>
              <p>Sign in to continue your cinematic journey</p>
            </header>

            {error && (
              <div className="error-banner" role="alert" style={{ marginBottom: "var(--margin-md)" }}>
                <span className="material-symbols-outlined" aria-hidden="true">error</span>
                <span>{error}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleLogin}>
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
                  autoComplete="current-password"
                  aria-label="Password"
                />
              </label>

              <div className="auth-form__row">
                <label className="auth-form__check">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button
                  className="auth-form__link"
                  type="button"
                  onClick={() => showToast("Password resets are coming soon", "info")}
                >
                  Forgot password?
                </button>
              </div>

              <button className="btn btn--press" type="submit" disabled={loading}>
                {loading ? "Logging in…" : "Log in"}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <p className="auth-footer">
              Don&rsquo;t have an account?
              <Link to="/signup">Sign up</Link>
            </p>
          </div>

          <p className="auth-legal">DramaLog Cinematic Tracking © {new Date().getFullYear()}</p>
        </div>
      </section>
    </div>
  );
}
