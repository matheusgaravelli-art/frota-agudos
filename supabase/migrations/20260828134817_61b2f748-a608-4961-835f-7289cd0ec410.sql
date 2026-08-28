ALTER TABLE public.motoristas
  ADD COLUMN IF NOT EXISTS departamento text,
  ADD COLUMN IF NOT EXISTS cnh_path text;