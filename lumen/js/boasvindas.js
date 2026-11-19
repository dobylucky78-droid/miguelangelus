'use strict';
/*
 * (1.9.6) Duas ajudas para montar os roteiros da semana:
 *
 * 1. 🎬 Vídeo de boas-vindas de cada igreja (Agenda → Paróquia e comunidades, ao editar a matriz ou a capela):
 *    o vídeo e a caixinha "começar os roteiros novos de Missa com ele". Marcada, todo roteiro de Missa CRIADO daqui
 *    para frente para aquela igreja (pela Agenda, pela Liturgia do dia ou pelo folheto) nasce com o vídeo como 1º item.
 *    Os roteiros que já existem não mudam. O item leva a marca `boasVindas: true` (e o folheto/liturgia que refaz o
 *    roteiro mantém o vídeo no começo).
 *
 * 2. ➕ "Incluir em todos os roteiros do dia / da semana" no "🎉 Apresentar eventos" (e no "💝 Campanhas"): uma cópia
 *    do item entra nos roteiros já criados daquele dia (ou da semana, de domingo a sábado) que ainda não têm um item
 *    igual — logo depois do vídeo de boas-vindas, ou como 1º item se o roteiro não começa com ele.
 *
 * O vídeo é guardado pelo id da mídia (pasta:video:<caminho>): os computadores com a mesma pasta de vídeos acham o mesmo.
 * Usa $, $$, esc, uid, toast, S, Agenda, localDe, Midia, midiaPorId, favsOrdenadas, infoRoteiro, deIso, isoData,
 * hojeIso, dataBR, DB, salvarAgenda, SECRETARIA (em tempo de execução).
 */

// ---------- 1. vídeo de boas-vindas ----------
function opcoesVideoBV(sel) {
  const opt = (id, txt) => `<option value="${esc(id)}" ${id === sel ? 'selected' : ''}>${esc(txt)}</option>`;
  const pasta = (Midia.pastas.video?.arquivos || []).filter(m => !m.faltando).sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR', { numeric: true }));
  const guardados = Midia.lista.filter(m => m.tipo === 'video').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const favs = favsOrdenadas().map(f => ({ f, m: midiaPorId(f.id) })).filter(x => x.m?.tipo === 'video' && !x.m.faltando);
  const m = sel ? midiaPorId(sel) : null;
  const sumido = sel && (!m || m.faltando) ? `<option value="${esc(sel)}" selected>(vídeo não encontrado neste computador)</option>` : '';
  return '<option value="">— sem vídeo de boas-vindas —</option>' + sumido +
    (favs.length ? `<optgroup label="⭐ Favoritos">${favs.map(({ f, m }) => opt(m.id, (f.apelido ? `${f.apelido} — ` : '') + m.nome)).join('')}</optgroup>` : '') +
    (pasta.length ? `<optgroup label="Vídeos (pasta)">${pasta.map(x => opt(x.id, x.caminho)).join('')}</optgroup>` : '') +
    (guardados.length ? `<optgroup label="Vídeos guardados">${guardados.map(x => opt(x.id, x.nome)).join('')}</optgroup>` : '');
}

// o formulário da igreja (agenda.js): preencher, ler, limpar
function preencherBoasVindasForm(l) {
  const linha = $('#parLocBVLinha');
  if (!linha) return;
  linha.hidden = !!SECRETARIA;               // a Secretaria não tem vídeos (o que já estiver configurado continua)
  if (SECRETARIA) return;
  $('#parLocBV').innerHTML = opcoesVideoBV(l === undefined ? $('#parLocBV').value : l?.boasVindas?.midiaId || '');
  if (l !== undefined) { $('#parLocBVAuto').checked = !!l?.boasVindas?.auto; $('#parLocBVRepetir').checked = !!l?.boasVindas?.repetir; }
  $('#parLocBVAuto').disabled = $('#parLocBVRepetir').disabled = !$('#parLocBV').value;
}
function lerBoasVindasForm() {
  if (SECRETARIA || !$('#parLocBV')) return undefined;     // não mexe no que já existe
  const id = $('#parLocBV').value;
  return id ? { midiaId: id, nome: midiaPorId(id)?.nome || '', auto: $('#parLocBVAuto').checked, repetir: $('#parLocBVRepetir').checked } : null;
}

const boasVindasAuto = localId => { const b = localDe(localId)?.boasVindas; return b?.midiaId && b.auto ? b : null; };
// (1.9.10) "🔁 Repetir automaticamente" na igreja: o item já nasce com Repetir marcado
const itemBoasVindas = b => ({ id: uid(), tipo: 'midia', midiaId: b.midiaId, loop: !!b.repetir, boasVindas: true });

