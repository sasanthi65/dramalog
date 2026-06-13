# DramaLog Architecture

Technical deep-dive into how the app is structured and how data flows.

## App Flow (High Level)

```
User -> App.jsx (auth check) 
  -> Login/Signup (if not authenticated)
  -> Watchlist (authenticated)
    -> AddDramaModal (search TMDB)
    -> DramaDetailModal (view/edit)
    -> Supabase (CRUD operations)
```

## Component Hierarchy

```
<App>
  ├─ auth state listener
  ├─ loading screen
  └─ <Routes>
      ├─ /login → <Login>
      ├─ /signup → <Signup>
      └─ /watchlist → <Watchlist>
          ├─ header (logout, user email)
          ├─ filters (All, Watched, Watching, Want to watch)
          ├─ "+ Add Drama" button
          ├─ drama grid
          │  └─ [drama card] (clickable)
          ├─ <AddDramaModal> (when "+ Add Drama" clicked)
          │  ├─ TMDB search form
          │  └─ drama details form (status, year, rating, review)
          └─ <DramaDetailModal> (when drama card clicked)
             ├─ view mode (display drama data)
             ├─ edit mode
             │  ├─ TMDB re-search
             │  └─ edit all fields (poster, synopsis, genres, etc.)
             └─ delete button
```

## Data Flow

### 1. Authentication Flow

```
Signup/Login
    ↓
Supabase.auth.signUp/signInWithPassword()
    ↓
Session created
    ↓
App.jsx listens to auth state change
    ↓
setUser(session.user)
    ↓
Redirect to /watchlist
```

**Key files:**
- `src/lib/supabase.js` — `signUp()`, `signIn()`, `signOut()`, `getCurrentUser()`
- `src/App.jsx` — `useEffect()` listening to `auth.onAuthStateChange()`

### 2. Watchlist Load Flow

```
<Watchlist> mounts
    ↓
useEffect → loadDramas()
    ↓
getDramas(userId) from Supabase
    ↓
Query: SELECT * FROM dramas WHERE user_id = userId
    ↓
setDramas(data)
    ↓
Render drama grid
```

**Key files:**
- `src/lib/supabase.js` — `getDramas(userId)`
- `src/pages/Watchlist.jsx` — `loadDramas()` hook

### 3. Add Drama Flow

```
User clicks "+ Add Drama"
    ↓
<AddDramaModal> opens
    ↓
User searches TMDB
    ↓
TMDB API search (client-side)
    ↓
Display results as cards
    ↓
User selects result
    ↓
Parse TMDB data: genres, poster_url, synopsis, year_released
    ↓
User fills: status, year_watched, rating, review
    ↓
Click "Add to watchlist"
    ↓
addDrama() to Supabase
    ↓
INSERT into dramas table
    ↓
onDramaAdded() callback
    ↓
setDramas([newDrama, ...dramas])
    ↓
Modal closes, new drama appears in grid
```

**Key files:**
- `src/components/AddDramaModal.jsx` — Search form, TMDB integration
- `src/lib/supabase.js` — `addDrama(dramaData)`
- `src/pages/Watchlist.jsx` — `handleDramaAdded()` callback

### 4. Edit Drama Flow

```
User clicks drama card
    ↓
<DramaDetailModal> opens
    ↓
Display current drama data
    ↓
User clicks "Edit"
    ↓
Edit mode: show form fields
    ↓
(Optional) User clicks "🔍 Search TMDB again"
    ↓
TMDB search results displayed
    ↓
User selects result
    ↓
Auto-fill: poster_url, synopsis, genres, year_released
    ↓
User edits other fields (rating, review, status, etc.)
    ↓
Click "Save changes"
    ↓
updateDrama(id, updates) to Supabase
    ↓
UPDATE dramas SET ... WHERE id = ?
    ↓
onDramaUpdated() callback
    ↓
setDramas() with updated drama
    ↓
Modal closes, card refreshes
```

**Key files:**
- `src/components/DramaDetailModal.jsx` — View/edit/search logic
- `src/lib/supabase.js` — `updateDrama(id, updates)`
- `src/pages/Watchlist.jsx` — `handleDramaUpdated()` callback

### 5. Filter Flow

```
User clicks "Watching" button
    ↓
setFilter("watching")
    ↓
filteredDramas = dramas.filter(d => d.status === "watching")
    ↓
Re-render grid with filtered results
```

**Key files:**
- `src/pages/Watchlist.jsx` — `filter` state, `filteredDramas` computation

## Supabase Integration

### Client Setup

**File:** `src/lib/supabase.js`

```javascript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

All requests use the `anon` public key. User context is handled by `auth.uid()` in JWT tokens.

### CRUD Operations

**Create:** `addDrama(dramaData)` → INSERT
**Read:** `getDramas(userId)` → SELECT
**Update:** `updateDrama(id, updates)` → UPDATE
**Delete:** `deleteDrama(id)` → DELETE

All ops return `{ data, error }`.

### Authentication

Supabase handles auth via JWT tokens. When user logs in:
1. Supabase generates JWT stored in browser
2. Every API request includes JWT in header
3. Server validates JWT and extracts `auth.uid()`
4. RLS policies (currently disabled, will be enabled Phase 2) check `auth.uid()`

## TMDB API Integration

**File:** `src/components/AddDramaModal.jsx` and `DramaDetailModal.jsx`

### Search Endpoint

```
GET https://api.themoviedb.org/3/search/tv
  ?api_key=KEY
  &query=drama_title
  &language=en-US
