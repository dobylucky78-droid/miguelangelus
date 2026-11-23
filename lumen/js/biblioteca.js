'use strict';
/*
 * (1.9.20, ideia do Luciano) 📚 Textos da paróquia: antífonas e orações do dia guardadas por celebração.
 *
 * Os textos do Missal não mudam de um ano para o outro. O que a paróquia já usou num roteiro (vindo do folheto,
 * colado ou buscado na Liturgia do dia) fica guardado para aquela celebração, e no ano seguinte o roteiro já nasce
 * com eles. Nada disso vem com o programa nem vai para o GitHub: fica nos computadores da paróquia, junto com os
 * textos das Orações Eucarísticas (Euc.dados.textos, com a chave "missa do dia#parte"), e por isso já vai pela nuvem
 * da paróquia e pelo "⬇ Exportar / ⬆ Importar textos" do catálogo ✝.
 *
 * A celebração é a mesma "Missa do dia" dos fitilhos (chaveMissaDoDia): domingos, solenidades, festas e santos têm a
 * sua; os dias de semana do Advento, do Natal, da Quaresma e da Páscoa também; nos dias de semana do Tempo Comum vale
 * a Missa do domingo (eles usam os textos do domingo, mas não gravam por cima: um santo de memória facultativa não
 * estraga o domingo).
 */

const BIB_PARTES = [
  { k: 'antEntrada', nome: 'Antífona de Entrada', rx: /^antifona d[ae] entrada/, ant: true },
  { k: 'coleta', nome: 'Oração do Dia (Coleta)', rx: /^(oracao (da coleta|do dia)|coleta)\b/ },
  { k: 'oferendas', nome: 'Oração sobre as Oferendas', rx: /^(oracao )?sobre as oferendas/ },       // folheto: "Sobre as oferendas"
  { k: 'antComunhao', nome: 'Antífona da Comunhão', rx: /^antifona d[ae] comunhao/, ant: true },
  { k: 'depois', nome: 'Oração depois da Comunhão', rx: /^(oracao )?depois da comunhao/ },        // folheto: "Depois da Comunhão"
];
const bibParte = k => BIB_PARTES.find(p => p.k === k);
// título do item → parte ("II. Antífona da Entrada (Sl 104,3s)" → antEntrada)
const parteDoTitulo = t => BIB_PARTES.find(p => p.rx.test(semAcento(String(t || '')).toLowerCase().replace(/^\s*[ivx]+\.\s*/, '').trim())) || null;
const parteDoItem = it => it?.tipo === 'texto' && !it.intencoes ? parteDoTitulo(it.titulo) : null;

// celebrações que não são a Missa do dia (casamento, exéquias, votivas…): não guardam nem recebem os textos do dia
const RX_OUTRA_MISSA = /casamento|matrim|batizado|batismo de|ex[eé]quias|7[ºo°]?\s*dia|s[eé]timo dia|votiva|crisma|confirma[cç][aã]o|ordena[cç][aã]o|formatura|bodas/i;

function nomeTextoParoquia(id) {
  const [ch, k] = String(id).split('#');
  const cel = ch && typeof parteMissal === 'function' ? parteMissal(ch)?.nome : '';
  return `${cel || ch} · ${bibParte(k)?.nome || k}`;
}

// a "Missa do dia" do roteiro (a mesma dos fitilhos da 💡 Dica, com a escolha santo/semana guardada no roteiro)
function chaveCelebracao(r) {
  try {
    if (!r || RX_OUTRA_MISSA.test(r.nome || '')) return null;
    const lit = litCompleta(r);
    if (!lit?.data || (!r.data && !r.celebracao)) return null;
    const ops = opcoesMissaDia(lit), op = ops.find(o => o.v === r.fitilhos?.missa) || ops[0];
    return op?.id ? { ch: op.id, nome: nomeEuc(op.id), domingo: lit.data.getDay() === 0 } : null;
  } catch { return null; }
}
const textoGuardado = (ch, k) => { const t = Euc.dados.textos[ch + '#' + k]; return t?.texto ? t : null; };
const guardadosDe = ch => BIB_PARTES.filter(p => textoGuardado(ch, p.k));

// Guarda os textos do roteiro (chamado ao salvar o roteiro). Devolve quantos mudaram.
function guardarNaBiblioteca(r) {
  const c = chaveCelebracao(r);
  if (!c || !r.itens?.length) return 0;
  const soSeFaltar = /^dia-tc-/.test(c.ch) && !c.domingo;      // dia de semana do Tempo Comum: não troca o do domingo
  let n = 0;
  for (const it of r.itens) {
    const p = parteDoItem(it), texto = (it.texto || '').trim();
    if (!p || !texto) continue;
    const id = c.ch + '#' + p.k, atual = Euc.dados.textos[id];
    if (atual?.texto && (soSeFaltar || (atual.texto.trim() === texto && (atual.titulo || '') === (it.titulo || '')))) continue;
    Euc.dados.textos[id] = { texto, titulo: (it.titulo || p.nome).trim(), origem: 'roteiro', data: isoData(new Date()) };
    n++;
  }
  if (n) salvarEucaristia();
  return n;
}

