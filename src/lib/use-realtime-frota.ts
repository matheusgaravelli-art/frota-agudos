import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABELAS = ["veiculos", "custos", "documentos", "manutencoes", "motoristas", "lembretes"] as const;

/**
 * Mantém as telas sincronizadas em tempo real entre dispositivos:
 * qualquer alteração no banco atualiza imediatamente as listas abertas.
 */
export function useRealtimeFrota() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("frota-sync");
    TABELAS.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey: [table] });
      });
    });
    channel.subscribe();

    const onFocus = () => {
      TABELAS.forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
