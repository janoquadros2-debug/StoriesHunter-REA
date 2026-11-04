@echo off
setlocal
cd /d "%~dp0.."
where git >nul 2>&1 || (echo ERRO: instale Git para Windows e tente novamente.& pause & exit /b 1)
where gh >nul 2>&1 || (echo ERRO: instale GitHub CLI e tente novamente.& pause & exit /b 1)
gh auth status >nul 2>&1 || gh auth login
if errorlevel 1 (echo Login nao realizado.& pause & exit /b 1)
if not exist .git (git init & git branch -M main)
git remote get-url origin >nul 2>&1 || git remote add origin https://github.com/janoquadros2-debug/StoriesHunter-REA.git
git add .
git commit -m "Stories Hunter REA v1.0.3 - atualizador" 2>nul
git pull origin main --rebase
if errorlevel 1 (echo Problema ao sincronizar. Confira o Git.& pause & exit /b 1)
git push -u origin main
if errorlevel 1 (echo Falha na publicacao.& pause & exit /b 1)
echo Codigo publicado. Para criar release, use: git tag v1.0.3 e git push origin v1.0.3
pause
