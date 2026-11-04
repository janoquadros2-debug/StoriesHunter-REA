@echo off
setlocal
cd /d "%~dp0.."
title Stories Hunter REA - Reparacao automatica
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Reparar-Electron.ps1"
if errorlevel 1 (
 echo.
 echo Nao foi possivel concluir o reparo. Leia a mensagem acima.
 pause
 exit /b 1
)
echo.
echo Abrindo Stories Hunter REA...
"%CD%\node_modules\electron\dist\electron.exe" "%CD%"
if errorlevel 1 (
 echo O aplicativo retornou um erro. Veja acima.
 pause
)
endlocal
