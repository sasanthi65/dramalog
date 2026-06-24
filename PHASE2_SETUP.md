# Phase 2: Analytics Dashboard Setup

Complete guide to add the analytics dashboard to DramaLog.

## What You're Getting

✅ **Analytics page** with 4 interactive charts  
✅ **Stats cards** (total dramas, avg rating, top genre, rated count)  
✅ **Bar chart** - Dramas watched per year  
✅ **Pie chart** - Genre breakdown (top 10)  
✅ **Line chart** - Average rating over time  
✅ **Date range filter** - Filter analytics by year range  
✅ **Navigation** - Link from watchlist to analytics  

## Step 1: Install Recharts

In your terminal:

```bash
npm install recharts
```

Wait for it to finish.

## Step 2: Create Analytics Page

Create a new file:

```bash
touch src/pages/Analytics.jsx
```

Copy the content from `Analytics.jsx` into this file.

## Step 3: Update App.jsx

Replace your `src/App.jsx` with `App_Phase2.jsx`:

**Key changes:**
- Added import for Analytics page
- Added route: `<Route path="/analytics" element={user ? <Analytics user={user} showToast={showToast} /> : <Navigate to="/login" />} />`

## Step 4: Update Watchlist.jsx

Replace your `src/pages/Watchlist.jsx` with `Watchlist_Phase2.jsx`:

**Key changes:**
- Added Analytics button in header
- Button navigates to `/analytics`
- OnClick: `onClick={() => navigate("/analytics")}`

## Step 5: Test Locally

```bash
npm run dev
```

Visit `http://localhost:5173/watchlist`:

1. Click **"📊 Analytics"** button in top right
2. You should see:
   - Stats cards (Total Dramas, Avg Rating, Top Genre, Rated Dramas)
   - Bar chart of dramas by year
   - Pie chart of genres
   - Line chart of ratings over time
   - Date range inputs (From Year / To Year)

3. Try changing the date range:
   - Set "From Year" to 2023
   - Set "To Year" to 2024
   - Charts should update instantly

## Step 6: Commit to GitHub

```bash
git add .
git commit -m "Phase 2: Add analytics dashboard with charts and date filtering"
git push
```

## Features Explained

### Stats Cards
- **Total Dramas** — Count of dramas watched in date range
- **Avg Rating** — Average of 1-10 ratings (only dramas with ratings)
- **Top Genre** — Most common genre among watched dramas
- **Rated Dramas** — Count of dramas with ratings set

### Bar Chart
Shows how many dramas you watched each year (filtered by date range).

Example:
```
Year 2023: 15 dramas
Year 2024: 28 dramas
```

### Pie Chart
Shows what genres you watched (top 10). Hover to see count.

Example:
```
Romance: 25
Drama: 20
Comedy: 15
...
```

### Line Chart
Shows how your ratings changed over time. Useful for seeing if you're rating dramas higher/lower.

Example:
```
2023: Avg 7.2/10
2024: Avg 8.1/10 (improving taste!)
```

### Date Range Filter
Filter all charts by year range. Leave empty or use 2000-2100 for all time.

**Examples:**
- "From: 2024, To: 2024" → Only see 2024 data
- "From: 2020, To: 2024" → See 2020-2024 range
- "From: 2020, To: 2100" → See everything from 2020 onward

## Troubleshooting

**"Analytics page shows no data"**
→ You haven't added dramas with `year_watched` set. Go to Watchlist and edit some dramas, setting the "Year watched" field.

**"Charts aren't showing but stats are"**
→ Make sure you have at least 1-2 dramas with ratings for the line chart to work.

**"Date filter doesn't work"**
→ Try refreshing the page. Make sure the year range is valid (e.g., 2020-2024).

**"Pie chart shows too many genres"**
→ Only top 10 genres are shown to avoid clutter. You can edit the code if you want more.

## Customization Ideas (Future)

Want to customize Phase 2? Easy edits:

### Change chart colors
Find this in `Analytics.jsx`:
```javascript
const COLORS = ['#667eea', '#764ba2', '#f093fb', ...];
```

Change the hex colors to your preference.

### Add more chart types
Recharts supports: AreaChart, ScatterChart, RadarChart, etc.

```javascript
import { AreaChart, Area } from "recharts";
```

### Filter by status (watched vs watching)
Add a status filter like the watchlist has.

### Export as CSV/PDF
Add a button to download analytics data.

## Architecture

**Data Flow:**
1. Load all dramas from Supabase
2. Filter by date range (year_watched)
3. Calculate stats from filtered dramas
4. Group data by year and genre
5. Pass to Recharts components
6. Render interactive charts

**Components:**
- `Analytics.jsx` — Main page with all charts
- Recharts built-in: BarChart, PieChart, LineChart, etc.

**Data Calculated:**
- Dramas per year
- Average rating per year
- Genre counts
- Top genres

## Performance

For 146 dramas:
- ✅ Loads instantly
- ✅ Filtering is real-time
- ✅ Charts render smoothly

For 1000+ dramas (future):
- Consider pagination
- Cache chart calculations
- Use React.memo() to prevent re-renders

## Testing Checklist

After setup, test:

- [ ] Visit Analytics page
- [ ] See all 4 charts render
- [ ] Stats cards show numbers
- [ ] Pie chart is colorful with genres
- [ ] Bar chart shows years
- [ ] Line chart shows rating trend
- [ ] Change date range, charts update
- [ ] Go back to Watchlist (back button works)
- [ ] Logout and log back in, analytics still works

## Next Steps

**Phase 3:** AI recommendations after rating a drama
**Phase 4:** Shareable profiles and annual wrapped

---

**Time to complete:** 10 minutes  
**Difficulty:** Easy  
**Fun factor:** 🎉🎉🎉 (seeing your drama data visualized is awesome!)

Good luck! 📊🎬
