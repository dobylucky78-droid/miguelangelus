'use strict';
/*
 * Terço e Ângelus.
 * - Ângelus (item 'angelus'): a oração "Ângelus" das Orações; no Tempo Pascal (da Páscoa a Pentecostes), a "Regina Caeli".
 * - Terço (itens 'terco'): Abertura, 1º a 5º Mistério e Encerramento, um item para cada parte (o operador clica no mistério).
 *   Os mistérios do dia vêm sozinhos pelo dia da semana do roteiro (domingos do Advento: Gozosos; da Quaresma: Dolorosos)
 *   e dá para trocar. Em cada Ave-Maria, o telão mostra a dezena de contas com a conta da vez acesa.
 *   Opcional: trecho da Bíblia em cada mistério (da Bíblia do programa), oração depois do Glória (Jaculatória de Fátima ou
 *   outra cadastrada em Orações) e a Ladainha de Nossa Senhora no encerramento.
 * Os textos vêm das Orações (quem editar lá muda aqui também); se a oração tiver sido apagada, usa o texto tradicional.
 * Usa S, Oracoes, Biblia, Liturgia, dividir, versosEmSlides, quandoDoItem, deIso, uid, esc… (em tempo de execução).
 */

const MISTERIOS = {
  gozosos: { nome: 'Gozosos', um: 'Gozoso', lista: [
    ['A Anunciação do Anjo a Maria', 'Lc 1,26-38'],
    ['A Visitação de Maria a sua prima Isabel', 'Lc 1,39-45'],
    ['O Nascimento de Jesus em Belém', 'Lc 2,1-7'],
    ['A Apresentação do Menino Jesus no Templo', 'Lc 2,22-32'],
    ['A Perda e o Encontro do Menino Jesus no Templo', 'Lc 2,41-52'],
  ] },
  luminosos: { nome: 'Luminosos', um: 'Luminoso', lista: [
    ['O Batismo de Jesus no Jordão', 'Mt 3,13-17'],
    ['A Autorrevelação de Jesus nas Bodas de Caná', 'Jo 2,1-11'],
    ['O Anúncio do Reino de Deus e o convite à conversão', 'Mc 1,14-15'],
    ['A Transfiguração de Jesus', 'Lc 9,28-36'],
    ['A Instituição da Eucaristia', 'Lc 22,14-20'],
  ] },
  dolorosos: { nome: 'Dolorosos', um: 'Doloroso', lista: [
    ['A Agonia de Jesus no Horto das Oliveiras', 'Lc 22,39-46'],
    ['A Flagelação de Jesus', 'Jo 19,1'],
    ['A Coroação de Espinhos', 'Mt 27,27-31'],
    ['Jesus carrega a Cruz até o Calvário', 'Lc 23,26-32'],
    ['A Crucifixão e Morte de Jesus', 'Lc 23,33-46'],
  ] },
  gloriosos: { nome: 'Gloriosos', um: 'Glorioso', lista: [
    ['A Ressurreição de Jesus', 'Mc 16,1-7'],
    ['A Ascensão de Jesus ao Céu', 'At 1,6-11'],
    ['A Vinda do Espírito Santo sobre Maria e os Apóstolos', 'At 2,1-4'],
    ['A Assunção de Maria ao Céu', 'Lc 1,46-50'],
    ['A Coroação de Maria, Rainha do Céu e da Terra', 'Ap 12,1'],
  ] },
};
const DIAS_MISTERIOS = ['gloriosos', 'gozosos', 'dolorosos', 'gloriosos', 'luminosos', 'dolorosos', 'gozosos'];   // domingo a sábado

