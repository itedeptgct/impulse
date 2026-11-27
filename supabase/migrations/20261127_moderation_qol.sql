-- Migration: 20261127_moderation_qol.sql
-- Adds moderation notes, resolution actions, report assignments, user posting restrictions,
-- moderation action audit log, moderation appeals, moderation notifications RPC, and guards.

-- 1. Extend public.reports with internal notes, resolution action, and assignment fields
ALTER TABLE public.reports
    ADD COLUMN IF NOT EXISTS moderator_note TEXT,
    ADD COLUMN IF NOT EXISTS resolution_action TEXT,
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

ALTER TABLE public.reports
    DROP CONSTRAINT IF EXISTS reports_resolution_action_check;

ALTER TABLE public.reports
    ADD CONSTRAINT reports_resolution_action_check
    CHECK (resolution_action IN ('dismiss', 'warn', 'restrict_24h', 'restrict_7d', 'remove_content'));

CREATE INDEX IF NOT EXISTS idx_reports_assigned_status
    ON public.reports (assigned_to, status);

DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
CREATE POLICY "Users can insert own reports"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = reporter_id
        AND status = 'open'
        AND moderator_note IS NULL
        AND resolution_action IS NULL
        AND assigned_to IS NULL
        AND assigned_at IS NULL
        AND resolved_by IS NULL
        AND resolved_at IS NULL
    );

-- 2. Extend public.profiles with temporary restriction timestamp & moderation field guard
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS restricted_until TIMESTAMPTZ;

DROP POLICY IF EXISTS "Mods can update user restrictions" ON public.profiles;
CREATE POLICY "Mods can update user restrictions"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                  p.role = 'mod'
                  OR (
                      p.role = 'house_mod'
                      AND p.guild IS NOT NULL
                      AND p.guild = public.profiles.guild
                  )
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                  p.role = 'mod'
                  OR (
                      p.role = 'house_mod'
                      AND p.guild IS NOT NULL
                      AND p.guild = public.profiles.guild
                  )
              )
        )
    );

CREATE OR REPLACE FUNCTION public.guard_profile_moderation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_guild TEXT;
BEGIN
    v_caller_id := auth.uid();

    -- Allow direct database/service-role updates and nested trigger updates (e.g. karma sync)
    IF v_caller_id IS NULL OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    SELECT role, guild
    INTO v_caller_role, v_caller_guild
    FROM public.profiles
    WHERE id = v_caller_id;

    IF NEW.restricted_until IS DISTINCT FROM OLD.restricted_until THEN
        IF v_caller_role = 'admin' THEN
            NULL;
        ELSIF v_caller_role = 'mod' THEN
            IF OLD.id = v_caller_id OR OLD.role = 'admin' THEN
                RAISE EXCEPTION 'Moderators cannot modify their own restriction or restrict admins'
                    USING ERRCODE = '42501';
            END IF;
        ELSIF v_caller_role = 'house_mod' THEN
            IF OLD.id = v_caller_id
               OR v_caller_guild IS NULL
               OR v_caller_guild IS DISTINCT FROM OLD.guild
               OR OLD.role IN ('admin', 'mod') THEN
                RAISE EXCEPTION 'House moderators can only restrict non-staff members in their own guild'
                    USING ERRCODE = '42501';
            END IF;
        ELSE
            RAISE EXCEPTION 'Only authorized moderation staff can update restriction status'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Only admins can update user roles'
                USING ERRCODE = '42501';
        END IF;

        IF v_caller_id <> OLD.id AND (
            NEW.username IS DISTINCT FROM OLD.username OR
            NEW.display_name IS DISTINCT FROM OLD.display_name OR
            NEW.guild IS DISTINCT FROM OLD.guild OR
            NEW.course IS DISTINCT FROM OLD.course OR
            NEW.year_level IS DISTINCT FROM OLD.year_level OR
            NEW.bio IS DISTINCT FROM OLD.bio OR
            NEW.avatar_url IS DISTINCT FROM OLD.avatar_url OR
            NEW.karma IS DISTINCT FROM OLD.karma OR
            NEW.show_active_status IS DISTINCT FROM OLD.show_active_status OR
            NEW.last_seen_at IS DISTINCT FROM OLD.last_seen_at OR
            NEW.expo_push_token IS DISTINCT FROM OLD.expo_push_token
        ) THEN
            RAISE EXCEPTION 'Moderators can only update restriction status on other users'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_moderation_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_moderation_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_profile_moderation_fields();

