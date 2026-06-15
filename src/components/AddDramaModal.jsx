import { useState } from "react";
import { addDrama } from "../lib/supabase";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function AddDramaModal({ userId, onDramaAdded, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [status, setStatus] = useState("completed");
  const [yearWatched, setYearWatched] = useState(new Date().getFullYear().toString());
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const searchTMDB = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please enter a drama title");
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);
    setSelectedResult(null);

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

    setLoading(false);
  };

  const selectResult = async (result) => {
    setSelectedResult(result);
    setError("");
  };

  const handleAddDrama = async () => {
    if (!selectedResult) return;

    setSubmitting(true);
    setError("");

    const genreMap = {
      10759: "Action",
      16: "Animation",
      35: "Comedy",
      80: "Crime",
      99: "Documentary",
      18: "Drama",
      10751: "Family",
      10762: "Kids",
      9648: "Mystery",
      10763: "News",
      10764: "Reality",
      10765: "Science Fiction",
      10766: "Soap",
      10767: "Talk",
      10768: "War & Politics",
      37: "Western",
    };

    const genres = (selectedResult.genre_ids || [])
      .map(id => genreMap[id])
      .filter(Boolean);

    const posterUrl = selectedResult.poster_path
      ? `https://image.tmdb.org/t/p/w500${selectedResult.poster_path}`
      : null;

    const { data, error } = await addDrama({
      user_id: userId,
      title: selectedResult.name || selectedResult.title,
      tmdb_id: selectedResult.id.toString(),
      poster_url: posterUrl,
      synopsis: selectedResult.overview,
      genres: genres.length > 0 ? genres : null,
      year_released: selectedResult.first_air_date ? parseInt(selectedResult.first_air_date.split("-")[0]) : null,
      year_watched: yearWatched,
      status: status,
      rating: rating ? parseInt(rating) : null,
      review: review || null
    });

    if (error) {
      setError("Failed to add drama. Please try again.");
      setSubmitting(false);
    } else {
      onDramaAdded(data[0]);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0" }}>Add Drama</h2>
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

        {!selectedResult ? (
          <>
            {/* Search form */}
            <form onSubmit={searchTMDB} style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a drama..."
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
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? (
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

            {/* Search results */}
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
          </>
        ) : (
          <>
            {/* Drama details form */}
            <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                {selectedResult.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${selectedResult.poster_path}`}
                    alt={selectedResult.name}
                    style={{ width: "60px", height: "90px", borderRadius: "8px", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: "60px",
                    height: "90px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 4px" }}>
                    {selectedResult.name || selectedResult.title}
                  </p>
                  <p style={{ fontSize: "12px", color: "#999", margin: "0" }}>
                    {selectedResult.first_air_date ? new Date(selectedResult.first_air_date).getFullYear() : "Year unknown"}
                  </p>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Year watched</label>
                <input
                  type="number"
                  value={yearWatched}
                  onChange={(e) => setYearWatched(e.target.value)}
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
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Rating (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
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
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Review</label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
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
                    minHeight: "80px"
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
                  onClick={() => setSelectedResult(null)}
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
                <button
                  onClick={handleAddDrama}
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
                    <span>⏳ Adding...</span>
                  ) : (
                    <span>Add to watchlist</span>
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
