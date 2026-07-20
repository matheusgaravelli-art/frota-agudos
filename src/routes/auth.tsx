import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/painel" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: "/painel" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Já pode acessar.");
        navigate({ to: "/painel" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mb-2">
            <Truck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Gestão de Frota</CardTitle>
          <CardDescription>
            {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "login"
                ? "Não tem conta? Criar uma agora"
                : "Já tem conta? Entrar"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
