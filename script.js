import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getDatabase, ref, onValue, get, update, runTransaction } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBCrzPnDyHiuNC60-ikMbAIPWEatM0_9pM',
  authDomain: 'campeonato-bc228.firebaseapp.com',
  databaseURL: 'https://campeonato-bc228-default-rtdb.firebaseio.com',
  projectId: 'campeonato-bc228',
  storageBucket: 'campeonato-bc228.firebasestorage.app',
  messagingSenderId: '929625884391',
  appId: '1:929625884391:web:9312c694202c8447768442'
};

const EMAIL_ADMIN = 'josemelo381530@gmail.com';
const PADRAO = {
  titulo: 'Campeonato de Brawl Stars',
  a: { nome: 'Time A', pontos: 0, logo: '' },
  b: { nome: 'Time B', pontos: 0, logo: '' }
};
const $ = id => document.getElementById(id);
const modoProjecao = new URLSearchParams(location.search).get('modo') === 'projecao';
if (modoProjecao) document.body.classList.add('projecao');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const placarRef = ref(db, 'placar');
let estado = PADRAO;
let autorizado = false;

function mostrarErro(error) {
  console.error('Campeonato:', error);
  if (!modoProjecao) $('mensagem').textContent = 'Não foi possível salvar. Confira a conexão e suas permissões no Firebase.';
}

function exibir() {
  $('titulo').textContent = estado.titulo || PADRAO.titulo;
  for (const time of ['a', 'b']) {
    const dados = { ...PADRAO[time], ...(estado[time] || {}) };
    $('nome-' + time).textContent = dados.nome;
    $('pontos-' + time).textContent = dados.pontos;
    const img = $('logo-' + time);
    const iniciais = $('iniciais-' + time);
    img.hidden = !dados.logo;
    iniciais.hidden = Boolean(dados.logo);
    if (dados.logo) img.src = dados.logo;
    else img.removeAttribute('src');
    iniciais.textContent = (dados.nome.trim().charAt(0) || time).toUpperCase();
    img.alt = 'Escudo do ' + dados.nome;
  }
}

function sincronizarInputs() {
  if (modoProjecao) return;
  const titulo = $('editar-titulo');
  if (document.activeElement !== titulo) titulo.value = estado.titulo || PADRAO.titulo;
  for (const time of ['a', 'b']) {
    const input = $('editar-' + time);
    if (document.activeElement !== input) input.value = estado[time]?.nome || PADRAO[time].nome;
  }
}

// Todos os dispositivos leem o mesmo estado do Realtime Database.
onValue(placarRef, snapshot => {
  const remoto = snapshot.val();
  estado = remoto ? {
    ...PADRAO,
    ...remoto,
    a: { ...PADRAO.a, ...(remoto.a || {}) },
    b: { ...PADRAO.b, ...(remoto.b || {}) }
  } : PADRAO;
  exibir();
  sincronizarInputs();
  $('status-conexao').textContent = remoto ? 'Placar conectado • atualização em tempo real' : 'Aguardando a primeira configuração do placar';
  $('status-conexao').classList.remove('erro');
}, error => {
  console.error('Falha ao ler o placar:', error);
  $('status-conexao').textContent = 'Sem acesso ao placar. Confira a conexão e as regras do Firebase.';
  $('status-conexao').classList.add('erro');
});

function podeEditar(usuario) {
  return Boolean(usuario && usuario.emailVerified && usuario.email?.toLowerCase() === EMAIL_ADMIN);
}

