# Decisão Arquitetural — Fonte de Dados

## Data: 2026-06-16

## Contexto

A InfinitePay Web usa Next.js App Router com React Server Components.
Dados de transações são carregados via API client-side após autenticação.

## Opções Consideradas

### 1. Interceptação de fetch (ESCOLHIDA)

**Prós:**
- Funciona independente de versão do Next.js
- Captura dados estruturados (JSON)
- Já implementada e testada
- Não requer manipulação de DOM

**Contras:**
- Depende de patterns de URL estáveis
- Pode perder requisições se o timing não for perfeito

### 2. Estado interno (Descartada como fonte primária)

**Prós:**
- Acesso instantâneo sem esperar requisições
- Sem problemas de CORS

**Contras:**
- Next.js App Router NÃO expõe `__NEXT_DATA__` para dados dinâmicos
- React fiber tree traversal é frágil
- Quebra com atualizações do React/Next.js

### 3. Scraping DOM (Fallback)

**Prós:**
- Funciona independente da tecnologia subjacente
- Último recurso quando tudo mais falha

**Contras:**
- Frágil (mudanças de layout quebram seletores)
- Dados não estruturados (requer parsing)
- Mais lento e propenso a erros

## Decisão

**Manter interceptação de fetch como estratégia principal.**

Ordem de tentativas:
1. `window.__NEXT_DATA__` (caso disponível — verificação rápida)
2. fetch interception (já implementado, com URLs expandidas)
3. XMLHttpRequest interception (adicional para cobertura total)
4. DOM scraping via `data-testid` + seletores genéricos (fallback)

## Impactos

- Código existente (`content.js`) requer expansão de padrões de URL
- Adicionar interceptor de XMLHttpRequest para cobertura total
- DOM scraping precisa de seletores mais resilientes
