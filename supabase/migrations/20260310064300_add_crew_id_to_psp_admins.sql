ALTER TABLE public.psp_admins ADD COLUMN IF NOT EXISTS crew_id uuid REFERENCES public.crews(id);
CREATE INDEX IF NOT EXISTS idx_psp_admins_crew_id ON public.psp_admins(crew_id);
