CREATE TABLE public.lembretes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  data date NOT NULL,
  observacao text,
  concluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lembretes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lembretes TO authenticated;
GRANT ALL ON public.lembretes TO service_role;

ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso publico lembretes" ON public.lembretes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER lembretes_set_updated BEFORE UPDATE ON public.lembretes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();