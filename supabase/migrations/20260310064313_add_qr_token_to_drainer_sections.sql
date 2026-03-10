ALTER TABLE public.drainer_sections ADD COLUMN IF NOT EXISTS qr_token text UNIQUE;
ALTER TABLE public.drainer_sections ADD COLUMN IF NOT EXISTS qr_token_created_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_drainer_sections_qr_token ON public.drainer_sections(qr_token) WHERE qr_token IS NOT NULL;