// Orações tradicionais acrescentadas na 1.6.3 (cadastradas uma vez em Orações; podem ser editadas)
const ORACOES_TERCO = [
  { titulo: 'Pai-Nosso', categoria: 'Outras', texto:
    'Pai nosso que estais nos céus,\nsantificado seja o vosso nome;\nvenha a nós o vosso Reino;\nseja feita a vossa vontade,\nassim na terra como no céu.\n\n' +
    'O pão nosso de cada dia nos dai hoje;\nperdoai-nos as nossas ofensas,\nassim como nós perdoamos\na quem nos tem ofendido;\n' +
    'e não nos deixeis cair em tentação,\nmas livrai-nos do mal.\nAmém.' },
  { titulo: 'Jaculatória de Fátima', categoria: 'Marianas', texto:
    'Ó meu Jesus, perdoai-nos,\nlivrai-nos do fogo do inferno,\nlevai as almas todas para o céu\ne socorrei principalmente as que mais precisarem.' },
  { titulo: 'Ângelus', categoria: 'Marianas', texto:
    'O Anjo do Senhor anunciou a Maria.\n— E ela concebeu do Espírito Santo.\n\n' +
    'Ave, Maria, cheia de graça, o Senhor é convosco;\nbendita sois vós entre as mulheres,\ne bendito é o fruto do vosso ventre, Jesus.\n' +
    '— Santa Maria, Mãe de Deus, rogai por nós, pecadores,\nagora e na hora de nossa morte. Amém.\n\n' +
    'Eis aqui a serva do Senhor.\n— Faça-se em mim segundo a vossa palavra.\n\n' +
    'Ave, Maria, cheia de graça, o Senhor é convosco;\nbendita sois vós entre as mulheres,\ne bendito é o fruto do vosso ventre, Jesus.\n' +
    '— Santa Maria, Mãe de Deus, rogai por nós, pecadores,\nagora e na hora de nossa morte. Amém.\n\n' +
    'E o Verbo se fez carne.\n— E habitou entre nós.\n\n' +
    'Ave, Maria, cheia de graça, o Senhor é convosco;\nbendita sois vós entre as mulheres,\ne bendito é o fruto do vosso ventre, Jesus.\n' +
    '— Santa Maria, Mãe de Deus, rogai por nós, pecadores,\nagora e na hora de nossa morte. Amém.\n\n' +
    'Rogai por nós, santa Mãe de Deus.\n— Para que sejamos dignos das promessas de Cristo.\n\n' +
    'Oremos: Infundi, Senhor, como vos pedimos, a vossa graça em nossas almas,\npara que nós, que pela anunciação do Anjo\n' +
    'viemos ao conhecimento da encarnação de Jesus Cristo, vosso Filho,\npor sua paixão e morte sejamos conduzidos à glória da ressurreição.\n' +
    'Pelo mesmo Cristo, Senhor nosso.\n— Amém.' },
  { titulo: 'Regina Caeli (Rainha do Céu)', categoria: 'Marianas', texto:
    'Rainha do céu, alegrai-vos, aleluia!\n— Porque aquele que merecestes trazer em vosso seio, aleluia!\n\n' +
    'Ressuscitou como disse, aleluia!\n— Rogai a Deus por nós, aleluia!\n\n' +
    'Exultai e alegrai-vos, ó Virgem Maria, aleluia!\n— Porque o Senhor ressuscitou verdadeiramente, aleluia!\n\n' +
    'Oremos: Ó Deus, que vos dignastes alegrar o mundo\ncom a ressurreição do vosso Filho, nosso Senhor Jesus Cristo,\n' +
    'concedei-nos, vos suplicamos, que, por sua Mãe, a Virgem Maria,\nalcancemos as alegrias da vida eterna.\nPelo mesmo Cristo, Senhor nosso.\n— Amém.' },
  { titulo: 'Ladainha de Nossa Senhora', categoria: 'Marianas', texto: (() => {
    const pares = ['Senhor, tende piedade de nós.', 'Jesus Cristo, tende piedade de nós.', 'Senhor, tende piedade de nós.',
      'Jesus Cristo, ouvi-nos.', 'Jesus Cristo, atendei-nos.'];
    const blocos = [pares.slice(0, 3).map(p => `${p}\n— ${p}`).join('\n'), pares.slice(3).map(p => `${p}\n— ${p}`).join('\n')];
    blocos.push(['Deus Pai do céu,', 'Deus Filho, Redentor do mundo,', 'Deus Espírito Santo,', 'Santíssima Trindade, que sois um só Deus,']
      .join('\n') + '\n— tende piedade de nós.');
    const invoc = ['Santa Maria', 'Santa Mãe de Deus', 'Santa Virgem das virgens', 'Mãe de Cristo', 'Mãe da Igreja', 'Mãe da misericórdia',
      'Mãe da divina graça', 'Mãe da esperança', 'Mãe puríssima', 'Mãe castíssima', 'Mãe sempre virgem', 'Mãe imaculada', 'Mãe amável',
      'Mãe admirável', 'Mãe do bom conselho', 'Mãe do Criador', 'Mãe do Salvador', 'Virgem prudentíssima', 'Virgem venerável',
      'Virgem louvável', 'Virgem poderosa', 'Virgem clemente', 'Virgem fiel', 'Espelho de justiça', 'Sede da sabedoria',
      'Causa da nossa alegria', 'Vaso espiritual', 'Vaso honorífico', 'Vaso insigne de devoção', 'Rosa mística', 'Torre de Davi',
      'Torre de marfim', 'Casa de ouro', 'Arca da aliança', 'Porta do céu', 'Estrela da manhã', 'Saúde dos enfermos',
      'Refúgio dos pecadores', 'Conforto dos migrantes', 'Consoladora dos aflitos', 'Auxílio dos cristãos', 'Rainha dos anjos',
      'Rainha dos patriarcas', 'Rainha dos profetas', 'Rainha dos apóstolos', 'Rainha dos mártires', 'Rainha dos confessores',
      'Rainha das virgens', 'Rainha de todos os santos', 'Rainha concebida sem pecado original', 'Rainha elevada ao céu',
      'Rainha do santíssimo rosário', 'Rainha da família', 'Rainha da paz'];
    for (let i = 0; i < invoc.length; i += 5) blocos.push(invoc.slice(i, i + 5).map(x => x + ',').join('\n') + '\n— rogai por nós.');
    blocos.push('Cordeiro de Deus, que tirais os pecados do mundo,\n— perdoai-nos, Senhor.',
      'Cordeiro de Deus, que tirais os pecados do mundo,\n— ouvi-nos, Senhor.',
      'Cordeiro de Deus, que tirais os pecados do mundo,\n— tende piedade de nós.',
      'Rogai por nós, santa Mãe de Deus.\n— Para que sejamos dignos das promessas de Cristo.',
      'Oremos: Senhor Deus, nós vos suplicamos\nque concedais aos vossos servos perpétua saúde de alma e de corpo;\n' +
      'e que, pela gloriosa intercessão da bem-aventurada sempre Virgem Maria,\nsejamos livres da presente tristeza\n' +
      'e gozemos da eterna alegria.\nPor Cristo, nosso Senhor.\n— Amém.');
    return blocos.join('\n\n');
  })() },
  // Adoração ao Santíssimo
  { titulo: 'Graças e louvores', categoria: 'Eucaristia', texto:
    'Graças e louvores se deem a todo momento\n— ao Santíssimo e diviníssimo Sacramento.' },
  { titulo: 'Oração do Anjo de Fátima (Meu Deus, eu creio)', categoria: 'Eucaristia', texto:
    'Meu Deus, eu creio, adoro, espero e amo-vos.\nPeço-vos perdão para os que não creem,\nnão adoram, não esperam e não vos amam.\n\n' +
    'Santíssima Trindade, Pai, Filho e Espírito Santo,\nadoro-vos profundamente\ne ofereço-vos o preciosíssimo Corpo, Sangue, Alma e Divindade\n' +
    'de Jesus Cristo, presente em todos os sacrários da terra,\nem reparação dos ultrajes, sacrilégios e indiferenças\ncom que ele mesmo é ofendido.\n\n' +
    'E pelos méritos infinitos do seu Sacratíssimo Coração\ne do Coração Imaculado de Maria,\npeço-vos a conversão dos pobres pecadores.' },
  { titulo: 'Oração diante do Santíssimo (Do céu lhes destes o pão)', categoria: 'Eucaristia', texto:
    'Do céu lhes destes o pão.\n— Que contém todo o sabor.\n\n' +
    'Oremos: Senhor Jesus Cristo,\nque neste admirável sacramento\nnos deixastes o memorial da vossa paixão,\n' +
    'concedei-nos venerar com tão grande amor\nos sagrados mistérios do vosso Corpo e do vosso Sangue,\n' +
    'que sintamos sempre em nós os frutos da vossa redenção.\nVós que viveis e reinais para sempre.\n— Amém.' },
  { titulo: 'Louvores Divinos (Bendito seja Deus)', categoria: 'Eucaristia', texto:
    'Bendito seja Deus.\nBendito seja o seu santo nome.\nBendito seja Jesus Cristo, verdadeiro Deus e verdadeiro homem.\nBendito seja o nome de Jesus.\n\n' +
    'Bendito seja o seu sacratíssimo Coração.\nBendito seja o seu preciosíssimo Sangue.\nBendito seja Jesus no Santíssimo Sacramento do altar.\nBendito seja o Espírito Santo Paráclito.\n\n' +
    'Bendita seja a grande Mãe de Deus, Maria Santíssima.\nBendita seja a sua santa e imaculada Conceição.\nBendita seja a sua gloriosa Assunção.\n\n' +
    'Bendito seja o nome de Maria, Virgem e Mãe.\nBendito seja São José, seu castíssimo esposo.\nBendito seja Deus nos seus anjos e nos seus santos.' },
];

