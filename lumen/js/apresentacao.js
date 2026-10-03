'use strict';
/*
 * Apresentação: imagens nos 4 cantos do telão (brasão da paróquia, logo da PASCOM, santo padroeiro…).
 *  - Apresentação padrão da paróquia: Agenda.dados.paroquia.layout
 *  - Apresentação de cada comunidade: local.layout (só os cantos preenchidos; os vazios usam o padrão)
 *  - A que vai para o telão é a do local do roteiro atual (S.roteiro.localId).
 * Formato: layout = { se: { img, tam }, sd: {…}, ie: {…}, id: {…} }   (img = dataURL, tam = % da altura da tela)
 * Usa $, $$, esc, toast, S, enviar, salvarAgenda, localDe... (em tempo de execução).
 */

const CANTOS = [['se', 'Superior esquerdo'], ['sd', 'Superior direito'], ['ie', 'Inferior esquerdo'], ['id', 'Inferior direito']];
const TAM_PADRAO = { se: 16, sd: 16, ie: 16, id: 40 };

const Apresentacao = { alvo: null, cantoEscolhendo: null };

// Layout efetivo de um local: cantos do local por cima dos cantos da paróquia
function layoutEfetivo(localId) {
  const base = Agenda.dados.paroquia?.layout || {};
  const loc = localDe(localId)?.layout || {};
  const out = {};
  for (const [c] of CANTOS) {
    const x = loc[c]?.img ? loc[c] : base[c]?.img ? base[c] : null;
    if (x) out[c] = { src: x.img, tam: x.tam || TAM_PADRAO[c] };
  }
  return out;
}

// Local do roteiro: o escolhido à mão; senão o da celebração da Agenda; senão reconhecido pelo nome ("… Matriz SJO")
const localDoRoteiro = r => r ? infoRoteiro(r).localId : '';

function enviarLayout(destinos) {
  enviar({ tipo: 'layout', cantos: layoutEfetivo(localDoRoteiro(S.roteiro)) }, destinos);
  enviarConfigTelao(destinos);      // cada capela pode ter o seu tema (temas.js)
  renderTemasRapidos();
}

// Reduz a imagem (mantendo a transparência) para não pesar no armazenamento
function reduzirImagem(arquivo, maxLado = 900, qualidade = 0.92) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxLado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/webp', qualidade));
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não consegui abrir esta imagem.')); };
    img.src = url;
  });
}

// ---------- Editor ----------

function objetoAlvo() {
  const a = Apresentacao.alvo;
  if (!a) return null;
  if (a.localId) { const l = localDe(a.localId); return l ? (l.layout ||= {}) : null; }
  return (Agenda.dados.paroquia.layout ||= {});
}

function abrirEditorLayout(alvo) {
  Apresentacao.alvo = alvo;
  const l = alvo.localId ? localDe(alvo.localId) : null;
  $('#layTitulo').textContent = l ? `Apresentação — ${l.tipo} ${l.nome}` : 'Apresentação padrão da paróquia';
  $('#layDica').innerHTML = l
    ? 'Preencha só os cantos que mudam nesta comunidade (por exemplo, o santo padroeiro). Os cantos vazios usam a <b>apresentação padrão da paróquia</b> (aparecem mais claros aqui).'
    : 'Vale para todas as comunidades. Cada comunidade pode trocar os cantos que quiser em <b>Paróquia → 🖼</b>.';
  renderEditorLayout();
  const dlg = $('#dlgLayout');
  dlg.returnValue = '';
  dlg.showModal();
}

