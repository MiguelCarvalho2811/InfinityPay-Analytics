# InfinitePay Analytics

Extensão Chrome que analisa automaticamente vendas na InfinitePay e classifica por produto usando o final da chave Pix.

## Funcionalidades

- Abre cada transação Pix e extrai valor + final da chave Pix do modal
- Classifica vendas por produto automaticamente
- Ignora Pix enviados (apenas recebidos são contabilizados)
- Dashboard com resumo, ranking e detalhamento por produto
- Configuração de produtos com tickets principais e upsells
- Exportação CSV e JSON
- Scroll automático para carregar todas as transações

## Como usar

1. Instale a extensão no Chrome
2. Configure seus produtos (nome, final da chave Pix, valores) em **Configurações**
3. Acesse `app.infinitepay.io/statements` e filtre o período desejado
4. Clique em **Analisar Vendas**
5. Veja os resultados no popup ou no **Dashboard**

## Stack

Manifest V3 · JavaScript · Chrome Extensions API · Chart.js

## Licença

MIT
