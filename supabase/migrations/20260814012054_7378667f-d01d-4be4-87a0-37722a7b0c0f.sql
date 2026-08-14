ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS observacao text;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS max_anexos integer NOT NULL DEFAULT 2;
ALTER TABLE public.custos ADD COLUMN IF NOT EXISTS pendente boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#2563eb',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etiquetas TO anon, authenticated;
GRANT ALL ON public.etiquetas TO service_role;
ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso publico etiquetas" ON public.etiquetas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER etiquetas_set_updated BEFORE UPDATE ON public.etiquetas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.veiculo_etiquetas (
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  etiqueta_id uuid NOT NULL REFERENCES public.etiquetas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (veiculo_id, etiqueta_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculo_etiquetas TO anon, authenticated;
GRANT ALL ON public.veiculo_etiquetas TO service_role;
ALTER TABLE public.veiculo_etiquetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso publico veiculo_etiquetas" ON public.veiculo_etiquetas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);