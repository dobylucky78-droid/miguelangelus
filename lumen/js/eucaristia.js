'use strict';
/*
 * Orações Eucarísticas e Prefácios.
 *  - Catálogo com os nomes (baseado no Missal Romano, 3ª edição — confira com o Missal da paróquia)
 *    e as regras de combinação (quais prefácios cada oração aceita).
 *  - Os TEXTOS não vêm prontos: são guardados automaticamente quando um folheto traz a oração/prefácio
 *    do dia, ou colados à mão (✎). Assim o texto é sempre o oficial.
 *  - No roteiro: item "prefacio" (depois do Diálogo do Prefácio) e item "eucaristica" (depois do Santo).
 * Registro { id: 'eucaristia' } no store "config" (entra no backup).
 */

// pref: 'livre' = aceita os prefácios do Missal | 'fixo' = só o próprio | 'fixo-flex' = próprio ou de tema penitencial
const OES = [
  { id: 'oe1', nome: 'Oração Eucarística I (Cânon Romano)', pref: 'livre' },
  { id: 'oe2', nome: 'Oração Eucarística II', pref: 'livre', proprio: 'p-oe2', obs: 'Tem prefácio próprio, que pode ser trocado por outro.' },
  { id: 'oe3', nome: 'Oração Eucarística III', pref: 'livre' },
  { id: 'oe4', nome: 'Oração Eucarística IV', pref: 'fixo', proprio: 'p-oe4', obs: 'O prefácio faz parte da oração e não se troca.' },
  { id: 'oe5', nome: 'Oração Eucarística V', pref: 'fixo', proprio: 'p-oe5', obs: 'Tem prefácio próprio.' },
  { id: 'rec1', nome: 'Oração Eucarística sobre a Reconciliação I', pref: 'fixo-flex', proprio: 'p-rec1', obs: 'Tem prefácio próprio; as rubricas admitem outros de tema penitencial (Quaresma). Confira no Missal.' },
  { id: 'rec2', nome: 'Oração Eucarística sobre a Reconciliação II', pref: 'fixo-flex', proprio: 'p-rec2', obs: 'Tem prefácio próprio; as rubricas admitem outros de tema penitencial (Quaresma). Confira no Missal.' },
  { id: 'dc1', nome: 'Oração Eucarística para Diversas Circunstâncias I — A Igreja a caminho da unidade', pref: 'fixo', proprio: 'p-dc1', obs: 'Prefácio próprio.' },
  { id: 'dc2', nome: 'Oração Eucarística para Diversas Circunstâncias II — Deus conduz a sua Igreja', pref: 'fixo', proprio: 'p-dc2', obs: 'Prefácio próprio.' },
  { id: 'dc3', nome: 'Oração Eucarística para Diversas Circunstâncias III — Jesus, caminho para o Pai', pref: 'fixo', proprio: 'p-dc3', obs: 'Prefácio próprio.' },
  { id: 'dc4', nome: 'Oração Eucarística para Diversas Circunstâncias IV — Jesus, que passa fazendo o bem', pref: 'fixo', proprio: 'p-dc4', obs: 'Prefácio próprio.' },
];

const GRUPO_PROPRIOS = 'Próprios das Orações Eucarísticas';
const romanos = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].slice(0, n);
const GRUPOS_PREF = [
  { grupo: GRUPO_PROPRIOS, itens: [['p-oe2', 'Prefácio da Oração Eucarística II'], ['p-oe4', 'Prefácio da Oração Eucarística IV'], ['p-oe5', 'Prefácio da Oração Eucarística V'],
    ['p-rec1', 'Prefácio da Reconciliação I'], ['p-rec2', 'Prefácio da Reconciliação II'],
    ['p-dc1', 'Prefácio das Diversas Circunstâncias I'], ['p-dc2', 'Prefácio das Diversas Circunstâncias II'],
    ['p-dc3', 'Prefácio das Diversas Circunstâncias III'], ['p-dc4', 'Prefácio das Diversas Circunstâncias IV']] },
  { grupo: 'Advento', itens: romanos(2).map((r, i) => [`adv${i + 1}`, `Advento ${r}`]) },
  { grupo: 'Natal', itens: [...romanos(3).map((r, i) => [`nat${i + 1}`, `Natal ${r}`]), ['epif', 'Epifania do Senhor']] },
  { grupo: 'Quaresma', itens: romanos(4).map((r, i) => [`qua${i + 1}`, `Quaresma ${r}`]) },
  { grupo: 'Domingos da Quaresma', itens: [['qd1', '1º Domingo da Quaresma — A tentação do Senhor'], ['qd2', '2º Domingo da Quaresma — A Transfiguração'],
    ['qd3', '3º Domingo da Quaresma — A samaritana'], ['qd4', '4º Domingo da Quaresma — O cego de nascença'], ['qd5', '5º Domingo da Quaresma — Lázaro']] },
  { grupo: 'Paixão do Senhor', itens: [['pai1', 'Paixão do Senhor I'], ['pai2', 'Paixão do Senhor II'], ['ramos', 'Domingo de Ramos e da Paixão']] },
  { grupo: 'Páscoa', itens: [...romanos(5).map((r, i) => [`pas${i + 1}`, `Páscoa ${r}`]), ['asc1', 'Ascensão do Senhor I'], ['asc2', 'Ascensão do Senhor II'], ['pent', 'Pentecostes']] },
  { grupo: 'Domingos do Tempo Comum', itens: romanos(10).map((r, i) => [`tc${i + 1}`, `Domingos do Tempo Comum ${r}`]) },
  { grupo: 'Comuns', itens: romanos(6).map((r, i) => [`com${i + 1}`, `Comum ${r}`]) },
  { grupo: 'Solenidades e festas do Senhor', itens: [['trin', 'Santíssima Trindade'], ['batismo', 'Batismo do Senhor'], ['apres', 'Apresentação do Senhor'],
    ['anunc', 'Anunciação do Senhor'], ['transf', 'Transfiguração do Senhor'], ['cruz', 'Exaltação da Santa Cruz'], ['corac', 'Sagrado Coração de Jesus'],
    ['cristorei', 'Cristo Rei do Universo'], ['euc1', 'Santíssima Eucaristia I'], ['euc2', 'Santíssima Eucaristia II']] },
  { grupo: 'Espírito Santo', itens: [['es1', 'Espírito Santo I'], ['es2', 'Espírito Santo II']] },
  { grupo: 'Nossa Senhora', itens: [['nsra1', 'Virgem Maria I'], ['nsra2', 'Virgem Maria II'], ['imac', 'Imaculada Conceição'], ['assun', 'Assunção de Nossa Senhora']] },
  { grupo: 'Santos', itens: [['jose', 'São José'], ['joaob', 'São João Batista'], ['pedropaulo', 'São Pedro e São Paulo'], ['apost1', 'Apóstolos I'], ['apost2', 'Apóstolos II'],
    ['santos1', 'Santos I'], ['santos2', 'Santos II'], ['todossantos', 'Todos os Santos'], ['martires', 'Santos Mártires'], ['pastores', 'Santos Pastores'], ['virgens', 'Santas Virgens e Santos Religiosos'], ['anjos', 'Anjos']] },
  { grupo: 'Outras ocasiões', itens: [['unidade', 'Unidade dos Cristãos'], ['ded1', 'Dedicação de uma igreja I'], ['ded2', 'Dedicação de uma igreja II']] },
  { grupo: 'Defuntos', itens: romanos(5).map((r, i) => [`def${i + 1}`, `Defuntos ${r}`]) },
];

