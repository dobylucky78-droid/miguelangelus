'use strict';
/*
 * Módulo "Calendário" (trilho da esquerda): calendário litúrgico para consultar qualquer data, passada ou futura.
 *  - mês com a cor litúrgica de cada dia (solenidades e festas em destaque)
 *  - o dia escolhido: celebração, tempo, cor, ciclo A/B/C e ano par/ímpar
 *  - celebrações da Agenda e roteiros daquele dia (abrir / criar)
 *  - datas principais do ano (Cinzas, Páscoa, Pentecostes, Advento…)
 * Usa Liturgia, ocorrencias, roteiroDaCelebracao, abrirRoteiroDaCelebracao, infoRoteiro, trocarRoteiro... (em tempo de execução).
 */

const Cal = { mes: null, sel: null };

const mesmoDia = (a, b) => a && b && isoData(a) === isoData(b);
const somaDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Datas que movem o ano litúrgico (as fixas, como o Natal, entram também para facilitar a consulta)
function datasDoAno(y) {
  const E = Liturgia.pascoa(y);
  let adv = new Date(y, 10, 27);
  while (adv.getDay() !== 0) adv = somaDias(adv, 1);
  return [
    ['Quarta-feira de Cinzas', somaDias(E, -46)],
    ['Domingo de Ramos', somaDias(E, -7)],
    ['Páscoa', E],
    ['Ascensão do Senhor', somaDias(E, 42)],
    ['Pentecostes', somaDias(E, 49)],
    ['Santíssima Trindade', somaDias(E, 56)],
    ['Corpus Christi', somaDias(E, 60)],
    ['Cristo Rei', somaDias(adv, -7)],
    ['1º Domingo do Advento', adv],
    ['Natal do Senhor', new Date(y, 11, 25)],
  ];
}

function renderCalLit() {
  const el = $('#calLit');
  if (!el) return;
  const hoje = new Date();
  Cal.sel ||= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  Cal.mes ||= new Date(Cal.sel.getFullYear(), Cal.sel.getMonth(), 1);
  const y = Cal.mes.getFullYear(), m = Cal.mes.getMonth();

  // dias com roteiro (para marcar no calendário)
  const comRoteiro = new Set(S.roteiros.map(r => infoRoteiro(r).iso).filter(Boolean));

  let grade = DIAS_CURTOS.map(d => `<div class="cl-sem">${d[0]}</div>`).join('');
  for (let i = 0; i < Cal.mes.getDay(); i++) grade += '<div></div>';
  const ultimo = new Date(y, m + 1, 0).getDate();
  for (let dia = 1; dia <= ultimo; dia++) {
    const d = new Date(y, m, dia), l = Liturgia.info(d);
    const cls = ['cl-dia', d.getDay() === 0 ? 'dom' : '', l.festa || /Páscoa$|Natal|Pentecostes|Ascensão|Trindade|Corpo e Sangue|Cristo Rei|Epifania|Cinzas|Ramos/.test(l.titulo) ? 'festa' : '',
      mesmoDia(d, hoje) ? 'hoje' : '', mesmoDia(d, Cal.sel) ? 'sel' : ''].filter(Boolean).join(' ');
    grade += `<button class="${cls}" data-cl-dia="${dia}" title="${esc(l.titulo)}${l.santo ? ` (${esc(l.santo.toLowerCase())})` : ''}${l.facultativa ? ` · mem. facultativa: ${esc(l.facultativa)}` : ''} · ${esc(l.cor)}" style="--cor:${l.corHex}">
      ${dia}${comRoteiro.has(isoData(d)) ? '<i class="cl-rot" title="Tem roteiro"></i>' : ''}</button>`;
  }

  // dia escolhido
  const d = Cal.sel, l = Liturgia.info(d), iso = isoData(d);
  const quando = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const celebs = typeof ocorrencias === 'function' ? ocorrencias(d) : [];
  const vinculados = new Set();
  const htmlCelebs = celebs.map(o => {
    const r = roteiroDaCelebracao(o);
    if (r) vinculados.add(r.id);
    return `<div class="cl-item ${o.cancelada ? 'cancelada' : ''}">
      <span class="cl-hora">${esc(o.hora)}</span><span class="cl-txt">${esc(o.texto)}${o.cancelada ? ' <b>(cancelada)</b>' : ''}</span>
      ${o.cancelada ? '' : `<button data-cl-celeb="${esc(o.chave)}">${r ? 'Abrir roteiro' : '＋ Roteiro'}</button>`}</div>`;
  }).join('');
  const soltos = S.roteiros.filter(r => infoRoteiro(r).iso === iso && !vinculados.has(r.id));
  const htmlRots = soltos.map(r => `<div class="cl-item"><span class="cl-txt">📋 ${esc(r.nome)}</span><button data-cl-rot="${r.id}">Abrir</button></div>`).join('');

  const datas = datasDoAno(y).map(([n, dt]) =>
    `<button class="cl-data ${mesmoDia(dt, Cal.sel) ? 'sel' : ''}" data-cl-ir="${isoData(dt)}"><span>${esc(n)}</span><span class="sutil">${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}</span></button>`).join('');

  el.innerHTML = `
    <div class="cl-nav">
      <button data-cl-mes="-1" title="Mês anterior">‹</button>
      <b class="cl-titulo">${MESES[m]} ${y}</b>
      <button data-cl-mes="1" title="Próximo mês">›</button>
      <button data-cl-hoje title="Voltar para hoje">Hoje</button>
    </div>
    <label class="cl-ir">Ir para <input type="month" id="calMes" value="${y}-${String(m + 1).padStart(2, '0')}"></label>
    <div class="cl-grade">${grade}</div>
    <div class="card-lit" style="border-left-color:${l.corHex}">
      <div class="s">${esc(quando)}</div>
      <div class="t">${esc(l.titulo)}</div>
      ${l.santo ? `<div class="s"><b>${esc(l.santo)}</b> · ${esc(l.tituloTempo)}</div>` : ''}
      ${l.facultativa ? `<div class="s">Memória facultativa: ${esc(l.facultativa)}</div>` : ''}
      ${Agenda.dados.locais.filter(x => x.padroeiro).map(x => ({ x, p: Liturgia.info(d, x.padroeiro) })).filter(({ p }) => p.padroeiro)
        .map(({ x, p }) => `<div class="s">⛪ <b>Solenidade de ${esc(p.titulo)}</b>, padroeiro(a) — só em ${esc(x.tipo)} ${esc(x.nome)}</div>`).join('')}
      <div class="s"><span class="cor-lit" style="background:${l.corHex}"></span> cor ${esc(l.cor)} · ${esc(l.tempo === 'Comum' ? 'Tempo Comum' : l.tempo)}</div>
      <div class="s">Ano ${l.ciclo} (domingos) · Ano ${l.ferial === 'I' ? 'ímpar (I)' : 'par (II)'} (semana)</div>
    </div>
    <div class="separador">Celebrações e roteiros do dia</div>
    ${htmlCelebs || htmlRots ? htmlCelebs + htmlRots : '<p class="sutil pequeno" style="margin:0">Nada marcado neste dia.</p>'}
    <button data-cl-novo>＋ Roteiro em branco neste dia</button>
    <div class="separador">Datas do ano ${y}</div>
    <div class="cl-datas">${datas}</div>
    <p class="sutil pequeno">Calcula o tempo litúrgico, as solenidades, as festas e as memórias dos santos (calendário do Brasil).
      Memória facultativa não muda a cor do dia; na Quaresma e de 17 a 24/12 as memórias ficam só como lembrete.</p>`;
}

