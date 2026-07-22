import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listCustos,
  listVeiculos,
  listManutencoes,
  formatBRL,
  formatData,
  tipoCustoLabel,
  type TipoCusto,
} from "@/lib/frota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });
  const custos = useQuery({ queryKey: ["custos"], queryFn: listCustos });
  const manutencoes = useQuery({ queryKey: ["manutencoes"], queryFn: listManutencoes });

  const hoje = new Date();
  const [mes, setMes] = useState<string>(String(hoje.getMonth() + 1));
  const [ano, setAno] = useState<string>(String(hoje.getFullYear()));
  const [veiculoId, setVeiculoId] = useState<string>("todos");

  const veiculoLabel = useMemo(() => {
    const m = new Map<string, string>();
    (veiculos.data ?? []).forEach((v) => m.set(v.id, `${v.nome} (${v.placa})`));
    return m;
  }, [veiculos.data]);

  const inPeriodo = (dataISO: string) => {
    const [y, mo] = dataISO.split("-").map(Number);
    if (mes === "todos") return y === Number(ano);
    return y === Number(ano) && mo === Number(mes);
  };

  const custosFiltrados = (custos.data ?? []).filter(
    (c) => inPeriodo(c.data) && (veiculoId === "todos" || c.veiculo_id === veiculoId),
  );
  const manutFiltradas = (manutencoes.data ?? []).filter(
    (m) => inPeriodo(m.data) && (veiculoId === "todos" || m.veiculo_id === veiculoId),
  );

  const totalCustos = custosFiltrados.reduce((acc, c) => acc + Number(c.valor), 0);
  const totalManut = manutFiltradas.reduce((acc, m) => acc + Number(m.valor ?? 0), 0);
  const kmRodado = (veiculos.data ?? [])
    .filter((v) => veiculoId === "todos" || v.id === veiculoId)
    .reduce((acc, v) => acc + (v.km_atual || 0), 0);

  const periodoLabel = mes === "todos" ? `Ano ${ano}` : `${String(mes).padStart(2, "0")}/${ano}`;
  const veicLabel = veiculoId === "todos" ? "Todos os veículos" : veiculoLabel.get(veiculoId) ?? "—";

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      let y = 15;
      doc.setFontSize(16);
      doc.text("Relatório de Frota", 14, y); y += 7;
      doc.setFontSize(10);
      doc.text(`Período: ${periodoLabel}`, 14, y); y += 5;
      doc.text(`Veículo: ${veicLabel}`, 14, y); y += 5;
      doc.text(`KM total (atual): ${kmRodado.toLocaleString("pt-BR")}`, 14, y); y += 7;

      doc.setFontSize(12); doc.text(`Custos — Total ${formatBRL(totalCustos)}`, 14, y); y += 3;
      autoTable(doc, {
        startY: y + 2,
        head: [["Data", "Veículo", "Tipo", "KM", "Valor", "Descrição"]],
        body: custosFiltrados.map((c) => [
          formatData(c.data),
          veiculoLabel.get(c.veiculo_id) ?? "—",
          tipoCustoLabel[c.tipo as TipoCusto] ?? c.tipo,
          c.km ?? "",
          formatBRL(Number(c.valor)),
          c.descricao ?? "",
        ]),
        styles: { fontSize: 8 },
      });

      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
      let y2 = finalY + 8;
      doc.setFontSize(12); doc.text(`Manutenções — Total ${formatBRL(totalManut)}`, 14, y2); y2 += 3;
      autoTable(doc, {
        startY: y2 + 2,
        head: [["Data", "Veículo", "Peça/Serviço", "Oficina", "Valor", "Observações"]],
        body: manutFiltradas.map((m) => [
          formatData(m.data),
          veiculoLabel.get(m.veiculo_id) ?? "—",
          m.peca_servico,
          m.oficina ?? "",
          m.valor != null ? formatBRL(Number(m.valor)) : "",
          m.observacoes ?? "",
        ]),
        styles: { fontSize: 8 },
      });

      doc.save(`relatorio-frota-${ano}-${mes}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    }
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const resumo = [
        ["Relatório de Frota"],
        ["Período", periodoLabel],
        ["Veículo", veicLabel],
        ["KM total (atual)", kmRodado],
        ["Total custos", totalCustos],
        ["Total manutenções", totalManut],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

      const custosData = [
        ["Data", "Veículo", "Tipo", "KM", "Valor", "Descrição"],
        ...custosFiltrados.map((c) => [
          c.data,
          veiculoLabel.get(c.veiculo_id) ?? "",
          tipoCustoLabel[c.tipo as TipoCusto] ?? c.tipo,
          c.km ?? "",
          Number(c.valor),
          c.descricao ?? "",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(custosData), "Custos");

      const manutData = [
        ["Data", "Veículo", "Peça/Serviço", "Oficina", "Valor", "Observações"],
        ...manutFiltradas.map((m) => [
          m.data,
          veiculoLabel.get(m.veiculo_id) ?? "",
          m.peca_servico,
          m.oficina ?? "",
          m.valor != null ? Number(m.valor) : "",
          m.observacoes ?? "",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(manutData), "Manutenções");

      XLSX.writeFile(wb, `relatorio-frota-${ano}-${mes}.xlsx`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar Excel");
    }
  };

  const anosDisponiveis = Array.from(
    new Set([
      ...(custos.data ?? []).map((c) => c.data.slice(0, 4)),
      ...(manutencoes.data ?? []).map((m) => m.data.slice(0, 4)),
      String(hoje.getFullYear()),
    ]),
  ).sort().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" /> Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exporte custos, KM e manutenções por período e veículo
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Mês</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Ano inteiro</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {String(m).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Veículo</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(veiculos.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.nome} ({v.placa})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MiniStat label="Custos" value={formatBRL(totalCustos)} />
        <MiniStat label="Manutenções" value={formatBRL(totalManut)} />
        <MiniStat label="Lançamentos" value={String(custosFiltrados.length)} />
        <MiniStat label="KM total" value={kmRodado.toLocaleString("pt-BR")} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={exportPDF} size="lg" className="gap-2">
          <FileDown className="h-4 w-4" /> Exportar PDF
        </Button>
        <Button onClick={exportExcel} size="lg" variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-xl md:text-2xl font-bold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
