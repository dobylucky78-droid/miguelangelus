// (Secretaria — portal das pastorais, 24/11/2026) Cria e atualiza o portal (um projeto do Google Apps Script) NA CONTA DA PARÓQUIA,
// direto da Secretaria: o código do portal vai dentro do programa (web/portal), a secretária só clica em "Permitir".
// - Login: o mesmo jeito da nuvem e da agenda (navegador do sistema + retorno em 127.0.0.1, PKCE, "select_account").
//   Usa o mesmo ID do cliente OAuth da nuvem (o projeto do Google Cloud precisa ter a "Apps Script API" ativada).
// - Escopos: script.projects (criar o projeto e pôr o código) + script.deployments (publicar como app da Web).
//   Não dão acesso ao Drive, ao Gmail nem a nada da conta além dos projetos do Apps Script.
// - O acesso fica criptografado com o usuário do Windows (DPAPI) em google-portal.dat, separado da nuvem e da agenda.
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
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace MiguelAngelus
{
    sealed class GooglePortal
    {
        const string Escopos = "https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments openid email";
        const string Api = "https://script.googleapis.com/v1/";
        readonly HttpClient http;
        readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
        readonly string arquivo = Path.Combine(Program.PastaDados, "google-portal.dat");
        string clienteId, clienteSegredo, refreshToken, accessToken, email;
        // (1.7.1) "1" = conta à parte: o portal (e as agendas) usam um arquivo do Google próprio, de outra conta,
        // sem depender do projeto da ☁ nuvem. Vazio = o mesmo arquivo da nuvem (como na 1.7.0).
        string proprio;
        DateTime expira;

        public GooglePortal(HttpClient http) { this.http = http; Carregar(); }

        public bool TemCliente => !string.IsNullOrEmpty(clienteId);
        public bool Conectado => !string.IsNullOrEmpty(refreshToken);
        public bool Proprio => proprio == "1";
        public string Email => email;

        void Carregar()
        {
            try
            {
                if (!File.Exists(arquivo)) return;
                var d = json.Deserialize<Dictionary<string, string>>(Encoding.UTF8.GetString(
                    ProtectedData.Unprotect(File.ReadAllBytes(arquivo), null, DataProtectionScope.CurrentUser)));
                d.TryGetValue("cliente", out clienteId); d.TryGetValue("segredo", out clienteSegredo);
                d.TryGetValue("refresh", out refreshToken); d.TryGetValue("email", out email); d.TryGetValue("proprio", out proprio);
            }
            catch { }
        }

        void Guardar()
        {
            var d = new Dictionary<string, string> { ["cliente"] = clienteId, ["segredo"] = clienteSegredo, ["refresh"] = refreshToken, ["email"] = email, ["proprio"] = proprio };
            Directory.CreateDirectory(Path.GetDirectoryName(arquivo));
            File.WriteAllBytes(arquivo, ProtectedData.Protect(Encoding.UTF8.GetBytes(json.Serialize(d)), null, DataProtectionScope.CurrentUser));
        }

        // o mesmo ID do cliente da nuvem; se a nuvem trocou de cliente, o acesso antigo não vale mais
        public void UsarCliente(string id, string segredo)
        {
            if (Proprio || string.IsNullOrEmpty(id) || id == clienteId) return;      // conta à parte: a nuvem não manda aqui
            if (clienteId != null) { refreshToken = null; accessToken = null; email = null; }
            clienteId = id; clienteSegredo = segredo;
        }

        // (1.7.1) conta à parte: o arquivo JSON do ID do cliente (Google Cloud → Clientes → App para computador)
        public void DefinirCliente(string textoJson)
        {
            var raiz = json.Deserialize<Dictionary<string, object>>(textoJson);
            var inst = (raiz.TryGetValue("installed", out var i) ? i : raiz.TryGetValue("web", out var w) ? w : raiz) as Dictionary<string, object>;
            var id = inst != null && inst.TryGetValue("client_id", out var ci) ? ci as string : null;
            var seg = inst != null && inst.TryGetValue("client_secret", out var s) ? s as string : null;
            if (string.IsNullOrEmpty(id) || !id.EndsWith(".apps.googleusercontent.com")) throw new InvalidOperationException("este arquivo não é um ID do cliente OAuth do Google");
            if (id != clienteId) { refreshToken = null; accessToken = null; email = null; }
            clienteId = id; clienteSegredo = seg; proprio = "1";
            Guardar();
        }

        // (1.7.1) volta a usar o arquivo da ☁ nuvem (sai da conta à parte)
        public void UsarDaNuvem(string id, string segredo)
        {
            proprio = null; refreshToken = null; accessToken = null; email = null;
            clienteId = string.IsNullOrEmpty(id) ? null : id; clienteSegredo = segredo;
            Guardar();
        }

        public void Desconectar() { refreshToken = null; accessToken = null; email = null; Guardar(); }

        static string Base64Url(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        public async Task Conectar()
        {
            if (!TemCliente) throw new InvalidOperationException("ligue antes a nuvem da paróquia (Ajustes → Sincronização): o portal usa o mesmo ID do cliente do Google");
            var ouvinte = new TcpListener(IPAddress.Loopback, 0);
            ouvinte.Start();
            try
            {
                var retorno = $"http://127.0.0.1:{((IPEndPoint)ouvinte.LocalEndpoint).Port}/";
                var rnd = new byte[32]; using (var g = RandomNumberGenerator.Create()) g.GetBytes(rnd);
                var verificador = Base64Url(rnd);
                string desafio; using (var sha = SHA256.Create()) desafio = Base64Url(sha.ComputeHash(Encoding.ASCII.GetBytes(verificador)));
                var estado = Guid.NewGuid().ToString("N");
                var url = "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&access_type=offline&prompt=" + Uri.EscapeDataString("select_account consent") +
                          "&client_id=" + Uri.EscapeDataString(clienteId) + "&redirect_uri=" + Uri.EscapeDataString(retorno) +
                          "&scope=" + Uri.EscapeDataString(Escopos) + "&code_challenge=" + desafio + "&code_challenge_method=S256&state=" + estado;
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });

                var aceitar = ouvinte.AcceptTcpClientAsync();
                if (await Task.WhenAny(aceitar, Task.Delay(TimeSpan.FromMinutes(5))) != aceitar) throw new TimeoutException("o login no navegador não foi concluído");
                string codigo, erro;
                using (var cli = aceitar.Result)
                using (var fluxo = cli.GetStream())
                {
                    var buf = new byte[8192]; var n = await fluxo.ReadAsync(buf, 0, buf.Length);
                    var consulta = Encoding.ASCII.GetString(buf, 0, n).Split('\n')[0].Split(' ').ElementAtOrDefault(1) ?? "";
                    var q = consulta.Contains("?") ? consulta.Substring(consulta.IndexOf('?') + 1).Split('&')
                        .Select(p => p.Split('=')).ToDictionary(p => p[0], p => p.Length > 1 ? Uri.UnescapeDataString(p[1]) : "") : new Dictionary<string, string>();
                    q.TryGetValue("code", out codigo); q.TryGetValue("error", out erro);
                    if (!q.TryGetValue("state", out var est) || est != estado) { codigo = null; erro = erro ?? "resposta inválida"; }
                    var html = codigo != null
                        ? "<h2 style='font-family:Segoe UI'>&#10004; Secretaria MiguelAngelus pode criar o portal das pastorais.</h2><p style='font-family:Segoe UI'>Pode fechar esta aba e voltar ao programa.</p>"
                        : "<h2 style='font-family:Segoe UI'>N&atilde;o foi poss&iacute;vel ligar.</h2><p style='font-family:Segoe UI'>" + WebUtility.HtmlEncode(erro ?? "") + "</p>";
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
                email = null;
                if (tok.TryGetValue("id_token", out var idt) && idt is string jwt && jwt.Split('.').Length > 1)
                    try
                    {
                        var p = jwt.Split('.')[1].Replace('-', '+').Replace('_', '/'); p += new string('=', (4 - p.Length % 4) % 4);
                        var d = json.Deserialize<Dictionary<string, object>>(Encoding.UTF8.GetString(Convert.FromBase64String(p)));
                        email = d.TryGetValue("email", out var e) ? e as string : null;
                    }
                    catch { }
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
                if (texto.Contains("invalid_grant")) { refreshToken = null; Guardar(); throw new InvalidOperationException("o acesso para criar o portal expirou: clique de novo"); }
                throw new InvalidOperationException("Google: " + (d.TryGetValue("error_description", out var e) ? e : texto));
            }
            accessToken = d["access_token"] as string;
            expira = DateTime.UtcNow.AddSeconds(Convert.ToDouble(d["expires_in"]) - 60);
            return d;
        }

        async Task<string> Acesso()
        {
            if (!Conectado) throw new InvalidOperationException("a Secretaria ainda não tem permissão para criar o portal");
            if (accessToken == null || DateTime.UtcNow >= expira)
                await Token(new Dictionary<string, string> { ["client_id"] = clienteId, ["client_secret"] = clienteSegredo ?? "", ["refresh_token"] = refreshToken, ["grant_type"] = "refresh_token" });
            return accessToken;
        }

        // Chamada à API do Apps Script. Só caminhos de projetos ("projects" ou "projects/<id>/...").
        // Erros conhecidos voltam com um código no começo da mensagem, para a página explicar o que fazer:
        //   [API_USUARIO]  a conta não ligou a "API do Google Apps Script" (script.google.com/home/usersettings)
        //   [API_CLOUD]<url>  o projeto do Google Cloud não ativou a "Apps Script API" (url para ativar)
        public async Task<object> Chamar(string metodo, string caminho, object corpo)
        {
            caminho = caminho ?? "";
            if (!Regex.IsMatch(caminho, @"^projects(/[\w-]+(/(content|versions|deployments)(/[\w-]+)?)?)?$"))
                throw new InvalidOperationException("caminho do Apps Script inválido");
            metodo = (metodo ?? "GET").ToUpperInvariant();
            if (!new[] { "GET", "POST", "PUT" }.Contains(metodo)) throw new InvalidOperationException("método inválido");
            for (int tentativa = 0; ; tentativa++)
            {
                var req = new HttpRequestMessage(new HttpMethod(metodo), Api + caminho);
                if (corpo != null && metodo != "GET")
                    req.Content = new StringContent(json.Serialize(corpo), Encoding.UTF8, "application/json");
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await Acesso());
                var r = await http.SendAsync(req);
                var texto = await r.Content.ReadAsStringAsync();
                if (r.IsSuccessStatusCode) return string.IsNullOrWhiteSpace(texto) ? null : json.DeserializeObject(texto);
                if (((int)r.StatusCode == 429 || (int)r.StatusCode >= 500 || r.StatusCode == HttpStatusCode.Unauthorized) && tentativa < 3)
                {
                    if (r.StatusCode == HttpStatusCode.Unauthorized) accessToken = null;
                    await Task.Delay(800 * (tentativa + 1));
                    continue;
                }
                string msg = texto;
                try { var d = json.Deserialize<Dictionary<string, object>>(texto); if (d["error"] is Dictionary<string, object> e && e.TryGetValue("message", out var mm)) msg = mm as string; } catch { }
                if (texto.Contains("has not enabled the Apps Script API") || texto.Contains("usersettings")) msg = "[API_USUARIO]" + msg;
                else if (texto.Contains("SERVICE_DISABLED") || texto.Contains("accessNotConfigured") || texto.Contains("has not been used in project"))
                {
                    var u = Regex.Match(texto, @"https://console\.(developers|cloud)\.google\.com/apis/[^\s""\\]+");
                    msg = "[API_CLOUD]" + (u.Success ? u.Value : "https://console.cloud.google.com/apis/library/script.googleapis.com");
                }
                throw new InvalidOperationException($"Apps Script ({(int)r.StatusCode}): {msg}");
            }
        }
    }
}
