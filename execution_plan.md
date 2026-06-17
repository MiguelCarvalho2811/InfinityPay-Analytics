# EXECUTION PLAN – InfinitePay Analytics Extension

Versão: 1.0
Status: Planejamento
Objetivo: Construir uma extensão Chrome para análise operacional de vendas X1 via InfinitePay.

---

# Estratégia de Desenvolvimento

O projeto será desenvolvido em entregas incrementais.

Princípios:

* Gerar valor desde o primeiro MVP;
* Evitar overengineering;
* Validar hipóteses técnicas cedo;
* Priorizar captura de dados sem scraping visual;
* Manter possibilidade futura de virar SaaS.

---

# FASE 0 – DESCOBERTA TÉCNICA

Objetivo:
Determinar a melhor fonte de dados dentro da InfinitePay.

Duração estimada:
2 a 4 horas.

Entrega:
Documento técnico de viabilidade.

---

## Chunk 0.1 – Mapeamento da aplicação

Objetivos:

* Identificar tecnologia usada.
* Verificar arquitetura.
* Mapear dados disponíveis.

Tarefas:

* Abrir DevTools;
* Inspecionar Sources;
* Confirmar uso de Next.js;
* Identificar Redux/Zustand/Context;
* Procurar window.**NEXT_DATA**;
* Procurar objetos globais relevantes.

Critérios:

* Identificar possíveis fontes de transações.

Output:

discovery.md

---

## Chunk 0.2 – Interceptação de API

Objetivos:

Descobrir se existe endpoint com extrato completo.

Tarefas:

* Abrir aba Network;
* Filtrar Fetch/XHR;
* Navegar pelo extrato;
* Registrar endpoints;
* Registrar payloads;
* Registrar responses.

Documentar:

Método HTTP;
Headers;
Auth;
Formato da resposta.

Critério:

Confirmar se os dados necessários existem na API.

Output:

api-discovery.md

---

## Chunk 0.3 – Decisão arquitetural

Escolher abordagem.

Prioridade:

1. API;
2. Estado interno;
3. Scraping HTML;
4. Automação visual.

Critério:

Registrar decisão final.

Output:

architecture-decision.md

---

# FASE 1 – MVP OPERACIONAL

Objetivo:

Gerar relatório diário utilizável.

Duração:
1–2 dias.

Entrega:
Extensão funcional.

---

## Chunk 1.1 – Setup da extensão

Tarefas:

Criar estrutura:

/extension
manifest.json
popup.html
popup.js
popup.css
background.js
content.js

Configurar:

Manifest V3.

Permissões:

activeTab;
storage;
scripting;

Critérios:

Extensão carrega.

---

## Chunk 1.2 – Popup inicial

Objetivo:

Criar interface da extensão.

Tarefas:

Adicionar:

* título;
* botão analisar;
* botão configurações;
* status.

Critérios:

Popup funcional.

---

## Chunk 1.3 – Configuração de produtos

Objetivo:

Permitir cadastro.

Campos:

Produto;
Final Pix;
Tickets principais;
Upsells.

Tarefas:

CRUD completo.

Critérios:

Usuário consegue:

criar;
editar;
remover.

---

## Chunk 1.4 – Persistência local

Objetivo:

Salvar configurações.

Tecnologia:

chrome.storage.local.

Critérios:

Dados persistem após fechar navegador.

---

## Chunk 1.5 – Coleta automática

Objetivo:

Capturar transações.

Implementação:

SE API encontrada:

capturar JSON.

SENÃO:

usar estado interno.

SENÃO:

usar scraping.

Critérios:

Retornar:

id;
valor;
data;
pixEnding.

---

## Chunk 1.6 – Motor de classificação

Objetivo:

Associar transações.

Regras:

pixEnding;
valor.

Saída:

produto;
tipo.

Critérios:

Classificação correta.

---

## Chunk 1.7 – Relatório diário

