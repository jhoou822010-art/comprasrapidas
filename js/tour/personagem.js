// PERSONAGEM DO GUIA — troque aqui pelas suas imagens.
//
// Enquanto IMAGENS estiver vazio, o guia usa o homenzinho em SVG abaixo (camisa azul escrito "comprasrapidas").
// Para usar as suas imagens, coloque os arquivos na pasta img/guia/ (PNG ou SVG com fundo transparente,
// desenhados OLHANDO PARA A DIREITA — o código espelha sozinho quando ele precisa olhar para a esquerda) e preencha:
//
//   export const IMAGENS = {
//     parado:    'img/guia/parado.png',
//     andando:   'img/guia/andando.png',     // pode ser um GIF/PNG animado com as pernas se movendo
//     apontando: 'img/guia/apontando.png',   // braço esticado para a frente (direita)
//     acenando:  'img/guia/acenando.png',
//   };
//
// Se faltar alguma pose, o guia usa a imagem "parado" no lugar.
// Personagem atual: a Lia (imagens em img/guia/, 204×360, olhando para a direita).
const aqui = (f) => new URL('../../img/guia/' + f, import.meta.url).href;   // funciona em qualquer página do site
export const IMAGENS = {
  parado: aqui('parado.png'),
  andando: aqui('andando.png'),
  apontando: aqui('apontando.png'),
  acenando: aqui('acenando.png'),
};
// Para voltar ao boneco desenhado (SVG abaixo), troque a linha de cima por:  export const IMAGENS = {};

// tamanho do personagem na tela (px). A largura acompanha a proporção da imagem.
export const TAMANHO = { altura: 132, alturaCelular: 112 };

// Sobra transparente em volta do boneco nas SUAS imagens, em % do tamanho da imagem.
// Ex.: imagem quadrada 2048×2048 com o boneco ocupando do topo 8% até 4% do fim e com 28% de sobra de cada lado:
//   export const MARGEM = { cima: 8, baixo: 4, lados: 28 };
// O guia corta essa sobra para o boneco ficar do tamanho de TAMANHO e com os pés no lugar. Não vale para o SVG abaixo.
export const MARGEM = { cima: 0, baixo: 0, lados: 0 };

// ---- personagem em SVG (usado enquanto não houver imagens). Olha para a direita.
// Mesma identidade do avatar: pele morena clara, cabelo bem curtinho (baixo), olhos castanhos grandes, sorriso aberto,
// contorno azul-marinho, camisa azul royal "comprasrapidas", calça azul-marinho e tênis brancos.
// Grupos: g-braco-frente (o que aponta; gira pela variável --ang, ombro em 70.5,60), g-braco-tras, g-perna-a, g-perna-b, g-texto.
const L = '#14285a';                 // contorno
const PELE = '#e0ad86', PELE2 = '#c98f66', AZUL = '#1d5fe3', AZUL2 = '#174bb8', CALCA = '#1b2b52', CABELO = '#3b2b21';
const braco = (cls, x) => `<g class="g-braco ${cls}">
  <rect x="${x + 1}" y="66" width="7" height="25" rx="3.5" fill="${PELE}" stroke="${L}" stroke-width="1.4"/>
  <path d="M${x - 1} 60c0-3 2.5-5 5.5-5s5.5 2 5.5 5v10h-11z" fill="${AZUL}" stroke="${L}" stroke-width="1.4" stroke-linejoin="round"/>
  <circle cx="${x + 4.5}" cy="93" r="4.6" fill="${PELE}" stroke="${L}" stroke-width="1.4"/></g>`;
const perna = (cls, x, cor) => `<g class="g-perna ${cls}">
  <rect x="${x}" y="95" width="11" height="37" rx="4.5" fill="${cor}" stroke="${L}" stroke-width="1.4"/>
  <path d="M${x - 2} 136.5c0-4 3-6.5 7.5-6.5h3c5 0 9.5 2.5 9.5 6.5v1.5h-20z" fill="#fff" stroke="${L}" stroke-width="1.4" stroke-linejoin="round"/>
  <rect x="${x - 2.4}" y="137.2" width="20.8" height="3" rx="1.5" fill="#dfe6f2" stroke="${L}" stroke-width="1.2"/></g>`;
