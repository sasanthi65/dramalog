import { useNavigate } from "react-router-dom";
import "./AppShell.css";

/**
 * Stitch navigation shell: a primary-lavender top bar with the serif wordmark,
 * section links, inline library search and the Add Drama action, plus the
 * shared footer. `variant="wrapped"` switches to the dark analytics treatment.
 */
export default function AppShell({
  active,
  user,
  variant = "light",
  onAddDrama,
  onSignOut,
  searchQuery,
  onSearchChange,
  children,
}) {
  const navigate = useNavigate();
  const showSearch = typeof onSearchChange === "function";

  return (
    <div className={`app-shell app-shell--${variant}`}>
      <header className="app-nav">
        <div className="app-nav__group">
          <button className="app-nav__brand" type="button" onClick={() => navigate("/watchlist")}>
            DramaLog
          </button>
          <nav className="app-nav__links" aria-label="Primary">
            <button
              type="button"
              className={active === "watchlist" ? "is-active" : ""}
              onClick={() => navigate("/watchlist")}
            >
              Watchlist
            </button>
            <button
              type="button"
              className={active === "analytics" ? "is-active" : ""}
              onClick={() => navigate("/analytics")}
            >
              Analytics
            </button>
          </nav>
        </div>

        {showSearch ? (
          <label className="app-nav__search">
            <span className="material-symbols-outlined app-nav__search-icon" aria-hidden="true">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search dramas..."
              aria-label="Search dramas"
            />
            {searchQuery ? (
              <button
                className="app-nav__search-clear"
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            ) : null}
          </label>
        ) : null}

        <div className="app-nav__actions">
          {onAddDrama ? (
            <button className="app-nav__add" type="button" onClick={onAddDrama}>
              Add Drama
            </button>
          ) : null}
          <span className="app-nav__account" title={user?.email}>
            <span className="material-symbols-outlined" aria-hidden="true">
              account_circle
            </span>
            <span className="app-nav__email">{user?.email}</span>
          </span>
          <button className="app-nav__icon" type="button" onClick={onSignOut} aria-label="Log out">
            <span className="material-symbols-outlined" aria-hidden="true">
              logout
            </span>
          </button>
        </div>
      </header>

      {children}

      <footer className="app-footer">
        <div className="app-footer__brand">
          <span className="headline-md">DramaLog</span>
          <p>© {new Date().getFullYear()} DramaLog. Your personal K-Drama scrapbook.</p>
        </div>
        <nav className="app-footer__links" aria-label="Footer">
          <a href="#terms">Terms of Service</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#help">Help Center</a>
          <a href="#support">Support</a>
        </nav>
      </footer>

      <button
        className="app-fab"
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_upward
        </span>
      </button>
    </div>
  );
}
