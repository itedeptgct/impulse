-- Migration: 20261113_post_access_status_rpc.sql
-- Function to determine post access status (accessible, restricted, unauthenticated, not_found)
-- Allows clients (anon or authenticated) to distinguish between deleted posts and restricted posts without leaking post content

CREATE OR REPLACE FUNCTION public.get_post_access_status(p_post_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_visibility TEXT;
    v_post_guild TEXT;
    v_author_id UUID;
    v_caller_role TEXT;
    v_caller_guild TEXT;
BEGIN
    SELECT visibility, guild, author_id
    INTO v_visibility, v_post_guild, v_author_id
    FROM public.posts
    WHERE id = p_post_id;

    IF NOT FOUND THEN
        RETURN 'not_found';
    END IF;

    -- If public post or has no guild restriction
    IF v_visibility = 'public' OR v_post_guild IS NULL THEN
        RETURN 'accessible';
    END IF;

    -- At this point, post is house-restricted
    IF auth.uid() IS NULL THEN
        RETURN 'unauthenticated';
    END IF;

    SELECT role, guild
    INTO v_caller_role, v_caller_guild
    FROM public.profiles
    WHERE id = auth.uid();

    IF auth.uid() = v_author_id OR v_caller_role IN ('admin', 'mod') OR v_caller_guild = v_post_guild THEN
        RETURN 'accessible';
    ELSE
        RETURN 'restricted';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_post_access_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_access_status(UUID) TO anon, authenticated;
