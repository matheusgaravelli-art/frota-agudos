import { createFileRoute } from "@tanstack/react-router";
import { VeiculosListagem } from "@/components/veiculos-listagem";

export const Route = createFileRoute("/_authenticated/desativados")({
  component: DesativadosPage,
  head: () => ({
    meta: [
      { title: "Veículos desativados | Gestão de Frota" },
      { name: "description", content: "Consulte e edite veículos desativados da frota, com busca e filtros por departamento e etiqueta." },
      { property: "og:title", content: "Veículos desativados | Gestão de Frota" },
      { property: "og:description", content: "Organize os veículos desativados da frota e atualize seu status para reativá-los." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DesativadosPage() {
  return <VeiculosListagem aba="desativados" />;
}