import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDramas, signOut } from "../lib/supabase";
import AddDramaModal from "../components/AddDramaModal";
import DramaDetailModal from "../components/DramaDetailModal";
import "./Watchlist.css";

const statuses = [
  ["all", "All"],
  ["completed", "Watched"],
  ["watching", "Watching"],
  ["want_to_watch", "Want to watch"],
];

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

  useEffect(() => {
    let isCurrent = true;
    const loadInitialDramas = async () => {
      setLoading(true);
      const { data, error } = await getDramas();
      if (!isCurrent) return;
      if (!error) setDramas(data || []);
      else showToast("Failed to load dramas", "error");
      setLoading(false);
    };
    loadInitialDramas();
    return () => { isCurrent = false; };
  }, [showToast]);

  useEffect(() => {
    const loadFeaturedDramas = async () => {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      if (!apiKey) return;
      try {
        const response = await fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&with_original_language=ko&with_genres=18&with_type=2&sort_by=popularity.desc&page=1`);
        const data = await response.json();
        setFeaturedDramas((data.results || []).filter((item) => item.poster_path && (item.origin_country?.includes("KR") || item.original_language === "ko")).slice(0, 5).map((item) => ({
          title: item.name || item.title,
          overview: item.overview || "Popular ongoing K-drama",
          posterUrl: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
          backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
          tmdbId: item.id,
        })));
      } catch (error) { console.error("Failed to load featured dramas", error); }
    };
    loadFeaturedDramas();
  }, []);

  useEffect(() => {
    if (featuredDramas.length <= 1) return undefined;
    const timer = window.setInterval(() => setFeaturedIndex((current) => (current + 1) % featuredDramas.length), 5000);
    return () => window.clearInterval(timer);
  }, [featuredDramas.length]);

  const getYearValue = (drama) => {
    const match = String(drama.year_watched ?? drama.year_released ?? "").trim().match(/(\d{4})/);
    return match ? Number(match[1]) : 0;
  };
  const getGenreText = (drama) => Array.isArray(drama.genres) && drama.genres.length ? drama.genres.join(", ") : drama.genre?.trim() || "No genres";
  const getStatusLabel = (status) => ({ completed: "Completed", watching: "Watching", want_to_watch: "Want to watch" }[status] || "Unknown");

  const filteredDramas = dramas.filter((drama) => {
    const query = searchQuery.trim().toLowerCase();
    const text = `${drama.title || ""} ${drama.year_watched || ""} ${drama.year_released || ""} ${drama.genres?.join(" ") || ""}`.toLowerCase();
    return (filter === "all" || drama.status === filter) && (!query || text.includes(query)) && (yearFilter === "all" || getYearValue(drama) === Number(yearFilter));
  }).sort((a, b) => {
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
    if (sortBy === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    if (sortBy === "newest") return getYearValue(b) - getYearValue(a);
    if (sortBy === "oldest") return getYearValue(a) - getYearValue(b);
    return getYearValue(a) - getYearValue(b);
  });

  const ratedDramas = dramas.filter((drama) => Number(drama.rating) > 0);
  const genreCounts = dramas.reduce((counts, drama) => {
    (Array.isArray(drama.genres) ? drama.genres : []).forEach((genre) => { if (genre.trim()) counts[genre.trim()] = (counts[genre.trim()] || 0) + 1; });
    return counts;
  }, {});
  const stats = {
    total: dramas.length,
    averageRating: ratedDramas.length ? (ratedDramas.reduce((sum, drama) => sum + Number(drama.rating), 0) / ratedDramas.length).toFixed(1) : "0.0",
    topGenre: Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "No genres",
    ratedCount: ratedDramas.length,
  };
  const availableYears = Array.from(new Set([
    ...dramas.map(getYearValue).filter(Boolean),
    new Date().getFullYear(),
  ])).sort((a, b) => b - a);
  const featured = featuredDramas[featuredIndex];
  const shiftFeatured = (direction) => setFeaturedIndex((current) => (current + direction + featuredDramas.length) % featuredDramas.length);
  const handleLogout = async () => { await signOut(); showToast("Logged out successfully", "info"); navigate("/login"); };
  const handleDramaAdded = (newDrama) => { setDramas((current) => [newDrama, ...current]); setShowAddModal(false); showToast(`Added "${newDrama.title}" to watchlist!`, "success"); };
  const handleDramaUpdated = (updatedDrama) => { setDramas((current) => current.map((drama) => drama.id === updatedDrama.id ? updatedDrama : drama)); setSelectedDrama(null); showToast("Drama updated successfully!", "success"); };
  const handleDramaDeleted = (dramaId) => { const title = dramas.find((drama) => drama.id === dramaId)?.title; setDramas((current) => current.filter((drama) => drama.id !== dramaId)); setSelectedDrama(null); showToast(`Deleted "${title}"`, "info"); };

  return <main className="watchlist-page">
    <header className="watchlist-header">
      <div className="watchlist-header__inner">
        <button className="watchlist-brand" type="button" onClick={() => navigate("/watchlist")}>DramaLog</button>
        <nav className="watchlist-nav" aria-label="Primary navigation">
          <button className="is-active" type="button" onClick={() => navigate("/watchlist")}>Watchlist</button>
          <button type="button" onClick={() => navigate("/analytics")}>Analytics</button>
        </nav>
        <div className="watchlist-header__actions">
          <span className="account-email" title={user.email}>{user.email}</span>
          <button className="add-button add-button--header" type="button" onClick={() => setShowAddModal(true)}>+ <span>Add drama</span></button>
          <button className="account-button" type="button" onClick={handleLogout} aria-label="Log out" title="Log out">↗</button>
        </div>
      </div>
    </header>

    <section className={`cinema-hero${featured ? "" : " cinema-hero--fallback"}`} aria-label="Featured popular K-dramas">
      {featured?.backdropUrl && <img className="cinema-hero__backdrop" src={featured.backdropUrl} alt="" />}
      <div className="cinema-hero__shade" />
      <div className="cinema-hero__inner">
        <div className="cinema-hero__copy">
          <p className="eyebrow">Trending now</p>
          <p className="hero-kicker">{featured ? <>Popular K-dramas <span>{featuredIndex + 1} / {featuredDramas.length}</span></> : "Your next story awaits"}</p>
          <h3>{featured?.title || "A quiet place for every drama"}</h3>
          <p className="cinema-hero__overview">{featured?.overview || "Keep the shows you love, the stories you are living through, and the ones still waiting for a rainy evening—all in one personal archive."}</p>
          {featured ? <a className="hero-watch" href={`https://www.themoviedb.org/tv/${featured.tmdbId}`} target="_blank" rel="noreferrer" aria-label={`Open ${featured.title} on TMDb`}>View on TMDb <span aria-hidden="true">↗</span></a> : <button className="hero-watch" type="button" onClick={() => setShowAddModal(true)}>Begin your archive <span aria-hidden="true">+</span></button>}
        </div>
        {featured && <div className="cinema-hero__poster-link"><img className="cinema-hero__poster" src={featured.posterUrl} alt={featured.title} /></div>}
        {featuredDramas.length > 1 && <div className="hero-controls"><button type="button" aria-label="Previous featured drama" onClick={() => shiftFeatured(-1)}>‹</button><button type="button" aria-label="Next featured drama" onClick={() => shiftFeatured(1)}>›</button></div>}
      </div>
    </section>

    <div className="watchlist-content">
      <section className="stat-grid" aria-label="Watchlist summary">
        <article><p>Total dramas</p><strong>{stats.total}</strong><span>Stories explored</span></article>
        <article><p>Avg. rating</p><strong>{stats.averageRating}<em>/10</em></strong><span>Your rated collection</span></article>
        <article className="stat-grid__genre"><p>Top genre</p><strong>{stats.topGenre}</strong><span>Your most returned-to mood</span></article>
        <article><p>Rated</p><strong>{stats.ratedCount}</strong><span>Reviews written</span></article>
      </section>

      <section className="collection" aria-labelledby="collection-heading">
        <div className="collection__heading"><div><p className="eyebrow eyebrow--ink">Your personal archive</p><h1 id="collection-heading">My watchlist</h1></div><button className="add-button" type="button" onClick={() => setShowAddModal(true)}>+ Add drama</button></div>
        <div className="filter-toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search dramas..." /><button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className={searchQuery ? "is-visible" : ""}>×</button></label>
          <div className="status-pills" aria-label="Filter by status">{statuses.map(([value, label]) => <button key={value} type="button" className={filter === value ? "is-selected" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
          <div className="selects"><label>Year <select aria-label="Filter by year watched" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="all">All years</option>{availableYears.map((year) => <option value={year} key={year}>{year}</option>)}</select></label><label>Sort <select aria-label="Sort by" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="default">Default</option><option value="title">Title</option><option value="rating">Rating</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>
        </div>
        <p className="results-count">Showing {filteredDramas.length} result{filteredDramas.length === 1 ? "" : "s"}</p>
        {loading ? <div className="collection-state"><i className="loading-reel" /><p>Opening your drama archive…</p></div> : filteredDramas.length === 0 ? <div className="collection-state collection-state--empty"><p className="empty-mark">✦</p><h2>{searchQuery ? "No dramas match your search" : "Your archive is waiting"}</h2><p>{searchQuery ? "Try a different title, year, or filter." : "Add the first story you want to remember."}</p><button className="add-button" type="button" onClick={() => setShowAddModal(true)}>+ Add your first drama</button></div> : <div className="drama-grid">{filteredDramas.map((drama) => <article className="drama-card" key={drama.id}><button type="button" className="drama-card__button" onClick={() => setSelectedDrama(drama)} aria-label={`Open ${drama.title}`}><div className="drama-card__poster">{drama.poster_url ? <img src={drama.poster_url} alt="" /> : <div className="poster-fallback"><span>DramaLog</span><b>{(drama.title || "D").slice(0, 1)}</b></div>}<div className="poster-details"><span className={`status-tag status-tag--${drama.status}`}>{getStatusLabel(drama.status)}</span>{Number(drama.rating) > 0 && <span className="rating-tag">★ {drama.rating}</span>}</div></div><div className="drama-card__details"><p className="drama-card__title">{drama.title}</p><p className="drama-card__meta">{drama.year_watched || drama.year_released || "Year unknown"} • <span>{getGenreText(drama)}</span></p></div></button></article>)}</div>}
      </section>
    </div>
    {showAddModal && <AddDramaModal userId={user.id} onDramaAdded={handleDramaAdded} onClose={() => setShowAddModal(false)} />}
    {selectedDrama && <DramaDetailModal drama={selectedDrama} onUpdated={handleDramaUpdated} onDeleted={handleDramaDeleted} onClose={() => setSelectedDrama(null)} />}
  </main>;
}
