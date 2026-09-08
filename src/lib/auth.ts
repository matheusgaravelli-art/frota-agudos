import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "admin" | "usuario";

export function useSessao() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setCarregando(false);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, carregando, usuario: session?.user ?? null };
}

export function usePapel() {
  const { usuario } = useSessao();
  const userId = usuario?.id;

  const q = useQuery({
    queryKey: ["papel", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Papel> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return data?.some((r) => r.role === "admin") ? "admin" : "usuario";
    },
  });

  return { papel: q.data, ehAdmin: q.data === "admin", carregando: q.isLoading };
}

export type StatusAcesso = "pendente" | "aprovado" | "recusado";

export function useAcesso() {
  const { usuario, carregando: carregandoSessao } = useSessao();
  const userId = usuario?.id;

  const q = useQuery({
    queryKey: ["acesso", userId],
    enabled: !!userId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<StatusAcesso> => {
      const { data, error } = await supabase
        .from("acessos")
        .select("status")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return ((data?.status as StatusAcesso) ?? "pendente");
    },
  });

  return {
    status: q.data,
    aprovado: q.data === "aprovado",
    carregando: carregandoSessao || (!!userId && q.isLoading),
  };
}
