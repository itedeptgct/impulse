-- Migration: 20261112_add_dispatches_and_mod_roles.sql
-- Adds support for Dispatches (post_type, event metadata) and Mod / House Mod roles

-- 1. Update profiles role check constraint to include 'house_mod' and 'mod'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('user', 'house_mod', 'mod', 'admin'));

-- 2. Add dispatch and event columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'post' 
    CHECK (post_type IN ('post', 'dispatch'));

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS event_location TEXT;

-- 3. Fast lookup index for dispatches by house and creation date
CREATE INDEX IF NOT EXISTS idx_posts_dispatch
    ON public.posts (post_type, guild, created_at DESC);
