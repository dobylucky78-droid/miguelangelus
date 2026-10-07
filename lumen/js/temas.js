'use strict';
/*
 * Temas do telão: combinações prontas de cor de fundo, cor e estilo da letra.
 *  - "Ajustes" = o que está em Ferramentas → Ajustes → Aparência (sem mudar nada).
 *  - Cada capela pode ter o seu tema (Agenda → Paróquia → 🖼); a paróquia tem um padrão para todas.
 *  - Na tela de controle, os quadradinhos "Tema" trocam na hora (vale até trocar de roteiro).
 * Usa S, Agenda, localDe, localDoRoteiro, enviar, salvarAgenda… (em tempo de execução).
 */

// Um tema muda só as CORES (e tira a sombra nos fundos claros). Fonte, tamanho e MAIÚSCULAS continuam os dos Ajustes.
const TEMAS = [
  { id: 'ajustes', nome: 'Ajustes', dica: 'O que está em Ferramentas → Ajustes → Aparência' },
  { id: 'escuro', nome: 'Escuro', corFundo: '#000000', corTexto: '#ffffff', corRotulo: '#ff5a4f' },
  { id: 'azul', nome: 'Azul claro', corFundo: '#d9eefa', corTexto: '#111111', sombra: false, corRotulo: '#c8102e' },
  { id: 'creme', nome: 'Creme', corFundo: '#fbf1de', corTexto: '#111111', sombra: false, corRotulo: '#c8102e' },
  // muda sozinho com o tempo litúrgico do roteiro aberto (a mesma cor do card: Advento roxo, Natal branco, Comum verde…)
  { id: 'liturgico', nome: 'Tempo litúrgico', dica: 'A cor do tempo litúrgico do roteiro aberto: verde, roxo, branco, vermelho ou rosa' },
];
const temaPorId = id => TEMAS.find(t => t.id === id) || TEMAS[0];

// Cores do telão para cada cor litúrgica: fundos escuros e sóbrios (o texto continua bem legível); no branco, fundo claro
const CORES_TEMA_LIT = {
  verde: { corFundo: '#0f2d1d', corTexto: '#ffffff', corRotulo: '#ffd166' },
  roxo: { corFundo: '#2c1442', corTexto: '#ffffff', corRotulo: '#ffd166' },
  rosa: { corFundo: '#4a1d36', corTexto: '#ffffff', corRotulo: '#ffd166' },
  vermelho: { corFundo: '#3f0d13', corTexto: '#ffffff', corRotulo: '#ffd166' },
  branco: { corFundo: '#fbf6ea', corTexto: '#111111', sombra: false, corRotulo: '#a8750a' },
  preto: { corFundo: '#000000', corTexto: '#ffffff', corRotulo: '#ff5a4f' },
};
const corLiturgicaAtual = () => {
  try { return semAcento(liturgiaDoRoteiro(S.roteiro).cor || ''); } catch (_) { return ''; }
};
// as cores que um tema põe no telão (o "Tempo litúrgico" depende do roteiro aberto; sem cor conhecida: Escuro)
function coresDoTema(t) {
  if (t.id === 'liturgico') return CORES_TEMA_LIT[corLiturgicaAtual()] || CORES_TEMA_LIT.preto;
  const { id: _i, nome: _n, dica: _d, ...cores } = t;
  return cores;
}

const Temas = { manual: null };     // tema escolhido na tela de controle (null = o da capela)

// Tema da capela do roteiro aberto: o da comunidade; senão o padrão da paróquia; senão "Ajustes"
function temaDaCapela() {
  const loc = localDe(localDoRoteiro(S.roteiro));
  return loc?.tema || Agenda.dados.paroquia?.tema || 'ajustes';
}
// Com a câmera no telão o tema é sempre o Escuro (a letra por cima da câmera precisa ser branca);
// ao tirar a câmera, volta o tema que estava
const cameraNoTelao = () => typeof Camera !== 'undefined' && !!Camera.ativa;
const temaAtual = () => cameraNoTelao() ? 'escuro' : Temas.manual || temaDaCapela();

// Ajustes com o tema por cima: é isso que vai para o telão
function configTelao(id = temaAtual()) {
  const t = temaPorId(id);
  if (t.id === 'ajustes') return S.config;
  return { ...S.config, ...coresDoTema(t), fundoImagem: '' };
}

function enviarConfigTelao(destinos) {
  enviar({ tipo: 'config', config: configTelao() }, destinos);
}

function escolherTema(id) {
  Temas.manual = id === temaDaCapela() ? null : id;
  enviarConfigTelao();
  renderTemasRapidos();
  if (cameraNoTelao()) return toast(`Com a câmera no telão o tema fica Escuro. Ao tirar a câmera, entra o ${temaPorId(id).nome}.`);
  toast(`Tema do telão: ${temaPorId(id).nome}${Temas.manual ? ' (até trocar de roteiro)' : ''}`);
}