```

Returns array of results with:
- `id`, `name`, `overview`, `poster_path`
- `first_air_date`, `genre_ids`

### Data Parsing

When user selects a result, we extract:
- `title` → result.name
- `poster_url` → `https://image.tmdb.org/t/p/w500${poster_path}`
- `synopsis` → result.overview
- `genres` → Map genre_ids to strings (Comedy, Drama, etc.)
- `year_released` → Extract from first_air_date

### Rate Limiting

- Bulk poster fetcher: 300ms delay between requests
- Search results: 10 results per query (Supabase handles 40 req/10s)

## State Management

The app uses **React hooks only** (no Redux). State lives in components:

| Component | State | Scope |
|-----------|-------|-------|
| **App.jsx** | `user`, `loading` | Global auth state |
| **Watchlist.jsx** | `dramas`, `filter`, `selectedDrama`, `showAddModal` | Watchlist page |
| **AddDramaModal.jsx** | `searchQuery`, `searchResults`, `editData` | Modal-scoped |
| **DramaDetailModal.jsx** | `isEditing`, `editData`, `searchMode`, `searchResults` | Modal-scoped |

For **Phase 2+**, consider moving to Context API if state gets complex.

## Styling Approach

All styling is **inline CSS with React style objects**. No CSS classes (Tailwind is imported for future use).

**Pros:**
- No build overhead
- Styles travel with components
- Easy to customize per instance

**Cons:**
- Verbose
- Hard to maintain at scale
- Consider switching to Tailwind classes in Phase 2

**Example:**
```javascript
<button style={{
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  cursor: "pointer"
}}>
```

**For Phase 2+:** Migrate to Tailwind classes:
```javascript
<button className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-6 py-3 rounded-lg">
```

## Performance Considerations

### Current (Phase 1)
- Loads all user dramas on mount (fine for <500 dramas)
- Re-renders entire list on filter change (acceptable)
- TMDB search is client-side (network dependent)
- No caching between page visits

### Future Optimizations (Phase 2+)
- **Pagination:** Load 20 dramas, "Load more" button
- **Memoization:** `React.memo()` for drama cards to prevent re-renders
- **Search debouncing:** Delay TMDB search while user types
- **Local caching:** Cache TMDB search results in localStorage
- **Lazy loading:** Load images on scroll
- **Code splitting:** Split modals into separate bundles with dynamic `import()`

## Error Handling

### Network Errors
- TMDB search fails → Show error message, let user retry
- Supabase query fails → Log error, show user-friendly message
- Deployment issues → Add Sentry for monitoring (Phase 2)

### Validation
- Email validation on signup (browser + Supabase)
- Rating must be 1-10 (input type + manual check)
- No empty drama titles (form validation)

**Future:** Add toast notifications for better UX.

## PWA Setup

**File:** `vite.config.js`

```javascript
VitePWA({
  manifest: { name, description, icons, theme_color },
  workbox: { runtimeCaching }
})
```

Enables:
- Install on home screen
- Offline mode (with service worker)
- TMDB & poster images cached for offline access

**Caveat:** Supabase queries won't work offline (no local database yet).

## Security Notes

### Current State (MVP)
- RLS disabled (not secure for multi-user)
- Anon key exposed in code (acceptable for now)
- No rate limiting on API calls
- No input sanitization (relies on PostgreSQL)

### Before Production
- **Enable RLS policies** (Phase 2)
- **Add rate limiting** via Supabase extensions
- **Validate input server-side** (PostgreSQL constraints)
- **Hash sensitive data** (if any)
- **Audit logs** for important operations
- **CORS rules** in Supabase settings

## Testing

Currently: **Manual testing only**. For Phase 2+, add:

```bash
# Unit tests (Jest)
npm install --save-dev jest @testing-library/react

# E2E tests (Cypress)
npm install --save-dev cypress
```

Example test:
```javascript
// __tests__/Watchlist.test.jsx
import { render, screen } from "@testing-library/react";
import Watchlist from "../pages/Watchlist";

test("displays drama grid", () => {
  render(<Watchlist user={mockUser} />);
  expect(screen.getByText("Add Drama")).toBeInTheDocument();
});
```

## Folder Structure Rationale

```
src/
├── lib/          # Utilities (Supabase client, API helpers)
├── pages/        # Full-screen components (routed)
├── components/   # Reusable modal/widget components
├── App.jsx       # Router setup
├── main.jsx      # Entry point
└── main.css      # Global styles
```

**Why this structure?**
- **pages/** = routed components (Auth, Watchlist)
- **components/** = reusable, modal-like components
- **lib/** = logic layer (API calls, Supabase helpers)

For Phase 2+, consider adding:
- `hooks/` — Custom React hooks
- `utils/` — Helper functions (formatters, validators)
- `styles/` — Global CSS/Tailwind if migrating

## Debugging Tips

### Chrome DevTools
1. **Network tab:** Watch Supabase API calls, TMDB requests
2. **Application tab:** Check IndexedDB for Supabase sessions
3. **Console:** `supabase.auth.getSession()` to check current user

### Browser Console
```javascript
// Check current user
const { data } = await supabase.auth.getSession();
console.log(data.session.user);

// Query dramas directly
const { data } = await supabase.from("dramas").select("*").limit(5);
console.log(data);

// Check RLS (if enabled)
// Try fetching another user's dramas — should fail with 403
```

### Vite Debug Mode
```bash
npm run dev -- --debug
# Check terminal for verbose build logs
```

---

**Last updated:** June 2026 | Phase: 1
