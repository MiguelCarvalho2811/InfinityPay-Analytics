# InfinitePay Analytics — Documentação Completa do Projeto

## Visão Geral

Extensão Chrome (Manifest V3) para análise automática de vendas da InfinitePay. Opera em operações de infoprodutos low ticket vendidos via WhatsApp X1, onde cada número de WhatsApp está associado a um produto e a uma chave Pix específica.

O problema central: a InfinitePay não exibe o final da chave Pix na listagem de transações (apenas no modal de detalhes de cada transação), e a API de extrato não retorna este campo. A extensão resolve isso abrindo cada transação individualmente para extrair o final da chave Pix do modal e então classificar o produto.

## Stack Técnica

| Componente | Tecnologia |
|---|---|
| Manifest | V3 |
| UI | HTML + CSS (dark theme, Inter font) |
| Scripting | JavaScript (popup + service worker) |
| Injeção | `chrome.scripting.executeScript({ world: "MAIN" })` |
| Armazenamento | `chrome.storage.local` |
| Dashboard | Chart.js (CDN) |
| Ícone | SVG globe icon (`pay_logo.png` como fallback) |

## Estrutura de Arquivos

```
/
├── PRD.md                          # Product Requirements Document original
├── execution_plan.md               # Plano de execução em fases
├── PROJETO_COMPLETO.md             # Este documento
└── extension/
    ├── manifest.json               # Config Manifest V3
    ├── popup.html                  # Popup principal (360px)
    ├── popup.js                    # Lógica principal do popup
    ├── popup.css                   # Estilos do popup
    ├── background.js               # Service worker (interceptação + listeners)
    ├── content.js                  # Content script simples (fallback)
    ├── config.html                 # Página de configuração de produtos
    ├── config.js                   # CRUD de produtos
    ├── config.css                  # Estilos da configuração
    ├── dashboard.html              # Dashboard com gráficos
    ├── dashboard.js                # Lógica do dashboard
    ├── dashboard.css               # Estilos do dashboard
    ├── discovery.md                # Descoberta técnica inicial
    ├── architecture-decision.md    # Decisão arquitetural
    └── pay_logo.png                # Ícone da extensão
```

## Permissões (manifest.json)

- `activeTab` — interagir com a aba atual
- `storage` — salvar produtos, análises, configurações
- `scripting` — injetar scripts na página
- `host_permissions` para `app.infinitepay.io/*` e `cloudwalk-statement-api.services.production.infinitepay.io/*`

## Fluxo de Dados

```
1. Usuário abre app.infinitepay.io/statements
2. Service worker (background.js) detecta navegação e injeta interceptor
3. Interceptor (installInterceptor + patchXHR) captura fetch/XHR da API
4. API response é parseada e armazenada em window.__infyTransactions
5. Usuário clica "Analisar Vendas" no popup
6. Popup executa extractFromPage() → retorna transações de window.__infyTransactions
7. Popup executa extractPixKeysFromDOM() → abre cada <h3> com "Pix", extrai chave do modal
8. Popup faz match entre API data e pix keys extraídas (por valor + nome do pagador)
9. Classificação: cruza pix ending + valor com produtos configurados
10. Resumo exibido no popup + salvo no chrome.storage.local
```

## Arquitetura de Captura de Dados

### Interceptação (background.js, linhas 69–196)

Dois interceptores são injetados na página via `chrome.scripting.executeScript({ world: "MAIN" })`:

1. **installInterceptor()** — substitui `window.fetch` para capturar chamadas à API CloudWalk. Extrai transações do JSON e armazena em `window.__infyTransactions`. Também guarda respostas brutas em `window.__infyResponses[url + '_full']`.

2. **patchXHR()** — substitui `XMLHttpRequest.prototype.open/send` para capturar requisições XHR que a InfinitePay também utiliza (fallback de transporte).

A injeção ocorre em dois momentos:
- Automaticamente via `chrome.tabs.onUpdated` quando detecta `infinitepay.io/statements` com status `loading`
- Manualmente via mensagem `injectInterceptor` enviada pelo popup

### Extração de Chaves Pix (popup.js, extractPixKeysFromDOM, linhas 394–481)

A API de extrato NÃO retorna o final da chave Pix. É necessário abrir o modal de cada transação:

1. Encontra elementos `<h3>` contendo "Pix" (são os títulos das transações na lista)
2. Clica no `<h3>` para abrir o drawer/dialog
3. Aguarda mudança na URL (aparece `modal=`) + renderização do `<dialog[open]>`
4. Extrai valor com regex: `/\+?\s*R?\$?\s*([\d.,]+)/`
5. Extrai final da chave Pix com regex: `/chave pix[\s\S]*?(\d{3,6})(?!\d)/i`
6. Fecha o dialog clicando em `button[data-testid='icon-icon-navigation-back']`
7. Match entre API data e pix keys: compara por `Math.abs(valor - tx.valor) < 0.01` + nome do pagador

### Content script (content.js, 16 linhas)

Content script simples injetado automaticamente pelo manifest. Substitui `window.fetch` para capturar `__infyLastResponse` (fallback mais antigo, anterior à abordagem do service worker).

