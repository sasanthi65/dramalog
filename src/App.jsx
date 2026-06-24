import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { useToast } from "./hooks/useToast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Watchlist from "./pages/Watchlist";
import Analytics from "./pages/Analytics";
import Toast from "./components/Toast";
import "./main.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user || null);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontSize: "18px",
        color: "white",
        fontWeight: "500"
      }}>
        Loading DramaLog...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/watchlist" /> : <Login showToast={showToast} />} />
        <Route path="/signup" element={user ? <Navigate to="/watchlist" /> : <Signup showToast={showToast} />} />
        <Route path="/watchlist" element={user ? <Watchlist user={user} showToast={showToast} /> : <Navigate to="/login" />} />
        <Route path="/analytics" element={user ? <Analytics user={user} showToast={showToast} /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? "/watchlist" : "/login"} />} />
      </Routes>

      {/* Toast container */}
      <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 1999 }}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onRemove={removeToast}
          />
        ))}
      </div>
    </Router>
  );
}
