# DramaLog Development Guide

How to extend the app, add features, and plan for future phases.

## Quick Commands

```bash
npm run dev           # Start dev server (localhost:5173)
npm run build         # Build for production
npm run preview       # Preview production build locally
git push              # Deploy to Vercel (auto-deploys on push)
```

## Adding a New Feature (Step by Step)

### Example: Add a "Favorites" Feature

**Step 1: Update Database**
```sql
-- Add is_favorite column to dramas table
ALTER TABLE public.dramas ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
```

**Step 2: Update Supabase Helper**
```javascript
// src/lib/supabase.js
export const toggleFavorite = async (dramaId, isFavorite) => {
  const { data, error } = await supabase
    .from("dramas")
    .update({ is_favorite: isFavorite })
    .eq("id", dramaId)
    .select();
  return { data, error };
};
```

**Step 3: Update Component**
```javascript
// src/components/DramaDetailModal.jsx
// In edit form, add:
<div>
  <label>
    <input 
      type="checkbox"
      checked={editData.is_favorite}
      onChange={(e) => setEditData({...editData, is_favorite: e.target.checked})}
    />
    Add to favorites
  </label>
</div>
```

**Step 4: Update Save Logic**
```javascript
// In handleSave():
const updatePayload = {
  // ... existing fields
  is_favorite: editData.is_favorite
};
```

**Step 5: Add Filter**
```javascript
// src/pages/Watchlist.jsx
// In filter buttons:
{["all", "completed", "watching", "want_to_watch", "favorites"].map(status => (
  <button key={status} onClick={() => setFilter(status)}>
    {status === "favorites" ? "❤️ Favorites" : ...}
  </button>
))}

// In filter logic:
const filteredDramas = dramas.filter(d => {
  if (filter === "favorites") return d.is_favorite;
  // ... rest of logic
});
```

**Done!** Commit and deploy.

## Phase Roadmap

### Phase 1 ✅ (COMPLETE)

**Status:** Working, deployed to Vercel

**Features:**
- Auth (signup/login)
- Add dramas from TMDB
- View watchlist with filtering
- Edit drama details (rating, review, poster, synopsis, genres, etc.)
- Delete dramas

**Tech:**
- React + Vite
- Supabase Auth + PostgreSQL
- TMDB API
- Inline CSS

**Known Limitations:**
- RLS disabled (MVP)
- No offline support
- State management with React hooks only
- All styling inline

---

### Phase 2 ⬜ (NEXT)

**Goal:** Analytics dashboard to visualize watch patterns

**Features to Build:**

#### 2.1 Analytics Dashboard Page
```
/analytics
├─ Date range picker (From/To dates)
├─ Stats cards
│  ├─ Total dramas watched (in range)
│  ├─ Average rating
│  ├─ Most watched genre
│  └─ Dramas per month
└─ Charts
   ├─ Bar chart: Dramas watched per year
   ├─ Pie chart: Genre breakdown
   ├─ Line chart: Average rating over time
   └─ Heatmap: Watch frequency by month
```

**Implementation Steps:**

1. **Create Analytics page**
```javascript
// src/pages/Analytics.jsx
export default function Analytics({ user }) {
  const [dramas, setDramas] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: "2020-01-01",
    to: new Date().toISOString().split('T')[0]
  });
  
  const filteredByDate = dramas.filter(d => 
    d.year_watched >= dateRange.from && d.year_watched <= dateRange.to
  );
  
  return (
    <div>
      {/* Date picker */}
      {/* Stats cards */}
      {/* Charts from Recharts */}
    </div>
  );
}
```

2. **Add router link**
```javascript
// src/App.jsx (in Routes)
<Route path="/analytics" element={<Analytics user={user} />} />
```

3. **Add Recharts components**
```bash
npm install recharts
```

4. **Build chart components**
```javascript
import { BarChart, Bar, XAxis, YAxis } from "recharts";

const data = [
  { year: 2023, count: 15 },
  { year: 2024, count: 28 },
];

<BarChart width={600} height={300} data={data}>
  <XAxis dataKey="year" />
  <YAxis />
  <Bar dataKey="count" fill="#667eea" />
</BarChart>
```

