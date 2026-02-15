# Earwyrm — Architecture & Current State

> Last updated: January 2025. Comprehensive documentation for platform migration and feature planning.

## Executive Summary

Earwyrm is a lyric journaling web app where users save and reflect on lyrics that resonate with them. Users maintain a "current lyric" on their home screen, browse their history ("Memory Lane"), organize lyrics into collections, add private notes, discover public lyrics on Explore, and share rendered lyric cards.

**Tech Stack:** React 19 + React Router 7 (SPA), Vite 7, Tailwind CSS 4, Supabase (PostgreSQL + Auth), deployed on Vercel.

---

## Project Structure

```
src/
├── components/
│   ├── CollectionPicker.jsx   # Add lyric to collections (grid + toggles)
│   ├── EditLyricModal.jsx     # Full edit modal (tags, collections, metadata)
│   ├── Layout.jsx             # App shell (header, hamburger nav, footer)
│   ├── LoadingScreen.jsx      # Loading state
│   ├── LyricCard.jsx          # Main lyric display card (view + inline edit)
│   ├── LyricForm.jsx          # Create new lyric form
│   ├── ModalSheet.jsx         # Bottom sheet (mobile) / centered modal (desktop)
│   ├── NoteDisplay.jsx        # Legacy note display
│   ├── NoteEditor.jsx         # Inline note editor with auto-save
│   ├── ReplaceModal.jsx       # New lyric modal (archives current)
│   ├── ShareModal.jsx         # Share lyric as image/link (canvas rendering)
│   ├── TagInput.jsx           # Tag input with autocomplete
│   └── VisibilityToggle.jsx   # Public/private toggle with confirmation
├── contexts/
│   ├── AuthContext.jsx        # User auth state & profile
│   ├── CollectionContext.jsx  # Collections CRUD
│   ├── FollowContext.jsx      # Following tags/artists/songs
│   └── LyricContext.jsx       # Current lyric & notes
├── lib/
│   ├── paperTexture.js        # Dark/light mode theming (CSS variables)
│   ├── supabase.js            # Supabase client init
│   ├── supabase-wrapper.js    # Custom fetch wrapper (React 19 compat)
│   ├── themes.js              # Visual theme config (colors, fonts)
│   └── utils.js               # Helpers (time formatting, share tokens)
├── pages/
│   ├── CollectionDetail.jsx   # Single collection view
│   ├── Collections.jsx        # All collections list
│   ├── Explore.jsx            # Discover public lyrics
│   ├── Following.jsx          # Followed tags/artists/songs
│   ├── History.jsx            # Memory Lane (all past lyrics)
│   ├── Home.jsx               # Current lyric + note
│   ├── Login.jsx              # Email/password login
│   ├── Privacy.jsx            # Privacy policy
│   ├── PublicProfile.jsx      # @username public page
│   ├── Settings.jsx           # User settings
│   ├── SharedLyric.jsx        # /s/:token shareable link
│   ├── Signup.jsx             # Account creation
│   └── Terms.jsx              # Terms of service
├── App.jsx                     # Router config
├── index.css                   # Global styles + dark mode overrides
└── main.jsx                    # Entry point
```

---

## Routes

### Protected (require auth)
| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Current lyric + note editor |
| `/history` | History | Memory Lane — all past lyrics grouped by time |
| `/collections` | Collections | Manual + smart collections |
| `/collections/:id` | CollectionDetail | Lyrics in a collection |
| `/settings` | Settings | Username, password, theme, visibility |
| `/following` | Following | Followed tags/artists/songs |

### Public
| Route | Page | Purpose |
|-------|------|---------|
| `/login` | Login | Email/password auth |
| `/signup` | Signup | Account creation with username |
| `/explore` | Explore | Discover public lyrics (no auth needed) |
| `/explore/:filterType/:filterValue` | Explore | Filtered by tag/artist/song |
| `/@:username` | PublicProfile | User's public profile |
| `/s/:token` | SharedLyric | Shareable lyric link |
| `/privacy` | Privacy | Privacy policy |
| `/terms` | Terms | Terms of service |

---

## Database Schema (Supabase/PostgreSQL)

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References auth.users(id) |
| username | text UNIQUE | 3-20 chars, alphanumeric + underscores |
| email | text | |
| is_public | boolean | Default false. Makes all future lyrics public |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated via trigger |

### lyrics
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | → profiles.id |
| content | text | The lyric text |
| song_title | text | Optional |
| artist_name | text | Optional |
| tags | text[] | Freeform array |
| theme | text | Default 'signature' |
| is_current | boolean | One per user |
| is_public | boolean | Visible on Explore |
| share_token | text UNIQUE | 128-bit random for /s/ links |
| created_at | timestamptz | |
| replaced_at | timestamptz | When archived |

### lyric_notes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lyric_id | uuid FK | |
| user_id | uuid FK | |
| content | text | Max 500 chars |
| is_public | boolean | Show on Explore |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE(lyric_id, user_id) | | One note per user per lyric |