if (!modoProjecao) {
  const botaoEntrar = $('entrar-google');
  const botaoSair = $('sair-google');
  const provedor = new GoogleAuthProvider();
  provedor.setCustomParameters({ prompt: 'select_account' });

  botaoEntrar.addEventListener('click', async () => {
    $('mensagem').textContent = '';
    try {
      await signInWithPopup(auth, provedor);
    } catch (error) {
      console.error('Erro no login Google:', error);
      $('mensagem').textContent = error.code === 'auth/popup-closed-by-user'
        ? 'Login cancelado.'
        : 'Falha no login Google. Confira os domínios autorizados e tente novamente.';
    }
  });
  botaoSair.addEventListener('click', () => signOut(auth).catch(mostrarErro));

  onAuthStateChanged(auth, async usuario => {
    autorizado = podeEditar(usuario);
    botaoEntrar.hidden = Boolean(usuario);
    botaoSair.hidden = !usuario;
    $('admin-controles').hidden = !autorizado;
    $('status-login').textContent = !usuario
      ? 'Entre com a conta Google autorizada para administrar.'
      : autorizado
        ? 'Organizador autenticado: ' + usuario.email
        : 'Esta conta não possui permissão para editar: ' + (usuario.email || 'conta desconhecida');

    if (autorizado) {
      try {
        // A primeira autenticação do organizador prepara o placar vazio.
        const atual = await get(placarRef);
        if (!atual.exists()) {
          await runTransaction(placarRef, valor => valor === null ? PADRAO : undefined, { applyLocally: false });
        }
      } catch (error) {
        mostrarErro(error);
      }
    }
  });

  async function gravar(caminho, alteracoes) {
    if (!autorizado) return;
    try {
      await update(ref(db, caminho ? 'placar/' + caminho : 'placar'), alteracoes);
      $('mensagem').textContent = '';
    } catch (error) {
      mostrarErro(error);
    }
  }

  $('editar-titulo').addEventListener('change', event => {
    gravar('', { titulo: event.target.value.trim() || PADRAO.titulo });
  });

  async function pontuar(time, diferenca) {
    if (!autorizado) return;
    try {
      await runTransaction(ref(db, 'placar/' + time + '/pontos'), atual => {
        return Math.max(0, (Number(atual) || 0) + diferenca);
      }, { applyLocally: false });
      $('mensagem').textContent = '';
    } catch (error) {
      mostrarErro(error);
    }
  }

  for (const time of ['a', 'b']) {
    $('editar-' + time).addEventListener('change', event => {
      gravar(time, { nome: event.target.value.trim() || PADRAO[time].nome });
    });
    $('mais-' + time).addEventListener('click', () => pontuar(time, 1));
    $('menos-' + time).addEventListener('click', () => pontuar(time, -1));
    $('remover-' + time).addEventListener('click', () => {
      $('arquivo-' + time).value = '';
      gravar(time, { logo: '' });
    });
    $('arquivo-' + time).addEventListener('change', event => {
      const arquivo = event.target.files?.[0];
      if (!arquivo) return;
      if (!arquivo.type.startsWith('image/')) {
        $('mensagem').textContent = 'Selecione um arquivo de imagem.';
        return;
      }
      const leitor = new FileReader();
      leitor.onerror = () => { $('mensagem').textContent = 'Não foi possível ler a imagem.'; };
      leitor.onload = () => {
        const imagem = new Image();
        imagem.onerror = () => { $('mensagem').textContent = 'Formato de imagem não suportado.'; };
        imagem.onload = () => {
          const canvas = document.createElement('canvas');
          const escala = Math.min(1, 256 / Math.max(imagem.width, imagem.height));
          canvas.width = Math.max(1, Math.round(imagem.width * escala));
          canvas.height = Math.max(1, Math.round(imagem.height * escala));
          canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
          const dados = canvas.toDataURL('image/webp', 0.8);
          if (dados.length > 500000) {
            $('mensagem').textContent = 'Escudo muito grande. Escolha uma imagem menor.';
            return;
          }
          gravar(time, { logo: dados });
        };
        imagem.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  $('zerar').addEventListener('click', async () => {
    if (!autorizado || !confirm('Deseja zerar os dois placares?')) return;
    await gravar('', { 'a/pontos': 0, 'b/pontos': 0 });
  });

  document.addEventListener('keydown', event => {
    if (!autorizado || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) ||
        document.activeElement?.isContentEditable || event.altKey || event.ctrlKey || event.metaKey) return;
    const teclas = { ArrowUp: ['a', 1], ArrowDown: ['a', -1], ArrowRight: ['b', 1], ArrowLeft: ['b', -1] };
    if (teclas[event.key]) {
      event.preventDefault();
      pontuar(...teclas[event.key]);
    }
  });
}

exibir();
