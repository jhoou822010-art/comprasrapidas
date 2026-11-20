// ETAPAS E TEXTOS DO GUIA — mude aqui o que o mascote fala, a ordem das etapas e o tempo de espera.
//
// Cada etapa:
//   id      nome interno (não aparece)
//   alvo    seletor CSS do elemento que ele mostra (null = fica no centro, sem destacar nada).
//           Se o elemento não existir ou estiver escondido (ex.: jogos desligados), a etapa é pulada sozinha.
//   texto   o que ele fala (pode usar <b>negrito</b>)
//   tipo    'instalar' ou 'notificacoes' para as etapas especiais (elas se pulam sozinhas quando não fazem sentido)
//   botoes  quais botões aparecem: 'proximo', 'nao-mostrar' (boas-vindas), 'concluir' e 'desativar' (final)
export const ETAPAS = [
  { id: 'boas-vindas', alvo: null, botoes: ['proximo', 'nao-mostrar'],
    texto: 'Oi! Eu sou a <b>Lia</b>, sua guia na <b>Compras Rápidas</b>. Posso te mostrar a loja rapidinho?' },
  { id: 'pesquisa', alvo: 'header form[role=search]', botoes: ['proximo'],
    texto: 'Procurando algo? Digite aqui na <b>pesquisa</b> o nome do produto e toque na lupa 🔍.' },
  { id: 'carrossel', alvo: '.car', botoes: ['proximo'],
    texto: 'Aqui no topo passam as <b>ofertas em destaque</b>. Arraste para o lado para ver mais.' },
  { id: 'categorias', alvo: '#categorias', botoes: ['proximo'],
    texto: 'Nas <b>categorias</b> você acha tudo separado: casa, beleza, tecnologia e muito mais.' },
  { id: 'ofertas', alvo: '#ofertas', botoes: ['proximo'],
    texto: 'Estas são as <b>ofertas</b> do momento, com o preço já com desconto.' },
  { id: 'jogos', alvo: 'nav.mn a[href="jogos.html"]', botoes: ['proximo'],
    texto: 'Na área de <b>jogos</b> tem diversão e o Desafio de quem faz mais pontos.' },
  { id: 'menu', alvo: 'nav.mn', botoes: ['proximo'],
    texto: 'Pelo <b>menu</b> você chega rápido em ofertas, categorias, destaques e contato.' },
  { id: 'instalar', tipo: 'instalar', alvo: null, botoes: ['proximo'],
    texto: 'Quer a loja na tela do seu celular, como um aplicativo? É grátis e não ocupa quase nada.' },
  { id: 'notificacoes', tipo: 'notificacoes', alvo: null, botoes: ['proximo'],
    texto: 'Posso te avisar quando entrar <b>oferta nova</b>? Você desliga quando quiser.' },
  { id: 'final', alvo: null, botoes: ['concluir', 'desativar'],
    texto: 'Pronto! Se precisar de mim, é só tocar em <b>“Chamar o guia”</b> no fim da página. Boas compras!' },
];

export const CONFIG = {
  // visitas seguintes: quantos segundos ele espera uma resposta antes de ir embora
  espera: 15,
  // velocidade da caminhada (pixels por segundo)
  velocidade: 420,
  textos: {
    pergunta: 'Oi de novo! Quer que eu te mostre a loja ou te ajude a achar alguma coisa?',
    querAjuda: 'Quero ajuda',
    agoraNao: 'Agora não',
    proximo: 'Próximo',
    concluir: 'Concluir',
    naoMostrar: 'Não mostrar mais',
    desativar: 'Desativar guia',
    pular: 'Pular',
    instalar: 'Instalar',
    instalarIphone: 'No iPhone: toque em <b>Compartilhar</b> <span aria-hidden="true">(□↑)</span> e depois em <b>Adicionar à Tela de Início</b>.',
    entendi: 'Entendi',
    avisar: 'Quero ser avisado',
    tchau: 'Tchau! Se precisar, me chame no fim da página. 👋',
    tchauDesativado: 'Tudo bem, não apareço mais. Para me chamar de volta, use <b>“Ativar guia”</b> no fim da página. 👋',
    avisoAtivo: 'Pronto! Você vai receber as ofertas neste aparelho. ✅',
    avisoErro: 'Não consegui ativar agora. Você pode ativar depois em <b>🔔 Notificações</b>, no fim da página.',
  },
  // Cliente com login (para não repetir o tour em outro aparelho). A loja ainda não tem login de clientes:
  // quando tiver, ligue aqui. carregar() devolve { visto, desligado } do perfil; salvar(dados) grava no perfil.
  perfil: {
    async carregar() { return null; },
    async salvar(_dados) { /* ex.: await sb.from('perfis').update({ guia: _dados }).eq('id', usuario.id) */ },
  },
};
