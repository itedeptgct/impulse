-- Migration: 20261114_messaging_enhancements.sql
-- Adds conversation pinning, nicknames, deletion, message editing, pinning, and unsending.

-- 1. Extend conversation_participants
ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 2. Extend messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS unsent_at TIMESTAMPTZ;

-- 3. Update message_has_payload constraint to allow unsent messages
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS message_has_payload;
ALTER TABLE public.messages ADD CONSTRAINT message_has_payload CHECK (
    (unsent_at IS NOT NULL) OR
    (content IS NOT NULL AND length(trim(content)) > 0) OR
    (media_urls IS NOT NULL AND array_length(media_urls, 1) > 0) OR
    (shared_post_id IS NOT NULL)
);

-- 4. Update RLS policies for conversation_participants & messages
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.conversation_participants;
DROP POLICY IF EXISTS "Members can update participant records in their conversations" ON public.conversation_participants;
CREATE POLICY "Members can update participant records in their conversations"
    ON public.conversation_participants FOR UPDATE
    USING (public.is_conversation_member(conversation_id))
    WITH CHECK (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can leave conversations or admins can remove members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Members can leave or remove members in their conversations" ON public.conversation_participants;
CREATE POLICY "Members can leave or remove members in their conversations"
    ON public.conversation_participants FOR DELETE
    USING (
        auth.uid() = user_id OR
        public.is_conversation_member(conversation_id)
    );

DROP POLICY IF EXISTS "Members can update messages in their conversations" ON public.messages;
CREATE POLICY "Members can update messages in their conversations"
    ON public.messages FOR UPDATE
    USING (public.is_conversation_member(conversation_id))
    WITH CHECK (public.is_conversation_member(conversation_id));

-- 5. Delete / leave conversation RPC
CREATE OR REPLACE FUNCTION public.delete_or_leave_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid UUID;
    remaining_count INT;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = current_uid;

    SELECT COUNT(*) INTO remaining_count
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id;

    IF remaining_count = 0 THEN
        DELETE FROM public.conversations
        WHERE id = p_conversation_id;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_or_leave_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_or_leave_conversation(UUID) TO authenticated;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