-- 3. Moderation actions audit table & staff-only RLS
CREATE TABLE IF NOT EXISTS public.moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
    target_id UUID NOT NULL,
    guild TEXT CHECK (guild IN ('octagram', 'chameleon', 'blue_jays')),
    action TEXT NOT NULL CHECK (action IN ('dismiss', 'warn', 'restrict_24h', 'restrict_7d', 'remove_content')),
    moderator_note TEXT,
    public_explanation TEXT,
    report_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_user
    ON public.moderation_actions (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_guild_created
    ON public.moderation_actions (guild, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_actor
    ON public.moderation_actions (actor_id, created_at DESC);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and mods can view all moderation actions" ON public.moderation_actions;
CREATE POLICY "Admins and mods can view all moderation actions"
    ON public.moderation_actions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

DROP POLICY IF EXISTS "House mods can view guild moderation actions" ON public.moderation_actions;
CREATE POLICY "House mods can view guild moderation actions"
    ON public.moderation_actions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'house_mod'
              AND guild IS NOT NULL
              AND guild = public.moderation_actions.guild
        )
    );

DROP POLICY IF EXISTS "Admins and mods can insert moderation actions" ON public.moderation_actions;
CREATE POLICY "Admins and mods can insert moderation actions"
    ON public.moderation_actions FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = actor_id
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

DROP POLICY IF EXISTS "House mods can insert guild moderation actions" ON public.moderation_actions;
CREATE POLICY "House mods can insert guild moderation actions"
    ON public.moderation_actions FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = actor_id
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'house_mod'
              AND guild IS NOT NULL
              AND guild = public.moderation_actions.guild
        )
    );

-- 4. Moderation appeals table & RLS
CREATE TABLE IF NOT EXISTS public.moderation_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES public.moderation_actions(id) ON DELETE CASCADE,
    appellant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE UNIQUE INDEX IF NOT EXISTS moderation_appeals_unique_action_appellant
    ON public.moderation_appeals (action_id, appellant_id);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_status_created
    ON public.moderation_appeals (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_appellant_created
    ON public.moderation_appeals (appellant_id, created_at DESC);

ALTER TABLE public.moderation_appeals ENABLE ROW LEVEL SECURITY;

-- Helper so appeal INSERT RLS can verify action ownership without exposing moderation_actions rows
DROP POLICY IF EXISTS "Users can insert own moderation appeals" ON public.moderation_appeals;
DROP FUNCTION IF EXISTS public.is_moderation_action_target(UUID, UUID);

CREATE OR REPLACE FUNCTION public.is_moderation_action_target(
    p_action_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.moderation_actions
        WHERE id = p_action_id
          AND target_user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_moderation_action_target(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_moderation_action_target(UUID) TO authenticated;

CREATE POLICY "Users can insert own moderation appeals"
    ON public.moderation_appeals FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = appellant_id
        AND status = 'pending'
        AND reviewed_by IS NULL
        AND review_note IS NULL
        AND reviewed_at IS NULL
        AND public.is_moderation_action_target(action_id)
    );

DROP POLICY IF EXISTS "Users can view own moderation appeals" ON public.moderation_appeals;
CREATE POLICY "Users can view own moderation appeals"
    ON public.moderation_appeals FOR SELECT
    TO authenticated
    USING (auth.uid() = appellant_id);

DROP POLICY IF EXISTS "Admins and mods can view all moderation appeals" ON public.moderation_appeals;
CREATE POLICY "Admins and mods can view all moderation appeals"
    ON public.moderation_appeals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

DROP POLICY IF EXISTS "House mods can view guild moderation appeals" ON public.moderation_appeals;
CREATE POLICY "House mods can view guild moderation appeals"
    ON public.moderation_appeals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.moderation_actions ma ON ma.id = public.moderation_appeals.action_id
            WHERE p.id = auth.uid()
              AND p.role = 'house_mod'
              AND p.guild IS NOT NULL
              AND ma.guild = p.guild
        )
    );

DROP POLICY IF EXISTS "Admins and mods can update all moderation appeals" ON public.moderation_appeals;
CREATE POLICY "Admins and mods can update all moderation appeals"
    ON public.moderation_appeals FOR UPDATE
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

