-- Migration: 20261114_general_changes_and_bugfixes.sql
-- 1. Username length limit (max 20 characters)
-- 2. Karma tracking on profiles with atomic post_votes trigger
-- 3. Group conversation avatar URL
-- 4. Message attachments (JSONB)
-- 5. RPC to delete empty group conversations (creator-only)

-- 1. Username length constraint (max 20 chars)
-- Safely truncate any existing username exceeding 20 characters
UPDATE public.profiles
SET username = left(username, 20)
WHERE char_length(username) > 20;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_username_length_chk;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_length_chk CHECK (char_length(username) <= 20);

-- 2. Karma tracking on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS karma INTEGER NOT NULL DEFAULT 0;

-- Backfill karma from existing non-author post_votes
UPDATE public.profiles
SET karma = COALESCE(
    (
        SELECT SUM(pv.vote)
        FROM public.post_votes pv
        JOIN public.posts p ON p.id = pv.post_id
        WHERE p.author_id = profiles.id
          AND pv.user_id <> p.author_id
    ),
    0
);

-- Trigger function to keep author karma in sync with post votes atomically
CREATE OR REPLACE FUNCTION public.sync_author_karma_from_post_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_author_id UUID;
    v_old_author_id UUID;
    v_delta INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT author_id INTO v_author_id
        FROM public.posts
        WHERE id = NEW.post_id;

        IF v_author_id IS NOT NULL AND NEW.user_id <> v_author_id THEN
            UPDATE public.profiles
            SET karma = COALESCE(karma, 0) + NEW.vote
            WHERE id = v_author_id;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        SELECT author_id INTO v_author_id
        FROM public.posts
        WHERE id = OLD.post_id;

        IF v_author_id IS NOT NULL AND OLD.user_id <> v_author_id THEN
            UPDATE public.profiles
            SET karma = COALESCE(karma, 0) - OLD.vote
            WHERE id = v_author_id;
        END IF;
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.post_id = OLD.post_id THEN
            SELECT author_id INTO v_author_id
            FROM public.posts
            WHERE id = NEW.post_id;

            IF v_author_id IS NOT NULL AND NEW.user_id <> v_author_id THEN
                v_delta := NEW.vote - OLD.vote;
                IF v_delta <> 0 THEN
                    UPDATE public.profiles
                    SET karma = COALESCE(karma, 0) + v_delta
                    WHERE id = v_author_id;
                END IF;
            END IF;
        ELSE
            -- Revert old vote
            SELECT author_id INTO v_old_author_id
            FROM public.posts
            WHERE id = OLD.post_id;

            IF v_old_author_id IS NOT NULL AND OLD.user_id <> v_old_author_id THEN
                UPDATE public.profiles
                SET karma = COALESCE(karma, 0) - OLD.vote
                WHERE id = v_old_author_id;
            END IF;

            -- Apply new vote
            SELECT author_id INTO v_author_id
            FROM public.posts
            WHERE id = NEW.post_id;

            IF v_author_id IS NOT NULL AND NEW.user_id <> v_author_id THEN
                UPDATE public.profiles
                SET karma = COALESCE(karma, 0) + NEW.vote
                WHERE id = v_author_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_author_karma ON public.post_votes;
CREATE TRIGGER trg_sync_author_karma
    AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_author_karma_from_post_vote();

-- 3. Conversation avatar URL
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. Message attachments (JSONB array)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Allow messages with attachments in payload constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS message_has_payload;
ALTER TABLE public.messages ADD CONSTRAINT message_has_payload CHECK (
    (unsent_at IS NOT NULL) OR
    (content IS NOT NULL AND length(trim(content)) > 0) OR
    (media_urls IS NOT NULL AND array_length(media_urls, 1) > 0) OR
    (attachments IS NOT NULL AND jsonb_typeof(attachments) = 'array' AND jsonb_array_length(attachments) > 0) OR
    (shared_post_id IS NOT NULL)
);

-- 5. RPC to delete empty group conversations
CREATE OR REPLACE FUNCTION public.delete_empty_group_conversation(target_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_uid UUID;
    v_created_by UUID;
    v_type TEXT;
    v_participant_count INT;
    v_other_participant_count INT;
BEGIN
    v_current_uid := auth.uid();
    IF v_current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT created_by, type
    INTO v_created_by, v_type
    FROM public.conversations
    WHERE id = target_conversation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversation not found';
    END IF;

    IF v_type <> 'group' THEN
        RAISE EXCEPTION 'Only group conversations can be deleted';
    END IF;

    IF v_created_by IS DISTINCT FROM v_current_uid THEN
        RAISE EXCEPTION 'Only the group creator can delete this conversation';
    END IF;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE user_id <> v_current_uid)
    INTO
        v_participant_count,
        v_other_participant_count
    FROM public.conversation_participants
    WHERE conversation_id = target_conversation_id;

    IF v_participant_count > 1 OR v_other_participant_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete group with other participants present';
    END IF;

    DELETE FROM public.conversations
    WHERE id = target_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_empty_group_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_empty_group_conversation(UUID) TO authenticated;

-- Realtime publication update for conversations (if not already included)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
