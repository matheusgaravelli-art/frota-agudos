import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha — Gestão de Frota" },
      { name: "description", content: "Crie uma nova senha de acesso ao sistema de gestão de frota." },
      { property: "og:title", content: "Nova senha — Gestão de Frota" },
      { property: "og:description", content: "Crie uma nova senha de acesso ao sistema de gestão de frota." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== confirma) return toast.error("As duas senhas não são iguais.");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("session")
          ? "O link expirou. Solicite um novo link de redefinição."
          : `Não foi possível salvar: ${error.message}`,
      );
      return;
    }
    toast.success("Senha alterada. Você já pode usar o sistema.");
    navigate({ to: "/painel", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg text-center">Criar nova senha</CardTitle>
          <CardDescription className="text-center">Escolha uma nova senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova">Nova senha</Label>
              <Input id="nova" type="password" className="h-11" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf">Repita a nova senha</Label>
              <Input id="conf" type="password" className="h-11" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-11 text-base" disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
