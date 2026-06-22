-- Create trigger function to prune old records (older than 10 days)
CREATE OR REPLACE FUNCTION public.prune_old_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete feedbacks (including notifications) older than 10 days
    DELETE FROM public.feedbacks 
    WHERE created_at < NOW() - INTERVAL '10 days';

    -- Delete notices older than 10 days
    DELETE FROM public.notices 
    WHERE created_at < NOW() - INTERVAL '10 days';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on public.feedbacks to clean up older entries after a new insert
DROP TRIGGER IF EXISTS trigger_prune_feedbacks ON public.feedbacks;
CREATE TRIGGER trigger_prune_feedbacks
    AFTER INSERT ON public.feedbacks
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.prune_old_records();

-- Create trigger on public.notices to clean up older entries after a new insert
DROP TRIGGER IF EXISTS trigger_prune_notices ON public.notices;
CREATE TRIGGER trigger_prune_notices
    AFTER INSERT ON public.notices
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.prune_old_records();

-- Perform immediate cleanup of existing stale records
DELETE FROM public.feedbacks WHERE created_at < NOW() - INTERVAL '10 days';
DELETE FROM public.notices WHERE created_at < NOW() - INTERVAL '10 days';
