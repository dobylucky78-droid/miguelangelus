// Atualização automática do MiguelAngelus.
// Procura a versão mais nova nas "Releases" do repositório público no GitHub, baixa o instalador e SÓ instala se ele
// estiver assinado (Authenticode válido) pelo certificado do desenvolvedor. Fica desligada enquanto o próprio programa
// não estiver assinado (as versões de teste e as anteriores ao certificado nunca procuram atualização).
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

namespace MiguelAngelus
{
    static class Atualizacao
    {
        // De onde vem a versão nova (a página "Releases" do código público). Para testes: MIGUELANGELUS_ATUALIZACAO_URL
        const string UrlPadrao = "https://api.github.com/repos/dobylucky78-droid/miguelangelus/releases/latest";
        // Quem precisa ter assinado o instalador baixado (nome no certificado da Certum). Para testes: MIGUELANGELUS_ATUALIZACAO_ASSINANTE
        const string AssinantePadrao = "Open Source Developer Marcio Aurelio Rios Martins";

        static string Url => Environment.GetEnvironmentVariable("MIGUELANGELUS_ATUALIZACAO_URL") ?? UrlPadrao;
        static string Assinante => Environment.GetEnvironmentVariable("MIGUELANGELUS_ATUALIZACAO_ASSINANTE") ?? AssinantePadrao;
        internal static bool Teste => Environment.GetEnvironmentVariable("MIGUELANGELUS_ATUALIZACAO_URL") != null;

        static readonly HttpClient http = CriarHttp();
        static HttpClient CriarHttp()
        {
            System.Net.ServicePointManager.SecurityProtocol |= System.Net.SecurityProtocolType.Tls12;
            var c = new HttpClient { Timeout = TimeSpan.FromMinutes(30) };
            c.DefaultRequestHeaders.UserAgent.ParseAdd("MiguelAngelus/" + VersaoAtual);
            return c;
        }

        internal static Version VersaoAtual => typeof(Atualizacao).Assembly.GetName().Version;

        // Só procura atualização se ESTE programa já estiver assinado (ou em teste)
        internal static bool Ligada => Teste || AssinadoPor(Process.GetCurrentProcess().MainModule.FileName, Assinante, out _);

        static Version LerVersao(string tag)
        {
            var t = new string((tag ?? "").Trim().TrimStart('v', 'V').TakeWhile(ch => char.IsDigit(ch) || ch == '.').ToArray());
            if (!t.Contains('.')) t += ".0";
            return Version.TryParse(t, out var v) ? v : null;
        }
        static Version Normalizar(Version v) => new Version(v.Major, v.Minor, Math.Max(0, v.Build), Math.Max(0, v.Revision));

        // {ok, ligada, atual, nova, notas, url, tamanho, nome}
        internal static async Task<object> Verificar()
        {
            var atual = VersaoAtual.ToString(3);
            if (!Ligada) return new { ok = true, ligada = false, atual, nova = (string)null };
            var r = await http.GetAsync(Url);
            if ((int)r.StatusCode == 404) return new { ok = true, ligada = true, atual, nova = (string)null };   // ainda não há versões publicadas
            r.EnsureSuccessStatusCode();
            var j = new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<System.Collections.Generic.Dictionary<string, object>>(await r.Content.ReadAsStringAsync());
            var v = LerVersao(j.TryGetValue("tag_name", out var tg) ? tg as string : null);
            if (v == null || Normalizar(v) <= Normalizar(VersaoAtual)) return new { ok = true, ligada = true, atual, nova = (string)null };
            // o instalador anexado à versão (o primeiro .exe)
            var anexo = ((System.Collections.ArrayList)j["assets"]).Cast<System.Collections.Generic.Dictionary<string, object>>()
                .FirstOrDefault(a => (a["name"] as string ?? "").EndsWith(".exe", StringComparison.OrdinalIgnoreCase));
            if (anexo == null) return new { ok = true, ligada = true, atual, nova = (string)null };
            return new
            {
                ok = true, ligada = true, atual, nova = v.ToString(),
                notas = j.TryGetValue("body", out var b) ? b as string : "",
                url = anexo["browser_download_url"] as string,
                nome = anexo["name"] as string,
                tamanho = Convert.ToInt64(anexo["size"])
            };
        }

