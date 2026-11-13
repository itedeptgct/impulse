-- Migration: 20261113_reports_and_moderation.sql
-- Adds post & comment reporting and moderation queue tables & RLS policies

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    guild TEXT CHECK (guild IN ('octagram', 'chameleon', 'blue_jays')),
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Partial unique index: one open report per user per target
CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_open_reporter_target 
    ON public.reports (reporter_id, target_type, target_id) 
    WHERE status = 'open';

-- Query indexes for moderation feeds
CREATE INDEX IF NOT EXISTS idx_reports_status_created 
    ON public.reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_guild_status 
    ON public.reports (guild, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_target 
    ON public.reports (target_type, target_id);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- INSERT policy: Authenticated users can insert their own reports
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
CREATE POLICY "Users can insert own reports"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- SELECT policies:
-- 1. Users can select their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);

-- 2. Admin and mod can select all reports
DROP POLICY IF EXISTS "Admins and mods can view all reports" ON public.reports;
CREATE POLICY "Admins and mods can view all reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

-- 3. House mods can select reports where guild matches their guild
DROP POLICY IF EXISTS "House mods can view guild reports" ON public.reports;
CREATE POLICY "House mods can view guild reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'house_mod'
              AND guild IS NOT NULL
              AND guild = public.reports.guild
        )
    );

-- UPDATE policies:
-- 1. Admin and mod can update all reports
DROP POLICY IF EXISTS "Admins and mods can update all reports" ON public.reports;
CREATE POLICY "Admins and mods can update all reports"
    ON public.reports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

-- 2. House mods can update reports where guild matches their guild
DROP POLICY IF EXISTS "House mods can update guild reports" ON public.reports;
CREATE POLICY "House mods can update guild reports"
    ON public.reports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'house_mod'
              AND guild IS NOT NULL
              AND guild = public.reports.guild
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'house_mod'
              AND guild IS NOT NULL
              AND guild = public.reports.guild
        )
    );
