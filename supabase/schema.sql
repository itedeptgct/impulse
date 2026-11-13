CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profile table and policies
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'house_mod', 'mod', 'admin')),
    guild TEXT CHECK (guild IN ('octagram', 'chameleon', 'blue_jays')),
    course TEXT CHECK (course IN ('BSIT', 'BSCS')),
    year_level INT CHECK (year_level BETWEEN 1 AND 4),
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT username_min_length CHECK (char_length(TRIM(username)) >= 2),
    CONSTRAINT display_name_min_length CHECK (char_length(TRIM(display_name)) >= 2)
);

CREATE TABLE IF NOT EXISTS public.private_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, TIMEZONE('utc'::text, NOW()));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
CREATE TRIGGER on_auth_user_before_insert
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user_email();

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Posts table and policies
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'house')),
    guild TEXT CHECK (guild IN ('octagram', 'chameleon', 'blue_jays')),
    code_snippet TEXT,
    code_language TEXT,
    image_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'post' CHECK (post_type IN ('post', 'dispatch')),
    event_date TEXT,
    event_location TEXT,
    upvotes_count INT NOT NULL DEFAULT 0,
    downvotes_count INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    is_edited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_dispatch
    ON public.posts (post_type, guild, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_feed_created_at
    ON public.posts (visibility, guild, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_feed_upvotes
    ON public.posts (visibility, guild, upvotes_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_author_created_at
    ON public.posts (author_id, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts audience visibility"
    ON public.posts FOR SELECT
    TO authenticated
    USING (
        visibility = 'public'
        OR guild = (SELECT guild FROM public.profiles WHERE id = auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "Users can insert their own posts"
    ON public.posts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
    ON public.posts FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = author_id
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        auth.uid() = author_id
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "Users can delete their own posts"
    ON public.posts FOR DELETE
    TO authenticated
    USING (
        auth.uid() = author_id
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

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

-- Post votes table and policies
CREATE TABLE IF NOT EXISTS public.post_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    vote INT NOT NULL CHECK (vote IN (-1, 1)),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (user_id, post_id)
);

ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes"
    ON public.post_votes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can cast or change own vote"
    ON public.post_votes FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_post_vote_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.posts
        SET upvotes_count = COALESCE((SELECT COUNT(*) FROM public.post_votes WHERE post_id = OLD.post_id AND vote = 1), 0),
            downvotes_count = COALESCE((SELECT COUNT(*) FROM public.post_votes WHERE post_id = OLD.post_id AND vote = -1), 0)
        WHERE id = OLD.post_id;
        RETURN OLD;
    ELSE
        UPDATE public.posts
        SET upvotes_count = COALESCE((SELECT COUNT(*) FROM public.post_votes WHERE post_id = NEW.post_id AND vote = 1), 0),
            downvotes_count = COALESCE((SELECT COUNT(*) FROM public.post_votes WHERE post_id = NEW.post_id AND vote = -1), 0)
        WHERE id = NEW.post_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_vote_change ON public.post_votes;
CREATE TRIGGER on_post_vote_change
    AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
    FOR EACH ROW EXECUTE FUNCTION public.handle_post_vote_change();

-- Comments table and policies
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    reply_to_username TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable for accessible posts"
    ON public.comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = comments.post_id
        )
    );

CREATE POLICY "Authenticated users can create comments"
    ON public.comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own non-deleted comments"
    ON public.comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id AND is_deleted = false)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins and mods can update comments"
    ON public.comments FOR UPDATE
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

CREATE POLICY "Users and admins can delete comments"
    ON public.comments FOR DELETE
    TO authenticated
    USING (
        auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

CREATE OR REPLACE FUNCTION public.handle_comment_count_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_deleted = false THEN
            UPDATE public.posts
            SET comments_count = GREATEST(0, comments_count - 1)
            WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            UPDATE public.posts
            SET comments_count = GREATEST(0, comments_count - 1)
            WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_count_change ON public.comments;
CREATE TRIGGER on_comment_count_change
    AFTER INSERT OR UPDATE OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_comment_count_change();

-- ID Verification table and policies
CREATE TABLE IF NOT EXISTS public.id_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.id_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications"
    ON public.id_verifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can insert own verifications"
    ON public.id_verifications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verifications"
    ON public.id_verifications FOR UPDATE
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Reports & Moderation queue
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

CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_open_reporter_target 
    ON public.reports (reporter_id, target_type, target_id) 
    WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_reports_status_created 
    ON public.reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_guild_status 
    ON public.reports (guild, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_target 
    ON public.reports (target_type, target_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);

CREATE POLICY "Admins and mods can view all reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

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