// Roteiro de Adoração ao Santíssimo (Agenda → tipo "Adoração"): exposição, orações, Palavra, silêncio, Tão Sublime e bênção.
// Os cantos ficam para escolher (o "Tão Sublime Sacramento" já vem, se estiver nos Cantos).
function itensDaAdoracao() {
  const oracao = titulo => {
    const o = Oracoes.lista.find(x => x.titulo === titulo);
    return o ? { id: uid(), tipo: 'oracao', oracaoId: o.id } : null;
  };
  const canto = (momento, procura) => {
    const c = procura ? S.cantos.find(x => semAcento(x.titulo || '').toLowerCase().includes(procura)) : null;
    return { id: uid(), tipo: 'canto', momento, cantoId: c ? c.id : '' };
  };
  return [
    { id: uid(), tipo: 'texto', titulo: 'Adoração ao Santíssimo', texto: 'Adoração ao Santíssimo Sacramento' },
    canto('Adoração'),                                       // exposição
    oracao('Graças e louvores'),
    oracao('Oração do Anjo de Fátima (Meu Deus, eu creio)'),
    { id: uid(), tipo: 'leitura', titulo: 'Leitura', ref: '', evangelho: false },
    canto('Adoração'),
    { id: uid(), tipo: 'texto', titulo: 'Adoração', texto: 'Momento de adoração em silêncio' },
    { id: uid(), tipo: 'preces', titulo: 'Preces', resposta: 'Senhor, escutai a nossa prece.', convite: '', texto: '', conclusao: '' },
    canto('Adoração', 'tao sublime'),                        // Tão Sublime Sacramento
    oracao('Oração diante do Santíssimo (Do céu lhes destes o pão)'),
    { id: uid(), tipo: 'texto', titulo: 'Bênção do Santíssimo', texto: 'Bênção do Santíssimo' },
    oracao('Louvores Divinos (Bendito seja Deus)'),
    oracao('Graças e louvores'),
    canto('Final'),
  ].filter(Boolean);
}

