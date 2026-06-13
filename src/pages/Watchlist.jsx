import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getDramas, signOut, updateDrama } from "../lib/supabase";
import AddDramaModal from "../components/AddDramaModal";
import DramaDetailModal from "../components/DramaDetailModal_UPGRADED";

export default function Watchlist({ user }) {
  const navigate = useNavigate();
  const [dramas, setDramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDrama, setSelectedDrama] = useState(null);

  const fetchUserDramas = useCallback(() => getDramas(user.id), [user.id]);

  const loadDramas = useCallback(async () => {
    const { data, error } = await fetchUserDramas();
    if (!error) {
      setDramas(data || []);
    }
    setLoading(false);
  }, [fetchUserDramas]);

  useEffect(() => {
    let isActive = true;

    fetchUserDramas().then(({ data, error }) => {
      if (!isActive) return;

      if (!error) {
        setDramas(data || []);
      }
      setLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [fetchUserDramas]);

  const fetchMissingPosters = async (dramasList) => {
    const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

    console.log(`🎬 Fetching posters for ${dramasList.length} dramas...`);

    let updated = 0;

    for (const drama of dramasList) {
      if (drama.poster_url) continue; // Skip if already has poster

      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(drama.title)}&language=en-US`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const posterUrl = result.poster_path
            ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
            : null;

          if (posterUrl) {
            await updateDrama(drama.id, { poster_url: posterUrl });
            console.log(`✅ ${drama.title}`);
            updated++;
          }
        }

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`Error: ${drama.title}`, err);
      }
    }

    console.log(`✨ Updated ${updated} posters!`);
    return updated;
  };

  const filteredDramas = dramas.filter(d => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleDramaAdded = (newDrama) => {
    setDramas([newDrama, ...dramas]);
    setShowAddModal(false);
  };

  const handleDramaUpdated = (updatedDrama) => {
    setDramas(dramas.map(d => d.id === updatedDrama.id ? updatedDrama : d));
    setSelectedDrama(null);
  };

  const handleDramaDeleted = (dramaId) => {
    setDramas(dramas.filter(d => d.id !== dramaId));
    setSelectedDrama(null);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f7fa 0%, #f0f2f8 100%)"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "24px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)"
      }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "600", margin: "0" }}>DramaLog</h1>
          <p style={{ fontSize: "12px", margin: "4px 0 0", opacity: 0.9 }}>
            {user.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.4)",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
            transition: "background 0.2s"
          }}
          onHover={(e) => e.target.style.background = "rgba(255,255,255,0.3"}
        >
          Log out
        </button>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 20px" }}>
        {/* Controls */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          gap: "20px",
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {["all", "completed", "watching", "want_to_watch"].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  background: filter === status ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white",
                  color: filter === status ? "white" : "#333",
                  border: filter === status ? "none" : "1px solid #ddd",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  transition: "all 0.2s"
                }}
              >
                {status === "all" ? "All" : status === "completed" ? "Watched" : status === "watching" ? "Watching" : "Want to watch"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "transform 0.2s"
            }}
            onMouseDown={(e) => e.target.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.target.style.transform = "scale(1)"}
          >
            + Add Drama
          </button>
          <button
            onClick={async () => {
              const dramasWithoutPosters = dramas.filter(d => !d.poster_url);
              if (dramasWithoutPosters.length === 0) {
                alert('All dramas have posters! ✨');
                return;
              }
              await fetchMissingPosters(dramasWithoutPosters);
              loadDramas(); // Reload to see updates
            }}
            style={{
              background: "#FFC107",
              color: "#333",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              transition: "opacity 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.opacity = "0.8"}
            onMouseLeave={(e) => e.target.style.opacity = "1"}
          >
            🎬 Fetch posters
          </button>
        </div>

        {/* Drama grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <p style={{ fontSize: "16px" }}>Loading your dramas...</p>
          </div>
        ) : filteredDramas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <p style={{ fontSize: "16px", marginBottom: "16px" }}>No dramas yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600"
              }}
            >
              Add your first drama
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "20px"
          }}>
            {filteredDramas.map(drama => (
              <div
                key={drama.id}
                onClick={() => setSelectedDrama(drama)}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  transform: "translateY(0)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                }}
              >
                {/* Poster */}
                <div style={{
                  height: "200px",
                  background: drama.poster_url
                    ? `url(${drama.poster_url}) center / cover`
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  position: "relative"
                }}>
                  {drama.rating && (
                    <div style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(0,0,0,0.7)",
                      color: "#ffc107",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      ★ {drama.rating}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "12px" }}>
                  <p style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#1a1a1a",
                    margin: "0 0 6px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {drama.title}
                  </p>
                  <p style={{
                    fontSize: "11px",
                    color: "#999",
                    margin: "0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {drama.year_watched || drama.year_released || "Year unknown"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddDramaModal
          userId={user.id}
          onDramaAdded={handleDramaAdded}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {selectedDrama && (
        <DramaDetailModal
          drama={selectedDrama}
          onUpdated={handleDramaUpdated}
          onDeleted={handleDramaDeleted}
          onClose={() => setSelectedDrama(null)}
        />
      )}
    </div>
  );
}
