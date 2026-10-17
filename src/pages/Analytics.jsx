import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDramas, signOut } from "../lib/supabase";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import AppShell from "../components/AppShell";
import { tmdbImage } from "../lib/tmdb";
import "./Analytics.css";

// Wrapped palette: brand lavender/blossom/mint elevated to neon accents.
const COLORS = ["#d8b4fe", "#ffa6b1", "#9dd1c4", "#dbb8ff", "#ffb2bb", "#b8eddf", "#efdbff", "#ffd9dc"];

// The collection starts in 2009, so the range covers everything by default.
const FIRST_YEAR = "2009";

const tooltipStyle = {
  background: "rgba(20, 18, 45, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "12px",
  color: "#ffffff",
  fontFamily: "Manrope, sans-serif",
  fontSize: "13px",
};

export default function Analytics({ user, showToast }) {
  const navigate = useNavigate();
  const [dramas, setDramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(FIRST_YEAR);
  const [dateTo, setDateTo] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    const loadDramas = async () => {
      setLoading(true);
      const { data, error } = await getDramas();
      if (!error) {
        setDramas(data || []);
      } else {
        showToast("Failed to load dramas", "error");
      }
      setLoading(false);
    };

    loadDramas();
  }, [showToast]);

  const filteredDramas = dramas.filter((d) => {
    if (!d.year_watched) return false;
    const year = parseInt(String(d.year_watched).split("-")[0]);
    return year >= parseInt(dateFrom) && year <= parseInt(dateTo);
  });

  const totalDramas = filteredDramas.length;
  const ratedDramas = filteredDramas.filter((d) => d.rating);
  const avgRating = ratedDramas.length > 0
    ? (ratedDramas.reduce((sum, d) => sum + (d.rating || 0), 0) / ratedDramas.length).toFixed(1)
    : "0";

  const genreCount = {};
  filteredDramas.forEach((d) => {
    if (d.genres && d.genres.length > 0) {
      d.genres.forEach((genre) => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    }
  });
  const topGenre = Object.keys(genreCount).length > 0
    ? Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0][0]
    : "No data";

  const dramatsByYear = {};
  const ratingsByYear = {};
  const ratingCountsByYear = {};

  filteredDramas.forEach((d) => {
    if (!d.year_watched) return;
    const year = String(d.year_watched).split("-")[0];

    dramatsByYear[year] = (dramatsByYear[year] || 0) + 1;

    if (d.rating) {
      ratingsByYear[year] = (ratingsByYear[year] || 0) + d.rating;
      ratingCountsByYear[year] = (ratingCountsByYear[year] || 0) + 1;
    }
  });

  const yearChartData = Object.entries(dramatsByYear)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => ({
      year,
      count,
      avgRating: ratingCountsByYear[year] ? (ratingsByYear[year] / ratingCountsByYear[year]).toFixed(1) : 0,
    }));

  const genreChartData = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({
      name: genre,
      value: count,
    }));

  const genreTotal = genreChartData.reduce((sum, entry) => sum + entry.value, 0);
  const legendGenres = genreChartData.slice(0, 4);

  // Conic gradient stand-in for the Stitch "Genre Soul" donut.
  const donutGradient = (() => {
    if (genreTotal === 0) return "conic-gradient(rgba(255,255,255,0.08) 0% 100%)";
    let cursor = 0;
    const stops = genreChartData.slice(0, 6).map((entry, index) => {
      const start = (cursor / genreTotal) * 100;
      cursor += entry.value;
      const end = (cursor / genreTotal) * 100;
      return `${COLORS[index % COLORS.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  // Who you watch most. Ranked by drama count, then by summed rating so a
  // tie breaks toward the actor whose dramas you actually rated highly.
  const actorTally = new Map();
  filteredDramas.forEach((drama) => {
    (drama.main_cast || []).forEach((person) => {
      if (!person?.name) return;
      const key = person.id || person.name;
      const entry = actorTally.get(key) || {
        name: person.name,
        profile_path: person.profile_path,
        count: 0,
        ratingSum: 0,
        ratedCount: 0,
        titles: [],
      };
      entry.count += 1;
      entry.titles.push(drama.title);
      if (drama.rating) {
        entry.ratingSum += drama.rating;
        entry.ratedCount += 1;
      }
      if (!entry.profile_path && person.profile_path) entry.profile_path = person.profile_path;
      actorTally.set(key, entry);
    });
  });

  const topActors = [...actorTally.values()]
    .sort((a, b) => b.count - a.count || b.ratingSum - a.ratingSum)
    .slice(0, 6)
    .map((actor) => ({
      ...actor,
      avgRating: actor.ratedCount > 0 ? (actor.ratingSum / actor.ratedCount).toFixed(1) : null,
    }));

  const biggestIdol = topActors[0] || null;
  const runnersUp = topActors.slice(1);

  const peakYear = yearChartData.reduce(
    (best, entry) => (entry.count > (best?.count || 0) ? entry : best),
    null
  );

  const handleLogout = async () => {
    await signOut();
    showToast("Logged out successfully", "info");
    navigate("/login");
  };

  const handleShare = async () => {
    const summary = `My DramaLog Wrapped ${dateFrom}–${dateTo}: ${totalDramas} dramas, ${avgRating} average rating, top genre ${topGenre}.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "My DramaLog Wrapped", text: summary });
        return;
      } catch {
        // Sharing dismissed — fall through to the clipboard copy.
      }
    }

    try {
      await navigator.clipboard.writeText(summary);
      showToast("Wrapped summary copied to clipboard!", "success");
    } catch {
      showToast("Could not share your Wrapped summary", "error");
    }
  };

  return (
    <AppShell active="analytics" user={user} variant="wrapped" onSignOut={handleLogout}>
      <main className="wrapped-page">
        <div className="wrapped-glow wrapped-glow--primary" aria-hidden="true" />
        <div className="wrapped-glow wrapped-glow--secondary" aria-hidden="true" />

        <section className="wrapped-hero">
          <p className="eyebrow wrapped-hero__eyebrow">Your story in {dateTo}</p>
          <h1 className="wrapped-hero__title">
            The scripts you
            <br />
            <span>lived through.</span>
          </h1>

          <div className="wrapped-filters">
            <div className="glass-card wrapped-range">
              <label>
                <span>From</span>
                <input
                  type="number"
                  min={FIRST_YEAR}
                  max="2100"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <span className="wrapped-range__divider" />
              <label>
                <span>To</span>
                <input
                  type="number"
                  min={FIRST_YEAR}
                  max="2100"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
            <p className="wrapped-filters__count">Showing {filteredDramas.length} dramas</p>
          </div>
        </section>

        {loading ? (
          <div className="wrapped-state">
            <div className="loading-reel" />
            <h3 className="headline-md">Loading analytics…</h3>
          </div>
        ) : (
          <>
            <section className="wrapped-bento" aria-label="Headline statistics">
              <article className="glass-card wrapped-bento__large">
                <span className="wrapped-bento__aura wrapped-bento__aura--primary" aria-hidden="true" />
                <span className="material-symbols-outlined wrapped-bento__icon" aria-hidden="true">movie</span>
                <div>
                  <h2>Total dramas</h2>
                  <p className="wrapped-figure wrapped-figure--primary">{totalDramas}</p>
                </div>
              </article>

              <article className="glass-card wrapped-bento__large">
                <span className="wrapped-bento__aura wrapped-bento__aura--secondary" aria-hidden="true" />
                <span className="material-symbols-outlined wrapped-bento__icon wrapped-bento__icon--rose" aria-hidden="true">
                  star_half
                </span>
                <div>
                  <h2>Avg rating</h2>
                  <p className="wrapped-figure wrapped-figure--secondary">{avgRating}</p>
                </div>
              </article>

              <article className="glass-card wrapped-bento__small">
                <span className="wrapped-bento__badge wrapped-bento__badge--mint">
                  <span className="material-symbols-outlined" aria-hidden="true">theater_comedy</span>
                </span>
                <div>
                  <p className="wrapped-bento__label">Top genre</p>
                  <p className="wrapped-bento__value">{topGenre}</p>
                </div>
              </article>

              <article className="glass-card wrapped-bento__small">
                <span className="wrapped-bento__badge wrapped-bento__badge--lavender">
                  <span className="material-symbols-outlined" aria-hidden="true">rate_review</span>
                </span>
                <div>
                  <p className="wrapped-bento__label">Rated dramas</p>
                  <p className="wrapped-bento__value">
                    {ratedDramas.length} <em>items</em>
                  </p>
                </div>
              </article>

              <article className="glass-card wrapped-bento__small">
                <span className="wrapped-bento__badge wrapped-bento__badge--rose">
                  <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                </span>
                <div>
                  <p className="wrapped-bento__label">Busiest year</p>
                  <p className="wrapped-bento__value">
                    {peakYear ? peakYear.year : "—"}{" "}
                    <em>{peakYear ? `${peakYear.count} titles` : "no data"}</em>
                  </p>
                </div>
              </article>
            </section>

            <section className="wrapped-charts">
              <article className="glass-card wrapped-chart">
                <header>
                  <div>
                    <h3 className="headline-md">Dramas per year</h3>
                    <p>Your viewing trend since {dateFrom}</p>
                  </div>
                  <span className="material-symbols-outlined" aria-hidden="true">monitoring</span>
                </header>
                {yearChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={yearChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="year" stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(216,180,254,0.08)" }} />
                      <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                        {yearChartData.map((entry) => (
                          <Cell
                            key={entry.year}
                            fill={entry.year === dateTo ? "#d8b4fe" : "#6f5092"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="wrapped-chart__empty">No data for selected range</p>
                )}
              </article>

              <article className="glass-card wrapped-chart">
                <header>
                  <div>
                    <h3 className="headline-md">Genre soul</h3>
                    <p>The flavors you crave the most</p>
                  </div>
                  <span className="material-symbols-outlined" aria-hidden="true">pie_chart</span>
                </header>

                {genreTotal > 0 ? (
                  <div className="genre-soul">
                    <div className="genre-soul__donut" style={{ background: donutGradient }}>
                      <div className="genre-soul__core">
                        <span>Core</span>
                        <strong>{topGenre}</strong>
                      </div>
                    </div>
                    <ul className="genre-soul__legend">
                      {legendGenres.map((entry, index) => (
                        <li key={entry.name}>
                          <span className="genre-soul__swatch" style={{ background: COLORS[index % COLORS.length] }} />
                          <span className="genre-soul__name">{entry.name}</span>
                          <span className="genre-soul__value">
                            {entry.value} ({Math.round((entry.value / genreTotal) * 100)}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="wrapped-chart__empty">No genres recorded in this range</p>
                )}
              </article>

              <article className="glass-card wrapped-chart wrapped-chart--wide">
                <header>
                  <div>
                    <h3 className="headline-md">Average rating over time</h3>
                    <p>How generous you were, year by year</p>
                  </div>
                  <span className="material-symbols-outlined" aria-hidden="true">show_chart</span>
                </header>
                {yearChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={yearChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="year" stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(216,180,254,0.3)" }} />
                      <Line
                        type="monotone"
                        dataKey="avgRating"
                        name="Average rating"
                        stroke="#ffa6b1"
                        strokeWidth={3}
                        dot={{ fill: "#ffa6b1", r: 5, strokeWidth: 0 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="wrapped-chart__empty">No data for selected range</p>
                )}
              </article>
            </section>

            <section className="wrapped-idols" aria-label="Most watched actors">
              <header className="wrapped-idols__header">
                <div>
                  <p className="eyebrow wrapped-hero__eyebrow">Your biggest idol</p>
                  <h2 className="headline-lg">
                    {biggestIdol ? biggestIdol.name : "No cast data yet"}
                  </h2>
                </div>
                <span className="material-symbols-outlined" aria-hidden="true">workspace_premium</span>
              </header>

              {biggestIdol ? (
                <div className="wrapped-idols__body">
                  <article className="glass-card idol-spotlight">
                    <div className="idol-spotlight__portrait">
                      {biggestIdol.profile_path ? (
                        <img src={tmdbImage(biggestIdol.profile_path, "w342")} alt={biggestIdol.name} />
                      ) : (
                        <span>{biggestIdol.name[0]}</span>
                      )}
                    </div>
                    <div className="idol-spotlight__stats">
                      <p className="wrapped-figure wrapped-figure--primary">{biggestIdol.count}</p>
                      <p className="idol-spotlight__label">
                        {biggestIdol.count === 1 ? "drama together" : "dramas together"}
                      </p>
                      {biggestIdol.avgRating ? (
                        <p className="idol-spotlight__rating">
                          <span className="material-symbols-outlined is-filled" aria-hidden="true">star</span>
                          {biggestIdol.avgRating} average from you
                        </p>
                      ) : null}
                      <p className="idol-spotlight__titles">
                        {biggestIdol.titles.slice(0, 4).join(" · ")}
                        {biggestIdol.titles.length > 4 ? ` +${biggestIdol.titles.length - 4} more` : ""}
                      </p>
                    </div>
                  </article>

                  {runnersUp.length > 0 ? (
                    <ol className="idol-rank">
                      {runnersUp.map((actor, index) => (
                        <li key={actor.name} className="glass-card idol-rank__row">
                          <span className="idol-rank__place">{index + 2}</span>
                          <span className="idol-rank__face">
                            {actor.profile_path ? (
                              <img src={tmdbImage(actor.profile_path, "w185")} alt="" loading="lazy" />
                            ) : (
                              <b>{actor.name[0]}</b>
                            )}
                          </span>
                          <span className="idol-rank__name">{actor.name}</span>
                          <span className="idol-rank__count">{actor.count}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ) : (
                <p className="wrapped-chart__empty">
                  Add cast data to your dramas to see who you watch most — open a drama, choose
                  Edit, then “Fetch cast &amp; episodes”.
                </p>
              )}
            </section>

            <section className="wrapped-cta">
              <h2 className="headline-lg">Ready to show off your taste?</h2>
              <div className="wrapped-cta__actions">
                <button className="btn btn--primary" type="button" onClick={handleShare}>
                  <span className="material-symbols-outlined" aria-hidden="true">share</span>
                  Share my year
                </button>
                <button className="btn wrapped-cta__ghost" type="button" onClick={() => navigate("/watchlist")}>
                  <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
                  Back to watchlist
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
