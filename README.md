# MiguelAngelus

**Projeção para a Missa** — aplicativo gratuito para Windows usado pela PASCOM da Paróquia São José Operário (Rio de Janeiro)
para projetar as celebrações no telão.

Site: https://pascom-sjo.github.io/

- Criado por **Miguel**, que idealizou o projeto.
- Desenvolvido por **Marcio Aurelio Rios Martins**.

## O que ele faz

- Lê o folheto da Missa (PDF, Word ou texto) e monta o roteiro: cantos, leituras, salmo, preces e orações,
  com as falas do padre e do povo marcadas (P., T., L.).
- Banco de cantos por momento da Missa, orações por categoria, Bíblia (formato Zefania XML), calendário litúrgico
  e liturgia diária.
- Vídeos e áudios das pastas do computador (inclusive a pasta de mídias do Holyrics), apresentações e câmeras ao vivo.
- Temas e imagens de cada comunidade no telão, aviso na tela, botão "Altar".
- Faixa com as letras para o OBS por NDI.
- Sincronização opcional entre computadores pelo Google Drive da própria paróquia (escopo `drive.file`).

## Como o código está organizado

| Pasta | Conteúdo |
|---|---|
| `lumen/` | A interface (HTML, CSS e JavaScript): tela do operador (`index.html`) e telão (`projecao.html`). |
| `app/` | O aplicativo Windows em C# (.NET Framework 4.8 + WebView2): janelas, NDI, Google Drive, pastas de mídia. |
| `instalador/` | Script do Inno Setup que gera o instalador. |

O nome interno `lumen` e o endereço `miguelyrics.example` vêm de versões anteriores e foram mantidos para não perder os dados já guardados.

## Como compilar

Requisitos: Windows 10/11, .NET SDK 8 (compila para .NET Framework 4.8), runtime do WebView2. Para o instalador, Inno Setup 6.

```
cd app
dotnet publish -c Release -o "../MiguelAngelus App"
"%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" ..\instalador\MiguelAngelus.iss
```

A interface também abre direto no Chrome (`lumen/index.html`), sem os recursos do aplicativo (NDI, pastas, Google Drive).

## O que não está aqui

Cantos, folhetos, roteiros, orações da paróquia, credenciais do Google e fotos de pessoas **não** fazem parte do código:
cada instalação guarda os seus dados no próprio computador ou no Google Drive da paróquia.

## Licença

Código sob a licença MIT (veja `LICENSE`). A biblioteca PDF.js (`lumen/lib/pdfjs`) é da Mozilla, sob a licença Apache 2.0.
Textos litúrgicos e letras de cantos pertencem aos seus autores e editoras.