// Onde entra cada parte que o roteiro ainda não tem (o mesmo lugar da Liturgia do dia)
function lugarDaParte(itens, k) {
  const ach = (...fs) => { for (const f of fs) { const i = itens.findIndex(f); if (i >= 0) return i; } return -1; };
  const tit = rx => i => rx.test(semAcento(String(i.titulo || '')).toLowerCase());
  let i;
  switch (k) {
    case 'antEntrada':
      i = ach(x => x.tipo === 'canto' && x.momento === 'Entrada');
      return i >= 0 ? i + 1 : Math.max(0, ach(x => x.tipo === 'ordinario' && x.parte === 'saudacao'));
    case 'coleta':
      i = ach(x => x.momento === 'Glória', x => x.parte === 'gloria', tit(/^gloria/), x => x.parte === 'kyrie', x => x.parte === 'ato-penitencial');
      return i >= 0 ? i + 1 : Math.max(0, ach(x => x.tipo === 'leitura', x => x.tipo === 'salmo'));
    case 'oferendas':
      i = ach(x => x.parte === 'orai-irmaos', tit(/^orai,? irmaos/));
      if (i >= 0) return i + 1;
      i = ach(x => x.parte === 'prefacio', tit(/^dialogo do prefacio/), x => x.tipo === 'prefacio', x => x.momento === 'Santo');
      return i >= 0 ? i : itens.length;
    case 'antComunhao':
      i = ach(x => x.tipo === 'canto' && x.momento === 'Comunhão');
      return i >= 0 ? i + 1 : -1;                    // sem canto de comunhão: não inventa lugar
    case 'depois':
      i = ach(x => x.parte === 'bencao-final', tit(/^(bencao|ritos finais)/), x => x.tipo === 'avisos', x => x.tipo === 'canto' && x.momento === 'Final');
      return i >= 0 ? i : itens.length;
  }
  return -1;
}

// Põe no roteiro os textos de `fonte` ({ k: { titulo, texto } }). substituir = troca também os que já têm texto.
// A Coleta fixa do programa (parte "coleta") dá lugar à do dia. Devolve as partes postas.
function porTextosNoRoteiro(r, fonte, { substituir = false } = {}) {
  const postas = [];
  for (const p of BIB_PARTES) {
    const t = fonte[p.k];
    if (!t?.texto) continue;
    const titulo = t.titulo || p.nome, texto = t.texto.trim();
    let i = r.itens.findIndex(it => parteDoItem(it) === p);
    if (i >= 0) {
      const it = r.itens[i];
      if ((it.texto || '').trim() && !substituir) continue;
      if ((it.texto || '').trim() === texto && it.titulo === titulo) continue;
      Object.assign(it, { titulo, texto }, p.ant ? { antifona: true } : {});
      postas.push(p);
      continue;
    }
    const novo = { id: uid(), tipo: 'texto', titulo, texto, ...(p.ant ? { antifona: true } : {}) };
    if (p.k === 'coleta' && (i = r.itens.findIndex(it => it.tipo === 'ordinario' && it.parte === 'coleta')) >= 0) r.itens[i] = novo;
    else {
      const k = lugarDaParte(r.itens, p.k);
      if (k < 0) continue;
      r.itens.splice(k, 0, novo);
    }
    postas.push(p);
  }
  return postas;
}

// Textos guardados da celebração do roteiro → roteiro
function aplicarBiblioteca(r, opc = {}) {
  const c = chaveCelebracao(r);
  if (!c) return [];
  return porTextosNoRoteiro(r, Object.fromEntries(guardadosDe(c.ch).map(p => [p.k, textoGuardado(c.ch, p.k)])), opc);
}

// O que faltar, pela API da Liturgia do dia (liturgiadia.js), no mesmo formato
async function textosDaApi(r) {
  const lit = litCompleta(r);
  const o = await buscarOracoesDoDia(lit.data);
  const f = {};
  if (o.antEntrada) { const it = itemAntifona('Antífona de Entrada', o.antEntrada); f.antEntrada = { titulo: it.titulo, texto: it.texto }; }
  if (o.coleta) f.coleta = { titulo: 'Oração do Dia (Coleta)', texto: textoOracao(o.coleta) };
  if (o.oferendas) f.oferendas = { titulo: 'Oração sobre as Oferendas', texto: textoOracao(o.oferendas) };
  if (o.antComunhao) { const it = itemAntifona('Antífona da Comunhão', o.antComunhao); f.antComunhao = { titulo: it.titulo, texto: it.texto }; }
  if (o.depois) f.depois = { titulo: 'Oração depois da Comunhão', texto: textoOracao(o.depois) };
  return f;
}

