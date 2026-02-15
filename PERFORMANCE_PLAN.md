# Earworm Performance Improvement Plan

Current bundle: 590KB JS / 43KB CSS (gzipped: 161KB / 8KB).
Most of the perceived slowness comes from data fetching patterns, not code size.

---

## 1. Fix Waterfall Fetches (Highest Impact)

Almost every page fetches data sequentially when queries could run in parallel.

**PublicProfile.jsx** — 3-level waterfall: profile → lyric → note
- Fetch profile, then use profile.id to fetch lyric, then use lyric.id to fetch note
- Fix: Create a Supabase DB function (RPC) that returns profile + current lyric + note in one call

**SharedLyric.jsx** — Fetches lyric, then fetches profile using lyric.user_id
- Fix: Use `.select('*, profiles:user_id(username, is_public)')` to join in one query

**Explore, SongPage, ArtistPage** — All fetch lyrics, wait, then fetch notes
- Fix: Use `Promise.all` — fetch lyrics and notes in parallel (notes query can use the same filter criteria rather than depending on lyric IDs), or join notes in the initial query

**Following.jsx** — Fetches 100 public lyrics, then filters client-side to match follows
- Fix: Build a server-side query using the user's follow list with OR conditions, or create an RPC

---

## 2. Memoize Context Values (High Impact, Easy)

All four context providers (`AuthContext`, `LyricContext`, `FollowContext`, `CollectionContext`) recreate their value object on every render. Every consumer re-renders even when nothing relevant changed.

Fix for each: wrap the value in `useMemo` and wrap functions in `useCallback`.

```jsx
// Before
const value = { user, profile, loading, signUp, signIn, signOut }

// After
const signUpCb = useCallback(async (email, pw, username) => { ... }, [])
const value = useMemo(() => ({
  user, profile, loading,
  signUp: signUpCb, signIn: signInCb, signOut: signOutCb
}), [user, profile, loading])
```

---

## 3. Memoize Expensive Render Computations

Clustering logic in Explore, ArtistPage, and SongPage rebuilds cluster objects on every render.

```jsx
// Before (runs every render)
const clusters = {}
lyrics.forEach(l => { ... })

// After
const clusters = useMemo(() => {
  const map = {}
  lyrics.forEach(l => { ... })
  return Object.entries(map)
}, [lyrics])
```

Same applies to ArtistPage's `uniqueUsers` Set and `songMap` calculations.

---

## 4. Add React.memo to List Components

`LyricCard`, `CompactCard` (in HorizontalCardCarousel), and `TimelineEntry` (in History) are rendered in lists but aren't wrapped in `React.memo`. Every parent re-render re-renders the entire list.

---

## 5. Replace `select('*')` with Column Lists

Most Supabase queries use `select('*')`. Specifying only needed columns reduces data transfer.

Biggest wins:
- `History.jsx` — fetches all lyrics with all columns just to group by date
- `Following.jsx` — fetches 100 full lyric rows to display 20
- `CollectionDetail.jsx` — fetches all user lyrics to build "available" list
- `Home.jsx` tags query — fetches all lyrics just to extract unique tags; only needs `select('tags')`

---

## 6. Add Pagination Where Missing

**History.jsx** — Loads every lyric the user has ever saved, no limit. Add cursor-based pagination with "load more" (limit 50 per page).

**Explore.jsx** — Hard limit of 50, no "load more" button. Add pagination matching ArtistPage's pattern.

---

## 7. Skeleton Loaders Instead of "Loading..."

Every page shows plain `Loading...` text. Replace with skeleton placeholders that match the layout shape — perceived load time drops significantly even if actual time is the same.

---

## 8. Lazy-Load Heavy Modals and Pages

Modals like `ShareModal`, `ReplaceModal`, `SignupOverlay`, and `CompactCommentModal` are bundled upfront but only rendered on interaction. Use `React.lazy` + `Suspense` for these.

Pages like Collections, History, and Settings could also be lazy-loaded since they're behind auth.

---

## 9. Reduce IntersectionObserver Count

`useRevealOnScroll` creates one IntersectionObserver per LyricCard. In a list of 50 cards, that's 50 observers. Use a single shared observer that tracks all cards.

---

## 10. Cache Previously Fetched Data

Navigating back to a page (e.g., Explore → Artist → back to Explore) re-fetches everything. Options:
- Simple: Store fetched data in context/state that persists across navigation
- Better: Use a lightweight cache layer (React Query / SWR pattern) around Supabase calls

---

## Priority Order

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Memoize context values | Small | High — stops unnecessary re-renders app-wide |
| 2 | Parallelize waterfall fetches | Medium | High — cuts page load times roughly in half |
| 3 | useMemo on clustering logic | Small | Medium — stops redundant computation |
| 4 | React.memo on list items | Small | Medium — stops list re-render cascade |
| 5 | Skeleton loaders | Medium | High perceived improvement |
| 6 | History pagination | Small | Medium — prevents unbounded data fetch |
| 7 | Column-specific selects | Small | Low-Medium — less data over the wire |
| 8 | Lazy-load modals/pages | Medium | Low — shaves ~50-100KB off initial bundle |
| 9 | Shared IntersectionObserver | Small | Low — reduces GC pressure in long lists |
| 10 | Navigation cache | Large | High — instant back-navigation |
