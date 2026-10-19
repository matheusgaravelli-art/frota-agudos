import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listVeiculos,
  statusVeiculoLabel,
  ordenarVeiculos,
  type StatusVeiculo,
  veiculoTitulo,
} from "@/lib/frota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  head: () => ({
    meta: [
      { title: "Relatórios da frota | Gestão de Frota" },
      {
        name: "description",
        content:
          "Relatórios gerenciais da frota em PDF e Excel: situação dos veículos por departamento, tipo e situação.",
      },
      { property: "og:title", content: "Relatórios da frota | Gestão de Frota" },
      {
        property: "og:description",
        content: "Gere relatórios gerenciais da frota em PDF e Excel com filtros por departamento, tipo e situação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});


const STATUS_ORDEM: StatusVeiculo[] = ["ativo", "manutencao", "desativado"];

function RelatoriosPage() {
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });

  const hoje = new Date();
  const [veiculoId, setVeiculoId] = useState<string>("todos");
  const [dep, setDep] = useState<string>("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [situacoes, setSituacoes] = useState<Set<StatusVeiculo>>(
    () => new Set<StatusVeiculo>(STATUS_ORDEM),
  );
  const [nomeArquivoInput, setNomeArquivoInput] = useState<string>("");

  const toggleSituacao = (s: StatusVeiculo) => {
    setSituacoes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const todosVeiculos = veiculos.data ?? [];

  const departamentos = useMemo(
    () =>
      Array.from(new Set(todosVeiculos.map((v) => (v.departamento || "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })),
    [todosVeiculos],
  );
  const tipos = useMemo(
    () =>
      Array.from(new Set(todosVeiculos.map((v) => (v.tipo || "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })),
    [todosVeiculos],
  );

  const veiculosFiltrados = useMemo(
    () =>
      ordenarVeiculos(
        todosVeiculos.filter((v) => {
          if (veiculoId !== "todos" && v.id !== veiculoId) return false;
          if (dep !== "todos" && (v.departamento || "").trim() !== dep) return false;
          if (tipo !== "todos" && (v.tipo || "").trim() !== tipo) return false;
          if (!situacoes.has((v.status ?? "ativo") as StatusVeiculo)) return false;
          return true;
        }),
      ),
    [todosVeiculos, veiculoId, dep, tipo, situacoes],
  );

  const veiculoNomeMap = useMemo(() => {
    const m = new Map<string, string>();
    todosVeiculos.forEach((v) => m.set(v.id, `${veiculoTitulo(v)} (${v.placa})`));
    return m;
  }, [todosVeiculos]);

  const porStatus = useMemo(() => {
    const m = new Map<StatusVeiculo, number>();
    STATUS_ORDEM.forEach((s) => m.set(s, 0));
    veiculosFiltrados.forEach((v) => {
      const s = (v.status ?? "ativo") as StatusVeiculo;
      m.set(s, (m.get(s) ?? 0) + 1);
    });
    return m;
  }, [veiculosFiltrados]);

  const ativos = porStatus.get("ativo") ?? 0;
  const naoAtivos = (porStatus.get("manutencao") ?? 0) + (porStatus.get("desativado") ?? 0);

  const porDepartamento = useMemo(() => {
    const m = new Map<string, { total: number; ativos: number }>();
    veiculosFiltrados.forEach((v) => {
      const k = (v.departamento || "Sem departamento").trim() || "Sem departamento";
      const atual = m.get(k) ?? { total: 0, ativos: 0 };
      atual.total += 1;
      if ((v.status ?? "ativo") === "ativo") atual.ativos += 1;
      m.set(k, atual);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [veiculosFiltrados]);

  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    veiculosFiltrados.forEach((v) => {
      const k = (v.tipo || "Não informado").trim() || "Não informado";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [veiculosFiltrados]);

  const situacaoLabelMap: Record<StatusVeiculo, string> = {
    ativo: "Ativo",
    manutencao: "Em Manutenção",
    desativado: "Inativo",
  };
  const situacaoFiltroLabel =
    situacoes.size === STATUS_ORDEM.length
      ? null
      : situacoes.size === 0
        ? null
        : `Situação: ${STATUS_ORDEM.filter((s) => situacoes.has(s)).map((s) => situacaoLabelMap[s]).join(", ")}`;

  const escopoLabel = [
    veiculoId === "todos" ? null : veiculoNomeMap.get(veiculoId) ?? "—",
    dep === "todos" ? null : `Departamento: ${dep}`,
    tipo === "todos" ? null : `Tipo: ${tipo}`,
    situacaoFiltroLabel,
  ]
    .filter(Boolean)
    .join(" • ") || "Frota completa";
  const nomeArquivoPadrao = `relatorio-frota-${hoje.toISOString().slice(0, 10)}`;
  const nomeArquivoPadrao = `relatorio-frota-${ano}-${mes === "todos" ? "ano" : String(mes).padStart(2, "0")}`;
  const nomeArquivo =
    nomeArquivoInput.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() ||
    nomeArquivoPadrao;


  const exportPDF = async () => {
    if (situacoes.size === 0) {
      toast.error("Selecione ao menos uma situação", {
        description: "Marque Ativo, Inativo ou Em Manutenção no filtro de Situação.",
      });
      return;
    }
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const M = 16;
      const brand: [number, number, number] = [15, 23, 42];
      const line: [number, number, number] = [203, 213, 225];
      const muted: [number, number, number] = [100, 116, 139];
      const soft: [number, number, number] = [246, 248, 251];
      const lastY = () =>
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      const secao = (titulo: string, y: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...brand);
        doc.text(titulo.toUpperCase(), M, y);
        doc.setDrawColor(...line);
        doc.setLineWidth(0.3);
        doc.line(M, y + 2, pageW - M, y + 2);
        return y + 6;
      };

      const tabela = (
        y: number,
        head: string[],
        body: (string | number)[][],
        opts?: Record<string, unknown>,
      ) => {
        autoTable(doc, {
          startY: y,
          head: [head],
          body: body.length > 0 ? body : [["Sem registros", ...head.slice(1).map(() => "")]],
          theme: "plain",
          headStyles: {
            fillColor: soft,
            textColor: brand,
            fontStyle: "bold",
            fontSize: 9,
            cellPadding: 2.6,
            lineWidth: { bottom: 0.3 },
            lineColor: line,
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 2.4,
            textColor: [30, 41, 59],
            lineWidth: { bottom: 0.1 },
            lineColor: [232, 237, 243],
          },
          footStyles: { fontSize: 9, fontStyle: "bold", textColor: brand, fillColor: soft },
          margin: { left: M, right: M },
          ...opts,
        });
        return lastY();
      };

      // Capa / cabeçalho
      doc.setFillColor(...brand);
      doc.rect(0, 0, pageW, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text("Relatório Gerencial de Frota", M, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${escopoLabel}`, M, 22);
      doc.setFontSize(8.5);
      doc.text(
        `Emitido em ${hoje.toLocaleDateString("pt-BR")} ${hoje.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        pageW - M,
        22,
        { align: "right" },
      );

      // Situação da frota
      let y = secao("Situação da frota", 42);
      y = tabela(
        y,
        ["Situação", "Veículos", "% da frota"],
        [
          ...STATUS_ORDEM.map((s) => [
            statusVeiculoLabel[s],
            String(porStatus.get(s) ?? 0),
            veiculosFiltrados.length > 0
              ? (((porStatus.get(s) ?? 0) / veiculosFiltrados.length) * 100).toFixed(1) + "%"
              : "—",
          ]),
        ],
        {
          foot: [["Total de veículos", String(veiculosFiltrados.length), "100,0%"]],
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...muted);
      doc.text(
        `Ativos: ${ativos}  •  Fora de operação (manutenção ou desativados): ${naoAtivos}`,
        M,
        y + 6,
      );

      // Por departamento
      y = secao("Veículos por departamento", y + 14);
      y = tabela(
        y,
        ["Departamento", "Veículos", "Ativos"],
        porDepartamento.map(([d, v]) => [d, String(v.total), String(v.ativos)]),
        { columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } } },
      );

      // Por tipo
      y = secao("Veículos por tipo", y + 10);
      y = tabela(
        y,
        ["Tipo", "Veículos"],
        porTipo.map(([t, n]) => [t, String(n)]),
        { columnStyles: { 1: { halign: "right" } } },
      );


      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...line);
        doc.setLineWidth(0.2);
        doc.line(M, pageH - 12, pageW - M, pageH - 12);
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.setFont("helvetica", "normal");
        doc.text("Gestão de Frota", M, pageH - 7);
        doc.text(`Página ${i} de ${pageCount}`, pageW - M, pageH - 7, { align: "right" });
      }

      doc.save(`${nomeArquivo}.pdf`);
      toast.success("Relatório PDF gerado");
    } catch (e) {
      toast.error("Não foi possível gerar o PDF", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const exportExcel = async () => {
    if (situacoes.size === 0) {
      toast.error("Selecione ao menos uma situação", {
        description: "Marque Ativo, Inativo ou Em Manutenção no filtro de Situação.",
      });
      return;
    }
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "Gestão de Frota";
      wb.created = new Date();

      const brandFill = "FF0F172A";
      const softFill = "FFF1F5F9";
      const white = "FFFFFFFF";
      const money = "R$ #,##0.00";
      const intFmt = "#,##0";

      type WsLike = {
        mergeCells: (r: string) => void;
        getCell: (r: string) => { value: unknown; font: unknown; fill: unknown; alignment: unknown };
        getRow: (n: number) => { height: number };
      };
      const tituloBloco = (ws: WsLike, texto: string, span: string, altura = 24) => {
        ws.mergeCells(span);
        const c = ws.getCell(span.split(":")[0]);
        c.value = texto;
        c.font = { bold: true, size: 12, color: { argb: white } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandFill } };
        c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        ws.getRow(Number(span.split(":")[0].replace(/\D/g, ""))).height = altura;
      };

      // ---------- Resumo ----------
      const ws = wb.addWorksheet("Resumo", { views: [{ showGridLines: false }] });
      ws.columns = [{ width: 34 }, { width: 22 }, { width: 16 }];

      tituloBloco(ws, "Relatório Gerencial de Frota", "A1:C1", 30);
      ws.mergeCells("A2:C2");
      const sub = ws.getCell("A2");
      sub.value = `${periodoLabel} — ${escopoLabel} — emitido em ${hoje.toLocaleDateString("pt-BR")}`;
      sub.font = { italic: true, color: { argb: "FF64748B" } };
      sub.alignment = { horizontal: "left", indent: 1 };

      let row = 4;
      tituloBloco(ws, "Situação da frota", `A${row}:C${row}`);
      row += 1;
      const cab = ws.getRow(row++);
      cab.values = ["Situação", "Veículos", "% da frota"];
      styleHeader(cab, softFill, brandFill);
      STATUS_ORDEM.forEach((s) => {
        const r = ws.getRow(row++);
        r.getCell(1).value = statusVeiculoLabel[s];
        r.getCell(2).value = porStatus.get(s) ?? 0;
        r.getCell(2).numFmt = intFmt;
        r.getCell(3).value =
          veiculosFiltrados.length > 0 ? (porStatus.get(s) ?? 0) / veiculosFiltrados.length : 0;
        r.getCell(3).numFmt = "0.0%";
      });
      const totFrota = ws.getRow(row++);
      totFrota.getCell(1).value = "Total de veículos";
      totFrota.getCell(2).value = veiculosFiltrados.length;
      totFrota.getCell(3).value = veiculosFiltrados.length > 0 ? 1 : 0;
      totFrota.getCell(3).numFmt = "0.0%";
      totFrota.font = { bold: true };
      totFrota.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: softFill } };
      });

      row += 1;
      const rAtivos = ws.getRow(row++);
      rAtivos.getCell(1).value = "Ativos";
      rAtivos.getCell(1).font = { bold: true };
      rAtivos.getCell(2).value = ativos;
      const rFora = ws.getRow(row++);
      rFora.getCell(1).value = "Fora de operação (manutenção / desativados)";
      rFora.getCell(1).font = { bold: true };
      rFora.getCell(2).value = naoAtivos;

      // ---------- Veículos ----------
      const wsV = wb.addWorksheet("Veículos", { views: [{ state: "frozen", ySplit: 1 }] });
      wsV.columns = [
        { header: "Departamento", key: "dep", width: 28 },
        { header: "Marca/Modelo", key: "modelo", width: 28 },
        { header: "Placa", key: "placa", width: 14 },
        { header: "Tipo", key: "tipo", width: 18 },
        { header: "Cor", key: "cor", width: 14 },
        { header: "Situação", key: "status", width: 18 },
      ];
      styleHeader(wsV.getRow(1), brandFill, white);
      veiculosFiltrados.forEach((v) => {
        wsV.addRow({
          dep: v.departamento || "Sem departamento",
          modelo: veiculoTitulo(v),
          placa: v.placa,
          tipo: v.tipo || "—",
          cor: v.cor || "—",
          status: statusVeiculoLabel[(v.status ?? "ativo") as StatusVeiculo],
          codigo: v.codigo || v.nome || "—",
        });
      });
      wsV.autoFilter = { from: "A1", to: "G1" };
      applyBorders(wsV);


      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nomeArquivo}.xlsx`;
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


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" /> Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Situação da frota — por departamento, tipo, situação ou veículo
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Departamento</Label>
            <Select value={dep} onValueChange={setDep}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de veículo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
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
                {ordenarVeiculos(todosVeiculos).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {veiculoTitulo(v)} ({v.placa})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Situação</Label>
            <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-input bg-transparent px-3 py-2">
              {STATUS_ORDEM.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-normal"
                >
                  <Checkbox
                    checked={situacoes.has(s)}
                    onCheckedChange={() => toggleSituacao(s)}
                    aria-label={situacaoLabelMap[s]}
                  />
                  {situacaoLabelMap[s]}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                setDep("todos");
                setTipo("todos");
                setVeiculoId("todos");
                setSituacoes(new Set<StatusVeiculo>(STATUS_ORDEM));
              }}
            >
              Relatório completo
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <MiniStat label="Veículos" value={String(veiculosFiltrados.length)} />
        <MiniStat label="Ativos" value={String(ativos)} />
      </div>

      <Card>
        <CardContent className="py-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-2 flex-1">
            <Label htmlFor="nome-arquivo">Nome do arquivo</Label>
            <Input
              id="nome-arquivo"
              value={nomeArquivoInput}
              onChange={(e) => setNomeArquivoInput(e.target.value)}
              placeholder={nomeArquivoPadrao}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Se ficar em branco, será usado o nome sugerido: {nomeArquivoPadrao}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={exportPDF} size="lg" className="gap-2">
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button onClick={exportExcel} size="lg" variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>
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
type AnyCell = { fill?: unknown; font?: unknown; alignment?: unknown; border?: unknown };
function styleHeader(row: AnyRow, fill: string, color: string) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.font = { bold: true, color: { argb: color } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = { bottom: { style: "medium", color: { argb: "FF0F172A" } } };
  });
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
