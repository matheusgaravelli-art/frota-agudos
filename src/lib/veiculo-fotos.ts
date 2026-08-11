import { supabase } from "@/integrations/supabase/client";

export const FOTOS_BUCKET = "veiculo-fotos";
export const MAX_FOTOS = 2;

export async function uploadFoto(veiculoId: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${veiculoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
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
  return (data ?? []).map((d) => d.signedUrl);
}