5. **Add navigation**
- Link in Watchlist header: "📊 Analytics"
- Back button on Analytics page

**Estimated effort:** 4-6 hours

---

### Phase 3 ⬜ (FUTURE)

**Goal:** Smart AI-powered recommendations

**Features:**

#### 3.1 Auto-Recommendations
After user rates a drama:
```
User rates drama 8/10
    ↓
Claude API analyzes: genre, plot, user's other ratings
    ↓
Claude generates: "Similar dramas you might like"
    ↓
Returns 3-5 recommendations with reasons
    ↓
Store in recommendations table
    ↓
Show in "Recommended for you" section
```

#### 3.2 Implementation

**Step 1: Create recommendations table** (schema already done)

**Step 2: Create Claude API helper**
```javascript
// src/lib/claude.js
const CLAUDE_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export const getRecommendations = async (drama, userDramas) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Given this K-drama: "${drama.title}"
Genre: ${drama.genres}
Plot: ${drama.synopsis}

User's other watched dramas: ${userDramas.map(d => d.title).join(", ")}

Recommend 3 K-dramas similar to this one, with brief reasons.
Return as JSON: [{ title, reason }]`
      }]
    })
  });
  const data = await response.json();
  return JSON.parse(data.content[0].text);
};
```

**Step 3: Call Claude on rating submit**
```javascript
// src/components/DramaDetailModal.jsx
const handleSave = async () => {
  // ... existing save logic
  
  // If rating changed, get recommendations
  if (editData.rating && editData.rating !== drama.rating) {
    const recommendations = await getRecommendations(editData, allUserDramas);
    // Store in recommendations table
    // Show as toast or modal
  }
};
```

**Step 4: Show recommendations**
```javascript
// New component: <RecommendationsModal>
// Display as cards with reasons
```

**⚠️ Cost Note:** Claude API is pay-as-you-go. ~$0.001-0.01 per recommendation. You get $5 free credits.

**Estimated effort:** 3-4 hours

---

### Phase 4 ⬜ (LATER)

**Goal:** Social features & annual summary

#### 4.1 Shareable Profiles

```
User → Settings → "Share my profile"
    ↓
Generate unique URL: dramalog.com/users/YOUR_ID
    ↓
Public read-only view of:
    ├─ Watchlist (filtered view)
    ├─ Stats
    ├─ Favorite dramas
    └─ Public reviews
```

**Implementation:**
```javascript
// src/pages/PublicProfile.jsx
// Read-only view, enable RLS for public access
```

#### 4.2 Spotify Wrapped-Style Summary

```
Annual summary page:
├─ "Your 2024 in K-dramas"
├─ Total dramas watched: 45
├─ Most-watched genre: Romance
├─ Highest rated: 10/10 dramas
├─ Watch streak: 156 days
└─ Shareable image/PDF
```

**Estimated effort:** 6-8 hours

---

## Common Development Tasks

### Modify Drama Fields

Want to track new data (e.g., "watched with")?

1. **Supabase:** Add column
```sql
ALTER TABLE dramas ADD COLUMN watched_with TEXT;
```

2. **Supabase helper:** Update payload
```javascript
// src/lib/supabase.js
export const updateDrama = async (id, updates) => {
  const { watched_with, ...rest } = updates;
  // ...
};
```

3. **Component:** Add form field
```javascript
// DramaDetailModal.jsx
<input value={editData.watched_with} onChange={...} />
```

4. **Save:** Include in payload
```javascript
watched_with: editData.watched_with || null
```

### Add a New Page

1. **Create file**
```bash
touch src/pages/MyNewPage.jsx
```

2. **Add router**
```javascript
// src/App.jsx
<Route path="/new-page" element={<MyNewPage user={user} />} />
```

3. **Add navigation link**
```javascript
// Watchlist header or sidebar
<Link to="/new-page">My Page</Link>
```

4. **Style it**
Use inline CSS like existing pages, or switch to Tailwind for Phase 2+

### Debug Supabase

```javascript
// Browser console
const { data, error } = await supabase.from("dramas").select("*").limit(1);
console.log(data, error);

