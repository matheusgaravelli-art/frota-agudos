import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Gestão de Frota" },
      { name: "description", content: "Acesse o sistema de gestão de frota com e-mail e senha." },
      { property: "og:title", content: "Entrar — Gestão de Frota" },
      { property: "og:description", content: "Acesse o sistema de gestão de frota com e-mail e senha." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "recuperar">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Informe seu e-mail.");
    if (!senha) return toast.error("Informe sua senha.");
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "E-mail ou senha incorretos. Verifique e tente novamente."
          : `Não foi possível entrar: ${error.message}`,
      );
      return;
    }
    navigate({ to: "/painel", replace: true });
  };

  const recuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Informe o e-mail cadastrado.");
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setEnviando(false);
    if (error) return toast.error(`Não foi possível enviar o link: ${error.message}`);
    toast.success("Enviamos um link para redefinir sua senha. Confira seu e-mail.");
    setModo("login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Frota</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{modo === "login" ? "Entrar" : "Esqueci minha senha"}</CardTitle>
            <CardDescription>
              {modo === "login"
                ? "Use seu e-mail e senha para acessar o sistema."
                : "Informe seu e-mail e enviaremos um link para criar uma nova senha."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={modo === "login" ? entrar : recuperar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="seu@email.com"
                  className="h-11"
                />
              </div>

              {modo === "login" && (
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    autoComplete="current-password"
                    value={senha}
                    onChange={(ev) => setSenha(ev.target.value)}
                    placeholder="••••••••"
                    className="h-11"
                  />
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={enviando}>
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                {modo === "login" ? "Entrar" : "Enviar link"}
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setModo(modo === "login" ? "recuperar" : "login")}
              >
                {modo === "login" ? "Esqueci minha senha" : "Voltar para o login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
