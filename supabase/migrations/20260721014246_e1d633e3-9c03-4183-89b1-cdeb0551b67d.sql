
-- Motoristas
CREATE TABLE public.motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  contato text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motoristas TO authenticated;
GRANT ALL ON public.motoristas TO service_role;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam motoristas" ON public.motoristas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER motoristas_set_updated BEFORE UPDATE ON public.motoristas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Veículos: novos campos
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS marca_modelo text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS motorista_id uuid REFERENCES public.motoristas(id) ON DELETE SET NULL;

-- Manutenções
CREATE TABLE public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  peca_servico text NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  oficina text,
  observacoes text,
  valor numeric,
  custo_id uuid REFERENCES public.custos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam manutencoes" ON public.manutencoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER manutencoes_set_updated BEFORE UPDATE ON public.manutencoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Documentos: renomear 'licenciamento' para 'documento'
UPDATE public.documentos SET tipo = 'documento' WHERE tipo = 'licenciamento';
