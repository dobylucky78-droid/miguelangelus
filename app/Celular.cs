using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace MiguelAngelus
{
    // Controle pelo celular: um servidor HTTP pequeno na rede local (Wi-Fi da igreja), sem precisar de administrador.
    //  GET  /                 página do controle (pasta web\celular)
    //  POST /api/parear       {codigo, nome} → {token}   (código de 4 dígitos que aparece no computador)
    //  GET  /api/eventos?t=   estado ao vivo (Server-Sent Events): o celular acompanha o que está no telão
    //  POST /api/comando?t=   {acao, …} → repassado para a página do operador (Próximo, Tela preta, Aviso…)
    // Só responde a celulares pareados; os pareamentos ficam em celulares.json (o celular não precisa parear de novo).
    sealed class ServidorCelular : IDisposable
    {
        internal const int Porta = 8930;
        readonly Action<string> aoComando;          // json do comando (já validado)
        readonly Action aoMudar;                    // aparelhos/código mudaram: a tela de Ajustes se atualiza
        readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 8 * 1024 * 1024 };
        readonly object trava = new object();
        readonly List<Cliente> clientes = new List<Cliente>();
        readonly Dictionary<string, Aparelho> aparelhos = new Dictionary<string, Aparelho>();
        TcpListener escuta;
        Timer pulso;
        string estado = "{}", musica = "[]";
        int erros;
        DateTime travadoAte = DateTime.MinValue;

        internal string Codigo { get; private set; } = "";
        internal bool Ligado => escuta != null;
        internal string Erro { get; private set; }

        sealed class Cliente { public string Token; public Stream Fluxo; public TcpClient Tcp; public readonly SemaphoreSlim Vez = new SemaphoreSlim(1); }
        sealed class Aparelho { public string Nome; public long Desde; public string Papel = "controle"; }   // "controle" ou "musico" (só vê as cifras)

        static string Arq => Path.Combine(Program.PastaDados, "celulares.json");

        public ServidorCelular(Action<string> aoComando, Action aoMudar)
        {
            this.aoComando = aoComando;
            this.aoMudar = aoMudar;
            try
            {
                if (File.Exists(Arq))
                    foreach (var kv in json.Deserialize<Dictionary<string, Dictionary<string, object>>>(File.ReadAllText(Arq)))
                        aparelhos[kv.Key] = new Aparelho { Nome = Convert.ToString(kv.Value["nome"]), Desde = Convert.ToInt64(kv.Value["desde"]),
                            Papel = kv.Value.TryGetValue("papel", out var p) && Convert.ToString(p) == "musico" ? "musico" : "controle" };
            }
            catch { }
        }

        void Salvar()
        {
            try
            {
                Dictionary<string, object> d;
                lock (trava) d = aparelhos.ToDictionary(kv => kv.Key, kv => (object)new { nome = kv.Value.Nome, desde = kv.Value.Desde, papel = kv.Value.Papel });
                File.WriteAllText(Arq, json.Serialize(d));
            }
            catch (Exception ex) { Program.Erro("gravar os celulares pareados", ex); }
        }

        // ---------- Ligar / desligar ----------

        internal void Ligar()
        {
            if (escuta != null) return;
            Erro = null;
            NovoCodigo();
            try
            {
                // testes automáticos: só no próprio computador (não abre o aviso do Firewall)
                var soLocal = Environment.GetEnvironmentVariable("MIGUELANGELUS_CELULAR_LOCAL") == "1";
                escuta = new TcpListener(soLocal ? IPAddress.Loopback : IPAddress.Any, Porta);
                escuta.Start();
            }
            catch (Exception ex)
            {
                escuta = null;
                Erro = ex is SocketException se && se.SocketErrorCode == SocketError.AddressAlreadyInUse
                    ? $"a porta {Porta} já está em uso (outro MiguelAngelus aberto?)" : ex.Message;
                return;
            }
            var e = escuta;
            Task.Run(() => Aceitar(e));
            pulso = new Timer(_ => Enviar(": pulso\n\n", null), null, 15000, 15000);
        }

        internal void Desligar()
        {
            var e = escuta;
            escuta = null;
            pulso?.Dispose(); pulso = null;
            try { e?.Stop(); } catch { }
            List<Cliente> todos;
            lock (trava) { todos = clientes.ToList(); clientes.Clear(); }
            foreach (var c in todos) Fechar(c);
        }

        public void Dispose() => Desligar();

        void NovoCodigo()
        {
            var b = new byte[4];
            using (var r = RandomNumberGenerator.Create()) r.GetBytes(b);
            Codigo = (BitConverter.ToUInt32(b, 0) % 10000).ToString("0000");
            erros = 0;
        }

        // ---------- Estado e aparelhos ----------

        // A página do operador manda o estado sempre que algo muda; vai na hora para todos os celulares conectados
        internal void Atualizar(string estadoJson)
        {
            estado = estadoJson;
            Enviar("data: " + estadoJson + "\n\n", null);
        }

        // Cantos do roteiro com as cifras (app dos músicos): vai separado, só quando muda (é maior que o estado)
        internal void AtualizarMusica(string musicaJson)
        {
            musica = musicaJson;
            Enviar("event: musica\ndata: " + musicaJson + "\n\n", null);
        }

        internal object Info()
        {
            HashSet<string> online;
            lock (trava) online = new HashSet<string>(clientes.Select(c => c.Token));
            List<object> lista;
            lock (trava) lista = aparelhos.OrderBy(kv => kv.Value.Desde)
                .Select(kv => (object)new { id = kv.Key.Substring(0, 8), nome = kv.Value.Nome, desde = kv.Value.Desde, papel = kv.Value.Papel, online = online.Contains(kv.Key) }).ToList();
            var redes = Redes();
            return new { tipo = "celularInfo", ligado = Ligado, erro = Erro, porta = Porta, codigo = Codigo, ips = redes.Select(x => x.ip).ToList(),
                redes = redes.Select(x => (object)new { ip = x.ip, nome = x.nome, internet = x.gw, publica = x.publica, bloqueada = x.bloqueada }).ToList(), aparelhos = lista };
        }

        internal void Tirar(string id)
        {
            string token;
            List<Cliente> deles;
            lock (trava)
            {
                token = aparelhos.Keys.FirstOrDefault(k => k.StartsWith(id ?? "\0", StringComparison.Ordinal));
                if (token == null) return;
                aparelhos.Remove(token);
                deles = clientes.Where(c => c.Token == token).ToList();
                clientes.RemoveAll(c => c.Token == token);
            }
            foreach (var c in deles) Fechar(c);
            Salvar();
        }

        // Endereços IPv4 deste computador na rede local (o da placa com gateway primeiro: é o Wi-Fi/cabo de verdade)
        internal static List<string> Ips() => Redes().Select(x => x.ip).ToList();

        // Cada rede do computador: endereço, nome da placa ("Wi-Fi 3", "Ethernet 3"), se tem internet, se o Windows a marcou como
        // Pública e se o Firewall barra o MiguelAngelus nesse tipo de rede (a permissão é por tipo: Privada / Pública / Domínio;
        // na 1ª vez o Windows pergunta e a pessoa marca uma delas — aí a rede do outro tipo fica barrada para os celulares).
        internal static List<(string ip, string nome, bool gw, bool publica, bool bloqueada)> Redes()
        {
            var r = new List<(string ip, string nome, bool gw, bool publica, bool bloqueada)>();
            var perfis = PerfisDeRede();
            var liberados = PerfisLiberadosNoFirewall();
            try
            {
                foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus != OperationalStatus.Up || ni.NetworkInterfaceType == NetworkInterfaceType.Loopback ||
                        ni.NetworkInterfaceType == NetworkInterfaceType.Tunnel) continue;
                    var p = ni.GetIPProperties();
                    // "tem internet": o que o Windows diz da rede (o roteador do MiguelAngelus anuncia gateway mesmo sem internet);
                    // sem essa informação, vale ter gateway
                    var gw = perfis.TryGetValue(ni.Name, out var pf) ? pf.internet
                        : p.GatewayAddresses.Any(g => g.Address.AddressFamily == AddressFamily.InterNetwork && !g.Address.Equals(IPAddress.Any));
                    var publica = pf.categoria == 0;
                    // bit do perfil no Firewall: Domínio 1, Privada 2, Pública 4 (categoria da rede: 0 Pública, 1 Privada, 2 Domínio)
                    var bit = pf.categoria == 2 ? 1 : pf.categoria == 1 ? 2 : 4;
                    var bloqueada = liberados >= 0 && (liberados & bit) == 0;
                    foreach (var u in p.UnicastAddresses)
                        if (u.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(u.Address) && !u.Address.ToString().StartsWith("169.254."))
                            r.Add((u.Address.ToString(), ni.Name, gw, publica, bloqueada));
                }
            }
            catch { }
            return r.OrderByDescending(x => x.gw).GroupBy(x => x.ip).Select(g => g.First()).ToList();
        }

        // O que o Windows sabe de cada rede (MSFT_NetConnectionProfile, o mesmo do Get-NetConnectionProfile; só leitura):
        // Pública (NetworkCategory 0) e se chega à internet (IPv4Connectivity 4)
        static Dictionary<string, (int categoria, bool internet)> perfisGuardados; static DateTime perfisQuando;
        static Dictionary<string, (int categoria, bool internet)> PerfisDeRede()
        {
            if (perfisGuardados != null && (DateTime.UtcNow - perfisQuando).TotalSeconds < 5) return perfisGuardados;
            var r = new Dictionary<string, (int categoria, bool internet)>(StringComparer.OrdinalIgnoreCase);
            try
            {
                using (var s = new System.Management.ManagementObjectSearcher(@"root\StandardCimv2", "SELECT InterfaceAlias, NetworkCategory, IPv4Connectivity FROM MSFT_NetConnectionProfile"))
                    foreach (System.Management.ManagementObject o in s.Get())
                        r[Convert.ToString(o["InterfaceAlias"])] = (Convert.ToInt32(o["NetworkCategory"]), Convert.ToInt32(o["IPv4Connectivity"]) == 4);
            }
            catch { }
            perfisQuando = DateTime.UtcNow;
            return perfisGuardados = r;
        }

        // Tipos de rede (bits: Domínio 1, Privada 2, Pública 4) em que o Firewall do Windows deixa os celulares chegarem a ESTE
        // programa: regras de entrada liberando o MiguelAngelus.exe, menos as que bloqueiam; perfil com o Firewall desligado
        // conta como liberado. Só leitura (HNetCfg.FwPolicy2). -1 = não deu para ler (não avisa nada).
        static int liberadosGuardado = -2; static DateTime liberadosQuando;
        static int PerfisLiberadosNoFirewall()
        {
            if (liberadosGuardado != -2 && (DateTime.UtcNow - liberadosQuando).TotalSeconds < 5) return liberadosGuardado;
            int libera = 0, bloqueia = 0;
            try
            {
                var exe = System.Reflection.Assembly.GetExecutingAssembly().Location;
                dynamic pol = Activator.CreateInstance(Type.GetTypeFromProgID("HNetCfg.FwPolicy2"));
                foreach (var b in new[] { 1, 2, 4 }) if (!(bool)pol.FirewallEnabled[b]) libera |= b;
                foreach (dynamic regra in pol.Rules)
                {
                    try
                    {
                        string app = regra.ApplicationName;
                        if (string.IsNullOrEmpty(app) || !string.Equals(Path.GetFullPath(Environment.ExpandEnvironmentVariables(app)), exe, StringComparison.OrdinalIgnoreCase)) continue;
                        if (!(bool)regra.Enabled || (int)regra.Direction != 1) continue;          // 1 = entrada
                        int perfis = regra.Profiles;
                        if ((int)regra.Action == 1) libera |= perfis; else bloqueia |= perfis;     // 1 = permitir
                    }
                    catch { }                                                                     // regra com caminho estranho: ignora
                }
                liberadosGuardado = libera & ~bloqueia & 7;
            }
            catch { liberadosGuardado = -1; }
            liberadosQuando = DateTime.UtcNow;
            return liberadosGuardado;
        }

        // ---------- HTTP ----------

        async Task Aceitar(TcpListener e)
        {
            while (escuta == e)
            {
                TcpClient tcp;
                try { tcp = await e.AcceptTcpClientAsync(); }
                catch { break; }
                _ = Task.Run(() => Atender(tcp));
            }
        }

        async Task Atender(TcpClient tcp)
        {
            var manter = false;
            try
            {
                tcp.NoDelay = true;
                var fluxo = tcp.GetStream();
                fluxo.ReadTimeout = 10000;
                var (metodo, alvo, cab, corpo) = await LerPedido(fluxo);
                if (metodo == null) return;
                var q = alvo.IndexOf('?');
                var caminho = Uri.UnescapeDataString(q < 0 ? alvo : alvo.Substring(0, q));
                var consulta = q < 0 ? "" : alvo.Substring(q + 1);
                var token = Parametro(consulta, "t");

                if (caminho == "/api/eventos" && metodo == "GET")
                {
                    if (!Valido(token)) { await Responder(fluxo, 401, "application/json", "{\"ok\":false,\"motivo\":\"pareamento\"}"); return; }
                    var inicio = Encoding.UTF8.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream; charset=utf-8\r\nCache-Control: no-cache\r\n" +
                        "Connection: keep-alive\r\nX-Accel-Buffering: no\r\n\r\nretry: 2000\n\nevent: musica\ndata: " + musica + "\n\ndata: " + estado + "\n\n");
                    await fluxo.WriteAsync(inicio, 0, inicio.Length);
                    var c = new Cliente { Token = token, Fluxo = fluxo, Tcp = tcp };
                    lock (trava) clientes.Add(c);
                    manter = true;
                    aoMudar();          // aparece "conectado" nos Ajustes
                    return;
                }
                if (caminho == "/api/parear" && metodo == "POST")
                {
                    var d = LerJson(corpo);
                    var cod = d != null && d.TryGetValue("codigo", out var x) ? Convert.ToString(x)?.Trim() : null;
                    if (DateTime.UtcNow < travadoAte) { await Responder(fluxo, 429, "application/json", "{\"ok\":false,\"motivo\":\"espera\"}"); return; }
                    if (!Ligado || string.IsNullOrEmpty(cod) || cod != Codigo)
                    {
                        // 5 tentativas erradas: código novo e 1 minuto sem aceitar pareamento (ninguém fica "chutando" códigos)
                        if (Interlocked.Increment(ref erros) >= 5) { NovoCodigo(); travadoAte = DateTime.UtcNow.AddMinutes(1); aoMudar(); }
                        await Responder(fluxo, 403, "application/json", "{\"ok\":false}");
                        return;
                    }
                    var nome = d.TryGetValue("nome", out var n) ? (Convert.ToString(n) ?? "").Trim() : "";
                    if (nome.Length > 40) nome = nome.Substring(0, 40);
                    var papel = d.TryGetValue("papel", out var pp) && Convert.ToString(pp) == "musico" ? "musico" : "controle";
                    var b = new byte[24];
                    using (var r = RandomNumberGenerator.Create()) r.GetBytes(b);
                    var novo = BitConverter.ToString(b).Replace("-", "").ToLowerInvariant();
                    lock (trava) aparelhos[novo] = new Aparelho { Nome = nome == "" ? "Celular" : nome, Desde = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), Papel = papel };
                    Salvar();
                    NovoCodigo();       // cada código serve para um celular só
                    aoMudar();
                    await Responder(fluxo, 200, "application/json", json.Serialize(new { ok = true, token = novo, papel }));
                    return;
                }
                if (caminho == "/api/comando" && metodo == "POST")
                {
                    if (!Valido(token)) { await Responder(fluxo, 401, "application/json", "{\"ok\":false,\"motivo\":\"pareamento\"}"); return; }
                    // aparelho de músico só acompanha: não mexe no telão
                    bool soVe;
                    lock (trava) soVe = aparelhos.TryGetValue(token, out var apx) && apx.Papel == "musico";
                    if (soVe) { await Responder(fluxo, 403, "application/json", "{\"ok\":false,\"motivo\":\"musico\"}"); return; }
                    var d = LerJson(corpo);
                    if (d == null || !d.ContainsKey("acao")) { await Responder(fluxo, 400, "application/json", "{\"ok\":false}"); return; }
                    lock (trava) if (aparelhos.TryGetValue(token, out var ap)) d["aparelho"] = ap.Nome;
                    aoComando(json.Serialize(d));
                    await Responder(fluxo, 200, "application/json", "{\"ok\":true}");
                    return;
                }
                if (caminho == "/api/ping")
                {
                    string papelPing = null;
                    if (!string.IsNullOrEmpty(token)) lock (trava) if (aparelhos.TryGetValue(token, out var apP)) papelPing = apP.Papel;
                    await Responder(fluxo, 200, "application/json", papelPing != null ? json.Serialize(new { ok = true, papel = papelPing }) : "{\"ok\":false,\"motivo\":\"pareamento\"}");
                    return;
                }
                if (metodo == "GET") { await Arquivo(fluxo, caminho); return; }
                await Responder(fluxo, 405, "text/plain", "metodo");
            }
            catch { }
            finally { if (!manter) try { tcp.Close(); } catch { } }
        }

        bool Valido(string token)
        {
            if (string.IsNullOrEmpty(token)) return false;
            lock (trava) return aparelhos.ContainsKey(token);
        }

        static string Parametro(string consulta, string nome)
        {
            foreach (var par in consulta.Split('&'))
            {
                var i = par.IndexOf('=');
                if (i > 0 && par.Substring(0, i) == nome) return Uri.UnescapeDataString(par.Substring(i + 1));
            }
            return null;
        }

        Dictionary<string, object> LerJson(byte[] corpo)
        {
            try { return json.Deserialize<Dictionary<string, object>>(Encoding.UTF8.GetString(corpo ?? new byte[0])); }
            catch { return null; }
        }

        static async Task<(string, string, Dictionary<string, string>, byte[])> LerPedido(Stream fluxo)
        {
            var buf = new byte[16384];
            int n = 0, fim = -1;
            while (fim < 0)
            {
                if (n == buf.Length) return (null, null, null, null);       // cabeçalho grande demais
                var lidos = await fluxo.ReadAsync(buf, n, buf.Length - n);
                if (lidos <= 0) return (null, null, null, null);
                n += lidos;
                for (var i = Math.Max(0, n - lidos - 3); i + 3 < n; i++)
                    if (buf[i] == 13 && buf[i + 1] == 10 && buf[i + 2] == 13 && buf[i + 3] == 10) { fim = i; break; }
            }
            var linhas = Encoding.ASCII.GetString(buf, 0, fim).Split(new[] { "\r\n" }, StringSplitOptions.None);
            var partes = linhas[0].Split(' ');
            if (partes.Length < 2) return (null, null, null, null);
            var cab = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var l in linhas.Skip(1)) { var i = l.IndexOf(':'); if (i > 0) cab[l.Substring(0, i).Trim()] = l.Substring(i + 1).Trim(); }
            var tam = cab.TryGetValue("Content-Length", out var cl) && int.TryParse(cl, out var t) ? t : 0;
            if (tam < 0 || tam > 65536) return (null, null, null, null);
            var corpo = new byte[tam];
            var ja = Math.Min(tam, n - fim - 4);
            Array.Copy(buf, fim + 4, corpo, 0, ja);
            while (ja < tam)
            {
                var lidos = await fluxo.ReadAsync(corpo, ja, tam - ja);
                if (lidos <= 0) break;
                ja += lidos;
            }
            return (partes[0], partes[1], cab, corpo);
        }

        static async Task Responder(Stream fluxo, int status, string tipo, string texto) =>
            await Responder(fluxo, status, tipo, Encoding.UTF8.GetBytes(texto));

        static async Task Responder(Stream fluxo, int status, string tipo, byte[] dados)
        {
            var nome = status == 200 ? "OK" : status == 401 ? "Unauthorized" : status == 403 ? "Forbidden" : status == 404 ? "Not Found" : status == 429 ? "Too Many Requests" : "Error";
            var cab = Encoding.ASCII.GetBytes($"HTTP/1.1 {status} {nome}\r\nContent-Type: {tipo}\r\nContent-Length: {dados.Length}\r\n" +
                "Cache-Control: no-store\r\nConnection: close\r\n\r\n");
            await fluxo.WriteAsync(cab, 0, cab.Length);
            await fluxo.WriteAsync(dados, 0, dados.Length);
        }

        static readonly Dictionary<string, string> Tipos = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".html"] = "text/html; charset=utf-8", [".js"] = "text/javascript; charset=utf-8", [".css"] = "text/css; charset=utf-8",
            [".json"] = "application/json", [".webmanifest"] = "application/manifest+json", [".svg"] = "image/svg+xml",
            [".png"] = "image/png", [".mp4"] = "video/mp4", [".ico"] = "image/x-icon",
        };

        // Arquivos da página do celular: só da pasta web\celular (e o ícone em web\img)
        static async Task Arquivo(Stream fluxo, string caminho)
        {
            var nome = caminho.TrimStart('/');
            if (nome == "") nome = "index.html";
            if (nome.Contains("..") || nome.Contains("\\") || nome.Contains(":")) { await Responder(fluxo, 404, "text/plain", "-"); return; }
            var p = Path.Combine(Program.PastaWeb, "celular", nome.Replace('/', '\\'));
            if (!File.Exists(p)) p = Path.Combine(Program.PastaWeb, "img", Path.GetFileName(nome));
            if (!File.Exists(p) || !Tipos.TryGetValue(Path.GetExtension(p), out var tipo)) { await Responder(fluxo, 404, "text/plain", "-"); return; }
            await Responder(fluxo, 200, tipo, File.ReadAllBytes(p));
        }

        // ---------- Envio para os celulares conectados ----------

        void Enviar(string texto, string soToken)
        {
            List<Cliente> alvo;
            lock (trava) alvo = clientes.Where(c => soToken == null || c.Token == soToken).ToList();
            if (alvo.Count == 0) return;
            var dados = Encoding.UTF8.GetBytes(texto);
            foreach (var c in alvo)
                Task.Run(async () =>
                {
                    try
                    {
                        await c.Vez.WaitAsync();       // uma mensagem de cada vez no mesmo celular
                        try
                        {
                            using (var limite = new CancellationTokenSource(8000))
                                await c.Fluxo.WriteAsync(dados, 0, dados.Length, limite.Token);
                        }
                        finally { c.Vez.Release(); }
                    }
                    catch
                    {
                        bool saiu;
                        lock (trava) saiu = clientes.Remove(c);
                        Fechar(c);
                        if (saiu) aoMudar();
                    }
                });
        }

        static void Fechar(Cliente c)
        {
            try { c.Tcp.Close(); } catch { }
        }
    }
}