// Check RLS
const { data: { user } } = await supabase.auth.getUser();
console.log(user);

// Check session
await supabase.auth.getSession();
```

### Performance Profiling

```bash
# Build and analyze bundle size
npm run build
npx vite-plugin-visualizer dist/stats.html
```

Check what's taking up space. Common culprits:
- Recharts (Phase 2)
- Supabase client (~100KB)
- React + React Router

### Migrate to Tailwind

Currently using inline styles. To migrate:

```bash
npm install -D @tailwindcss/forms
```

Change:
```javascript
// Before
<button style={{ background: "#667eea", color: "white" }}>Click</button>

// After
<button className="bg-purple-600 text-white">Click</button>
```

**Pro tip:** Do this during Phase 2 when redesigning.

## Testing Strategy

### Manual Testing Checklist (Phase 1)

- [ ] Sign up with new email
- [ ] Log in
- [ ] Search TMDB for 3 different dramas
- [ ] Add drama with all fields
- [ ] Add drama with minimal fields
- [ ] Edit drama (change rating, review)
- [ ] Edit drama (search TMDB again, pick different result)
- [ ] Filter by each status
- [ ] Delete drama
- [ ] Log out and log back in
- [ ] Check data persists

### Automated Testing (Phase 2+)

```javascript
// __tests__/Watchlist.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Watchlist from "../pages/Watchlist";

describe("Watchlist", () => {
  it("displays drama grid", () => {
    const mockUser = { id: "123", email: "test@test.com" };
    render(
      <BrowserRouter>
        <Watchlist user={mockUser} />
      </BrowserRouter>
    );
    expect(screen.getByText(/Add Drama/i)).toBeInTheDocument();
  });

  it("filters dramas by status", () => {
    // Mock dramas
    // Click filter button
    // Assert filtered view
  });
});
```

## Deployment Checklist

Before deploying a new phase:

- [ ] Test locally (`npm run dev`)
- [ ] Build locally (`npm run build` + `npm run preview`)
- [ ] Update README.md with new features
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Vercel auto-deploys
- [ ] Test on Vercel URL
- [ ] Update ARCHITECTURE.md if needed

## Lessons Learned (Phase 1)

### What Worked Well ✅
- Inline CSS is fast to prototype with
- Supabase handles auth + DB seamlessly
- React hooks are fine for this scale
- TMDB API is reliable for drama data
- PWA setup just works with Vite plugin

### What to Improve ⚠️
- RLS disabled for MVP — enable before multi-user
- State management gets messy with many modals — use Context API
- Inline styles don't scale — migrate to Tailwind Phase 2
- No error boundaries — add error handling
- No analytics until Phase 2 — hard to debug performance

### Tech Decisions

| Decision | Reason | Trade-off |
|----------|--------|-----------|
| Supabase over Firebase | PostgreSQL, free tier, RLS | More setup, less docs |
| React hooks over Redux | Simpler for MVP | Hard to scale state |
| Inline CSS over Tailwind | Faster prototyping | Not maintainable long-term |
| Vite over CRA | Faster, lighter | Less ecosystem support |
| No TypeScript | Faster development | Type safety |

For Phase 2+, consider:
- [ ] Add TypeScript
- [ ] Migrate to Tailwind
- [ ] Set up testing framework
- [ ] Add error monitoring (Sentry)
- [ ] Enable RLS policies

## Resources

### Learning
- [Supabase Docs](https://supabase.com/docs)
- [React Patterns](https://react.dev)
- [Recharts Examples](https://recharts.org/examples)
- [TMDB API](https://www.themoviedb.org/settings/api)
- [Claude API Docs](https://docs.anthropic.com)

### Tools
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://app.supabase.com)
- Chrome DevTools (F12)
- VS Code REST Client for API testing

---

**Last updated:** June 2026 | Ready for Phase 2
