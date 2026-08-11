CREATE POLICY "veiculo_fotos_select" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'veiculo-fotos');
CREATE POLICY "veiculo_fotos_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'veiculo-fotos');
CREATE POLICY "veiculo_fotos_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'veiculo-fotos') WITH CHECK (bucket_id = 'veiculo-fotos');
CREATE POLICY "veiculo_fotos_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'veiculo-fotos');