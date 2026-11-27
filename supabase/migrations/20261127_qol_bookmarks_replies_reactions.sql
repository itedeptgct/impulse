-- Mobile QoL Migration: Post Bookmarks, Message Quoted Replies, and Quick Reactions

-- 1. Post Bookmarks
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
	user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_created
	ON public.post_bookmarks (user_id, created_at DESC);

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'post_bookmarks'
			AND policyname = 'Users can view own bookmarks'
	) THEN
		CREATE POLICY "Users can view own bookmarks"
			ON public.post_bookmarks
			FOR SELECT
			USING (auth.uid() = user_id);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'post_bookmarks'
			AND policyname = 'Users can insert own bookmarks'
	) THEN
		CREATE POLICY "Users can insert own bookmarks"
			ON public.post_bookmarks
			FOR INSERT
			WITH CHECK (auth.uid() = user_id);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'public'
			AND tablename = 'post_bookmarks'
			AND policyname = 'Users can delete own bookmarks'
	) THEN
		CREATE POLICY "Users can delete own bookmarks"
			ON public.post_bookmarks
			FOR DELETE
			USING (auth.uid() = user_id);
	END IF;
END $$;

-- 2. Message Quoted Replies & Emoji Reactions
ALTER TABLE public.messages
	ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

ALTER TABLE public.messages
	ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id
	ON public.messages (reply_to_id)
	WHERE reply_to_id IS NOT NULL;