const Euc = { dados: { textos: {}, extras: [] }, sel: { oe: 'oe3', pref: null }, filtro: '', editando: null };

// ---------- Dados ----------

async function carregarEucaristia() {
  const reg = await DB.obter('config', 'eucaristia');
  if (reg?.valor) Object.assign(Euc.dados, reg.valor);
  renderNomesLiturgia();
}

// Ajustes → 🙏 Papa e Bispo
function renderNomesLiturgia() {
  const n = nomesLiturgia(), p = $('#nomePapa'), b = $('#nomeBispo');
  if (!p || !b) return;
  if (document.activeElement !== p) p.value = n.papa;
  if (document.activeElement !== b) b.value = n.bispo;
  const ex = $('#nomesExemplo');
  if (ex) ex.textContent = 'No telão: ' + trocarNomesN('“… com o vosso servo o Papa N., o nosso Bispo N., os bispos do mundo inteiro…”');
}
function ligarNomesLiturgia() {
  for (const [id, k] of [['nomePapa', 'papa'], ['nomeBispo', 'bispo']]) $('#' + id)?.addEventListener('input', e => {
    Euc.dados.nomes = { ...nomesLiturgia(), [k]: e.target.value };
    salvarEucaristia();
    renderNomesLiturgia();
    if (typeof atualizarSlides === 'function') atualizarSlides();
  });
  renderNomesLiturgia();
}
let timerEuc = 0;
function salvarEucaristia() {
  clearTimeout(timerEuc);
  timerEuc = setTimeout(() => DB.salvar('config', { id: 'eucaristia', valor: Euc.dados }), 200);
}

// (1.7.1) Nomes do Papa e do Bispo no lugar do "N." ("o vosso servo o Papa N., o nosso Bispo N."): nos folhetos importados, nas
// orações eucarísticas e nas orações. A troca é feita ao montar os slides (o texto guardado continua com "N."), então quando
// mudar o Papa ou o Bispo basta mudar aqui (Ajustes → 🙏 Papa e Bispo). Fica nos dados da Eucaristia: vai para os outros
// computadores pela nuvem. Como no folheto da Arquidiocese: "o nosso Bispo Orani João" (a palavra antes do N. continua a mesma).
const NOMES_PADRAO = { papa: 'Leão', bispo: 'Orani João' };
const nomesLiturgia = () => ({ ...NOMES_PADRAO, ...(Euc.dados.nomes || {}) });
function trocarNomesN(texto) {
  if (!texto || !/\bN\./.test(texto)) return texto;
  const n = nomesLiturgia();
  const trocar = (rx, nome) => {
    nome = String(nome || '').trim();
    if (!nome) return;
    texto = texto.replace(rx, (tudo, antes, pos, s) => {
      // "N." no fim da frase (fim do texto/linha ou seguido de maiúscula) era também o ponto final: o ponto fica
      const fimFrase = /^[ \t]*($|\n|[A-ZÀ-Ú—])/.test(s.slice(pos + tudo.length));
      return antes + nome + (fimFrase ? '.' : '');
    });
  };
  trocar(/(\b[Pp]apa\s+)N\./g, n.papa);
  trocar(/(\b(?:[Aa]rce)?[Bb]ispo\s+)N\./g, n.bispo);
  return texto;
}

const listaOEs = () => [...OES, ...Euc.dados.extras.filter(x => x.tipo === 'oe').map(x => ({ ...x, pref: 'livre', extra: true }))];
function listaPrefacios() {
  const base = GRUPOS_PREF.flatMap(g => g.itens.map(([id, nome]) => ({ id, nome, grupo: g.grupo })));
  return [...base, ...Euc.dados.extras.filter(x => x.tipo === 'pref').map(x => ({ ...x, extra: true }))];
}
const oeDe = id => listaOEs().find(o => o.id === id) || null;
const prefDe = id => listaPrefacios().find(p => p.id === id) || null;
const nomeEuc = id => (oeDe(id) || prefDe(id))?.nome || '?';
const temTexto = id => !!Euc.dados.textos[id]?.texto;

// Prefácios que podem ser usados com uma oração eucarística
function prefaciosPermitidos(oe) {
  if (!oe) return [];
  const livres = listaPrefacios().filter(p => p.grupo !== GRUPO_PROPRIOS);
  if (oe.pref === 'fixo') return [prefDe(oe.proprio)].filter(Boolean);
  if (oe.pref === 'fixo-flex') return [prefDe(oe.proprio), ...livres.filter(p => /quaresma/i.test(p.grupo))].filter(Boolean);
  return [...(oe.proprio ? [prefDe(oe.proprio)] : []), ...livres];
}

