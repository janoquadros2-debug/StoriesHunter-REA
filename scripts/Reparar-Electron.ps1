$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
try {
  Write-Host '[1/4] Conferindo dependencias...' -ForegroundColor Cyan
  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Node.js/npm nao encontrado. Instale Node.js LTS pelo site nodejs.org.' }
  if (-not (Test-Path 'node_modules/electron/package.json')) {
    & npm.cmd install --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm install falhou. Confira a conexao e as mensagens anteriores.' }
  }
  $pkg = Get-Content 'node_modules/electron/package.json' -Raw | ConvertFrom-Json
  $version = [string]$pkg.version
  if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Versao do Electron invalida.' }
  $dist = Join-Path $root 'node_modules/electron/dist'
  $exe = Join-Path $dist 'electron.exe'
  if (-not (Test-Path $exe)) {
    Write-Host "[2/4] Baixando Electron oficial v$version (Windows x64). Pode ter mais de 100 MB..." -ForegroundColor Cyan
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $base = "https://github.com/electron/electron/releases/download/v$version"
    $file = "electron-v$version-win32-x64.zip"
    $temporary = Join-Path ([IO.Path]::GetTempPath()) ("stories-rea-electron-" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $temporary | Out-Null
    try {
      $archive = Join-Path $temporary $file
      $checksums = Join-Path $temporary 'SHASUMS256.txt'
      Invoke-WebRequest -Uri "$base/$file" -OutFile $archive -UseBasicParsing
      Invoke-WebRequest -Uri "$base/SHASUMS256.txt" -OutFile $checksums -UseBasicParsing
      $matchLine = Get-Content $checksums | Where-Object { $_ -match [regex]::Escape($file) + '$' } | Select-Object -First 1
      if (-not $matchLine) { throw 'Checksum do arquivo nao encontrado na lista oficial.' }
      $expected = ($matchLine -split '\s+')[0].ToLowerInvariant()
      $actual = (Get-FileHash -Path $archive -Algorithm SHA256).Hash.ToLowerInvariant()
      if ($actual -ne $expected) { throw 'Falha na verificacao SHA256. Download interrompido por seguranca.' }
      Write-Host '[3/4] Arquivo verificado. Extraindo executavel...' -ForegroundColor Cyan
      if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
      New-Item -ItemType Directory -Force -Path $dist | Out-Null
      Expand-Archive -LiteralPath $archive -DestinationPath $dist -Force
    } finally {
      if (Test-Path $temporary) { Remove-Item $temporary -Recurse -Force -ErrorAction SilentlyContinue }
    }
  } else {
    Write-Host '[2/4] Electron ja possui executavel.' -ForegroundColor Green
    Write-Host '[3/4] Nao e necessario baixar novamente.' -ForegroundColor Green
  }
  if (-not (Test-Path $exe)) { throw 'Electron.exe continua ausente apos a extracao.' }
  Set-Content -Path (Join-Path $root 'node_modules/electron/path.txt') -Value 'electron.exe' -NoNewline -Encoding ASCII
  Write-Host '[4/4] Reparacao concluida. Abrindo aplicativo...' -ForegroundColor Green
  exit 0
} catch {
  Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'Se o download oficial foi bloqueado pela rede ou antivirus, o script nao consegue contornar essa restricao.' -ForegroundColor Yellow
  exit 1
}
