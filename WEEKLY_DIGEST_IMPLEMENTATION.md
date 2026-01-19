# Weekly Digest Implementation Guide

This document explains the new components and how to integrate the Weekly Digest feature.

## Overview

The Weekly Digest is a curated collection of 15-20 anonymous lyrics published every Sunday. It creates a retention loop while preserving the app's "quiet" aesthetic—no real-time feeds, no algorithmic recommendations, just a weekly "issue" of what moved people.

## New Components

### 1. `DigestIntroModal.jsx`
**Purpose:** First-time introduction after user shares their first lyric.

**Shows:**
- Explanation of the digest
- Preview of how THEIR lyric would appear
- Opt-in checkbox for this lyric
- "Remember my choice" checkbox for future lyrics

**Props:**
```javascript
{
  lyric: {
    content: string,
    song_title: string,
    artist_name: string,
    theme: string
  },
  onClose: () => void,
  onOptIn: (includeInDigest: boolean, rememberChoice: boolean) => void
}
```

**Usage:**
```jsx
import DigestIntroModal from './components/DigestIntroModal'

// After first lyric is saved successfully:
setShowDigestIntro(true)

// In render:
{showDigestIntro && (
  <DigestIntroModal
    lyric={currentLyric}
    onClose={() => setShowDigestIntro(false)}
    onOptIn={(include, remember) => {
      // Save preference to user settings
      // Update current lyric's include_in_digest field
    }}
  />
)}
```

---

### 2. `DigestExplanation.jsx`
**Purpose:** Lightweight explanation modal accessible from "What's this?" links.

**Shows:**
- Brief explanation of digest
- Key features (anonymous, random, weekly)
- Positioning as music discovery tool

**Props:**
```javascript
{
  onClose: () => void
}
```

**Usage:**
```jsx
import DigestExplanation from './components/DigestExplanation'

{showExplanation && (
  <DigestExplanation onClose={() => setShowExplanation(false)} />
)}
```

---

### 3. `LyricFormWithDigest.jsx`
**Purpose:** Example of how to integrate digest opt-in into the existing LyricForm.

**New features:**
- Checkbox: "Include in weekly digest (anonymous)"
- "What's this?" link to explanation
- Respects user's default preference from settings

**Props:**
```javascript
{
  onSubmit: (data) => void,  // Now includes includeInDigest boolean
  initialValues: object,
  submitLabel: string,
  isLoading: boolean,
  error: string | null,
  defaultIncludeInDigest: boolean,  // From user settings
  showDigestOption: boolean         // Hide for replacements
}
```

**Integration steps:**
1. Replace current `LyricForm` imports with `LyricFormWithDigest`
2. Update `onSubmit` handler to save `includeInDigest` field
3. Pass `defaultIncludeInDigest` from user profile settings

---

### 4. `WeeklyDigest.jsx`
**Purpose:** The actual digest view—what users see on Sundays.

**Shows:**
- Date range of the week
- Count of lyrics included
- Scrollable list of lyric cards
- "See you next Sunday" end marker

**Features:**
- Each lyric displayed in its original theme
- Anonymous (no usernames)
- Simple timestamp ("shared 3 days ago")
- Clean, magazine-like layout

**Route:**
```javascript
// Add to App.jsx
<Route path="/digest" element={<WeeklyDigest />} />
```

---

## Database Schema Changes

```sql
-- Add new column to lyrics table
ALTER TABLE lyrics ADD COLUMN include_in_digest BOOLEAN DEFAULT false;

-- Create weekly_digests table
CREATE TABLE weekly_digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_of DATE NOT NULL,
  published_at TIMESTAMP NOT NULL DEFAULT NOW(),
  lyrics JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for querying current digest
CREATE INDEX idx_weekly_digests_published ON weekly_digests(published_at DESC);

-- User settings table update (if not exists)
ALTER TABLE profiles ADD COLUMN default_include_in_digest BOOLEAN DEFAULT false;
```

---

## Backend: Weekly Job

Create a cron job or scheduled function that runs every Sunday at 6am:

