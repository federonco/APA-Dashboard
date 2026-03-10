ALTER TABLE public.psp_sections ADD COLUMN IF NOT EXISTS qr_token text UNIQUE;
ALTER TABLE public.psp_sections ADD COLUMN IF NOT EXISTS qr_token_created_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_psp_sections_qr_token ON public.psp_sections(qr_token) WHERE qr_token IS NOT NULL;
