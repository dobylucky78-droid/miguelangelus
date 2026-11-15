// (Secretaria — protótipo da Agenda Google, 15/11/2026) A agenda compartilhada da secretaria numa conta do Google
// PRÓPRIA, separada da conta do Drive (a nuvem que leva Agenda/Avisos para o MiguelAngelus).
// - Login: o mesmo jeito do Drive (navegador do sistema + retorno em 127.0.0.1, PKCE), com "select_account" para
//   poder escolher OUTRA conta. Usa o mesmo ID do cliente OAuth do Drive (ou um JSON carregado só para a agenda).
// - Escopos: calendar.events (ler e gravar compromissos) + calendar.calendarlist.readonly (ver quais agendas a conta enxerga).
// - O acesso fica criptografado com o usuário do Windows (DPAPI) em google-agenda.dat, separado do google.dat do Drive.
// - Nada da agenda é guardado no computador: a página pede à API cada vez que mostra.
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
    sealed class GoogleAgenda
    {
        const string Escopos = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly openid email";
        const string Api = "https://www.googleapis.com/calendar/v3/";
        readonly HttpClient http;
        readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
        readonly string arquivo = Path.Combine(Program.PastaDados, "google-agenda.dat");
        string clienteId, clienteSegredo, refreshToken, accessToken, email;
        DateTime expira;

        public GoogleAgenda(HttpClient http) { this.http = http; Carregar(); }

        public bool TemCliente => !string.IsNullOrEmpty(clienteId);
        public bool Conectado => !string.IsNullOrEmpty(refreshToken);
        public string Email => email;

        void Carregar()
        {
            try
            {
                if (!File.Exists(arquivo)) return;
                var d = json.Deserialize<Dictionary<string, string>>(Encoding.UTF8.GetString(
                    ProtectedData.Unprotect(File.ReadAllBytes(arquivo), null, DataProtectionScope.CurrentUser)));
                d.TryGetValue("cliente", out clienteId); d.TryGetValue("segredo", out clienteSegredo);
                d.TryGetValue("refresh", out refreshToken); d.TryGetValue("email", out email);
            }
            catch { }
        }

        void Guardar()
        {
            var d = new Dictionary<string, string> { ["cliente"] = clienteId, ["segredo"] = clienteSegredo, ["refresh"] = refreshToken, ["email"] = email };
            Directory.CreateDirectory(Path.GetDirectoryName(arquivo));
            File.WriteAllBytes(arquivo, ProtectedData.Protect(Encoding.UTF8.GetBytes(json.Serialize(d)), null, DataProtectionScope.CurrentUser));
        }

        // o mesmo ID do cliente do Drive (se a agenda ainda não tiver um próprio)
        public void UsarClienteSeFaltar(string id, string segredo)
        {
            if (TemCliente || string.IsNullOrEmpty(id)) return;
            clienteId = id; clienteSegredo = segredo;
        }

        public void DefinirCliente(string textoJson)
        {
            var raiz = json.Deserialize<Dictionary<string, object>>(textoJson);
            var inst = (raiz.TryGetValue("installed", out var i) ? i : raiz.TryGetValue("web", out var w) ? w : raiz) as Dictionary<string, object>;
            var id = inst?["client_id"] as string;
            var seg = inst != null && inst.TryGetValue("client_secret", out var s) ? s as string : null;
            if (string.IsNullOrEmpty(id) || !id.EndsWith(".apps.googleusercontent.com")) throw new InvalidOperationException("este arquivo não é um ID do cliente OAuth do Google");
            if (id != clienteId) { refreshToken = null; accessToken = null; email = null; }
            clienteId = id; clienteSegredo = seg;
            Guardar();
        }

        public void Desconectar() { refreshToken = null; accessToken = null; email = null; Guardar(); }

        static string Base64Url(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        public async Task Conectar()
        {
            if (!TemCliente) throw new InvalidOperationException("falta o ID do cliente do Google (o mesmo JSON da nuvem)");
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
                        ? "<h2 style='font-family:Segoe UI'>&#10004; Agenda ligada &agrave; Secretaria MiguelAngelus.</h2><p style='font-family:Segoe UI'>Pode fechar esta aba e voltar ao programa.</p>"
                        : "<h2 style='font-family:Segoe UI'>N&atilde;o foi poss&iacute;vel ligar a agenda.</h2><p style='font-family:Segoe UI'>" + WebUtility.HtmlEncode(erro ?? "") + "</p>";
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
                // e-mail da conta (só para mostrar qual conta está ligada)
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
                if (texto.Contains("invalid_grant")) { refreshToken = null; Guardar(); throw new InvalidOperationException("o acesso à agenda expirou: ligue a conta de novo"); }
                throw new InvalidOperationException("Google: " + (d.TryGetValue("error_description", out var e) ? e : texto));
            }
            accessToken = d["access_token"] as string;
            expira = DateTime.UtcNow.AddSeconds(Convert.ToDouble(d["expires_in"]) - 60);
            return d;
        }

        async Task<string> Acesso()
        {
            if (!Conectado) throw new InvalidOperationException("a agenda não está ligada a uma conta");
            if (accessToken == null || DateTime.UtcNow >= expira)
                await Token(new Dictionary<string, string> { ["client_id"] = clienteId, ["client_secret"] = clienteSegredo ?? "", ["refresh_token"] = refreshToken, ["grant_type"] = "refresh_token" });
            return accessToken;
        }

        // Chamada à API do Google Agenda. Só caminhos de agenda (nada de outras APIs do Google).
        public async Task<object> Chamar(string metodo, string caminho, object corpo)
        {
            caminho = caminho ?? "";
            if (!(caminho.StartsWith("calendars/") || caminho.StartsWith("users/me/calendarList")) || caminho.Contains("..") || caminho.Contains("://"))
                throw new InvalidOperationException("caminho da agenda inválido");
            metodo = (metodo ?? "GET").ToUpperInvariant();
            if (!new[] { "GET", "POST", "PATCH", "PUT", "DELETE" }.Contains(metodo)) throw new InvalidOperationException("método inválido");
            for (int tentativa = 0; ; tentativa++)
            {
                var req = new HttpRequestMessage(new HttpMethod(metodo), Api + caminho);
                if (corpo != null && metodo != "GET" && metodo != "DELETE")
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
                if (texto.Contains("accessNotConfigured") || texto.Contains("SERVICE_DISABLED"))
                    msg = "a API do Google Agenda não está ativada no projeto do Google Cloud (APIs e serviços → Ativar → Google Calendar API)";
                throw new InvalidOperationException($"Google Agenda ({(int)r.StatusCode}): {msg}");
            }
        }
    }
}
