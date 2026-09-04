import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Mail, Plus, ShieldCheck, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import {
  criarUsuario,
  definirPapel,
  enviarRedefinicao,
  excluirUsuario,
  listarUsuarios,
} from "@/lib/usuarios.functions";
import { usePapel, useSessao } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de Usuários — Gestão de Frota" },
      { name: "description", content: "Cadastre usuários e defina quem é administrador do sistema de frota." },
      { property: "og:title", content: "Gestão de Usuários — Gestão de Frota" },
      { property: "og:description", content: "Cadastre usuários e defina quem é administrador do sistema de frota." },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { ehAdmin, carregando } = usePapel();
  const { usuario } = useSessao();
  const qc = useQueryClient();

  const fnListar = useServerFn(listarUsuarios);
  const fnCriar = useServerFn(criarUsuario);
  const fnPapel = useServerFn(definirPapel);
  const fnExcluir = useServerFn(excluirUsuario);
  const fnReset = useServerFn(enviarRedefinicao);

  const lista = useQuery({
    queryKey: ["usuarios"],
    enabled: ehAdmin,
    queryFn: () => fnListar(),
  });

  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<"admin" | "usuario">("usuario");

  const criar = useMutation({
    mutationFn: () => fnCriar({ data: { email: email.trim(), senha, papel } }),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso.");
      setAberto(false);
      setEmail("");
      setSenha("");
      setPapel("usuario");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar o usuário."),
  });

  const trocarPapel = useMutation({
    mutationFn: (v: { userId: string; papel: "admin" | "usuario" }) => fnPapel({ data: v }),
    onSuccess: () => {
      toast.success("Permissão atualizada.");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      qc.invalidateQueries({ queryKey: ["papel"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível alterar a permissão."),
  });

  const remover = useMutation({
    mutationFn: (userId: string) => fnExcluir({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário removido.");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível remover o usuário."),
  });

  const resetar = useMutation({
    mutationFn: (mail: string) =>
      fnReset({ data: { email: mail, redirectTo: `${window.location.origin}/reset-password` } }),
    onSuccess: () => toast.success("Link de redefinição de senha enviado por e-mail."),
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar o link."),
  });

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  if (!ehAdmin) {
    return (
      <Card>
        <CardContent className="p-6 space-y-2">
          <h1 className="text-lg font-semibold">Área restrita</h1>
          <p className="text-sm text-muted-foreground">
            Somente administradores podem ver a gestão de usuários.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground">Quem pode entrar no sistema e com qual permissão.</p>
        </div>

        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button className="h-11">
              <Plus className="h-4 w-4" /> Novo usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
              <DialogDescription>Informe o e-mail e uma senha inicial de acesso.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="novo-email">E-mail</Label>
                <Input id="novo-email" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nova-senha">Senha inicial</Label>
                <Input id="nova-senha" type="text" className="h-11" value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Permissão</Label>
                <Select value={papel} onValueChange={(v) => setPapel(v as "admin" | "usuario")}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="h-11"
                disabled={criar.isPending}
                onClick={() => {
                  if (!email.trim()) return toast.error("Informe o e-mail do usuário.");
                  if (senha.length < 6) return toast.error("A senha inicial precisa ter pelo menos 6 caracteres.");
                  criar.mutate();
                }}
              >
                {criar.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Criar usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {lista.isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando usuários...
        </div>
      )}
      {lista.error && (
        <p className="text-sm text-destructive">Não foi possível carregar a lista de usuários.</p>
      )}

      <div className="space-y-3">
        {lista.data?.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                {u.papel === "admin" ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {u.ultimoAcesso
                    ? `Último acesso: ${new Date(u.ultimoAcesso).toLocaleDateString("pt-BR")}`
                    : "Ainda não acessou"}
                  {u.id === usuario?.id ? " • você" : ""}
                </p>
              </div>
              <Select
                value={u.papel}
                onValueChange={(v) => trocarPapel.mutate({ userId: u.id, papel: v as "admin" | "usuario" })}
              >
                <SelectTrigger className="h-10 w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-10"
                onClick={() => resetar.mutate(u.email)}
                disabled={resetar.isPending}
                title="Enviar link de nova senha"
              >
                <Mail className="h-4 w-4" /> Nova senha
              </Button>
              {u.id !== usuario?.id && (
                <Button
                  variant="outline"
                  className="h-10 text-destructive"
                  onClick={() => {
                    if (confirm(`Remover o acesso de ${u.email}?`)) remover.mutate(u.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
