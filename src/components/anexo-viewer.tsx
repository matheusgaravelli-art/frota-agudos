import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { isPdf, nomeAnexo } from "@/lib/veiculo-fotos";

export type AnexoAberto = { url: string; path: string } | null;

/** Visualização ampliada de um anexo (foto ou PDF) com opção de baixar. */
export function AnexoViewer({
  anexo,
  onClose,
}: {
  anexo: AnexoAberto;
  onClose: () => void;
}) {
  const baixar = async () => {
    if (!anexo) return;
    try {
      const resp = await fetch(anexo.url);
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = nomeAnexo(anexo.path);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      window.open(anexo.url, "_blank", "noopener");
    }
  };

  return (
    <Dialog open={!!anexo} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Anexo do veículo</DialogTitle>
        </DialogHeader>
        {anexo &&
          (isPdf(anexo.path) ? (
            <iframe
              src={anexo.url}
              title="Anexo em PDF"
              className="w-full h-[65vh] rounded-md border bg-muted"
            />
          ) : (
            <img
              src={anexo.url}
              alt="Anexo do veículo em tamanho ampliado"
              className="w-full max-h-[70vh] object-contain rounded-md border bg-muted"
            />
          ))}
        <Button onClick={baixar} className="gap-2 h-11">
          <Download className="h-4 w-4" /> Baixar no aparelho
        </Button>
      </DialogContent>
    </Dialog>
  );
}
