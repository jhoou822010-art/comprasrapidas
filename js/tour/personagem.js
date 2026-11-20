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
export const IMAGENS = {};

// tamanho do personagem na tela (px). A largura acompanha a proporção da imagem.
export const TAMANHO = { altura: 118, alturaCelular: 96 };

// ---- homenzinho em SVG (usado enquanto não houver imagens). Olha para a direita.
// Grupos com id: braco-frente (o que aponta, gira pela variável --ang), braco-tras, perna-a, perna-b.
export const SVG = `<svg viewBox="0 0 100 150" width="100%" height="100%" aria-hidden="true" focusable="false">
 <ellipse cx="50" cy="146" rx="26" ry="4" fill="#000" opacity=".18"/>
 <g class="g-perna g-perna-a"><rect x="38" y="96" width="10" height="38" rx="5" fill="#253a5e"/><rect x="34" y="130" width="17" height="8" rx="4" fill="#1b1b1b"/></g>
 <g class="g-perna g-perna-b"><rect x="52" y="96" width="10" height="38" rx="5" fill="#2d4672"/><rect x="51" y="130" width="17" height="8" rx="4" fill="#1b1b1b"/></g>
 <g class="g-braco g-braco-tras"><rect x="27" y="58" width="9" height="34" rx="4.5" fill="#1a5fd6"/><circle cx="31.5" cy="94" r="5" fill="#f2c7a5"/></g>
 <path d="M30 56c0-8 8-12 20-12s20 4 20 12v44H30z" fill="#1a5fd6"/>
 <path d="M42 45l8 9 8-9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
 <text class="g-texto" x="50" y="78" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="6.2" font-weight="700" fill="#fff" letter-spacing="-.2">comprasrapidas</text>
 <rect x="30" y="92" width="40" height="7" fill="#123f8f"/>
 <rect x="45" y="36" width="10" height="9" rx="3" fill="#e8b892"/>
 <circle cx="50" cy="24" r="16" fill="#f2c7a5"/>
 <path d="M34 22c0-11 8-17 17-17s16 6 16 15c-4-5-10-7-16-7-7 0-12 3-17 9z" fill="#3b2a20"/>
 <circle cx="56" cy="24" r="2.1" fill="#1b1b1b"/><circle cx="45" cy="24" r="2.1" fill="#1b1b1b"/>
 <path d="M45 31c3 3 8 3 11 0" fill="none" stroke="#a5523a" stroke-width="2" stroke-linecap="round"/>
 <circle cx="61" cy="29" r="2.6" fill="#f29b8b" opacity=".55"/>
 <g class="g-braco g-braco-frente"><rect x="64" y="58" width="9" height="34" rx="4.5" fill="#1a5fd6"/><circle cx="68.5" cy="94" r="5" fill="#f2c7a5"/></g>
</svg>`;
