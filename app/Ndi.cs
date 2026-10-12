// Transmissão da faixa de letras por NDI (com transparência), para o OBS (plugin DistroAV) ou outro programa NDI.
// Usa o NDI Runtime já instalado no computador (NDI Tools / NDI Runtime): nada do NDI vai junto com o MiguelAngelus.
// NDI® é marca registrada da Vizrt NDI AB.
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

namespace MiguelAngelus
{
    static class NdiNativo
    {
        const string Dll = "Processing.NDI.Lib.x64.dll";

        [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern IntPtr LoadLibrary(string caminho);

        [StructLayout(LayoutKind.Sequential)]
        internal struct CriarEnvio
        {
            public IntPtr nome;      // const char* (UTF-8)
            public IntPtr grupos;    // const char* (null = padrão)
            [MarshalAs(UnmanagedType.U1)] public bool relogioVideo;
            [MarshalAs(UnmanagedType.U1)] public bool relogioAudio;
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct QuadroVideo
        {
            public int largura, altura;
            public uint fourCC;
            public int taxaN, taxaD;
            public float proporcao;
            public int formato;          // 1 = progressivo
            public long timecode;
            public IntPtr dados;
            public int bytesPorLinha;
            public IntPtr metadados;
            public long timestamp;
        }

        [DllImport(Dll, CallingConvention = CallingConvention.Cdecl)] [return: MarshalAs(UnmanagedType.U1)]
        internal static extern bool NDIlib_initialize();
        [DllImport(Dll, CallingConvention = CallingConvention.Cdecl)]
        internal static extern IntPtr NDIlib_send_create(ref CriarEnvio cfg);
        [DllImport(Dll, CallingConvention = CallingConvention.Cdecl)]
        internal static extern void NDIlib_send_destroy(IntPtr envio);
        [DllImport(Dll, CallingConvention = CallingConvention.Cdecl)]
        internal static extern void NDIlib_send_send_video_v2(IntPtr envio, ref QuadroVideo quadro);
        [DllImport(Dll, CallingConvention = CallingConvention.Cdecl)]
        internal static extern int NDIlib_send_get_no_connections(IntPtr envio, uint esperaMs);

        static bool carregado;
        // Acha o runtime: variável do instalador do NDI (v6/v5) ou as pastas padrão do NDI Tools
        internal static string Carregar()
        {
            if (carregado) return null;
            var pastas = new[] {
                Environment.GetEnvironmentVariable("NDI_RUNTIME_DIR_V6"),
                Environment.GetEnvironmentVariable("NDI_RUNTIME_DIR_V5"),
                @"C:\Program Files\NDI\NDI 6 Tools\Runtime",
                @"C:\Program Files\NDI\NDI 6 Runtime\v6",
                @"C:\Program Files\NDI\NDI 5 Tools\Runtime",
            };
            foreach (var p in pastas)
            {
                if (string.IsNullOrEmpty(p)) continue;
                var dll = Path.Combine(p, Dll);
                if (File.Exists(dll) && LoadLibrary(dll) != IntPtr.Zero) { carregado = true; return null; }
            }
            return "NDI não encontrado neste computador. Instale o NDI Tools (gratuito, ndi.video/tools).";
        }
    }

    // Conteúdo da faixa vindo da página
    class Faixa
    {
        public string[] Linhas = new string[0];
        public bool[] Negrito = new bool[0];
        public string Fonte = "Segoe UI";
        public double Tamanho = 4.6;      // % da altura do vídeo
        public double Opacidade = 0.6;    // da faixa escura
        public string CorTexto = "#ffffff";
    }

    sealed class EnvioNdi : IDisposable
    {
        const int L = 1920, A = 1080;
        readonly IntPtr envio;
        readonly byte[] quadro = new byte[L * A * 4];
        readonly object trava = new object();
        readonly Thread laco;
        volatile bool rodando = true;

        public static EnvioNdi Criar(string nome, out string erro)
        {
            erro = NdiNativo.Carregar();
            if (erro != null) return null;
            if (!NdiNativo.NDIlib_initialize()) { erro = "Este processador não é compatível com o NDI."; return null; }
            return new EnvioNdi(nome);
        }

        EnvioNdi(string nome)
        {
            var bytesNome = System.Text.Encoding.UTF8.GetBytes(nome + "\0");
            var pNome = Marshal.AllocHGlobal(bytesNome.Length);
            Marshal.Copy(bytesNome, 0, pNome, bytesNome.Length);
            var cfg = new NdiNativo.CriarEnvio { nome = pNome, relogioVideo = true };
            envio = NdiNativo.NDIlib_send_create(ref cfg);
            Marshal.FreeHGlobal(pNome);
            if (envio == IntPtr.Zero) throw new InvalidOperationException("Não foi possível criar a fonte NDI.");
            laco = new Thread(Enviar) { IsBackground = true, Name = "NDI" };
            laco.Start();
        }

        public int Conexoes => envio == IntPtr.Zero ? 0 : NdiNativo.NDIlib_send_get_no_connections(envio, 0);

        // Repete o quadro atual 15 vezes por segundo (quem conectar depois já recebe a letra que está no ar)
        void Enviar()
        {
            var h = GCHandle.Alloc(quadro, GCHandleType.Pinned);
            try
            {
                while (rodando)
                {
                    var q = new NdiNativo.QuadroVideo
                    {
                        largura = L, altura = A, fourCC = 0x41524742 /* BGRA */, taxaN = 15, taxaD = 1,
                        proporcao = 16f / 9f, formato = 1, timecode = long.MaxValue, bytesPorLinha = L * 4,
                    };
                    lock (trava)
                    {
                        q.dados = h.AddrOfPinnedObject();
                        NdiNativo.NDIlib_send_send_video_v2(envio, ref q);   // com relógio: espera o tempo de 1 quadro
                    }
                }
            }
            finally { h.Free(); }
        }

        // Último conteúdo recebido: a faixa de letras e o 💠 Pix (redesenha os dois juntos quando um muda)
        Faixa ultimaFaixa = new Faixa();
        Bitmap pixQr, pixFaixa;
        double pixQrTam = 36, pixFaixaTam = 11;      // % da altura do vídeo (os mesmos do telão com a câmera)

        public void DefinirPix(bool on, string qr, string faixa, double qrTam, double faixaTam)
        {
            lock (trava) { pixQr?.Dispose(); pixFaixa?.Dispose(); pixQr = on ? ImagemDeDataUrl(qr) : null; pixFaixa = on ? ImagemDeDataUrl(faixa) : null; }
            pixQrTam = Math.Max(20, Math.Min(55, qrTam)); pixFaixaTam = Math.Max(6, Math.Min(20, faixaTam));
            Desenhar(ultimaFaixa);
        }

        // "data:image/png;base64,…" → Bitmap (só imagens guardadas no programa)
        static Bitmap ImagemDeDataUrl(string url)
        {
            if (string.IsNullOrEmpty(url) || !url.StartsWith("data:image/")) return null;
            int v = url.IndexOf(','); if (v < 0) return null;
            try { using (var ms = new MemoryStream(Convert.FromBase64String(url.Substring(v + 1)))) using (var b = new Bitmap(ms)) return new Bitmap(b); }
            catch { return null; }
        }

        public void Desenhar(Faixa f)
        {
            ultimaFaixa = f ?? new Faixa();
            f = ultimaFaixa;
            using (var bmp = new Bitmap(L, A, PixelFormat.Format32bppArgb))
            {
                using (var g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.Transparent);
                    if (f.Linhas.Length > 0) DesenharFaixa(g, f);
                    lock (trava) DesenharPix(g);
                }
                // depuração: MIGUELANGELUS_NDI_PNG=c:\pasta\quadro.png grava o quadro enviado (para conferir sem o OBS)
                var png = Environment.GetEnvironmentVariable("MIGUELANGELUS_NDI_PNG");
                if (!string.IsNullOrEmpty(png)) try { bmp.Save(png, ImageFormat.Png); } catch { }
                var d = bmp.LockBits(new Rectangle(0, 0, L, A), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                lock (trava) Marshal.Copy(d.Scan0, quadro, 0, quadro.Length);   // memória BGRA, alfa direto
                bmp.UnlockBits(d);
            }
        }

        static void DesenharFaixa(Graphics g, Faixa f)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            var familia = FamiliaOuPadrao(f.Fonte);
            float margemX = L * 0.06f, larguraUtil = L - 2 * margemX;
            float tam = (float)(A * f.Tamanho / 100.0);
            var fmt = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Near };
            // diminui a letra até a faixa caber em ~32% da altura
            float alturaTexto;
            while (true)
            {
                alturaTexto = 0;
                for (int i = 0; i < f.Linhas.Length; i++)
                    using (var fonte = new Font(familia, tam, Negrito(f, i) ? FontStyle.Bold : FontStyle.Regular, GraphicsUnit.Pixel))
                        alturaTexto += g.MeasureString(f.Linhas[i], fonte, (int)larguraUtil, fmt).Height;
                if (alturaTexto <= A * 0.32f || tam < A * 0.022f) break;
                tam *= 0.92f;
            }
            float pad = tam * 0.45f, base_ = A * 0.955f;
            float topo = base_ - alturaTexto - 2 * pad;
            using (var fundo = new SolidBrush(Color.FromArgb((int)(Math.Max(0, Math.Min(1, f.Opacidade)) * 255), 8, 10, 14)))
                g.FillRectangle(fundo, 0, topo, L, base_ - topo);
            var cor = ColorTranslator.FromHtml(string.IsNullOrEmpty(f.CorTexto) ? "#ffffff" : f.CorTexto);
            using (var pincel = new SolidBrush(cor))
            using (var sombra = new SolidBrush(Color.FromArgb(170, 0, 0, 0)))
            {
                float y = topo + pad;
                for (int i = 0; i < f.Linhas.Length; i++)
                    using (var fonte = new Font(familia, tam, Negrito(f, i) ? FontStyle.Bold : FontStyle.Regular, GraphicsUnit.Pixel))
                    {
                        var h = g.MeasureString(f.Linhas[i], fonte, (int)larguraUtil, fmt).Height;
                        var r = new RectangleF(margemX, y, larguraUtil, h);
                        var rs = r; rs.Offset(tam * 0.04f, tam * 0.05f);
                        g.DrawString(f.Linhas[i], fonte, sombra, rs, fmt);
                        g.DrawString(f.Linhas[i], fonte, pincel, r, fmt);
                        y += h;
                    }
            }
        }

