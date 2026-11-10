CREATE OR REPLACE FUNCTION public.is_aprovado(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.acessos WHERE user_id = _user_id AND status = 'aprovado')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_aprovado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_aprovado(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Acesso autenticado veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Acesso autenticado etiquetas" ON public.etiquetas;
DROP POLICY IF EXISTS "Acesso autenticado veiculo_etiquetas" ON public.veiculo_etiquetas;
DROP POLICY IF EXISTS "Acesso autenticado lembretes" ON public.lembretes;
CREATE POLICY "Aprovados acessam veiculos" ON public.veiculos FOR ALL TO authenticated USING (public.is_aprovado(auth.uid())) WITH CHECK (public.is_aprovado(auth.uid()));
CREATE POLICY "Aprovados acessam etiquetas" ON public.etiquetas FOR ALL TO authenticated USING (public.is_aprovado(auth.uid())) WITH CHECK (public.is_aprovado(auth.uid()));
CREATE POLICY "Aprovados acessam veiculo_etiquetas" ON public.veiculo_etiquetas FOR ALL TO authenticated USING (public.is_aprovado(auth.uid())) WITH CHECK (public.is_aprovado(auth.uid()));
CREATE POLICY "Aprovados acessam lembretes" ON public.lembretes FOR ALL TO authenticated USING (public.is_aprovado(auth.uid())) WITH CHECK (public.is_aprovado(auth.uid()));

DROP POLICY IF EXISTS "Registra propria atividade" ON public.atividades;
CREATE POLICY "Aprovados registram atividade" ON public.atividades FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_aprovado(auth.uid()));

DROP POLICY IF EXISTS "Acesso autenticado custos" ON public.custos;
DROP POLICY IF EXISTS "Acesso autenticado documentos" ON public.documentos;
DROP POLICY IF EXISTS "Acesso autenticado motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Acesso autenticado manutencoes" ON public.manutencoes;
REVOKE ALL ON public.custos, public.documentos, public.motoristas, public.manutencoes FROM anon, authenticated;
REVOKE ALL ON public.veiculos, public.etiquetas, public.veiculo_etiquetas, public.lembretes, public.atividades, public.acessos, public.user_roles FROM anon;

DROP POLICY IF EXISTS "veiculo_fotos_select" ON storage.objects;
DROP POLICY IF EXISTS "veiculo_fotos_insert" ON storage.objects;
DROP POLICY IF EXISTS "veiculo_fotos_update" ON storage.objects;
DROP POLICY IF EXISTS "veiculo_fotos_delete" ON storage.objects;
CREATE POLICY "veiculo_fotos_select_aprovados" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'veiculo-fotos' AND public.is_aprovado(auth.uid()));
CREATE POLICY "veiculo_fotos_insert_aprovados" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'veiculo-fotos' AND public.is_aprovado(auth.uid()));
CREATE POLICY "veiculo_fotos_update_aprovados" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'veiculo-fotos' AND public.is_aprovado(auth.uid())) WITH CHECK (bucket_id = 'veiculo-fotos' AND public.is_aprovado(auth.uid()));
CREATE POLICY "veiculo_fotos_delete_aprovados" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'veiculo-fotos' AND public.is_aprovado(auth.uid()));