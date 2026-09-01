import { useState } from "react";
import { addDrama } from "../lib/supabase";
import { extractMainCast } from "../lib/tmdb";
import "./Modal.css";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function AddDramaModal({ userId, initialResult, onDramaAdded, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Arriving from the trending banner skips straight to the details form.
  const [selectedResult, setSelectedResult] = useState(initialResult || null);
  const [status, setStatus] = useState("completed");
  const [yearWatched, setYearWatched] = useState(new Date().getFullYear().toString());
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");
  const [totalEpisodes, setTotalEpisodes] = useState(
    initialResult?.number_of_episodes ? String(initialResult.number_of_episodes) : ""
  );
  const [mainCast, setMainCast] = useState(
    initialResult?.credits ? extractMainCast(initialResult) : []
  );
  const [episodesWatched, setEpisodesWatched] = useState("");
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

  // TMDB search results omit the episode count, so pull it from the details
  // endpoint. A failure here is not fatal — the count stays editable by hand.
  const fetchShowExtras = async (result) => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${result.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`
      );
      const details = await response.json();
      if (details?.number_of_episodes) {
        setTotalEpisodes(String(details.number_of_episodes));
      }
      setMainCast(extractMainCast(details));
    } catch {
      // Leave the fields blank; they stay editable by hand.
    }
  };

  const selectResult = async (result) => {
    setSelectedResult(result);
    setError("");
    setTotalEpisodes("");
    setMainCast([]);
    await fetchShowExtras(result);
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

    const parsedTotalEpisodes = totalEpisodes ? parseInt(totalEpisodes) : null;

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
      review: review || null,
      main_cast: mainCast.length > 0 ? mainCast : null,
      total_episodes: parsedTotalEpisodes,
      episodes_watched: status === "completed"
        ? parsedTotalEpisodes || 0
        : episodesWatched ? parseInt(episodesWatched) : 0
    });

    if (error) {
      setError("Failed to add drama. Please try again.");
      setSubmitting(false);
    } else {
      onDramaAdded(data[0]);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add drama">
      <div className="modal-sheet">
        <div className="modal-sheet__header">
          <div>
            <span className="eyebrow">New entry</span>
            <h2>{selectedResult ? "Drama details" : "Add drama"}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close add drama modal" type="button">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {!selectedResult ? (
          <>
            <form className="modal-search" onSubmit={searchTMDB}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a drama..."
                aria-label="Search for a drama"
              />
              <button className="btn btn--primary" type="submit" disabled={loading}>
                {loading ? "Searching…" : "Search"}
              </button>
            </form>

            {error && (
              <div className="error-banner" role="alert" style={{ marginBottom: "var(--margin-md)" }}>
                <span className="material-symbols-outlined" aria-hidden="true">error</span>
                <span>{error}</span>
              </div>
            )}

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
          </>
        ) : (
          <>
            <div className="modal-summary">
              {selectedResult.poster_path ? (
                <img
                  className="modal-summary__poster"
                  src={`https://image.tmdb.org/t/p/w185${selectedResult.poster_path}`}
                  alt=""
                />
              ) : (
                <div className="modal-summary__poster modal-summary__poster--empty" />
              )}
              <div className="modal-summary__body">
                <p className="modal-summary__title">{selectedResult.name || selectedResult.title}</p>
                <p className="modal-summary__meta">
                  {selectedResult.first_air_date
                    ? new Date(selectedResult.first_air_date).getFullYear()
                    : "Year unknown"}
                  {totalEpisodes ? ` • ${totalEpisodes} episodes` : ""}
                </p>
                {mainCast.length > 0 ? (
                  <p className="modal-summary__meta">
                    Starring {mainCast.slice(0, 3).map((person) => person.name).join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="modal-form">
              <div className="modal-form__grid">
                <div className="field">
                  <label htmlFor="add-drama-status">Status</label>
                  <select
                    id="add-drama-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="completed">Completed</option>
                    <option value="watching">Currently watching</option>
                    <option value="want_to_watch">Want to watch</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="add-drama-year">Year watched</label>
                  <input
                    id="add-drama-year"
                    type="number"
                    value={yearWatched}
                    onChange={(e) => setYearWatched(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-form__grid">
                <div className="field">
                  <label htmlFor="add-drama-total-episodes">Total episodes</label>
                  <input
                    id="add-drama-total-episodes"
                    type="number"
                    min="0"
                    value={totalEpisodes}
                    onChange={(e) => setTotalEpisodes(e.target.value)}
                    placeholder="From TMDb"
                  />
                </div>

                {/* Completed means every episode — nothing to ask for. */}
                {status === "completed" ? null : (
                  <div className="field">
                    <label htmlFor="add-drama-episodes-watched">Episodes watched</label>
                    <input
                      id="add-drama-episodes-watched"
                      type="number"
                      min="0"
                      max={totalEpisodes || undefined}
                      value={episodesWatched}
                      onChange={(e) => setEpisodesWatched(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <div className="field">
                <label htmlFor="add-drama-rating">Rating (1-10)</label>
                <input
                  id="add-drama-rating"
                  type="number"
                  min="1"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="field">
                <label htmlFor="add-drama-review">Review</label>
                <textarea
                  id="add-drama-review"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Add your thoughts..."
                />
              </div>

              {error && (
                <div className="error-banner" role="alert">
                  <span className="material-symbols-outlined" aria-hidden="true">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn btn--ghost" type="button" onClick={() => setSelectedResult(null)}>
                  Back
                </button>
                <button className="btn btn--primary" type="button" onClick={handleAddDrama} disabled={submitting}>
                  {submitting ? "Adding…" : "Add to watchlist"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
