-- Migration: 20261114_notifications_system.sql
-- Adds in-app notifications, per-user notification preferences, per-device push tokens,
-- RLS policies, Realtime publication, and server-side notification triggers.

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('comment', 'reply', 'mention', 'message')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON public.notifications (recipient_id)
    WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (auth.uid() = recipient_id);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    comments_enabled BOOLEAN NOT NULL DEFAULT true,
    replies_enabled BOOLEAN NOT NULL DEFAULT true,
    mentions_enabled BOOLEAN NOT NULL DEFAULT true,
    messages_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences"
    ON public.notification_preferences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
    ON public.notification_preferences FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
    ON public.notification_preferences FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Per-device push tokens table
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_name TEXT,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, expo_push_token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can view own push tokens"
    ON public.user_push_tokens FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can insert own push tokens"
    ON public.user_push_tokens FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can update own push tokens"
    ON public.user_push_tokens FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can delete own push tokens"
    ON public.user_push_tokens FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Backfill existing profiles.expo_push_token values into user_push_tokens
INSERT INTO public.user_push_tokens (user_id, expo_push_token, platform)
SELECT id, trim(expo_push_token), 'android'
FROM public.profiles
WHERE expo_push_token IS NOT NULL
  AND length(trim(expo_push_token)) > 0
ON CONFLICT (user_id, expo_push_token) DO NOTHING;

-- 4. Server-side notification triggers (SECURITY DEFINER, SET search_path = public)

CREATE OR REPLACE FUNCTION public.handle_comment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_name TEXT;
    v_actor_username TEXT;
    v_post_author_id UUID;
    v_post_title TEXT;
    v_post_visibility TEXT;
    v_post_guild TEXT;
    v_parent_author_id UUID;
    v_preview TEXT;
    v_payload JSONB;
BEGIN
    SELECT
        COALESCE(NULLIF(trim(display_name), ''), username, 'Someone'),
        username
    INTO v_actor_name, v_actor_username
    FROM public.profiles
    WHERE id = NEW.author_id;

    v_actor_name := COALESCE(v_actor_name, 'Someone');

    SELECT author_id, title, visibility, guild
    INTO v_post_author_id, v_post_title, v_post_visibility, v_post_guild
    FROM public.posts
    WHERE id = NEW.post_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_id IS NOT NULL THEN
        SELECT author_id
        INTO v_parent_author_id
        FROM public.comments
        WHERE id = NEW.parent_id;
    END IF;

    v_preview := left(trim(COALESCE(NEW.content, '')), 140);
    v_payload := jsonb_build_object(
        'actor_username', v_actor_username,
        'post_title', v_post_title
    );

    -- 1) Reply notification to parent comment author
    IF NEW.parent_id IS NOT NULL
       AND v_parent_author_id IS NOT NULL
       AND v_parent_author_id <> NEW.author_id
       AND COALESCE(
           (SELECT np.replies_enabled FROM public.notification_preferences np WHERE np.user_id = v_parent_author_id),
           true
       ) THEN
        INSERT INTO public.notifications (
            recipient_id, actor_id, type, title, body, post_id, comment_id, data
        )
        VALUES (
            v_parent_author_id,
            NEW.author_id,
            'reply',
            v_actor_name || ' replied to your comment',
            v_preview,
            NEW.post_id,
            NEW.id,
            v_payload
        );
    END IF;

    -- 2) Comment notification to post author (skip if same as actor or already notified as parent_author)
    IF v_post_author_id IS NOT NULL
       AND v_post_author_id <> NEW.author_id
       AND (v_parent_author_id IS NULL OR v_post_author_id <> v_parent_author_id)
       AND COALESCE(
           (SELECT np.comments_enabled FROM public.notification_preferences np WHERE np.user_id = v_post_author_id),
           true
       ) THEN
        INSERT INTO public.notifications (
            recipient_id, actor_id, type, title, body, post_id, comment_id, data
        )
        VALUES (
            v_post_author_id,
            NEW.author_id,
            'comment',
            v_actor_name || ' commented on your post',
            v_preview,
            NEW.post_id,
            NEW.id,
            v_payload
        );
    END IF;

    -- 3) @mention notifications (dedup against actor, parent_author, and post_author; enforce house visibility)
    INSERT INTO public.notifications (
        recipient_id, actor_id, type, title, body, post_id, comment_id, data
    )
    SELECT
        p.id,
        NEW.author_id,
        'mention',
        v_actor_name || ' mentioned you in a comment',
        v_preview,
        NEW.post_id,
        NEW.id,
        v_payload
    FROM (
        SELECT DISTINCT lower(m[1]) AS uname
        FROM regexp_matches(COALESCE(NEW.content, ''), '@([A-Za-z0-9_]{1,20})', 'g') AS m
    ) AS mentioned
    JOIN public.profiles p ON lower(p.username) = mentioned.uname
    LEFT JOIN public.notification_preferences np ON np.user_id = p.id
    WHERE p.id <> NEW.author_id
      AND (v_parent_author_id IS NULL OR p.id <> v_parent_author_id)
      AND (v_post_author_id IS NULL OR p.id <> v_post_author_id)
      AND COALESCE(np.mentions_enabled, true) = true
      AND (
          v_post_visibility <> 'house'
          OR v_post_guild IS NULL
          OR p.guild = v_post_guild
          OR p.role = 'admin'
      );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_comment_insert ON public.comments;