// roteiro NOVO de Missa daquela igreja: o vídeo entra como 1º item (se ainda não começa com ele)
function comBoasVindas(itens, localId) {
  const b = boasVindasAuto(localId);
  if (!b || itens[0]?.boasVindas) return itens;
  return [itemBoasVindas(b), ...itens];
}
// o folheto/liturgia refez os itens de um roteiro que já começava com o vídeo de boas-vindas: o vídeo continua
function manterBoasVindas(velhos, novos) {
  const v = (velhos || [])[0];
  return v?.boasVindas && !novos[0]?.boasVindas ? [v, ...novos] : novos;
}

// ---------- 2. incluir o item em todos os roteiros do dia / da semana ----------
function htmlIncluirEmTodos(it) {
  if (!S.atual || S.atual.item !== it || S.atual.rIdx < 0) return '';
  return `<span class="espaco"></span><span class="sutil pequeno">➕ Pôr nos outros roteiros:</span>
    <button type="button" data-incluir-todos="dia" title="Uma cópia deste item entra nos roteiros já criados deste dia (depois do vídeo de boas-vindas, ou como 1º item)">do dia</button>
    <button type="button" data-incluir-todos="semana" title="Uma cópia deste item entra nos roteiros já criados desta semana, de domingo a sábado (depois do vídeo de boas-vindas, ou como 1º item)">da semana</button>`;
}

function roteirosParaIncluir(it, quando) {
  const base = infoRoteiro(S.roteiro).iso || hojeIso();
  let ini = base, fim = base;
  if (quando === 'semana') {
    const d = deIso(base), dom = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
    ini = isoData(dom); fim = isoData(new Date(dom.getFullYear(), dom.getMonth(), dom.getDate() + 6));
  }
  const alvo = [], jaTem = [];
  for (const r of S.roteiros) {
    if (r === S.roteiro) continue;
    const iso = infoRoteiro(r).iso;
    if (!iso || iso < ini || iso > fim) continue;
    (r.itens.some(x => x.tipo === it.tipo) ? jaTem : alvo).push(r);
  }
  const ordem = (a, b) => { const x = infoRoteiro(a), y = infoRoteiro(b); return (x.iso + (x.hora || '')).localeCompare(y.iso + (y.hora || '')); };
  return { ini, fim, alvo: alvo.sort(ordem), jaTem };
}

async function incluirEmTodos(it, quando) {
  const { ini, fim, alvo, jaTem } = roteirosParaIncluir(it, quando);
  const periodo = ini === fim ? `de ${dataBR(ini)}` : `de ${dataBR(ini).slice(0, 5)} a ${dataBR(fim)}`;
  const nome = nomeItemGrupo(it);
  if (!alvo.length) return toast(jaTem.length ? `Os roteiros ${periodo} já têm "${nome}".` : `Nenhum outro roteiro criado ${periodo}.`);
  const linhas = alvo.slice(0, 15).map(r => '• ' + r.nome).join('\n') + (alvo.length > 15 ? `\n… e mais ${alvo.length - 15}` : '');
  if (!confirm(`Pôr "${nome}" em ${alvo.length} roteiro(s) ${periodo}?\n\n${linhas}\n\n` +
    `Entra depois do vídeo de boas-vindas (ou como 1º item).${jaTem.length ? `\n${jaTem.length} roteiro(s) que já têm um item igual ficam como estão.` : ''}`)) return;
  for (const r of alvo) {
    const copia = { ...structuredClone(it), id: uid() };
    r.itens.splice(r.itens[0]?.boasVindas ? 1 : 0, 0, copia);
    r.atualizado = Date.now();
    await DB.salvar('roteiros', r);
  }
  if (S.modoCards && typeof renderCardsRoteiros === 'function') renderCardsRoteiros();
  toast(`➕ "${nome}" incluído em ${alvo.length} roteiro(s) ${periodo}.`);
}

function ligarBoasVindas() {
  $('#parLocBV')?.addEventListener('change', () => { $('#parLocBVAuto').disabled = $('#parLocBVRepetir').disabled = !$('#parLocBV').value; if ($('#parLocBV').value && !$('#parLocBVAuto').dataset.mexeu) $('#parLocBVAuto').checked = true; });
  $('#parLocBVAuto')?.addEventListener('change', e => { e.target.dataset.mexeu = '1'; });
  $('#itemCab').addEventListener('click', e => {
    const b = e.target.closest('[data-incluir-todos]');
    if (b && S.atual) incluirEmTodos(S.atual.item, b.dataset.incluirTodos);
  });
}
