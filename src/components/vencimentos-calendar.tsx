import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { statusVencimento, tipoDocLabel, type Documento, type TipoDocumento } from "@/lib/frota";

const CAL_STYLES = {
  vencido: "bg-destructive text-destructive-foreground",
  proximo: "bg-warning text-warning-foreground",
  ok: "bg-success text-success-foreground",
} as const;

export function VencimentosCalendar({
  documentos,
  veiculoMap,
  onSelect,
}: {
  documentos: Documento[];
  veiculoMap: Map<string, string>;
  onSelect?: (d: Documento) => void;
}) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const porDia = useMemo(() => {
    const map = new Map<string, Documento[]>();
    documentos.forEach((d) => {
      const arr = map.get(d.vencimento) ?? [];
      arr.push(d);
      map.set(d.vencimento, arr);
    });
    return map;
  }, [documentos]);

  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const offset = new Date(ano, mes, 1).getDay();

  const cells: Array<{ dateISO: string; dia: number } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDias; d++) {
    const iso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ dateISO: iso, dia: d });
  }

  const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const goPrev = () => (mes === 0 ? (setMes(11), setAno(ano - 1)) : setMes(mes - 1));
  const goNext = () => (mes === 11 ? (setMes(0), setAno(ano + 1)) : setMes(mes + 1));

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold capitalize text-sm sm:text-base">{nomeMes}</div>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[10px] sm:text-xs text-center text-muted-foreground font-medium">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const items = porDia.get(c.dateISO) ?? [];
            const isHoje = c.dateISO === hojeISO;
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[56px] sm:min-h-[68px] rounded-md border p-1 text-xs flex flex-col gap-0.5",
                  isHoje ? "border-primary" : "border-border",
                )}
              >
                <div className={cn("text-[10px] sm:text-[11px] font-semibold px-1", isHoje ? "text-primary" : "text-muted-foreground")}>
                  {c.dia}
                </div>
                {items.slice(0, 2).map((d) => {
                  const st = statusVencimento(d.vencimento);
                  const label = tipoDocLabel[d.tipo as TipoDocumento] ?? d.tipo;
                  return (
                    <button
                      key={d.id}
                      onClick={() => onSelect?.(d)}
                      className={cn("text-[9px] sm:text-[10px] leading-tight rounded px-1 py-0.5 truncate text-left", CAL_STYLES[st])}
                      title={`${label} · ${veiculoMap.get(d.veiculo_id) ?? ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
                {items.length > 2 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{items.length - 2}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 pt-1 text-[11px] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-success" /> OK</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Atenção (≤ 30 dias)</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Vencido</span>
        </div>
      </CardContent>
    </Card>
  );
}
