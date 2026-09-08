-- Aprovação de acesso
CREATE TABLE IF NOT EXISTS public.acessos (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL DEFAULT 'pendente',
  decidido_em timestamptz,
  decidido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.acessos TO authenticated;
GRANT ALL ON public.acessos TO service_role;

ALTER TABLE public.acessos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ve seu acesso ou admin" ON public.acessos;
CREATE POLICY "Ve seu acesso ou admin" ON public.acessos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Usuários já existentes ficam aprovados
INSERT INTO public.acessos (user_id, email, status, decidido_em)
SELECT u.id, u.email, 'aprovado', now() FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- Novos cadastros entram como pendentes
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'usuario')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.acessos (user_id, email, status)
  VALUES (NEW.id, NEW.email, 'pendente')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Histórico de atividades (Veículos e Custos)
CREATE TABLE IF NOT EXISTS public.atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_email text,
  area text NOT NULL,
  acao text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS atividades_created_at_idx ON public.atividades (created_at DESC);

GRANT SELECT, INSERT ON public.atividades TO authenticated;
GRANT ALL ON public.atividades TO service_role;

ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin ve atividades" ON public.atividades;
CREATE POLICY "Admin ve atividades" ON public.atividades
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Registra propria atividade" ON public.atividades;
CREATE POLICY "Registra propria atividade" ON public.atividades
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
