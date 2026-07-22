
-- Grant anon access + open policies since the app runs without login
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motoristas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO anon;

DROP POLICY IF EXISTS "Autenticados gerenciam veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Autenticados gerenciam motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Autenticados gerenciam custos" ON public.custos;
DROP POLICY IF EXISTS "Autenticados gerenciam documentos" ON public.documentos;
DROP POLICY IF EXISTS "Autenticados gerenciam manutencoes" ON public.manutencoes;

CREATE POLICY "Acesso publico veiculos" ON public.veiculos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico motoristas" ON public.motoristas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico custos" ON public.custos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico documentos" ON public.documentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico manutencoes" ON public.manutencoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
