-- Migration: 20261113_remove_supabase_storage.sql
-- Remove Supabase Storage policies and update delete_own_account() for Cloudflare R2 migration

-- 1. Drop storage.objects policies
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can view ID documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own ID document" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own ID document" ON storage.objects;
DROP POLICY IF EXISTS "Post media is publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post media" ON storage.objects;

-- 2. Update delete_own_account() function to remove storage cleanup and storage search_path
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete public profile (cascades posts, comments, votes, verifications, private_profiles)
    DELETE FROM public.profiles WHERE id = current_user_id;

    -- Delete auth user
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