Objetivo:

Gerar resumo.

Métricas:

Receita;
Vendas;
Upsells;
Ticket.

Critérios:

Exibição correta.

---

# FASE 2 – DASHBOARD LOCAL

Objetivo:

Histórico e análise.

Duração:
1–2 dias.

Entrega:
Dashboard completo.

---

## Chunk 2.1 – Persistência histórica

Objetivo:

Salvar análises.

Formato:

{
date,
transactions,
summary
}

Critérios:

Análises anteriores recuperáveis.

---

## Chunk 2.2 – Banco local

Tecnologia:

chrome.storage.local

Estrutura:

analyses[]

Critérios:

Armazenar histórico.

---

## Chunk 2.3 – Dashboard

Métricas:

Hoje;
Semana;
Mês.

Cards:

Receita;
Vendas;
Ticket.

Critérios:

Atualização dinâmica.

---

## Chunk 2.4 – Ranking

Exibir:

Produtos ordenados.

Critérios:

Maior receita primeiro.

---

## Chunk 2.5 – Gráficos

Biblioteca:

Chart.js.

Gráficos:

Receita diária;
Receita por produto.

Critérios:

Renderização correta.

---

# FASE 3 – EXPORTAÇÕES

Objetivo:

Permitir uso externo.

Duração:
4–6 horas.

---

## Chunk 3.1 – CSV

Campos:

data;
produto;
valor;
tipo;
pix.

Critérios:

Download funcional.

---

## Chunk 3.2 – JSON

Exportar histórico completo.

Critérios:

Formato válido.

---

## Chunk 3.3 – Backup

Objetivo:

Importação/exportação.

Critérios:

Restaurar ambiente.

---

# FASE 4 – META ADS

Objetivo:

Calcular rentabilidade.

Duração:
1 dia.

---

## Chunk 4.1 – Cadastro de custos

Campos:

Produto;
Gasto.

Critérios:

Persistência.

---

## Chunk 4.2 – Cálculos

Gerar:

CPA;
ROAS;
ROI;
Lucro;
Margem.

Critérios:

Fórmulas corretas.

---

## Chunk 4.3 – Dashboard financeiro

Exibir:

Produto;
Receita;
Lucro;
ROI.

Critérios:

Atualização automática.

---

# FASE 5 – HARDENING

Objetivo:

Preparar para uso contínuo.

Duração:
1 dia.

---

## Chunk 5.1 – Tratamento de erros

Cenários:

InfinitePay fora do ar;
Mudança de layout;
Timeout.

Critérios:

Mensagens claras.

---

## Chunk 5.2 – Logs

Objetivo:

Facilitar debugging.

Critérios:

Modo debug ativável.

---

## Chunk 5.3 – Testes manuais

Fluxos:

Primeiro uso;
Configuração;
Análise;
Exportação.

Critérios:

Sem falhas críticas.

---

# FASE 6 – EVOLUÇÃO PARA SAAS

Objetivo:

Escalabilidade.

Sem prazo imediato.

---

## Chunk 6.1

Supabase.

---

## Chunk 6.2

Autenticação.

---

## Chunk 6.3

Sincronização.

---

## Chunk 6.4

Dashboard web.

---

## Chunk 6.5

Multiusuário.

---

# DEFINIÇÃO DE PRONTO (DoD)

Cada chunk deve possuir:

* Código implementado;
* Testado manualmente;
* Sem erros no console;
* Comentários essenciais;
* Commit realizado;
* Documentação atualizada.

---

# ROADMAP RESUMIDO

Semana 1:

* Fase 0
* Fase 1

Resultado:
Relatório diário automático.

Semana 2:

* Fase 2
* Fase 3

Resultado:
Dashboard histórico completo.

Semana 3:

* Fase 4
* Fase 5

Resultado:
Controle operacional + financeiro.

Futuro:

* Fase 6

Resultado:
Produto/SaaS escalável.
