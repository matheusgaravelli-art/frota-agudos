ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS duplicado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS veiculos_departamento_idx ON public.veiculos (departamento);
CREATE INDEX IF NOT EXISTS veiculos_placa_idx ON public.veiculos (placa);

ALTER TABLE public.veiculos REPLICA IDENTITY FULL;
ALTER TABLE public.custos REPLICA IDENTITY FULL;
ALTER TABLE public.documentos REPLICA IDENTITY FULL;
ALTER TABLE public.manutencoes REPLICA IDENTITY FULL;
ALTER TABLE public.motoristas REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.veiculos; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.custos; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.documentos; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.manutencoes; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.motoristas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;