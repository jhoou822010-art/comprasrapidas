# Sistema Inteligente da Vitrine — Compras Rápidas Andrade

Módulo independente que escolhe **quais produtos aparecem e em que ordem** para cada visitante.
Não muda a aparência da loja e **não altera** produtos, preços, imagens, descrições, IDs ou links de afiliado.

## Como funciona

- **Perfis de composição (definidos no painel):** Econômico, Achadinhos, Feminino, Masculino, Tecnologia, Ferramentas, Casa e utilidades e Misto. Cada um define a porcentagem de cada tipo de produto na vitrine.
- **Inteligência individual:** cada visitante ganha um perfil anônimo **guardado só no aparelho dele** (buscas, categorias visitadas, produtos vistos/clicados, faixa de preço). Nada de comportamento vai para o banco. Os interesses perdem força com o tempo (meia‑vida de 21 dias) e uma única busca muda pouco.
- **Combinação:** a vitrine de cada visitante mistura o perfil base com os perfis dos interesses que ele demonstrou, na força escolhida no painel.
- **Renovação:** ao fim do intervalo configurado, cada visitante recebe uma nova seleção, evitando o que já viu nos últimos períodos. Os interesses são mantidos.
- **Onde atua:** Ofertas e Novidades do Início e a ordem dos produtos dentro das categorias. Carrossel, Destaques, banners, busca e página do produto ficam como estão.

## Arquivos

| Arquivo | O quê |
|---|---|
| `js/vitrine.js` (novo) | Motor: regras, perfil individual, combinação, renovação, retorno à vitrine original |
| `js/vitrine-admin.js` (novo) | Aba “Sistema Inteligente da Vitrine” do painel |
| `index.html` | +7 linhas: usa a seleção personalizada em Ofertas/Novidades; em qualquer falha mantém a original |
| `lista.html` | +5 linhas: ordem personalizada nas categorias; registra buscas e categorias visitadas |
| `produto.html` | +2 linhas: registra produto visto e clique em Comprar (só no aparelho) |
| `pagina.html` | +4 linhas: opção “Desativar neste aparelho” na Política de privacidade (LGPD) |
| `admin/index.html` | 1 linha: nova aba no menu |

`saindo.html` (redirecionamento para a loja parceira), `js/app.js`, `config.js` e o restante **não foram alterados**.

## Supabase

- **Nenhuma tabela, função, política ou coluna nova.** Nenhuma migração.
- A configuração fica em `cr_site_settings.data.vitrine` (registro que a loja já lê em todo carregamento). Ao salvar, o painel relê as configurações e grava apenas essa chave, preservando as demais.
- O visitante só **lê** produtos ativos (mesma permissão pública de hoje). Chave usada: a pública já existente no `config.js`.

## Desempenho

- Uma consulta enxuta do catálogo (sem descrições e sem imagens), guardada no aparelho por 20 minutos (~160 KB) e mais uma busca dos cards escolhidos.
- Nenhuma consulta por clique: os sinais de interesse são gravados só no aparelho.
- Se o catálogo demorar mais de 3,5 s, a página segue com a vitrine original.

## Desligar

- **Painel > Sistema Inteligente da Vitrine > desmarcar “Ligado” > Salvar.** Volta na hora para a vitrine original.
- Para uma página específica: acrescente `?vitrine=0` ao endereço.
- Testar sem ligar para todos: `?vitrine=teste` (vale só naquela aba).

## Reverter completamente

1. Desligue no painel (passo acima).
2. Reverta o commit/PR deste sistema no GitHub (botão **Revert** no pull request).
3. Opcional, para apagar a configuração salva (Supabase > SQL Editor):

```sql
update cr_site_settings set data = data - 'vitrine' where id = 1;
```

Se você usou “Adicionar à Política de privacidade”, remova o parágrafo “Personalização da vitrine” em Aparência.

## Limitações conhecidas

- O perfil fica no aparelho: se o visitante trocar de celular, limpar os dados do navegador ou usar aba anônima, começa do zero.
- **Ferramentas** (3 produtos) e **Masculino** (13) têm poucos produtos hoje; esses perfis completam a vitrine com produtos “livres” até haver mais itens.
- “Achadinhos” usa desconto real (preço antigo x atual) e palavras‑chave, porque quase todos os produtos estão marcados como oferta.
- Produtos sem categoria compatível só entram num tipo pelas palavras‑chave do nome; ajuste as regras no painel.
