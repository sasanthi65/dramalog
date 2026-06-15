import { useState } from "react";
import { updateDrama, deleteDrama } from "../lib/supabase";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function DramaDetailModal({ drama, onUpdated, onDeleted, onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: drama.title,
    poster_url: drama.poster_url || "",
    synopsis: drama.synopsis || "",
    genres: drama.genres || [],
    year_released: drama.year_released || "",
    status: drama.status,
    year_watched: drama.year_watched || "",
    rating: drama.rating || "",
    review: drama.review || ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState(drama.title);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchTMDB = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please enter a drama title");
      return;
    }

    setSearching(true);
    setError("");

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setSearchResults(data.results.slice(0, 10));
      } else {
        setError("No dramas found. Try a different search.");
      }
    } catch {
      setError("Error searching TMDB. Please try again.");
    }

    setSearching(false);
  };

  const selectResult = (result) => {
    const genreMap = {
      10759: "Action", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary",
      18: "Drama", 10751: "Family", 10762: "Kids", 9648: "Mystery", 10763: "News",
      10764: "Reality", 10765: "Science Fiction", 10766: "Soap", 10767: "Talk",
      10768: "War & Politics", 37: "Western",
    };

    const genres = (result.genre_ids || []).map(id => genreMap[id]).filter(Boolean);
    const posterUrl = result.poster_path
      ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
      : "";

    setEditData({
      ...editData,
      title: result.name || result.title,
      poster_url: posterUrl,
      synopsis: result.overview,
      genres: genres.length > 0 ? genres : [],
      year_released: result.first_air_date ? parseInt(result.first_air_date.split("-")[0]) : ""
    });

    setSearchMode(false);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError("");

    const updatePayload = {
      title: editData.title,
      poster_url: editData.poster_url || null,
      synopsis: editData.synopsis || null,
      genres: editData.genres.length > 0 ? editData.genres : null,
      year_released: editData.year_released ? parseInt(editData.year_released) : null,
      status: editData.status,
      year_watched: editData.year_watched || null,
      rating: editData.rating ? parseInt(editData.rating) : null,
      review: editData.review || null
    };

    const { data, error: updateError } = await updateDrama(drama.id, updatePayload);

    if (updateError) {
      setError("Failed to update drama. Please try again.");
      setSubmitting(false);
    } else {
      onUpdated(data[0]);
    }
  };

  const handleDelete = async () => {
    const title = drama.title;
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;

    setSubmitting(true);
    const { error: deleteError } = await deleteDrama(drama.id);

    if (deleteError) {
      setError("Failed to delete drama. Please try again.");
      setSubmitting(false);
    } else {
      onDeleted(drama.id);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "flex-end",
      zIndex: 1000,
      animation: "slideUp 0.3s ease"
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <div style={{
        background: "white",
        borderRadius: "24px 24px 0 0",
        padding: "24px 20px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        animation: "slideUp 0.3s ease"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0" }}>
            {isEditing ? "Edit drama" : drama.title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#999"
            }}
          >
            ✕
          </button>
        </div>

        {!isEditing ? (
          <>
            {/* Drama details display */}
            <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                {drama.poster_url ? (
                  <img
                    src={drama.poster_url}
                    alt={drama.title}
                    style={{ width: "80px", height: "120px", borderRadius: "8px", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: "80px",
                    height: "120px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "12px", color: "#999", margin: "0 0 4px" }}>
                    {drama.year_released ? `Released: ${drama.year_released}` : "Release year unknown"}
                  </p>
                  {drama.genres && drama.genres.length > 0 && (
                    <p style={{ fontSize: "12px", color: "#666", margin: "0 0 4px" }}>
                      {drama.genres.join(", ")}
                    </p>
                  )}
                  {drama.rating && (
                    <p style={{ fontSize: "14px", fontWeight: "600", margin: "0" }}>
                      <span style={{ color: "#ffc107" }}>★ {drama.rating}/10</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "12px" }}>
                <p style={{ fontSize: "11px", color: "#999", margin: "0 0 6px", fontWeight: "600", textTransform: "uppercase" }}>Status</p>
                <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1a1a1a" }}>
                  {drama.status === "completed" ? "Watched" : drama.status === "watching" ? "Watching" : "Want to watch"}
                </p>
              </div>
              <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "12px" }}>
                <p style={{ fontSize: "11px", color: "#999", margin: "0 0 6px", fontWeight: "600", textTransform: "uppercase" }}>Watched in</p>
                <p style={{ fontSize: "14px", fontWeight: "600", margin: "0", color: "#1a1a1a" }}>
                  {drama.year_watched || "Not recorded"}
                </p>
              </div>
            </div>

            {/* Review */}
            {drama.review && (
              <div style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "12px", color: "#999", margin: "0 0 8px", fontWeight: "600", textTransform: "uppercase" }}>Review</p>
                <p style={{ fontSize: "14px", color: "#333", margin: "0", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {drama.review}
                </p>
              </div>
            )}

            {/* Synopsis */}
            {drama.synopsis && (
              <div style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "12px", color: "#999", margin: "0 0 8px", fontWeight: "600", textTransform: "uppercase" }}>Synopsis</p>
                <p style={{ fontSize: "13px", color: "#666", margin: "0", lineHeight: "1.6" }}>
                  {drama.synopsis}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  background: "#ffe6e6",
                  color: "#d32f2f",
                  border: "1px solid #ffcccc",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                Delete
              </button>
            </div>
          </>
        ) : searchMode ? (
          <>
            {/* Search mode */}
            <form onSubmit={searchTMDB} style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for drama..."
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  type="submit"
                  disabled={searching}
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    cursor: searching ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    opacity: searching ? 0.7 : 1
                  }}
                >
                  {searching ? (
                    <span>🔍 Searching...</span>
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div style={{
                background: "#ffe6e6",
                color: "#d32f2f",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "16px",
                border: "1px solid #ffcccc"
              }}>
                {error}
              </div>
            )}

            {searchResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    onClick={() => selectResult(result)}
                    style={{
                      background: "white",
                      border: "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "12px",
                      cursor: "pointer",
                      display: "flex",
                      gap: "12px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(102,126,234,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#ddd";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {result.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt={result.name}
                        style={{ width: "50px", height: "75px", borderRadius: "4px", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: "50px",
                        height: "75px",
                        borderRadius: "4px",
                        background: "#f0f0f0"
                      }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px", color: "#1a1a1a" }}>
                        {result.name || result.title}
                      </p>
                      <p style={{ fontSize: "12px", color: "#999", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {result.overview}
                      </p>
                      <p style={{ fontSize: "11px", color: "#bbb", margin: "0" }}>
                        {result.first_air_date ? new Date(result.first_air_date).getFullYear() : "Year unknown"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
              <button
                onClick={() => {
                  setSearchMode(false);
                  setSearchResults([]);
                }}
                style={{
                  flex: 1,
                  background: "white",
                  color: "#666",
                  border: "1px solid #ddd",
                  padding: "12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Edit form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Poster preview and search */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Poster</label>
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  {editData.poster_url ? (
                    <img
                      src={editData.poster_url}
                      alt="preview"
                      style={{ width: "60px", height: "90px", borderRadius: "8px", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: "60px",
                      height: "90px",
                      borderRadius: "8px",
                      background: "#f0f0f0"
                    }} />
                  )}
                  <input
                    type="text"
                    value={editData.poster_url}
                    onChange={(e) => setEditData({ ...editData, poster_url: e.target.value })}
                    placeholder="Poster URL"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "inherit",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <button
                  onClick={() => setSearchMode(true)}
                  style={{
                    width: "100%",
                    background: "#f0f0f0",
                    color: "#666",
                    border: "1px solid #ddd",
                    padding: "10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}
                >
                  🔍 Search TMDB again
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box"
                  }}
                >
                  <option value="completed">Completed</option>
                  <option value="watching">Currently watching</option>
                  <option value="want_to_watch">Want to watch</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Year released</label>
                  <input
                    type="number"
                    value={editData.year_released}
                    onChange={(e) => setEditData({ ...editData, year_released: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Year watched</label>
                  <input
                    type="text"
                    value={editData.year_watched}
                    onChange={(e) => setEditData({ ...editData, year_watched: e.target.value })}
                    placeholder="e.g., 2024 or 2024-06"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Genres</label>
                <input
                  type="text"
                  value={editData.genres.join(", ")}
                  onChange={(e) => setEditData({
                    ...editData,
                    genres: e.target.value.split(",").map(g => g.trim()).filter(Boolean)
                  })}
                  placeholder="e.g., Drama, Romance, Comedy"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box"
                  }}
                />
                <p style={{ fontSize: "11px", color: "#999", margin: "6px 0 0" }}>Separate with commas</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Rating (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editData.rating}
                  onChange={(e) => setEditData({ ...editData, rating: e.target.value })}
                  placeholder="Optional"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Synopsis</label>
                <textarea
                  value={editData.synopsis}
                  onChange={(e) => setEditData({ ...editData, synopsis: e.target.value })}
                  placeholder="Drama synopsis..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    resize: "vertical",
                    minHeight: "80px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Review</label>
                <textarea
                  value={editData.review}
                  onChange={(e) => setEditData({ ...editData, review: e.target.value })}
                  placeholder="Add your thoughts..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    resize: "vertical",
                    minHeight: "100px"
                  }}
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

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    flex: 1,
                    background: "white",
                    color: "#666",
                    border: "1px solid #ddd",
                    padding: "12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    padding: "12px",
                    borderRadius: "8px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? (
                    <span>⏳ Saving...</span>
                  ) : (
                    <span>Save changes</span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
