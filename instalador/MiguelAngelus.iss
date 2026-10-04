; Instalador do MiguelAngelus (Inno Setup 6).
; Gerar: "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" MiguelAngelus.iss
; Antes, gere o aplicativo: cd ..\app && dotnet publish -c Release -o "..\MiguelAngelus App"
;
; - Instala por usuário, sem pedir administrador (pode escolher "para todos" se quiser).
; - Os dados (cantos, roteiros…) ficam em %LOCALAPPDATA%\MiguelAngelus e NÃO são apagados ao desinstalar
;   nem ao instalar uma versão nova por cima.

#define Nome "MiguelAngelus"
#define Versao "1.3.1"
#define Editor "Paróquia São José Operário — PASCOM"

[Setup]
; AppId fixo: versões novas instalam por cima desta
AppId={{07F33A85-E3B2-4274-9CEA-8B0666E1EF72}
AppName={#Nome}
AppVersion={#Versao}
AppVerName={#Nome} {#Versao}
AppPublisher={#Editor}
AppComments=Projeção para a Missa
VersionInfoVersion=1.1.0.0
VersionInfoDescription=Instalador do {#Nome}
DefaultDirName={autopf}\{#Nome}
DefaultGroupName={#Nome}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir=.
OutputBaseFilename=Instalar MiguelAngelus {#Versao}
SetupIconFile=..\lumen\img\miguelangelus.ico
UninstallDisplayIcon={app}\MiguelAngelus.exe
UninstallDisplayName={#Nome}
WizardStyle=modern
DisableWelcomePage=no
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "pt"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "atalho"; Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Atalhos:"

[Files]
Source: "..\MiguelAngelus App\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#Nome}"; Filename: "{app}\MiguelAngelus.exe"; Comment: "Projeção para a Missa"
Name: "{group}\Manual do {#Nome}"; Filename: "{app}\web\Manual do MiguelAngelus.html"
Name: "{group}\Desinstalar o {#Nome}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#Nome}"; Filename: "{app}\MiguelAngelus.exe"; Tasks: atalho; Comment: "Projeção para a Missa"

[Run]
Filename: "{app}\MiguelAngelus.exe"; Description: "Abrir o {#Nome} agora"; Flags: nowait postinstall skipifsilent
; atualização automática (instalação silenciosa): reabre o programa sozinho no fim
Filename: "{app}\MiguelAngelus.exe"; Flags: nowait postinstall skipifnotsilent

[Messages]
pt.WelcomeLabel2=Este assistente vai instalar o [name/ver] neste computador.%n%nO MiguelAngelus é o programa de projeção para a Missa da Paróquia São José Operário.%n%nSe já houver uma versão instalada, ela será atualizada e os cantos, roteiros e demais dados serão mantidos.

[Code]
// Avisa (sem impedir) se faltar o WebView2 ou o .NET Framework 4.8, que o programa usa
function TemWebView2: Boolean;
var v: String;
begin
  Result :=
    RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', v) and (v <> '') and (v <> '0.0.0.0') or
    RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', v) and (v <> '') and (v <> '0.0.0.0');
end;

function TemDotNet48: Boolean;
var r: Cardinal;
begin
  Result := RegQueryDWordValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Release', r) and (r >= 528040);
end;

function InitializeSetup: Boolean;
var faltando: String;
begin
  Result := True;
  faltando := '';
  if not TemWebView2 then faltando := faltando + #13#10 + '• Microsoft Edge WebView2 (go.microsoft.com/fwlink/p/?LinkId=2124703)';
  if not TemDotNet48 then faltando := faltando + #13#10 + '• .NET Framework 4.8 (Windows Update)';
  if faltando <> '' then
    Result := MsgBox('Este computador ainda não tem:' + faltando + #13#10#13#10 +
      'O MiguelAngelus precisa deles para abrir. Você pode instalar agora e baixar isso depois.' + #13#10#13#10 +
      'Continuar a instalação?', mbConfirmation, MB_YESNO) = IDYES;
end;
