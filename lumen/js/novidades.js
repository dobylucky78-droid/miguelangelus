'use strict';
/*
 * Novidades: o que mudou em cada versão. Aparece sozinho na primeira vez que o programa abre depois de uma
 * atualização (só as versões que a pessoa ainda não viu) e a qualquer hora em Ajuda → Novidades.
 * A versão mais nova fica em cima. Ao gerar uma versão nova, acrescente a entrada dela aqui.
 */
const NOVIDADES = [
  { versao: '1.5.8', data: '2026-10-07', itens: [
    '📢 Avisos paroquiais: novo item "Avisos" no roteiro, com uma tela própria no telão — o título numa faixa colorida e cada aviso num cartão. Em Ferramentas → 📢 Avisos paroquiais ficam os avisos programados (de quando até quando valem e para qual comunidade): eles entram sozinhos nas Missas do período. Também dá para escrever avisos só de uma Missa e escolher o título, o ícone, as cores e quantos avisos por slide. Os roteiros novos já vêm com o item Avisos antes da bênção final.',
    'Avisos salvos: na aba "Outro aviso" do botão Aviso ficam avisos prontos — já vêm "aniversariantes ao presbitério" e "crianças ao presbitério". Clique para usar (e editar), ▶ para mostrar direto, e 💾 para salvar um aviso novo ou salvar por cima. Também no celular.',
    'Negrito, itálico e sublinhado (N I S) agora aparecem também nas janelas de editar canto e oração (antes só funcionavam pelo Ctrl+B / Ctrl+I / Ctrl+U), e no aviso na tela.',
    'Favoritos só com cifra: a ⭐ só marca cantos que têm cifra (os favoritos são o repertório dos músicos). Favoritos antigos sem cifra aparecem num aviso "⚠ sem cifra" na aba Cantos.',
  ] },
  { versao: '1.5.7', data: '2026-10-07', itens: [
    'Cantos com refrão: nova opção "O canto começa pelo refrão / pela 1ª estrofe" no editor do canto. Começando pela estrofe, o telão mostra estrofe → refrão → estrofe… (antes o refrão vinha sempre primeiro). "Montar a letra a partir da cifra" e "Organizar" já marcam sozinhos, e o app dos músicos segue a mesma ordem.',
    '✝ Temas por tempo litúrgico (Ferramentas): o fundo do telão acompanha a cor litúrgica do roteiro — verde, roxo, branco, vermelho ou rosa. Também pelo quadradinho ✝ ao lado dos temas.',
    'Orações repetidas: as cópias iguais que chegavam de outro computador são juntadas e apagadas também na nuvem (não voltam mais); e ao cadastrar uma oração parecida com uma que já existe, o programa avisa.',
    'Roteiros repetidos: o programa não cria mais um segundo roteiro para a mesma celebração quando a nuvem traz a Agenda de outro computador (ao distribuir o folheto, as celebrações que já têm roteiro aparecem desmarcadas). Os repetidos que já existem podem ser juntados: o programa pergunta ao abrir, ou em Ferramentas → Juntar roteiros repetidos — fica o de cada celebração com mais cantos escolhidos.',
  ] },
  { versao: '1.5.6', data: '2026-10-07', itens: [
    'Coluna da direita (ao vivo + roteiro) cerca de 20% mais larga e prévia do telão menor — sobra mais espaço para o roteiro em monitores pequenos. Arraste a divisória à esquerda da coluna para alargar ou estreitar, e o puxador embaixo da prévia para aumentá-la ou diminuí-la (dois cliques volta ao normal); cada computador lembra os seus tamanhos.',
    'O botão "Tela preta" saiu do painel (continua no menu Projeção e na tecla B); com a tela preta ligada, o rótulo em cima da prévia avisa "TELA PRETA". Assim Limpar, Altar, Aviso e Pix cabem numa linha só.',
    'Ao fechar e sincronizar, uma barra mostra o andamento: o que está sendo enviado e quantos itens faltam.',
    'Letras maiores na tela do operador: Ajustes → Aparência do app → A− / A+ (de 80% a 200%), ou Ctrl e + / Ctrl e − / Ctrl e 0. Vale só neste computador; o telão não muda.',
  ] },
  { versao: '1.5.5', data: '2026-10-07', itens: [
    'Botão 💠 Pix (ou tecla P): o QR code do Pix da paróquia e a faixa com o CNPJ aparecem POR CIMA do que está passando — os slides continuam, menores, embaixo; com a câmera no ar, a faixa vai para o canto superior esquerdo e o QR code para o direito. Também pelo celular.',
    'As imagens do Pix são protegidas por uma senha de 4 números criada pela PASCOM (o programa guarda só uma impressão embaralhada dela). Ficam em Ajustes → 💠 Pix da paróquia e vão para os outros computadores pela nuvem.',
    'Tamanhos do Pix ajustáveis em cada computador (cartão sem câmera; QR code e faixa com câmera).',
  ] },
  { versao: '1.5.4', data: '2026-10-06', itens: [
    'Aclamação ao Evangelho rezada ou cantada, como o Santo: rezada, mostra o refrão e o versículo do folheto; dá para trocar por um canto de aclamação.',
    'App dos músicos: "Meu instrumento" (Si♭, Mi♭ ou Fá) — saxofone, trompete, clarinete e trompa veem as cifras já no tom do instrumento, só no aparelho de quem escolheu.',
    'Novo momento "Aspersão" para os cantos; no item do Ato Penitencial aparecem também os cantos de aspersão.',
    'A atualização automática aceita a versão escrita com um ponto a mais (ex.: "v.1.5.4").',
  ] },
  { versao: '1.5.3', data: '2026-10-06', itens: [
    'Slide de abertura no jeito da capa do folheto: fundo branco, nome da celebração em vermelho, a linha da semana em azul, a edição e a data em cima e a ilustração ao lado (layout "Capa do folheto").',
    'Folhetos de outras dioceses: o MiguelAngelus agora lê folhetos em 2 ou 3 colunas, títulos em MAIÚSCULAS e rótulos como "Pres.:", "Ass.:" e "L1." (testado com a Semana Santa da Arquidiocese de São Paulo, inclusive a Vigília Pascal com as 8 leituras).',
    'Novidades: ao atualizar, o MiguelAngelus mostra o que mudou; o histórico de todas as versões fica em Ajuda → Novidades.',
  ] },
  { versao: '1.5.2', data: '2026-10-06', itens: [
    'Ato Penitencial, Glória e Cordeiro agora podem ser rezados ou cantados, como o Santo (no Ato Penitencial cantado, o convite e a absolvição continuam).',
    'O Cordeiro entra no roteiro mesmo quando o folheto não o traz.',
    'Roteiros que chegam de outro computador também são arrumados (Santo separado).',
    'Joystick: o botão Select troca a câmera controlada, marcada com 🎮 no quadro Câmeras.',
  ] },
  { versao: '1.5.1', data: '2026-10-06', itens: [
    'O NDI Webcam abre sozinho quando há câmera NDI.',
    'Controle de câmera PTZ (mover, zoom, posições prontas) pelo computador, pelo celular e por joystick, usando VISCA sobre IP, como o OBS.',
  ] },
  { versao: '1.5', data: '2026-10-05', itens: [
    'Celular: trocar de roteiro (aba Roteiro → Trocar), com as celebrações por dia e filtro por comunidade.',
    'Cantos favoritos ⭐: a aba Cantos abre nos favoritos (o acervo completo fica para consulta); "só favoritos" na escolha do canto do roteiro.',
    'Cifras 🎸 nos cantos, com tom, autor e CD; "Montar a letra a partir da cifra"; importar e exportar cantos.',
    'App dos músicos: no celular ou tablet, a cifra do canto que está no telão, com a linha cantada destacada e transposição de tom.',
    'Santo separado da Oração Eucarística: rezado (texto do folheto) ou cantado.',
    'Aviso de canto repetido ao cadastrar um canto novo.',
  ] },
  { versao: '1.4', data: '2026-10-05', itens: [
    'Controle pelo celular: passe os slides, tela preta, altar, avisos, mídia e abra/feche o telão pelo celular ou tablet, no Wi-Fi da igreja (Ferramentas → Controle pelo celular).',
    'Salmo em texto corrido e justificado (não quebra a linha a cada verso).',
    'O texto desvia sozinho das imagens dos cantos (brasão, logos, padroeiro).',
    'Manual com o passo a passo do celular e do ícone na tela (Android e iPhone).',
  ] },
  { versao: '1.3.1', data: '2026-10-04', itens: [
    'Espaço entre as falas: a resposta do povo (T.) fica separada da fala do padre (pode desligar em Ajustes → Aparência).',
    'Negrito, itálico e sublinhado: clicar de novo tira, sem acumular marcas.',
    'A tela de abertura mostra que o MiguelAngelus é gratuito.',
  ] },
  { versao: '1.3', data: '2026-10-04', itens: [
    'Primeira versão assinada digitalmente (Open Source Developer Marcio Aurelio Rios Martins).',
    'Atualização automática: as próximas versões chegam sozinhas.',
    'Slides: textos longos cortam no fim das frases e nunca partem referências como (cf. Jo 17,21).',
    'Justificado e centralizado como padrão, 29 fontes, negrito, itálico e sublinhado.',
    'Filtro por capela nos roteiros e botão "Fechar projeção".',
    'Câmera ligada: tema escuro e cantos inferiores escondidos.',
  ] },
];

