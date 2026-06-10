const fs = require('fs');
// Use global fetch available in Node 18+
const fetch = global.fetch;

// Load .env
const env = fs.readFileSync('./.env', 'utf8').split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) acc[m[1]] = m[2];
  return acc;
}, {});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const TMDB_API_KEY = env.VITE_TMDB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !TMDB_API_KEY) {
  console.error('Missing required keys in .env');
  process.exit(1);
}

(async () => {
  try {
    console.log('Fetching dramas from Supabase...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dramas?select=*&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Supabase responded with', res.status, txt);
      process.exit(1);
    }
    const dramas = await res.json();
    const without = dramas.filter(d => !d.poster_url);
    console.log(`Found ${dramas.length} dramas, ${without.length} without posters`);

    let updated = 0;
    for (const drama of without) {
      console.log('Searching TMDB for', drama.title);
      const s = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(drama.title)}&language=en-US`);
      const data = await s.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const posterUrl = result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null;
        if (posterUrl) {
          const p = await fetch(`${SUPABASE_URL}/rest/v1/dramas?id=eq.${drama.id}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation'
            },
            body: JSON.stringify({ poster_url: posterUrl })
          });
          const patched = await p.json();
          if (patched) {
            console.log('Updated', drama.title);
            updated++;
          }
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }
    console.log(`Done. Updated ${updated} posters.`);
  } catch (err) {
    console.error('Error', err);
    process.exit(1);
  }
})();
