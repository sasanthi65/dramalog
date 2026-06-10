import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "../lib/supabase";

export default function Login() {
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
      setLoading(false);
      return;
    }

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      navigate("/watchlist");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "48px 32px",
        maxWidth: "400px",
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <h1 style={{
          fontSize: "28px",
          fontWeight: "600",
          color: "#1a1a1a",
          margin: "0 0 8px",
          textAlign: "center"
        }}>
          DramaLog
        </h1>
        <p style={{
          fontSize: "14px",
          color: "#999",
          textAlign: "center",
          margin: "0 0 32px"
        }}>
          Your personal K-drama tracker
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "500",
              color: "#333",
              marginBottom: "6px"
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                boxSizing: "border-box",
                transition: "border 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#ddd"}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "500",
              color: "#333",
              marginBottom: "6px"
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                boxSizing: "border-box",
                transition: "border 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#ddd"}
            />
          </div>

          {error && (
            <div style={{
              background: "#ffe6e6",
              color: "#d32f2f",
              padding: "10px 12px",
              borderRadius: "8px",
              fontSize: "13px",
              border: "1px solid #ffcccc"
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
              opacity: loading ? 0.7 : 1,
              marginTop: "8px"
            }}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p style={{
          fontSize: "14px",
          color: "#666",
          textAlign: "center",
          marginTop: "24px",
          marginBottom: "0"
        }}>
          Don't have an account?{" "}
          <Link
            to="/signup"
            style={{
              color: "#667eea",
              textDecoration: "none",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
