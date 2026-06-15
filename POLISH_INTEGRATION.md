# Phase 1 Polish Integration Guide

Quick changes to add toast notifications and loading states. ~30 minutes total.

## Step 1: Set up Toast System

### 1.1 Create hooks folder and useToast
```bash
mkdir -p src/hooks
```

Copy the files:
- `useToast.js` → `src/hooks/useToast.js`
- `Toast.jsx` → `src/components/Toast.jsx`
- `App_UPDATED.jsx` → `src/App.jsx` (replace existing)

### 1.2 Verify imports in App.jsx
```javascript
import { useToast } from "./hooks/useToast";
import Toast from "./components/Toast";
```

## Step 2: Update Login Page

**File:** `src/pages/Login.jsx`

Change function signature:
```javascript
// Before
export default function Login() {

// After
export default function Login({ showToast }) {
```

Update handleLogin:
```javascript
const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  if (!email || !password) {
    setError("Please fill in all fields");
    showToast("Please fill in all fields", "error"); // ADD THIS
    setLoading(false);
    return;
  }

  const { error: authError } = await signIn(email, password);

  if (authError) {
    setError(authError.message);
    showToast(`Login failed: ${authError.message}`, "error"); // ADD THIS
    setLoading(false);
  } else {
    showToast("Login successful! Welcome back.", "success"); // ADD THIS
    navigate("/watchlist");
  }
};
```

## Step 3: Update Signup Page

**File:** `src/pages/Signup.jsx`

Change function signature:
```javascript
// Before
export default function Signup() {

// After
export default function Signup({ showToast }) {
```

Update handleSignup:
```javascript
const handleSignup = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  if (!email || !password || !confirmPassword) {
    setError("Please fill in all fields");
    showToast("Please fill in all fields", "error"); // ADD THIS
    setLoading(false);
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords do not match");
    showToast("Passwords do not match", "error"); // ADD THIS
    setLoading(false);
    return;
  }

  if (password.length < 6) {
    setError("Password must be at least 6 characters");
    showToast("Password must be at least 6 characters", "error"); // ADD THIS
    setLoading(false);
    return;
  }

  const { error: authError } = await signUp(email, password);

  if (authError) {
    setError(authError.message);
    showToast(`Signup failed: ${authError.message}`, "error"); // ADD THIS
    setLoading(false);
  } else {
    showToast("Account created! Please log in.", "success"); // ADD THIS
    navigate("/login");
  }
};
```

## Step 4: Update Watchlist Page

**File:** `src/pages/Watchlist.jsx`

Change function signature:
```javascript
// Before
export default function Watchlist({ user }) {

// After
export default function Watchlist({ user, showToast }) {
```

Add loading state:
```javascript
const [loading, setLoading] = useState(true);
```

Update loadDramas:
```javascript
const loadDramas = async () => {
  setLoading(true);
  const { data, error } = await getDramas(user.id);
  if (!error) {
    setDramas(data || []);
  } else {
    showToast("Failed to load dramas", "error"); // ADD THIS
  }
  setLoading(false); // ADD THIS
};
```

Update handleLogout:
```javascript
const handleLogout = async () => {
  await signOut();
  showToast("Logged out successfully", "info"); // ADD THIS
  navigate("/login");
};
```

Update handleDramaAdded:
```javascript
const handleDramaAdded = (newDrama) => {
  setDramas([newDrama, ...dramas]);
  setShowAddModal(false);
  showToast(`Added "${newDrama.title}" to watchlist!`, "success"); // ADD THIS
};
```

Update handleDramaUpdated:
```javascript
const handleDramaUpdated = (updatedDrama) => {
  setDramas(dramas.map(d => d.id === updatedDrama.id ? updatedDrama : d));
  setSelectedDrama(null);
  showToast("Drama updated successfully!", "success"); // ADD THIS
};
```

Update handleDramaDeleted:
```javascript
const handleDramaDeleted = (dramaId) => {
  const deletedTitle = dramas.find(d => d.id === dramaId)?.title;
  setDramas(dramas.filter(d => d.id !== dramaId));
  setSelectedDrama(null);
  showToast(`Deleted "${deletedTitle}"`, "info"); // ADD THIS
};
```

Replace loading state rendering:
```javascript
// Before
{loading ? (
  <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
    <p style={{ fontSize: "16px" }}>Loading your dramas...</p>
  </div>
) : filteredDramas.length === 0 ? (

// After
{loading ? (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div style={{
      display: "inline-block",
      width: "40px",
      height: "40px",
      border: "4px solid #f0f0f0",
      borderTop: "4px solid #667eea",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }} />
    <p style={{ fontSize: "16px", color: "#999", marginTop: "16px" }}>Loading your dramas...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
) : filteredDramas.length === 0 ? (
```

## Step 5: Update AddDramaModal

**File:** `src/components/AddDramaModal.jsx`

Change function signature:
```javascript
// Before
export default function AddDramaModal({ userId, onDramaAdded, onClose }) {

// After - need to get showToast from props
// Actually, better approach: lift showToast through parent
// For now, just use console for errors
```

Actually, for AddDramaModal it's trickier since it's nested. **Simpler approach:** Just add loading state visual feedback:

Find the "Search" button and update:
```javascript
// Before
<button type="submit" disabled={loading}>
  {loading ? "..." : "Search"}
</button>

// After
<button type="submit" disabled={loading} style={{...styles}}>
  {loading ? (
    <span>🔍 Searching...</span>
  ) : (
    <span>Search</span>
  )}
</button>
```

Same for "Add to watchlist" button:
```javascript
// Before
{submitting ? "Adding..." : "Add to watchlist"}

// After
{submitting ? (
  <span>⏳ Adding...</span>
) : (
  <span>Add to watchlist</span>
)}
```

## Step 6: Update DramaDetailModal

**File:** `src/components/DramaDetailModal.jsx`

Same approach as AddDramaModal — update button text to show loading state:

```javascript
// In save button
{submitting ? "⏳ Saving..." : "Save changes"}

// In delete confirmation, add better prompt
const handleDelete = async () => {
  const title = drama.title;
  if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
    return;
  }
  // ... rest of delete logic
};
```

## Step 7: Add Loading Spinner CSS

In `src/main.css`, add at the end:

```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

## Testing Checklist

After making changes, test:

- [ ] Login → see success toast
- [ ] Login with wrong password → see error toast
- [ ] Sign up → see success toast
- [ ] Add drama → see loading spinner + success toast
- [ ] Search TMDB → shows "Searching..."
- [ ] Edit drama → see loading spinner + success toast
- [ ] Delete drama → see confirmation + info toast
- [ ] All toasts disappear after 3 seconds
- [ ] Can dismiss toasts by clicking X
- [ ] Toasts appear in bottom-right corner

## What This Adds

✅ **Success/error feedback** — User knows if action worked
✅ **Loading states** — Visual feedback while waiting
✅ **Better UX** — Feels more polished & responsive
✅ **No dependencies** — Just ~50 lines of custom code

## Total Time: ~30 mins ⏱️

Once done, commit:
```bash
git add -A
git commit -m "Polish Phase 1: Add toast notifications and loading states"
git push
```

Then you're ready for **Phase 2: Analytics Dashboard** 🚀

---

**Why these changes matter:**
- Before: User clicks button, nothing happens for 2 seconds, drama appears (confusing)
- After: User clicks button, sees "⏳ Adding..." spinner, then "✓ Added!" toast (clear & professional)

This is the difference between a prototype and a real app! 🎬
