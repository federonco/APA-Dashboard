ALTER TABLE public.drainer_sections ADD COLUMN IF NOT EXISTS crew_id uuid REFERENCES public.crews(id);
CREATE INDEX IF NOT EXISTS idx_drainer_sections_crew_id ON public.drainer_sections(crew_id);
