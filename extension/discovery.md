# Fase 0 — Descoberta Técnica InfinitePay

## Tecnologia

- **Framework:** Next.js App Router (Turbopack)
- **Linguagem:** JavaScript / TypeScript (React Server Components)
- **Estado:** Client-side via React state/context (sem Redux ou Zustand detectado no HTML SSR)
- **Estilização:** Tailwind CSS com suporte a dark mode
- **Autenticação:** QR Code via app mobile + JWT (cookies)

## Arquitetura de Dados

### Fluxo de dados de transações

1. Usuário faz login via QR Code no app mobile
2. App redireciona para dashboard web (`app.infinitepay.io`)
3. Dashboard carrega via React Server Components (RSC)
4. Dados de extrato/transações são buscados via API client-side após hidratação
5. API principal: `cloudwalk-statement-api.services.production.infinitepay.io`

### Endpoints identificados

| Endpoint | Provável uso |
|---|---|
| `cloudwalk-statement-api.services.production.infinitepay.io/api/statements` | Extrato completo de transações |
| `/api/statements` (relativo) | Possível proxy interno |
| `api.checkout.infinitepay.io/links` | Gerenciamento de links de pagamento |
| `api.checkout.infinitepay.io/invoices` | Faturamento |
| `api.checkout.infinitepay.io/payment_check` | Verificação de pagamento |

### Campos do modelo de dados identificados

```
transaction_amount, transaction_details, transaction_nsu,
transaction_origin, transaction_time, transaction_title,
transaction_type, charge_date, charge_due_date, charge_settlement,
payment_method (bank_slip, card, pix), payment_status (paid, pending, canceled, refunded),
pixEnding, pixKeyEnding, pixKey, finalPix, pix_key_ending,
valor, amount, value, data, date, createdAt
```

## Abordagens de Captura

### Prioridade 1 — Estado interno (NOVO)

Next.js App Router NÃO expõe `__NEXT_DATA__` para dados carregados via API client-side.
- `__NEXT_DATA__` só existe para páginas SSR/SSG, não para dados dinâmicos
- React fiber tree pode ser traversada mas é frágil (varia por versão)
- **Recomendação:** Tentar `__NEXT_DATA__` primeiro (pode existir em algumas páginas),
  depois tentar `window.__INITIAL_STATE__` ou `window.__PRELOADED_STATE__`

### Prioridade 2 — Interceptação de fetch (Funcionando)

O interceptador atual captura respostas de fetch. Melhorias necessárias:
- Adicionar padrões de URL adicionais (`/v2/`, `/v3/`, `/charges`, `/settlements`)
- Interceptar também `XMLHttpRequest` (caso a API use XHR em vez de fetch)
- Capturar headers de autenticação para possível reuso

### Prioridade 3 — Scraping DOM (Fallback)

A página usa Tailwind CSS, sem classes semânticas para tabelas.
- `data-testid` é raro na página pública (5 encontrados)
- Após login, a página pode expor `data-testid` em componentes de tabela
- Seletores genéricos + busca por padrões financeiros (R$, pix, etc.)

## Conclusão

A abordagem mais robusta é manter a interceptação de fetch como prioridade,
com fallback para scraping DOM. A tentativa de estado interno (`__NEXT_DATA__`)
deve ser mantida como的第一步 rápida, mas não confiável como fonte primária.
