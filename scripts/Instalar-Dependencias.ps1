# Execute no PowerShell: powershell -ExecutionPolicy Bypass -File .\scripts\Instalar-Dependencias.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $root 'tools'
New-Item -ItemType Directory -Force -Path $tools | Out-Null
Write-Host 'Instalando yt-dlp na pasta tools...' -ForegroundColor Cyan
$uri = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
Invoke-WebRequest -Uri $uri -OutFile (Join-Path $tools 'yt-dlp.exe') -UseBasicParsing
& (Join-Path $tools 'yt-dlp.exe') --version
Write-Host 'yt-dlp instalado. Para extração de MP3 e mesclagem avançada, instale FFmpeg separadamente.' -ForegroundColor Green
Write-Host 'Após instalar, execute npm start ou compile npm run dist:win.'
