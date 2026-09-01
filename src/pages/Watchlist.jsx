import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDramas, signOut } from "../lib/supabase";
import { getTrendingKdramas, getShowDetails, tmdbImage } from "../lib/tmdb";
import AppShell from "../components/AppShell";
import AddDramaModal from "../components/AddDramaModal";
import DramaDetailModal from "../components/DramaDetailModal";
import "./Watchlist.css";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "completed", label: "Watched" },
  { value: "watching", label: "Watching" },
  { value: "want_to_watch", label: "Want to watch" },
];

const statusLabels = {
  completed: "Completed",
  watching: "Watching",
  want_to_watch: "Planned",
};

const heroKickers = ["Trending Now", "New Release", "Still Watching"];

// Long enough to read the synopsis, short enough to feel alive.
const HERO_INTERVAL_MS = 7000;

// Divides evenly into every grid width: 6 rows at 6 columns, 9 rows at 4,
// 18 rows at 2 — no ragged last row.
const PAGE_SIZE = 36;

// Grid posters are stored at w500, which visibly softens at banner scale.
// TMDb serves the same asset at any width, so ask for a larger rendition.
const heroPoster = (url) =>
  typeof url === "string" && url.includes("image.tmdb.org")
    ? url.replace(/\/t\/p\/w\d+\//, "/t/p/w780/")
    : url;

/**
 * Google-style page list: always the first and last page, a window around the
 * current one, and ellipses for the gaps. Caps out at 7 entries.
 */
const buildPageItems = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("gap-start");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push("gap-end");
  items.push(total);

  return items;
};

