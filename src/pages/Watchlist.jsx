import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDramas, signOut } from "../lib/supabase";
import AddDramaModal from "../components/AddDramaModal";
import DramaDetailModal from "../components/DramaDetailModal";

export default function Watchlist({ user, showToast }) {
  const navigate = useNavigate();
  const [dramas, setDramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [yearFilter, setYearFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDrama, setSelectedDrama] = useState(null);
  const [featuredDramas, setFeaturedDramas] = useState([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const loadDramas = async () => {
    setLoading(true);
    const { data, error } = await getDramas();
    if (!error) {
      setDramas(data || []);
    } else {
      showToast("Failed to load dramas", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    let isCurrent = true;

    const loadInitialDramas = async () => {
      setLoading(true);
      const { data, error } = await getDramas();
      
      if (!isCurrent) return;

      if (!error) {
        setDramas(data || []);
      } else {
        showToast("Failed to load dramas", "error");
      }
      setLoading(false);
    };

    loadInitialDramas();

    return () => {
      isCurrent = false;
    };
  }, [showToast]);

  useEffect(() => {
    const loadFeaturedDramas = async () => {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      if (!apiKey) return;

      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&with_original_language=ko&with_genres=18&with_type=2&sort_by=popularity.desc&page=1`
        );
        const data = await response.json();
        const popularDramas = (data.results || [])
          .filter((item) => {
            const isKoreanOrigin = item.origin_country?.includes("KR");
            const isKoreanLanguage = item.original_language === "ko";
            const hasPoster = Boolean(item.poster_path);
            return hasPoster && (isKoreanOrigin || isKoreanLanguage);
          })
          .slice(0, 5)
          .map((item) => ({
            title: item.name || item.title,
            overview: item.overview || "Popular ongoing K-drama",
            posterUrl: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
          }));

        setFeaturedDramas(popularDramas);
      } catch (error) {
        console.error("Failed to load featured dramas", error);
      }
    };

    loadFeaturedDramas();
  }, []);

  useEffect(() => {
    if (featuredDramas.length <= 1) return;

    const timer = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % featuredDramas.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [featuredDramas.length]);

  const getYearValue = (drama) => {
    const rawValue = drama.year_watched ?? drama.year_released;
    if (!rawValue) return 0;

    const match = String(rawValue).trim().match(/(\d{4})/);
    return match ? Number(match[1]) : 0;
  };

  const getGenreText = (drama) => {
    if (Array.isArray(drama.genres) && drama.genres.length > 0) {
      return drama.genres.join(", ");
    }

    if (typeof drama.genre === "string" && drama.genre.trim()) {
      return drama.genre;
    }

    return "No genres";
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "watching":
        return "Watching";
      case "want_to_watch":
        return "Want to watch";
      default:
        return "Unknown";
    }
  };

  const filteredDramas = dramas
    .filter(d => {
      const matchesStatus = filter === "all" ? true : d.status === filter;
      const query = searchQuery.trim().toLowerCase();
      const searchableText = `${d.title || ""} ${d.year_watched || ""} ${d.year_released || ""} ${d.genres?.join(" ") || ""}`.toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      const dramaYear = getYearValue(d);
      const matchesYear = yearFilter === "all" ? true : dramaYear === Number(yearFilter);

      return matchesStatus && matchesSearch && matchesYear;
    })
    .sort((a, b) => {
      const yearA = getYearValue(a);
      const yearB = getYearValue(b);

      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }

      if (sortBy === "rating") {
        const ratingA = Number(a.rating) || 0;
        const ratingB = Number(b.rating) || 0;
        return ratingB - ratingA;
      }

      if (sortBy === "newest") {
        return yearB - yearA;
      }

      if (sortBy === "oldest") {
        return yearA - yearB;
      }

      return yearA - yearB;
    });

  const stats = (() => {
    const ratedDramas = dramas.filter(d => Number(d.rating) > 0);
    const totalRating = ratedDramas.reduce((sum, drama) => sum + Number(drama.rating || 0), 0);
    const averageRating = ratedDramas.length > 0 ? (totalRating / ratedDramas.length).toFixed(1) : "0.0";

    const genreCounts = dramas.reduce((counts, drama) => {
      const genreList = Array.isArray(drama.genres) ? drama.genres : [];
      genreList.forEach((genre) => {
        const normalizedGenre = genre.trim();
        if (normalizedGenre) {
          counts[normalizedGenre] = (counts[normalizedGenre] || 0) + 1;
        }
      });
      return counts;
    }, {});

    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "No genres";

    return {
      total: dramas.length,
      averageRating,
      topGenre,
      ratedCount: ratedDramas.length,
    };
  })();

  const handleLogout = async () => {
    await signOut();
    showToast("Logged out successfully", "info");
    navigate("/login");
  };

  const handleDramaAdded = (newDrama) => {
    setDramas(currentDramas => [newDrama, ...currentDramas]);
    setShowAddModal(false);
    showToast(`Added "${newDrama.title}" to watchlist!`, "success");
  };

  const handleDramaUpdated = (updatedDrama) => {
    setDramas(currentDramas => 
      currentDramas.map(d => d.id === updatedDrama.id ? updatedDrama : d)
    );
    setSelectedDrama(null);
    showToast("Drama updated successfully!", "success");
  };

  const handleDramaDeleted = (dramaId) => {
    const deletedTitle = dramas.find(d => d.id === dramaId)?.title;
    setDramas(currentDramas => currentDramas.filter(d => d.id !== dramaId));
    setSelectedDrama(null);
    showToast(`Deleted "${deletedTitle}"`, "info");
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
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => navigate("/analytics")}
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
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            📊 Analytics
          </button>
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
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 20px" }}>
        {featuredDramas.length > 0 && (
          <div style={{
            background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
            color: "white",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "0 10px 30px rgba(17, 24, 39, 0.18)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Featured
                </p>
                <h2 style={{ margin: "0", fontSize: "20px" }}>Popular K-dramas</h2>
              </div>
              <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                {featuredIndex + 1}/{featuredDramas.length}
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <img
                src={featuredDramas[featuredIndex].posterUrl}
                alt={featuredDramas[featuredIndex].title}
                style={{
                  width: "120px",
                  height: "180px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
                }}
              />
              <div style={{ flex: 1, minWidth: "220px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>{featuredDramas[featuredIndex].title}</h3>
                <p style={{ margin: "0", fontSize: "13px", lineHeight: "1.5", color: "#e5e7eb" }}>
                  {featuredDramas[featuredIndex].overview}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          gap: "20px",
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, minWidth: "280px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "10px 12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}>
              <span style={{ fontSize: "14px" }}>🔎</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dramas..."
                style={{
                  border: "none",
                  outline: "none",
                  width: "100%",
                  fontSize: "14px",
                  color: "#333"
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "0"
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
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
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "4px", fontSize: "13px", color: "#4b5563" }}>
                <span>📅</span>
                <select
                  aria-label="Filter by year watched"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "13px",
                    color: "#333",
                    background: "white"
                  }}
                >
                  <option value="all">All years</option>
                  <option value="2014">2014</option>
                  <option value="2015">2015</option>
                  <option value="2016">2016</option>
                  <option value="2017">2017</option>
                  <option value="2018">2018</option>
                  <option value="2019">2019</option>
                  <option value="2020">2020</option>
                  <option value="2021">2021</option>
                  <option value="2022">2022</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "4px", fontSize: "13px", color: "#4b5563" }}>
                <span>🔀</span>
                <select
                  aria-label="Sort by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "13px",
                    color: "#333",
                    background: "white"
                  }}
                >
                  <option value="default">Default</option>
                  <option value="title">Title</option>
                  <option value="rating">Rating</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
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
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "20px"
        }}>
          {[
            { label: "Total dramas", value: stats.total },
            { label: "Avg. rating", value: `${stats.averageRating}/10` },
            { label: "Top genre", value: stats.topGenre },
            { label: "Rated", value: stats.ratedCount },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}>
              <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {stat.label}
              </p>
              <p style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0" }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px" }}>
          Showing {filteredDramas.length} result{filteredDramas.length === 1 ? "" : "s"}
        </p>

        {/* Drama grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{
              display: "inline-block",
              width: "40px",
              height: "40px",
              border: "4px solid #f0f0f0",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{ fontSize: "16px", color: "#999", marginTop: "16px" }}>Loading your dramas...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : filteredDramas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <p style={{ fontSize: "16px", marginBottom: "16px" }}>
              {searchQuery ? "No dramas match your search" : "No dramas yet"}
            </p>
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
                    color: "#6b7280",
                    margin: "0 0 8px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {getGenreText(drama)}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
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
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      background: "#eef2ff",
                      color: "#4f46e5",
                      fontSize: "10px",
                      fontWeight: "600",
                      whiteSpace: "nowrap"
                    }}>
                      {getStatusLabel(drama.status)}
                    </span>
                  </div>
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