// Cadastra (uma vez) as orações do Terço, do Ângelus e da Adoração que ainda não existem — mesmo esquema das orações-padrão
async function semearOracoesTerco() {
  if (S.config.oracoesTercoSemeadas) return;
  for (const o of ORACOES_TERCO) {
    if (Oracoes.lista.some(x => x.titulo === o.titulo)) continue;
    const nova = { id: uid(), ...o, padrao: true };
    await DB.salvar('oracoes', nova);
    Oracoes.lista.push(nova);
  }
  S.config.oracoesTercoSemeadas = true;
  salvarConfig();
}

// Texto de uma oração pelo título (o das Orações, se existir; senão o tradicional)
function textoOracao(titulo) {
  const o = Oracoes.lista.find(x => x.titulo === titulo);
  if (o) return o.texto;
  const p = [...ORACOES_TERCO, ...ORACOES_PADRAO].find(x => x.titulo === titulo);
  return p ? p.texto : '';
}

// data do roteiro a que o item pertence (não só o aberto: a lista de cards e a Agenda também perguntam); sem data, hoje
const dataDoItemTerco = it => {
  const r = S.roteiro?.itens.includes(it) ? S.roteiro : (S.roteiros || []).find(x => x.itens?.includes(it));
  const iso = r ? infoRoteiro(r).iso : '';
  return iso ? deIso(iso) : new Date();
};
const tempoPascal = d => { try { return Liturgia.info(d).tempo === 'Páscoa'; } catch (_) { return false; } };

