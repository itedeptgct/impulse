-- Migration: 20261112_bound_feed_queries.sql
-- Indexes to support bounded feed and user profile post queries

-- 1. Fast lookup for public and house feeds sorted by creation time
CREATE INDEX IF NOT EXISTS idx_posts_feed_created_at
    ON public.posts (visibility, guild, created_at DESC);

-- 2. Fast lookup for public and house feeds sorted by upvotes (top/hot)
CREATE INDEX IF NOT EXISTS idx_posts_feed_upvotes
    ON public.posts (visibility, guild, upvotes_count DESC, created_at DESC);

-- 3. Fast lookup for user profile posts sorted by creation time
CREATE INDEX IF NOT EXISTS idx_posts_author_created_at
    ON public.posts (author_id, created_at DESC);
