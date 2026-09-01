import { useState, useEffect } from "react";
import "./Toast.css";

const toastIcons = {
  success: "check_circle",
  error: "error",
  info: "info",
};

export default function Toast({ id, message, type = "info", onRemove }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(id), 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const dismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(id), 300);
  };

  return (
    <div className={`toast toast--${type} ${isExiting ? "is-exiting" : ""}`} role="status">
      <span className="material-symbols-outlined toast__icon" aria-hidden="true">
        {toastIcons[type] || toastIcons.info}
      </span>
      <span className="toast__message">{message}</span>
      <button className="toast__close" type="button" onClick={dismiss} aria-label="Dismiss notification">
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </div>
  );
}
