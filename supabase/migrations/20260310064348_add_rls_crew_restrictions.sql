CREATE OR REPLACE FUNCTION public.get_admin_crew_id()
RETURNS uuid AS $$
  SELECT crew_id FROM public.psp_admins
  WHERE user_id = auth.uid()
     OR (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND user_id IS NULL)
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS locations_update ON public.psp_locations;
DROP POLICY IF EXISTS locations_insert ON public.psp_locations;

CREATE POLICY locations_update ON public.psp_locations
  FOR UPDATE TO authenticated
  USING (crew_id IS NULL OR crew_id = public.get_admin_crew_id())
  WITH CHECK (crew_id IS NULL OR crew_id = public.get_admin_crew_id());

CREATE POLICY locations_insert ON public.psp_locations
  FOR INSERT TO authenticated
  WITH CHECK (crew_id IS NULL OR crew_id = public.get_admin_crew_id());

DROP POLICY IF EXISTS sections_update ON public.psp_sections;
DROP POLICY IF EXISTS sections_insert ON public.psp_sections;

CREATE POLICY sections_update ON public.psp_sections
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.psp_locations l
      WHERE l.id = psp_sections.location_id
      AND (l.crew_id IS NULL OR l.crew_id = public.get_admin_crew_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.psp_locations l
      WHERE l.id = psp_sections.location_id
      AND (l.crew_id IS NULL OR l.crew_id = public.get_admin_crew_id())
    )
  );

CREATE POLICY sections_insert ON public.psp_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.psp_locations l
      WHERE l.id = psp_sections.location_id
      AND (l.crew_id IS NULL OR l.crew_id = public.get_admin_crew_id())
    )
  );

DROP POLICY IF EXISTS "Authenticated full access — sections" ON public.drainer_sections;
DROP POLICY IF EXISTS "Authenticated full access - sections" ON public.drainer_sections;

CREATE POLICY drainer_sections_authenticated_all ON public.drainer_sections
  FOR ALL TO authenticated
  USING (crew_id IS NULL OR crew_id = public.get_admin_crew_id())
  WITH CHECK (crew_id IS NULL OR crew_id = public.get_admin_crew_id());
