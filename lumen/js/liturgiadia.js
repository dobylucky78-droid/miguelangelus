'use strict';
/*
 * Liturgia do dia: o operador abre a Liturgia Diária da Paulus, copia a página (Ctrl+A, Ctrl+C) e cola aqui.
 * O MiguelAngelus reconhece o dia, a antífona, as leituras, o salmo e a aclamação e monta o(s) roteiro(s)
 * das celebrações daquele dia (Agenda), com o modelo de Missa e, na semana, a Oração Eucarística II.
 * (O navegador não deixa o app ler o site sozinho; por isso o "copiar e colar".)
 */

const URL_PAULUS = 'https://www.paulus.com.br/portal/liturgia-diaria/';
const DIAS_PAGINA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];

// Tira os números de versículo grudados nas palavras ("6Um dia", "“Vós") e os colchetes da forma breve
const semVersiculos = t => t
  .replace(/(^|[\s“"‘'(\[—–-])\d{1,3}(?=[A-ZÀ-Úa-zà-ú“"‘'\[])/g, '$1')
  .replace(/[\[\]]/g, '')
  .replace(/\s+/g, ' ').trim();

// Estrofes do salmo/aclamação: "/" e "†" viram quebra de verso; tira "– R." e a referência final
const estrofeLiturgia = t => t.replace(/^\d+\.\s*/, '').replace(/\s*[–-]\s*R\.\s*$/, '').replace(/\s*\([^)]*\d[^)]*\)(?=\.?\s*$)/, '')
  .replace(/\s*[\/†]\s*/g, '\n').trim();

function lerLiturgiaColada(texto) {
  const linhas = texto.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const r = { dia: null, diaSemana: null, titulo: '', cor: '', gloria: false, creio: false, antifona: '', leituras: [], salmo: null, aclamacao: null };
  // "28 – SEGUNDA-FEIRA" ou, nos domingos, "Dia 4 DOMINGO" (sem o travessão)
  let i = linhas.findIndex(l => /^(Dia\s+)?\d{1,2}\s*[–-]?\s*(DOMINGO|SEGUNDA|TER[ÇC]A|QUARTA|QUINTA|SEXTA|S[ÁA]BADO)/i.test(l));
  if (i < 0) throw new Error('Não encontrei o dia (ex.: "28 – SEGUNDA-FEIRA"). Copie a página inteira da Liturgia Diária (Ctrl+A, Ctrl+C).');
  const m = linhas[i].match(/(\d{1,2})\s*[–-]?\s*([A-Za-zÀ-ú]\S*)/);
  r.dia = +m[1];
  r.diaSemana = DIAS_PAGINA.findIndex(d => semAcento(m[2]).toUpperCase().startsWith(semAcento(d).toUpperCase()));
  r.titulo = linhas[i + 1] || '';
  let j = i + 2;
  if (/^\(.*\)$/.test(linhas[j] || '')) {
    const info = semAcento(linhas[j]);
    r.cor = (linhas[j].match(/\((\w+)/) || [])[1] || '';
    r.gloria = /gloria/.test(info); r.creio = /creio/.test(info);
    j++;
  }
  // antífona de entrada = primeiro parágrafo depois do cabeçalho (termina com a referência entre parênteses)
  if (linhas[j] && !/^(Primeira|Segunda) Leitura:|^Evangelho:|^Salmo/i.test(linhas[j])) r.antifona = linhas[j];

  const fim = l => /^(Reflex[ãa]o:|\(Dia a dia|Liturgia Di[áa]ria$|Dia \d+ [–-]|\d{1,2} [–-] (DOMINGO|SEGUNDA|TER|QUARTA|QUINTA|SEXTA|S[ÁA]BADO))/i.test(l);
  for (let k = j; k < linhas.length; k++) {
    const l = linhas[k];
    if (fim(l) && k > j + 2) break;
    let mm;
    if ((mm = l.match(/^(Primeira|Segunda) Leitura:\s*(.+)$/i))) {
      let corpo = linhas[k + 1] || '';
      if (/^\[A forma breve/i.test(corpo)) corpo = linhas[k + 2] || '';
      const [intro, ...resto] = corpo.split(/\s+[–-]\s+/);
      const texto = semVersiculos(resto.join(' – ').replace(/\s*[–-]\s*Palavra do Senhor\.?\s*$/i, ''));
      r.leituras.push({ nome: /primeira/i.test(mm[1]) ? 'Primeira Leitura' : 'Segunda Leitura', ref: mm[2].trim(), intro: intro.trim(), texto });
    } else if ((mm = l.match(/^Salmo Responsorial:\s*(.+)$/i))) {
      const refrao = linhas[k + 1] || '';
      const estrofes = [];
      for (let q = k + 2; q < linhas.length && /^\d+\./.test(linhas[q]); q++) estrofes.push(estrofeLiturgia(linhas[q]));
      r.salmo = { ref: 'Sl ' + mm[1].trim(), refrao: refrao.replace(/\s*[\/†]\s*/g, '\n'), estrofes };
    } else if ((mm = l.match(/^Evangelho:\s*(.+)$/i))) {
      let q = k + 1;
      if (/^aleluia/i.test(linhas[q] || '') || !/Proclama[çc][ãa]o/i.test(linhas[q] || '')) {
        const refrao = linhas[q] || '';
        const verso = linhas[q + 1] && !/Proclama[çc][ãa]o/i.test(linhas[q + 1]) ? linhas[q + 1] : '';
        r.aclamacao = { refrao, verso: estrofeLiturgia(verso) };
        q += verso ? 2 : 1;
      }
      const corpo = linhas.slice(q).find(x => /Proclama[çc][ãa]o do Evangelho/i.test(x)) || '';
      const [intro, ...resto] = corpo.split(/\s+[–-]\s+/);
      r.leituras.push({ nome: 'Evangelho', ref: mm[1].trim(), intro: intro.trim(),
        texto: semVersiculos(resto.join(' – ').replace(/\s*[–-]\s*Palavra da Salva[çc][ãa]o\.?\s*$/i, '')), evangelho: true });
    }
  }
  if (!r.leituras.length) throw new Error('Não encontrei as leituras na página colada.');
  return r;
}

// Data a partir de "28 – SEGUNDA-FEIRA": o dia 28 mais perto de hoje que cai numa segunda
function dataDaLiturgia(r) {
  const hoje = new Date();
  const candidatas = [-1, 0, 1].map(k => new Date(hoje.getFullYear(), hoje.getMonth() + k, r.dia))
    .filter(d => d.getDate() === r.dia && (r.diaSemana < 0 || d.getDay() === r.diaSemana));
  candidatas.sort((a, b) => Math.abs(a - hoje) - Math.abs(b - hoje));
  return candidatas[0] || new Date(hoje.getFullYear(), hoje.getMonth(), r.dia);
}

// Itens do roteiro montados com os textos da liturgia
function itensDaLiturgia(r, domingo, comOE2) {
  const itens = Ordinario.modelos[domingo ? 'dominical' : 'semanal'].map(x => ({ id: uid(), ...structuredClone(x) }));
  const achar = f => itens.findIndex(f);
  // Glória e Creio conforme a página (ex.: festas na semana)
  if (!domingo && r.gloria && achar(i => i.momento === 'Glória') < 0) itens.splice(achar(i => i.parte === 'kyrie') + 1, 0, { id: uid(), tipo: 'canto', momento: 'Glória', cantoId: '' });
  if (domingo && !r.creio) { const c = achar(i => i.parte === 'creio-niceno'); if (c >= 0) itens.splice(c, 1); }

  // antífona de entrada logo depois do canto de entrada
  if (r.antifona) itens.splice(achar(i => i.momento === 'Entrada') + 1, 0,
    { id: uid(), tipo: 'texto', titulo: 'Antífona de Entrada', texto: r.antifona });

  // leituras: troca os espaços do modelo pelo texto da liturgia
  const slotLeitura = nome => achar(i => i.tipo === 'leitura' && (nome === 'Evangelho' ? i.evangelho : i.titulo?.startsWith(nome === 'Primeira Leitura' ? '1ª' : '2ª')));
  for (const l of r.leituras) {
    const fechamento = l.evangelho ? 'Palavra da Salvação.\n— Glória a vós, Senhor.' : 'Palavra do Senhor.\n— Graças a Deus.';
    const abertura = l.evangelho ? `O Senhor esteja convosco.\n— Ele está no meio de nós.\n\n${l.intro}.\n— Glória a vós, Senhor.` : l.intro + '.';
    const item = { id: uid(), tipo: 'texto', titulo: `${l.nome} (${l.ref})`, texto: `${abertura}\n\n${l.texto}\n\n${fechamento}` };
    const s = slotLeitura(l.nome);
    if (s >= 0) itens[s] = item; else itens.splice(achar(i => i.tipo === 'salmo') + (l.nome === 'Primeira Leitura' ? 0 : 1), 0, item);
  }
  if (!r.leituras.some(l => l.nome === 'Segunda Leitura')) { const s = slotLeitura('Segunda Leitura'); if (s >= 0) itens.splice(s, 1); }

  if (r.salmo) {
    const s = achar(i => i.tipo === 'salmo');
    const item = { id: uid(), tipo: 'salmo', titulo: 'Salmo Responsorial', ref: r.salmo.ref, refrao: r.salmo.refrao, texto: r.salmo.estrofes.join('\n\n') };
    if (s >= 0) itens[s] = item; else itens.splice(achar(i => i.evangelho) , 0, item);
  }
  if (r.aclamacao?.refrao) {
    const s = achar(i => i.momento === 'Aclamação ao Evangelho');
    // item de canto "rezado" (app.js aclamacaoRezada): dá para trocar por um canto de aclamação
    const item = aclamacaoRezada({ refrao: r.aclamacao.refrao, texto: r.aclamacao.verso });
    if (s >= 0) itens[s] = item;
  }
  if (comOE2) inserirEucaristia(itens, 'oe2', 'p-oe2');
  return itens;
}

// ---------- Diálogo ----------

const LitDia = { lida: null, data: null };

// ---------- Busca automática na Paulus (só no aplicativo) ----------
// Cada dia tem uma página; elas se ligam pelos links "dia anterior / próximo dia".
// Começa na página principal (o dia de hoje no site) e anda pelos links até o dia pedido.

// Texto de um trecho de HTML como ficaria ao copiar da página (parágrafos e quebras viram linhas)
function htmlParaTexto(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
  c.querySelectorAll('p, div, h1, h2, h3, h4, li').forEach(b => b.append('\n'));
  return c.textContent.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
}

function lerPaginaPaulus(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const titulo = (doc.querySelector('.titulo-liturgia')?.textContent || '').replace(/\s+/g, ' ').trim();
  const corpo = doc.querySelector('#texto');
  const md = titulo.match(/(\d{1,2})\s*[–-]?\s*([A-Za-zÀ-ú-]+)/);
  if (!md || !corpo) throw new Error('a página da Paulus mudou de formato');
  const links = [...doc.querySelectorAll('a[href*="/portal/liturgia-diaria/"]')]
    .map(a => ({ url: a.href, rot: a.textContent.replace(/\s+/g, ' ').trim() }))
    .filter(l => !/\/page\/|liturgia-diaria-das-horas/.test(l.url) && /^(Dia\s+)?\d{1,2}\b/i.test(l.rot))
    .map(l => ({ url: l.url, dia: +l.rot.match(/\d{1,2}/)[0] }));
  // cabeçalho no formato que o leitor conhece ("4 – DOMINGO") + o texto da liturgia
  return { dia: +md[1], links, texto: `${md[1]} – ${md[2].toUpperCase()}\n${htmlParaTexto(corpo)}` };
}

// data com esse dia do mês mais perto da data pedida
function dataDoDia(dia, perto) {
  for (let k = 0; k <= 20; k++) for (const s of [k, -k]) {
    const d = new Date(perto.getFullYear(), perto.getMonth(), perto.getDate() + s);
    if (d.getDate() === dia) return d;
  }
  return null;
}

async function buscarPaulus(alvo) {
  let url = URL_PAULUS;
  const vistos = new Set();
  for (let passo = 0; passo < 12; passo++) {
    if (vistos.has(url)) break;
    vistos.add(url);
    const pg = lerPaginaPaulus((await httpApp(url)).texto);
    const dataPg = dataDoDia(pg.dia, alvo);
    if (!dataPg) throw new Error('não reconheci o dia na página da Paulus');
    if (isoData(dataPg) === isoData(alvo)) return pg.texto;
    const vizinho = new Date(dataPg.getFullYear(), dataPg.getMonth(), dataPg.getDate() + (dataPg < alvo ? 1 : -1));
    const link = pg.links.find(l => l.dia === vizinho.getDate());
    if (!link) throw new Error(dataPg < alvo
      ? `a Paulus ainda não publicou a liturgia desse dia (o mais adiantado é ${dataCurta(dataPg)})`
      : `esse dia já saiu do site da Paulus (o mais antigo é ${dataCurta(dataPg)})`);
    url = link.url;
  }
  throw new Error('não consegui chegar a esse dia no site da Paulus');
}

async function buscarLiturgiaAutomatica() {
  const v = $('#litBuscaData').value;
  if (!v) return;
  const b = $('#btnBuscarPaulus');
  b.disabled = true; b.textContent = 'Buscando…';
  $('#litResumo').innerHTML = '<span class="sutil">Buscando a liturgia no site da Paulus…</span>';
  try {
    $('#litTexto').value = await buscarPaulus(deIso(v));
    processarColagem();
    if (LitDia.lida) { $('#litData').value = v; renderLiturgiaReconhecida(); }
  } catch (e) {
    $('#litResumo').innerHTML = `<span class="status erro">Não deu para buscar: ${esc(e.message)}. Dá para copiar e colar a página, como antes.</span>`;
  } finally { b.disabled = false; b.textContent = '🌐 Buscar na Paulus'; }
}

function abrirLiturgiaDoDia() {
  $('#litBuscaData').value = isoData(new Date());
  $('#litAuto').hidden = !NO_APP;
  LitDia.lida = null;
  $('#litTexto').value = '';
  $('#litResumo').innerHTML = '<span class="sutil">Cole a página acima para ver o que foi reconhecido.</span>';
  $('#litCelebracoes').innerHTML = '';
  $('#btnLitMontar').disabled = true;
  const dlg = $('#dlgLiturgia');
  dlg.returnValue = '';
  dlg.showModal();
}

function processarColagem() {
  const txt = $('#litTexto').value;
  if (!txt.trim()) return;
  try {
    const r = lerLiturgiaColada(txt);
    LitDia.lida = r;
    const d = dataDaLiturgia(r);
    $('#litData').value = isoData(d);
    renderLiturgiaReconhecida();
  } catch (err) {
    LitDia.lida = null;
    $('#litResumo').innerHTML = `<span class="status erro">${esc(err.message)}</span>`;
    $('#litCelebracoes').innerHTML = '';
    $('#btnLitMontar').disabled = true;
  }
}

function renderLiturgiaReconhecida() {
  const r = LitDia.lida;
  if (!r) return;
  const d = deIso($('#litData').value);
  const domingo = d.getDay() === 0;
  $('#litOE2').checked = !domingo;
  $('#litResumo').innerHTML = `
    <div><b>${esc(r.titulo)}</b> <span class="sutil">· ${esc(r.cor)}${r.gloria ? ' · Glória' : ''}${r.creio ? ' · Creio' : ''}</span></div>
    <ul class="lit-lista">
      ${r.antifona ? '<li>✓ Antífona de entrada</li>' : ''}
      ${r.leituras.map(l => `<li>✓ ${esc(l.nome)}: ${esc(l.ref)}</li>`).join('')}
      ${r.salmo ? `<li>✓ Salmo ${esc(r.salmo.ref.replace(/^Sl /, ''))} (refrão + ${r.salmo.estrofes.length} estrofes)</li>` : ''}
      ${r.aclamacao ? '<li>✓ Aclamação ao Evangelho</li>' : ''}
    </ul>`;
  const ocs = ocorrencias(d).filter(o => !o.cancelada);
  $('#litCelebracoes').innerHTML = ocs.length
    ? ocs.map((o, i) => {
        const existe = roteiroDaCelebracao(o), loc = localDe(o.localId);
        return `<label class="dist-item"><input type="checkbox" data-i="${i}" ${o.tipo === 'Missa' && !existe ? 'checked' : ''}>
          <span class="dist-quando">${o.hora}</span>${loc ? `<span class="card-ponto" style="background:${loc.cor}"></span>` : ''}
          <span class="dist-txt">${esc(o.texto)}</span>${existe ? '<span class="dist-existe">já tem roteiro — marque para refazer</span>' : ''}</label>`;
      }).join('')
    : '<p class="sutil">Nenhuma celebração na Agenda neste dia: será criado um roteiro avulso.</p>';
  LitDia.ocs = ocs;
  $('#btnLitMontar').disabled = false;
}

async function montarRoteirosDaLiturgia() {
  const r = LitDia.lida;
  const d = deIso($('#litData').value);
  const domingo = d.getDay() === 0;
  const comOE2 = $('#litOE2').checked;
  const marcadas = $$('#litCelebracoes input:checked').map(el => LitDia.ocs[+el.dataset.i]);
  let primeiro = null, n = 0;
  if (!LitDia.ocs.length) {
    const rot = novoRoteiro(`${DIAS_CURTOS[d.getDay()]} ${dataCurta(d)} — ${cap1(r.titulo)}`);
    rot.data = isoData(d);
    rot.itens = itensDaLiturgia(r, domingo, comOE2);
    marcarLiturgia(rot, r);
    S.roteiros.push(rot); await DB.salvar('roteiros', rot);
    primeiro = rot; n = 1;
  }
  for (const o of marcadas) {
    const itens = itensDaLiturgia(r, domingo, comOE2);
    let rot = roteiroDaCelebracao(o);
    if (rot) { rot.itens = itens; rot.atualizado = Date.now(); }
    else rot = await criarRoteiroDaCelebracao(o, itens);
    marcarLiturgia(rot, r);
    await DB.salvar('roteiros', rot);
    primeiro ||= rot; n++;
  }
  if (primeiro) { trocarRoteiro(primeiro); mostrarAba('roteiros'); }
  const faltaOE = comOE2 && (!temTexto('oe2') || !temTexto('p-oe2'));
  toast(`${n} roteiro(s) montado(s) com a liturgia de ${dataCurta(d)}.` + (faltaOE ? ' Cadastre o texto da Oração Eucarística II no catálogo (✝).' : ''));
}

const cap1 = s => s ? s.charAt(0) + s.slice(1).toLowerCase() : s;

// Nome e cor da celebração vindos da Paulus ("ASSUNÇÃO…", "(branco, glória, creio)") vão para o card do roteiro
function marcarLiturgia(rot, r) {
  rot.liturgiaDe = rot.data || infoRoteiro(rot).iso;
  rot.tituloLiturgico = r.titulo ? cap1(r.titulo) : '';
  const cor = semAcento(r.cor || '');
  rot.cor = Liturgia.CORES[cor] ? cor : '';
}

function ligarLiturgiaDoDia() {
  $('#btnLiturgiaDia').addEventListener('click', abrirLiturgiaDoDia);
  $('#btnAbrirPaulus').addEventListener('click', () => window.open(URL_PAULUS, '_blank'));
  $('#btnBuscarPaulus').addEventListener('click', buscarLiturgiaAutomatica);
  $('#litTexto').addEventListener('input', processarColagem);
  $('#litData').addEventListener('change', renderLiturgiaReconhecida);
  $('#formLiturgia').addEventListener('submit', e => { if (e.submitter?.value === 'montar') montarRoteirosDaLiturgia(); });
}
