import { supabase } from "@/integrations/supabase/client";

export const FOTOS_BUCKET = "veiculo-fotos";
/** Limite padrão de anexos por veículo (pode ser ampliado por veículo). */
export const MAX_FOTOS = 2;

export const ANEXO_ACCEPT = "image/*,application/pdf";

export function isPdf(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

export function nomeAnexo(path: string) {
  const base = path.split("/").pop() || path;
  return base.replace(/^\d+-[a-z0-9]{1,8}\./i, "arquivo.");
}

/** URL assinada de um único anexo (foto ou PDF). */
export async function getFotoUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(FOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data?.signedUrl ?? "";
}

export async function uploadFoto(veiculoId: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${veiculoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, {
    contentType: file.type || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeFoto(path: string) {
  await supabase.storage.from(FOTOS_BUCKET).remove([path]);
}

export async function getFotoUrls(paths: string[]) {
  if (paths.length === 0) return [] as string[];
  const { data, error } = await supabase.storage
    .from(FOTOS_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  return (data ?? []).map((d) => d.signedUrl ?? "");
}

/** Nome do PDF ao baixar: PLACA.CRLV.pdf (ou Patrimônio / SEM-PLACA), com " (2)" etc. se houver mais de um. */
export function nomeDownloadAnexo(
  veiculo: { placa?: string | null; codigo?: string | null } | null | undefined,
  todos: string[],
  path: string,
) {
  if (!isPdf(path)) return nomeAnexo(path);
  const base = veiculo?.placa?.trim() || veiculo?.codigo?.trim() || "SEM-PLACA";
  const pdfs = todos.filter(isPdf);
  const idx = pdfs.indexOf(path);
  const sufixo = idx > 0 ? ` (${idx + 1})` : "";
  return `${base}.CRLV${sufixo}.pdf`;
}