CREATE TRIGGER notify_on_comment_insert
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_comment_notifications();

CREATE OR REPLACE FUNCTION public.handle_post_mention_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_name TEXT;
    v_actor_username TEXT;
    v_preview TEXT;
    v_payload JSONB;
BEGIN
    SELECT
        COALESCE(NULLIF(trim(display_name), ''), username, 'Someone'),
        username
    INTO v_actor_name, v_actor_username
    FROM public.profiles
    WHERE id = NEW.author_id;

    v_actor_name := COALESCE(v_actor_name, 'Someone');
    v_preview := left(trim(COALESCE(NULLIF(trim(NEW.title), ''), NEW.content, '')), 140);
    v_payload := jsonb_build_object(
        'actor_username', v_actor_username,
        'post_title', NEW.title
    );

    INSERT INTO public.notifications (
        recipient_id, actor_id, type, title, body, post_id, data
    )
    SELECT
        p.id,
        NEW.author_id,
        'mention',
        v_actor_name || ' mentioned you in a post',
        v_preview,
        NEW.id,
        v_payload
    FROM (
        SELECT DISTINCT lower(m[1]) AS uname
        FROM regexp_matches(
            COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''),
            '@([A-Za-z0-9_]{1,20})',
            'g'
        ) AS m
    ) AS mentioned
    JOIN public.profiles p ON lower(p.username) = mentioned.uname
    LEFT JOIN public.notification_preferences np ON np.user_id = p.id
    WHERE p.id <> NEW.author_id
      AND COALESCE(np.mentions_enabled, true) = true
      AND (
          NEW.visibility <> 'house'
          OR NEW.guild IS NULL
          OR p.guild = NEW.guild
          OR p.role = 'admin'
      );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_post_mention_insert ON public.posts;
CREATE TRIGGER notify_on_post_mention_insert
    AFTER INSERT ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_post_mention_notifications();

CREATE OR REPLACE FUNCTION public.handle_message_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_name TEXT;
    v_actor_username TEXT;
    v_conv_type TEXT;
    v_conv_title TEXT;
    v_notif_title TEXT;
    v_body TEXT;
    v_payload JSONB;
BEGIN
    IF NEW.message_type = 'system' THEN
        RETURN NEW;
    END IF;

    SELECT
        COALESCE(NULLIF(trim(display_name), ''), username, 'Someone'),
        username
    INTO v_actor_name, v_actor_username
    FROM public.profiles
    WHERE id = NEW.sender_id;

    v_actor_name := COALESCE(v_actor_name, 'Someone');

    SELECT type, title
    INTO v_conv_type, v_conv_title
    FROM public.conversations
    WHERE id = NEW.conversation_id;

    IF v_conv_type = 'group' AND NULLIF(trim(COALESCE(v_conv_title, '')), '') IS NOT NULL THEN
        v_notif_title := v_actor_name || ' in ' || trim(v_conv_title);
    ELSE
        v_notif_title := v_actor_name;
    END IF;

    IF NEW.content IS NOT NULL AND length(trim(NEW.content)) > 0 THEN
        v_body := left(trim(NEW.content), 140);
    ELSIF NEW.shared_post_id IS NOT NULL THEN
        v_body := 'Shared a post';
    ELSIF (NEW.media_urls IS NOT NULL AND array_length(NEW.media_urls, 1) > 0)
       OR (NEW.attachments IS NOT NULL AND jsonb_typeof(NEW.attachments) = 'array' AND jsonb_array_length(NEW.attachments) > 0) THEN
        v_body := 'Sent an attachment';
    ELSE
        v_body := 'Sent a message';
    END IF;

    v_payload := jsonb_build_object(
        'actor_username', v_actor_username,
        'message_id', NEW.id,
        'conversation_type', COALESCE(v_conv_type, 'direct')
    );

    INSERT INTO public.notifications (
        recipient_id, actor_id, type, title, body, conversation_id, data
    )
    SELECT
        cp.user_id,
        NEW.sender_id,
        'message',
        v_notif_title,
        v_body,
        NEW.conversation_id,
        v_payload
    FROM public.conversation_participants cp
    LEFT JOIN public.notification_preferences np ON np.user_id = cp.user_id
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id <> NEW.sender_id
      AND COALESCE(np.messages_enabled, true) = true;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_message_insert ON public.messages;
CREATE TRIGGER notify_on_message_insert
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_message_notifications();

CREATE OR REPLACE FUNCTION public.handle_conversation_read_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.last_read_at IS DISTINCT FROM OLD.last_read_at THEN
        UPDATE public.notifications
        SET read_at = NOW()
        WHERE recipient_id = NEW.user_id
          AND conversation_id = NEW.conversation_id
          AND type = 'message'
          AND read_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mark_message_notifications_read_on_last_read ON public.conversation_participants;
CREATE TRIGGER mark_message_notifications_read_on_last_read
    AFTER UPDATE OF last_read_at ON public.conversation_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_conversation_read_notifications();
