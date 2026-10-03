// Sincronização pelo Google Drive (conta da paróquia), direto pela API do Drive.
// - Login: navegador do sistema + retorno em 127.0.0.1 (OAuth para apps de computador, com PKCE).
// - Escopo drive.file: o MiguelAngelus só enxerga os arquivos que ele mesmo criou (pasta "MiguelAngelus").
// - O acesso (refresh token) fica criptografado com o usuário do Windows (DPAPI), em %LOCALAPPDATA%\MiguelAngelus\google.dat.
// As operações têm os mesmos nomes da sincronização por pasta: listar, lerVarios, gravarVarios, apagar, lerBinario, gravarBinario.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace MiguelAngelus
{
    sealed class GoogleDrive
    {
        const string Escopo = "https://www.googleapis.com/auth/drive.file";
        const string Api = "https://www.googleapis.com/drive/v3/";
        const string ApiUpload = "https://www.googleapis.com/upload/drive/v3/";
        const string Pasta = "application/vnd.google-apps.folder";
        readonly HttpClient http;
        readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
        readonly string arquivoCredencial = Path.Combine(Program.PastaDados, "google.dat");

        string clienteId, clienteSegredo, refreshToken, accessToken;
        DateTime expira;
        string raizId;
        readonly Dictionary<string, string> pastas = new Dictionary<string, string>();          // sub → id
        readonly Dictionary<string, string> idsArquivos = new Dictionary<string, string>();     // "sub/nome" → id
        readonly Dictionary<string, string> sessoesUpload = new Dictionary<string, string>();   // "sub/nome" → URL de upload em partes

        public GoogleDrive(HttpClient http) { this.http = http; Carregar(); }

        public bool TemCliente => !string.IsNullOrEmpty(clienteId);
        public bool Conectado => !string.IsNullOrEmpty(refreshToken);

        // ---------- credenciais guardadas (criptografadas para este usuário do Windows) ----------
        void Carregar()
        {
            try
            {
                if (!File.Exists(arquivoCredencial)) return;
                var bytes = ProtectedData.Unprotect(File.ReadAllBytes(arquivoCredencial), null, DataProtectionScope.CurrentUser);
                var d = json.Deserialize<Dictionary<string, string>>(Encoding.UTF8.GetString(bytes));
                d.TryGetValue("cliente", out clienteId); d.TryGetValue("segredo", out clienteSegredo); d.TryGetValue("refresh", out refreshToken);
            }
            catch { /* arquivo de outro usuário/computador: fica desconectado */ }
        }

        void Guardar()
        {
            var d = new Dictionary<string, string> { ["cliente"] = clienteId, ["segredo"] = clienteSegredo, ["refresh"] = refreshToken };
            Directory.CreateDirectory(Path.GetDirectoryName(arquivoCredencial));
            File.WriteAllBytes(arquivoCredencial, ProtectedData.Protect(Encoding.UTF8.GetBytes(json.Serialize(d)), null, DataProtectionScope.CurrentUser));
        }

        // JSON baixado do Google Cloud ("App para computador"): {"installed": {"client_id": ..., "client_secret": ...}}
        public void DefinirCliente(string textoJson)
        {
            var raiz = json.Deserialize<Dictionary<string, object>>(textoJson);
            var inst = (raiz.TryGetValue("installed", out var i) ? i : raiz.TryGetValue("web", out var w) ? w : raiz) as Dictionary<string, object>;
            var id = inst?["client_id"] as string;
            var seg = inst != null && inst.TryGetValue("client_secret", out var s) ? s as string : null;
            if (string.IsNullOrEmpty(id) || !id.EndsWith(".apps.googleusercontent.com")) throw new InvalidOperationException("este arquivo não é um ID do cliente OAuth do Google");
            if (id != clienteId) { refreshToken = null; accessToken = null; }
            clienteId = id; clienteSegredo = seg;
            Guardar();
        }

        public void Desconectar()
        {
            refreshToken = null; accessToken = null; raizId = null; pastas.Clear(); idsArquivos.Clear();
            Guardar();
        }

        // ---------- login pelo navegador ----------
        static string Base64Url(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        public async Task Conectar()
        {
            if (!TemCliente) throw new InvalidOperationException("carregue primeiro o arquivo do ID do cliente (JSON do Google Cloud)");
            var ouvinte = new TcpListener(IPAddress.Loopback, 0);
            ouvinte.Start();
            try
            {
                var porta = ((IPEndPoint)ouvinte.LocalEndpoint).Port;
                var retorno = $"http://127.0.0.1:{porta}/";
                var rnd = new byte[32]; using (var g = RandomNumberGenerator.Create()) g.GetBytes(rnd);
                var verificador = Base64Url(rnd);
                string desafio; using (var sha = SHA256.Create()) desafio = Base64Url(sha.ComputeHash(Encoding.ASCII.GetBytes(verificador)));
                var estado = Guid.NewGuid().ToString("N");
                var url = "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&access_type=offline&prompt=consent" +
                          "&client_id=" + Uri.EscapeDataString(clienteId) + "&redirect_uri=" + Uri.EscapeDataString(retorno) +
                          "&scope=" + Uri.EscapeDataString(Escopo) + "&code_challenge=" + desafio + "&code_challenge_method=S256&state=" + estado;
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });

                var aceitar = ouvinte.AcceptTcpClientAsync();
                if (await Task.WhenAny(aceitar, Task.Delay(TimeSpan.FromMinutes(5))) != aceitar) throw new TimeoutException("o login no navegador não foi concluído");
                string codigo, erro;
                using (var cli = aceitar.Result)
                using (var fluxo = cli.GetStream())
                {
                    var buf = new byte[8192]; var n = await fluxo.ReadAsync(buf, 0, buf.Length);
                    var linha = Encoding.ASCII.GetString(buf, 0, n).Split('\n')[0];   // GET /?state=..&code=.. HTTP/1.1
                    var consulta = linha.Split(' ').ElementAtOrDefault(1) ?? "";
                    var q = consulta.Contains("?") ? consulta.Substring(consulta.IndexOf('?') + 1).Split('&')
                        .Select(p => p.Split('=')).ToDictionary(p => p[0], p => p.Length > 1 ? Uri.UnescapeDataString(p[1]) : "") : new Dictionary<string, string>();
                    q.TryGetValue("code", out codigo); q.TryGetValue("error", out erro);
                    if (!q.TryGetValue("state", out var est) || est != estado) { codigo = null; erro = erro ?? "resposta inválida"; }
                    var html = codigo != null
                        ? "<h2 style='font-family:Segoe UI'>&#10004; MiguelAngelus conectado ao Google Drive.</h2><p style='font-family:Segoe UI'>Pode fechar esta aba e voltar ao programa.</p>"
                        : "<h2 style='font-family:Segoe UI'>N&atilde;o foi poss&iacute;vel conectar.</h2><p style='font-family:Segoe UI'>" + WebUtility.HtmlEncode(erro ?? "") + "</p>";
                    var corpo = Encoding.UTF8.GetBytes(html);
                    var cab = Encoding.ASCII.GetBytes($"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {corpo.Length}\r\nConnection: close\r\n\r\n");
                    await fluxo.WriteAsync(cab, 0, cab.Length); await fluxo.WriteAsync(corpo, 0, corpo.Length);
                }
                if (codigo == null) throw new InvalidOperationException("o Google recusou: " + erro);
                var tok = await Token(new Dictionary<string, string> {
                    ["code"] = codigo, ["client_id"] = clienteId, ["client_secret"] = clienteSegredo ?? "",
                    ["redirect_uri"] = retorno, ["grant_type"] = "authorization_code", ["code_verifier"] = verificador });
                if (tok.TryGetValue("refresh_token", out var rt)) refreshToken = rt as string;
                if (string.IsNullOrEmpty(refreshToken)) throw new InvalidOperationException("o Google não devolveu o acesso permanente (tente de novo)");
                Guardar();
            }
            finally { ouvinte.Stop(); }
        }

        async Task<Dictionary<string, object>> Token(Dictionary<string, string> campos)
        {
            var r = await http.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(campos));
            var texto = await r.Content.ReadAsStringAsync();
            var d = json.Deserialize<Dictionary<string, object>>(texto);
            if (!r.IsSuccessStatusCode)
            {
                if (texto.Contains("invalid_grant")) { refreshToken = null; Guardar(); throw new InvalidOperationException("o acesso ao Google expirou: clique em Conectar de novo"); }
                throw new InvalidOperationException("Google: " + (d.TryGetValue("error_description", out var e) ? e : texto));
            }
            accessToken = d["access_token"] as string;
            expira = DateTime.UtcNow.AddSeconds(Convert.ToDouble(d["expires_in"]) - 60);
            return d;
        }

        async Task<string> Acesso()
        {
            if (!Conectado) throw new InvalidOperationException("não conectado ao Google (Ajustes → Sincronização → Conectar)");
            if (accessToken == null || DateTime.UtcNow >= expira)
                await Token(new Dictionary<string, string> { ["client_id"] = clienteId, ["client_secret"] = clienteSegredo ?? "", ["refresh_token"] = refreshToken, ["grant_type"] = "refresh_token" });
            return accessToken;
        }

        async Task<HttpResponseMessage> Enviar(Func<HttpRequestMessage> criar, bool aceitar404 = false)
        {
            for (int tentativa = 0; ; tentativa++)
            {
                var req = criar();
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await Acesso());
                var r = await http.SendAsync(req);
                if (r.IsSuccessStatusCode || (aceitar404 && r.StatusCode == HttpStatusCode.NotFound)) return r;
                if (((int)r.StatusCode == 429 || (int)r.StatusCode >= 500 || r.StatusCode == HttpStatusCode.Unauthorized) && tentativa < 3)
                {
                    if (r.StatusCode == HttpStatusCode.Unauthorized) accessToken = null;
                    await Task.Delay(800 * (tentativa + 1));
                    continue;
                }
                throw new InvalidOperationException($"Google Drive ({(int)r.StatusCode}): " + await r.Content.ReadAsStringAsync());
            }
        }

        async Task<Dictionary<string, object>> Json(Func<HttpRequestMessage> criar) =>
            json.Deserialize<Dictionary<string, object>>(await (await Enviar(criar)).Content.ReadAsStringAsync());

        static string Q(string s) => s.Replace("\\", "\\\\").Replace("'", "\\'");

        public async Task<string> Email()
        {
            var d = await Json(() => new HttpRequestMessage(HttpMethod.Get, Api + "about?fields=user(emailAddress)"));
            return ((d["user"] as Dictionary<string, object>)?["emailAddress"] as string) ?? "";
        }

        // ---------- pastas ----------
        async Task<string> AcharOuCriarPasta(string nome, string pai)
        {
            var q = $"name='{Q(nome)}' and mimeType='{Pasta}' and trashed=false and '{pai}' in parents";
            var d = await Json(() => new HttpRequestMessage(HttpMethod.Get, Api + "files?fields=files(id)&q=" + Uri.EscapeDataString(q)));
            var lista = d["files"] as System.Collections.ArrayList;
            if (lista != null && lista.Count > 0) return (lista[0] as Dictionary<string, object>)["id"] as string;
            var criado = await Json(() => new HttpRequestMessage(HttpMethod.Post, Api + "files?fields=id")
            { Content = new StringContent(json.Serialize(new { name = nome, mimeType = Pasta, parents = new[] { pai } }), Encoding.UTF8, "application/json") });
            return criado["id"] as string;
        }

        public async Task Preparar()
        {
            if (raizId == null) raizId = await AcharOuCriarPasta("MiguelAngelus", "root");
        }

        async Task<string> PastaDe(string sub)
        {
            await Preparar();
            if (!pastas.TryGetValue(sub, out var id)) pastas[sub] = id = await AcharOuCriarPasta(sub, raizId);
            return id;
        }

        static void Separar(string caminho, out string sub, out string nome)
        {
            var c = caminho.Replace('\\', '/'); var k = c.LastIndexOf('/');
            sub = k < 0 ? "" : c.Substring(0, k); nome = k < 0 ? c : c.Substring(k + 1);
        }

        static long Ms(object rfc3339) => (long)(DateTime.Parse(Convert.ToString(rfc3339), null, System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime()
            - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;

        // ---------- operações ----------
        public async Task<object[]> Listar(string sub)
        {
            var pid = await PastaDe(sub);
            var saida = new List<object>();
            string pagina = null;
            do
            {
                var url = Api + "files?pageSize=1000&fields=nextPageToken,files(id,name,size,modifiedTime)&q=" +
                          Uri.EscapeDataString($"'{pid}' in parents and trashed=false") + (pagina != null ? "&pageToken=" + pagina : "");
                var d = await Json(() => new HttpRequestMessage(HttpMethod.Get, url));
                foreach (Dictionary<string, object> f in (System.Collections.ArrayList)d["files"])
                {
                    var nome = f["name"] as string;
                    idsArquivos[sub + "/" + nome] = f["id"] as string;
                    saida.Add(new { nome, tamanho = f.TryGetValue("size", out var t) ? Convert.ToInt64(t) : 0L, mtime = Ms(f["modifiedTime"]) });
                }
                pagina = d.TryGetValue("nextPageToken", out var np) ? np as string : null;
            } while (pagina != null);
            return saida.ToArray();
        }

        async Task<string> IdDe(string caminho)
        {
            if (idsArquivos.TryGetValue(caminho, out var id)) return id;
            Separar(caminho, out var sub, out var nome);
            var pid = await PastaDe(sub);
            var d = await Json(() => new HttpRequestMessage(HttpMethod.Get, Api + "files?fields=files(id)&q=" +
                Uri.EscapeDataString($"name='{Q(nome)}' and '{pid}' in parents and trashed=false")));
            var lista = (System.Collections.ArrayList)d["files"];
            id = lista.Count > 0 ? (lista[0] as Dictionary<string, object>)["id"] as string : null;
            if (id != null) idsArquivos[caminho] = id;
            return id;
        }

        public async Task<object[]> LerVarios(IEnumerable<string> caminhos)
        {
            var trava = new System.Threading.SemaphoreSlim(6);
            var tarefas = caminhos.Select(async c =>
            {
                await trava.WaitAsync();
                try
                {
                    var id = await IdDe(c);
                    if (id == null) return (object)new { caminho = c, texto = (string)null, erro = "não existe" };
                    var r = await Enviar(() => new HttpRequestMessage(HttpMethod.Get, Api + "files/" + id + "?alt=media"));
                    return new { caminho = c, texto = Encoding.UTF8.GetString(await r.Content.ReadAsByteArrayAsync()), erro = (string)null };
                }
                catch (Exception ex) { return new { caminho = c, texto = (string)null, erro = ex.Message }; }
                finally { trava.Release(); }
            });
            return await Task.WhenAll(tarefas);
        }

        public async Task<object> Gravar(string caminho, byte[] dados, string tipo = "application/json")
        {
            var id = await IdDe(caminho);
            Dictionary<string, object> d;
            if (id != null)
                d = await Json(() => new HttpRequestMessage(new HttpMethod("PATCH"), ApiUpload + "files/" + id + "?uploadType=media&fields=id,modifiedTime")
                { Content = new ByteArrayContent(dados) { Headers = { ContentType = new MediaTypeHeaderValue(tipo) } } });
            else
            {
                Separar(caminho, out var sub, out var nome);
                var pid = await PastaDe(sub);
                d = await Json(() =>
                {
                    var multi = new MultipartContent("related");
                    multi.Add(new StringContent(json.Serialize(new { name = nome, parents = new[] { pid } }), Encoding.UTF8, "application/json"));
                    multi.Add(new ByteArrayContent(dados) { Headers = { ContentType = new MediaTypeHeaderValue(tipo) } });
                    return new HttpRequestMessage(HttpMethod.Post, ApiUpload + "files?uploadType=multipart&fields=id,modifiedTime") { Content = multi };
                });
                idsArquivos[caminho] = d["id"] as string;
            }
            return new { caminho, mtime = Ms(d["modifiedTime"]) };
        }

        public async Task Apagar(string caminho)
        {
            var id = await IdDe(caminho);
            if (id == null) return;
            await Enviar(() => new HttpRequestMessage(HttpMethod.Delete, Api + "files/" + id), aceitar404: true);
            idsArquivos.Remove(caminho);
        }

        public async Task<object> LerBinario(string caminho, long inicio, int tamanho)
        {
            var id = await IdDe(caminho) ?? throw new FileNotFoundException("não existe na nuvem: " + caminho);
            var meta = await Json(() => new HttpRequestMessage(HttpMethod.Get, Api + "files/" + id + "?fields=size"));
            var total = Convert.ToInt64(meta["size"]);
            if (inicio >= total) return new { ok = true, total, base64 = "" };
            var fim = Math.Min(total, inicio + tamanho) - 1;
            var r = await Enviar(() => { var q = new HttpRequestMessage(HttpMethod.Get, Api + "files/" + id + "?alt=media"); q.Headers.Range = new RangeHeaderValue(inicio, fim); return q; });
            return new { ok = true, total, base64 = Convert.ToBase64String(await r.Content.ReadAsByteArrayAsync()) };
        }

        // upload em partes (mídias grandes): pedaços de 4 MB (múltiplos de 256 KB), o último fecha o arquivo
        public async Task GravarBinario(string caminho, long inicio, byte[] dados, bool fim)
        {
            if (inicio == 0)
            {
                var id = await IdDe(caminho);
                Separar(caminho, out var sub, out var nome);
                var pid = await PastaDe(sub);
                var r = await Enviar(() => new HttpRequestMessage(id != null ? new HttpMethod("PATCH") : HttpMethod.Post,
                    ApiUpload + "files" + (id != null ? "/" + id : "") + "?uploadType=resumable&fields=id")
                { Content = new StringContent(id != null ? "{}" : json.Serialize(new { name = nome, parents = new[] { pid } }), Encoding.UTF8, "application/json") });
                sessoesUpload[caminho] = r.Headers.Location.ToString();
            }
            if (!sessoesUpload.TryGetValue(caminho, out var sessao)) throw new InvalidOperationException("envio interrompido; recomece");
            var req = new HttpRequestMessage(HttpMethod.Put, sessao) { Content = new ByteArrayContent(dados) };
            req.Content.Headers.ContentRange = dados.Length == 0
                ? new ContentRangeHeaderValue(inicio)                                            // bytes */total
                : fim ? new ContentRangeHeaderValue(inicio, inicio + dados.Length - 1, inicio + dados.Length)
                      : new ContentRangeHeaderValue(inicio, inicio + dados.Length - 1);           // bytes a-b/*
            var resp = await http.SendAsync(req);   // a URL da sessão já autoriza o envio
            if (!(resp.IsSuccessStatusCode || (int)resp.StatusCode == 308)) throw new InvalidOperationException($"envio da mídia falhou ({(int)resp.StatusCode})");
            if (fim) { sessoesUpload.Remove(caminho); idsArquivos.Remove(caminho); }
        }
    }
}
