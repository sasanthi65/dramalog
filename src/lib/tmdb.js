const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

export const tmdbImage = (path, size = "w780") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

/** How many billed actors to keep per drama. */
export const MAX_CAST = 6;

/**
 * Top-billed cast from a TMDb details payload, trimmed to what the UI needs.
 * Credits are ordered by billing, so the first entries are the leads.
 */
export const extractMainCast = (details) => {
  const cast = details?.credits?.cast || details?.cast || [];

  return cast.slice(0, MAX_CAST).map((person) => ({
    id: person.id,
    name: person.name,
    character: person.character || null,
    profile_path: person.profile_path || null,
  }));
};

/**
 * Best TV match for a title. Used to relink dramas that were saved before
 * `tmdb_id` was recorded, so they can still pull cast and episode counts.
 *
 * A Korean-language result wins over a higher-ranked foreign one: "Big Mouth"
 * and "Little Women" are both K-dramas *and* US series, and TMDb ranks the
 * Western show first.
 */
export const findShowByTitle = async (title) => {
  if (!TMDB_API_KEY) return { data: null, error: new Error("Missing TMDb API key") };

  try {
    const response = await fetch(
      `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(title)}`
    );
    const payload = await response.json();
    const results = payload.results || [];
    const pick = (list) => list.find((show) => show.original_language === "ko") || list[0];

    if (results.length > 0) return { data: pick(results), error: null };

    // TMDb files sequels as seasons of the parent show, so "The Glory Part 2"
    // matches nothing. Only a single trailing digit is stripped, so titles
    // like "Reply 1988" survive.
    const parentTitle = title
      .replace(/\s*[:\-–]?\s*(part|season)\s*\d+\s*$/i, "")
      .replace(/\s+\d$/, "")
      .trim();

    if (!parentTitle || parentTitle === title) return { data: null, error: null };

    const parentResponse = await fetch(
      `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(parentTitle)}`
    );
    const parentPayload = await parentResponse.json();

    return { data: pick(parentPayload.results || []) || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Full record for one show — `number_of_episodes` and the cast, neither of
 * which the search endpoint returns. Both arrive in a single request.
 */
export const getShowDetails = async (showId) => {
  if (!TMDB_API_KEY) return { data: null, error: new Error("Missing TMDb API key") };

  try {
    const response = await fetch(
      `${BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`
    );
    return { data: await response.json(), error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Reality, talk, news and documentary. Keeps variety shows such as Running Man
// out of a banner that is meant to feature scripted drama.
const EXCLUDED_GENRE_IDS = [10764, 10767, 10763, 99];

// TMDb show types: 2 = miniseries, 4 = scripted. Everything else is unscripted.
const SCRIPTED_TYPES = "2|4";

const isScriptedKdrama = (show) =>
  show.original_language === "ko" &&
  Boolean(show.backdrop_path) &&
  !(show.genre_ids || []).some((id) => EXCLUDED_GENRE_IDS.includes(id));

const fetchJson = async (url) => {
  const response = await fetch(url);
  return response.json();
};

/**
 * Trending Korean dramas for the watchlist banner.
 *
 * Draws on this year's most popular Korean scripted series. If that is thin —
 * likely in January — it tops up with the weekly trending feed and then with
 * all-time popular Korean drama, so the banner always has a full set.
 */
export const getTrendingKdramas = async (limit = 5) => {
  if (!TMDB_API_KEY) {
    return { data: [], error: new Error("Missing TMDb API key") };
  }

  const year = new Date().getFullYear();
  const discoverBase =
    `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=en-US` +
    `&with_original_language=ko&sort_by=popularity.desc` +
    `&with_type=${SCRIPTED_TYPES}&without_genres=${EXCLUDED_GENRE_IDS.join(",")}`;

  const sources = [
    `${discoverBase}&first_air_date.gte=${year}-01-01&first_air_date.lte=${year}-12-31`,
    `${BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=en-US`,
    discoverBase,
  ];

  try {
    const shows = [];
    const seen = new Set();

    for (const url of sources) {
      if (shows.length >= limit) break;

      const payload = await fetchJson(url);
      for (const show of payload.results || []) {
        if (seen.has(show.id) || !isScriptedKdrama(show)) continue;
        seen.add(show.id);
        shows.push(show);
      }
    }

    return { data: shows.slice(0, limit), error: null, year };
  } catch (error) {
    return { data: [], error };
  }
};
