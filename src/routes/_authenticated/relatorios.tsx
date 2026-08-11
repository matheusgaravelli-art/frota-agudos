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
  type TipoCusto,,
  veiculoLabel,
} from "@/lib/frota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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
    (veiculos.data ?? []).forEach((v) => m.set(v.id, `${veiculoLabel(v)} (${v.placa})`));
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

  const periodoLabel =
    mes === "todos" ? `Ano de ${ano}` : `${MESES_PT[Number(mes) - 1]} de ${ano}`;
  const veicLabel =
    veiculoId === "todos" ? "Todos os veículos" : veiculoLabel.get(veiculoId) ?? "—";

  // Subtotais por categoria (para o PDF)
  const subtotaisCategoria = useMemo(() => {
    const m = new Map<TipoCusto, number>();
    custosFiltrados.forEach((c) => {
      const t = c.tipo as TipoCusto;
      m.set(t, (m.get(t) ?? 0) + Number(c.valor));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [custosFiltrados]);

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const marginX = 14;
      const brand: [number, number, number] = [30, 41, 59]; // slate-800
      const accent: [number, number, number] = [37, 99, 235]; // blue-600
      const muted: [number, number, number] = [100, 116, 139]; // slate-500

      // Cabeçalho
      doc.setFillColor(...brand);
      doc.rect(0, 0, pageW, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Relatório Gerencial de Frota", marginX, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(periodoLabel, marginX, 19);
      doc.setFontSize(9);
      const emissao = `Emitido em ${hoje.toLocaleDateString("pt-BR")} às ${hoje
        .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
      doc.text(emissao, pageW - marginX, 19, { align: "right" });

      // Identificação
      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Identificação", marginX, 36);
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.5);
      doc.line(marginX, 37.5, marginX + 30, 37.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...muted);
      doc.text("Período:", marginX, 44);
      doc.text("Veículo:", marginX, 50);
      doc.text("KM total (atual):", marginX, 56);
      doc.setTextColor(0, 0, 0);
      doc.text(periodoLabel, marginX + 32, 44);
      doc.text(veicLabel, marginX + 32, 50);
      doc.text(kmRodado.toLocaleString("pt-BR"), marginX + 32, 56);

      // Resumo financeiro (tabela)
      autoTable(doc, {
        startY: 64,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total de custos", formatBRL(totalCustos)],
          ["Total de manutenções", formatBRL(totalManut)],
          ["Lançamentos de custos", String(custosFiltrados.length)],
          ["Registros de manutenção", String(manutFiltradas.length)],
        ],
        theme: "grid",
        headStyles: { fillColor: brand, textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        margin: { left: marginX, right: marginX },
      });

      // Subtotais por categoria
      if (subtotaisCategoria.length > 0) {
        const afterY = (doc as unknown as { lastAutoTable: { finalY: number } })
          .lastAutoTable.finalY + 8;
        doc.setTextColor(...brand);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Custos por categoria", marginX, afterY);
        doc.setDrawColor(...accent);
        doc.line(marginX, afterY + 1.5, marginX + 45, afterY + 1.5);
        autoTable(doc, {
          startY: afterY + 4,
          head: [["Categoria", "Valor", "% do total"]],
          body: subtotaisCategoria.map(([tipo, v]) => [
            tipoCustoLabel[tipo] ?? tipo,
            formatBRL(v),
            totalCustos > 0 ? ((v / totalCustos) * 100).toFixed(1) + "%" : "—",
          ]),
          foot: [["Total", formatBRL(totalCustos), "100,0%"]],
          theme: "grid",
          headStyles: { fillColor: brand, textColor: 255, fontStyle: "bold" },
          footStyles: { fillColor: [241, 245, 249], textColor: brand, fontStyle: "bold" },
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
          },
          margin: { left: marginX, right: marginX },
        });
      }

      // Detalhamento de custos
      const y1 = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 10;
      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Detalhamento de custos", marginX, y1);
      doc.setDrawColor(...accent);
      doc.line(marginX, y1 + 1.5, marginX + 50, y1 + 1.5);

      autoTable(doc, {
        startY: y1 + 4,
        head: [["Data", "Veículo", "Categoria", "KM", "Valor", "Descrição"]],
        body:
          custosFiltrados.length > 0
            ? custosFiltrados.map((c) => [
                formatData(c.data),
                veiculoLabel.get(c.veiculo_id) ?? "—",
                tipoCustoLabel[c.tipo as TipoCusto] ?? c.tipo,
                c.km != null ? c.km.toLocaleString("pt-BR") : "—",
                formatBRL(Number(c.valor)),
                c.descricao ?? "",
              ])
            : [[{ content: "Nenhum custo lançado no período.", colSpan: 6, styles: { halign: "center", textColor: muted } }]],
        foot:
          custosFiltrados.length > 0
            ? [[
                { content: "Total", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
                { content: formatBRL(totalCustos), styles: { halign: "right", fontStyle: "bold" } },
                "",
              ]]
            : undefined,
        theme: "striped",
        headStyles: { fillColor: brand, textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [241, 245, 249], textColor: brand },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 22 },
          3: { halign: "right", cellWidth: 18 },
          4: { halign: "right", cellWidth: 26 },
        },
        margin: { left: marginX, right: marginX },
      });

      // Manutenções
      const y2 = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 10;
      doc.setTextColor(...brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Histórico de manutenções", marginX, y2);
      doc.setDrawColor(...accent);
      doc.line(marginX, y2 + 1.5, marginX + 55, y2 + 1.5);

      autoTable(doc, {
        startY: y2 + 4,
        head: [["Data", "Veículo", "Peça / Serviço", "Oficina", "Valor", "Observações"]],
        body:
          manutFiltradas.length > 0
            ? manutFiltradas.map((m) => [
                formatData(m.data),
                veiculoLabel.get(m.veiculo_id) ?? "—",
                m.peca_servico,
                m.oficina ?? "—",
                m.valor != null ? formatBRL(Number(m.valor)) : "—",
                m.observacoes ?? "",
              ])
            : [[{ content: "Nenhuma manutenção registrada no período.", colSpan: 6, styles: { halign: "center", textColor: muted } }]],
        foot:
          manutFiltradas.length > 0
            ? [[
                { content: "Total", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
                { content: formatBRL(totalManut), styles: { halign: "right", fontStyle: "bold" } },
                "",
              ]]
            : undefined,
        theme: "striped",
        headStyles: { fillColor: brand, textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [241, 245, 249], textColor: brand },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 22 },
          4: { halign: "right", cellWidth: 26 },
        },
        margin: { left: marginX, right: marginX },
      });

      // Rodapé com paginação
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageW - marginX,
          doc.internal.pageSize.getHeight() - 6,
          { align: "right" },
        );
        doc.text("Gestão de Frota", marginX, doc.internal.pageSize.getHeight() - 6);
      }

      doc.save(`relatorio-frota-${ano}-${String(mes).padStart(2, "0")}.pdf`);
      toast.success("Relatório PDF gerado");
    } catch (e) {
      toast.error("Não foi possível gerar o PDF", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const exportExcel = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "Gestão de Frota";
      wb.created = new Date();

      const brandFill = "FF1E293B"; // slate-800
      const softFill = "FFF1F5F9"; // slate-100
      const white = "FFFFFFFF";

      const money = 'R$ #,##0.00;[Red]-R$ #,##0.00';
      const intFmt = "#,##0";

      // ---------- Resumo ----------
      const ws = wb.addWorksheet("Resumo", {
        views: [{ showGridLines: false }],
      });
      ws.columns = [{ width: 32 }, { width: 28 }];

      ws.mergeCells("A1:B1");
      const title = ws.getCell("A1");
      title.value = "Relatório Gerencial de Frota";
      title.font = { bold: true, size: 16, color: { argb: white } };
      title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandFill } };
      ws.getRow(1).height = 28;

      ws.mergeCells("A2:B2");
      const sub = ws.getCell("A2");
      sub.value = `${periodoLabel} — emitido em ${hoje.toLocaleDateString("pt-BR")}`;
      sub.font = { italic: true, color: { argb: "FF64748B" } };
      sub.alignment = { horizontal: "left", indent: 1 };

      const info: [string, string | number][] = [
        ["Período", periodoLabel],
        ["Veículo", veicLabel],
        ["KM total (atual)", kmRodado],
        ["Lançamentos de custos", custosFiltrados.length],
        ["Registros de manutenção", manutFiltradas.length],
      ];
      let row = 4;
      info.forEach(([k, v]) => {
        const r = ws.getRow(row++);
        r.getCell(1).value = k;
        r.getCell(1).font = { bold: true };
        r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: softFill } };
        r.getCell(2).value = v;
        if (typeof v === "number") r.getCell(2).numFmt = intFmt;
        [1, 2].forEach((c) => {
          r.getCell(c).border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });

      row += 1;
      ws.mergeCells(`A${row}:B${row}`);
      const totH = ws.getCell(`A${row}`);
      totH.value = "Totais financeiros";
      totH.font = { bold: true, size: 12, color: { argb: white } };
      totH.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandFill } };
      totH.alignment = { horizontal: "left", indent: 1 };
      ws.getRow(row).height = 22;
      row += 1;

      const totCustosCell = `B${row}`;
      const rCustos = ws.getRow(row++);
      rCustos.getCell(1).value = "Total de custos";
      rCustos.getCell(1).font = { bold: true };
      rCustos.getCell(2).value = { formula: "SUMIF(Custos!C:C,\"<>\",Custos!E:E)" };
      rCustos.getCell(2).numFmt = money;

      const totManutCell = `B${row}`;
      const rManut = ws.getRow(row++);
      rManut.getCell(1).value = "Total de manutenções";
      rManut.getCell(1).font = { bold: true };
      rManut.getCell(2).value = { formula: "SUM(Manutenções!E:E)" };
      rManut.getCell(2).numFmt = money;

      const rGeral = ws.getRow(row++);
      rGeral.getCell(1).value = "Total geral";
      rGeral.getCell(1).font = { bold: true, color: { argb: white } };
      rGeral.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandFill } };
      rGeral.getCell(2).value = { formula: `${totCustosCell}+${totManutCell}` };
      rGeral.getCell(2).numFmt = money;
      rGeral.getCell(2).font = { bold: true, color: { argb: white } };
      rGeral.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandFill } };

      // ---------- Custos ----------
      const wsC = wb.addWorksheet("Custos", { views: [{ state: "frozen", ySplit: 1 }] });
      wsC.columns = [
        { header: "Data", key: "data", width: 14 },
        { header: "Veículo", key: "veiculo", width: 32 },
        { header: "Categoria", key: "categoria", width: 18 },
        { header: "KM", key: "km", width: 12 },
        { header: "Valor (R$)", key: "valor", width: 16 },
        { header: "Descrição", key: "descricao", width: 40 },
      ];
      styleHeader(wsC.getRow(1), brandFill, white);

      custosFiltrados.forEach((c) => {
        const [y, m, d] = c.data.split("-").map(Number);
        wsC.addRow({
          data: new Date(y, m - 1, d),
          veiculo: veiculoLabel.get(c.veiculo_id) ?? "—",
          categoria: tipoCustoLabel[c.tipo as TipoCusto] ?? c.tipo,
          km: c.km ?? null,
          valor: Number(c.valor),
          descricao: c.descricao ?? "",
        });
      });

      wsC.getColumn("data").numFmt = "dd/mm/yyyy";
      wsC.getColumn("km").numFmt = intFmt;
      wsC.getColumn("valor").numFmt = money;

      if (custosFiltrados.length > 0) {
        const lastRow = wsC.rowCount;
        const totalRow = wsC.addRow({
          data: null,
          veiculo: null,
          categoria: null,
          km: "Total",
          valor: { formula: `SUM(E2:E${lastRow})` },
          descricao: null,
        });
        totalRow.font = { bold: true };
        totalRow.getCell(4).alignment = { horizontal: "right" };
        totalRow.getCell(5).numFmt = money;
        totalRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: softFill } };
        });
      }
      applyBorders(wsC);

      // ---------- Manutenções ----------
      const wsM = wb.addWorksheet("Manutenções", { views: [{ state: "frozen", ySplit: 1 }] });
      wsM.columns = [
        { header: "Data", key: "data", width: 14 },
        { header: "Veículo", key: "veiculo", width: 32 },
        { header: "Peça / Serviço", key: "peca", width: 30 },
        { header: "Oficina", key: "oficina", width: 24 },
        { header: "Valor (R$)", key: "valor", width: 16 },
        { header: "Observações", key: "obs", width: 40 },
      ];
      styleHeader(wsM.getRow(1), brandFill, white);

      manutFiltradas.forEach((m) => {
        const [y, mo, d] = m.data.split("-").map(Number);
        wsM.addRow({
          data: new Date(y, mo - 1, d),
          veiculo: veiculoLabel.get(m.veiculo_id) ?? "—",
          peca: m.peca_servico,
          oficina: m.oficina ?? "",
          valor: m.valor != null ? Number(m.valor) : null,
          obs: m.observacoes ?? "",
        });
      });
      wsM.getColumn("data").numFmt = "dd/mm/yyyy";
      wsM.getColumn("valor").numFmt = money;

      if (manutFiltradas.length > 0) {
        const lastRow = wsM.rowCount;
        const totalRow = wsM.addRow({
          data: null,
          veiculo: null,
          peca: null,
          oficina: "Total",
          valor: { formula: `SUM(E2:E${lastRow})` },
          obs: null,
        });
        totalRow.font = { bold: true };
        totalRow.getCell(4).alignment = { horizontal: "right" };
        totalRow.getCell(5).numFmt = money;
        totalRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: softFill } };
        });
      }
      applyBorders(wsM);

      // ---------- Custos por categoria ----------
      const wsCat = wb.addWorksheet("Por categoria", { views: [{ showGridLines: false }] });
      wsCat.columns = [
        { header: "Categoria", key: "cat", width: 24 },
        { header: "Total (R$)", key: "total", width: 18 },
        { header: "% do total", key: "pct", width: 14 },
      ];
      styleHeader(wsCat.getRow(1), brandFill, white);

      const cats: TipoCusto[] = ["combustivel", "manutencao", "seguro", "imprevisto", "outros"];
      cats.forEach((cat) => {
        const label = tipoCustoLabel[cat];
        wsCat.addRow({
          cat: label,
          total: { formula: `SUMIF(Custos!C:C,"${label}",Custos!E:E)` },
          pct: { formula: `IFERROR(B${wsCat.rowCount + 1}/B${cats.length + 2},0)` },
        });
      });
      const totalCatRow = wsCat.addRow({
        cat: "Total",
        total: { formula: `SUM(B2:B${cats.length + 1})` },
        pct: 1,
      });
      wsCat.getColumn("total").numFmt = money;
      wsCat.getColumn("pct").numFmt = "0.0%";
      totalCatRow.font = { bold: true };
      totalCatRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: softFill } };
      });
      applyBorders(wsCat);

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-frota-${ano}-${String(mes).padStart(2, "0")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Relatório Excel gerado");
    } catch (e) {
      toast.error("Não foi possível gerar o Excel", {
        description: e instanceof Error ? e.message : undefined,
      });
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
                    {String(m).padStart(2, "0")} — {MESES_PT[m - 1]}
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
                  <SelectItem key={v.id} value={v.id}>{veiculoLabel(v)} ({v.placa})</SelectItem>
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

// Helpers ExcelJS
type AnyRow = { eachCell: (cb: (c: AnyCell) => void) => void; font?: unknown; height?: number };
type AnyCell = {
  fill?: unknown; font?: unknown; alignment?: unknown; border?: unknown;
};
function styleHeader(row: AnyRow, fill: string, color: string) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.font = { bold: true, color: { argb: color } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
    };
  });
  (row as unknown as { font: unknown }).font = { bold: true, color: { argb: color } };
}
function applyBorders(ws: { eachRow: (cb: (r: AnyRow) => void) => void }) {
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.border) {
        cell.border = {
          top: { style: "hair", color: { argb: "FFE2E8F0" } },
          bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
          left: { style: "hair", color: { argb: "FFE2E8F0" } },
          right: { style: "hair", color: { argb: "FFE2E8F0" } },
        };
      }
    });
  });
}