// Mistérios do dia: pela semana; nos domingos do Advento e do Natal, Gozosos; nos da Quaresma, Dolorosos
function misteriosDoDia(d) {
  if (d.getDay() === 0) {
    try {
      const t = Liturgia.info(d).tempo;
      if (t === 'Advento' || t === 'Natal') return 'gozosos';
      if (t === 'Quaresma') return 'dolorosos';
    } catch (_) {}
  }
  return DIAS_MISTERIOS[d.getDay()];
}

// ---------- Itens ----------

// Os 7 itens do terço (abertura, 5 mistérios, encerramento), com as escolhas comuns repetidas em cada um
function itensDoTerco(d = new Date()) {
  const jac = Oracoes.lista.find(o => o.titulo === 'Jaculatória de Fátima');
  const comum = { grupo: misteriosDoDia(d), comBiblia: false, jaculatoria: jac ? jac.id : '', ladainha: false };
  return [
    { id: uid(), tipo: 'terco', parte: 'abertura', ...comum },
    ...[1, 2, 3, 4, 5].map(n => ({ id: uid(), tipo: 'terco', parte: 'misterio', n, ref: '', ...comum })),
    { id: uid(), tipo: 'terco', parte: 'final', ...comum },
  ];
}

// Escolhas que valem para o terço inteiro: mudar num item muda nos outros itens do terço do roteiro
const CAMPOS_TERCO_COMUNS = ['grupo', 'comBiblia', 'jaculatoria', 'ladainha'];
function aoMudarTerco(it, campo) {
  if (!CAMPOS_TERCO_COMUNS.includes(campo) || !S.roteiro?.itens.includes(it)) return;
  for (const x of S.roteiro.itens) if (x.tipo === 'terco' && x !== it) x[campo] = it[campo];
  if (campo === 'grupo') for (const x of S.roteiro.itens) if (x.tipo === 'terco') x.ref = '';   // referência própria era de outro mistério
}

const misterioDe = it => {
  const g = MISTERIOS[it.grupo] || MISTERIOS.gozosos;
  const [nome, ref] = g.lista[(it.n || 1) - 1] || g.lista[0];
  return { g, nome, ref: (it.ref || '').trim() || ref };
};

