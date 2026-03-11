-- Ensure ronco.fe@gmail.com is superadmin with full crews
UPDATE public.psp_admins
SET role = 'superadmin', crews = ARRAY['A','B','C','D','Global'], is_active = true
WHERE email = 'ronco.fe@gmail.com';

-- If no row exists, insert (requires manual auth user first)
INSERT INTO public.psp_admins (email, full_name, role, crews, is_active)
SELECT 'ronco.fe@gmail.com', 'Super Admin', 'superadmin', ARRAY['A','B','C','D','Global'], true
WHERE NOT EXISTS (SELECT 1 FROM public.psp_admins WHERE email = 'ronco.fe@gmail.com');
