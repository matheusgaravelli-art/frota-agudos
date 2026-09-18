# Frota Simples

Prompt para o Lovable

Crie um sistema web de gestão de frotas para uso diário, simples e direto — sem excesso de menus ou telas. Interface toda em português do Brasil.

Objetivo

Substituir o controle manual em planilha por um sistema com banco de dados na nuvem, acessível de qualquer lugar (inclusive celular), para acompanhar veículos, custos e vencimentos de documentos de uma frota de gestão municipal/logística.

Stack

Frontend: React + Tailwind, responsivo (funciona bem em celular, já que será usado no dia a dia em campo)

Backend: API REST própria (Node/Express ou equivalente)

Banco de dados: PostgreSQL na nuvem (Supabase)

Autenticação: login simples por e-mail e senha (poucos usuários, sem necessidade de perfis complexos por enquanto)

Deploy: hospedado na nuvem, com domínio próprio depois

Funcionalidades (nessa ordem de prioridade)

1. Cadastro de veículos

Nome/identificação, placa, motorista responsável, KM atual

Lista simples, com busca por placa ou motorista

2. Lançamento de custos

Por veículo: combustível, manutenção, outros custos — com data

Cálculo automático: custo total do mês e custo por KM rodado

3. Controle de vencimentos

Licenciamento, seguro, revisão — com data de vencimento

Alerta visual (verde / amarelo / vermelho) quando faltar menos de 30 dias ou já estiver vencido

4. Painel inicial (dashboard)

Ao abrir o sistema, mostrar de cara: total de veículos, custo total do mês, custo médio por KM da frota, e quantos veículos têm pendência de vencimento

Sem gráficos complexos — só os números que importam, grandes e legíveis

Requisitos de simplicidade

Menu lateral com no máximo 4 itens: Painel, Veículos, Custos, Vencimentos

Formulários curtos, sem campos desnecessários

Cores neutras, boa legibilidade, botões grandes (uso em campo, às vezes no celular)

Sem funcionalidades "bônus" nesta primeira versão (sem relatórios em PDF, sem múltiplos usuários/permissões, sem integração com terceiros) — foco em ter algo funcional e estável primeiro

Requisitos de durabilidade

Dados salvos em banco na nuvem, nunca perdidos ao fechar o navegador

Estrutura pronta para eu adicionar campos ou telas novas depois, sem precisar refazer o sistema

Backup automático do banco de dados

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://frota-agudos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b84ec967-476c-4169-b997-c039219a88e8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
