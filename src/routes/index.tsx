import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestão de Frota — Acesso" },
      { name: "description", content: "Sistema simples de gestão de frota: veículos, custos, manutenções e vencimentos." },
      { property: "og:title", content: "Gestão de Frota" },
      { property: "og:description", content: "Controle diário da frota — veículos, custos e vencimentos." },
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
            Controle diário de veículos, custos, manutenções e vencimentos.
          </p>
        </div>
        <Button asChild size="lg" className="w-full h-12 text-base">
          <Link to="/painel">Acessar o sistema</Link>
        </Button>
      </div>
    </div>
  );
}