// "1.5.10" > "1.5.2" (compara número a número)
function compararVersao(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

const dataBR = d => d ? d.split('-').reverse().join('/') : '';

function htmlVersoes(lista, destaque) {
  return lista.map(v => `<section class="nov-versao${destaque ? ' nova' : ''}">
    <h3>Versão ${esc(v.versao)} <span class="sutil pequeno">${dataBR(v.data)}</span></h3>
    <ul>${v.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul></section>`).join('');
}

// desde: a última versão que a pessoa já viu (mostra só o que veio depois, com o resto do histórico recolhido)
function abrirNovidades(desde) {
  const novas = desde ? NOVIDADES.filter(v => compararVersao(v.versao, desde) > 0) : [];
  const resto = desde ? NOVIDADES.filter(v => compararVersao(v.versao, desde) <= 0) : NOVIDADES;
  $('#novTitulo').textContent = novas.length ? `🎉 O MiguelAngelus foi atualizado para a versão ${NOVIDADES[0].versao}` : '📋 Novidades — histórico de versões';
  $('#novCorpo').innerHTML = novas.length
    ? `<p class="sutil">O que mudou desde a versão ${esc(desde)}:</p>${htmlVersoes(novas, true)}
       ${resto.length ? `<details class="nov-hist"><summary>Ver o histórico das versões anteriores</summary>${htmlVersoes(resto)}</details>` : ''}`
    : htmlVersoes(resto);
  abrirDialogo('dlgNovidades');
}

// Ao abrir o programa: se a versão mudou desde a última vez, mostra o que há de novo (uma vez só)
function mostrarNovidadesSeAtualizou() {
  const atual = NOVIDADES[0].versao;
  let vista = S.config.versaoVista;
  // instalações que já existiam antes do histórico: contam como vindas da 1.5.2; instalação nova não mostra nada
  if (!vista) vista = S.cantos.length || S.roteiros.length > 1 ? '1.5.2' : atual;
  const marcarVista = () => { if (S.config.versaoVista !== atual) { S.config.versaoVista = atual; salvarConfig(); } };
  if (compararVersao(atual, vista) <= 0) return marcarVista();
  // só conta como vista quando a pessoa fecha a janela (se o programa recarregar antes, aparece de novo)
  $('#dlgNovidades').addEventListener('close', marcarVista, { once: true });
  setTimeout(() => abrirNovidades(vista), 1200);   // depois da tela de abertura
}
