# Song & Artist Pages — Design Document

## The Problem

Song and artist pages are filtered lists of user-saved lyrics. They don't represent the song or artist as an entity. For an app about lyrics, not being able to see the full lyrics of a song feels like a fundamental gap — like a book highlights app that won't show you the book.

## Inspiration

**Genius** — Full lyrics with community annotations. Users highlight lines and add explanations. Verified artist annotations appear in yellow, community ones in gray. Click a highlighted line → annotation pops up in a side panel. Comments and discussion below.

**Kindle Popular Highlights** — Crowdsourced emphasis. When 10+ readers highlight the same passage, it appears underlined for everyone with a count ("47 highlighters"). The value is seeing what resonates collectively, not what any one person thinks.

**Earworm's angle** — We're not an annotation platform (Genius) or a reading app (Kindle). We're a place where people save the lines that stick with them. The unique data we have is: *which specific lines from a song do people carry around?* That's the feature.

---

## Song Page — Redesigned

### Full Lyrics View (Primary)

The full lyrics of the song are displayed as readable text. Lines that earworm users have saved are **highlighted** — visually distinct from the rest, with intensity proportional to how many people saved that line.

```
[Song Title]
[Artist Name] · [Album Name]

─────────────────────────────

I don't care if it hurts
I want to have control                    ░░ 3 saves
I want a perfect body                     ██ 12 saves
I want a perfect soul                     ██ 12 saves
I want you to notice
When I'm not around
You're so fucking special                 ▓▓ 8 saves
I wish I was special

But I'm a creep                           ██ 14 saves
I'm a weirdo
What the hell am I doing here?            ▓▓ 9 saves
I don't belong here                       ░░ 4 saves

─────────────────────────────
```

**Highlight mechanics:**
- Lines with 1-3 saves: subtle warm tint (light highlight)
- Lines with 4-9 saves: medium highlight
- Lines with 10+ saves: strong highlight
- Unhighlighted lines: normal text, slightly muted
- Tapping a highlighted line expands to show who saved it, their notes, and a "save this line" action

**This is the Kindle Popular Highlights model applied to lyrics.** The full text is there for reference, but the crowd-curated highlights are the feature.

### Where Full Lyrics Come From

Three options, not mutually exclusive:

**Option A: User-pasted (recommended starting point)**
- When saving a lyric, user can optionally paste the full song text
- First person to paste full lyrics for a song establishes the canonical text
- Subsequent saves from that song map their saved line to a position in the full text
- Community can flag/correct errors

**Option B: Genius API**
- Fetch lyrics from Genius with attribution ("Lyrics provided by Genius")
- Genius API provides lyrics + metadata (album, release date, etc.)
- Requires API key and compliance with their terms
- Risk: API changes, rate limits, potential licensing issues

**Option C: Link out (fallback)**
- Don't host full lyrics at all
- "View full lyrics on Genius" link
- Earworm shows only the saved/highlighted lines with context
- Zero licensing risk but weaker experience

**Recommendation:** Start with Option A. It keeps earworm self-contained and user-driven. If a song doesn't have full lyrics yet, show the saved lines with a prompt: "Know the full lyrics? Paste them to see the highlight map." Over time, popular songs get filled in by the community.

### Song Page Sections

```
┌─────────────────────────────────────┐
│ ← [Artist Name]                     │
│                                     │
│ "Song Title"                        │
│ Artist · Album · Year     [follow]  │
│                                     │
│ 23 people saved lines from this     │
│ 4 lines highlighted                 │
├─────────────────────────────────────┤
│                                     │
│ [Full lyrics with highlights]       │
│                                     │
│ Tap any highlighted line to see     │
│ who saved it and their notes        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ MOST SAVED LINE                     │
│ "I want a perfect body / I want     │
│  a perfect soul"                    │
│  — 12 people saved this             │
│  [see notes →]                      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ NOTES ON THIS SONG                  │
│ @user1: "this verse hits different  │
│  at 2am"                            │
│ @user2: "the delivery in the live   │
│  version..."                        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ MORE FROM [ARTIST]                  │
│ [horizontal scroll of other songs   │
│  by this artist with save counts]   │
│                                     │
└─────────────────────────────────────┘
```

### Line-Level Interaction

When a user taps a highlighted line in the full lyrics view:

```
┌─────────────────────────────────────┐
│ "I want a perfect body              │
│  I want a perfect soul"             │
│                                     │
│ 12 people saved this line           │
│                                     │
│ @alice — "perfection as a prison"   │
│ @bob   — (no note)                  │
│ @carol — "goosebumps every time"    │
│ + 9 more                            │
│                                     │
│ [Save this line]  [Close]           │
└─────────────────────────────────────┘
```

This is the core interaction: tap a highlighted line → see the humans behind the highlight.

---

## Artist Page — Redesigned

### Current State
Filtered list of saved lyrics + song links. Functional but flat.

### Proposed Layout

