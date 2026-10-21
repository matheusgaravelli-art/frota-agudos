import { createFileRoute } from "@tanstack/react-router";
import { VeiculosListagem } from "@/components/veiculos-listagem";

export const Route = createFileRoute("/_authenticated/veiculos")({
  component: VeiculosPage,
  head: () => ({
    meta: [
      { title: "Veículos da frota | Gestão de Frota" },
      {
        name: "description",
        content:
          "Cadastro de veículos da frota com tipo, cor, departamento, placa, status e fotos do veículo.",
      },
      { property: "og:title", content: "Veículos da frota | Gestão de Frota" },
      {
        property: "og:description",
        content: "Cadastre e organize os veículos da frota com fotos e importação por planilha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function VeiculosPage() {
  return <VeiculosListagem aba="veiculos" />;
}
