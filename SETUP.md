# earwyrm Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the details:
   - **Name**: earwyrm (or your preferred name)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose the closest to your users
4. Click "Create new project" and wait for it to initialize (~2 minutes)

## 2. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` from this repo
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This creates:
- `profiles` table (user profiles with usernames)
- `lyrics` table (all lyrics, current and historical)
- Row Level Security policies for privacy controls
- Necessary indexes for performance

## 3. Configure Authentication

1. Go to **Authentication** > **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Optionally configure:
   - **Authentication** > **Settings** > **Email Auth**:
     - Disable "Confirm email" for easier testing (enable in production)
     - Set minimum password length to 6

## 4. Get Your API Keys

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## 5. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## 6. Run the Development Server

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to see the app.

## 7. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click "Deploy"

The `vercel.json` is already configured for client-side routing.

## Troubleshooting

### "Missing Supabase environment variables" warning
Make sure your `.env` file exists and contains valid credentials.

### "User not found" on signup
The profile creation might have failed. Check the Supabase logs under **Database** > **Logs**.

### Lyrics not showing on public profile
Make sure:
1. The lyric is marked as public (toggle "Visible to others")
2. The lyric is the current lyric (`is_current = true`)

### RLS policy errors
If you see permission errors, make sure you ran the complete `schema.sql` file, including all the policies.

## Database Schema Reference

### profiles
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | User ID (from auth.users) |
| username | text | Unique username |
| email | text | User's email |
| created_at | timestamp | Account creation date |
| updated_at | timestamp | Last profile update |

### lyrics
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Lyric ID |
| user_id | uuid | Owner's profile ID |
| content | text | The lyric text |
| song_title | text | Optional song name |
| artist_name | text | Optional artist name |
| theme | text | Visual theme ID |
| is_current | boolean | Is this the active lyric? |
| is_public | boolean | Is this visible to others? |
| created_at | timestamp | When lyric was set |
| replaced_at | timestamp | When lyric was replaced |