```
┌─────────────────────────────────────┐
│ ← Explore                           │
│                                     │
│ [Artist Name]                       │
│ [follow]  [share]                   │
│                                     │
│ 47 lyrics saved · 23 people         │
│ 8 songs represented                 │
├─────────────────────────────────────┤
│                                     │
│ TOP SONGS                           │
│ Lines saved from these songs most   │
│                                     │
│ "Creep"          14 lines saved     │
│ "Fake Plastic.." 11 lines saved    │
│ "Exit Music"      8 lines saved    │
│ "No Surprises"    6 lines saved    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ MOST SAVED LINES                    │
│ The lines people carry around       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ "I want a perfect body /       │ │
│ │  I want a perfect soul"        │ │
│ │  — Creep · 12 saves            │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ "Her green plastic watering    │ │
│ │  can for her fake Chinese..."  │ │
│ │  — Fake Plastic Trees · 8     │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ RECENT SAVES                        │
│ [LyricCard stream, current style]   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ ALL SONGS                           │
│ "Creep"               14 lines  →  │
│ "Fake Plastic Trees"  11 lines  →  │
│ "Exit Music"           8 lines  →  │
│ "No Surprises"         6 lines  →  │
│ "Karma Police"         4 lines  →  │
│ "Everything in Its.."  3 lines  →  │
│                                     │
└─────────────────────────────────────┘
```

### What's New vs Current

- **Top Songs** ranked by save count (currently flat alphabetical)
- **Most Saved Lines** — the artist's "greatest highlights," aggregated across all users
- **Recent Saves** — the existing LyricCard stream (keeps the social/timeline feel)
- **All Songs** — complete list with save counts (currently exists but without counts)

### Albums (Future, Optional)

If we get album metadata (from user input or API), songs can be grouped:

```
OK COMPUTER (1997)
  "Exit Music"          8 lines
  "No Surprises"        6 lines
  "Karma Police"        4 lines

THE BENDS (1995)
  "Fake Plastic Trees"  11 lines
  "Creep"               14 lines
```

This is a nice-to-have. The page works well without it. Could be added later via user-contributed metadata or a lightweight Spotify/MusicBrainz lookup during the save flow.

---

## Data Model Changes

### For full lyrics support (Option A: user-pasted)

```sql
CREATE TABLE song_lyrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_title text NOT NULL,
  artist_name text NOT NULL,
  full_text text NOT NULL,          -- the complete lyrics
  contributed_by uuid REFERENCES auth.users(id),
  verified boolean DEFAULT false,   -- community-verified accuracy
  created_at timestamptz DEFAULT now(),

  -- Normalize lookup
  UNIQUE(lower(song_title), lower(artist_name))
);
```

### Mapping saved lines to positions in full text

When a user saves a lyric and full lyrics exist for that song, we can compute the line's position in the full text (start/end character indices or line numbers). This enables the highlight overlay.

```sql
ALTER TABLE lyrics ADD COLUMN full_text_start int;
ALTER TABLE lyrics ADD COLUMN full_text_end int;
```

These columns are nullable — populated when full lyrics exist, null otherwise.

### Aggregation queries

Most of the new features are aggregations of existing data:

```sql
-- Top songs for an artist (by save count)
SELECT song_title, COUNT(*) as save_count
FROM lyrics
WHERE lower(artist_name) = lower($1) AND is_public = true
GROUP BY song_title
ORDER BY save_count DESC;

-- Most saved lines (cluster by canonical_lyric_id)
SELECT canonical_lyric_id, content, COUNT(*) as save_count
FROM lyrics
WHERE lower(song_title) = lower($1) AND is_public = true
GROUP BY canonical_lyric_id, content
ORDER BY save_count DESC
LIMIT 5;
```

---

## Implementation Phases

### Phase 1: Enrich existing pages (no new data sources)
- Artist page: add "Top Songs" section ranked by save count
- Artist page: add "Most Saved Lines" section using canonical_lyric_id clustering
- Song page: add "Most Saved Line" callout at top
- Song page: group notes by line, show save counts per line

### Phase 2: Full lyrics with highlights
- Add `song_lyrics` table
- Add "paste full lyrics" option to save flow
- Build the highlight overlay view for song pages
- Map saved lines to positions in full text

### Phase 3: Line-level interaction
- Tap highlighted line → see savers and their notes
- "Save this line" action from within full lyrics view
- This becomes an alternative save flow: browse lyrics → tap to save

### Phase 4: Metadata enrichment (optional)
- Album grouping on artist pages
- Release year on song pages
- Consider lightweight API integration for metadata only (not lyrics)

---

## Open Questions

1. **Line matching** — How do we match a user's saved snippet to a position in the full lyrics? Fuzzy string matching? Exact substring? This is the hardest technical problem.

2. **Canonical text conflicts** — What if two users paste different versions of the same song's lyrics? Need a conflict resolution strategy (first paste wins? community vote? edit history?).

3. **Partial lyrics** — Some users save multi-line passages, others save single lines. The highlight overlay needs to handle variable-length selections gracefully.

4. **Empty state** — Most songs won't have full lyrics initially. The page needs to work well in three states: no full lyrics + few saves, no full lyrics + many saves, full lyrics + highlights.

5. **Licensing** — User-pasted lyrics are legally gray (same territory as Genius, which started the same way). Worth understanding the risk tolerance here.

---

## Sources & References

- [Genius annotation system](https://en.wikipedia.org/wiki/Genius_(company))
- [How Genius annotations work technically (React implementation)](https://drewwebs.medium.com/how-i-recreated-genius-annotations-from-scratch-in-reactjs-b6180bddd49a)
- [Kindle Popular Highlights — how the crowdsourced highlighting works](https://goodereader.com/blog/kindle/the-pitfalls-of-kindles-popular-highlights-feature-and-how-to-turn-it-off)
- [Social Reading: Kindle's highlighting function and emerging reading practices](http://australianhumanitiesreview.org/2014/05/01/social-reading-the-kindles-social-highlighting-function-and-emerging-reading-practices/)