        // Como no telão com a câmera: faixa do CNPJ no alto à esquerda, QR code no alto à direita, em cartões brancos
        void DesenharPix(Graphics g)
        {
            if (pixQr == null && pixFaixa == null) return;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            float topo = A * 0.025f, ladoX = L * 0.02f;
            if (pixQr != null)
            {
                float lado = (float)(A * pixQrTam / 100.0), pad = A * 0.012f;
                var r = new RectangleF(L - ladoX - lado, topo, lado, lado);
                Cartao(g, r, A * 0.012f);
                var ant = g.InterpolationMode; g.InterpolationMode = InterpolationMode.NearestNeighbor;   // QR nítido
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(pixQr, Caber(pixQr, RectangleF.Inflate(r, -pad, -pad)));
                g.InterpolationMode = ant; g.PixelOffsetMode = PixelOffsetMode.Default;
            }
            if (pixFaixa != null)
            {
                float alt = (float)(A * pixFaixaTam / 100.0), pad = A * 0.008f, maxL = L * 0.62f;
                float larg = Math.Min(maxL, (alt - 2 * pad) * pixFaixa.Width / Math.Max(1f, pixFaixa.Height) + 2 * pad);
                var r = new RectangleF(ladoX, topo, larg, alt);
                Cartao(g, r, A * 0.012f);
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.DrawImage(pixFaixa, Caber(pixFaixa, RectangleF.Inflate(r, -pad, -pad)));
            }
        }

