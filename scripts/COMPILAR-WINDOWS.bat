@echo off
cd /d "%~dp0.."
echo === STORIES HUNTER REA - COMPILACAO ===
where node >nul 2>nul
if errorlevel 1 (echo Instale Node.js LTS antes de continuar.&goto error)
call npm install
if errorlevel 1 goto error
call npm test
if errorlevel 1 goto error
call npm run dist:win
if errorlevel 1 goto error
echo.
echo Instalador criado na pasta dist.
pause
exit /b 0
:error
echo.
echo ERRO: veja a mensagem acima. Esta janela nao fecha automaticamente.
pause
exit /b 1