// ---------- (1.9.13, pedido do Luciano) Regras do dia: qual prefácio e quais orações ----------
// Baseado na IGMR 364–365 e nas rubricas dos prefácios do Missal Romano. Não depende do ano par/ímpar; do ano A/B/C só
// os 3º, 4º e 5º domingos da Quaresma (prefácios ligados aos evangelhos do Ano A).
// modo: 'rigido' = só os prefácios do dia (domingos dos tempos fortes, solenidades, Semana Santa, Tríduo, oitava da Páscoa);
//       'aviso'  = os do dia, outro só com confirmação (Missa votiva, de exéquias…); 'livre' = só sugestão.
// fixasOk: as orações de prefácio fixo (IV, V, Diversas Circunstâncias) só cabem em dia sem prefácio próprio (Tempo Comum).
const idsEuc = (p, n) => Array.from({ length: n }, (_, i) => p + (i + 1));
const PREF_PROPRIOS = [
  [/Domingo de Ramos/, ['ramos']], [/Natal do Senhor/, idsEuc('nat', 3)], [/Sagrada Família/, idsEuc('nat', 3)],
  [/Santa Maria, Mãe de Deus/, ['nsra1']], [/Epifania do Senhor/, ['epif']], [/Batismo do Senhor/, ['batismo']],
  [/Ascensão do Senhor/, ['asc1', 'asc2']], [/Pentecostes/, ['pent']], [/Santíssima Trindade/, ['trin']],
  [/Corpo e Sangue/, ['euc1', 'euc2']], [/Sagrado Coração/, ['corac']], [/Cristo Rei/, ['cristorei']],
  [/Apresentação do Senhor/, ['apres']], [/São José, Esposo/, ['jose']], [/Anunciação do Senhor/, ['anunc']],
  [/Natividade de São João Batista/, ['joaob']], [/São Pedro e São Paulo/, ['pedropaulo']], [/Transfiguração do Senhor/, ['transf']],
  [/Assunção de Nossa Senhora/, ['assun']], [/Exaltação da Santa Cruz/, ['cruz']], [/Aparecida/, ['nsra1', 'nsra2']],
  [/Fiéis Defuntos/, idsEuc('def', 5)], [/Todos os Santos/, ['todossantos']], [/Basílica do Latrão/, ['ded2', 'ded1']],
  [/Imaculada Conceição/, ['imac']], [/São Sebastião/, ['martires']],
];
const SOLENIDADES_EUC = /Natal do Senhor|Santa Maria, Mãe de Deus|Epifania do Senhor|Ascensão do Senhor|Pentecostes|Santíssima Trindade|Corpo e Sangue|Sagrado Coração|Cristo Rei|São José, Esposo|Anunciação do Senhor|Natividade de São João Batista|São Pedro e São Paulo|Assunção de Nossa Senhora|Aparecida|Todos os Santos|Imaculada Conceição|Fiéis Defuntos|Domingo de Ramos/;

// Prefácios dos santos pelo nome do dia (memórias e festas do santoral; padroeiro)
function prefsDoSanto(nome) {
  const n = semAcento(nome);
  if (/sao joao batista/.test(n)) return ['joaob'];
  if (/arcanjo|anjos/.test(n)) return ['anjos'];
  if (/nossa senhora|virgem maria|mae da igreja|imaculado coracao|nome de maria/.test(n)) return ['nsra1', 'nsra2'];
  if (/^sao jose( operario|,|$)/.test(n)) return ['jose'];
  if (/dedicacao/.test(n)) return ['ded2', 'ded1'];
  if (/jesus cristo|do senhor\b|nome de jesus/.test(n)) return null;
  if (/apostol|evangelista/.test(n)) return ['apost1', 'apost2'];
  if (/martir/.test(n)) return ['martires', 'santos1', 'santos2'];
  if (/virge|religios|abade|abadessa|monge|eremita/.test(n)) return ['virgens', 'santos1', 'santos2'];
  if (/\b(papa|bispo|presbitero|diacono|doutor)/.test(n)) return ['pastores', 'santos1', 'santos2'];
  return ['santos1', 'santos2'];
}