function renderEditorLayout() {
  const obj = objetoAlvo() || {};
  const base = Apresentacao.alvo?.localId ? (Agenda.dados.paroquia.layout || {}) : {};
  const cfg = configTelao(renderTemasLayout().id);   // a prévia mostra o tema escolhido para esta capela
  const previa = $('#layPrevia');
  previa.style.backgroundColor = cfg.corFundo || '#000';
  previa.style.backgroundImage = cfg.fundoImagem ? `url("${cfg.fundoImagem}")` : 'none';
  $('#layTexto').style.color = cfg.corTexto || '#fff';
  $('#layTexto').style.fontFamily = cfg.fonte || '';
  $('#layTexto').style.fontWeight = cfg.negrito ? 700 : 400;
  $('#layTexto').style.textShadow = cfg.sombra ? '' : 'none';
  $('#layTexto').style.textTransform = cfg.maiusculas ? 'uppercase' : 'none';
  for (const [c] of CANTOS) {
    const proprio = obj[c]?.img ? obj[c] : null;
    const herdado = !proprio && base[c]?.img ? base[c] : null;
    const x = proprio || herdado;
    const img = previa.querySelector(`.lay-img[data-canto="${c}"]`);
    img.hidden = !x;
    if (x) { img.src = x.img; img.style.height = (x.tam || TAM_PADRAO[c]) + '%'; img.classList.toggle('herdado', !!herdado); }
    const ctl = $(`.lay-ctl[data-canto="${c}"]`);
    ctl.querySelector('[data-lay-remover]').disabled = !proprio;
    const tam = ctl.querySelector('[data-lay-tam]');
    tam.disabled = !proprio;
    tam.value = proprio?.tam || TAM_PADRAO[c];
    ctl.querySelector('.lay-tam-valor').textContent = proprio ? `${tam.value}%` : herdado ? 'padrão' : '—';
  }
}

function aposMudarLayout() {
  salvarAgenda();
  renderEditorLayout();
  enviarLayout();
}

function ligarApresentacao() {
  const ctl = $('#layControles');
  ctl.innerHTML = CANTOS.map(([c, nome]) => `
    <div class="lay-ctl" data-canto="${c}">
      <div class="lay-ctl-nome">${nome}</div>
      <div class="linha">
        <button type="button" data-lay-escolher>Escolher imagem…</button>
        <button type="button" data-lay-remover class="perigo" title="Remover">✕</button>
      </div>
      <label class="campo">Tamanho <span class="lay-tam-valor"></span>
        <input type="range" min="5" max="70" step="1" data-lay-tam>
      </label>
    </div>`).join('');

  ctl.addEventListener('click', e => {
    const c = e.target.closest('.lay-ctl')?.dataset.canto;
    if (!c) return;
    if (e.target.closest('[data-lay-escolher]')) { Apresentacao.cantoEscolhendo = c; $('#arqLayout').click(); }
    else if (e.target.closest('[data-lay-remover]')) { delete objetoAlvo()[c]; aposMudarLayout(); }
  });
  ctl.addEventListener('input', e => {
    if (!e.target.matches('[data-lay-tam]')) return;
    const c = e.target.closest('.lay-ctl').dataset.canto, obj = objetoAlvo();
    if (!obj[c]) return;
    obj[c].tam = +e.target.value;
    aposMudarLayout();
  });
  $('#arqLayout').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const img = await reduzirImagem(f);
      const c = Apresentacao.cantoEscolhendo, obj = objetoAlvo();
      obj[c] = { img, tam: obj[c]?.tam || TAM_PADRAO[c] };
      aposMudarLayout();
    } catch (err) { alert(err.message); }
  });

  // Local do roteiro → apresentação no telão
  $('#selLocalRoteiro').addEventListener('change', e => {
    S.roteiro.localId = e.target.value;
    salvarRoteiro();
    aoTrocarCapela();
    enviarLayout();
    const l = localDe(e.target.value);
    toast(l ? `Apresentação: ${l.tipo} ${l.nome}` : 'Apresentação padrão da paróquia');
  });
}

function renderLocalRoteiro() {
  const sel = $('#selLocalRoteiro');
  if (!sel || !S.roteiro) return;
  sel.innerHTML = opcoesLocais(localDoRoteiro(S.roteiro), '📍 Local: padrão da paróquia')
    .replace(/<option value="([^"]+)"( selected)?>/g, '<option value="$1"$2>📍 ');
}
