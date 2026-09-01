import { useState, useEffect, useRef } from "react";
import { updateDrama, deleteDrama } from "../lib/supabase";
import { extractMainCast, findShowByTitle, getShowDetails, tmdbImage } from "../lib/tmdb";
import "./Modal.css";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const statusLabels = {
  completed: "Watched",
  watching: "Watching",
  want_to_watch: "Want to watch",
};

// Finishing the last episode marks a drama watched; starting one marks it as
// in progress. Mirrors the behaviour in the Stitch management view.
const deriveStatus = (episodes, total, currentStatus) => {
  if (!total) return currentStatus;
  if (episodes >= total) return "completed";
  if (episodes > 0) return "watching";
  return currentStatus;
};

export default function DramaDetailModal({ drama, onUpdated, onProgressUpdated, onDeleted, onClose }) {
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
    review: drama.review || "",
    total_episodes: drama.total_episodes || "",
    episodes_watched: drama.episodes_watched || "",
    main_cast: drama.main_cast || [],
    tmdb_id: drama.tmdb_id || ""
  });
  const [refreshing, setRefreshing] = useState(false);
  const [episodesWatched, setEpisodesWatched] = useState(Number(drama.episodes_watched) || 0);
  const [progressError, setProgressError] = useState("");
  const [currentRating, setCurrentRating] = useState(drama.rating ?? null);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState(drama.title);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const totalEpisodes = Number(drama.total_episodes) || 0;
  // A finished drama has nothing left to track — it shows its length instead.
  const isCompleted = drama.status === "completed";
  const saveTimer = useRef(null);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Parent updates from the detail modal (including episode progress) should
  // remain reflected when the selected drama changes in place.
  useEffect(() => {
    setCurrentRating(drama.rating ?? null);
  }, [drama.id, drama.rating]);

  // The stepper updates instantly and writes back shortly after you stop
  // clicking, so holding + does not fire a request per episode.
  const setEpisodeProgress = (nextValue) => {
    const clamped = Math.min(Math.max(Number(nextValue) || 0, 0), totalEpisodes || Infinity);
    setEpisodesWatched(clamped);
    setProgressError("");

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data, error: saveError } = await updateDrama(drama.id, {
        episodes_watched: clamped,
        status: deriveStatus(clamped, totalEpisodes, drama.status),
      });

      if (saveError) {
        setProgressError(
          /column/i.test(saveError.message || "")
            ? "Episode tracking needs the episodes_watched column — run the migration in supabase/add-episode-tracking.sql."
            : "Could not save your episode progress."
        );
        return;
      }

      if (data?.[0]) onProgressUpdated?.(data[0]);
    }, 600);
  };

  const saveRating = async (rating) => {
    setRatingSaving(true);
    setRatingError("");

    const { data, error: saveError } = await updateDrama(drama.id, { rating });

    if (saveError || !data?.[0]) {
      setRatingError("Could not save your rating. Please try again.");
      setRatingSaving(false);
      return;
    }

    setCurrentRating(data[0].rating);
    onProgressUpdated?.(data[0]);
    setRatingSaving(false);
  };

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

  const selectResult = async (result) => {
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
      year_released: result.first_air_date ? parseInt(result.first_air_date.split("-")[0]) : "",
      tmdb_id: String(result.id)
    });

    setSearchMode(false);
    setSearchResults([]);
    setSearchQuery("");

    // Picking a title also relinks it, so pull its cast and length straight away.
    const { data: details } = await getShowDetails(result.id);
    if (details?.id) {
      setEditData((current) => ({
        ...current,
        main_cast: extractMainCast(details),
        total_episodes: details.number_of_episodes || current.total_episodes
      }));
    }
  };

  // Backfills cast and episode count for dramas saved before those existed.
  // Older entries have no tmdb_id, so they are relinked by title first.
  const refreshFromTmdb = async () => {
    setRefreshing(true);
    setError("");

    const title = editData.title || drama.title;
    let tmdbId = editData.tmdb_id || drama.tmdb_id;

    if (!tmdbId) {
      const { data: match } = await findShowByTitle(title);

      if (!match?.id) {
        setError(`Could not find “${title}” on TMDb. Use “Search TMDb again” to pick it manually.`);
        setRefreshing(false);
        return;
      }

      tmdbId = match.id;
    }

    const { data: details, error: detailsError } = await getShowDetails(tmdbId);

    if (detailsError || !details?.id) {
      setError("Could not reach TMDb. Please try again.");
      setRefreshing(false);
      return;
    }

    const cast = extractMainCast(details);

    setEditData((current) => ({
      ...current,
      tmdb_id: String(tmdbId),
      main_cast: cast,
      total_episodes: details.number_of_episodes || current.total_episodes,
    }));

    if (cast.length === 0) {
      setError(`TMDb has no cast listed for “${details.name || title}”.`);
    }

    setRefreshing(false);
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError("");

    const editedTotal = editData.total_episodes ? parseInt(editData.total_episodes) : null;
    // Marking something completed implies every episode was watched.
    const editedWatched = editData.status === "completed"
      ? editedTotal || 0
      : editData.episodes_watched ? parseInt(editData.episodes_watched) : 0;

    const updatePayload = {
      title: editData.title,
      poster_url: editData.poster_url || null,
      synopsis: editData.synopsis || null,
      genres: editData.genres.length > 0 ? editData.genres : null,
      year_released: editData.year_released ? parseInt(editData.year_released) : null,
      status: editData.status,
      year_watched: editData.year_watched || null,
      rating: editData.rating ? parseInt(editData.rating) : null,
      review: editData.review || null,
      total_episodes: editedTotal,
      episodes_watched: editedWatched,
      main_cast: editData.main_cast?.length > 0 ? editData.main_cast : null,
      tmdb_id: editData.tmdb_id || null
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

  const errorBanner = error ? (
    <div className="error-banner" role="alert">
      <span className="material-symbols-outlined" aria-hidden="true">error</span>
      <span>{error}</span>
    </div>
  ) : null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Drama details">
      <div className="modal-sheet">
        <div className="modal-sheet__header">
          <div>
            <span className="eyebrow">{isEditing ? "Editing" : "From your collection"}</span>
            <h2>{isEditing ? "Edit drama" : drama.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close drama detail modal" type="button">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {!isEditing ? (
          <>
            <div className="modal-summary">
              {drama.poster_url ? (
                <img className="modal-summary__poster" src={drama.poster_url} alt="" />
              ) : (
                <div className="modal-summary__poster modal-summary__poster--empty" />
              )}
              <div className="modal-summary__body">
                <p className="modal-summary__meta">
                  {drama.year_released ? `Released: ${drama.year_released}` : "Release year unknown"}
                </p>
                {drama.rating && (
                  <span className="modal-summary__rating">
                    <span className="material-symbols-outlined is-filled" aria-hidden="true">star</span>
                    {drama.rating}/10
                  </span>
                )}
                {drama.genres && drama.genres.length > 0 && (
                  <div className="detail-genres">
                    {drama.genres.map((genre) => (
                      <span key={genre}>{genre}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isCompleted ? null : totalEpisodes > 0 ? (
              <div className="episode-tracker">
                <p className="episode-tracker__label">Episodes watched</p>
                <div className="episode-tracker__row">
                  <div
                    className="episode-tracker__bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={totalEpisodes}
                    aria-valuenow={episodesWatched}
                    aria-label="Episode progress"
                  >
                    <div style={{ width: `${(episodesWatched / totalEpisodes) * 100}%` }} />
                  </div>

                  <div className="episode-stepper">
                    <button
                      type="button"
                      onClick={() => setEpisodeProgress(episodesWatched - 1)}
                      disabled={episodesWatched === 0}
                      aria-label="One episode back"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">remove</span>
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={totalEpisodes}
                      value={episodesWatched}
                      onChange={(event) => setEpisodeProgress(event.target.value)}
                      aria-label="Episodes watched"
                    />
                    <span className="episode-stepper__divider">/</span>
                    <span className="episode-stepper__total">{totalEpisodes}</span>
                    <button
                      type="button"
                      onClick={() => setEpisodeProgress(episodesWatched + 1)}
                      disabled={episodesWatched >= totalEpisodes}
                      aria-label="One episode forward"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">add</span>
                    </button>
                  </div>
                </div>
                {progressError ? (
                  <p className="episode-tracker__error" role="alert">{progressError}</p>
                ) : (
                  <p className="episode-tracker__hint">
                    {episodesWatched >= totalEpisodes
                      ? "Finished — marked as watched."
                      : `${totalEpisodes - episodesWatched} episodes to go.`}
                  </p>
                )}
              </div>
            ) : (
              <p className="episode-tracker__hint episode-tracker__hint--standalone">
                Add the total episode count under Edit to track your progress.
              </p>
            )}

            {drama.status === "watching" ? (
              <section className="detail-rating" aria-labelledby="detail-rating-label">
                <div className="detail-rating__heading">
                  <p id="detail-rating-label">Your rating</p>
                  <strong>{currentRating ? `${currentRating}/10` : "Not rated"}</strong>
                </div>
                <div className="detail-rating__stars" aria-label="Your rating" aria-busy={ratingSaving}>
                  {Array.from({ length: 10 }, (_, index) => {
                    const value = index + 1;
                    const isSelected = Number(currentRating) >= value;

                    return (
                      <button
                        key={value}
                        type="button"
                        className={isSelected ? "is-selected" : ""}
                        onClick={() => saveRating(value)}
                        disabled={ratingSaving}
                        aria-label={`Rate ${drama.title} ${value} out of 10`}
                        aria-pressed={Number(currentRating) === value}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">star</span>
                      </button>
                    );
                  })}
                </div>
                {ratingError ? <p className="detail-rating__error" role="alert">{ratingError}</p> : null}
              </section>
            ) : null}

            <div className="detail-facts">
              <article>
                <p>Status</p>
                <strong>{statusLabels[drama.status] || "Want to watch"}</strong>
              </article>
              <article>
                <p>Watched in</p>
                <strong>{drama.year_watched || "Not recorded"}</strong>
              </article>
              {isCompleted && totalEpisodes > 0 ? (
                <article>
                  <p>Length</p>
                  <strong>{totalEpisodes} episodes</strong>
                </article>
              ) : null}
            </div>

            {drama.main_cast?.length > 0 ? (
              <div className="detail-prose">
                <h3>Main cast</h3>
                <ul className="cast-list">
                  {drama.main_cast.map((person) => (
                    <li key={person.id || person.name} className="cast-chip">
                      {person.profile_path ? (
                        <img src={tmdbImage(person.profile_path, "w185")} alt="" loading="lazy" />
                      ) : (
                        <span className="cast-chip__initial">{person.name?.[0] || "?"}</span>
                      )}
                      <span className="cast-chip__text">
                        <b>{person.name}</b>
                        {person.character ? <em>{person.character}</em> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {drama.review && (
              <div className="detail-prose">
                <h3>Review</h3>
                <p>{drama.review}</p>
              </div>
            )}

            {drama.synopsis && (
              <div className="detail-prose">
                <h3>Synopsis</h3>
                <p>{drama.synopsis}</p>
              </div>
            )}

            {errorBanner}

            <div className="modal-actions">
              <button className="btn btn--primary" type="button" onClick={() => setIsEditing(true)}>
                <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                Edit
              </button>
              <button className="btn btn--danger" type="button" onClick={handleDelete} disabled={submitting}>
                <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                Delete
              </button>
            </div>
          </>
        ) : searchMode ? (
          <>
            <form className="modal-search" onSubmit={searchTMDB}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for drama..."
                aria-label="Search for drama"
              />
              <button className="btn btn--primary" type="submit" disabled={searching}>
                {searching ? "Searching…" : "Search"}
              </button>
            </form>

            {errorBanner}

            {searchResults.length > 0 && (
              <div className="result-list">
                {searchResults.map(result => (
                  <button
                    key={result.id}
                    type="button"
                    className="result-card"
                    onClick={() => selectResult(result)}
                  >
                    {result.poster_path ? (
                      <img
                        className="result-card__poster"
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt=""
                      />
                    ) : (
                      <div className="result-card__poster result-card__poster--empty" />
                    )}
                    <div className="result-card__body">
                      <p className="result-card__title">{result.name || result.title}</p>
                      <p className="result-card__overview">{result.overview}</p>
                      <p className="result-card__year">
                        {result.first_air_date ? new Date(result.first_air_date).getFullYear() : "Year unknown"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => {
                  setSearchMode(false);
                  setSearchResults([]);
                }}
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <div className="modal-form">
            <div className="field">
              <label htmlFor="detail-poster">Poster</label>
              <div style={{ display: "flex", gap: "var(--margin-sm)", alignItems: "flex-start" }}>
                {editData.poster_url ? (
                  <img className="result-card__poster" src={editData.poster_url} alt="" />
                ) : (
                  <div className="result-card__poster result-card__poster--empty" />
                )}
                <input
                  id="detail-poster"
                  type="text"
                  value={editData.poster_url}
                  onChange={(e) => setEditData({ ...editData, poster_url: e.target.value })}
                  placeholder="Poster URL"
                />
              </div>
              <div className="modal-form__grid" style={{ marginTop: "var(--margin-sm)" }}>
                <button className="btn btn--ghost" type="button" onClick={() => setSearchMode(true)}>
                  <span className="material-symbols-outlined" aria-hidden="true">search</span>
                  Search TMDb again
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={refreshFromTmdb}
                  disabled={refreshing}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                  {refreshing ? "Fetching…" : "Fetch cast & episodes"}
                </button>
              </div>
            </div>

            {editData.main_cast?.length > 0 ? (
              <div className="field">
                <span>Main cast</span>
                <ul className="cast-list cast-list--compact">
                  {editData.main_cast.map((person) => (
                    <li key={person.id || person.name} className="cast-chip">
                      {person.profile_path ? (
                        <img src={tmdbImage(person.profile_path, "w185")} alt="" loading="lazy" />
                      ) : (
                        <span className="cast-chip__initial">{person.name?.[0] || "?"}</span>
                      )}
                      <span className="cast-chip__text">
                        <b>{person.name}</b>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="modal-form__hint">Pulled from TMDb — refresh to update.</p>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="detail-title">Title</label>
              <input
                id="detail-title"
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="detail-status">Status</label>
              <select
                id="detail-status"
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
              >
                <option value="completed">Completed</option>
                <option value="watching">Currently watching</option>
                <option value="want_to_watch">Want to watch</option>
              </select>
            </div>

            <div className="modal-form__grid">
              <div className="field">
                <label htmlFor="detail-year-released">Year released</label>
                <input
                  id="detail-year-released"
                  type="number"
                  value={editData.year_released}
                  onChange={(e) => setEditData({ ...editData, year_released: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="detail-year-watched">Year watched</label>
                <input
                  id="detail-year-watched"
                  type="text"
                  value={editData.year_watched}
                  onChange={(e) => setEditData({ ...editData, year_watched: e.target.value })}
                  placeholder="e.g., 2024 or 2024-06"
                />
              </div>
            </div>

            <div className="modal-form__grid">
              <div className="field">
                <label htmlFor="detail-total-episodes">Total episodes</label>
                <input
                  id="detail-total-episodes"
                  type="number"
                  min="0"
                  value={editData.total_episodes}
                  onChange={(e) => setEditData({ ...editData, total_episodes: e.target.value })}
                  placeholder="e.g., 16"
                />
              </div>
              {/* A completed drama is fully watched by definition. */}
              {editData.status === "completed" ? null : (
                <div className="field">
                  <label htmlFor="detail-episodes-watched">Episodes watched</label>
                  <input
                    id="detail-episodes-watched"
                    type="number"
                    min="0"
                    value={editData.episodes_watched}
                    onChange={(e) => setEditData({ ...editData, episodes_watched: e.target.value })}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="detail-genres">Genres</label>
              <input
                id="detail-genres"
                type="text"
                value={editData.genres.join(", ")}
                onChange={(e) => setEditData({
                  ...editData,
                  genres: e.target.value.split(",").map(g => g.trim()).filter(Boolean)
                })}
                placeholder="e.g., Drama, Romance, Comedy"
              />
              <p className="modal-form__hint">Separate with commas</p>
            </div>

            <div className="field">
              <label htmlFor="detail-rating">Rating (1-10)</label>
              <input
                id="detail-rating"
                type="number"
                min="1"
                max="10"
                value={editData.rating}
                onChange={(e) => setEditData({ ...editData, rating: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="field">
              <label htmlFor="detail-synopsis">Synopsis</label>
              <textarea
                id="detail-synopsis"
                value={editData.synopsis}
                onChange={(e) => setEditData({ ...editData, synopsis: e.target.value })}
                placeholder="Drama synopsis..."
              />
            </div>

            <div className="field">
              <label htmlFor="detail-review">Review</label>
              <textarea
                id="detail-review"
                value={editData.review}
                onChange={(e) => setEditData({ ...editData, review: e.target.value })}
                placeholder="Add your thoughts..."
              />
            </div>

            {errorBanner}

            <div className="modal-actions">
              <button className="btn btn--ghost" type="button" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={handleSave} disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
