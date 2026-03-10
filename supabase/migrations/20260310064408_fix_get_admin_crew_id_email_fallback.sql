CREATE OR REPLACE FUNCTION public.get_admin_crew_id()
RETURNS uuid AS $$
  SELECT crew_id FROM public.psp_admins
  WHERE user_id = auth.uid()
     OR (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND user_id IS NULL)
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
