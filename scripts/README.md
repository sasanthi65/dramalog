# Fetch Posters Script

This directory contains a helper script to populate missing `poster_url` values for dramas using TMDB.

## Files

- `fetch_posters.cjs` — safe Node script using the `.env` configuration.

## Usage

1. Ensure your `.env` has the following values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`
   - `VITE_TMDB_API_KEY`

2. Run the script from the project root:

```bash
node scripts/fetch_posters.cjs
```

3. If the script returns a Supabase permission error, you may need to grant the anon role access to read and update the `poster_url` column:

```sql
BEGIN;

GRANT SELECT ON public.dramas TO anon;
GRANT UPDATE (poster_url) ON public.dramas TO anon;

COMMIT;
```

> Note: Granting `UPDATE` to `anon` is only recommended for local development or quick fixes. In production, prefer authenticated requests or a secure server-side service role.

## App feature

The Watchlist page also now includes a `🎬 Fetch posters` button to update missing posters directly from the UI.
