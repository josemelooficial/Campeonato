const chave='campeonato-placar-v2';
const inicial={titulo:'Campeonato de Brawl Stars',a:{nome:'Time A',pontos:0,logo:''},b:{nome:'Time B',pontos:0,logo:''}};
let estado;
try{estado={...inicial,...JSON.parse(localStorage.getItem(chave)||'{}')}}catch{estado={...inicial}}
for(const t of ['a','b']) estado[t]={...inicial[t],...estado[t]};
const $=id=>document.getElementById(id);
if(new URLSearchParams(location.search).get('modo')==='projecao')document.body.classList.add('projecao');
function exibir(){
 $('titulo').textContent=estado.titulo;
 for(const t of ['a','b']){
  $('nome-'+t).textContent=estado[t].nome;
  $('pontos-'+t).textContent=estado[t].pontos;
  const img=$('logo-'+t), iniciais=$('iniciais-'+t);
  img.hidden=!estado[t].logo; iniciais.hidden=!!estado[t].logo;
  if(estado[t].logo)img.src=estado[t].logo;else img.removeAttribute('src');
  iniciais.textContent=(estado[t].nome.trim().charAt(0)||t).toUpperCase();
  img.alt='Escudo do '+estado[t].nome;
 }
}
function salvar(){try{localStorage.setItem(chave,JSON.stringify(estado));$('mensagem').textContent=''}catch{$('mensagem').textContent='Não foi possível salvar no navegador. Use uma imagem menor.'}exibir()}
function sincronizarInputs(){
 $('editar-titulo').value=estado.titulo;
 for(const t of ['a','b']) $('editar-'+t).value=estado[t].nome;
}
$('editar-titulo').addEventListener('input',e=>{estado.titulo=e.target.value||inicial.titulo;salvar()});
for(const t of ['a','b']){
 $('editar-'+t).addEventListener('input',e=>{estado[t].nome=e.target.value||inicial[t].nome;salvar()});
 for(const [prefixo,diferenca] of [['mais',1],['menos',-1]]) $(''+prefixo+'-'+t).addEventListener('click',()=>ponto(t,diferenca));
 $('remover-'+t).addEventListener('click',()=>{estado[t].logo='';$('arquivo-'+t).value='';salvar()});
 $('arquivo-'+t).addEventListener('change',e=>{
  const arquivo=e.target.files[0];if(!arquivo)return;
  if(!arquivo.type.startsWith('image/')){alert('Selecione uma imagem.');return}
  const reader=new FileReader();reader.onload=()=>{
   const img=new Image();img.onload=()=>{
    const c=document.createElement('canvas'),max=320,escala=Math.min(1,max/Math.max(img.width,img.height));
    c.width=Math.max(1,Math.round(img.width*escala));c.height=Math.max(1,Math.round(img.height*escala));
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);estado[t].logo=c.toDataURL('image/png');salvar();
   };img.src=reader.result;
  };reader.readAsDataURL(arquivo);
 });
}
function ponto(time,quantidade){estado[time].pontos=Math.max(0,estado[time].pontos+quantidade);salvar()}
$('zerar').addEventListener('click',()=>{if(!confirm('Deseja zerar os dois placares?'))return;estado.a.pontos=0;estado.b.pontos=0;salvar()});
document.addEventListener('keydown',e=>{
 if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable||e.altKey||e.ctrlKey||e.metaKey||document.body.classList.contains('projecao'))return;
 const teclas={ArrowUp:['a',1],ArrowDown:['a',-1],ArrowRight:['b',1],ArrowLeft:['b',-1]};
 if(teclas[e.key]){e.preventDefault();ponto(...teclas[e.key])}
});
window.addEventListener('storage',e=>{if(e.key!==chave||!e.newValue)return;try{estado=JSON.parse(e.newValue);exibir();sincronizarInputs()}catch{}});
const canal=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(chave):null;
if(canal){const anterior=salvar;salvar=function(){anterior();canal.postMessage(estado)};canal.onmessage=e=>{estado=e.data;exibir();sincronizarInputs()}}
sincronizarInputs();exibir();
