import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clock, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { decidirAcesso, listarCadastros } from "@/lib/usuarios.functions";
import { usePapel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/aprovacoes")({
  head: () => ({
    meta: [
      { title: "Aprovação de Cadastros — Gestão de Frota" },
      { name: "description", content: "Aprove ou recuse os cadastros pendentes de acesso ao sistema de frota." },
      { property: "og:title", content: "Aprovação de Cadastros — Gestão de Frota" },
      { property: "og:description", content: "Aprove ou recuse os cadastros pendentes de acesso ao sistema de frota." },
    ],
  }),
  component: AprovacoesPage,
});

function AprovacoesPage() {
  const { ehAdmin, carregando } = usePapel();
  const qc = useQueryClient();
  const buscar = useServerFn(listarCadastros);
  const decidir = useServerFn(decidirAcesso);

  const lista = useQuery({
    queryKey: ["cadastros-pendentes"],
    enabled: ehAdmin,
    queryFn: () => buscar(),
  });

  const acao = useMutation({
    mutationFn: (dados: { userId: string; status: "aprovado" | "recusado" }) =>
      decidir({ data: dados }),
    onSuccess: (_r, dados) => {
      toast.success(dados.status === "aprovado" ? "Cadastro aprovado" : "Cadastro recusado");
      qc.invalidateQueries({ queryKey: ["cadastros-pendentes"] });
      qc.invalidateQueries({ queryKey: ["usuarios-sistema"] });
    },
    onError: (e: Error) => toast.error("Não foi possível concluir", { description: e.message }),
  });

  if (carregando) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ehAdmin) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-2">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Área restrita</p>
          <p className="text-sm text-muted-foreground">
            Somente o administrador pode aprovar cadastros.
          </p>
        </CardContent>
      </Card>
    );
  }

  const itens = lista.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aprovação de cadastros</h1>
        <p className="text-sm text-muted-foreground">
          Quem se cadastra só entra no sistema depois da sua aprovação.
        </p>
      </div>

      {lista.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : itens.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Nenhum cadastro aguardando aprovação.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {itens.map((c) => (
            <Card key={c.userId}>
              <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.email || "(sem e-mail)"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {c.status === "recusado" ? "Recusado" : "Aguardando aprovação"} ·{" "}
                    {new Date(c.criadoEm).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={acao.isPending}
                    onClick={() => acao.mutate({ userId: c.userId, status: "aprovado" })}
                  >
                    <Check className="h-4 w-4" />
                    Aprovar
                  </Button>
                  {c.status !== "recusado" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acao.isPending}
                      onClick={() => acao.mutate({ userId: c.userId, status: "recusado" })}
                    >
                      <X className="h-4 w-4" />
                      Recusar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
