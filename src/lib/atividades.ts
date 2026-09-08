import { supabase } from "@/integrations/supabase/client";

export type AreaAtividade = "veiculos" | "custos";
export type AcaoAtividade = "criacao" | "edicao" | "exclusao";

export type Atividade = {
  id: string;
  user_id: string | null;
  usuario_email: string | null;
  area: string;
  acao: string;
  descricao: string | null;
  created_at: string;
};

/** Registra uma ação no histórico. Nunca interrompe a operação principal. */
export async function registrarAtividade(
  area: AreaAtividade,
  acao: AcaoAtividade,
  descricao: string,
) {
  try {
    const { data } = await supabase.auth.getUser();
    const usuario = data.user;
    if (!usuario) return;
    await supabase.from("atividades").insert({
      user_id: usuario.id,
      usuario_email: usuario.email ?? null,
      area,
      acao,
      descricao,
    });
  } catch {
    // histórico é secundário: falha aqui não deve bloquear o usuário
  }
}

export const rotuloArea: Record<string, string> = {
  veiculos: "Veículos",
  custos: "Custos",
};

export const rotuloAcao: Record<string, string> = {
  criacao: "Criação",
  edicao: "Edição",
  exclusao: "Exclusão",
};
