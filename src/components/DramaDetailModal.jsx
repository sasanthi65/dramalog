import { useState } from "react";
import { updateDrama, deleteDrama } from "../lib/supabase";

export default function DramaDetailModal({ drama, onUpdated, onDeleted, onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: drama.title,
    status: drama.status,
    year_watched: drama.year_watched || "",
    rating: drama.rating || "",
    review: drama.review || ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSubmitting(true);
    setError("");

    const { data, error: updateError } = await updateDrama(drama.id, {
      status: editData.status,
      year_watched: editData.year_watched || null,
      rating: editData.rating ? parseInt(editData.rating) : null,
      review: editData.review || null
    });

    if (updateError) {
      setError("Failed to update drama. Please try again.");
      setSubmitting(false);
    } else {
      onUpdated(data[0]);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this drama?")) return;

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
        ) : (
          <>
            {/* Edit form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                  {submitting ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
