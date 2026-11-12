CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profile table and policies
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
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

    INSERT INTO public.profiles (id, username, display_name, email)
    VALUES (NEW.id, raw_username, raw_display_name, COALESCE(NEW.email, ''))
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

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
    upvotes_count INT NOT NULL DEFAULT 0,
    downvotes_count INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    is_edited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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

CREATE OR REPLACE FUNCTION public.handle_comment_count_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.posts
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.post_id;
        RETURN OLD;
    ELSE
        UPDATE public.posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_count_change ON public.comments;
CREATE TRIGGER on_comment_count_change
    AFTER INSERT OR DELETE ON public.comments
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

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Avatars are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users and admins can view ID documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'id-documents'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        )
    );

CREATE POLICY "Authenticated users can upload own ID document"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'id-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own ID document"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'id-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Post media is publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated users can upload own post media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'post-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own post media"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'post-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own post media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'post-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
