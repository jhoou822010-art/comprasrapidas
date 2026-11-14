# Painel administrativo — melhorias (novembro de 2026)

Ponto de restauração: tag Git `backup-antes-painel-2026-11-14` (local) e a branch `main` intacta até o merge.

## O que mudou

- **Menu lateral agrupado** (Visão geral, Catálogo, Vitrine, Comunicação, Operações; Sair no final).
  Computador: recolhível (aberto = ícone e nome; recolhido = só ícones; a escolha fica salva no aparelho).
  Celular: abre deslizando pelo botão ☰ (fecha no ✕, tocando fora ou com Esc).
- **Visual:** menu na cor principal (azul-marinho), fundo cinza claro, cartões brancos com borda suave.
  Azul só nos botões principais; vermelho só em excluir. Se “Usar minhas cores personalizadas” estiver ligado em Aparência, o painel usa essas cores.
- **Listas compactas:** cada linha mostra só “Editar”; Arquivar, Excluir, Cancelar envio etc. ficam no menu “⋯”.
  Categorias, Início e Banners personalizados viraram listas (o formulário abre ao tocar em Editar).
- **Botões com 44 px** de altura no celular.
- **Painel inicial:** cartões com Produtos, Ativos, Arquivados, Categorias, Em destaque, Em oferta e Cliques totais;
  aviso de backup em laranja discreto; mais acessados em lista compacta, com o aviso de que cliques não são vendas.
- **Banners** em três modos:
  - *Escolher produto:* busca, “Selecionar”, dados do produto só para leitura, texto curto, texto do botão (“Confira agora”), posição, ativo, prévia e “Publicar banner”.
  - *Automático:* origem (em oferta, em destaque, mais acessados 7 dias, recém-cadastrados), quantidade, tempo de troca; em cada item “⋯” com “Fixar no topo” e “Não mostrar”.
  - *Personalizados:* os banners digitados à mão de antes (tabela `cr_banners`), sem mudanças.
  - Produtos marcados com “Mostrar no banner do topo” no cadastro continuam funcionando (aparecem em *Escolher produto*).
- Remover/excluir qualquer coisa pede confirmação (inclui tirar foto do produto, tirar do carrossel e remover imagem do contato).

Nenhuma aba ou função foi removida ou renomeada.

## Arquivos

| Arquivo | O quê |
|---|---|
| `admin/index.html` | Menu, visual, listas, Painel inicial e aba Banners |
| `js/banners.js` (novo) | Regras dos banners de produto (usadas pelo site e pela prévia do painel) |
| `index.html` | Exibe os banners de produto novos; tempo de troca configurável. Banners antigos seguem iguais |

## Banco de dados

**Nenhuma tabela, coluna, função ou política nova.** A configuração fica na chave `banners_v2` de `cr_site_settings.data`
(o painel relê as configurações e troca só essa chave). Cada banner guarda só o id do produto e as próprias opções;
foto, nome, preço, descrição e link são lidos do produto na hora de exibir. O site público só enxerga produtos ativos,
então produto arquivado, inativo ou excluído some do banner sozinho; com “Esconder quando sair da oferta”, também ao sair da oferta.

“Mais acessados (7 dias)”: o site não tem permissão para ler os cliques, então o painel guarda a lista (só ids)
ao abrir o Painel ou a aba Banners (ou em “Atualizar agora”).

## Desfazer

1. No GitHub, botão **Revert** no pull request destas mudanças.
2. Opcional — apagar a configuração nova (Supabase › SQL Editor). Os outros banners não são afetados:

```sql
update cr_site_settings set data = data - 'banners_v2' where id = 1;
```
