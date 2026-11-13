-- Migration: 20261113_email_privacy_and_account_deletion.sql
-- Profile Email Privacy & Permanent Account Deletion

-- 1. Create public.private_profiles table
CREATE TABLE IF NOT EXISTS public.private_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Backfill private_profiles from public.profiles
INSERT INTO public.private_profiles (user_id, email)
SELECT id, email
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 3. Enable Row Level Security and configure access policies
ALTER TABLE public.private_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own private profile"
    ON public.private_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own private profile"
    ON public.private_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private profile"
    ON public.private_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and mods can select all private profiles"
    ON public.private_profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

-- 4. Update handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    raw_username TEXT;
    raw_display_name TEXT;
    fallback_username TEXT;
BEGIN
    fallback_username := 'student_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
    raw_username := lower(trim(COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(COALESCE(NEW.email, ''), '@', 1),
        ''
    )));
    IF char_length(raw_username) < 2 OR EXISTS (SELECT 1 FROM public.profiles WHERE username = raw_username) THEN
        raw_username := fallback_username;
    END IF;

    raw_display_name := trim(COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'username',
        split_part(COALESCE(NEW.email, ''), '@', 1),
        'Student'
    ));
    IF char_length(raw_display_name) < 2 THEN
        raw_display_name := 'Student';
    END IF;

    INSERT INTO public.profiles (id, username, display_name)
    VALUES (NEW.id, raw_username, raw_display_name)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.private_profiles (user_id, email)
    VALUES (NEW.id, COALESCE(NEW.email, ''))
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- 5. Drop email column from public.profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- 6. Create delete_own_account() function
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, auth
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete user storage objects
    DELETE FROM storage.objects WHERE owner = current_user_id;

    -- Delete public profile (cascades posts, comments, votes, verifications, private_profiles)
    DELETE FROM public.profiles WHERE id = current_user_id;

    -- Delete auth user
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
