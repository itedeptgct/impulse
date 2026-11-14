-- Migration: 20261114_messaging_and_presence.sql
-- Direct & Group Messaging, Realtime Inbox Notifications, and Global Presence

-- 1. Profiles presence & push token extensions
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_active_status BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    title TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`
-- 3. Conversation Participants Table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    media_urls TEXT[] DEFAULT '{}',
    shared_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT message_has_payload CHECK (
        (content IS NOT NULL AND length(trim(content)) > 0) OR
        (media_urls IS NOT NULL AND array_length(media_urls, 1) > 0) OR
        (shared_post_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants (user_id, last_read_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_shared_post ON public.messages (shared_post_id) WHERE shared_post_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Conversations
CREATE POLICY "Users can view conversations they participate in"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
              AND conversation_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update conversations they participate in"
    ON public.conversations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
              AND conversation_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Helper Functions for RLS (SECURITY DEFINER to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_member(
    p_conversation_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_participants
        WHERE conversation_id = p_conversation_id
          AND user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_admin(
    p_conversation_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_participants
        WHERE conversation_id = p_conversation_id
          AND user_id = p_user_id
          AND role = 'admin'
    );
$$;

-- 7. RLS Policies: Conversation Participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations"
    ON public.conversation_participants FOR SELECT
    USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can update their own participant record" ON public.conversation_participants;
CREATE POLICY "Users can update their own participant record"
    ON public.conversation_participants FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert participants into conversations they belong to or create" ON public.conversation_participants;
CREATE POLICY "Users can insert participants into conversations they belong to or create"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            auth.uid() = user_id OR
            public.is_conversation_member(conversation_id) OR
            EXISTS (
                SELECT 1 FROM public.conversations AS c
                WHERE c.id = conversation_participants.conversation_id
                  AND c.created_by = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can leave conversations or admins can remove members" ON public.conversation_participants;
CREATE POLICY "Users can leave conversations or admins can remove members"
    ON public.conversation_participants FOR DELETE
    USING (
        auth.uid() = user_id OR
        public.is_conversation_admin(conversation_id)
    );

-- 7. RLS Policies: Messages
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = messages.conversation_id
              AND conversation_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages into their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = messages.conversation_id
              AND conversation_participants.user_id = auth.uid()
        )
    );

-- 8. Stored Procedures: get_or_create_direct_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid UUID;
    existing_conv_id UUID;
    new_conv_id UUID;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF current_uid = target_user_id THEN
        RAISE EXCEPTION 'Cannot start conversation with yourself';
    END IF;

    -- Look for existing 1-on-1 direct conversation with both participants
    SELECT cp1.conversation_id INTO existing_conv_id
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN public.conversations c ON c.id = cp1.conversation_id
    WHERE c.type = 'direct'
      AND cp1.user_id = current_uid
      AND cp2.user_id = target_user_id
    LIMIT 1;

    IF existing_conv_id IS NOT NULL THEN
        RETURN existing_conv_id;
    END IF;

    -- Create new conversation
    INSERT INTO public.conversations (type, updated_at)
    VALUES ('direct', NOW())
    RETURNING id INTO new_conv_id;

    -- Insert both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id, role, last_read_at)
    VALUES 
        (new_conv_id, current_uid, 'member', NOW()),
        (new_conv_id, target_user_id, 'member', NOW());

    RETURN new_conv_id;
END;
$$;

-- 9. Stored Procedures: create_group_conversation
CREATE OR REPLACE FUNCTION public.create_group_conversation(
    p_title TEXT,
    p_participant_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid UUID;
    new_conv_id UUID;
    clean_title TEXT;
    pid UUID;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    clean_title := trim(COALESCE(p_title, ''));
    IF length(clean_title) = 0 THEN
        clean_title := 'Group Chat';
    END IF;

    IF p_participant_ids IS NULL OR array_length(p_participant_ids, 1) < 2 THEN
        RAISE EXCEPTION 'Group chat requires at least 2 other members';
    END IF;

    -- Create group conversation
    INSERT INTO public.conversations (type, title, created_by, updated_at)
    VALUES ('group', clean_title, current_uid, NOW())
    RETURNING id INTO new_conv_id;

    -- Add creator as admin
    INSERT INTO public.conversation_participants (conversation_id, user_id, role, last_read_at)
    VALUES (new_conv_id, current_uid, 'admin', NOW());

    -- Add each participant
    FOREACH pid IN ARRAY p_participant_ids LOOP
        IF pid <> current_uid THEN
            INSERT INTO public.conversation_participants (conversation_id, user_id, role, last_read_at)
            VALUES (new_conv_id, pid, 'member', NOW())
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
        END IF;
    END LOOP;

    RETURN new_conv_id;
END;
$$;

-- 10. Stored Procedures: add_group_participants
CREATE OR REPLACE FUNCTION public.add_group_participants(
    p_conversation_id UUID,
    p_user_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid UUID;
    is_member BOOLEAN;
    pid UUID;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = p_conversation_id AND user_id = current_uid
    ) INTO is_member;

    IF NOT is_member THEN
        RAISE EXCEPTION 'Only members can add participants to a group';
    END IF;

    FOREACH pid IN ARRAY p_user_ids LOOP
        INSERT INTO public.conversation_participants (conversation_id, user_id, role, last_read_at)
        VALUES (p_conversation_id, pid, 'member', NOW())
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END LOOP;

    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = p_conversation_id;
END;
$$;

-- 11. Stored Procedures: leave_group_conversation
CREATE OR REPLACE FUNCTION public.leave_group_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid UUID;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = current_uid;
END;
$$;

-- 12. Trigger: update conversation updated_at on new message
CREATE OR REPLACE FUNCTION public.handle_message_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_inserted ON public.messages;
CREATE TRIGGER trg_message_inserted
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_message_inserted();