DROP POLICY IF EXISTS "House mods can update guild moderation appeals" ON public.moderation_appeals;
CREATE POLICY "House mods can update guild moderation appeals"
    ON public.moderation_appeals FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.moderation_actions ma ON ma.id = public.moderation_appeals.action_id
            WHERE p.id = auth.uid()
              AND p.role = 'house_mod'
              AND p.guild IS NOT NULL
              AND ma.guild = p.guild
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.moderation_actions ma ON ma.id = public.moderation_appeals.action_id
            WHERE p.id = auth.uid()
              AND p.role = 'house_mod'
              AND p.guild IS NOT NULL
              AND ma.guild = p.guild
        )
    );

-- 5. Extend public.notifications.type CHECK constraint to include 'moderation'
ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('comment', 'reply', 'mention', 'message', 'moderation'));

-- 6. SECURITY DEFINER RPC for sending moderation outcome notifications without leaking moderator_note
CREATE OR REPLACE FUNCTION public.notify_moderation_outcome(
    p_recipient_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_post_id UUID DEFAULT NULL,
    p_comment_id UUID DEFAULT NULL,
    p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_clean_data JSONB;
    v_notification_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated'
            USING ERRCODE = '42501';
    END IF;

    SELECT role
    INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'mod', 'house_mod') THEN
        RAISE EXCEPTION 'Only moderation staff can send moderation notifications'
            USING ERRCODE = '42501';
    END IF;

    IF p_recipient_id IS NULL THEN
        RAISE EXCEPTION 'Recipient ID is required';
    END IF;

    v_clean_data := CASE
        WHEN jsonb_typeof(COALESCE(p_data, '{}'::jsonb)) = 'object'
            THEN COALESCE(p_data, '{}'::jsonb) - 'moderator_note'
        ELSE '{}'::jsonb
    END;

    INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        title,
        body,
        post_id,
        comment_id,
        data
    )
    VALUES (
        p_recipient_id,
        NULL,
        'moderation',
        p_title,
        p_body,
        p_post_id,
        p_comment_id,
        v_clean_data
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_moderation_outcome(UUID, TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_moderation_outcome(UUID, TEXT, TEXT, UUID, UUID, JSONB) TO authenticated;

-- 7. Reject post and comment inserts when author's profiles.restricted_until > NOW()
CREATE OR REPLACE FUNCTION public.enforce_not_restricted_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restricted_until TIMESTAMPTZ;
BEGIN
    SELECT restricted_until
    INTO v_restricted_until
    FROM public.profiles
    WHERE id = NEW.author_id;

    IF v_restricted_until IS NOT NULL AND v_restricted_until > NOW() THEN
        RAISE EXCEPTION 'Your account is temporarily restricted until %', v_restricted_until
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_reject_restricted_author ON public.posts;
CREATE TRIGGER trg_posts_reject_restricted_author
    BEFORE INSERT ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_not_restricted_before_insert();

DROP TRIGGER IF EXISTS trg_comments_reject_restricted_author ON public.comments;
CREATE TRIGGER trg_comments_reject_restricted_author
    BEFORE INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_not_restricted_before_insert();

-- 8. Moderation RLS policies for posts and comments (mod & house_mod visibility and purge)
DROP POLICY IF EXISTS "Admins and mods can view all posts" ON public.posts;
CREATE POLICY "Admins and mods can view all posts"
    ON public.posts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'mod')
        )
    );

DROP POLICY IF EXISTS "Mods can delete any post" ON public.posts;
CREATE POLICY "Mods can delete any post"
    ON public.posts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'mod'
        )
    );

DROP POLICY IF EXISTS "House mods can delete guild posts" ON public.posts;
CREATE POLICY "House mods can delete guild posts"
    ON public.posts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'house_mod'
              AND guild IS NOT NULL
              AND guild = public.posts.guild
        )
    );

DROP POLICY IF EXISTS "House mods can update guild comments" ON public.comments;
CREATE POLICY "House mods can update guild comments"
    ON public.comments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.posts po ON po.id = public.comments.post_id
            WHERE p.id = auth.uid()
              AND p.role = 'house_mod'
              AND p.guild IS NOT NULL
              AND po.guild = p.guild
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.posts po ON po.id = public.comments.post_id
            WHERE p.id = auth.uid()
              AND p.role = 'house_mod'
              AND p.guild IS NOT NULL
              AND po.guild = p.guild
        )
    );

DROP POLICY IF EXISTS "House mods can delete guild comments" ON public.comments;
CREATE POLICY "House mods can delete guild comments"
    ON public.comments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.posts po ON po.id = public.comments.post_id
            WHERE p.id = auth.uid()
              AND p.role = 'house_mod'
              AND p.guild IS NOT NULL
              AND po.guild = p.guild
        )
    );
