-- earwyrm Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lyrics table
CREATE TABLE lyrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  song_title TEXT,
  artist_name TEXT,
  theme TEXT DEFAULT 'default',
  is_current BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  replaced_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_lyrics_user_id ON lyrics(user_id);
CREATE INDEX idx_lyrics_is_current ON lyrics(is_current);
CREATE INDEX idx_lyrics_is_public ON lyrics(is_public);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Row Level Security (RLS)

-- Enable RLS on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyrics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can view all profiles (for public profile pages)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Lyrics policies
-- Users can view their own lyrics
CREATE POLICY "Users can view their own lyrics"
  ON lyrics FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view public current lyrics (for public profiles)
CREATE POLICY "Anyone can view public current lyrics"
  ON lyrics FOR SELECT
  USING (is_public = true AND is_current = true);

-- Users can insert their own lyrics
CREATE POLICY "Users can insert their own lyrics"
  ON lyrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own lyrics
CREATE POLICY "Users can update their own lyrics"
  ON lyrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own lyrics
CREATE POLICY "Users can delete their own lyrics"
  ON lyrics FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