export const SVG = `<svg viewBox="0 0 100 150" width="100%" height="100%" aria-hidden="true" focusable="false">
 <ellipse cx="50" cy="146" rx="25" ry="3.5" fill="#000" opacity=".15"/>
 ${perna('g-perna-a', 37.5, CALCA)}
 ${perna('g-perna-b', 51.5, '#22355f')}
 ${braco('g-braco-tras', 25)}
 <path d="M31 58c0-7 7-11 19-11s19 4 19 11v38c0 2-1.5 3-3.5 3h-31c-2 0-3.5-1-3.5-3z" fill="${AZUL}" stroke="${L}" stroke-width="1.6" stroke-linejoin="round"/>
 <path d="M43 47.5c1.5 4 4 5.5 7 5.5s5.5-1.5 7-5.5" fill="${AZUL2}" stroke="${L}" stroke-width="1.4" stroke-linecap="round"/>
 <text class="g-texto" x="50" y="76" text-anchor="middle" textLength="29" lengthAdjust="spacingAndGlyphs" font-family="Arial,Helvetica,sans-serif" font-size="5.6" font-weight="700" fill="#fff">comprasrapidas</text>
 <rect x="45.5" y="38" width="9" height="10" rx="3" fill="${PELE2}" stroke="${L}" stroke-width="1.4"/>
 <ellipse cx="34.6" cy="25" rx="3.6" ry="4.6" fill="${PELE}" stroke="${L}" stroke-width="1.4"/>
 <path d="M34 22.5c-0.5-12 7-19 17-19 10.5 0 17 7 17 18.5 0 10.5-7.5 18.5-17 18.5-9.5 0-16.7-7.5-17-18z" fill="${PELE}" stroke="${L}" stroke-width="1.6"/>
 <path d="M35 20.5c-.3-10.5 6.8-17 16-17 9.6 0 16.6 6.5 16.6 16-2.3-3.6-5.6-5.4-9-5.8-3-.4-6 .2-8.2 1.4-2.2-1.1-5-1.4-7.6-.7-3.3.9-6 3-7.8 6.1z" fill="${CABELO}" stroke="${L}" stroke-width="1.2" stroke-linejoin="round"/>
 <ellipse cx="47" cy="24" rx="4.2" ry="5" fill="#fff" stroke="${L}" stroke-width="1"/><ellipse cx="60" cy="24" rx="4.2" ry="5" fill="#fff" stroke="${L}" stroke-width="1"/>
 <circle cx="48.2" cy="24.8" r="3.1" fill="#6b3b1a"/><circle cx="61.2" cy="24.8" r="3.1" fill="#6b3b1a"/>
 <circle cx="48.5" cy="25.2" r="1.6" fill="#1b0f08"/><circle cx="61.5" cy="25.2" r="1.6" fill="#1b0f08"/>
 <circle cx="47.4" cy="23.3" r="1" fill="#fff"/><circle cx="60.4" cy="23.3" r="1" fill="#fff"/>
 <path d="M43.5 17.6c1.5-1.2 4-1.4 5.5-.6M57 17c1.6-.8 4-.6 5.5.6" fill="none" stroke="${CABELO}" stroke-width="1.5" stroke-linecap="round"/>
 <path d="M54.5 26.5c.6 1.8.4 3-.8 3.6" fill="none" stroke="${PELE2}" stroke-width="1.2" stroke-linecap="round"/>
 <path d="M47 32.2c2.2 4.4 9.8 4.4 12.4 0z" fill="#6e1f1f" stroke="${L}" stroke-width="1.2" stroke-linejoin="round"/>
 <path d="M48.6 32.4h9.3c-.4 1-1.2 1.4-2.2 1.5h-5c-1 0-1.7-.5-2.1-1.5z" fill="#fff"/>
 <path d="M50.5 35.6c1.5-1.2 3.7-1.2 5.3 0-1.6.9-3.7.9-5.3 0z" fill="#e2777a"/>
 <circle cx="43" cy="30" r="2.4" fill="#e07a6a" opacity=".35"/><circle cx="64.5" cy="30" r="2.2" fill="#e07a6a" opacity=".35"/>
 ${braco('g-braco-frente', 66)}
</svg>`;
