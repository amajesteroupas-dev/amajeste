# Manual de estoque — Majesté

Guia curto para o dia a dia do admin.

## Como o estoque funciona

- O estoque **não fica no produto** (nome, preço, fotos).
- Fica em cada **variante**: combinação de **tamanho + cor** (ex.: M / Preto).
- O total do produto na lista é a **soma** das variantes.

## Onde mexer (o que usar)

| Objetivo | Onde | O que faz |
|----------|------|-----------|
| Comprar / receber mercadoria | **Admin → Estoque** → Entrada (IN) | Soma unidades e atualiza custo médio |
| Ajuste manual / inventário | **Admin → Estoque** → Ajuste | Define a quantidade correta |
| Saída / perda / amostra | **Admin → Estoque** → Saída (OUT) | Diminui unidades |
| Devolução de cliente | **Admin → Estoque** → Devolução | Devolve unidades |
| Criar produto novo | **Produtos → Novo** | “Estoque inicial” vale para **cada** tamanho×cor |
| Mudar preço, nome, fotos | **Produtos → editar produto** → Salvar produto | **Não altera** estoque |
| Mudar SKU / tamanho / cor | **Produtos → editar** → Variantes | Pode alterar estoque **só** se você digitar no campo |

## Fluxo recomendado no dia a dia

1. Chegou mercadoria → **Estoque** → escolher a variante → tipo **Entrada** → quantidade + custo unitário → salvar.
2. Venda no site → o sistema **baixa sozinho** quando o pedido é criado.
3. Venda WhatsApp / manual → **Financeiro** (venda manual) também baixa o estoque.
4. Contagem física diferente do sistema → **Estoque** → **Ajuste** com a quantidade correta.

## O que NÃO fazer (evita susto)

1. **Não** use o campo Estoque da tela de variantes para registrar compra — use o menu **Estoque**.
2. Ao **editar** uma variante, se o campo Estoque estiver **vazio**, o sistema **mantém** o valor atual (não zera).
3. Para **zerar de propósito**, digite `0` e salve.
4. **Excluir** uma variante que já teve pedido: ela pode só **desativar** (some da loja). O estoque **não é mais zerado** nesse caso.
5. **Salvar produto** (preço, descrição, frete) **nunca** muda estoque.

## Por que “zerou sozinho” (casos conhecidos)

1. **Bug corrigido (jul/2026):** ao editar variante e deixar Estoque em branco, o sistema gravava `0`. Agora branco = manter.
2. **Exclusão de variante com pedidos:** antes desativava **e zerava**. Agora só desativa.
3. **Pedido no site:** o estoque baixa ao **criar** o pedido (mesmo pendente). Pedido cancelado/não pago **ainda não devolve** automaticamente — se precisar, faça **Entrada** ou **Ajuste** no Estoque.
4. **Variante nova** sem quantidade começa em **0**.

## Conferir o histórico

Em **Admin → Estoque**, veja os últimos movimentos (entrada, saída, venda, ajuste). Se o estoque mudou “sozinho”, o movimento mostra a causa (ex.: `Pedido …`, `Ajuste ao editar variante`).

## Checklist rápido para a cliente

- [ ] Compra chegou? → menu **Estoque** → Entrada  
- [ ] Só mudou preço/foto? → Salvar produto (estoque intacto)  
- [ ] Mudou tamanho/cor? → Editar variante; não apague o número do estoque sem querer  
- [ ] Número errado na loja? → Estoque → Ajuste  
- [ ] Dúvida do que aconteceu? → Estoque → últimos movimentos  