function irParaData(d) {
  Cal.sel = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  Cal.mes = new Date(d.getFullYear(), d.getMonth(), 1);
  renderCalLit();
}

function ligarCalendarioLit() {
  const el = $('#calLit');
  // a faixa do dia no topo também abre o calendário
  $('#liturgia').style.cursor = 'pointer';
  $('#liturgia').addEventListener('click', () => { irParaData(new Date()); mostrarAba('calendario'); });
  el.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.clMes) { Cal.mes = new Date(Cal.mes.getFullYear(), Cal.mes.getMonth() + +b.dataset.clMes, 1); return renderCalLit(); }
    if (b.hasAttribute('data-cl-hoje')) return irParaData(new Date());
    if (b.dataset.clDia) { Cal.sel = new Date(Cal.mes.getFullYear(), Cal.mes.getMonth(), +b.dataset.clDia); return renderCalLit(); }
    if (b.dataset.clIr) return irParaData(deIso(b.dataset.clIr));
    if (b.dataset.clRot) {
      const r = S.roteiros.find(x => x.id === b.dataset.clRot);
      if (r) { trocarRoteiro(r); mostrarAba('roteiros'); }
      return;
    }
    if (b.dataset.clCeleb) {
      const o = ocorrencias(Cal.sel).find(x => x.chave === b.dataset.clCeleb);
      if (o) { await abrirRoteiroDaCelebracao(o); mostrarAba('roteiros'); }
      return;
    }
    if (b.hasAttribute('data-cl-novo')) {
      const d = Cal.sel, l = Liturgia.info(d);
      const r = novoRoteiro(`${DIAS_CURTOS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} — ${l.titulo}`);
      r.data = isoData(d);
      S.roteiros.push(r);
      await DB.salvar('roteiros', r);
      trocarRoteiro(r);
      mostrarAba('roteiros');
      toast('Roteiro criado. Aplique um modelo de Missa ou importe o folheto.');
    }
  });
  el.addEventListener('change', e => {
    if (e.target.id !== 'calMes' || !e.target.value) return;
    const [y, m] = e.target.value.split('-').map(Number);
    Cal.mes = new Date(y, m - 1, 1);
    renderCalLit();
  });
}