function resumoTerco(it) {
  const g = MISTERIOS[it.grupo] || MISTERIOS.gozosos;
  if (it.parte === 'abertura') return { rot: 'Terço', tit: `Abertura · Mistérios ${g.nome}`, vazio: false };
  if (it.parte === 'final') return { rot: 'Terço', tit: `Encerramento · Salve-Rainha${it.ladainha ? ' e Ladainha' : ''}`, vazio: false };
  const m = misterioDe(it);
  return { rot: 'Terço', tit: `${it.n}º Mistério ${g.um}: ${m.nome}`, vazio: false };
}

// ---------- Slides ----------

// Ave-Maria num slide só, a 2ª parte como resposta do povo; com as contas da dezena embaixo
function slideAveMaria(k, total, rodape) {
  const partes = dividir(textoOracao('Ave-Maria'));
  const texto = partes.length > 1 ? `${partes[0]}\n— ${partes.slice(1).join('\n')}` : partes[0] || 'Ave, Maria…';
  return { texto, rodape: `${rodape} · Ave-Maria ${k}/${total}`, contas: { total, atual: k } };
}

const slidesOracao = (titulo, rodape = titulo) => dividir(textoOracao(titulo)).map(t => ({ texto: t, rodape }));
const SINAL_DA_CRUZ = 'Em nome do Pai, e do Filho e do Espírito Santo.\n— Amém.';

function slidesTerco(it) {
  const g = MISTERIOS[it.grupo] || MISTERIOS.gozosos;
  const fim = () => {
    const out = [];
    const jac = it.jaculatoria && Oracoes.lista.find(o => o.id === it.jaculatoria);
    if (jac) out.push(...dividir(jac.texto).map(t => ({ texto: t, rodape: jac.titulo })));
    return out;
  };
  if (it.parte === 'abertura') {
    const creio = Ordinario.parte('creio-apostolico');
    return [
      { texto: `Santo Terço\nMistérios ${g.nome}`, rodape: '' },
      { texto: SINAL_DA_CRUZ, rodape: 'Sinal da cruz' },
      ...(creio ? creio.slides.map(t => ({ texto: t, rodape: 'Creio' })) : []),
      ...slidesOracao('Pai-Nosso'),
      ...[1, 2, 3].map(k => slideAveMaria(k, 3, 'Fé, esperança e caridade')),
      ...slidesOracao('Glória ao Pai'),
    ];
  }
  if (it.parte === 'final') {
    return [
      ...slidesOracao('Salve-Rainha'),
      ...(it.ladainha ? slidesOracao('Ladainha de Nossa Senhora') : []),
      { texto: SINAL_DA_CRUZ, rodape: 'Sinal da cruz' },
    ];
  }
  const m = misterioDe(it);
  const titulo = `${it.n}º Mistério ${g.um}`;
  const out = [{ texto: `${titulo}\n${m.nome}`, rodape: `Mistérios ${g.nome} · ${m.ref}` }];
  if (it.comBiblia && S.biblia) {
    const r = Biblia.resolver(S.biblia, m.ref);
    if (!r.erro) out.push(...versosEmSlides(r));
  }
  out.push(...slidesOracao('Pai-Nosso'));
  for (let k = 1; k <= 10; k++) out.push(slideAveMaria(k, 10, titulo));
  out.push(...slidesOracao('Glória ao Pai'), ...fim());
  return out;
}

function slidesAngelus(it) {
  const titulo = tempoPascal(dataDoItemTerco(it)) ? 'Regina Caeli (Rainha do Céu)' : 'Ângelus';
  return slidesOracao(titulo);
}

function resumoAngelus(it) {
  const pascal = tempoPascal(dataDoItemTerco(it));
  return { rot: 'Oração', tit: pascal ? 'Regina Caeli (no Tempo Pascal, no lugar do Ângelus)' : 'Ângelus', vazio: false };
}

// ---------- Edição (cabeçalho do item) ----------

