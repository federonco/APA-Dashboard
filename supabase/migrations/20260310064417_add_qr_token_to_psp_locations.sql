ALTER TABLE public.psp_locations ADD COLUMN IF NOT EXISTS qr_token text UNIQUE;
ALTER TABLE public.psp_locations ADD COLUMN IF NOT EXISTS qr_token_created_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_psp_locations_qr_token ON public.psp_locations(qr_token) WHERE qr_token IS NOT NULL;