function regraEuc(data = new Date(), padroeiro = null) {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const lit = Liturgia.info(d, padroeiro);
  const E = Liturgia.pascoa(d.getFullYear());
  const dias = Math.round((d - E) / 864e5), m = d.getMonth() + 1, dia = d.getDate(), dom = d.getDay() === 0;
  const t = lit.titulo || '', tt = lit.tituloTempo || t, tempo = lit.tempo;
  const r = { titulo: lit.santo ? `${t} (${lit.santo.toLowerCase()})` : t, tempo, ciclo: lit.ciclo, prefs: [], modo: 'livre',
    fixasOk: false, nota: '', notaOE1: '', semMissa: false };
  const def = (prefs, modo, nota = '') => Object.assign(r, { prefs, modo, nota });
  // Oração Eucarística I com partes próprias (Communicantes / Hanc igitur)
  if ((m === 12 && dia >= 25) || (m === 1 && dia === 1) || /Epifania do Senhor|Ascensão do Senhor|Pentecostes/.test(t) || dias === -3 || (dias >= -1 && dias <= 7))
    r.notaOE1 = 'Se for usada a Oração Eucarística I, hoje ela tem partes próprias: confira no Missal.';

  if (tempo === 'Tríduo Pascal') {
    if (dias === -2) return Object.assign(r, { semMissa: true, modo: 'rigido',
      nota: 'Na Sexta-feira da Paixão não se celebra a Missa: não há prefácio nem Oração Eucarística.' });
    return def(dias === -3 ? ['euc1'] : ['pas1'], 'rigido');
  }
  const proprio = PREF_PROPRIOS.find(([re]) => re.test(t));
  const pas = idsEuc('pas', 5), nat = idsEuc('nat', 3), qua = idsEuc('qua', 4);
  if (proprio) return def(proprio[1], SOLENIDADES_EUC.test(t) || (dom && tempo !== 'Comum') ? 'rigido' : 'aviso');
  if (/Semana Santa/.test(tt)) return def(['pai2'], 'rigido');
  if (dias >= 0 && dias <= 7) return def(['pas1'], 'rigido', 'Na oitava da Páscoa usa-se o Prefácio da Páscoa I.');
  if ((m === 12 && dia >= 26) || (m === 1 && dia === 1)) return def(nat, 'aviso', 'Na oitava do Natal usa-se o prefácio do Natal, também nas festas dos santos.');

  // prefácios do tempo
  let doTempo = [], modoTempo = dom ? 'rigido' : 'aviso', nota = '';
  const n = parseInt(tt, 10) || 0;
  if (tempo === 'Advento') {
    doTempo = m === 12 && dia >= 17 ? ['adv2'] : ['adv1'];
    nota = m === 12 && dia >= 17 ? 'De 17 a 24 de dezembro: Advento II.' : 'Até 16 de dezembro: Advento I.';
  } else if (tempo === 'Natal') {
    const epi = new Date(d.getFullYear(), 0, 2); epi.setDate(2 + (7 - epi.getDay()) % 7);
    doTempo = m === 1 && d > epi ? ['epif', ...nat] : nat;
  } else if (tempo === 'Quaresma') {
    if (/Quarta-feira de Cinzas/.test(tt)) return def(['qua3', 'qua4'], 'rigido');
    if (dom && n >= 3 && n <= 5) {
      const ev = ['a samaritana', 'o cego de nascença', 'Lázaro'][n - 3];
      return def(lit.ciclo === 'A' ? [`qd${n}`, 'qua1', 'qua2'] : ['qua1', 'qua2', `qd${n}`], 'rigido',
        `O prefácio próprio deste domingo (${ev}) acompanha o Evangelho do Ano A. ` + (lit.ciclo === 'A'
          ? 'Neste ano (A) é o indicado.' : `No Ano ${lit.ciclo}, use-o só se forem lidas as leituras do Ano A; senão, Quaresma I ou II.`));
    }
    if (dom && n >= 1 && n <= 2) return def([`qd${n}`], 'rigido');
    doTempo = n === 5 ? ['pai1', ...qua] : qua;
    if (n === 5) nota = 'Na 5ª semana da Quaresma: de preferência, Paixão do Senhor I.';
  } else if (tempo === 'Páscoa') {
    doTempo = dias > 42 ? ['asc1', 'asc2', ...pas] : pas;
  } else {                                          // Tempo Comum
    r.fixasOk = !lit.padroeiro && lit.santo !== 'Festa';
    doTempo = dom ? idsEuc('tc', 10) : idsEuc('com', 6);
    modoTempo = dom ? 'aviso' : 'livre';
  }
  // santo do dia (festa, memória) ou padroeiro da comunidade (solenidade)
  if (lit.santo && (!dom || lit.padroeiro)) {
    const ps = prefsDoSanto(t) || doTempo;
    if (lit.padroeiro) return def(ps, 'rigido', 'Solenidade do padroeiro da comunidade.');
    if (lit.santo === 'Festa') return def(ps, 'aviso');
    return def([...new Set([...ps, ...doTempo])], tempo === 'Comum' ? 'livre' : 'aviso', 'Memória: prefácio do santo ou do tempo.');
  }
  return def(doTempo, modoTempo, nota);
}

function regraDoRoteiro(r = S.roteiro) {
  const inf = r ? infoRoteiro(r) : null;
  return regraEuc(inf?.data || new Date(), inf?.localId ? localDe(inf.localId)?.padroeiro : null);
}
const nomesPrefsRegra = regra => regra.prefs.map(nomeEuc).join(' ou ');

// O prefácio a usar com uma oração, no dia: o próprio (oração de prefácio fixo), o da OE II nos dias comuns,
// ou o 1º do dia que já tem texto cadastrado
function prefacioDoDia(oe, regra) {
  if (!oe) return null;
  if (oe.pref !== 'livre') return oe.proprio || null;
  if (oe.proprio && regra.fixasOk && regra.modo === 'livre') return oe.proprio;
  return regra.prefs.find(temTexto) || regra.prefs[0] || oe.proprio || null;
}

// Confere oração + prefácio no dia: { nivel: 'ok' | 'aviso' | 'bloq', msg }
function checarEuc(oeId, prefId, regra = regraDoRoteiro()) {
  const oe = oeDe(oeId), forte = regra.modo === 'rigido' ? 'bloq' : 'aviso';
  if (regra.semMissa) return { nivel: 'bloq', msg: regra.nota };
  if (oe && prefId) {
    if (oe.pref === 'fixo' && prefId !== oe.proprio)
      return { nivel: 'bloq', msg: `A ${oe.nome} tem prefácio próprio, que faz parte da oração e não se troca.` };
    if (oe.pref === 'fixo-flex' && prefId !== oe.proprio && !/quaresma/i.test(prefDe(prefId)?.grupo || ''))
      return { nivel: 'bloq', msg: `A ${oe.nome} usa o prefácio próprio ou um prefácio de tema penitencial (Quaresma).` };
  }
  if (oe && oe.pref !== 'livre' && !regra.fixasOk && !(oe.pref === 'fixo-flex' && regra.tempo === 'Quaresma'))
    return { nivel: forte, msg: `A ${oe.nome} tem prefácio próprio e por isso não se usa neste dia (${regra.titulo}), que tem prefácio do dia (${nomesPrefsRegra(regra)}). Use a Oração Eucarística I, II ou III.` };
  if (prefId && regra.modo !== 'livre' && !regra.prefs.includes(prefId) && !(oe && oe.pref !== 'livre' && prefId === oe.proprio)) {
    if (prefId.startsWith('x-')) return { nivel: 'aviso', msg: `Confira: neste dia (${regra.titulo}) o prefácio indicado é ${nomesPrefsRegra(regra)}.` };
    return { nivel: forte, msg: `Neste dia (${regra.titulo}) o prefácio é:${nomesPrefsRegra(regra)}.` };
  }
  return { nivel: 'ok', msg: '' };
}

// Pergunta/impede conforme o nível; true = pode seguir
function confirmarEuc(oeId, prefId, regra = regraDoRoteiro()) {
  const c = checarEuc(oeId, prefId, regra);
  if (c.nivel === 'bloq') {
    alert('⛔ ' + c.msg + (regra.semMissa ? '' : '\n\nSe a data do roteiro estiver errada, ou se a celebração foi transferida na sua comunidade, corrija a data do roteiro.'));
    return false;
  }
  if (c.nivel === 'aviso') return confirm('⚠ ' + c.msg + '\n\nUsar mesmo assim? (por exemplo, numa Missa votiva, de exéquias ou de casamento)');
  return true;
}