```javascript
// supabase/functions/generate-weekly-digest/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Get all eligible lyrics from past week
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)

  const { data: eligibleLyrics, error: fetchError } = await supabase
    .from('lyrics')
    .select('*')
    .eq('include_in_digest', true)
    .gte('created_at', lastWeek.toISOString())

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError }), { status: 500 })
  }

  // Shuffle and take 20
  const shuffled = eligibleLyrics.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 20)

  // Store digest
  const { error: insertError } = await supabase
    .from('weekly_digests')
    .insert({
      week_of: lastWeek.toISOString(),
      lyrics: selected,
      published_at: new Date().toISOString()
    })

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError }), { status: 500 })
  }

  // TODO: Send notifications to users
  // TODO: Send emails with "New digest available"

  return new Response(JSON.stringify({
    success: true,
    count: selected.length
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Schedule with Supabase Cron:**
```sql
-- In Supabase dashboard, go to Database > Cron Jobs
-- Create new job:
SELECT cron.schedule(
  'generate-weekly-digest',
  '0 6 * * 0',  -- Every Sunday at 6am
  $$
  SELECT net.http_post(
    url:='YOUR_SUPABASE_URL/functions/v1/generate-weekly-digest',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

---

## User Flow

### First Lyric (New User)
1. User shares lyric → Success message
2. `DigestIntroModal` appears
3. Shows preview of their lyric in digest format
4. User opts in/out + sets default preference
5. Modal closes

### Subsequent Lyrics
1. User shares lyric
2. Form shows digest checkbox (pre-checked based on their default)
3. "What's this?" link available
4. Checkbox state saved with lyric

### Sunday Morning
1. Digest is generated automatically (cron job)
2. Users receive notification: "Last Week in Lyrics is here"
3. Navigate to `/digest` to view
4. Scroll through 20 curated lyrics
5. Discover new songs, return to app during week

---

## Settings Integration

Add to `Settings.jsx`:

```jsx
<section className="border-b border-charcoal/10 pb-8">
  <h2 className="text-lg font-medium text-charcoal mb-4">Weekly Digest</h2>

  <label className="flex items-start gap-3 cursor-pointer group">
    <input
      type="checkbox"
      checked={defaultIncludeInDigest}
      onChange={(e) => handleUpdateDigestPreference(e.target.checked)}
      className="mt-0.5 w-4 h-4 rounded border-charcoal/30 text-charcoal
               focus:ring-0 focus:ring-offset-0 cursor-pointer"
    />
    <div>
      <span className="text-sm text-charcoal group-hover:text-charcoal/80 transition-colors block">
        Include my lyrics in weekly digest by default
      </span>
      <span className="text-xs text-charcoal-light/60 block mt-0.5">
        You can change this for individual lyrics when sharing
      </span>
    </div>
  </label>

  <button
    type="button"
    onClick={() => setShowDigestExplanation(true)}
    className="mt-3 text-xs text-charcoal-light hover:text-charcoal transition-colors
             underline hover:no-underline"
  >
    What's the weekly digest?
  </button>
</section>
```

---

## Navigation

Add digest link to header (in `Layout.jsx`):

```jsx
{user && !isAuthPage && (
  <nav className="flex items-center gap-6">
    <Link to="/digest" className="text-sm text-charcoal-light hover:text-charcoal transition-colors">
      This Week
    </Link>
    <Link to="/history" className="text-sm text-charcoal-light hover:text-charcoal transition-colors">
      History
    </Link>
    <Link to="/settings" className="text-sm text-charcoal-light hover:text-charcoal transition-colors">
      Settings
    </Link>
    {/* ... */}
  </nav>
)}
```

---

## Testing Checklist

- [ ] First-time modal appears after sharing first lyric
- [ ] Preview shows correct lyric with theme styling
- [ ] "Remember my choice" checkbox saves to user settings
- [ ] Digest toggle appears on subsequent lyric shares
- [ ] "What's this?" link opens explanation modal
- [ ] Settings page shows digest preference
- [ ] Weekly digest page displays correctly
- [ ] Anonymous (no usernames visible)
- [ ] Lyrics display in original themes
- [ ] Empty state when no digest available
- [ ] Cron job generates digest with 20 random lyrics
- [ ] Only includes lyrics with `include_in_digest = true`
- [ ] Respects 7-day window

---

## Launch Considerations

### For Reddit Launch
1. Manually curate first digest (if < 20 lyrics available)
2. Consider seeding with your own lyrics to show variety
3. Screenshot digest view for Reddit post
4. Emphasize "anti-social feed" positioning

### Notifications
- Email: "Last Week in Lyrics is ready to read"
- In-app badge on `/digest` link
- Push notification (optional, later)

### Analytics to Track
- What % of users opt-in to digest?
- Do digest viewers return more frequently?
- Does digest drive lyric sharing?
- Which themes are most common in digest?

---

## Future Enhancements

**Premium Features:**
- Archive of past digests (free users only see current week)
- Filter digest by genre/mood
- "Digest History" view showing all past weeks
- Get credit in digest (show first name instead of anonymous)

**Community Features:**
- React to digest lyrics (🔥 💔 ✨) - NO comments
- "Save to collection" from digest
- "I shared this song too" connection indicator

**Discovery Features:**
- Spotify integration: "Add songs from this digest to playlist"
- Apple Music deep links
- "Trending songs this week" based on digest shares
