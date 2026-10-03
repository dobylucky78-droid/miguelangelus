'use strict';
/*
 * Calendário litúrgico (rito romano, regras do Brasil):
 * tempo litúrgico, semana, cor do tempo e ciclos (A/B/C e I/II).
 * Ainda NÃO considera memórias/festas de santos — só o tempo e as grandes solenidades móveis.
 */

const Liturgia = (() => {
  const d0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const soma = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dif = (a, b) => Math.round((d0(a) - d0(b)) / 864e5);
  const mesmo = (a, b) => dif(a, b) === 0;
  const domingoAntes = d => soma(d, -d.getDay());

  // Algoritmo de Meeus/Jones/Butcher (calendário gregoriano)
  function pascoa(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mes - 1, dia);
  }

  function advento1(y) {
    const natal = new Date(y, 11, 25);
    return soma(natal, -(natal.getDay() || 7) - 21);
  }
  // No Brasil a Epifania é no domingo entre 2 e 8 de janeiro
  function epifania(y) {
    const d = new Date(y, 0, 2);
    return soma(d, (7 - d.getDay()) % 7);
  }
  // Se a Epifania cai em 7 ou 8/jan, o Batismo passa para a segunda-feira seguinte
  function batismo(y) {
    const e = epifania(y);
    return e.getDate() >= 7 ? soma(e, 1) : soma(e, 7);
  }
  function sagradaFamilia(y) {
    const natal = new Date(y, 11, 25);
    return natal.getDay() === 0 ? new Date(y, 11, 30) : soma(natal, 7 - natal.getDay());
  }

  const CORES = { verde: '#2e7d32', roxo: '#6a1b9a', branco: '#f2f2f2', vermelho: '#c62828', rosa: '#e0609a' };

  // Solenidades e festas principais (regras do Brasil). Os domingos dos tempos fortes e a Semana Santa prevalecem.
  // Aproximação: não cobre todas as memórias e as transferências raras — para isso existe a cor escolhida no roteiro.
  function festa(d, base) {
    const y = d.getFullYear(), m = d.getMonth() + 1, dia = d.getDate(), dom = d.getDay() === 0, E = pascoa(y);
    if (base.tempo === 'Tríduo Pascal' || /Semana Santa|Ramos|^Domingo da Páscoa$|Pentecostes|Ascensão|Natal do Senhor/.test(base.titulo)) return null;
    const tempoForte = dom && ['Advento', 'Quaresma', 'Páscoa'].includes(base.tempo);
    const domingoEntre = (mes, d1, d2) => dom && m === mes && dia >= d1 && dia <= d2;
    const lista = [
      [mesmo(d, soma(E, 68)), 'Sagrado Coração de Jesus', 'branco'],
      [m === 2 && dia === 2, 'Apresentação do Senhor', 'branco'],
      [m === 3 && dia === 19 && !tempoForte, 'São José, Esposo da Virgem Maria', 'branco'],
      [m === 3 && dia === 25 && !tempoForte, 'Anunciação do Senhor', 'branco'],
      [m === 6 && dia === 24, 'Natividade de São João Batista', 'branco'],
      [domingoEntre(6, 29, 30) || domingoEntre(7, 1, 5), 'São Pedro e São Paulo, Apóstolos', 'vermelho'],
      [m === 8 && dia === 6, 'Transfiguração do Senhor', 'branco'],
      [domingoEntre(8, 15, 21), 'Assunção de Nossa Senhora', 'branco'],
      [m === 9 && dia === 14, 'Exaltação da Santa Cruz', 'vermelho'],
      [m === 10 && dia === 12, 'Nossa Senhora da Conceição Aparecida', 'branco'],
      [m === 11 && dia === 2, 'Comemoração de Todos os Fiéis Defuntos', 'roxo'],
      [domingoEntre(11, 1, 7), 'Todos os Santos', 'branco'],
      [m === 11 && dia === 9, 'Dedicação da Basílica do Latrão', 'branco'],
      [(m === 12 && dia === 8 && !tempoForte) || (m === 12 && dia === 9 && d.getDay() === 1), 'Imaculada Conceição de Nossa Senhora', 'branco'],
    ];
    const f = lista.find(x => x[0]);
    return f ? { titulo: f[1], cor: f[2] } : null;
  }

  function info(data = new Date()) {
    const r = infoTempo(data);
    const f = festa(r.data, r);
    if (f) Object.assign(r, { titulo: f.titulo, cor: f.cor, corHex: CORES[f.cor], festa: true });
    return r;
  }

  function infoTempo(data = new Date()) {
    const d = d0(data), y = d.getFullYear(), dom = d.getDay() === 0;
    const adv = advento1(y), E = pascoa(y);
    const anoLit = d >= adv ? y + 1 : y;
    const r = { data: d, ciclo: ['C', 'A', 'B'][anoLit % 3], ferial: anoLit % 2 ? 'I' : 'II' };
    const def = (tempo, titulo, cor) => Object.assign(r, { tempo, titulo, cor, corHex: CORES[cor] });
    const semana = inicio => Math.floor(dif(domingoAntes(d), inicio) / 7) + 1;
    const rotulo = (n, doTempo) => dom ? `${n}º Domingo ${doTempo}` : `${n}ª Semana ${doTempo}`;
    const natal = new Date(y, 11, 25);

    if (mesmo(d, natal)) return def('Natal', 'Natal do Senhor', 'branco');
    if (d >= adv && d < natal) {
      const n = semana(adv);
      return def('Advento', rotulo(n, 'do Advento'), dom && n === 3 ? 'rosa' : 'roxo');
    }
    if (d > natal) return def('Natal', mesmo(d, sagradaFamilia(y)) ? 'Sagrada Família' : 'Tempo do Natal', 'branco');

    const bat = batismo(y);
    if (d <= bat) {
      let t = 'Tempo do Natal';
      if (d.getMonth() === 0 && d.getDate() === 1) t = 'Santa Maria, Mãe de Deus';
      else if (mesmo(d, epifania(y))) t = 'Epifania do Senhor';
      else if (mesmo(d, bat)) t = 'Batismo do Senhor';
      return def('Natal', t, 'branco');
    }

    const cinzas = soma(E, -46);
    if (d < cinzas) return def('Comum', rotulo(semana(domingoAntes(bat)), 'do Tempo Comum'), 'verde');

    if (d < soma(E, -3)) {
      if (mesmo(d, cinzas)) return def('Quaresma', 'Quarta-feira de Cinzas', 'roxo');
      if (d < soma(E, -42)) return def('Quaresma', 'Depois das Cinzas', 'roxo');
      if (mesmo(d, soma(E, -7))) return def('Quaresma', 'Domingo de Ramos e da Paixão', 'vermelho');
      if (d > soma(E, -7)) return def('Quaresma', 'Semana Santa', 'roxo');
      const n = semana(soma(E, -42));
      return def('Quaresma', rotulo(n, 'da Quaresma'), dom && n === 4 ? 'rosa' : 'roxo');
    }

    if (d < E) {
      const k = dif(E, d);
      const t = ['', 'Sábado Santo — Vigília Pascal', 'Sexta-feira da Paixão', 'Quinta-feira Santa — Ceia do Senhor'][k];
      return def('Tríduo Pascal', t, k === 2 ? 'vermelho' : 'branco');
    }

    if (d <= soma(E, 49)) {
      if (mesmo(d, E)) return def('Páscoa', 'Domingo da Páscoa', 'branco');
      if (mesmo(d, soma(E, 42))) return def('Páscoa', 'Ascensão do Senhor', 'branco');
      if (mesmo(d, soma(E, 49))) return def('Páscoa', 'Pentecostes', 'vermelho');
      return def('Páscoa', rotulo(semana(E), 'da Páscoa'), 'branco');
    }

    const rei = soma(adv, -7);
    if (mesmo(d, soma(E, 56))) return def('Comum', 'Santíssima Trindade', 'branco');
    if (mesmo(d, soma(E, 60))) return def('Comum', 'Corpo e Sangue de Cristo', 'branco');
    if (mesmo(d, rei)) return def('Comum', 'Cristo Rei do Universo', 'branco');
    const n = 34 - Math.round(dif(rei, domingoAntes(d)) / 7);
    return def('Comum', rotulo(n, 'do Tempo Comum'), 'verde');
  }

  return { info, pascoa, CORES };
})();
