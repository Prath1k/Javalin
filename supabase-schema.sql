-- PixelArena Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  favorite_game TEXT DEFAULT '',
  total_play_time INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. HIGH SCORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.high_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  display_name TEXT DEFAULT 'Player',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure guest_id column exists (in case table was created by an older script)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='high_scores' AND column_name='guest_id') THEN
    ALTER TABLE public.high_scores ADD COLUMN guest_id TEXT;
  END IF;
END $$;


CREATE UNIQUE INDEX IF NOT EXISTS idx_high_scores_user_game
  ON public.high_scores(user_id, game_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_high_scores_guest_game
  ON public.high_scores(guest_id, game_id)
  WHERE guest_id IS NOT NULL;

ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "High scores are viewable by everyone"
  ON public.high_scores FOR SELECT USING (true);

CREATE POLICY "Users can insert own scores"
  ON public.high_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own scores"
  ON public.high_scores FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Guests can insert scores"
  ON public.high_scores FOR INSERT
  WITH CHECK (user_id IS NULL AND guest_id IS NOT NULL);

CREATE POLICY "Guests can update scores"
  ON public.high_scores FOR UPDATE
  USING (user_id IS NULL AND guest_id IS NOT NULL);

-- ============================================================
-- 4. GAME SESSIONS TABLE (Play History)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user
  ON public.game_sessions(user_id, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_cleanup
  ON public.game_sessions(played_at);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.game_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. CLEANUP FUNCTION (for weekly deletion of old sessions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.game_sessions WHERE played_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. WEEKLY CRON JOB (Optional — requires pg_cron extension)
--    Enable pg_cron from: Dashboard → Database → Extensions
--    Then uncomment and run the lines below:
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule(
  'weekly-session-cleanup',
  '0 3 * * 1',
   $$DELETE FROM public.game_sessions WHERE played_at < now() - INTERVAL '7 days'$$
);