        // cartão branco com cantos arredondados e uma sombra leve
        static void Cartao(Graphics g, RectangleF r, float raio)
        {
            using (var sombra = Arredondado(new RectangleF(r.X + raio * 0.3f, r.Y + raio * 0.5f, r.Width, r.Height), raio))
            using (var ps = new SolidBrush(Color.FromArgb(90, 0, 0, 0))) g.FillPath(ps, sombra);
            using (var c = Arredondado(r, raio)) g.FillPath(Brushes.White, c);
        }

        static GraphicsPath Arredondado(RectangleF r, float raio)
        {
            var p = new GraphicsPath(); float d = raio * 2;
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure(); return p;
        }

        // a imagem inteira dentro do retângulo, sem deformar (centralizada)
        static RectangleF Caber(Image img, RectangleF r)
        {
            float esc = Math.Min(r.Width / img.Width, r.Height / img.Height);
            float w = img.Width * esc, h = img.Height * esc;
            return new RectangleF(r.X + (r.Width - w) / 2, r.Y + (r.Height - h) / 2, w, h);
        }

        static bool Negrito(Faixa f, int i) => i < f.Negrito.Length && f.Negrito[i];

        static FontFamily FamiliaOuPadrao(string nome)
        {
            try { return new FontFamily(nome); } catch { return new FontFamily("Segoe UI"); }
        }

        public void Dispose()
        {
            rodando = false;
            laco?.Join(1000);
            if (envio != IntPtr.Zero) NdiNativo.NDIlib_send_destroy(envio);
            lock (trava) { pixQr?.Dispose(); pixFaixa?.Dispose(); }
        }
    }
}
