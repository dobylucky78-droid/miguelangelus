// MiguelAngelus para Windows.
// Janela principal (operador) + janela de projeção, as duas com o WebView2 carregando a pasta "web"
// por um endereço próprio (https://miguelyrics.example/ — nome antigo, mantido por causa dos dados),
// sem servidor e sem internet.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace MiguelAngelus
{
    static class Program
    {
        // Endereço interno das páginas. NÃO mudar: os dados (IndexedDB) ficam guardados por endereço,
        // e este é o do tempo em que o programa se chamava Miguelyrics.
        internal const string Host = "miguelyrics.example";
        internal static readonly string PastaWeb = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web");

        // Pastas de vídeos e áudios escolhidas neste computador, servidas em endereços próprios
        // (https://videos.miguelangelus.example/Sub/arquivo.mp4) para o operador e para o telão
        internal const string HostVideos = "videos.miguelangelus.example", HostAudios = "audios.miguelangelus.example";
        internal static readonly System.Collections.Generic.Dictionary<string, string> PastasMidia = new System.Collections.Generic.Dictionary<string, string>();
        internal static readonly System.Collections.Generic.List<JanelaWeb> Janelas = new System.Collections.Generic.List<JanelaWeb>();

        // O endereço só vale para páginas carregadas DEPOIS do mapeamento: por isso as pastas ficam gravadas
        // e são mapeadas antes de abrir a página; pasta nova → a página recarrega (devolve true).
        static string ArqPastasMidia => Path.Combine(PastaDados, "pastas-midia.txt");
        static bool pastasLidas;

        internal static void CarregarPastasMidia()
        {
            if (pastasLidas) return;
            pastasLidas = true;
            try
            {
                if (File.Exists(ArqPastasMidia))
                    foreach (var l in File.ReadAllLines(ArqPastasMidia, System.Text.Encoding.UTF8))
                    {
                        var p = l.Split('\t');
                        if (p.Length == 2 && (p[0] == HostVideos || p[0] == HostAudios)) PastasMidia[p[0]] = p[1];
                    }
            }
            catch { }
        }

        internal static bool MapearMidia(string host, string pasta)
        {
            CarregarPastasMidia();
            if (PastasMidia.TryGetValue(host, out var atual) && string.Equals(atual, pasta, StringComparison.OrdinalIgnoreCase)) return false;
            PastasMidia[host] = pasta;
            try
            {
                Directory.CreateDirectory(PastaDados);
                File.WriteAllLines(ArqPastasMidia, PastasMidia.Select(kv => kv.Key + "\t" + kv.Value), System.Text.Encoding.UTF8);
            }
            catch { }
            foreach (var j in Janelas) j.AplicarPastasMidia();
            return true;
        }
        // Os dados (cantos, roteiros, Agenda…) ficam aqui, separados do Chrome
        internal static string PastaDados = EscolherPastaDados();

        // Até a versão 1.0 a pasta se chamava "Miguelyrics". Na primeira vez, ela só é renomeada
        // (mesmo disco: instantâneo, nada é copiado nem apagado). Se não der, continua usando a antiga.
        static string EscolherPastaDados()
        {
            // para testes: MIGUELANGELUS_DADOS aponta para outra pasta (não mexe nos dados de verdade)
            var teste = Environment.GetEnvironmentVariable("MIGUELANGELUS_DADOS");
            if (!string.IsNullOrEmpty(teste)) return teste;
            var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var nova = Path.Combine(local, "MiguelAngelus");
            var antiga = Path.Combine(local, "Miguelyrics");
            if (Directory.Exists(nova) || !Directory.Exists(antiga)) return nova;
            try { Directory.Move(antiga, nova); return nova; }
            catch { return antiga; }   // em uso (outra janela aberta?) ou sem permissão: fica como estava
        }
        internal static CoreWebView2Environment Ambiente;
        internal static Icon Icone;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try { Icone = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            if (!File.Exists(Path.Combine(PastaWeb, "index.html")))
            {
                MessageBox.Show("Não encontrei a pasta \"web\" ao lado do MiguelAngelus.exe.\nDescompacte o programa inteiro (todas as pastas) antes de abrir.",
                    "MiguelAngelus", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            Application.Run(new JanelaPrincipal());
        }

        internal static async Task<bool> PrepararAmbiente()
        {
            if (Ambiente != null) return true;
            try
            {
                Directory.CreateDirectory(PastaDados);
                // vídeo com som sem precisar clicar antes na janela de projeção
                var args = "--autoplay-policy=no-user-gesture-required";
                // para testes: MIGUELANGELUS_DEPURAR=9334 liga a porta de depuração
                var porta = Environment.GetEnvironmentVariable("MIGUELANGELUS_DEPURAR");
                if (!string.IsNullOrEmpty(porta)) args += " --remote-debugging-port=" + porta;
                var opcoes = new CoreWebView2EnvironmentOptions(args);
                Ambiente = await CoreWebView2Environment.CreateAsync(null, Path.Combine(PastaDados, "WebView2"), opcoes);
                return true;
            }
            catch (WebView2RuntimeNotFoundException)
            {
                if (MessageBox.Show("Este computador não tem o \"Microsoft Edge WebView2\", que o MiguelAngelus usa para funcionar.\n\n" +
                        "Quer abrir a página da Microsoft para instalar? (É gratuito e rápido.)",
                        "MiguelAngelus", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) == DialogResult.Yes)
                    AbrirNoNavegador("https://go.microsoft.com/fwlink/p/?LinkId=2124703");
                return false;
            }
            catch (Exception ex)
            {
                Erro("abrir o motor do WebView2", ex);
                return false;
            }
        }

        internal static void Erro(string acao, Exception ex)
        {
            try { File.AppendAllText(Path.Combine(PastaDados, "erros.txt"), $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} — {acao}: {ex}\r\n\r\n"); } catch { }
            MessageBox.Show($"Não foi possível {acao}.\n\n{ex.Message}", "MiguelAngelus", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }

        internal static void AbrirNoNavegador(string url)
        {
            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
        }
    }

    // Base das duas janelas: WebView2, tela cheia e links externos
    class JanelaWeb : Form
    {
        internal readonly WebView2 Web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.Black };
        FormBorderStyle bordaAntes;
        FormWindowState estadoAntes;
        Rectangle limitesAntes;
        bool telaCheia;

        public JanelaWeb()
        {
            BackColor = Color.Black;
            if (Program.Icone != null) Icon = Program.Icone;
            Controls.Add(Web);
        }

        // Chamado depois de EnsureCoreWebView2Async
        internal void Configurar()
        {
            var c = Web.CoreWebView2;
            c.SetVirtualHostNameToFolderMapping(Program.Host, Program.PastaWeb, CoreWebView2HostResourceAccessKind.Allow);
            Program.Janelas.Add(this);
            FormClosed += (s, e) => Program.Janelas.Remove(this);
            AplicarPastasMidia();
            c.Settings.IsStatusBarEnabled = false;
            c.Settings.IsZoomControlEnabled = false;
            c.DocumentTitleChanged += (s, e) => Text = c.DocumentTitle;
            c.ContainsFullScreenElementChanged += (s, e) => DefinirTelaCheia(c.ContainsFullScreenElement);
            c.WindowCloseRequested += (s, e) => Close();
            c.NewWindowRequested += AoPedirJanela;
            // Câmera (NDI Webcam ou webcam comum) para mostrar no telão: liberada só para as páginas do próprio app
            c.PermissionRequested += (s, e) =>
            {
                if (Uri.TryCreate(e.Uri, UriKind.Absolute, out var u) && u.Host == Program.Host &&
                    (e.PermissionKind == CoreWebView2PermissionKind.Camera || e.PermissionKind == CoreWebView2PermissionKind.Microphone))
                    e.State = CoreWebView2PermissionState.Allow;
            };
            // Link para fora do app (Paulus, arqrio, Google…) abre no navegador, não dentro do MiguelAngelus
            c.NavigationStarting += (s, e) =>
            {
                if (Uri.TryCreate(e.Uri, UriKind.Absolute, out var u) && (u.Scheme == "http" || u.Scheme == "https") && u.Host != Program.Host)
                {
                    e.Cancel = true;
                    Program.AbrirNoNavegador(e.Uri);
                }
            };
            // F11 = tela cheia (no navegador era o próprio Chrome que fazia)
            _ = c.AddScriptToExecuteOnDocumentCreatedAsync(
                "document.addEventListener('keydown', e => { if (e.key === 'F11') { e.preventDefault();" +
                " document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); } });");
        }

        internal void AplicarPastasMidia()
        {
            var c = Web.CoreWebView2;
            if (c == null) return;
            Program.CarregarPastasMidia();
            foreach (var kv in Program.PastasMidia)
            {
                try { c.ClearVirtualHostNameToFolderMapping(kv.Key); } catch { }
                try { c.SetVirtualHostNameToFolderMapping(kv.Key, kv.Value, CoreWebView2HostResourceAccessKind.Allow); }
                catch { }   // pasta fora do ar (disco/Google Drive desconectado): a página avisa ao listar
            }
        }

        async void AoPedirJanela(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var u) || u.Host != Program.Host)
            {
                e.Handled = true;
                Program.AbrirNoNavegador(e.Uri);
                return;
            }
            // janela do próprio app (a projeção): cria a janela e entrega o WebView2 dela para a página
            var adiamento = e.GetDeferral();
            try
            {
                var j = new JanelaProjecao(this);
                j.Show();
                await j.Web.EnsureCoreWebView2Async(Program.Ambiente);
                j.Configurar();
                e.NewWindow = j.Web.CoreWebView2;
                e.Handled = true;
            }
            catch (Exception ex) { Program.Erro("abrir a janela de projeção", ex); }
            finally { adiamento.Complete(); }
        }

        internal void DefinirTelaCheia(bool ligar)
        {
            if (ligar == telaCheia) return;
            telaCheia = ligar;
            if (ligar)
            {
                bordaAntes = FormBorderStyle; estadoAntes = WindowState; limitesAntes = Bounds;
                var tela = Screen.FromControl(this);
                FormBorderStyle = FormBorderStyle.None;
                WindowState = FormWindowState.Normal;
                Bounds = tela.Bounds;
            }
            else
            {
                FormBorderStyle = bordaAntes;
                Bounds = limitesAntes;
                WindowState = estadoAntes;
            }
        }
    }

    class JanelaPrincipal : JanelaWeb
    {
        EnvioNdi ndi;
        string erroNdi;
        readonly Timer relogioNdi = new Timer { Interval = 2000 };
        // MaxJsonLength: Bíblias e o acervo de cantos passam de 2 MB
        readonly System.Web.Script.Serialization.JavaScriptSerializer json = new System.Web.Script.Serialization.JavaScriptSerializer { MaxJsonLength = int.MaxValue };

        public JanelaPrincipal()
        {
            Text = "MiguelAngelus";
            WindowState = FormWindowState.Maximized;
            MinimumSize = new Size(900, 560);
            Load += async (s, e) =>
            {
                try
                {
                    if (!await Program.PrepararAmbiente()) { Close(); return; }
                    await Web.EnsureCoreWebView2Async(Program.Ambiente);
                    Configurar();
                    Web.CoreWebView2.WebMessageReceived += AoReceberMensagem;
                    Web.CoreWebView2.Navigate($"https://{Program.Host}/index.html");
                }
                catch (Exception ex) { Program.Erro("iniciar o MiguelAngelus", ex); Close(); }
            };
            relogioNdi.Tick += (s, e) => InformarNdi();
            FormClosed += (s, e) => { relogioNdi.Stop(); ndi?.Dispose(); };
        }

        // Mensagens da página: {tipo:'ndi', ligar, nome} e {tipo:'faixa', linhas, negrito, fonte, tamanho, opacidade, corTexto}
        void AoReceberMensagem(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var m = json.Deserialize<System.Collections.Generic.Dictionary<string, object>>(e.WebMessageAsJson);
                var tipo = m.TryGetValue("tipo", out var t) ? t as string : null;
                if (tipo == "ndi") LigarNdi(m.TryGetValue("ligar", out var l) && l is bool b && b, m.TryGetValue("nome", out var n) ? n as string : null);
                else if (tipo == "faixa") ndi?.Desenhar(LerFaixa(m));
                else if (tipo == "http") _ = Http(m);
                else if (tipo == "arquivo") Arquivo(m);
                else if (tipo == "abrirManual")
                {
                    var manual = Path.Combine(Program.PastaWeb, "Manual do MiguelAngelus.html");
                    if (File.Exists(manual)) Program.AbrirNoNavegador(manual);
                    else MessageBox.Show(this, "O manual não foi encontrado na pasta do programa.", "MiguelAngelus");
                }
                else if (tipo == "podeFechar") { relogioFechar?.Stop(); podeFechar = true; BeginInvoke(new Action(Close)); }
                // a página abriu a confirmação de fechar: a trava passa a 15 min (a pessoa está decidindo ou enviando)
                else if (tipo == "segurarFechar") { relogioFechar?.Stop(); relogioFechar = new Timer { Interval = 15 * 60 * 1000 }; relogioFechar.Tick += (s2, e2) => { relogioFechar.Stop(); podeFechar = true; Close(); }; relogioFechar.Start(); }
                else if (tipo == "cancelarFechar") { relogioFechar?.Stop(); avisouFechamento = false; }
            }
            catch (Exception ex) { erroNdi = ex.Message; InformarNdi(); }
        }

        // ---------- Pasta de sincronização (Google Drive para computador, OneDrive…) ----------
        // A página só lê/grava DENTRO da pasta escolhida (raiz). Respostas: {tipo:'arquivoResposta', id, ok, …}
        string raizSync;
        bool podeFechar, avisouFechamento;
        Timer relogioFechar;

        string Caminho(object rel)
        {
            if (string.IsNullOrEmpty(raizSync)) throw new InvalidOperationException("pasta de sincronização não definida");
            var raiz = Path.GetFullPath(raizSync).TrimEnd('\\') + "\\";
            var p = Path.GetFullPath(Path.Combine(raiz, (Convert.ToString(rel) ?? "").Replace('/', '\\')));
            if (!p.StartsWith(raiz, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("caminho fora da pasta de sincronização");
            return p;
        }

        static long Mtime(string p) => (long)(File.GetLastWriteTimeUtc(p) - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;

        static void GravarSeguro(string p, byte[] dados)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(p));
            var tmp = p + ".tmp-mgl";
            File.WriteAllBytes(tmp, dados);
            if (File.Exists(p)) File.Replace(tmp, p, null); else File.Move(tmp, p);
        }

        string modoSync = "pasta";      // "pasta" (Google Drive para computador, OneDrive…) ou "google" (API do Drive)
        GoogleDrive google;
        GoogleDrive Google => google ?? (google = new GoogleDrive(cliente));

        async void Arquivo(System.Collections.Generic.Dictionary<string, object> m)
        {
            var id = m.TryGetValue("id", out var i) ? Convert.ToString(i) : "";
            var acao = m.TryGetValue("acao", out var a) ? a as string : "";
            object r;
            try
            {
                // ----- conta do Google (login dentro do app) -----
                switch (acao)
                {
                    case "googleCarregarCliente":
                        using (var d = new OpenFileDialog { Title = "Arquivo JSON do ID do cliente (Google Cloud → Clientes → Fazer download do JSON)", Filter = "Arquivo do Google (*.json)|*.json" })
                        {
                            if (d.ShowDialog(this) != DialogResult.OK) { Responder(id, new { ok = false, erro = "cancelado" }); return; }
                            Google.DefinirCliente(File.ReadAllText(d.FileName));
                        }
                        Responder(id, new { ok = true, temCliente = Google.TemCliente, conectado = Google.Conectado }); return;
                    case "googleConectar":
                        await Google.Conectar();
                        Activate();
                        Responder(id, new { ok = true, email = await Google.Email() }); return;
                    case "googleStatus":
                        string email = null;
                        if (Google.Conectado) try { email = await Google.Email(); } catch { }
                        Responder(id, new { ok = true, temCliente = Google.TemCliente, conectado = Google.Conectado, email }); return;
                    case "googleDesconectar":
                        Google.Desconectar();
                        Responder(id, new { ok = true }); return;
                    // ----- pastas de vídeos e áudios (independe da sincronização) -----
                    case "midiaEscolherPasta":
                        var deVideo = Convert.ToString(m["tipoMidia"]) != "audio";
                        using (var d = new FolderBrowserDialog { Description = deVideo ? "Pasta dos vídeos neste computador (as subpastas viram pastas no MiguelAngelus)" : "Pasta dos áudios neste computador (as subpastas viram pastas no MiguelAngelus)", ShowNewFolderButton = false })
                            Responder(id, new { ok = true, pasta = d.ShowDialog(this) == DialogResult.OK ? d.SelectedPath : null });
                        return;
                    // ----- atualização automática (Atualizacao.cs) -----
                    case "atualizacaoVerificar":
                        Responder(id, await Atualizacao.Verificar()); return;
                    case "atualizacaoInstalar":
                    {
                        var baixado = await Atualizacao.BaixarEConferir(Convert.ToString(m["url"]), (f, t) => Progresso(id, f, t));
                        Responder(id, new { ok = true, teste = Atualizacao.Teste });
                        if (!Atualizacao.Teste)
                        {
                            Atualizacao.Instalar(baixado);     // o instalador espera o programa fechar e reabre no fim
                            podeFechar = true;
                            var t = new Timer { Interval = 800 };
                            t.Tick += (s2, e2) => { t.Stop(); Close(); };
                            t.Start();
                        }
                        return;
                    }
                    case "midiaSugerir":   // pasta padrão do Holyrics (X:\Holyrics\Holyrics\files\media\video|audio), se existir
                        var sub = Convert.ToString(m["tipoMidia"]) == "audio" ? "audio" : "video";
                        string achada = null;
                        foreach (var u in DriveInfo.GetDrives())
                        {
                            try
                            {
                                if (!u.IsReady || (u.DriveType != DriveType.Fixed && u.DriveType != DriveType.Removable)) continue;
                                var cand = Path.Combine(u.RootDirectory.FullName, "Holyrics", "Holyrics", "files", "media", sub);
                                if (Directory.Exists(cand)) { achada = cand; break; }
                            }
                            catch { }
                        }
                        Responder(id, new { ok = true, pasta = achada }); return;
                    case "midiaSubir":     // arquivo da pasta de vídeos/áudios → nuvem (em pedaços, com progresso)
                    {
                        var origem = CaminhoMidia(m);
                        var destino = Convert.ToString(m["destino"]);
                        const int PEDACO = 4 * 1024 * 1024;
                        using (var fs = new FileStream(origem, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                        {
                            long total = fs.Length, ini = 0;
                            var buf = new byte[PEDACO];
                            do
                            {
                                int n = 0, lido;
                                while (n < PEDACO && (lido = await fs.ReadAsync(buf, n, PEDACO - n)) > 0) n += lido;
                                var pedaco = new byte[n]; Array.Copy(buf, pedaco, n);
                                var fim = ini + n >= total;
                                await GravarPedacoNuvem(destino, ini, pedaco, fim);
                                ini += n;
                                Progresso(id, ini, total);
                                if (fim) break;
                            } while (true);
                        }
                        Responder(id, new { ok = true }); return;
                    }
                    case "midiaBaixar":    // nuvem → mesma subpasta na pasta de vídeos/áudios deste computador
                    {
                        var alvoLocal = CaminhoMidia(m);
                        var origemNuvem = Convert.ToString(m["origem"]);
                        Directory.CreateDirectory(Path.GetDirectoryName(alvoLocal));
                        var parcial = alvoLocal + ".parcial";
                        const int PEDACO = 4 * 1024 * 1024;
                        using (var fs = new FileStream(parcial, FileMode.Create, FileAccess.Write))
                        {
                            long ini = 0, total = 1;
                            while (ini < total)
                            {
                                var bytes = LerPedacoNuvem(origemNuvem, ini, PEDACO, out total, modoSync == "google" ? await Google.LerBinario(origemNuvem, ini, PEDACO) : null);
                                if (bytes.Length == 0) break;
                                await fs.WriteAsync(bytes, 0, bytes.Length);
                                ini += bytes.Length;
                                Progresso(id, ini, total);
                            }
                        }
                        if (File.Exists(alvoLocal)) File.Delete(alvoLocal);
                        File.Move(parcial, alvoLocal);
                        Responder(id, new { ok = true }); return;
                    }
                    case "midiaPasta":
                        var audio = Convert.ToString(m["tipoMidia"]) == "audio";
                        var pastaMidia = Convert.ToString(m["pasta"]);
                        if (string.IsNullOrWhiteSpace(pastaMidia) || !Directory.Exists(pastaMidia))
                            throw new DirectoryNotFoundException("a pasta não foi encontrada neste computador (disco ou Google Drive desconectado?): " + pastaMidia);
                        var mudou = Program.MapearMidia(audio ? Program.HostAudios : Program.HostVideos, pastaMidia);
                        var achados = await Task.Run(() => ListarMidias(pastaMidia, audio ? ExtAudio : ExtVideo));
                        Responder(id, new { ok = true, arquivos = achados, recarregar = mudou }); return;
                }
                if (acao == "definirRaiz" && (m.TryGetValue("modo", out var mo) ? mo as string : "pasta") == "google")
                {
                    await Google.Preparar();
                    modoSync = "google";
                    Responder(id, new { ok = true }); return;
                }
                if (modoSync == "google" && acao != "escolherPasta" && acao != "definirRaiz")
                {
                    switch (acao)
                    {
                        case "listar": r = new { ok = true, arquivos = await Google.Listar(Convert.ToString(m["sub"])) }; break;
                        case "lerVarios": r = new { ok = true, itens = await Google.LerVarios(((System.Collections.IEnumerable)m["caminhos"]).Cast<object>().Select(Convert.ToString)) }; break;
                        case "gravarVarios":
                            var lista = new System.Collections.Generic.List<object>();
                            foreach (System.Collections.Generic.Dictionary<string, object> it in (System.Collections.IEnumerable)m["itens"])
                                lista.Add(await Google.Gravar(Convert.ToString(it["caminho"]), System.Text.Encoding.UTF8.GetBytes(Convert.ToString(it["texto"]))));
                            r = new { ok = true, gravados = lista };
                            break;
                        case "apagar": await Google.Apagar(Convert.ToString(m["caminho"])); r = new { ok = true }; break;
                        case "lerBinario": r = await Google.LerBinario(Convert.ToString(m["caminho"]), Convert.ToInt64(m["inicio"]), Convert.ToInt32(m["tamanho"])); break;
                        case "gravarBinario":
                            await Google.GravarBinario(Convert.ToString(m["caminho"]), Convert.ToInt64(m["inicio"]), Convert.FromBase64String(Convert.ToString(m["base64"])),
                                m.TryGetValue("fim", out var gf) && gf is bool gfb && gfb);
                            r = new { ok = true };
                            break;
                        default: throw new InvalidOperationException("ação desconhecida: " + acao);
                    }
                    Responder(id, r); return;
                }
                if (acao == "definirRaiz") modoSync = "pasta";
                // ----- pasta do computador -----
                switch (acao)
                {
                    case "escolherPasta":
                        using (var d = new FolderBrowserDialog { Description = "Pasta compartilhada do MiguelAngelus (ex.: G:\\Meu Drive\\MiguelAngelus)", ShowNewFolderButton = true })
                            r = new { ok = d.ShowDialog(this) == DialogResult.OK, pasta = d.SelectedPath };
                        break;
                    case "definirRaiz":
                        var raiz = m["raiz"] as string;
                        if (string.IsNullOrWhiteSpace(raiz) || !Directory.Exists(raiz)) throw new DirectoryNotFoundException("a pasta não existe (o Google Drive está aberto?): " + raiz);
                        raizSync = raiz;
                        r = new { ok = true };
                        break;
                    case "listar":
                        var dir = Caminho(m["sub"]);
                        Directory.CreateDirectory(dir);
                        r = new { ok = true, arquivos = new DirectoryInfo(dir).GetFiles().Where(f => !f.Name.EndsWith(".tmp-mgl") && !f.Name.EndsWith(".parcial"))
                            .Select(f => new { nome = f.Name, tamanho = f.Length, mtime = Mtime(f.FullName) }).ToArray() };
                        break;
                    case "lerVarios":
                        r = new { ok = true, itens = ((System.Collections.IEnumerable)m["caminhos"]).Cast<object>().Select(c =>
                        {
                            var p = Caminho(c);
                            try { return new { caminho = Convert.ToString(c), texto = File.ReadAllText(p, System.Text.Encoding.UTF8), erro = (string)null }; }
                            catch (Exception ex) { return new { caminho = Convert.ToString(c), texto = (string)null, erro = ex.Message }; }
                        }).ToArray() };
                        break;
                    case "gravarVarios":
                        var gravados = new System.Collections.Generic.List<object>();
                        foreach (System.Collections.Generic.Dictionary<string, object> it in (System.Collections.IEnumerable)m["itens"])
                        {
                            var p = Caminho(it["caminho"]);
                            GravarSeguro(p, System.Text.Encoding.UTF8.GetBytes(Convert.ToString(it["texto"])));
                            gravados.Add(new { caminho = Convert.ToString(it["caminho"]), mtime = Mtime(p) });
                        }
                        r = new { ok = true, gravados };
                        break;
                    case "apagar":
                        var pa = Caminho(m["caminho"]);
                        if (File.Exists(pa)) File.Delete(pa);
                        r = new { ok = true };
                        break;
                    case "lerBinario":   // pedaço de um arquivo grande (mídias), em base64
                        var pb = Caminho(m["caminho"]);
                        long inicio = Convert.ToInt64(m["inicio"]); int tam = Convert.ToInt32(m["tamanho"]);
                        using (var fs = new FileStream(pb, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                        {
                            fs.Seek(inicio, SeekOrigin.Begin);
                            var buf = new byte[Math.Max(0, Math.Min(tam, fs.Length - inicio))];
                            int lidos = 0; while (lidos < buf.Length) { int n = fs.Read(buf, lidos, buf.Length - lidos); if (n <= 0) break; lidos += n; }
                            r = new { ok = true, total = fs.Length, base64 = Convert.ToBase64String(buf, 0, lidos) };
                        }
                        break;
                    case "gravarBinario":   // pedaços em sequência num ".parcial"; o último renomeia para o nome final
                        var pg = Caminho(m["caminho"]);
                        Directory.CreateDirectory(Path.GetDirectoryName(pg));
                        var parcial = pg + ".parcial";
                        var dados = Convert.FromBase64String(Convert.ToString(m["base64"]));
                        using (var fs = new FileStream(parcial, Convert.ToInt64(m["inicio"]) == 0 ? FileMode.Create : FileMode.Append, FileAccess.Write))
                            fs.Write(dados, 0, dados.Length);
                        if (m.TryGetValue("fim", out var fim) && fim is bool fb && fb) { if (File.Exists(pg)) File.Delete(pg); File.Move(parcial, pg); }
                        r = new { ok = true };
                        break;
                    default: throw new InvalidOperationException("ação desconhecida: " + acao);
                }
            }
            catch (Exception ex) { r = new { ok = false, erro = ex.Message }; }
            Responder(id, r);
        }

        // Caminho de um arquivo DENTRO da pasta de vídeos/áudios escolhida (nunca fora dela)
        string CaminhoMidia(System.Collections.Generic.Dictionary<string, object> m)
        {
            var host = Convert.ToString(m["tipoMidia"]) == "audio" ? Program.HostAudios : Program.HostVideos;
            Program.CarregarPastasMidia();
            if (!Program.PastasMidia.TryGetValue(host, out var raiz)) throw new InvalidOperationException("escolha antes a pasta de vídeos/áudios");
            raiz = Path.GetFullPath(raiz).TrimEnd('\\') + "\\";
            var p = Path.GetFullPath(Path.Combine(raiz, Convert.ToString(m["caminho"]).Replace('/', '\\')));
            if (!p.StartsWith(raiz, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("caminho fora da pasta de mídias");
            return p;
        }

        // Um pedaço de arquivo grande na nuvem: Google Drive ou pasta de sincronização
        async Task GravarPedacoNuvem(string caminho, long inicio, byte[] dados, bool fim)
        {
            if (modoSync == "google") { await Google.GravarBinario(caminho, inicio, dados, fim); return; }
            var pg = Caminho(caminho);
            Directory.CreateDirectory(Path.GetDirectoryName(pg));
            var parcial = pg + ".parcial";
            using (var fs = new FileStream(parcial, inicio == 0 ? FileMode.Create : FileMode.Append, FileAccess.Write))
                fs.Write(dados, 0, dados.Length);
            if (fim) { if (File.Exists(pg)) File.Delete(pg); File.Move(parcial, pg); }
        }

        byte[] LerPedacoNuvem(string caminho, long inicio, int tamanho, out long total, object doGoogle)
        {
            if (doGoogle != null)
            {
                var t = doGoogle.GetType();
                total = Convert.ToInt64(t.GetProperty("total").GetValue(doGoogle));
                return Convert.FromBase64String(Convert.ToString(t.GetProperty("base64").GetValue(doGoogle)));
            }
            using (var fs = new FileStream(Caminho(caminho), FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                total = fs.Length;
                fs.Seek(inicio, SeekOrigin.Begin);
                var buf = new byte[Math.Max(0, Math.Min(tamanho, total - inicio))];
                int n = 0, lido;
                while (n < buf.Length && (lido = fs.Read(buf, n, buf.Length - n)) > 0) n += lido;
                if (n < buf.Length) Array.Resize(ref buf, n);
                return buf;
            }
        }

        void Progresso(string id, long feito, long total)
        {
            try { Web.CoreWebView2?.PostWebMessageAsJson(json.Serialize(new { tipo = "midiaProgresso", id, feito, total })); } catch { }
        }

        static readonly string[] ExtVideo = { ".mp4", ".m4v", ".webm", ".mov", ".mkv", ".ogv" };
        static readonly string[] ExtAudio = { ".mp3", ".m4a", ".aac", ".wav", ".ogg", ".oga", ".opus", ".flac" };

        // Todos os vídeos/áudios da pasta e subpastas: caminho relativo com "/" (pastas sem permissão são puladas)
        static object[] ListarMidias(string raiz, string[] exts)
        {
            raiz = Path.GetFullPath(raiz).TrimEnd('\\') + "\\";
            var saida = new System.Collections.Generic.List<object>();
            var pilha = new System.Collections.Generic.Stack<string>();
            pilha.Push(raiz);
            while (pilha.Count > 0 && saida.Count < 50000)
            {
                var dir = pilha.Pop();
                try
                {
                    foreach (var sub in Directory.GetDirectories(dir))
                        if ((new DirectoryInfo(sub).Attributes & (FileAttributes.Hidden | FileAttributes.System)) == 0) pilha.Push(sub);
                    foreach (var f in new DirectoryInfo(dir).GetFiles())
                        if (exts.Contains(f.Extension.ToLowerInvariant()) && (f.Attributes & FileAttributes.Hidden) == 0)
                            saida.Add(new { caminho = f.FullName.Substring(raiz.Length).Replace('\\', '/'), tamanho = f.Length });
                }
                catch (UnauthorizedAccessException) { }
                catch (IOException) { }
            }
            return saida.ToArray();
        }

        void Responder(string id, object corpo)
        {
            var d = new System.Collections.Generic.Dictionary<string, object> { ["tipo"] = "arquivoResposta", ["id"] = id };
            foreach (var p in corpo.GetType().GetProperties()) d[p.Name] = p.GetValue(corpo);
            try { Web.CoreWebView2?.PostWebMessageAsJson(json.Serialize(d)); } catch { }
        }

        // Ao fechar: a página envia o que mudou para a pasta e responde "podeFechar" (no máximo 25 s de espera)
        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (!podeFechar && Web.CoreWebView2 != null && e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                if (avisouFechamento) return;          // a janela de confirmação já está aberta: espera a resposta dela
                avisouFechamento = true;
                try { Web.CoreWebView2.PostWebMessageAsJson("{\"tipo\":\"fechando\"}"); } catch { podeFechar = true; Close(); return; }
                // trava de segurança: se a página não responder em 25 s, fecha assim mesmo
                relogioFechar?.Stop();
                relogioFechar = new Timer { Interval = 25000 };
                relogioFechar.Tick += (s, ev) => { relogioFechar.Stop(); podeFechar = true; Close(); };
                relogioFechar.Start();
                return;
            }
            base.OnFormClosing(e);
        }

        // Downloads pedidos pela página (o navegador bloqueia ler outros sites; o programa não).
        // Só sites conhecidos: folhetos da Arquidiocese do Rio.
        // e a Liturgia Diária da Paulus
        static readonly string[] SitesPermitidos = { "arqrio.org.br", "www.arqrio.org.br", "arqrio.com.br", "www.arqrio.com.br",
                                                     "paulus.com.br", "www.paulus.com.br" };
        static readonly System.Net.Http.HttpClient cliente = CriarCliente();

        static System.Net.Http.HttpClient CriarCliente()
        {
            System.Net.ServicePointManager.SecurityProtocol |= System.Net.SecurityProtocolType.Tls12;
            var c = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(60) };
            c.DefaultRequestHeaders.UserAgent.ParseAdd("MiguelAngelus/1.0 (Windows; projecao para a Missa)");
            return c;
        }

        // {tipo:'http', id, url, metodo:'GET'|'POST', corpo: {campo: valor}, binario} → {tipo:'httpResposta', id, ok, status, texto|base64, erro}
        async Task Http(System.Collections.Generic.Dictionary<string, object> m)
        {
            var id = m.TryGetValue("id", out var i) ? Convert.ToString(i) : "";
            object resposta;
            try
            {
                var url = m["url"] as string;
                if (!Uri.TryCreate(url, UriKind.Absolute, out var u) || u.Scheme != "https" || !SitesPermitidos.Contains(u.Host.ToLowerInvariant()))
                    throw new InvalidOperationException("endereço não permitido: " + url);
                System.Net.Http.HttpResponseMessage r;
                if ((m.TryGetValue("metodo", out var me) ? me as string : "GET") == "POST")
                {
                    var campos = (m.TryGetValue("corpo", out var c) ? c as System.Collections.Generic.Dictionary<string, object> : null)
                                 ?? new System.Collections.Generic.Dictionary<string, object>();
                    var form = new System.Net.Http.FormUrlEncodedContent(campos.Select(kv => new System.Collections.Generic.KeyValuePair<string, string>(kv.Key, Convert.ToString(kv.Value))));
                    r = await cliente.PostAsync(u, form);
                }
                else r = await cliente.GetAsync(u);
                var binario = m.TryGetValue("binario", out var bi) && bi is bool bb && bb;
                if (binario)
                {
                    var bytes = await r.Content.ReadAsByteArrayAsync();
                    resposta = new { tipo = "httpResposta", id, ok = r.IsSuccessStatusCode, status = (int)r.StatusCode,
                        tipoConteudo = r.Content.Headers.ContentType?.MediaType ?? "", base64 = Convert.ToBase64String(bytes) };
                }
                else
                    resposta = new { tipo = "httpResposta", id, ok = r.IsSuccessStatusCode, status = (int)r.StatusCode, texto = await r.Content.ReadAsStringAsync() };
            }
            catch (Exception ex) { resposta = new { tipo = "httpResposta", id, ok = false, status = 0, erro = ex.Message }; }
            try { Web.CoreWebView2?.PostWebMessageAsJson(new System.Web.Script.Serialization.JavaScriptSerializer { MaxJsonLength = int.MaxValue }.Serialize(resposta)); } catch { }
        }

        void LigarNdi(bool ligar, string nome)
        {
            if (ligar && ndi == null)
            {
                try { ndi = EnvioNdi.Criar(string.IsNullOrWhiteSpace(nome) ? "MiguelAngelus Letras" : nome.Trim(), out erroNdi); }
                catch (Exception ex) { erroNdi = ex.Message; ndi = null; }
                if (ndi != null) { erroNdi = null; relogioNdi.Start(); }
            }
            else if (!ligar && ndi != null) { relogioNdi.Stop(); ndi.Dispose(); ndi = null; erroNdi = null; }
            InformarNdi();
        }

        void InformarNdi()
        {
            var estado = new { tipo = "ndiStatus", ativo = ndi != null, conexoes = ndi?.Conexoes ?? 0, erro = erroNdi };
            try { Web.CoreWebView2?.PostWebMessageAsJson(json.Serialize(estado)); } catch { }
        }

        static Faixa LerFaixa(System.Collections.Generic.Dictionary<string, object> m)
        {
            var f = new Faixa();
            if (m.TryGetValue("linhas", out var ls) && ls is System.Collections.IEnumerable al && !(ls is string)) f.Linhas = al.Cast<object>().Select(x => x?.ToString() ?? "").ToArray();
            if (m.TryGetValue("negrito", out var ns) && ns is System.Collections.IEnumerable an && !(ns is string)) f.Negrito = an.Cast<object>().Select(x => x is bool b && b).ToArray();
            if (m.TryGetValue("fonte", out var fo) && fo is string fs && fs.Length > 0) f.Fonte = fs;
            if (m.TryGetValue("tamanho", out var ta)) f.Tamanho = Convert.ToDouble(ta, System.Globalization.CultureInfo.InvariantCulture);
            if (m.TryGetValue("opacidade", out var op)) f.Opacidade = Convert.ToDouble(op, System.Globalization.CultureInfo.InvariantCulture);
            if (m.TryGetValue("corTexto", out var co) && co is string cs) f.CorTexto = cs;
            return f;
        }
    }

    // Janela do telão: vai sozinha para o segundo monitor, em tela cheia, sem roubar o foco do operador
    class JanelaProjecao : JanelaWeb
    {
        readonly bool noTelao;

        public JanelaProjecao(Form principal)
        {
            Text = "MiguelAngelus — Projeção";
            StartPosition = FormStartPosition.Manual;
            var telaOperador = Screen.FromControl(principal);
            var telao = Screen.AllScreens.FirstOrDefault(t => t.DeviceName != telaOperador.DeviceName && !t.Primary)
                        ?? Screen.AllScreens.FirstOrDefault(t => t.DeviceName != telaOperador.DeviceName);
            if (telao != null)
            {
                noTelao = true;
                FormBorderStyle = FormBorderStyle.None;
                Bounds = telao.Bounds;
            }
            else
            {
                // um monitor só: janela comum, no centro
                float k = principal.DeviceDpi / 96f;
                Size = new Size((int)(976 * k), (int)(579 * k));
                var area = telaOperador.WorkingArea;
                Location = new Point(area.Left + (area.Width - Width) / 2, area.Top + (area.Height - Height) / 2);
            }
            Load += (s, e) =>
            {
                Web.NavigationCompleted += (s2, e2) =>
                {
                    // no telão, a dica "arraste esta janela…" não faz sentido
                    if (noTelao) _ = Web.CoreWebView2.ExecuteScriptAsync("document.getElementById('dica')?.remove()");
                };
            };
        }

        protected override bool ShowWithoutActivation => noTelao;
    }
}