export default function Watchlist({ user, showToast }) {
  const navigate = useNavigate();
  const [dramas, setDramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("year");
  const [yearFilter, setYearFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDrama, setSelectedDrama] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [heroPaused, setHeroPaused] = useState(false);
  const [trending, setTrending] = useState([]);
  const [pendingTrending, setPendingTrending] = useState(null);
  const [preparingTrending, setPreparingTrending] = useState(false);

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

  // Banner content is independent of the collection — a failure here just falls
  // back to the user's own posters, so it never blocks the page.
  useEffect(() => {
    let isCurrent = true;

    const loadTrending = async () => {
      const { data } = await getTrendingKdramas(5);
      if (isCurrent && data?.length) setTrending(data);
    };

    loadTrending();

    return () => {
      isCurrent = false;
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set();
    dramas.forEach((drama) => {
      const year = String(drama.year_watched ?? drama.year_released ?? "").split("-")[0];
      if (year) years.add(year);
    });
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [dramas]);

  const filteredDramas = dramas
    .filter(d => {
      const matchesStatus = filter === "all" ? true : d.status === filter;
      const query = searchQuery.trim().toLowerCase();
      // Cast names are searchable, so "Byeon Woo-seok" finds his dramas.
      const castText = (d.main_cast || [])
        .map((person) => `${person.name || ""} ${person.character || ""}`)
        .join(" ");
      const searchableText =
        `${d.title || ""} ${d.year_watched || ""} ${d.year_released || ""} ${castText}`.toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      const dramaYear = String(d.year_watched ?? d.year_released ?? "").split("-")[0];
      const matchesYear = yearFilter === "all" || dramaYear === yearFilter;

      return matchesStatus && matchesSearch && matchesYear;
    })
    .sort((a, b) => {
      if (sortOrder === "rating") {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      if (sortOrder === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      // Groups a lead actor's dramas together, with un-cast titles last.
      if (sortOrder === "actor") {
        const leadA = a.main_cast?.[0]?.name || "";
        const leadB = b.main_cast?.[0]?.name || "";
        if (!leadA !== !leadB) return leadA ? -1 : 1;
        return leadA.localeCompare(leadB) || (a.title || "").localeCompare(b.title || "");
      }
      const yearA = Number(String(a.year_watched ?? a.year_released ?? 0).split("-")[0]);
      const yearB = Number(String(b.year_watched ?? b.year_released ?? 0).split("-")[0]);
      return yearA - yearB;
    });

  const totalPages = Math.max(1, Math.ceil(filteredDramas.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedDramas = filteredDramas.slice(pageStart, pageStart + PAGE_SIZE);

  // Any change to the filters puts you back on the first page.
  const applySearch = (value) => {
    setSearchQuery(value);
    setPage(1);
  };

  const applyFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const applyYearFilter = (value) => {
    setYearFilter(value);
    setPage(1);
  };

  const applySortOrder = (value) => {
    setSortOrder(value);
    setPage(1);
  };

  const goToPage = (nextPage) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(clamped);
    // Guarded: jsdom and older browsers do not implement scrollIntoView.
    document.getElementById("collection")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  // Pull the episode count first so the add form opens fully populated.
  const startTrendingAdd = async (show) => {
    setPreparingTrending(true);
    const { data } = await getShowDetails(show.id);
    setPendingTrending({ ...show, number_of_episodes: data?.number_of_episodes });
    setShowAddModal(true);
    setPreparingTrending(false);
  };

  const handleLogout = async () => {
    await signOut();
    showToast("Logged out successfully", "info");
    navigate("/login");
  };

  const handleDramaAdded = (newDrama) => {
    setDramas(currentDramas => [newDrama, ...currentDramas]);
    setShowAddModal(false);
    setPendingTrending(null);
    showToast(`Added "${newDrama.title}" to watchlist!`, "success");
  };

  const handleDramaUpdated = (updatedDrama) => {
    setDramas(currentDramas =>
      currentDramas.map(d => d.id === updatedDrama.id ? updatedDrama : d)
    );
    setSelectedDrama(null);
    showToast("Drama updated successfully!", "success");
  };

  // Episode progress saves in place — the modal stays open and no toast fires.
  const handleProgressUpdated = (updatedDrama) => {
    setDramas(currentDramas =>
      currentDramas.map(d => d.id === updatedDrama.id ? updatedDrama : d)
    );
    setSelectedDrama(updatedDrama);
  };

  const handleDramaDeleted = (dramaId) => {
    const deletedTitle = dramas.find(d => d.id === dramaId)?.title;
    setDramas(currentDramas => currentDramas.filter(d => d.id !== dramaId));
    setSelectedDrama(null);
    showToast(`Deleted "${deletedTitle}"`, "info");
  };

  // Trending K-dramas from TMDb lead the banner. If that call fails or the key
  // is missing, fall back to the user's own artwork, then to the editorial card.
  const heroSlides = useMemo(() => {
    if (trending.length > 0) {
      return trending.map((show) => ({
        key: `tmdb-${show.id}`,
        title: show.name,
        overview: show.overview,
        backdrop: tmdbImage(show.backdrop_path, "w1280"),
        thumb: tmdbImage(show.backdrop_path, "w300"),
        poster: tmdbImage(show.poster_path, "w780"),
        trendingSource: show,
      }));
    }

    return dramas
      .filter((drama) => drama.poster_url)
      .slice(0, 5)
      .map((drama) => ({
        key: drama.id,
        title: drama.title,
        overview: drama.synopsis,
        backdrop: null,
        thumb: drama.poster_url,
        poster: heroPoster(drama.poster_url),
        drama,
      }));
  }, [trending, dramas]);

  const activeHero = heroSlides.length > 0 ? heroSlides[heroIndex % heroSlides.length] : null;

  // Lets the banner tell you a trending title is already saved.
  const savedTmdbIds = useMemo(
    () => new Set(dramas.map((drama) => String(drama.tmdb_id)).filter(Boolean)),
    [dramas]
  );

  const moveHero = (step) => {
    if (heroSlides.length === 0) return;
    setHeroIndex((current) => (current + step + heroSlides.length) % heroSlides.length);
  };

  // Auto-advance. Keyed on heroIndex so any manual jump restarts the countdown,
  // paused on hover/focus, and skipped entirely for reduced-motion users.
  useEffect(() => {
    if (heroPaused || heroSlides.length < 2) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return undefined;

    const timer = setTimeout(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, HERO_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [heroIndex, heroPaused, heroSlides.length]);

  const watchedCount = dramas.filter((drama) => drama.status === "completed").length;
  const watchingCount = dramas.filter((drama) => drama.status === "watching").length;
  const wantToWatchCount = dramas.filter((drama) => drama.status === "want_to_watch").length;
  const ratedDramas = dramas.filter((drama) => drama.rating);
  const avgRating = ratedDramas.length > 0
    ? (ratedDramas.reduce((sum, drama) => sum + Number(drama.rating), 0) / ratedDramas.length).toFixed(1)
    : "—";

  const genreCount = {};
  dramas.forEach((drama) => {
    (drama.genres || []).forEach((genre) => {
      genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
  });
  const rankedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
  const topGenre = rankedGenres[0]?.[0] || "No data yet";
  const runnerUpGenre = rankedGenres[1]?.[0];

  return (
    <AppShell
      active="watchlist"
      user={user}
      onAddDrama={() => setShowAddModal(true)}
      onSignOut={handleLogout}
      searchQuery={searchQuery}
      onSearchChange={applySearch}
    >
      <main className="watchlist-page">
        <section
          className="hero-carousel"
          aria-label="Featured dramas"
          aria-roledescription="carousel"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          onFocusCapture={() => setHeroPaused(true)}
          onBlurCapture={() => setHeroPaused(false)}
        >
          {activeHero ? (
            <>
              {/* A real 16:9 backdrop stays sharp; a portrait poster is blurred
                  hard so its upscaling never reads as pixelation. */}
              {/* Remounted per slide so the Ken Burns zoom restarts. */}
              <div
                key={heroIndex}
                className={`hero-carousel__backdrop ${
                  activeHero.backdrop ? "" : "hero-carousel__backdrop--wash"
                }`}
                style={{ backgroundImage: `url(${activeHero.backdrop || activeHero.poster})` }}
                aria-hidden="true"
              />
              <div className="hero-carousel__glass" aria-hidden="true" />
              <div className="hero-carousel__grain" aria-hidden="true" />

              <div className="hero-carousel__inner">
                <div className="hero-carousel__copy">
                  <span className="hero-carousel__kicker">
                    {activeHero.trendingSource
                      ? `Trending in ${new Date().getFullYear()}`
                      : heroKickers[heroIndex % heroKickers.length]}
                  </span>
                  <h2 className="display-lg">{activeHero.title}</h2>
                  <p>
                    {activeHero.overview ||
                      "Keep your drama journey organized with a cinematic view of the stories you are watching, have watched, and want to revisit."}
                  </p>

                  {activeHero.trendingSource ? (
                    savedTmdbIds.has(String(activeHero.trendingSource.id)) ? (
                      <span className="hero-carousel__saved">
                        <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                        Already in your watchlist
                      </span>
                    ) : (
                      <button
                        className="btn btn--secondary"
                        type="button"
                        disabled={preparingTrending}
                        onClick={() => startTrendingAdd(activeHero.trendingSource)}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">add</span>
                        {preparingTrending ? "Opening…" : "Add to watchlist"}
                      </button>
                    )
                  ) : (
                    <button className="btn btn--secondary" type="button" onClick={() => setSelectedDrama(activeHero.drama)}>
                      <span className="material-symbols-outlined is-filled" aria-hidden="true">
                        play_arrow
                      </span>
                      View details
                    </button>
                  )}
                </div>

                {/* Shown at its native 2:3 ratio and downscaled, never stretched. */}
                {activeHero.poster ? (
                  <figure className="hero-carousel__poster">
                    <img src={activeHero.poster} alt={activeHero.title} />
                  </figure>
                ) : null}
              </div>

              {heroSlides.length > 1 ? (
                <>
                  <button
                    className="hero-carousel__nav hero-carousel__nav--prev"
                    type="button"
                    onClick={() => moveHero(-1)}
                    aria-label="Previous featured drama"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                  </button>
                  <button
                    className="hero-carousel__nav hero-carousel__nav--next"
                    type="button"
                    onClick={() => moveHero(1)}
                    aria-label="Next featured drama"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                  </button>
                  <div className="hero-carousel__rail">
                    {heroSlides.map((slide, index) => {
                      const isActive = index === heroIndex % heroSlides.length;
                      return (
                        <button
                          key={slide.key}
                          type="button"
                          className={`hero-rail__item ${isActive ? "is-active" : ""}`}
                          onClick={() => setHeroIndex(index)}
                          aria-label={`Show ${slide.title}`}
                          aria-current={isActive ? "true" : undefined}
                        >
                          <span className="hero-rail__thumb">
                            {slide.thumb ? (
                              <img src={slide.thumb} alt="" loading="lazy" />
                            ) : (
                              <b>{slide.title?.[0] || "D"}</b>
                            )}
                          </span>
                          <span className="hero-rail__title">{slide.title}</span>
                          {/* Remounted per slide so the countdown bar restarts. */}
                          {isActive ? (
                            <span
                              key={heroIndex}
                              className={`hero-rail__progress ${heroPaused ? "is-paused" : ""}`}
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <>
              <div className="hero-carousel__empty" aria-hidden="true" />
              <div className="hero-carousel__inner">
                <div className="hero-carousel__copy">
                  <span className="hero-carousel__kicker">New season</span>
                  <h2 className="display-lg">Your watchlist, reimagined.</h2>
                  <p>
                    Keep your drama journey organized with a cinematic view of the stories you are
                    watching, have watched, and want to revisit.
                  </p>
                  <button className="btn btn--secondary" type="button" onClick={() => setShowAddModal(true)}>
                    <span className="material-symbols-outlined" aria-hidden="true">add</span>
                    Add a new drama
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="watchlist-content">
          <section className="bento-stats" aria-label="Watchlist summary">
            <article className="glass-effect bento-stats__card">
              <span className="eyebrow">Total dramas</span>
              <div>
                <strong className="display-lg">{dramas.length}</strong>
                <p>Stories explored</p>
              </div>
            </article>
            <article className="glass-effect bento-stats__card">
              <span className="eyebrow">Avg. rating</span>
              <div>
                <strong className="display-lg">{avgRating}</strong>
                <span className="bento-stats__suffix">/10</span>
              </div>
            </article>
            <article className="glass-effect bento-stats__card bento-stats__card--accent">
              <span className="eyebrow">Top genre</span>
              <div>
                <strong className="headline-lg">{topGenre}</strong>
                <p>{runnerUpGenre ? `Followed by ${runnerUpGenre}` : "Add genres to see more"}</p>
              </div>
            </article>
            <article className="glass-effect bento-stats__card">
              <span className="eyebrow">In progress</span>
              <div>
                <strong className="display-lg">{watchingCount}</strong>
                <p>
                  {watchedCount} watched · {wantToWatchCount} planned
                </p>
              </div>
            </article>
          </section>

          <section id="collection" className="collection">
            <div className="collection__heading">
              <div>
                <p className="eyebrow">Collection</p>
                <h1 className="headline-lg">Your stories</h1>
              </div>
              <button className="btn btn--primary" type="button" onClick={() => setShowAddModal(true)}>
                <span className="material-symbols-outlined" aria-hidden="true">add</span>
                Add drama
              </button>
            </div>

            <div className="filter-toolbar">
              <div className="filter-toolbar__pills">
                {statusOptions.map((statusOption) => (
                  <button
                    key={statusOption.value}
                    className={`pill ${filter === statusOption.value ? "is-selected" : ""}`}
                    type="button"
                    onClick={() => applyFilter(statusOption.value)}
                  >
                    {statusOption.label}
                  </button>
                ))}

                <span className="filter-toolbar__divider" />

                <select
                  className="filter-toolbar__select"
                  value={yearFilter}
                  onChange={(event) => applyYearFilter(event.target.value)}
                  aria-label="Filter by year"
                >
                  <option value="all">All years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-toolbar__select"
                  value={sortOrder}
                  onChange={(event) => applySortOrder(event.target.value)}
                  aria-label="Sort dramas"
                >
                  <option value="year">Default sort</option>
                  <option value="rating">Rating</option>
                  <option value="title">Title</option>
                  <option value="actor">Lead actor</option>
                </select>
              </div>
            </div>

            <p className="collection__count">
              {filteredDramas.length > PAGE_SIZE
                ? `Showing ${pageStart + 1}–${pageStart + pagedDramas.length} of ${filteredDramas.length} dramas in your collection`
                : `${filteredDramas.length} ${filteredDramas.length === 1 ? "drama" : "dramas"} in your collection`}
            </p>

            {loading ? (
              <div className="collection-state">
                <div className="loading-reel" />
                <h2 className="headline-md">Loading your collection…</h2>
              </div>
            ) : filteredDramas.length === 0 ? (
              <div className="collection-state">
                <span className="material-symbols-outlined collection-state__mark animate-float" aria-hidden="true">
                  auto_awesome
                </span>
                <h2 className="headline-md">
                  {searchQuery ? "No dramas match your search" : "No dramas yet"}
                </h2>
                <p>
                  {searchQuery
                    ? "Try a different title, or clear the filters to see everything."
                    : "Start your scrapbook by adding the first story you loved."}
                </p>
                <button className="btn btn--primary" type="button" onClick={() => setShowAddModal(true)}>
                  Add your first drama
                </button>
              </div>
            ) : (
              <div className="drama-grid">
                {pagedDramas.map((drama) => (
                  <article key={drama.id} className="drama-card hover-lift">
                    <button className="drama-card__button" type="button" onClick={() => setSelectedDrama(drama)}>
                      <div className="drama-card__poster">
                        {drama.poster_url ? (
                          <img src={drama.poster_url} alt={drama.title} loading="lazy" />
                        ) : (
                          <div className="poster-fallback">
                            <span>DramaLog</span>
                            <b>{drama.title?.[0] || "D"}</b>
                          </div>
                        )}
                        <div className="poster-gradient drama-card__overlay">
                          {drama.status ? (
                            <span className={`chip chip--${drama.status}`}>
                              {statusLabels[drama.status] || drama.status}
                            </span>
                          ) : (
                            <span />
                          )}
                          {drama.rating ? (
                            <span className="chip chip--rating">
                              <span className="material-symbols-outlined is-filled" aria-hidden="true">star</span>
                              {drama.rating}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {drama.status === "watching" && drama.total_episodes ? (
                        <div className="drama-card__progress" aria-hidden="true">
                          <div
                            style={{
                              width: `${Math.min(
                                ((Number(drama.episodes_watched) || 0) / Number(drama.total_episodes)) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      ) : null}
                      <h3 className="drama-card__title">{drama.title}</h3>
                      <p className="drama-card__meta">
                        {String(drama.year_watched ?? drama.year_released ?? "Year unknown").split("-")[0]}
                        {drama.genres?.length ? ` • ${drama.genres[0]}` : ""}
                        {drama.status === "watching" && drama.total_episodes
                          ? ` • Ep ${Number(drama.episodes_watched) || 0}/${drama.total_episodes}`
                          : drama.total_episodes
                            ? ` • ${drama.total_episodes} eps`
                            : ""}
                      </p>
                      {drama.main_cast?.[0]?.name ? (
                        <p className="drama-card__cast">{drama.main_cast[0].name}</p>
                      ) : null}
                    </button>
                  </article>
                ))}
              </div>
            )}

            {!loading && totalPages > 1 ? (
              <nav className="pagination" aria-label="Collection pages">
                <button
                  className="pagination__arrow"
                  type="button"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">first_page</span>
                </button>
                <button
                  className="pagination__arrow"
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                </button>

                <ol className="pagination__pages">
                  {buildPageItems(currentPage, totalPages).map((item) =>
                    typeof item === "number" ? (
                      <li key={item}>
                        <button
                          className={`pagination__page ${item === currentPage ? "is-current" : ""}`}
                          type="button"
                          onClick={() => goToPage(item)}
                          aria-label={`Page ${item}`}
                          aria-current={item === currentPage ? "page" : undefined}
                        >
                          {item}
                        </button>
                      </li>
                    ) : (
                      <li key={item} className="pagination__ellipsis" aria-hidden="true">
                        …
                      </li>
                    )
                  )}
                </ol>

                <button
                  className="pagination__arrow"
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                </button>
                <button
                  className="pagination__arrow"
                  type="button"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">last_page</span>
                </button>
              </nav>
            ) : null}
          </section>
        </div>
      </main>

      {showAddModal && (
        <AddDramaModal
          userId={user.id}
          initialResult={pendingTrending}
          onDramaAdded={handleDramaAdded}
          onClose={() => {
            setShowAddModal(false);
            setPendingTrending(null);
          }}
        />
      )}

      {selectedDrama && (
        <DramaDetailModal
          drama={selectedDrama}
          onUpdated={handleDramaUpdated}
          onProgressUpdated={handleProgressUpdated}
          onDeleted={handleDramaDeleted}
          onClose={() => setSelectedDrama(null)}
        />
      )}
    </AppShell>
  );
}
