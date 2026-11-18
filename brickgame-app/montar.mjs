// Monta app/src/main/assets/index.html a partir dos MESMOS arquivos do site (css/brickgame.css e js/brickgame.js),
// tudo dentro de um único HTML: o app abre sem internet e sem depender do site ou da loja.
// Uso: node brickgame-app/montar.mjs   (o workflow do GitHub roda isto antes de gerar o APK)
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const raiz=new URL('../',import.meta.url),ler=f=>readFileSync(new URL(f,raiz),'utf8');
const css=ler('css/brickgame.css'),js=ler('js/brickgame.js');
if(/^\s*import\s/m.test(js))throw new Error('js/brickgame.js não pode importar outros arquivos: o app usa só ele.');
const html=`<!doctype html><html lang=pt-BR><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name=color-scheme content="only light"><title>Brick Game</title>
<style>${css}
/* no app: só o aparelho, centralizado, ocupando a tela */
html,body{margin:0;height:100%;background:#3a3a3d;overscroll-behavior:none}
body{display:flex;align-items:center;justify-content:center;padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom));box-sizing:border-box}
.bgx{width:100%;max-width:440px;margin:0 auto}
</style></head><body><section class=bgx aria-label="Brick Game 10 em 1"></section>
<script type=module>
${js}
brickgame(document.querySelector('.bgx'));
</script></body></html>`;
mkdirSync(new URL('brickgame-app/app/src/main/assets/',raiz),{recursive:true});
writeFileSync(new URL('brickgame-app/app/src/main/assets/index.html',raiz),html);
console.log('index.html montado:',html.length,'bytes');
