'use strict';
/*
 * Configurações da tela salvas (Ajustes → Aparência): a aparência do telão (fonte, tamanho, cores, maiúsculas, negrito,
 * alinhamento, linhas e letras por slide…) guardada com um nome, para cada pessoa da PASCOM usar a sua. Escolher uma
 * aplica os valores nos Ajustes (dá para mudar depois e gravar por cima). Vão para os outros computadores pela nuvem.
 * Usa S, $, $$, esc, uid, DB, toast, salvarConfig, enviarConfigTelao, renderTemasRapidos, atualizarSlides… (em tempo de execução).
 */
const Perfis = { lista: [] };
const CAMPOS_PERFIL = ['fonte', 'fonteMax', 'corTexto', 'corFundo', 'alinhamento', 'sombra', 'maiusculas', 'negrito', 'rodape',
  'mostrarRotulos', 'corRotulo', 'espacoResposta',
  // Tamanho dos slides (outra seção dos Ajustes, mas também é "o jeito da tela")
  'quebraAuto', 'linhasPorSlide', 'caracteresPorLinha', 'quebraCantos', 'versosPorSlide', 'salmoCorrido',
  'textoAltar'];                       // a tela do botão Altar (que já usa a aparência acima)

const perfilAtivo = () => Perfis.lista.find(p => p.id === S.config.perfilAtivo) || null;
// opção nunca mexida (ex.: negrito) entra com o valor padrão (ou "desligado"), para o Padrão conseguir voltar a ela
const aparenciaAtual = () => Object.fromEntries(CAMPOS_PERFIL.map(k => [k, S.config[k] ?? CONFIG_PADRAO[k] ?? false]));
const salvarPerfis = () => DB.salvar('config', { id: 'perfis', valor: { lista: Perfis.lista } });

async function carregarPerfis() {
  const r = await DB.obter('config', 'perfis');
  Perfis.lista = r?.valor?.lista || [];
  if (S.config.perfilAtivo && !perfilAtivo()) { S.config.perfilAtivo = ''; salvarConfig(); }   // apagada em outro computador
  // abriu em "Padrão": esta é a aparência padrão (para onde "Padrão" volta depois de usar um perfil)
  if (!S.config.perfilAtivo) { S.config.aparenciaPadrao = aparenciaAtual(); salvarConfig(); }
  renderPerfis();
}

