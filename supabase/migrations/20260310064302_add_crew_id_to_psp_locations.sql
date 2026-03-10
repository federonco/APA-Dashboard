ALTER TABLE public.psp_locations ADD COLUMN IF NOT EXISTS crew_id uuid REFERENCES public.crews(id);
CREATE INDEX IF NOT EXISTS idx_psp_locations_crew_id ON public.psp_locations(crew_id);
