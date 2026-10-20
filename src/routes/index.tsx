import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestão de Frota — Acesso" },
      { name: "description", content: "Sistema simples de gestão de frota: veículos, lembretes e relatórios." },
      { property: "og:title", content: "Gestão de Frota — Acesso" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:description", content: "Controle diário da frota — veículos, lembretes e relatórios." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
          <Truck className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Frota</h1>
          <p className="text-muted-foreground">
            Controle diário de veículos, lembretes e relatórios.
          </p>
        </div>
        <Button asChild size="lg" className="w-full h-12 text-base">
          <Link to="/auth">Entrar no sistema</Link>
        </Button>
      </div>
    </div>
  );
}
