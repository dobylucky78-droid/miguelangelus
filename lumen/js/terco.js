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
  { titulo: 'Ladainha de Nossa Senhora', categoria: 'Ladainhas', texto: (() => {
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

// Sequências (1.6.6): cantadas/rezadas antes da Aclamação ao Evangelho. Texto do Lecionário — confira com o da paróquia
// (são orações comuns: dá para corrigir em Orações → Sequências).
const ORACOES_SEQUENCIAS = [
  { titulo: 'Sequência Pascal (Cantai, cristãos)', categoria: 'Sequências', texto: [
    'Cantai, cristãos, afinal:\n“Salve, ó vítima pascal!”\nCordeiro inocente, o Cristo\nabriu-nos do Pai o aprisco.',
    'Por toda ovelha imolado,\ndo mundo lava o pecado.\nDuelam forte e mais forte:\né a vida que enfrenta a morte.',
    'O rei da vida, cativo,\né morto, mas reina vivo!\nResponde, pois, ó Maria:\nno teu caminho o que havia?',
    '“Vi Cristo ressuscitado,\no túmulo abandonado,\nos anjos da cor do sol,\ndobrado ao chão o lençol…',
    'O Cristo, que leva aos céus,\ncaminha à frente dos seus!”\nRessuscitou de verdade.\nÓ Rei, ó Cristo, piedade!',
  ].map((e, i) => `<b><vermelho>${i + 1}.</vermelho></b> ${e}`).join('\n\n') },       // nº da estrofe em vermelho e negrito
  { titulo: 'Sequência de Pentecostes (Espírito de Deus)', categoria: 'Sequências', texto: [
    'Espírito de Deus,\nenviai dos céus\num raio de luz!', 'Vinde, Pai dos pobres,\ndai aos corações\nvossos sete dons.',
    'Consolo que acalma,\nhóspede da alma,\ndoce alívio, vinde!', 'No labor descanso,\nna aflição remanso,\nno calor aragem.',
    'Enchei, luz bendita,\nchama que crepita,\no íntimo de nós!', 'Sem a luz que acode,\nnada o homem pode,\nnenhum bem há nele.',
    'Ao sujo lavai,\nao seco regai,\ncurai o doente.', 'Dobrai o que é duro,\nguiai no escuro,\no frio aquecei.',
    'Dai à vossa Igreja,\nque espera e deseja,\nvossos sete dons.', 'Dai em prêmio ao forte\numa santa morte,\nalegria eterna. Amém.',
  ].map((e, i) => `<b><vermelho>${i + 1}.</vermelho></b> ${e}`).join('\n\n') },       // nº da estrofe em vermelho e negrito
  // Corpus Christi (Lauda Sion): versão completa oficial para o Brasil (texto enviado pela paróquia, 12/10/2026).
  // A forma breve começa na estrofe "Eis o pão que os anjos comem" (21ª): para usá-la, apague as anteriores numa cópia.
  { titulo: 'Sequência de Corpus Christi (Terra, exulta de alegria)', categoria: 'Sequências', texto: [
    'Terra, exulta de alegria,\nlouva teu pastor e guia\ncom teus hinos, tua voz!',
    'Tanto possas, tanto ouses,\nem louvá-lo não repouses:\nsempre excede o teu louvor!',
    'Hoje a Igreja te convida:\nao pão vivo que dá vida\nvem com ela celebrar!',
    'Este pão que o mundo creia!\npor Jesus, na santa ceia,\nfoi entregue aos que escolheu.',
    'Nosso júbilo cantemos,\nnosso amor manifestemos,\npois transborda o coração!',
    'Quão solene a festa, o dia,\nque da Santa Eucaristia\nnos recorda a instituição!',
    'Novo Rei e nova mesa,\nnova Páscoa e realeza,\nfoi-se a Páscoa dos judeus.',
    'Era sombra o antigo povo,\no que é velho cede ao novo:\nfoge a noite, chega a luz.',
    'O que o Cristo fez na ceia,\nmanda à Igreja que o rodeia\nrepeti-lo até voltar.',
    'Seu preceito conhecemos:\npão e vinho consagremos\npara nossa salvação.',
    'Faz-se carne o pão de trigo,\nfaz-se sangue o vinho amigo:\ndeve-o crer todo cristão.',
    'Se não vês nem compreendes,\ngosto e vista tu transcendes,\nelevado pela fé.',
    'Pão e vinho, eis o que vemos;\nmas ao Cristo é que nós temos\nem tão ínfimos sinais...',
    'Alimento verdadeiro,\npermanece o Cristo inteiro\nquer no vinho, quer no pão.',
    'É por todos recebido,\nnão em parte ou dividido,\npois inteiro é que se dá!',
    'Um ou mil comungam dele,\ntanto este quanto aquele:\nmultiplica-se o Senhor.',
    'Dá-se ao bom como ao perverso,\nmas o efeito é bem diverso:\nvida e morte traz em si...',
    'Pensa bem: igual comida,\nse ao que é bom enche de vida,\ntraz a morte para o mau.',
    'Eis a hóstia dividida...\nQuem hesita, quem duvida?\nComo é toda o autor da vida,\na partícula também.',
    'Jesus não é atingido:\no sinal que é partido;\nmas não é diminuído,\nnem se muda o que contém.',
    'Eis o pão que os anjos comem\ntransformado em pão do homem;\nsó os filhos o consomem:\nnão será lançado aos cães!',
    'Em sinais prefigurado,\npor Abraão foi imolado,\nno cordeiro aos pais foi dado,\nno deserto foi maná...',
    'Bom Pastor, pão de verdade,\npiedade, ó Jesus, piedade,\nconservai-nos na unidade,\nextingui nossa orfandade,\ntransportai-nos para o Pai!',
    'Aos mortais dando comida,\ndais também o pão da vida;\nque a família assim nutrida\nseja um dia reunida\naos convivas lá do céu!',
  ].map((e, i) => `<b><vermelho>${i + 1}.</vermelho></b> ${e}`).join('\n\n') },       // nº da estrofe em vermelho e negrito
];

// Ladainhas (1.6.6), categoria "Ladainhas". Início e fim comuns; as invocações vão de 5 em 5 por tela, com a resposta.
// Confira com o livro da paróquia (dá para corrigir em Orações → Ladainhas; na de Todos os Santos, acrescente os padroeiros).
const INICIO_LADAINHA = ['Senhor, tende piedade de nós.\n— Senhor, tende piedade de nós.\nJesus Cristo, tende piedade de nós.\n— Jesus Cristo, tende piedade de nós.\n' +
  'Senhor, tende piedade de nós.\n— Senhor, tende piedade de nós.',
  'Jesus Cristo, ouvi-nos.\n— Jesus Cristo, ouvi-nos.\nJesus Cristo, atendei-nos.\n— Jesus Cristo, atendei-nos.',
  'Deus Pai do céu,\nDeus Filho, Redentor do mundo,\nDeus Espírito Santo,\nSantíssima Trindade, que sois um só Deus,\n— tende piedade de nós.'];
const CORDEIRO_LADAINHA = ['Cordeiro de Deus, que tirais os pecados do mundo,\n— perdoai-nos, Senhor.',
  'Cordeiro de Deus, que tirais os pecados do mundo,\n— ouvi-nos, Senhor.',
  'Cordeiro de Deus, que tirais os pecados do mundo,\n— tende piedade de nós.'];
const deCinco = (lista, resp) => { const b = []; for (let i = 0; i < lista.length; i += 5) b.push(lista.slice(i, i + 5).map(x => x + ',').join('\n') + `\n— ${resp}`); return b; };

const ORACOES_LADAINHAS = [
  // forma do Missal (Vigília Pascal, Batismo, Ordenações), sem os pedidos próprios de cada rito
  { titulo: 'Ladainha de Todos os Santos', categoria: 'Ladainhas', texto: [
    'Senhor, tende piedade de nós.\n— Senhor, tende piedade de nós.\nCristo, tende piedade de nós.\n— Cristo, tende piedade de nós.\n' +
    'Senhor, tende piedade de nós.\n— Senhor, tende piedade de nós.',
    ...deCinco(['Santa Maria, Mãe de Deus', 'São Miguel', 'Santos Anjos de Deus', 'São João Batista', 'São José',
      'São Pedro e São Paulo', 'Santo André', 'São João', 'Santa Maria Madalena', 'Santo Estêvão',
      'Santo Inácio de Antioquia', 'São Lourenço', 'Santa Perpétua e Santa Felicidade', 'Santa Inês', 'São Gregório',
      'Santo Agostinho', 'Santo Atanásio', 'São Basílio', 'São Martinho', 'São Bento',
      'São Francisco e São Domingos', 'São Francisco Xavier', 'São João Maria Vianney', 'Santa Catarina de Sena', 'Santa Teresa de Jesus',
      'Todos os Santos e Santas de Deus'], 'rogai por nós.'),
    'Sede-nos propício,\n— ouvi-nos, Senhor.',
    ...deCinco(['De todo mal', 'De todo pecado', 'Da morte eterna', 'Pela vossa encarnação', 'Pela vossa morte e ressurreição',
      'Pela efusão do Espírito Santo'], 'livrai-nos, Senhor.'),
    'Apesar de nossos pecados,\nJesus, Filho do Deus vivo,\n— ouvi-nos, Senhor.',
    'Cristo, ouvi-nos.\n— Cristo, ouvi-nos.\nCristo, atendei-nos.\n— Cristo, atendei-nos.',
  ].join('\n\n') },
  { titulo: 'Ladainha do Sagrado Coração de Jesus', categoria: 'Ladainhas', texto: [
    ...INICIO_LADAINHA,
    ...deCinco(['Coração de Jesus, Filho do Pai Eterno', 'Coração de Jesus, formado pelo Espírito Santo no seio da Virgem Mãe',
      'Coração de Jesus, substancialmente unido ao Verbo de Deus', 'Coração de Jesus, de majestade infinita', 'Coração de Jesus, templo santo de Deus',
      'Coração de Jesus, tabernáculo do Altíssimo', 'Coração de Jesus, casa de Deus e porta do céu', 'Coração de Jesus, fornalha ardente de caridade',
      'Coração de Jesus, receptáculo de justiça e de amor', 'Coração de Jesus, cheio de bondade e de amor',
      'Coração de Jesus, abismo de todas as virtudes', 'Coração de Jesus, digníssimo de todo louvor', 'Coração de Jesus, rei e centro de todos os corações',
      'Coração de Jesus, no qual estão todos os tesouros da sabedoria e da ciência', 'Coração de Jesus, no qual habita toda a plenitude da divindade',
      'Coração de Jesus, no qual o Pai pôs as suas complacências', 'Coração de Jesus, de cuja plenitude todos nós participamos',
      'Coração de Jesus, desejado das colinas eternas', 'Coração de Jesus, paciente e de muita misericórdia', 'Coração de Jesus, rico para todos que vos invocam',
      'Coração de Jesus, fonte de vida e de santidade', 'Coração de Jesus, propiciação por nossos pecados', 'Coração de Jesus, saturado de opróbrios',
      'Coração de Jesus, triturado por causa de nossos crimes', 'Coração de Jesus, feito obediente até a morte',
      'Coração de Jesus, transpassado pela lança', 'Coração de Jesus, fonte de toda consolação', 'Coração de Jesus, nossa vida e ressurreição',
      'Coração de Jesus, nossa paz e reconciliação', 'Coração de Jesus, vítima dos pecadores',
      'Coração de Jesus, salvação dos que em vós esperam', 'Coração de Jesus, esperança dos que morrem em vós', 'Coração de Jesus, delícia de todos os santos'],
      'tende piedade de nós.'),
    ...CORDEIRO_LADAINHA,
    'Jesus, manso e humilde de coração,\n— fazei o nosso coração semelhante ao vosso.',
    'Oremos: Deus onipotente e eterno,\nolhai para o Coração do vosso amantíssimo Filho\ne para os louvores e satisfações que ele, em nome dos pecadores, vos tributa;\n' +
    'e aos que imploram a vossa misericórdia, concedei benigno o perdão,\nem nome do mesmo Jesus Cristo, vosso Filho,\nque convosco vive e reina por todos os séculos dos séculos.\n— Amém.',
  ].join('\n\n') },
  { titulo: 'Ladainha de São Miguel Arcanjo', categoria: 'Ladainhas', texto: [
    ...INICIO_LADAINHA,
    ...deCinco(['Santa Maria, Rainha dos Anjos', 'São Miguel', 'São Miguel, cheio da graça de Deus', 'São Miguel, perfeito adorador do Verbo Divino',
      'São Miguel, coroado de honra e de glória', 'São Miguel, poderosíssimo príncipe dos exércitos do Senhor',
      'São Miguel, porta-estandarte da Santíssima Trindade', 'São Miguel, guardião do Paraíso', 'São Miguel, guia e consolador do povo israelita',
      'São Miguel, esplendor e fortaleza da Igreja militante', 'São Miguel, honra e alegria da Igreja triunfante', 'São Miguel, luz dos anjos',
      'São Miguel, baluarte dos cristãos', 'São Miguel, força daqueles que combatem pelo estandarte da cruz',
      'São Miguel, luz e confiança das almas no último momento da vida', 'São Miguel, socorro muito certo',
      'São Miguel, nosso auxílio em todas as adversidades', 'São Miguel, arauto da sentença eterna',
      'São Miguel, consolador das almas que estão no Purgatório', 'São Miguel, a quem o Senhor incumbiu de receber as almas que estão no Purgatório',
      'São Miguel, nosso príncipe', 'São Miguel, nosso advogado'], 'rogai por nós.'),
    ...CORDEIRO_LADAINHA,
    'Rogai por nós, ó glorioso São Miguel, príncipe da Igreja de Cristo,\n— para que sejamos dignos de suas promessas.',
  ].join('\n\n') },
  // com as invocações acrescentadas pelo Papa Francisco em 2021
  { titulo: 'Ladainha de São José', categoria: 'Ladainhas', texto: [
    ...INICIO_LADAINHA,
    ...deCinco(['Santa Maria', 'São José', 'Ilustre filho de Davi', 'Luz dos Patriarcas', 'Esposo da Mãe de Deus',
      'Guarda do Redentor', 'Casto guarda da Virgem', 'Sustentador do Filho de Deus', 'Zeloso defensor de Cristo', 'Servidor de Cristo',
      'Ministro da salvação', 'Chefe da Sagrada Família', 'José justíssimo', 'José castíssimo', 'José prudentíssimo',
      'José fortíssimo', 'José obedientíssimo', 'José fidelíssimo', 'Espelho de paciência', 'Amante da pobreza',
      'Modelo dos operários', 'Glória da vida doméstica', 'Guarda das virgens', 'Sustentáculo das famílias', 'Apoio nas dificuldades',
      'Consolação dos infelizes', 'Esperança dos enfermos', 'Padroeiro dos exilados', 'Padroeiro dos aflitos', 'Padroeiro dos pobres',
      'Padroeiro dos moribundos', 'Terror dos demônios', 'Protetor da Santa Igreja'], 'rogai por nós.'),
    ...CORDEIRO_LADAINHA,
    'Ele o constituiu senhor de sua casa.\n— E administrador de todos os seus bens.',
    'Oremos: Ó Deus, que por inefável providência\nvos dignastes escolher São José para esposo de vossa Mãe Santíssima,\n' +
    'concedei-nos que, venerando-o como protetor na terra,\nmereçamos tê-lo como intercessor no céu.\nVós que viveis e reinais pelos séculos dos séculos.\n— Amém.',
  ].join('\n\n') },
];

// cada sequência/ladainha é cadastrada uma vez só (se a paróquia apagar, não volta); a lista guarda as já cadastradas
async function semearSequencias() {
  const todas = [...ORACOES_SEQUENCIAS, ...ORACOES_LADAINHAS];
  const feitas = S.config.sequenciasSemeadas;
  const ja = Array.isArray(feitas) ? feitas : feitas ? ORACOES_SEQUENCIAS.slice(0, 2).map(o => o.titulo) : [];
  if (todas.every(o => ja.includes(o.titulo))) return;
  for (const o of todas) {
    if (ja.includes(o.titulo) || Oracoes.lista.some(x => x.titulo === o.titulo)) continue;
    const nova = { id: uid(), ...o, padrao: true };
    await DB.salvar('oracoes', nova);
    Oracoes.lista.push(nova);
  }
  S.config.sequenciasSemeadas = todas.map(o => o.titulo);
  salvarConfig();
}

// 1.6.7: a Ladainha de Nossa Senhora (cadastrada em Marianas na 1.6.3) vai para Ladainhas, junto das outras — uma vez só
async function ladainhaNSParaLadainhas() {
  if (S.config.ladainhaNSMovida) return;
  const o = Oracoes.lista.find(x => x.titulo === 'Ladainha de Nossa Senhora' && x.categoria === 'Marianas');
  if (o) { o.categoria = 'Ladainhas'; await DB.salvar('oracoes', o); }
  S.config.ladainhaNSMovida = true;
  salvarConfig();
}

// No roteiro da Missa do Domingo da Páscoa e de Pentecostes, a Sequência entra antes da Aclamação ao Evangelho
function comSequencia(d, itens) {
  let titulo = '';
  try { titulo = Liturgia.info(d).titulo || ''; } catch (_) {}
  const nome = /^Domingo da Páscoa/.test(titulo) ? 'Sequência Pascal (Cantai, cristãos)'
    : /^Pentecostes/.test(titulo) ? 'Sequência de Pentecostes (Espírito de Deus)'
    : /Corpo e Sangue de Cristo/.test(titulo) ? 'Sequência de Corpus Christi (Terra, exulta de alegria)' : '';
  const o = nome && Oracoes.lista.find(x => x.titulo === nome);
  if (!o || itens.some(i => i.tipo === 'canto' && i.momento === 'Sequência')) return itens;
  let k = itens.findIndex(i => i.tipo === 'canto' && i.momento === 'Aclamação ao Evangelho');
  if (k < 0) k = itens.findIndex(i => i.tipo === 'leitura' && i.evangelho);
  const novo = itens.slice();
  // como o Glória: um item de canto do momento "Sequência" — rezado (o texto da oração) ou um canto escolhido na lista
  novo.splice(k < 0 ? novo.length : k, 0, itemCantoDeOracao('Sequência', o));
  return novo;
}

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
