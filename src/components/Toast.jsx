import { useState, useEffect } from "react";

export default function Toast({ id, message, type = "info", onRemove }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(id), 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const bgColor = {
    success: "#4caf50",
    error: "#f44336",
    info: "#2196f3"
  }[type] || "#2196f3";

  return (
    <div
      style={{
        background: bgColor,
        color: "white",
        padding: "14px 20px",
        borderRadius: "8px",
        marginBottom: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        minWidth: "280px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        animation: isExiting ? "slideOut 0.3s ease" : "slideIn 0.3s ease",
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      `}</style>

      <span style={{ fontSize: "14px", fontWeight: "500" }}>{message}</span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onRemove(id), 300);
        }}
        style={{
          background: "none",
          border: "none",
          color: "white",
          cursor: "pointer",
          fontSize: "18px",
          padding: "0",
          marginLeft: "16px",
          opacity: 0.7,
          transition: "opacity 0.2s"
        }}
        onMouseEnter={(e) => e.target.style.opacity = "1"}
        onMouseLeave={(e) => e.target.style.opacity = "0.7"}
      >
        ✕
      </button>
    </div>
  );
}
