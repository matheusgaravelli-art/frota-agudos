import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analisarVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ veiculoId: z.string().uuid(), kmAtual: z.number().nonnegative().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, erro: "Recurso de IA não configurado." };

    const sb = context.supabase;
    const [v, m, c] = await Promise.all([
      sb.from("veiculos").select("marca_modelo, tipo, placa, codigo, status").eq("id", data.veiculoId).single(),
      sb.from("manutencoes").select("peca_servico, data, km, oficina, observacoes, valor").eq("veiculo_id", data.veiculoId).order("data"),
      sb.from("custos").select("tipo, valor, km, data, descricao").eq("veiculo_id", data.veiculoId).order("data"),
    ]);
    if (v.error) return { ok: false as const, erro: "Veículo não encontrado." };
    const manut = m.data ?? [];
    const custos = c.data ?? [];
    if (manut.length === 0)
      return { ok: false as const, erro: "Este veículo ainda não tem manutenções registradas. Registre o histórico primeiro." };

    const kmMax = Math.max(0, ...custos.map((x) => x.km ?? 0), ...manut.map((x) => x.km ?? 0));
    const contexto = {
      veiculo: v.data,
      km_atual_informado: data.kmAtual ?? kmMax ?? null,
      manutencoes: manut,
      custos,
    };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions:
          "Você é um especialista em manutenção de frotas municipais. Responda em português do Brasil, linguagem simples, sem termos técnicos desnecessários. Use exatamente estas seções com títulos em linha própria: 'Falhas recorrentes', 'Pontos de atenção', 'Próximos cuidados recomendados' (com KM ou prazo estimado), 'Resumo'. Use listas com '- '. Não use markdown com asteriscos ou #. Máximo de 300 palavras. Se os dados forem poucos, diga isso.",
        prompt: `Dados do veículo em JSON:\n${JSON.stringify(contexto)}`,
        providerOptions: {
          openai: {
            store: false,
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const texto = (await result.text).replace(/\*\*|^#+\s*/gm, "").trim();
      if (!texto) return { ok: false as const, erro: "A IA não retornou uma análise. Tente novamente mais tarde." };
      return { ok: true as const, texto };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 429) return { ok: false as const, erro: "Muitas análises seguidas. Aguarde um minuto e tente de novo." };
      if (status === 402 || status === 403)
        return { ok: false as const, erro: "Os créditos de IA acabaram ou estão bloqueados. Fale com o administrador." };
      console.error(e);
      return { ok: false as const, erro: "Não foi possível gerar a análise agora." };
    }
  });