### collections
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | UNIQUE per user |
| description | text | Optional |
| color | text | charcoal, coral, sage, lavender, amber, ocean |
| is_smart | boolean | Auto-populate from tag |
| smart_tag | text | Tag filter (if smart) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### lyric_collections (junction)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lyric_id | uuid FK | |
| collection_id | uuid FK | |
| added_at | timestamptz | |
| UNIQUE(lyric_id, collection_id) | | |

### follows
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| filter_type | text | 'tag', 'artist', or 'song' |
| filter_value | text | The name |
| created_at | timestamptz | |
| UNIQUE(user_id, filter_type, filter_value) | | |

### Key Indexes
- GIN index on `lyrics.tags` (array containment queries)
- Indexes on all foreign keys, `is_current`, `is_public`, `share_token`, `username`

### RLS Summary
- Users can only read/write their own data
- Exception: public lyrics + public notes readable by anyone
- Share tokens allow unauthenticated access to specific lyrics

---

## Authentication

- **Provider:** Supabase Auth (email/password)
- **Session:** localStorage with auto-refresh tokens
- **Signup flow:** email + password + username → profile created → default "Favorites" collection via trigger
- **State:** AuthContext provides user, profile, signUp/signIn/signOut

---

## State Management

Four React Contexts, no external state library:

1. **AuthContext** — user session, profile data
2. **LyricContext** — current lyric, note, CRUD operations
3. **CollectionContext** — collections CRUD, lyric-collection associations
4. **FollowContext** — follow/unfollow tags/artists/songs

---

## Design System

### Typography
| Role | Font | Size | Weight |
|------|------|------|--------|
| Lyrics | Caveat (handwritten) | 1.875rem | 500 |
| UI text | DM Sans (sans-serif) | 0.875rem | 400 |
| Attribution | DM Sans italic | 0.875rem | 400 |
| Notes | Caveat | 1.25rem | 400 |

### Color System (CSS variables set in paperTexture.js)
| Variable | Light | Dark |
|----------|-------|------|
| --surface-bg | #E8E2D9 | #1A1816 |
| --surface-card | #F5F2ED | #252220 |
| --surface-elevated | #FAF8F5 | #2D2A27 |
| --text-primary | #1A1714 | #F7F3EC |
| --text-secondary | #4A433B | #E8E0D6 |
| --text-muted | #7A7268 | #C8BEB4 |

### Key Design Decisions
- No pure white or pure black — warm cream/charcoal throughout
- Handwritten Caveat font gives journal/personal feel
- Cards float with shadows over textured background
- Vignette overlay adds depth
- Notes styled as marginalia (left border, slight rotation)
- Bottom sheets on mobile, centered modals on desktop
- 44px minimum touch targets

---

## Share System

### Image Generation (Canvas API)
- Formats: Square (1080×1080) or Story (1080×1920)
- Dark/light mode toggle
- Smart line breaking with orphan avoidance
- Dynamic font scaling based on content length
- Optional note as marginalia
- Brand signature ("earwyrm") at bottom

### Share Link
- Each lyric gets a cryptographic share_token
- URL: `earwyrm.app/s/{token}` (optional `?n=1` for note)
- Public route, no auth required
- Native Share API on mobile, download fallback

---

## Build & Deploy

- **Build:** Vite 7 → `/dist`
- **Deploy:** Vercel (auto-deploy from main branch)
- **SPA routing:** `vercel.json` rewrites all paths to `/`
- **Security headers:** nosniff, DENY frame, HSTS, strict referrer
- **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Dependencies (production only)

| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.90.1 | Database + Auth |
| react | ^19.2.0 | UI |
| react-dom | ^19.2.0 | DOM rendering |
| react-router-dom | ^7.11.0 | Client-side routing |

Note: Custom Supabase wrapper (`supabase-wrapper.js`) built to bypass React 19 compatibility issue with Supabase's fetch internals.

---

## Feature Inventory (User-Facing)

| Feature | Status | Notes |
|---------|--------|-------|
| Current lyric (home) | Shipped | Single lyric + note, edit/replace |
| Memory Lane (history) | Shipped | Chronological, time-grouped |
| Collections | Shipped | Manual + smart (tag-based) |
| Tags | Shipped | Freeform, autocomplete, trending |
| Notes | Shipped | Auto-save, 500 chars, optional public |
| Explore | Shipped | Search, filter by tag/artist/song |
| Following | Shipped | Follow tags/artists/songs |
| Public profiles | Shipped | /@username |
| Share cards | Shipped | Canvas-rendered images, share links |
| Dark mode | Shipped | Auto/light/dark, full coverage |
| Settings | Shipped | Username, password, theme, visibility |
| Onboarding/FTUE | Missing | No first-use guidance |
| Song/artist pages | Missing | No aggregated view |
| Social interactions | Missing | No reactions, comments, replies |
| Song identification | Missing | No audio/text identification |
| Search (prominent) | Missing | Buried in Explore |
