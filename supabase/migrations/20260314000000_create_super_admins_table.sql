-- Super admins: access to /admin panel (Crew Admin Management)
CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.super_admins (email) VALUES ('ronco.fe@gmail.com')
ON CONFLICT (email) DO NOTHING;
