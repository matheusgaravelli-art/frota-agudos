import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { veiculoLabel, veiculoTitulo } from "@/lib/frota";

type VeiculoOpcao = {
  id: string;
  nome: string | null;
  codigo?: string | null;
  placa: string;
  marca_modelo?: string | null;
};

/** Seleção de veículo com barra de pesquisa por nome, placa ou ID. */
export function VeiculoCombobox({
  veiculos,
  value,
  onChange,
  placeholder = "Selecione o veículo",
}: {
  veiculos: VeiculoOpcao[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const atual = veiculos.find((v) => v.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between font-normal"
        >
          <span className={cn("truncate", !atual && "text-muted-foreground")}>
            {atual ? `${veiculoTitulo(atual)} · ${atual.placa}` : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digite nome, placa ou ID..." />
          <CommandList>
            <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
            <CommandGroup>
              {veiculos.map((v) => (
                <CommandItem
                  key={v.id}
                  value={`${veiculoTitulo(v)} ${v.placa} ${veiculoLabel(v)}`}
                  onSelect={() => {
                    onChange(v.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === v.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">
                    {veiculoTitulo(v)} · {v.placa}
                    {v.codigo ? ` · ${v.codigo}` : ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
