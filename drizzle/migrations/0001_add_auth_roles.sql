-- Papéis de usuário
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Usuario ve seus papeis" ON public.user_roles;
CREATE POLICY "Usuario ve seus papeis" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Primeiro usuário como Administrador (dados existentes preservados)
INSERT INTO public.user_roles (user_id, role)
SELECT 'f64dd3c4-daa6-4eb8-9a05-5a6572089043', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = 'f64dd3c4-daa6-4eb8-9a05-5a6572089043')
ON CONFLICT (user_id, role) DO NOTHING;

-- Novos usuários recebem papel "usuario" automaticamente
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user_role ON auth.users;
CREATE TRIGGER trg_new_user_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Dados da frota passam a exigir login (nenhum dado é apagado)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['veiculos','custos','documentos','manutencoes','motoristas','lembretes','etiquetas','veiculo_etiquetas']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Acesso publico ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Acesso autenticado ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', 'Acesso autenticado ' || t, t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