Hoje o content script é parcialmente redundante com o interceptor do background.js, mas mantido como fallback.

## Fluxo do Popup (popup.js)

```
DOMContentLoaded:
  ├── checkConfig() — verifica se há produtos configurados
  ├── redirectToStatements() — se não estiver na página de extratos, redireciona
  └── Adiciona listeners:
      ├── btnAnalyze → analyzeSales() (Shift+Click = debug)
      ├── btnConfig → openPage('config.html')
      └── btnDashboard → openPage('dashboard.html')

analyzeSales():
  ├── Verifica produtos configurados
  ├── Envia injectInterceptor mensagem
  ├── Executa extractFromPage() (MAIN world)
  ├── Se data selecionada, filtra transações
  ├── Executa extractPixKeysFromDOM() (MAIN world, até 999 transações)
  ├── Match: API data + pix keys (por valor + nome)
  ├── classifyTransactions() — cruza pix ending + valor com config
  ├── generateSummary() — calcula métricas
  ├── saveAnalysis() — salva no chrome.storage.local
  └── displaySummary() — renderiza cards
```

## Configuração de Produtos

Cada produto possui (config.html + config.js):

| Campo | Tipo | Exemplo |
|---|---|---|
| Nome | Texto | Airfryer |
| Final Pix | 4 dígitos | 8527 |
| Pacote Completo | R$ | 19.90 |
| Pacote Básico | R$ | 9.90 |
| UpCompleto | R$ | 4.90 |
| Upsells (0+) | R$[] | [7.90] |

Armazenamento: `chrome.storage.local` como `products: [...]`

## Dashboard (dashboard.html + dashboard.js)

- Seletor de período: Hoje / Semana / Mês
- 4 cards: Receita Total, Vendas, Ticket Médio, Upsells
- Ranking de produtos (barras horizontais)
- Gráfico de receita diária (Chart.js bar)
- Gráfico de receita por produto (Chart.js doughnut)
- Exportação CSV e JSON
- Persistência: todas as análises salvas em `analyses[]` no `chrome.storage.local`

## Casos Conhecidos e Problemas Resolvidos

### 1. Chave Pix não vem na API

A API CloudWalk (`/api/statements`) retorna transações sem o campo `pixEnding`. Solução: abrir cada transação no modal e extrair do HTML.

### 2. Modal usa elemento `<dialog>`

A InfinitePay usa o elemento nativo HTML `<dialog>` (não uma div com classe). Seletor: `dialog[open]`.

### 3. CSP bloqueia inline scripts

Solução: usar `chrome.scripting.executeScript({ world: "MAIN" })` para injetar código diretamente no contexto da página, bypassando Content Security Policy.

### 4. CPF/CNPJ confundidos com chave Pix

O DOM contém textos como `***631548**` (CPF) e `*****1100001**` (CNPJ) que também correspondem ao padrão `****1234`. Solução: buscar pelo label "Chave Pix" no texto do modal: `chave pix[\s\S]*?(\d{3,6})(?!\d)`

### 5. Redirecionamento automático

Ao clicar no ícone, se não estiver em `infinitepay.io/statements`, a extensão redireciona e aguarda o carregamento completo antes de limpar a mensagem de status.

### 6. Produtos com mesmo valor base

Airfryer e Pudim têm tickets idênticos (19.90 e 9.90). Apenas Marinadas tem upsell único (7.90 vs 3.90). Match apenas por valor é insuficiente — necessário extrair a chave Pix de cada transação.

## Produtos Atuais (Configuração Real)

| Produto | Final Pix | Completo | Básico | UpCompleto | Upsells |
|---|---|---|---|---|---|
| Airfryer | 8527 | 19.90 | 9.90 | 4.90 | — |
| Pudim | 6472 | 19.90 | 9.90 | 4.90 | — |
| Marinadas | 4356 | 19.90 | 9.90 | 4.90 | 7.90 |

> Nota: Airfryer e Pudim possuem os mesmos preços base — a única diferença é o final da chave Pix. Marinadas se distingue por ter um upsell de valor diferente.

## Estado Atual do Desenvolvimento

- **Concluído:** MVP funcional com extração de chaves Pix via modal, classificação por produto, relatório diário, dashboard histórico, exportação CSV/JSON, redirecionamento automático
- **Em andamento:** Validação do produto Marinadas (teste com mais de 80 transações para confirmar que aparece na classificação)
- **Observado:** Extração de 29/30 transações funcionou (16 Airfryer, 13 Pudim); quando configurado para "ilimitado" com 80+ transações, popup fechou antes de terminar (timeout ~3.5 min)

## Próximos Passos

1. Testar com limite alto num dia com 80+ transações para confirmar Marinadas
2. Se popup fechar por timeout, implementar processamento em chunks com feedback de progresso
3. Após estabilização, verificar breakdown real vs. vendas
4. Testar com diferentes volumes (dia baixo, 1 transação)
5. Considerar Dashboard Web (Next.js + Supabase) como evolução SaaS
