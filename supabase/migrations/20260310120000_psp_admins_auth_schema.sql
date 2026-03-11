-- psp_admins: add role, crews[], region, full_name, is_active, etc. (complement crew_id)
ALTER TABLE public.psp_admins ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('superadmin', 'admin')) DEFAULT 'admin';
ALTER TABLE public.psp_admins ADD COLUMN IF NOT EXISTS crews text[] DEFAULT '{}';
ALTER TABLE public.psp_admins ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.psp_admins ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.psp_admins ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.psp_admins ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.psp_admins ADD COLUMN IF NOT EXISTS last_login timestamptz;
CREATE INDEX IF NOT EXISTS idx_psp_admins_email ON public.psp_admins(email);
CREATE INDEX IF NOT EXISTS idx_psp_admins_role ON public.psp_admins(role);

-- psp_audit_logs
CREATE TABLE IF NOT EXISTS public.psp_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_email text NOT NULL,
  action text NOT NULL,
  target_email text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psp_audit_logs_superadmin ON public.psp_audit_logs(superadmin_email);
CREATE INDEX IF NOT EXISTS idx_psp_audit_logs_created_at ON public.psp_audit_logs(created_at DESC);

-- psp_sessions
CREATE TABLE IF NOT EXISTS public.psp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  crews text[] DEFAULT '{}',
  region text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);
CREATE INDEX IF NOT EXISTS idx_psp_sessions_user_id ON public.psp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_psp_sessions_email ON public.psp_sessions(email);

-- RLS: psp_admins — superadmin full access; others read own row only
ALTER TABLE public.psp_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin_psp_admins_access" ON public.psp_admins;
CREATE POLICY "superadmin_psp_admins_access" ON public.psp_admins
  FOR ALL USING (
    (auth.jwt() ->> 'email')::text = 'ronco.fe@gmail.com'
  );
DROP POLICY IF EXISTS "psp_admins_read_own" ON public.psp_admins;
CREATE POLICY "psp_admins_read_own" ON public.psp_admins
  FOR SELECT USING (
    (auth.jwt() ->> 'email')::text = email
  );

-- RLS: psp_audit_logs — superadmin read
ALTER TABLE public.psp_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin_psp_audit_logs_access" ON public.psp_audit_logs;
CREATE POLICY "superadmin_psp_audit_logs_access" ON public.psp_audit_logs
  FOR SELECT USING (
    (auth.jwt() ->> 'email')::text = 'ronco.fe@gmail.com'
  );
DROP POLICY IF EXISTS "superadmin_psp_audit_logs_insert" ON public.psp_audit_logs;
CREATE POLICY "superadmin_psp_audit_logs_insert" ON public.psp_audit_logs
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'email')::text = 'ronco.fe@gmail.com'
  );

-- RLS: psp_sessions — own session
ALTER TABLE public.psp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_own_access" ON public.psp_sessions;
CREATE POLICY "session_own_access" ON public.psp_sessions
  FOR SELECT USING (auth.uid() = user_id);
