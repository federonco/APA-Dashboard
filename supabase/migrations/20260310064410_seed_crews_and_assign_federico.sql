UPDATE public.psp_admins
SET crew_id = (SELECT id FROM public.crews WHERE name = 'A' LIMIT 1)
WHERE email = 'federico.ronco@apalliance.com.au';
