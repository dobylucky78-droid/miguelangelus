# Gera uma versão ASSINADA do MiguelAngelus: publica o app, assina o .exe, monta o instalador, assina o instalador
# e copia para a área de trabalho e a pasta da pendrive.
# Antes: abrir o SimplySign Desktop e entrar (e-mail + código do app SimplySign no celular).
# Uso:  powershell -ExecutionPolicy Bypass -File instalador\gerar_versao.ps1
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
$signtool = Join-Path $PSScriptRoot 'signtool\signtool.exe'
$assinante = 'Open Source Developer Marcio Aurelio Rios Martins'
$carimbo = 'http://time.certum.pl'
$iscc = Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'

function Assinar($arquivo) {
  Write-Host "Assinando $arquivo"
  & $signtool sign /n $assinante /fd sha256 /tr $carimbo /td sha256 /d 'MiguelAngelus' $arquivo
  if ($LASTEXITCODE) { throw "Falhou ao assinar $arquivo (o SimplySign Desktop está aberto e conectado?)" }
  & $signtool verify /pa /q $arquivo
  if ($LASTEXITCODE) { throw "Assinatura não conferiu: $arquivo" }
}

# versão (do .iss)
$versao = ([regex]'#define Versao "([^"]+)"').Match((Get-Content (Join-Path $PSScriptRoot 'MiguelAngelus.iss') -Raw)).Groups[1].Value
$nomeInstalador = "Instalar MiguelAngelus $versao.exe"

# 1) publicar
$saida = Join-Path $raiz 'MiguelAngelus App'
if (Test-Path $saida) { Remove-Item -Recurse -Force $saida }
Push-Location (Join-Path $raiz 'app')
dotnet publish -c Release -o $saida | Select-Object -Last 1
if ($LASTEXITCODE) { throw 'dotnet publish falhou' }
Pop-Location

# 2) assinar o programa
Assinar (Join-Path $saida 'MiguelAngelus.exe')

# 3) instalador
& $iscc /Q (Join-Path $PSScriptRoot 'MiguelAngelus.iss')
if ($LASTEXITCODE) { throw 'Inno Setup falhou' }
$instalador = Join-Path $PSScriptRoot $nomeInstalador
Assinar $instalador

# 4) cópias
$mesa = Split-Path $raiz -Parent
Copy-Item $instalador (Join-Path $mesa $nomeInstalador) -Force
$pendrive = Join-Path $mesa 'Pendrive MiguelAngelus'
if (Test-Path $pendrive) { Copy-Item $instalador (Join-Path $pendrive $nomeInstalador) -Force }
Write-Host "Pronto: $nomeInstalador assinado por $assinante"