// Troca no cabeçalho do item do roteiro (select de prefácio ou de oração): confere com o outro item e com o dia.
// Oração de prefácio fixo leva o prefácio dela junto; voltar para uma oração livre traz o prefácio do dia.
function validarTrocaEuc(it, campo, valor) {
  if (!S.roteiro || !S.roteiro.itens.includes(it)) return true;
  const regra = regraDoRoteiro();
  const itPref = S.roteiro.itens.find(i => i.tipo === 'prefacio'), itOE = S.roteiro.itens.find(i => i.tipo === 'eucaristica');
  const oeId = campo === 'oeId' ? valor : itOE?.oeId;
  let prefId = campo === 'prefId' ? valor : itPref?.prefId;
  const oe = oeDe(oeId);
  if (campo === 'oeId' && oe && itPref) {
    if (oe.pref !== 'livre') prefId = oe.proprio;
    else if (OES.some(o => o.pref !== 'livre' && o.proprio === prefId)) prefId = prefacioDoDia(oe, regra);
  }
  if (!confirmarEuc(oeId, prefId, regra)) return false;
  if (campo === 'oeId' && itPref && prefId !== itPref.prefId) { itPref.prefId = prefId; toast(`Prefácio trocado junto: ${nomeEuc(prefId)}.`); }
  return true;
}

// ---------- Captura automática pelos folhetos ----------