// Amostra "Aa" com as cores do tema
function amostraTema(t, sel, atributo) {
  const c = t.id === 'ajustes' ? S.config : { ...S.config, ...coresDoTema(t) };
  const lit = t.id === 'liturgico';
  return `<button type="button" class="tema-amostra ${sel ? 'sel' : ''} ${lit ? 'tema-lit' : ''}" ${atributo}="${t.id}" title="${esc(t.nome)}${t.dica ? ' — ' + esc(t.dica) : ''}${lit && corLiturgicaAtual() ? ' (agora: ' + corLiturgicaAtual() + ')' : ''}"
    style="background:${c.corFundo || '#000'};color:${c.corTexto || '#fff'};font-weight:${c.negrito ? 700 : 400}">${lit ? '✝' : c.maiusculas ? 'AA' : 'Aa'}</button>`;
}

function renderTemasRapidos() {
  const el = $('#temasRapidos');
  if (!el) return;
  const atual = temaAtual(), capela = temaDaCapela();
  el.innerHTML = `<span class="sutil pequeno" title="Tema do telão. O da capela é o que tem o ponto.">Tema</span>` +
    TEMAS.map(t => `<span class="tema-wrap">${amostraTema(t, t.id === atual, 'data-tema')}${t.id === capela ? '<i class="tema-capela" title="Tema desta capela"></i>' : ''}</span>`).join('') +
    `<span class="sutil pequeno tema-nome">${cameraNoTelao() ? '📷 Escuro (câmera)' : esc(temaPorId(atual).nome)}</span>`;
}

// Roteiro (e capela) mudou: volta para o tema da capela
function aoTrocarCapela() {
  Temas.manual = null;
  renderTemasRapidos();
  if (temaAtual() === 'liturgico') enviarConfigTelao();     // a cor do roteiro novo pode ser outra
}

// Ferramentas → "Temas por tempo litúrgico": liga/desliga para a paróquia toda (as capelas com tema próprio continuam com o delas)
function alternarTemaLiturgico() {
  const p = Agenda.dados.paroquia || (Agenda.dados.paroquia = {});
  const ligado = p.tema === 'liturgico';
  if (!confirm(ligado
    ? 'Desligar o tema por tempo litúrgico?\n\nO telão volta ao tema "Ajustes" (o de Ferramentas → Ajustes → Aparência).'
    : 'Ligar o tema por tempo litúrgico para a paróquia?\n\nO fundo do telão acompanha a cor litúrgica do roteiro aberto: verde no Tempo Comum, ' +
      'roxo no Advento e na Quaresma, branco no Natal e na Páscoa, vermelho em Pentecostes e nos mártires, rosa no Gaudete e no Laetare.\n\n' +
      'Capelas com tema próprio (Agenda → Paróquia → 🖼) continuam com o delas; o quadradinho ✝ na tela de controle também liga só por um roteiro.')) return;
  if (ligado) delete p.tema; else p.tema = 'liturgico';
  salvarAgenda();
  Temas.manual = null;
  enviarConfigTelao();
  renderTemasRapidos();
  toast(ligado ? 'Tema por tempo litúrgico desligado.' : `✝ Tema por tempo litúrgico ligado${corLiturgicaAtual() ? ' (agora: ' + corLiturgicaAtual() + ')' : ''}.`);
}

function ligarTemas() {
  $('#temasRapidos').addEventListener('click', e => {
    const b = e.target.closest('[data-tema]');
    if (b) escolherTema(b.dataset.tema);
  });
  $('#layTemas').addEventListener('click', e => {
    const b = e.target.closest('[data-lay-tema]');
    if (!b) return;
    const a = Apresentacao.alvo, id = b.dataset.layTema;
    const dono = a?.localId ? localDe(a.localId) : Agenda.dados.paroquia;
    if (!dono) return;
    if (id === 'herdar') delete dono.tema; else dono.tema = id;
    salvarAgenda();
    renderEditorLayout();
    Temas.manual = null;
    enviarConfigTelao();
    renderTemasRapidos();
  });
  renderTemasRapidos();
}

// Escolha do tema no editor da apresentação (Agenda → Paróquia → 🖼)
function renderTemasLayout() {
  const a = Apresentacao.alvo;
  const dono = a?.localId ? localDe(a.localId) : Agenda.dados.paroquia;
  const proprio = dono?.tema || '';
  const herdado = a?.localId ? (Agenda.dados.paroquia?.tema || 'ajustes') : null;
  $('#layTemas').innerHTML = (a?.localId ? `<button type="button" class="tema-herdar ${!proprio ? 'sel' : ''}" data-lay-tema="herdar">Igual ao da paróquia (${esc(temaPorId(herdado).nome)})</button>` : '') +
    TEMAS.map(t => `<span class="tema-wrap">${amostraTema(t, a?.localId ? proprio === t.id : (proprio || 'ajustes') === t.id, 'data-lay-tema')}<small>${esc(t.nome)}</small></span>`).join('');
  return temaPorId(proprio || herdado || 'ajustes');
}
