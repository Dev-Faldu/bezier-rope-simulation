-- Create rooms table for canvas isolation
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Canvas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create operations table (append-only log for all drawing operations)
-- This is the core of the command-sourcing architecture
CREATE TABLE public.operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Anonymous user ID (not auth.users since this is public)
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  user_color TEXT NOT NULL DEFAULT '#3b82f6',
  sequence BIGSERIAL, -- Server-assigned sequence for ordering
  type TEXT NOT NULL CHECK (type IN ('stroke', 'clear')),
  data JSONB NOT NULL DEFAULT '{}', -- Tool, color, width, points etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient room queries (most common access pattern)
CREATE INDEX idx_operations_room_sequence ON public.operations(room_id, sequence);

-- Enable Row Level Security (but allow public read/write for collaborative canvas)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

-- Rooms are public (anyone can view and create)
CREATE POLICY "Rooms are publicly readable" 
ON public.rooms 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (true);

-- Operations are public (collaborative drawing)
CREATE POLICY "Operations are publicly readable" 
ON public.operations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can add operations" 
ON public.operations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete operations in a room" 
ON public.operations 
FOR DELETE 
USING (true);

-- Enable realtime for operations table (critical for live sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.operations;

-- Create default room for immediate use
INSERT INTO public.rooms (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Canvas');

-- Function to update room's updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rooms SET updated_at = now() WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update room timestamp when operations are added
CREATE TRIGGER update_room_on_operation
AFTER INSERT ON public.operations
FOR EACH ROW
EXECUTE FUNCTION public.update_room_timestamp();