COMMENT ON TABLE public.motoristas IS 'DEPRECATED: driver module removed at user request; no application reads or writes.';
COMMENT ON TABLE public.custos IS 'DEPRECATED: expense module removed at user request; no application reads or writes.';
COMMENT ON TABLE public.manutencoes IS 'DEPRECATED: maintenance history module removed at user request; vehicle status remains supported.';
COMMENT ON TABLE public.documentos IS 'DEPRECATED: document deadline module removed at user request; manual reminders remain supported.';
COMMENT ON COLUMN public.veiculos.motorista IS 'DEPRECATED: driver module removed at user request.';
COMMENT ON COLUMN public.veiculos.motorista_id IS 'DEPRECATED: driver module removed at user request.';
COMMENT ON COLUMN public.veiculos.km_atual IS 'DEPRECATED: mileage reporting removed at user request.';