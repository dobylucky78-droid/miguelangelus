'use strict';
/*
 * Pix da paróquia no telão (ofertório, fim da Missa): o QR code e a faixa com a chave (CNPJ) para a pessoa conferir.
 * Botão 💠 Pix ou tecla P; apertar de novo volta ao que estava no ar (como o Altar).
 * As imagens ficam na config 'pix' — vão para a nuvem como a Agenda (basta colocar num computador).
 *
 * Senha de 4 números para trocar as imagens (ninguém troca o QR code da paróquia por outro sem a senha):
 * quem cria é a própria PASCOM, aqui no programa. Guardamos só o "hash" (PBKDF2-SHA256 com sal), não os números;
 * vai junto para a nuvem, então vale nos outros computadores. Mostrar o Pix no telão NÃO pede senha.
 * Usa S, DB, enviar, toast, abrirAjustes, renderSlides… (em tempo de execução).
 */
const Pix = { qr: '', faixa: '', senha: null, liberado: false, escolhendo: '', erros: 0, travadoAte: 0 };

async function carregarPix() {
  const r = await DB.obter('config', 'pix');
  Pix.qr = r?.valor?.qr || ''; Pix.faixa = r?.valor?.faixa || ''; Pix.senha = r?.valor?.senha || null;
  renderPixAjustes();
}

async function salvarPix() {
  await DB.salvar('config', { id: 'pix', valor: { qr: Pix.qr, faixa: Pix.faixa, senha: Pix.senha } });
  renderPixAjustes();
  if (S.pixNoAr) mostrarPixNoTelao();           // trocou a imagem com o Pix no ar: atualiza o telão
}

// ---------- senha (só o hash fica guardado) ----------
const hexDe = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hashSenha(pin, salHex) {
  const sal = Uint8Array.from(salHex.match(/../g).map(h => parseInt(h, 16)));
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hexDe(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: 150000 }, chave, 256));
}
async function conferirSenha(pin) {
  if (!Pix.senha) return false;
  return (await hashSenha(pin, Pix.senha.sal)) === Pix.senha.hash;
}
async function definirSenha(pin) {
  const sal = hexDe(crypto.getRandomValues(new Uint8Array(16)));
  Pix.senha = { sal, hash: await hashSenha(pin, sal) };
  await salvarPix();
}

// Pede a senha num quadro próprio (os números não aparecem na tela). modo: 'criar' | 'entrar' → devolve o PIN ou ''
function pedirSenha(modo, titulo, texto) {
  return new Promise(ok => {
    const dlg = $('#dlgPin'), c1 = $('#pinCampo'), c2 = $('#pinCampo2');
    $('#pinTitulo').textContent = titulo; $('#pinTexto').textContent = texto; $('#pinErro').textContent = '';
    c1.value = ''; c2.value = ''; c2.hidden = modo !== 'criar';
    const fim = v => { dlg.close(); $('#formPin').onsubmit = null; $('#pinCancelar').onclick = null; c1.value = ''; c2.value = ''; ok(v); };
    $('#pinCancelar').onclick = () => fim('');
    dlg.oncancel = () => fim('');
    $('#formPin').onsubmit = e => {
      e.preventDefault();
      const p = c1.value.trim();
      if (!/^\d{4}$/.test(p)) { $('#pinErro').textContent = 'A senha tem 4 números.'; c1.focus(); return; }
      if (modo === 'criar' && c2.value.trim() !== p) { $('#pinErro').textContent = 'As duas senhas não são iguais.'; c2.value = ''; c2.focus(); return; }
      fim(p);
    };
    dlg.showModal(); c1.focus();
  });
}

async function desbloquearPix() {
  if (Date.now() < Pix.travadoAte) return toast(`Muitas tentativas erradas. Espere ${Math.ceil((Pix.travadoAte - Date.now()) / 1000)} s.`);
  const pin = await pedirSenha('entrar', '🔒 Senha do Pix', 'Digite a senha de 4 números para trocar as imagens do Pix.');
  if (!pin) return;
  if (await conferirSenha(pin)) { Pix.liberado = true; Pix.erros = 0; renderPixAjustes(); toast('🔓 Imagens do Pix liberadas para troca.'); }
  else {
    Pix.erros++;
    if (Pix.erros >= 5) { Pix.travadoAte = Date.now() + 60000; Pix.erros = 0; toast('Senha errada 5 vezes: bloqueado por 1 minuto.'); }
    else toast(`Senha errada (${Pix.erros} de 5).`);
  }
}

async function criarSenhaPix() {
  const pin = await pedirSenha('criar', '🔒 Criar a senha do Pix', 'Escolha 4 números e repita. Ela será pedida para trocar ou tirar as imagens do Pix (em todos os computadores). Guarde com a coordenação da PASCOM.');
  if (!pin) return;
  await definirSenha(pin);
  Pix.liberado = true;
  renderPixAjustes();
  toast('🔒 Senha do Pix criada.');
}

