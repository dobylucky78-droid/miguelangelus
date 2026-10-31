/* Desenho do terço que se preenche, no canto do telão (1.6.15; modelos e contas na 1.7.5).
 * Usado pelo telão (projecao.html) e pela prévia dos Ajustes → 📿 Terço.
 * As contas, na ordem em que se reza: 0 a cruz · 1 Pai-Nosso · 2–4 as três Ave-Marias · 5 Pai-Nosso do 1º mistério ·
 * 6–15 a 1ª dezena · 16 Pai-Nosso do 2º · … · 50–59 a 5ª dezena. feitas = contas já rezadas; atual = a da vez (-1: nenhuma).
 * Contas já rezadas cheias (dourado), a da vez acesa (cor da letra de quem fala), as que faltam vazias.
 */
const TERCO_MODELOS = [
  { id: 'redondo', nome: 'Redondo' },
  { id: 'gota', nome: 'Pendurado' },
  { id: 'coracao', nome: 'Coração' },
  { id: 'fileiras', nome: 'Dezenas em fileiras' },
];
const TERCO_CONTAS = [
  { id: 'lisas', nome: 'Lisas' },
  { id: 'perolas', nome: 'Pérolas' },
  { id: 'rosas', nome: 'Rosas' },
];

// O laço de cada modelo: pt(u), u de 0 a 1, começa e termina embaixo (na medalha, em y = 164) e sobe pela direita
const LACOS_TERCO = {
  redondo: u => { const a = Math.PI / 2 - u * 2 * Math.PI; return [100 + 72 * Math.cos(a), 92 + 72 * Math.sin(a)]; },
  // gota: estreita embaixo, como o terço pendurado na mão
  gota: u => { const a = u * 2 * Math.PI; return [100 + 95 * Math.sin(a) * Math.sin(a / 2), 86 + 78 * Math.cos(a)]; },
  coracao: u => {
    const t = Math.PI - u * 2 * Math.PI;
    const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [100 + 5 * x, 70.5 - 5.5 * y];
  },
};