// ---------- Janela 📚 Textos da paróquia (painel do roteiro) ----------
function abrirTextosParoquia() {
  const r = S.roteiro;
  let dlg = $('#dlgBiblioteca');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'dlgBiblioteca';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { const b = e.target.closest('[data-bib]'); if (b) acaoBiblioteca(b.dataset.bib, b); });
  }
  const c = chaveCelebracao(r);
  const total = Object.keys(Euc.dados.textos).filter(id => id.includes('#') && Euc.dados.textos[id]?.texto).length;
  const linhas = c ? BIB_PARTES.map(p => {
    const g = textoGuardado(c.ch, p.k), it = r.itens.find(x => parteDoItem(x) === p), noRot = (it?.texto || '').trim();
    const est = !g ? (noRot ? 'só no roteiro (é guardado ao salvar)' : '—')
      : !noRot ? 'guardado · falta no roteiro' : noRot === g.texto.trim() ? 'guardado · igual no roteiro' : 'guardado · o roteiro tem outro texto';
    return `<tr><td>${g ? '✓' : ''}</td><td>${esc(p.nome)}</td><td class="sutil">${esc(est)}${g ? ` <small>(${esc(g.data || '')})</small>` : ''}</td></tr>`;
  }).join('') : '';
  dlg.innerHTML = `<form method="dialog" class="form">
    <h2>📚 Textos da paróquia</h2>
    <p class="sutil pequeno">Antífonas e orações do dia guardadas por celebração, só nos computadores da paróquia (vão pela nuvem dela e pelo
      ⬇ Exportar textos do catálogo ✝). O que um roteiro usa fica guardado sozinho; no ano seguinte o roteiro já nasce com eles.
      Nos dias de semana do Tempo Comum valem os textos do domingo. ${total} texto(s) guardado(s) ao todo.</p>
    ${c ? `<p><b>${esc(c.nome)}</b> <span class="sutil">· celebração deste roteiro</span></p>
      <table class="tabela-bib">${linhas}</table>
      <div class="linha">
        <button type="button" data-bib="por">📥 Pôr no roteiro os que faltam</button>
        <button type="button" data-bib="trocar" title="Troca também os que o roteiro já tem com outro texto">Pôr todos os guardados</button>
        <button type="button" data-bib="api" title="API Liturgia Diária, de Dancrf: só para o que não está guardado nem no roteiro">🌐 Buscar na internet o que falta</button>
      </div>`
      : `<p class="status">Este roteiro não tem data de uma Missa do dia (ou é casamento, exéquias, Missa votiva…). Abra um roteiro com data para ver os textos.</p>`}
    <div class="linha">
      <button type="button" data-bib="antigos" title="Lê todos os roteiros já feitos e guarda os textos de cada celebração (os mais novos valem)">Guardar dos roteiros antigos</button>
      <span class="espaco"></span><button value="ok" class="primario">Fechar</button>
    </div>
    <p id="bibStatus" class="sutil pequeno"></p>
  </form>`;
  if (!dlg.open) dlg.showModal();
}

async function acaoBiblioteca(acao, botao) {
  const r = S.roteiro, st = m => { const el = $('#bibStatus'); if (el) el.textContent = m; };
  const depois = postas => {
    if (postas.length) { salvarRoteiro(); renderRoteiroLista(); S.atual = null; renderCabecalho(); renderSlides(); }
    abrirTextosParoquia();
    st(postas.length ? 'Postos no roteiro: ' + postas.map(p => p.nome).join(', ') + '.' : 'Nada para pôr: o roteiro já tem esses textos.');
  };
  if (acao === 'por') return depois(aplicarBiblioteca(r));
  if (acao === 'trocar') {
    if (!confirm('Trocar pelos textos guardados também as partes que o roteiro já tem com outro texto?')) return;
    return depois(aplicarBiblioteca(r, { substituir: true }));
  }
  if (acao === 'api') {
    botao.disabled = true; st('Buscando…');
    try { depois(porTextosNoRoteiro(r, await textosDaApi(r))); }
    catch (e) { st('Não deu para buscar: ' + e.message); }
    finally { botao.disabled = false; }
    return;
  }
  if (acao === 'antigos') {
    const rots = [...S.roteiros].sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || (a.atualizado || 0) - (b.atualizado || 0));
    let n = 0, nr = 0;
    for (const x of rots) { const k = guardarNaBiblioteca(x); n += k; if (k) nr++; }
    abrirTextosParoquia();
    st(`${n} texto(s) guardado(s) de ${nr} roteiro(s).`);
  }
}

function ligarBiblioteca() {
  if (ligarBiblioteca.feito) return;
  ligarBiblioteca.feito = true;
  $('#btnTextosParoquia')?.addEventListener('click', abrirTextosParoquia);
}
document.addEventListener('DOMContentLoaded', ligarBiblioteca);
if (document.readyState !== 'loading') ligarBiblioteca();
