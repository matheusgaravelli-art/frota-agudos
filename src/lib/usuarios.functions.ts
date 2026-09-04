import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UsuarioSistema = {
  id: string;
  email: string;
  papel: "admin" | "usuario";
  criadoEm: string;
  ultimoAcesso: string | null;
};

async function garantirAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Apenas administradores podem gerenciar usuários.");
}

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioSistema[]> => {
    await garantirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const { data: papeis } = await supabaseAdmin.from("user_roles").select("user_id, role");
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      papel: papeis?.some((p) => p.user_id === u.id && p.role === "admin") ? "admin" : "usuario",
      criadoEm: u.created_at,
      ultimoAcesso: u.last_sign_in_at ?? null,
    }));
  });

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        senha: z.string().min(6),
        papel: z.enum(["admin", "usuario"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await garantirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", criado.user.id);
    const { error: erroPapel } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: criado.user.id, role: data.papel });
    if (erroPapel) throw new Error(erroPapel.message);
    return { id: criado.user.id };
  });

export const definirPapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), papel: z.enum(["admin", "usuario"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await garantirAdmin(context);
    if (data.userId === context.userId && data.papel !== "admin") {
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.papel });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await garantirAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir seu próprio usuário.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const enviarRedefinicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(d))
  .handler(async ({ context, data }) => {
    await garantirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