async function trocarSenhaPix() {
  if (!Pix.liberado) return desbloquearPix();
  const pin = await pedirSenha('criar', '🔒 Nova senha do Pix', 'Escolha os 4 números novos e repita.');
  if (!pin) return;
  await definirSenha(pin);
  toast('🔒 Senha do Pix trocada.');
}

function renderPixAjustes() {
  const prev = (el, src, vazio) => { if (el) el.innerHTML = src ? `<img src="${src}" alt="">` : `<span class="sutil pequeno">${vazio}</span>`; };
  prev($('#pixPrevQr'), Pix.qr, 'Sem QR code.');
  prev($('#pixPrevFaixa'), Pix.faixa, 'Sem faixa (opcional).');
  const cad = $('#pixCadeado');
  if (!cad) return;
  const pode = !!Pix.senha && Pix.liberado;
  cad.innerHTML = !Pix.senha
    ? '<span>🔓 Ainda sem senha.</span><button type="button" class="primario" data-pixsenha="criar">🔒 Criar senha (4 números)</button>'
    : Pix.liberado
      ? '<span>🔓 Liberado para trocar as imagens.</span><button type="button" data-pixsenha="bloquear">🔒 Bloquear</button><button type="button" data-pixsenha="trocar">Trocar a senha</button>'
      : '<span>🔒 Protegido por senha.</span><button type="button" class="primario" data-pixsenha="entrar">🔓 Desbloquear</button>';
  $('#pixCfg').classList.toggle('travado', !pode);
  $$('#pixCfg [data-pix], #pixCfg [data-pixtirar]').forEach(b => { b.disabled = !pode; });
}

// ---------- telão ----------
// O Pix fica POR CIMA do que está passando (como a câmera): os slides continuam, menores, na parte de baixo;
// com a câmera no ar, a faixa e o QR code vão para o alto, menores. Ligar/desligar não mexe no roteiro.
const msgPix = () => ({ tipo: 'pix', on: !!S.pixNoAr, qr: S.pixNoAr ? Pix.qr : '', faixa: S.pixNoAr ? Pix.faixa : '' });
function mostrarPixNoTelao() { enviar(msgPix()); }
function enviarEstadoPix(w) { if (S.pixNoAr) enviar(msgPix(), [w]); }

function alternarPix() {
  if (!S.pixNoAr && !Pix.qr) { toast('Coloque o QR code do Pix em Ajustes → 💠 Pix da paróquia.'); abrirAjustes('pix'); return; }
  S.pixNoAr = !S.pixNoAr;
  enviar(msgPix());
  renderControles();
  if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular();
}

function lerImagemPix(arquivo) {
  return new Promise((ok, falha) => {
    const fr = new FileReader();
    fr.onload = () => ok(fr.result);
    fr.onerror = () => falha(fr.error);
    fr.readAsDataURL(arquivo);
  });
}

function ligarPix() {
  $('#btnPix').addEventListener('click', alternarPix);
  const arq = $('#pixArq');
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-pixsenha]');
    if (s) {
      const a = s.dataset.pixsenha;
      if (a === 'criar') criarSenhaPix();
      else if (a === 'entrar') desbloquearPix();
      else if (a === 'trocar') trocarSenhaPix();
      else if (a === 'bloquear') { Pix.liberado = false; renderPixAjustes(); }
      return;
    }
    const b = e.target.closest('[data-pix],[data-pixtirar]');
    if (!b) return;
    if (!Pix.senha || !Pix.liberado) return toast('🔒 Crie ou digite a senha do Pix primeiro.');
    if (b.dataset.pix) { Pix.escolhendo = b.dataset.pix; arq.value = ''; arq.click(); }
    else if (confirm(b.dataset.pixtirar === 'qr' ? 'Tirar o QR code do Pix?' : 'Tirar a faixa do Pix?')) { Pix[b.dataset.pixtirar] = ''; salvarPix(); }
  });
  arq.addEventListener('change', async () => {
    const f = arq.files[0];
    if (!f || !Pix.escolhendo || !Pix.liberado) return;
    if (!/^image\//.test(f.type)) return toast('Escolha uma imagem (PNG ou JPG).');
    Pix[Pix.escolhendo] = await lerImagemPix(f);
    await salvarPix();
    toast(Pix.escolhendo === 'qr' ? '💠 QR code do Pix guardado.' : '💠 Faixa do Pix guardada.');
  });
  // tamanhos (Ajustes → 💠 Pix): o número ao lado de cada régua (o valor em si é salvo pelo data-cfg, como os outros ajustes)
  const mostrarTam = () => $$('[data-pixval]').forEach(b => { b.textContent = Math.round(+S.config[b.dataset.pixval] * 10) / 10 + '%'; });
  document.addEventListener('input', e => { if (e.target.matches?.('[data-cfg^="pix"]')) mostrarTam(); });
  mostrarTam();
  // fechou os Ajustes: tranca de novo (a próxima troca pede a senha outra vez)
  $('#dlgAjustes').addEventListener('close', () => { if (Pix.liberado) { Pix.liberado = false; renderPixAjustes(); } });
  carregarPix();
}
