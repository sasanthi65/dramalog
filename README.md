# DramaLog — Your Personal K-Drama Tracker

A colorful, mobile-friendly PWA for tracking, rating, and analyzing your K-drama watch history. Built with React, Supabase, and TMDB API.

## Quick Start

### Prerequisites
- Node.js v20+
- Git
- Supabase project (free at supabase.com)
- TMDB API key (free at themoviedb.org)
- Claude API key (optional, for Phase 3 — free credits at console.anthropic.com)

### Local Setup (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/dramalog.git
cd dramalog
npm install

# 2. Create .env file
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TMDB_API_KEY=your-tmdb-key
VITE_ANTHROPIC_API_KEY=your-claude-key
EOF

# 3. Run dev server
npm run dev
```

Visit `http://localhost:5173` and sign up.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + React Router |
| **Styling** | Tailwind CSS v4 |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email/password) |
| **APIs** | TMDB (drama metadata), Claude (Phase 3) |
| **Deployment** | Vercel |
| **PWA** | Vite PWA Plugin |

## Project Structure

```
dramalog/
├── src/
│   ├── lib/
│   │   └── supabase.js           # Supabase client + helper functions
│   ├── pages/
│   │   ├── Login.jsx             # Email/password login
│   │   ├── Signup.jsx            # User registration
│   │   └── Watchlist.jsx         # Main app — view & filter dramas
│   ├── components/
│   │   ├── AddDramaModal.jsx     # Search TMDB + add drama
│   │   └── DramaDetailModal.jsx  # View/edit drama details
│   ├── App.jsx                   # Router setup
│   ├── main.jsx                  # Entry point
│   └── main.css                  # Global styles + Tailwind
├── vite.config.js                # Build config + PWA
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Features — Phase 1 ✅

### Authentication
- Email/password signup & login
- Session persistence across refresh
- Logout

### Watchlist Management
- Add dramas by searching TMDB (auto-fills poster, genre, synopsis, release year)
- View watchlist in responsive grid
- Filter by status: Completed / Watching / Want to watch
- Edit drama details: rating (1-10), review, status, year watched
- Delete dramas
- Sort by creation date (newest first)

### Drama Data
- **Fetched from TMDB:** poster, synopsis, genres, release year, episode count
- **User input:** rating (1-10), review, status, year watched
- **Stored in Supabase:** All drama data synced to cloud

## Deployment

### Deploy to Vercel (1 minute)

```bash
# 1. Push to GitHub
git add .
git commit -m "Phase 1 complete"
git push

# 2. Go to vercel.com → Import project
# 3. Select your GitHub repo → Import
# 4. Add environment variables (same as .env)
# 5. Deploy

# 6. Add Supabase RLS policies (optional for security)
# See ARCHITECTURE.md for details
```

Your app is live! Share the URL with friends.

## Database Setup

Your Supabase project has 3 tables:

```
profiles (user data)
├── id (PK, linked to auth.users)
├── email
├── display_name
└── created_at

dramas (watchlist)
├── id (PK)
├── user_id (FK → profiles)
├── title, tmdb_id, poster_url
├── synopsis, genres[], year_released
├── status (completed/watching/want_to_watch)
├── year_watched, rating, review
├── created_at, updated_at
└── Indexes: user_id, status, year_watched

recommendations (Phase 3)
├── id (PK)
├── drama_id (FK → dramas)
├── suggested_title, reason
└── created_at
```

**Note:** RLS is currently disabled for MVP. Phase 2+ will enable proper row-level security.

## Common Tasks

### Add a new drama manually
1. Click "+ Add Drama"
2. Search TMDB by title
3. Select result → auto-fills poster, genres, synopsis
4. Add rating/review (optional)
5. Click "Add to watchlist"

### Fix incorrect drama data (e.g., wrong poster)
1. Click the drama card
2. Click "Edit"
3. Click "🔍 Search TMDB again"
4. Select the correct result
5. Poster, synopsis, genres auto-update
6. Click "Save changes"

### Run the bulk poster fetcher
```javascript
// In browser console on the watchlist page:
const dramasWithoutPosters = dramas.filter(d => !d.poster_url);
await fetchMissingPosters(dramasWithoutPosters, user.id);
```

See `src/pages/Watchlist.jsx` for the `fetchMissingPosters` function.

## Environment Variables

All required keys use the `VITE_` prefix to be accessible to the React app:

```env
VITE_SUPABASE_URL          # Project URL from Supabase dashboard
VITE_SUPABASE_ANON_KEY     # Public anon key (safe to expose)
VITE_TMDB_API_KEY          # Free from themoviedb.org/api
VITE_ANTHROPIC_API_KEY     # Free credits at console.anthropic.com (Phase 3)
```

⚠️ **Never commit .env to Git.** It's in `.gitignore`.

## Troubleshooting

**App loads but shows blank page**
- Check browser console (F12) for errors
- Verify .env variables are correct
- Restart dev server: `npm run dev`

**Can't add dramas (403 error)**
- RLS might be re-enabled. Check Supabase → Authentication → Policies
- If dramas table shows "API DISABLED", enable it in table settings

**TMDB search returns wrong results**
- TMDB matches by title only. For ambiguous titles, use "Search TMDB again" in edit modal
- Try adding the year: "Little Women 2024" instead of just "Little Women"

**Poster didn't fetch**
- TMDB might not have that drama
- Use "Search TMDB again" in edit modal to manually find the correct poster

## Phase Breakdown

| Phase | Status | Features |
|-------|--------|----------|
| **1** | ✅ Done | Auth, watchlist, add/edit/delete, TMDB search, rate & review |
| **2** | ⬜ Next | Analytics dashboard, genre charts, watch trends, date range filter |
| **3** | ⬜ Future | AI recommendations (Claude API), similar drama suggestions |
| **4** | ⬜ Later | Shareable profiles, Spotify Wrapped-style annual summary, export |

See `DEVELOPMENT.md` for detailed info on each phase.

## Performance Notes

- App loads dramas on mount (unoptimized for 1000+ entries, MVP is fine for <500)
- TMDB search has rate limits (~40 requests/10 seconds) — the app handles this
- Poster fetcher delays 300ms between searches to avoid rate limiting

## Next Steps

→ **Phase 2:** Build analytics dashboard with Recharts (charts, trends, date range filtering)  
→ **Phase 3:** Add Claude API for smart recommendations  
→ **Phase 4:** Shareable profiles & annual wrapped

See `DEVELOPMENT.md` for detailed roadmap.

## License

Personal project. Use as you like.

---

Last updated: June 2026  
Phase: 1 (MVP)  
Status: Deployed & working
