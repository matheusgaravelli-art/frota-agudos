import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, LogOut, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAcesso, useSessao } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AreaProtegida,
});

function AreaProtegida() {
  const { status, aprovado, carregando } = useAcesso();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!aprovado) return <AguardandoAprovacao recusado={status === "recusado"} />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function AguardandoAprovacao({ recusado }: { recusado: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usuario } = useSessao();

  const sair = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <div
            className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center ${
              recusado ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            {recusado ? <XCircle className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
          </div>
          <h1 className="text-xl font-semibold">
            {recusado ? "Cadastro não aprovado" : "Cadastro aguardando aprovação"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {recusado
              ? "Seu acesso ao sistema foi recusado pelo administrador. Fale com o responsável se achar que isso é um erro."
              : "Seu cadastro foi recebido. Um administrador precisa aprovar o acesso antes de você usar o sistema."}
          </p>
          {usuario?.email && <p className="text-xs text-muted-foreground">{usuario.email}</p>}
          <Button variant="outline" className="w-full h-11" onClick={sair}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
