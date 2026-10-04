'use strict';
/*
 * Atualização automática (só no aplicativo). Ao abrir — nunca durante a projeção — pergunta ao programa se há versão nova
 * nas "Releases" do GitHub. O programa baixa o instalador e SÓ instala se ele tiver a assinatura do MiguelAngelus.
 * Enquanto o programa não for assinado, a verificação fica desligada sozinha.
 * Usa S, NO_APP, arqApp, ligadaSync, conectarArmazem, enviarSync, salvarConfig, abrirDialogo, toast, esc, $ (em tempo de execução).
 */

const Atual = { info: null };

async function verificarAtualizacao({ silencioso = true } = {}) {
  if (!NO_APP) { if (!silencioso) alert('A atualização automática funciona só no aplicativo MiguelAngelus para Windows.'); return; }
  if (silencioso && S.config.atualizarAuto === false) return;
  escutarRespostasSync();
  let r;
  try { r = await arqApp('atualizacaoVerificar', {}, 20000); }
  catch (e) { if (!silencioso) alert('Não consegui procurar atualizações agora (sem internet?).\n' + e.message); return; }
  if (!r.ligada) { if (!silencioso) alert(`Você está na versão ${r.atual}.\n\nA atualização automática começa a funcionar a partir da primeira versão assinada digitalmente.`); return; }
  if (!r.nova) { if (!silencioso) toast(`Você já está na versão mais nova (${r.atual}).`); return; }
  if (silencioso && S.config.versaoIgnorada === r.nova) return;
  Atual.info = r;
  $('#atuTitulo').textContent = `MiguelAngelus ${r.nova} disponível`;
  $('#atuVersoes').textContent = `Você tem a versão ${r.atual}. Tamanho do download: ${fmtTamanho(r.tamanho || 0)}.`;
  $('#atuNotas').textContent = (r.notas || '').trim() || 'Melhorias e correções.';
  $('#atuStatus').textContent = '';
  $('#dlgAtualizacao').querySelectorAll('button').forEach(b => { b.disabled = false; });
  abrirDialogo('dlgAtualizacao');
}

async function instalarAtualizacao() {
  const r = Atual.info, dlg = $('#dlgAtualizacao');
  if (!r) return;
  dlg.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const st = $('#atuStatus');
  try {
    // antes de fechar para atualizar, manda para a nuvem o que mudou aqui
    if (ligadaSync()) { st.textContent = '☁ Enviando as mudanças para a nuvem…'; try { await conectarArmazem(); await enviarSync(); Sync.sujo = false; } catch (_) {} }
    st.textContent = 'Baixando…';
    Sync.progressoMidia = (f, t) => { st.textContent = `Baixando… ${Math.round(f / Math.max(1, t) * 100)}% (${fmtTamanho(f)} de ${fmtTamanho(t)})`; };
    const res = await arqApp('atualizacaoInstalar', { url: r.url }, 60 * 60 * 1000);
    st.textContent = res.teste ? '✔ Teste: instalador baixado e assinatura conferida (nada foi instalado).'
      : '✔ Assinatura conferida. Instalando — o MiguelAngelus vai fechar e abrir de novo sozinho…';
    if (res.teste) dlg.querySelectorAll('button').forEach(b => { b.disabled = false; });
  } catch (e) {
    st.textContent = '⚠ ' + e.message;
    dlg.querySelectorAll('button').forEach(b => { b.disabled = false; });
  } finally { Sync.progressoMidia = null; }
}

function ligarAtualizacao() {
  $('#btnAtuAgora').addEventListener('click', instalarAtualizacao);
  $('#btnAtuDepois').addEventListener('click', () => $('#dlgAtualizacao').close());
  $('#btnAtuPular').addEventListener('click', () => {
    if (Atual.info) { S.config.versaoIgnorada = Atual.info.nova; salvarConfig(); toast(`Não vou mais avisar da versão ${Atual.info.nova}. Ajuda → Procurar atualizações instala quando quiser.`); }
    $('#dlgAtualizacao').close();
  });
  // procura alguns segundos depois de abrir (sem atrasar a abertura nem a projeção)
  setTimeout(() => verificarAtualizacao({ silencioso: true }), 4000);
}
