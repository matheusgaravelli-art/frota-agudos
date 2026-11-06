import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { VeiculosListagem } from "@/components/veiculos-listagem";

const schema = z.object({
  dep: fallback(z.string(), "").default(""),
  pendencia: fallback(z.string(), "").default(""),
  abrir: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "").default(""),
  tipo: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/veiculos")({
  validateSearch: zodValidator(schema),
  component: VeiculosPage,
  head: () => ({
    meta: [
      { title: "Veículos da frota | Gestão de Frota" },
      { name: "description", content: "Cadastro de veículos da frota com tipo, cor, departamento, placa, status e fotos do veículo." },
      { property: "og:title", content: "Veículos da frota | Gestão de Frota" },
      { property: "og:description", content: "Cadastre e organize os veículos da frota com fotos e importação por planilha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function VeiculosPage() {
  const search = Route.useSearch();
  return <VeiculosListagem key={JSON.stringify(search)} aba="veiculos" inicial={search} />;
}
