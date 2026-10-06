using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Threading.Tasks;

namespace MiguelAngelus
{
    // Câmeras PTZ por VISCA na rede (as mesmas do plugin "PTZ Controls" do OBS):
    //  "visca-ip"  = VISCA sobre IP (UDP, cabeçalho Sony de 8 bytes) — normalmente porta 52381
    //  "udp"       = VISCA puro por UDP — normalmente porta 1259
    //  "tcp"       = VISCA puro por TCP — normalmente porta 5678
    // A página monta o comando VISCA (ex.: 81 01 06 01 …) e o programa só entrega na rede.
    static class Visca
    {
        static readonly UdpClient udp = new UdpClient();
        static readonly Dictionary<string, TcpClient> tcp = new Dictionary<string, TcpClient>();
        static readonly object trava = new object();
        static uint seq;

        internal static Task<string> Enviar(string ip, int porta, string protocolo, byte[] cmd) => Task.Run(() =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(ip) || cmd == null || cmd.Length == 0) return "câmera sem IP";
                if (protocolo == "tcp")
                {
                    var chave = ip + ":" + porta;
                    lock (trava)
                    {
                        if (!tcp.TryGetValue(chave, out var c) || !c.Connected)
                        {
                            c?.Close();
                            c = new TcpClient { NoDelay = true };
                            if (!c.ConnectAsync(ip, porta).Wait(1500)) { c.Close(); tcp.Remove(chave); return "a câmera não respondeu (TCP " + porta + ")"; }
                            tcp[chave] = c;
                        }
                        c.GetStream().Write(cmd, 0, cmd.Length);
                    }
                    return null;
                }
                var pacote = cmd;
                if (protocolo != "udp")
                {
                    // VISCA sobre IP (Sony): tipo 0x0100 = comando, tamanho, nº de sequência
                    pacote = new byte[8 + cmd.Length];
                    pacote[0] = 0x01; pacote[1] = 0x00;
                    pacote[2] = (byte)(cmd.Length >> 8); pacote[3] = (byte)cmd.Length;
                    uint s; lock (trava) s = ++seq;
                    pacote[4] = (byte)(s >> 24); pacote[5] = (byte)(s >> 16); pacote[6] = (byte)(s >> 8); pacote[7] = (byte)s;
                    Array.Copy(cmd, 0, pacote, 8, cmd.Length);
                }
                lock (trava) udp.Send(pacote, pacote.Length, ip, porta);
                return null;
            }
            catch (Exception ex) { return ex.Message; }
        });
    }
}