function renderPerfis() {
  const sel = $('#perfilSel');
  if (!sel) return;
  const p = perfilAtivo();
  if (typeof renderTemasRapidos === 'function') renderTemasRapidos();      // o seletor "Perfil" da tela de controle
  sel.innerHTML = `<option value="">Padrão${Perfis.lista.length ? '' : ' (nenhum perfil salvo ainda)'}</option>` +
    [...Perfis.lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(x => `<option value="${esc(x.id)}" ${p === x ? 'selected' : ''}>${esc(x.nome)}</option>`).join('');
  $('#perfilGravar').hidden = $('#perfilApagar').hidden = !p;
  if (p) $('#perfilGravar').textContent = `Gravar por cima de "${p.nome}"`;
}

// Mostra nos campos de Ajustes → Aparência os valores atuais (depois de aplicar uma configuração)
function sincronizarCamposAjustes() {
  for (const el of $$('[data-cfg]')) {
    const k = el.dataset.cfg;
    if (el.type === 'checkbox') el.checked = !!S.config[k]; else el.value = S.config[k] ?? '';
  }
}

// Escolher um perfil aplica os valores dele; "Padrão" ('') volta à aparência que estava antes do primeiro perfil escolhido
function aplicarPerfil(id) {
  const p = Perfis.lista.find(x => x.id === id) || null;
  if (!S.config.perfilAtivo) S.config.aparenciaPadrao = aparenciaAtual();       // saindo do Padrão: guarda para voltar
  // só o que o perfil tem gravado (um perfil de antes de uma opção nova não apaga o valor em uso)
  const valores = p ? p.cfg : S.config.aparenciaPadrao || {};
  for (const [k, v] of Object.entries(valores)) if (v !== undefined && v !== null) S.config[k] = v;
  S.config.perfilAtivo = p ? p.id : '';
  salvarConfig();
  sincronizarCamposAjustes();
  enviarConfigTelao(); atualizarSlides();
  if (typeof atualizarAltarNoAr === 'function') atualizarAltarNoAr();
  renderPerfis();
  toast(p ? `Perfil "${p.nome}" no telão.` : 'Aparência padrão no telão.');
}

// Seletor "Perfil" ao lado dos temas, na tela de controle (renderTemasRapidos chama)
function htmlSeletorPerfil() {
  const p = perfilAtivo();
  return `<label class="perfil-sel" title="Perfil: a configuração da tela de quem está projetando (salva em Ajustes → Aparência do telão)">
    <span class="sutil pequeno">Perfil</span>
    <select id="perfilRapido">
      <option value="">Padrão</option>
      ${[...Perfis.lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(x => `<option value="${esc(x.id)}" ${p === x ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}
      <option disabled>──────────</option>
      <option value="+novo">＋ Salvar o atual como perfil…</option>
      ${p ? `<option value="+gravar">💾 Gravar o atual em "${esc(p.nome)}"</option>` : ''}
    </select></label>`;
}

async function salvarPerfilNovo() {
  const nome = (prompt('Nome desta configuração da tela (ex.: Ana, Pedro, Letra grande):') || '').trim();
  if (!nome) return;
  const igual = Perfis.lista.find(x => x.nome.toLowerCase() === nome.toLowerCase());
  if (igual && !confirm(`Já existe "${igual.nome}". Gravar por cima?`)) return;
  const p = igual || { id: uid(), nome };
  p.cfg = aparenciaAtual();
  if (!igual) Perfis.lista.push(p);
  // o que foi mudado para montar este perfil é dele: o "Padrão" continua o que era (guardado ao abrir ou ao voltar para ele)
  if (!S.config.perfilAtivo && !S.config.aparenciaPadrao) S.config.aparenciaPadrao = aparenciaAtual();
  S.config.perfilAtivo = p.id;
  salvarConfig();
  await salvarPerfis();
  renderPerfis();
  toast(`Configuração "${nome}" salva.`);
}

async function gravarPorCimaDoPerfil() {
  const p = perfilAtivo();
  if (!p || !confirm(`Gravar a aparência atual em "${p.nome}"?`)) return renderPerfis();
  p.cfg = aparenciaAtual();
  await salvarPerfis();
  renderPerfis();
  toast(`Configuração "${p.nome}" atualizada.`);
}

async function apagarPerfil() {
  const p = perfilAtivo();
  if (!p || !confirm(`Apagar a configuração "${p.nome}"? (Nos outros computadores também.)\nA aparência atual do telão não muda.`)) return;
  Perfis.lista = Perfis.lista.filter(x => x !== p);
  S.config.perfilAtivo = '';
  salvarConfig();
  await salvarPerfis();
  renderPerfis();
}

function ligarPerfis() {
  $('#perfilSel').addEventListener('change', e => aplicarPerfil(e.target.value));
  // seletor da tela de controle (é redesenhado junto com os temas)
  document.addEventListener('change', e => {
    if (e.target.id !== 'perfilRapido') return;
    const v = e.target.value;
    if (v === '+novo') return salvarPerfilNovo().then(renderPerfis);
    if (v === '+gravar') return gravarPorCimaDoPerfil();
    aplicarPerfil(v);
  });
  $('#perfilSalvar').addEventListener('click', salvarPerfilNovo);
  $('#perfilGravar').addEventListener('click', gravarPorCimaDoPerfil);
  $('#perfilApagar').addEventListener('click', apagarPerfil);
  carregarPerfis();
}