const normEuc = s => semAcento(s || '').replace(/\([^)]*\)/g, ' ').replace(/\bprefacio\b/g, ' ')
  .replace(/\b(dos|das|do|da|de|o|a|os|as|e|para|sobre)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Prefácios de festas reconhecidos pelo tema ("A glória da Assunção de Maria" → Assunção)
const TEMAS_PREF = [[/assun[cç][aã]o/i, 'assun'], [/imaculada/i, 'imac'], [/trindade/i, 'trin'], [/pentecostes/i, 'pent'],
  [/cristo,? rei|rei do universo/i, 'cristorei'], [/ramos/i, 'ramos'], [/epifania/i, 'epif'], [/batismo do senhor/i, 'batismo'],
  [/apresenta[cç][aã]o do senhor/i, 'apres'], [/transfigura/i, 'transf'], [/santa cruz/i, 'cruz'], [/sagrado cora/i, 'corac'],
  [/tenta[cç][aã]o do senhor/i, 'qd1'], [/samaritana/i, 'qd3'], [/cego de nascen/i, 'qd4'], [/l[aá]zaro/i, 'qd5'], [/mist[eé]rio de maria e da igreja/i, 'imac'],
  [/s[aã]o jos[eé]/i, 'jose'], [/jo[aã]o batista/i, 'joaob'], [/pedro e (s[aã]o )?paulo/i, 'pedropaulo'], [/anuncia[cç][aã]o/i, 'anunc']];
const prefPorTema = nome => { const t = TEMAS_PREF.find(([re]) => re.test(nome || '')); return t ? prefDe(t[1]) : null; };
// "Páscoa, I O mistério pascal", "Santíssima Eucaristia I Sacrifício e Sacramento de Cristo": o nome do catálogo seguido do tema
// (o nome mais comprido que serve: "Páscoa II" não vira "Páscoa I")
const prefPorInicio = nome => {
  const n = normEuc(nome) + ' ';
  return listaPrefacios().filter(p => !p.extra && n.startsWith(normEuc(p.nome) + ' ')).sort((a, b) => b.nome.length - a.nome.length)[0] || null;
};

function criarExtra(tipo, nome) {
  const x = { id: 'x-' + uid(), tipo, nome, grupo: 'Outros (vindos dos folhetos)' };
  Euc.dados.extras.push(x);
  return tipo === 'oe' ? { ...x, pref: 'livre' } : x;
}

// cap = { oe: { nome, texto }, pref: { nome, texto } } (vem do folheto). Só guarda o que ainda não tem texto.
function capturarEucaristia(cap) {
  if (!cap) return '';
  const salvos = [];
  const guardar = (item, texto) => {
    if (!item || !texto || temTexto(item.id)) return;
    Euc.dados.textos[item.id] = { texto, origem: 'folheto', data: isoData(new Date()) };
    salvos.push(item.nome);
  };
  let oe = null;
  if (cap.oe?.texto) {
    // compara também sem o subtítulo do catálogo ("… Diversas Circunstâncias III — Jesus, caminho para o Pai")
    oe = listaOEs().find(o => [o.nome, o.nome.split(' — ')[0]].some(n => normEuc(n) === normEuc(cap.oe.nome))) || criarExtra('oe', cap.oe.nome);
    guardar(oe, cap.oe.texto);
  }
  if (cap.pref?.texto) {
    let p = null;
    // "Prefácio dos Domingos do Tempo Comum VII – A salvação pela…" → "Domingos do Tempo Comum VII"
    const nomeFolheto = (cap.pref.nome || '').split(/\s+[–—-]\s+/)[0].trim();
    if (oe?.proprio && oe.pref !== 'livre') p = prefDe(oe.proprio);          // oração com prefácio próprio
    else if (nomeFolheto) {
      const nome = nomeFolheto.replace(/^pref[aá]cio\s+/i, '').replace(/^(dos|das|do|da|de)\s+/i, '');
      p = listaPrefacios().find(x => normEuc(x.nome) === normEuc(nomeFolheto))
        || prefPorInicio(nomeFolheto) || prefPorTema(cap.pref.nome)
        || criarExtra('pref', nome.charAt(0).toUpperCase() + nome.slice(1));
    }
    guardar(p, cap.pref.texto);
  }
  if (salvos.length) salvarEucaristia();
  return salvos.length ? ` Guardado em Orações Eucarísticas: ${salvos.join(' e ')}.` : '';
}

// Lê folhetos (um ou vários) só para guardar a oração eucarística e o prefácio de cada um
async function lerOracoesDeFolhetos(arquivos) {
  const achados = [], semOracao = [];
  for (let i = 0; i < arquivos.length; i++) {
    toast(`Lendo folheto ${i + 1} de ${arquivos.length}…`);
    try {
      const r = await Folheto.importar(arquivos[i]);
      const antes = new Set(Object.keys(Euc.dados.textos));
      capturarEucaristia(r.eucaristia);
      const novos = Object.keys(Euc.dados.textos).filter(id => !antes.has(id)).map(nomeEuc);
      if (!r.eucaristia) semOracao.push(arquivos[i].name);
      achados.push(...novos);
    } catch (err) {
      semOracao.push(`${arquivos[i].name} (${err.message})`);
    }
  }
  renderEucaristia();
  renderRoteiroLista();
  const msg = achados.length ? `Guardados ${achados.length} texto(s):\n• ${achados.join('\n• ')}` : 'Nenhum texto novo: as orações desses folhetos já estavam no catálogo.';
  alert(msg + (semOracao.length ? `\n\nSem oração eucarística encontrada em:\n• ${semOracao.join('\n• ')}` : ''));
}

// ---------- Painel (centro) ----------

function mostrarEucaristia(sim) {
  S.modoEuc = !!sim;
  if (sim && S.modoCards) mostrarCards(false);
  $('.centro').classList.toggle('modo-euc', S.modoEuc);
  if (S.modoEuc) renderEucaristia();
}

function linhaEuc(item, tipo, sel, chk = null) {
  const tem = temTexto(item.id);
  const regra = tipo === 'oe' ? ({ livre: 'prefácio à escolha', fixo: 'prefácio próprio', 'fixo-flex': 'próprio ou penitencial' }[item.pref]) : '';
  const hoje = chk && chk.nivel !== 'ok' ? chk : null;
  return `<div class="euc-it ${sel ? 'sel' : ''} ${hoje ? 'euc-' + hoje.nivel : ''}" data-${tipo}="${item.id}" title="${esc(hoje?.msg || item.obs || '')}">
    <span class="euc-status ${tem ? 'ok' : ''}" title="${tem ? 'Texto cadastrado' : 'Texto ainda não cadastrado'}">${tem ? '✓' : '—'}</span>
    <span class="tit">${esc(item.nome)}</span>
    ${hoje ? `<span class="tag euc-tag-${hoje.nivel}">${hoje.nivel === 'bloq' ? '⛔ não hoje' : '⚠ confira'}</span>` : ''}
    ${regra ? `<span class="tag">${regra}</span>` : ''}
    <button data-euc-editar="${item.id}" title="${tem ? 'Ver / editar o texto' : 'Colar o texto'}">✎</button>
  </div>`;
}

function renderEucaristia() {
  const el = $('#painelEucaristia');
  if (!S.modoEuc) return;
  const oes = listaOEs(), oe = oeDe(Euc.sel.oe) || oes[0];
  const regra = regraDoRoteiro();
  // dia rígido (domingo de tempo forte, solenidade…): com oração de prefácio à escolha, só aparecem os prefácios do dia
  const todos = prefaciosPermitidos(oe);
  const permitidos = regra.modo === 'rigido' && oe.pref === 'livre' && regra.prefs.length
    ? todos.filter(p => regra.prefs.includes(p.id) || p.extra) : todos;
  if (Euc.sel.pref && !permitidos.some(p => p.id === Euc.sel.pref)) Euc.sel.pref = null;
  if (!Euc.sel.pref) Euc.sel.pref = prefacioDoDia(oe, regra);
  const termo = semAcento(Euc.filtro);
  const filtrados = permitidos.filter(p => !termo || semAcento(`${p.nome} ${p.grupo}`).includes(termo));
  const sugeridos = regra.prefs.map(id => filtrados.find(p => p.id === id)).filter(Boolean);
  const grupos = [...new Set(filtrados.map(p => p.grupo))];
  const rotModo = { rigido: 'só estes podem ser usados', aviso: 'outro, só em Missa votiva, de exéquias etc.', livre: 'sugestão; pode ser outro' }[regra.modo];
  const caixaRegra = `<div class="euc-regra euc-regra-${regra.modo}">📅 <b>${esc(regra.titulo)}</b>${regra.semMissa ? '' : ` · prefácio do dia: <b>${esc(nomesPrefsRegra(regra))}</b> <span class="sutil">(${rotModo})</span>`}
      ${regra.nota ? `<br>${esc(regra.nota)}` : ''}${regra.notaOE1 ? `<br>${esc(regra.notaOE1)}` : ''}
      ${regra.fixasOk ? '' : '<br><span class="sutil">Hoje não se usam as orações de prefácio fixo (IV, V e Diversas Circunstâncias).</span>'}</div>`;
  const chkOE = Object.fromEntries(oes.map(o => [o.id, checarEuc(o.id, null, regra)]));
  const total = oes.length + listaPrefacios().length;
  const comTexto = [...oes, ...listaPrefacios()].filter(x => temTexto(x.id)).length;

  el.innerHTML = `
    <div class="euc-topo">
      <h2>Orações Eucarísticas e Prefácios</h2>
      <span class="sutil">${comTexto} de ${total} textos cadastrados · lista baseada no Missal Romano (confira com o Missal da paróquia)</span>
      <span class="espaco"></span>
      <button data-euc-folhetos title="Lê um ou vários folhetos em PDF e guarda só a oração eucarística e o prefácio (não cria roteiros)">📄 Ler orações de folhetos…</button>
      <button data-euc-exportar title="Salva num arquivo .json os textos cadastrados (✓), para levar a outro computador ou paróquia">⬇ Exportar textos</button>
      <button data-euc-importar title="Traz os textos de um arquivo .json exportado por outro MiguelAngelus">⬆ Importar textos…</button>
    </div>
    <p class="sutil pequeno euc-ajuda">Os textos entram sozinhos quando um <b>folheto</b> traz a oração e o prefácio do dia. Os que faltarem (—), clique em ✎ e cole do Missal.
      No texto, linha em branco separa os slides e linha começando com <b>—</b> é resposta do povo.</p>
    ${caixaRegra}
    <div class="euc-grade">
      <section class="euc-col">
        <div class="euc-tit">1. Oração Eucarística</div>
        <div class="euc-lista">${oes.map(o => linhaEuc(o, 'oe', o.id === oe.id, chkOE[o.id])).join('')}</div>
        ${oe.obs ? `<p class="euc-nota">ℹ ${esc(oe.obs)}</p>` : ''}
      </section>
      <section class="euc-col">
        <div class="euc-tit">2. Prefácio <span class="sutil">(${permitidos.length} possível(is) com esta oração)</span></div>
        ${oe.pref === 'fixo' ? '' : `<input type="search" id="eucFiltro" placeholder="Buscar prefácio…" value="${esc(Euc.filtro)}">`}
        <div class="euc-lista">
          ${sugeridos.length && !termo ? `<div class="grupo-ord euc-sug">Do dia: ${esc(regra.titulo)}</div>${sugeridos.map(p => linhaEuc(p, 'pref', p.id === Euc.sel.pref)).join('')}` : ''}
          ${regra.modo === 'rigido' && permitidos.length < todos.length ? `<p class="euc-nota">Os outros prefácios não podem ser usados neste dia.</p>` : ''}
          ${(regra.modo === 'rigido' && oe.pref === 'livre' && !termo ? grupos.filter(g => filtrados.some(p => p.grupo === g && p.extra)) : grupos).map(g => `<div class="grupo-ord">${esc(g)}</div>${filtrados.filter(p => p.grupo === g).map(p => linhaEuc(p, 'pref', p.id === Euc.sel.pref)).join('')}`).join('')}
        </div>
      </section>
    </div>
    <div class="euc-barra">
      <span>Selecionado: <b>${esc(oe.nome)}</b>${Euc.sel.pref ? ` + <b>${esc(nomeEuc(Euc.sel.pref))}</b>` : ' <span class="sutil">(escolha o prefácio)</span>'}</span>
      <span class="espaco"></span>
      <button data-euc-ver="pref" ${Euc.sel.pref ? '' : 'disabled'}>Ver prefácio</button>
      <button data-euc-ver="oe">Ver oração</button>
      <button data-euc-add class="primario">+ Adicionar ao roteiro</button>
    </div>`;
}

// Encaixa prefácio (depois do Diálogo do Prefácio) e oração (depois do Santo) numa lista de itens de roteiro.
// Se já houver itens do catálogo, só troca a escolha. Com o texto da oração cadastrado, tira o "Mistério da Fé"
// e a doxologia avulsos (o texto da oração já traz a aclamação e o "Por Cristo…").
function inserirEucaristia(itens, oeId, prefId) {
  const pos = achou => { const i = itens.findIndex(achou); return i >= 0 ? i + 1 : itens.length; };
  const iPref = itens.findIndex(i => i.tipo === 'prefacio'), iOE = itens.findIndex(i => i.tipo === 'eucaristica');
  if (prefId) {
    if (iPref >= 0) itens[iPref].prefId = prefId;
    else itens.splice(pos(i => i.tipo === 'ordinario' && i.parte === 'prefacio'), 0, { id: uid(), tipo: 'prefacio', prefId });
  }
  if (iOE >= 0) itens[iOE].oeId = oeId;
  else itens.splice(pos(i => (i.tipo === 'canto' && i.momento === 'Santo') || (i.tipo === 'ordinario' && i.parte === 'santo')), 0, { id: uid(), tipo: 'eucaristica', oeId });
  let removidos = 0;
  if (temTexto(oeId)) {
    for (let i = itens.length - 1; i >= 0; i--) {
      if (itens[i].tipo === 'ordinario' && ['misterio-fe', 'doxologia'].includes(itens[i].parte)) { itens.splice(i, 1); removidos++; }
    }
  }
  return { trocou: iOE >= 0, removidos };
}

function adicionarEucaristiaAoRoteiro() {
  if (!S.roteiro) return toast('Abra um roteiro primeiro.');
  const itens = S.roteiro.itens, oe = oeDe(Euc.sel.oe), pref = Euc.sel.pref;
  if (!confirmarEuc(oe.id, pref)) return;
  if (itens.some(i => i.tipo === 'texto' && /ora[cç][aã]o eucar[ií]stica/i.test(i.titulo || ''))
    && !confirm('Este roteiro já tem a Oração Eucarística do folheto. Adicionar esta também?')) return;
  const { trocou, removidos } = inserirEucaristia(itens, oe.id, pref);
  if (S.atual?.rIdx >= 0) S.atual.rIdx = itens.indexOf(S.atual.item);
  salvarRoteiro();
  renderRoteiroLista();
  toast(`${trocou ? 'Trocado' : 'Adicionado'} no roteiro: ${oe.nome}${pref ? ' + ' + nomeEuc(pref) : ''}.` +
    (removidos ? ' O "Mistério da Fé" avulso saiu, porque a oração já traz a aclamação.' : ''));
}

// ---------- Editor de texto ----------

function abrirEditorEuc(id) {
  Euc.editando = id;
  const reg = Euc.dados.textos[id];
  $('#eucTitulo').textContent = nomeEuc(id);
  $('#formTextoEuc').texto.value = reg?.texto || '';
  $('#eucOrigem').textContent = reg ? `Texto ${reg.origem === 'folheto' ? 'vindo de um folheto' : 'colado à mão'} em ${reg.data?.split('-').reverse().join('/') || '—'}.` : 'Ainda sem texto: cole aqui o texto do Missal (ou importe um folheto que traga esta oração).';
  $('#btnEucApagar').hidden = !reg;
  const dlg = $('#dlgTextoEuc');
  dlg.returnValue = '';
  dlg.showModal();
  $('#formTextoEuc').texto.focus();
}

// ---------- (1.8.10) Exportar / importar os textos (.json) ----------
// Só os textos cadastrados e os itens "extras" (vindos de folhetos); os nomes do Papa e do Bispo ficam (são de cada paróquia).
// Cada texto leva o nome junto: assim um extra de outro computador (id diferente) se acha pelo nome.
function exportarTextosEuc() {
  const ids = Object.keys(Euc.dados.textos).filter(temTexto);
  if (!ids.length) return toast('Nenhum texto cadastrado para exportar.');
  const extras = Euc.dados.extras.filter(x => ids.includes(x.id));
  const textos = Object.fromEntries(ids.map(id => [id, { nome: nomeEuc(id), ...Euc.dados.textos[id] }]));
  const dados = { app: 'MiguelAngelus', tipo: 'eucaristia', versao: 1, exportado: new Date().toISOString(), textos, extras };
  baixar(`Orações eucarísticas e prefácios MiguelAngelus ${isoData(new Date())}.json`, JSON.stringify(dados, null, 1));
  toast(`${ids.length} texto(s) exportado(s).`);
}

async function importarTextosEuc(d) {
  // aceita o arquivo exportado aqui ou um backup completo (pega só a parte da Eucaristia)
  const fonte = d?.tipo === 'eucaristia' ? d : d?.app === 'lumen' && d.eucaristia ? d.eucaristia : null;
  if (!fonte?.textos) throw new Error('Este arquivo não tem orações eucarísticas nem prefácios do MiguelAngelus.');
  const extrasArq = new Map((fonte.extras || []).map(x => [x.id, x]));
  const novos = [], iguais = [], diferentes = [];
  for (const [idArq, t] of Object.entries(fonte.textos)) {
    if (!t?.texto) continue;
    let id = idArq;
    const ex = extrasArq.get(idArq);
    if (ex || !(oeDe(idArq) || prefDe(idArq))) {
      // item extra: acha pelo tipo + nome; se não existir, cria
      const nome = ex?.nome || t.nome || idArq, tipo = ex?.tipo || 'pref';
      const achado = (tipo === 'oe' ? listaOEs() : listaPrefacios()).find(x => normEuc(x.nome) === normEuc(nome));
      if (achado) id = achado.id;
      else {
        id = idArq.startsWith('x-') && !Euc.dados.extras.some(x => x.id === idArq) ? idArq : 'x-' + uid();
        Euc.dados.extras.push({ id, tipo, nome, grupo: ex?.grupo || 'Outros (importados)' });
      }
    }
    const atual = Euc.dados.textos[id]?.texto;
    const reg = { texto: t.texto, origem: 'importado', data: isoData(new Date()) };
    if (!atual) novos.push([id, reg]);
    else if (atual.trim() === t.texto.trim()) iguais.push(id);
    else diferentes.push([id, reg]);
  }
  let trocar = false;
  if (diferentes.length) trocar = confirm(`${novos.length} texto(s) novo(s) e ${diferentes.length} já cadastrado(s) com texto diferente:\n• `
    + diferentes.slice(0, 12).map(([id]) => nomeEuc(id)).join('\n• ') + (diferentes.length > 12 ? '\n• …' : '')
    + '\n\nOK = substituir esses pelo texto do arquivo · Cancelar = manter os daqui (os novos entram do mesmo jeito)');
  for (const [id, reg] of [...novos, ...(trocar ? diferentes : [])]) Euc.dados.textos[id] = reg;
  salvarEucaristia();
  aposMudarEuc();
  alert(`Importação concluída: ${novos.length} novo(s), ${trocar ? diferentes.length : 0} substituído(s), `
    + `${trocar ? 0 : diferentes.length} mantido(s) como estavam, ${iguais.length} já iguais.`);
}

function aposMudarEuc() {
  renderEucaristia();
  renderRoteiroLista();
  if (S.atual && ['prefacio', 'eucaristica'].includes(S.atual.item.tipo)) { atualizarSlides(); renderCabecalho(); }
}

function ligarEucaristia() {
  ligarNomesLiturgia();
  $('#btnAbrirEuc').addEventListener('click', () => mostrarEucaristia(true));
  const painel = $('#painelEucaristia');
  painel.addEventListener('click', e => {
    const ed = e.target.closest('[data-euc-editar]');
    if (ed) return abrirEditorEuc(ed.dataset.eucEditar);
    const o = e.target.closest('[data-oe]');
    if (o) {
      const c = checarEuc(o.dataset.oe, null);
      if (c.nivel === 'bloq') return toast('⛔ ' + c.msg);
      if (c.nivel === 'aviso') toast('⚠ ' + c.msg);
      Euc.sel.oe = o.dataset.oe; Euc.sel.pref = null; return renderEucaristia();
    }
    const p = e.target.closest('[data-pref]');
    if (p) { Euc.sel.pref = p.dataset.pref; return renderEucaristia(); }
    const ver = e.target.closest('[data-euc-ver]');
    if (ver) return abrirItem(ver.dataset.eucVer === 'pref' ? { tipo: 'prefacio', prefId: Euc.sel.pref } : { tipo: 'eucaristica', oeId: Euc.sel.oe });
    if (e.target.closest('[data-euc-add]')) adicionarEucaristiaAoRoteiro();
    if (e.target.closest('[data-euc-folhetos]')) $('#arqFolhetosEuc').click();
    if (e.target.closest('[data-euc-exportar]')) exportarTextosEuc();
    if (e.target.closest('[data-euc-importar]')) $('#arqEucJson').click();
  });
  $('#arqEucJson').addEventListener('change', async e => {
    const a = e.target.files[0];
    e.target.value = '';
    if (!a) return;
    try { await importarTextosEuc(JSON.parse(await lerTexto(a))); }
    catch (err) { alert('Não foi possível importar:\n' + err.message); }
  });
  $('#arqFolhetosEuc').addEventListener('change', async e => {
    const arquivos = [...e.target.files];
    e.target.value = '';
    if (arquivos.length) await lerOracoesDeFolhetos(arquivos);
  });
  painel.addEventListener('input', e => {
    if (e.target.id !== 'eucFiltro') return;
    Euc.filtro = e.target.value;
    renderEucaristia();     // redesenha a lista e devolve o cursor para a busca
    const f = $('#eucFiltro'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
  });
  $('#formTextoEuc').addEventListener('submit', e => {
    if (e.submitter?.value !== 'salvar') return;
    const texto = $('#formTextoEuc').texto.value.replace(/\r/g, '').trim();
    if (texto) Euc.dados.textos[Euc.editando] = { texto, origem: 'manual', data: isoData(new Date()) };
    else delete Euc.dados.textos[Euc.editando];
    salvarEucaristia(); aposMudarEuc(); toast('Texto salvo.');
  });
  $('#btnEucApagar').addEventListener('click', () => {
    if (!confirm('Apagar o texto desta oração/prefácio?')) return;
    delete Euc.dados.textos[Euc.editando];
    salvarEucaristia(); $('#dlgTextoEuc').close(); aposMudarEuc();
  });
}

function opcoesEuc(tipo, sel) {
  if (tipo === 'oe') return listaOEs().map(o => `<option value="${o.id}" ${o.id === sel ? 'selected' : ''}>${temTexto(o.id) ? '✓ ' : '— '}${esc(o.nome)}</option>`).join('');
  const l = listaPrefacios();
  return [...new Set(l.map(p => p.grupo))].map(g => `<optgroup label="${esc(g)}">${l.filter(p => p.grupo === g)
    .map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${temTexto(p.id) ? '✓ ' : '— '}${esc(p.nome)}</option>`).join('')}</optgroup>`).join('');
}
