-- Crews table: A/B North, C/D South
CREATE TABLE IF NOT EXISTS public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  zone text NOT NULL CHECK (zone IN ('north', 'south'))
);

INSERT INTO public.crews (name, zone) VALUES
  ('A', 'north'),
  ('B', 'north'),
  ('C', 'south'),
  ('D', 'south')
ON CONFLICT (name) DO NOTHING;
