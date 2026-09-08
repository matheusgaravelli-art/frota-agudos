import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePapel } from "@/lib/auth";
import { rotuloAcao, rotuloArea, type Atividade } from "@/lib/atividades";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/atividades")({
  head: () => ({
    meta: [
      { title: "Histórico de Atividades — Gestão de Frota" },
      { name: "description", content: "Veja quem criou, editou ou excluiu veículos e custos, com data e hora." },
      { property: "og:title", content: "Histórico de Atividades — Gestão de Frota" },
      { property: "og:description", content: "Veja quem criou, editou ou excluiu veículos e custos, com data e hora." },
    ],
  }),
  component: AtividadesPage,
});

function AtividadesPage() {
  const { ehAdmin, carregando } = usePapel();

  const lista = useQuery({
    queryKey: ["atividades"],
    enabled: ehAdmin,
    queryFn: async (): Promise<Atividade[]> => {
      const { data, error } = await supabase
        .from("atividades")
        .select("id, user_id, usuario_email, area, acao, descricao, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
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
            Somente o administrador pode ver o histórico de atividades.
          </p>
        </CardContent>
      </Card>
    );
  }

  const itens = lista.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Histórico de atividades</h1>
        <p className="text-sm text-muted-foreground">
          Registros de criação, edição e exclusão em Veículos e Custos — mais recentes primeiro.
        </p>
      </div>

      {lista.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : itens.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Nenhuma atividade registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {itens.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-4 flex flex-wrap items-start gap-3">
                <History className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{rotuloArea[a.area] ?? a.area}</Badge>
                    <span className="text-sm font-medium">{rotuloAcao[a.acao] ?? a.acao}</span>
                  </div>
                  {a.descricao && <p className="text-sm text-muted-foreground mt-1">{a.descricao}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(a.created_at).toLocaleString("pt-BR")} ·{" "}
                    {a.usuario_email || "usuário removido"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