        // Baixa, confere a assinatura e (fora de teste) abre o instalador em modo silencioso. Devolve o caminho baixado.
        internal static async Task<string> BaixarEConferir(string url, Action<long, long> progresso)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out var u) || (u.Scheme != "https" && !(Teste && u.IsLoopback))) throw new InvalidOperationException("endereço inválido");
            var pasta = Path.Combine(Path.GetTempPath(), "MiguelAngelus-atualizacao");
            Directory.CreateDirectory(pasta);
            var destino = Path.Combine(pasta, "Instalar MiguelAngelus.exe");
            using (var r = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead))
            {
                r.EnsureSuccessStatusCode();
                var total = r.Content.Headers.ContentLength ?? 0;
                using (var de = await r.Content.ReadAsStreamAsync())
                using (var para = new FileStream(destino, FileMode.Create, FileAccess.Write))
                {
                    var buf = new byte[256 * 1024]; long feito = 0; int n;
                    while ((n = await de.ReadAsync(buf, 0, buf.Length)) > 0) { await para.WriteAsync(buf, 0, n); feito += n; progresso(feito, total); }
                }
            }
            if (!AssinadoPor(destino, Assinante, out var motivo))
            {
                try { File.Delete(destino); } catch { }
                throw new InvalidOperationException("o instalador baixado não tem a assinatura do MiguelAngelus (" + motivo + "); nada foi instalado");
            }
            return destino;
        }

        // Abre o instalador sem perguntas; ele fecha o programa aberto, instala por cima e reabre (ver [Run] no .iss)
        internal static void Instalar(string instalador)
        {
            if (Teste) return;   // em teste, só baixa e confere
            Process.Start(new ProcessStartInfo(instalador, "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS") { UseShellExecute = true });
        }

        // ---------- assinatura digital (Authenticode) ----------
        internal static bool AssinadoPor(string arquivo, string nome, out string motivo)
        {
            motivo = null;
            if (!AssinaturaValida(arquivo)) { motivo = "sem assinatura válida"; return false; }
            try
            {
                var cert = new X509Certificate2(X509Certificate.CreateFromSignedFile(arquivo));
                var sujeito = cert.GetNameInfo(X509NameType.SimpleName, false) ?? "";
                if (cert.Subject.IndexOf(nome, StringComparison.OrdinalIgnoreCase) < 0 && sujeito.IndexOf(nome, StringComparison.OrdinalIgnoreCase) < 0)
                { motivo = "assinado por outra pessoa: " + sujeito; return false; }
                return true;
            }
            catch (Exception ex) { motivo = ex.Message; return false; }
        }

        static bool AssinaturaValida(string arquivo)
        {
            var info = new WINTRUST_FILE_INFO { cbStruct = (uint)Marshal.SizeOf(typeof(WINTRUST_FILE_INFO)), pcwszFilePath = arquivo };
            var pInfo = Marshal.AllocHGlobal(Marshal.SizeOf(info));
            try
            {
                Marshal.StructureToPtr(info, pInfo, false);
                var dados = new WINTRUST_DATA
                {
                    cbStruct = (uint)Marshal.SizeOf(typeof(WINTRUST_DATA)), dwUIChoice = 2 /* WTD_UI_NONE */, fdwRevocationChecks = 0,
                    dwUnionChoice = 1 /* WTD_CHOICE_FILE */, pFile = pInfo, dwStateAction = 0, dwProvFlags = 0x00000080 /* revogação só da cadeia, em cache */
                };
                var acao = new Guid("00AAC56B-CD44-11d0-8CC2-00C04FC295EE");   // WINTRUST_ACTION_GENERIC_VERIFY_V2
                return WinVerifyTrust(IntPtr.Zero, ref acao, ref dados) == 0;
            }
            catch { return false; }
            finally { Marshal.FreeHGlobal(pInfo); }
        }

        [DllImport("wintrust.dll", CharSet = CharSet.Unicode)]
        static extern int WinVerifyTrust(IntPtr hwnd, ref Guid acao, ref WINTRUST_DATA dados);

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        struct WINTRUST_FILE_INFO
        {
            public uint cbStruct;
            [MarshalAs(UnmanagedType.LPWStr)] public string pcwszFilePath;
            public IntPtr hFile;
            public IntPtr pgKnownSubject;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct WINTRUST_DATA
        {
            public uint cbStruct;
            public IntPtr pPolicyCallbackData;
            public IntPtr pSIPClientData;
            public uint dwUIChoice;
            public uint fdwRevocationChecks;
            public uint dwUnionChoice;
            public IntPtr pFile;
            public uint dwStateAction;
            public IntPtr hWVTStateData;
            public IntPtr pwszURLReference;
            public uint dwProvFlags;
            public uint dwUIContext;
            public IntPtr pSignatureSettings;
        }
    }
}
