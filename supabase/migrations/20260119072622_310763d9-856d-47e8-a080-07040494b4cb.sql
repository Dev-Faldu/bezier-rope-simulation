-- Create redo_stack table for global redo functionality
CREATE TABLE IF NOT EXISTS public.redo_stack (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  operation_data JSONB NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.redo_stack ENABLE ROW LEVEL SECURITY;

-- RLS policies for redo_stack
CREATE POLICY "Anyone can read redo stack"
ON public.redo_stack
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert to redo stack"
ON public.redo_stack
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete from redo stack"
ON public.redo_stack
FOR DELETE
USING (true);

-- Index for efficient queries
CREATE INDEX idx_redo_stack_room_id ON public.redo_stack(room_id);
CREATE INDEX idx_redo_stack_deleted_at ON public.redo_stack(deleted_at DESC);

-- Trigger to auto-cleanup old redo items (keep last 50 per room)
CREATE OR REPLACE FUNCTION public.cleanup_old_redo_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old redo items beyond the limit of 50 per room
  DELETE FROM public.redo_stack
  WHERE id IN (
    SELECT id FROM public.redo_stack
    WHERE room_id = NEW.room_id
    ORDER BY deleted_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER cleanup_redo_stack_trigger
AFTER INSERT ON public.redo_stack
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_old_redo_items();