'use strict';
/* Armazenamento local (IndexedDB). Tudo fica guardado no próprio navegador. */

const DB = (() => {
  // v2: + 'midias' (vídeos e áudios, guardados como arquivo dentro do navegador)
  // v3: + 'oracoes'
  const NOME = 'lumen', VERSAO = 3;
  const STORES = ['biblias', 'cantos', 'roteiros', 'config', 'midias', 'oracoes'];
  let conexao;

  // Se o banco não responder (já aconteceu logo depois de o Windows atualizar o WebView2), não fica
  // esperando para sempre: avisa com o erro 'banco-lento', e quem abriu decide recarregar.
  function abrir() {
    if (!conexao) conexao = new Promise((ok, falha) => {
      const req = indexedDB.open(NOME, VERSAO);
      const relogio = setTimeout(() => { conexao = null; falha(Object.assign(new Error('O banco de dados não respondeu.'), { codigo: 'banco-lento' })); }, 8000);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      };
      req.onsuccess = () => { clearTimeout(relogio); ok(req.result); };
      req.onerror = () => { clearTimeout(relogio); conexao = null; falha(req.error); };
    });
    return conexao;
  }

  async function tx(store, modo, fn) {
    const db = await abrir();
    return new Promise((ok, falha) => {
      const t = db.transaction(store, modo);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => ok(req && req.result);
      t.onerror = () => falha(t.error);
      t.onabort = () => falha(t.error);
    });
  }

  // O que vai para a nuvem ganha a data da última mudança ("atualizado"); a sincronização usa isso para saber o mais novo.
  // { daNuvem: true } = gravação vinda da própria sincronização (não carimba nem marca como pendente).
  const carimbar = (store, obj) => ['roteiros', 'cantos', 'oracoes', 'biblias'].includes(store)
    || (store === 'midias' && obj?.tipo === 'apresentacao')
    || (store === 'config' && (obj?.id === 'agenda' || obj?.id === 'eucaristia'));

  const api = {
    todos: store => tx(store, 'readonly', s => s.getAll()),
    obter: (store, id) => tx(store, 'readonly', s => s.get(id)),
    salvar: async (store, obj, opc = {}) => {
      if (!opc.daNuvem && carimbar(store, obj)) obj.atualizado = Date.now();
      const r = await tx(store, 'readwrite', s => s.put(obj));
      if (!opc.daNuvem && carimbar(store, obj)) api.aoMudar?.(store, obj);
      return r;
    },
    remover: async (store, id, opc = {}) => {
      if (!opc.daNuvem) api.aoRemover?.(store, id);
      return tx(store, 'readwrite', s => s.delete(id));
    },
    carimbar,
    aoMudar: null, aoRemover: null,   // ganchos da sincronização
  };
  return api;
})();
