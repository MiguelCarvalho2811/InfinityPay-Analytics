# SPEC / PRD – InfinitePay Analytics para Operações X1 WhatsApp

## Visão Geral

Desenvolver uma extensão para navegadores baseados em Chromium (Google Chrome, Edge, Brave) capaz de analisar automaticamente o histórico de transações da InfinitePay, identificar o faturamento por produto através das chaves Pix utilizadas e gerar relatórios e dashboards para tomada de decisão em operações de infoprodutos low ticket vendidas via WhatsApp X1.

---

# Problema

Atualmente, a InfinitePay não disponibiliza relatórios que permitam identificar facilmente:

* Qual produto gerou determinada venda;
* Qual chave Pix recebeu cada pagamento;
* Separação automática entre venda principal e upsells;
* Faturamento por produto;
* Ticket médio;
* Receita diária e mensal;
* ROI por oferta.

A operação utiliza múltiplos números de WhatsApp, sendo cada número associado a um produto específico.

Exemplo:

* Produto A → WhatsApp 1 → Chave Pix Telefone 1
* Produto B → WhatsApp 2 → Chave Pix Telefone 2
* Produto C → WhatsApp 3 → Chave Pix Telefone 3

Atualmente o controle é manual.

---

# Objetivo

Criar uma solução que permita ao usuário:

* Abrir a InfinitePay no navegador;
* Executar a extensão;
* Obter automaticamente:

  * faturamento do dia;
  * faturamento por produto;
  * ticket médio;
  * quantidade de vendas;
  * quantidade e valor de upsells;
  * faturamento consolidado;
  * exportação para histórico.

Sem necessidade de analisar venda por venda manualmente.

---

# Público-alvo

Operadores de:

* Infoprodutos low ticket;
* WhatsApp X1;
* Meta Ads;
* InfinitePay;
* Operações com múltiplos produtos simultâneos.

---

# Escopo do MVP

## Configuração Inicial

Na primeira execução da extensão, apresentar um assistente de configuração.

Campos:

### Produto

* Nome do produto;
* Últimos 4 dígitos da chave Pix;
* Ticket principal;
* Lista de tickets de upsell.

Exemplo:

Produto: Marinadas

* Final Pix: 1111
* Ticket principal: 19,90
* Upsells:

  * 29,90
  * 39,90

---

Produto: Pudim

* Final Pix: 2222
* Ticket principal: 9,90
* Upsells:

  * 19,90

---

Produto: Ovos

* Final Pix: 3333
* Ticket principal: 14,90
* Upsells:

  * 24,90

---

As configurações devem ser persistidas utilizando:

chrome.storage.local

---

# Fluxo Principal

## Passo 1

Usuário acessa InfinitePay Web.

## Passo 2

Usuário clica na extensão.

Botão:

"Analisar Vendas"

## Passo 3

A extensão identifica automaticamente a tela de extrato.

## Passo 4

A extensão tenta capturar os dados diretamente do HTML ou do estado JavaScript da aplicação.

Ordem de prioridade:

### Prioridade 1

Interceptar dados já carregados em memória:

* window.**NEXT_DATA**
* Redux Store
* Context Providers
* Local State exposto globalmente

Objetivo:

Evitar abrir venda por venda.

---

### Prioridade 2

Interceptar chamadas:

fetch

XMLHttpRequest

Objetivo:

Capturar a resposta da API utilizada pela InfinitePay.

---

### Prioridade 3

Fallback:

Scraping do HTML.

Caso nenhuma das estratégias anteriores funcione, utilizar automação visual abrindo transação por transação.

---

# Dados Esperados por Transação

Cada transação deve retornar:

* id;
* data;
* hora;
* valor;
* nome pagador;
* tipo;
* final da chave Pix;
* descrição;
* status.

Estrutura:

{
"id": "",
"data": "",
"hora": "",
"valor": 19.90,
"pixEnding": "1111",
"pagador": "",
"status": "recebido"
}

---

# Classificação Automática

Cruzar:

valor + chave Pix

para identificar o produto.

Exemplo:

Pix 1111

19,90 → Principal

29,90 → Upsell

39,90 → Upsell

---

# Métricas do Dia

Gerar automaticamente:

## Por produto

* Receita;
* Quantidade de vendas;
* Ticket médio;
* Quantidade de upsells;
* Receita de upsells;
* Receita principal;
* Receita total.

---

## Geral

* Receita total;
* Quantidade total de vendas;
* Ticket médio geral;
* Produto campeão de faturamento.

---

# Dashboard Local

A extensão deve possuir aba Dashboard.

Exibir:

## Cards

Receita Hoje

Quantidade de Vendas

Ticket Médio

Upsells

---

## Ranking

1º Produto

2º Produto

3º Produto

---

## Gráfico Diário

Receita por dia.

---

## Gráfico por Produto

Receita por produto.

---

# Persistência Histórica

Após cada análise concluída:

Salvar automaticamente.

Formato:

JSON.

Exemplo:

2026-06-16.json

---

Estrutura:

{
"date": "2026-06-16",
"transactions": [],
"summary": {}
}

---

Armazenamento inicial:

chrome.storage.local

---

# Exportações

Permitir:

## CSV

Campos:

data;
produto;
valor;
tipo;
pix;

---

## JSON

Relatório completo.

---

# Roadmap Futuro

## Fase 2

Dashboard Web.

Tecnologias:

* Next.js;
* Supabase;
* Vercel.

---

## Fase 3

Integração Meta Ads.

Cadastro manual:

Produto

Gasto do dia

Objetivo:

Calcular:

* Lucro;
* CPA;
* ROI;
* ROAS;
* Margem.

---

## Fase 4

Sincronização automática.

Upload diário para Supabase.

Dashboard acessível por:

desktop;
celular.

---

## Fase 5

SaaS Multiusuário.

Funcionalidades:

* Login;
* Assinaturas;
* Múltiplas contas InfinitePay;
* Compartilhamento com equipe.

---

# Stack Técnica

Extensão:

* Manifest V3;
* JavaScript;
* HTML;
* CSS.

Dashboard Local:

* Chart.js.

Persistência:

* chrome.storage.local.

Backend Futuro:

* Supabase.

Frontend Futuro:

* Next.js.

Hospedagem:

* Vercel.

---

# Critérios de Aceitação

O sistema será considerado aprovado quando:

* O usuário conseguir configurar produtos e Pix apenas uma vez;
* A extensão identificar automaticamente as vendas do dia;
* Não seja necessário abrir transação por transação quando houver acesso aos dados internos;
* O relatório diário seja gerado corretamente;
* O dashboard apresente métricas por produto;
* Os dados históricos sejam preservados;
* Os relatórios possam ser exportados em CSV e JSON.

---

# Métrica de Sucesso

Reduzir o tempo de fechamento operacional diário de aproximadamente 30–60 minutos para menos de 1 minuto, fornecendo visibilidade clara sobre faturamento e performance de cada oferta.
