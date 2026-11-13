-- Migration: 20261113_comment_edit_delete.sql
-- Adds comment editing and soft-deletion preserving reply hierarchy

-- 1. Add columns to comments table
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 2. RLS Update policies for comments
DROP POLICY IF EXISTS "Users can update own non-deleted comments" ON public.comments;
CREATE POLICY "Users can update own non-deleted comments"
    ON public.comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id AND is_deleted = false)
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Admins and mods can update comments" ON public.comments;
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

-- 3. RLS Delete policy for comments
DROP POLICY IF EXISTS "Users and admins can delete comments" ON public.comments;
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

-- 4. Update comment count change trigger function and trigger
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