// Pontos espaçados por igual ao longo do laço (n lugares em volta, deixando o vão da medalha)
function pontosLaco(pt, n, vao) {
  const amostras = 720, acum = [0], pts = [pt(0)];
  for (let k = 1; k <= amostras; k++) {
    const p = pt(k / amostras), q = pts[k - 1];
    pts.push(p); acum.push(acum[k - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  const L = acum[amostras], out = [];
  for (let j = 0; j < n; j++) {
    const s = L * (j + vao) / (n + 2 * vao - 1);
    let k = 1;
    while (k < amostras && acum[k] < s) k++;
    const f = (s - acum[k - 1]) / (acum[k] - acum[k - 1] || 1);
    out.push([pts[k - 1][0] + f * (pts[k][0] - pts[k - 1][0]), pts[k - 1][1] + f * (pts[k][1] - pts[k - 1][1])]);
  }
  return { out, caminho: 'M' + pts.filter((_, k) => k % 6 === 0).map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z' };
}

// opc: { modelo, contas, ouro, vez, linha }
function svgTerco(feitas, atual, opc = {}) {
  const ouro = opc.ouro || '#e2b84a', vez = opc.vez || '#ff5a4f', linha = opc.linha || '#ffffff';
  const modelo = TERCO_MODELOS.some(m => m.id === opc.modelo) ? opc.modelo : 'redondo';
  const estilo = TERCO_CONTAS.some(c => c.id === opc.contas) ? opc.contas : 'lisas';
  const sm = 4.6, gr = 7, fio = `stroke="${linha}" stroke-opacity=".3" stroke-width="1.2" fill="none"`;
  const estado = i => i === atual ? 'vez' : i < feitas ? 'feita' : 'falta';

  let defs = '';
  if (estilo === 'perolas') defs = `<defs>
    <radialGradient id="pO" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff6d2"/><stop offset=".45" stop-color="${ouro}"/><stop offset="1" stop-color="#7a5710"/></radialGradient>
    <radialGradient id="pF" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${linha}" stop-opacity=".75"/><stop offset=".6" stop-color="${linha}" stop-opacity=".22"/><stop offset="1" stop-color="${linha}" stop-opacity=".1"/></radialGradient>
    <radialGradient id="pV" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${vez}"/><stop offset="1" stop-color="${vez}"/></radialGradient></defs>`;

  const brilho = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="${vez}" opacity=".35"/>`;
  const rosa = (x, y, r, petala, miolo, op = 1) => {
    let h = `<g opacity="${op}">`;
    for (let p = 0; p < 5; p++) {
      const a = (p * 72 - 90) * Math.PI / 180;
      h += `<circle cx="${(x + r * .5 * Math.cos(a)).toFixed(1)}" cy="${(y + r * .5 * Math.sin(a)).toFixed(1)}" r="${(r * .58).toFixed(1)}" fill="${petala}"/>`;
    }
    return h + `<circle cx="${x}" cy="${y}" r="${(r * .38).toFixed(1)}" fill="${miolo}"/></g>`;
  };
  const conta = (i, x, y, r) => {
    x = (+x).toFixed(1); y = (+y).toFixed(1);
    const e = estado(i);
    if (estilo === 'perolas') {
      if (e === 'feita') return `<circle cx="${x}" cy="${y}" r="${r + .4}" fill="url(#pO)"/>`;
      if (e === 'vez') return brilho(x, y, r) + `<circle cx="${x}" cy="${y}" r="${r + 1.5}" fill="url(#pV)"/>`;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#pF)"/>`;
    }
    if (estilo === 'rosas') {
      const R = r * 1.3;
      if (e === 'feita') return rosa(+x, +y, R, '#e8607e', ouro);
      if (e === 'vez') return brilho(x, y, R) + rosa(+x, +y, R + 1, vez, '#ffffff');
      return rosa(+x, +y, R, linha, linha, .28);
    }
    if (e === 'feita') return `<circle cx="${x}" cy="${y}" r="${r}" fill="${ouro}" stroke="${ouro}" stroke-width="1"/>`;
    if (e === 'vez') return brilho(x, y, r) + `<circle cx="${x}" cy="${y}" r="${r + 1.5}" fill="${vez}"/>`;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${linha}" stroke-opacity=".6" stroke-width="1.6"/>`;
  };
  const cruz = (x, y, esc = 1) => {
    const e = estado(0), cor = e === 'feita' ? ouro : e === 'vez' ? vez : 'none';
    return `<g transform="translate(${x} ${y}) scale(${esc})"><path d="M-3 -18 h6 v8 h8 v6 h-8 v20 h-6 v-20 h-8 v-6 h8 z" fill="${cor}" stroke="${e === 'vez' ? vez : cor === 'none' ? linha : ouro}" stroke-opacity="${cor === 'none' ? .7 : 1}" stroke-width="1.6"/></g>`;
  };

  let h = defs;
  if (modelo === 'fileiras') {
    // abertura numa fileira em cima (cruz, Pai-Nosso, 3 Ave-Marias); embaixo, cada dezena com o seu Pai-Nosso
    h += `<line x1="34" y1="36" x2="110" y2="36" ${fio}/>` + cruz(34, 38, .8) + conta(1, 62, 36, gr) + conta(2, 82, 36, sm) + conta(3, 96, 36, sm) + conta(4, 110, 36, sm);
    for (let n = 1; n <= 5; n++) {
      const y = 36 + 48 * n, pn = 5 + 11 * (n - 1);
      const daVez = atual >= pn && atual <= pn + 10;
      h += `<text x="14" y="${y + 4.5}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="${daVez ? 700 : 400}" fill="${daVez ? vez : linha}" fill-opacity="${daVez ? 1 : .7}">${n}º</text>`;
      h += `<line x1="34" y1="${y}" x2="176" y2="${y}" ${fio}/>` + conta(pn, 34, y, gr);
      for (let k = 1; k <= 10; k++) h += conta(pn + k, 54 + 13.5 * (k - 1), y, sm);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">${h}</svg>`;
  }

  // em volta: 54 lugares (5 dezenas + 4 Pai-Nossos entre elas), deixando o vão da medalha
  const { out, caminho } = pontosLaco(LACOS_TERCO[modelo], 54, 1.5);
  h += `<path d="${caminho}" ${fio}/><line x1="100" y1="164" x2="100" y2="262" ${fio}/>`;
  // pingente: 0 cruz (embaixo), 1 Pai-Nosso, 2–4 Ave-Marias, 5 Pai-Nosso do 1º mistério; a medalha no encontro
  h += cruz(100, 276) + conta(1, 100, 240, gr) + conta(2, 100, 225, sm) + conta(3, 100, 213, sm) + conta(4, 100, 201, sm) + conta(5, 100, 184, gr);
  const med = feitas >= 6;
  h += modelo === 'coracao'
    ? `<path d="M100 154 l9 11 l-9 11 l-9 -11 z" fill="${med ? ouro : 'none'}" stroke="${med ? ouro : linha}" stroke-opacity=".8" stroke-width="1.6"/>`
    : `<ellipse cx="100" cy="164" rx="8" ry="10" fill="${med ? ouro : 'none'}" stroke="${med ? ouro : linha}" stroke-opacity=".8" stroke-width="1.6"/>`;
  out.forEach(([x, y], j) => { h += conta(6 + j, x, y, (j + 1) % 11 === 0 ? gr : sm); });   // 16, 27, 38, 49: Pai-Nosso entre as dezenas
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">${h}</svg>`;
}
