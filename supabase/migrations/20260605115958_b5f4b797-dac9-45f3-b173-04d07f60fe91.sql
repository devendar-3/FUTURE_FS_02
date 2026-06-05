
DROP POLICY "Authenticated can update leads" ON public.leads;
DROP POLICY "Authenticated can delete leads" ON public.leads;
DROP POLICY "Authenticated can update notes" ON public.lead_notes;
DROP POLICY "Authenticated can delete notes" ON public.lead_notes;

CREATE POLICY "Authenticated can update leads" ON public.leads FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete leads" ON public.leads FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update notes" ON public.lead_notes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete notes" ON public.lead_notes FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