function htmlCabTerco(it) {
  const opcoesGrupo = Object.entries(MISTERIOS).map(([k, g]) => `<option value="${k}" ${k === it.grupo ? 'selected' : ''}>Mistérios ${g.nome}</option>`).join('');
  const jac = `<option value="">— nenhuma —</option>` + Oracoes.lista.slice().sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .map(o => `<option value="${o.id}" ${o.id === it.jaculatoria ? 'selected' : ''}>${esc(o.titulo)}</option>`).join('');
  const dia = misteriosDoDia(dataDoItemTerco(it));
  const linha2 = it.parte === 'misterio'
    ? `<label class="check" title="Lê o trecho da Bíblia do programa depois do anúncio do mistério"><input type="checkbox" data-campo="comBiblia" ${it.comBiblia ? 'checked' : ''}> Trecho da Bíblia</label>
       ${it.comBiblia ? `<input data-campo="ref" class="estreito" value="${esc(it.ref || '')}" placeholder="${esc(misterioDe({ ...it, ref: '' }).ref)}" title="Vazio: o trecho de costume">` : ''}`
    : it.parte === 'final'
      ? `<label class="check"><input type="checkbox" data-campo="ladainha" ${it.ladainha ? 'checked' : ''}> Ladainha de Nossa Senhora</label>`
      : '';
  return `<div class="cab-linha"><span class="tag t-terco">Terço</span>
      <select data-campo="grupo" class="estreito">${opcoesGrupo}</select>
      ${it.grupo !== dia ? `<span class="sutil pequeno">(o do dia: ${MISTERIOS[dia].nome})</span>` : ''}
      <label class="check" title="Oração depois do Glória, em cada mistério (cadastre outras em Orações)">Depois do Glória <select data-campo="jaculatoria" class="estreito">${jac}</select></label>
      ${linha2}</div>
    ${it.comBiblia && !S.biblia ? '<p class="sutil pequeno" style="margin:0">Sem Bíblia no programa: o trecho não entra.</p>' : ''}
    <p class="sutil pequeno" style="margin:0">Cada <b>Próximo</b> avança uma Ave-Maria; o telão mostra a dezena com a conta da vez acesa. As escolhas acima valem para o terço inteiro.</p>`;
}

// Texto para imprimir (sem repetir as 10 Ave-Marias)
function textoTercoParaPapel(it) {
  const g = MISTERIOS[it.grupo] || MISTERIOS.gozosos;
  const jac = it.jaculatoria && Oracoes.lista.find(o => o.id === it.jaculatoria);
  if (it.parte === 'abertura') return `Mistérios ${g.nome}\nSinal da cruz · Creio · Pai-Nosso · 3 Ave-Marias · Glória`;
  if (it.parte === 'final') return `Salve-Rainha${it.ladainha ? ' · Ladainha de Nossa Senhora' : ''} · Sinal da cruz`;
  const m = misterioDe(it);
  return `${m.nome} (${m.ref})\nPai-Nosso · 10 Ave-Marias · Glória${jac ? ' · ' + jac.titulo : ''}`;
}

function adicionarTercoAoRoteiro() {
  const novos = itensDoTerco(deIso(infoRoteiro(S.roteiro).iso || isoData(new Date())));
  const pos = adicionarAoRoteiro(novos[0]);
  S.roteiro.itens.splice(pos + 1, 0, ...novos.slice(1));
  salvarRoteiro();
  abrirItem(novos[0], pos);
}

function novoRoteiroTerco() {
  const hoje = new Date();
  const r = novoRoteiro(`Terço ${hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`);
  r.data = isoData(hoje);
  r.itens = itensDoTerco(hoje);
  S.roteiros.push(r);
  DB.salvar('roteiros', r);
  trocarRoteiro(r);
  mostrarAba('roteiros');
  abrirItem(r.itens[0], 0);
  toast(`Terço montado com os Mistérios ${MISTERIOS[r.itens[0].grupo].nome}. Dá para trocar no item.`);
}
