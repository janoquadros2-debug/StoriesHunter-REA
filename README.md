<<<<<<< HEAD
# Stories Hunter REA

Aplicativo independente para Windows em Electron.

## Estado

Repositório inicializado. O código da versão local e o sistema de atualizações ainda precisam ser publicados e validados.

## Atualizações

O atualizador será distribuído por instaladores NSIS assinados ou devidamente verificados, publicados em GitHub Releases. **Atenção:** um repositório privado não permite que instalações comuns consultem e baixem releases automaticamente sem autenticação. Não coloque tokens pessoais no aplicativo.

Projeto independente; não afiliado ao Instagram ou Meta.
=======
# Stories Hunter REA — Windows (v1.0.1)

Aplicativo **independente** de gerenciamento de downloads de mídias do Instagram, com Electron, visual moderno e backend `yt-dlp` (ferramenta de terceiros). **Não é afiliado, patrocinado ou aprovado pela Meta/Instagram**. Nenhuma imagem, marca ou código do aplicativo original foi copiado.

## O que está implementado
- Interface desktop em português com navegação, visualização e diagnóstico.
- Validação de URLs de posts, reels, stories, destaques e perfis no domínio oficial do Instagram.
- Consulta de título, miniatura, autor e quantidade de itens **quando o extrator permitir**.
- Fila sequencial com progresso, cancelamento, mensagens de erro e histórico local.
- Download do melhor formato disponível ou qualidade máxima selecionada.
- Modo extração MP3 (depende de FFmpeg), pasta configurável e abrir pasta.
- Instalador Windows x64 (NSIS) e workflow GitHub Actions para gerar um `.exe`.

## Limites importantes
O Instagram muda seus controles de acesso. Posts públicos podem funcionar, mas **stories, highlights e perfis completos podem falhar**, mesmo públicos, por restrições do site ou do extrator. Não há suporte para contas privadas, conteúdo restrito, bypass de login ou obtenção de credenciais. Não oferece download em lote indiscriminado; links de perfis usam o tratamento padrão do yt-dlp, que pode retornar conteúdo limitado. Áudio e mesclagem de streams dependem de FFmpeg. O aplicativo **não hospeda nem fornece mídias**.

## Preparação Windows 10/11 (x64)
1. Instale **Node.js LTS** em https://nodejs.org/ .
2. Descompacte o projeto em uma pasta sem restrições de escrita.
3. Execute `scripts\Instalar-Dependencias.ps1` pelo PowerShell (comando abaixo) para baixar o binário oficial do yt-dlp para `tools\yt-dlp.exe`. O executável é obtido do GitHub oficial na hora da instalação; não foi incluído neste ZIP.
4. Abra `scripts\CORRIGIR-E-ABRIR.bat` com dois cliques. Ele verifica o Electron e, se o binário estiver ausente, baixa o ZIP **oficial** da versão instalada, confere SHA256, descompacta e inicia diretamente o executável. Não requer comandos no CMD. Precisa de acesso ao GitHub para baixar o Electron caso esteja faltando.
5. Para gerar o instalador, execute `scripts\COMPILAR-WINDOWS.bat`. O `.exe` ficará na pasta `dist`.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Instalar-Dependencias.ps1
```

Para uso de MP3 e mesclagem de vídeo + áudio, instale o [FFmpeg](https://ffmpeg.org/download.html) e garanta que `ffmpeg.exe` e `ffprobe.exe` estejam no PATH do Windows (ou no mesmo diretório do yt-dlp).

### Comandos de desenvolvimento
```powershell
npm install
npm test
npm start
npm run dist:win
```

### Gerar EXE via GitHub Actions
Envie a pasta do projeto para um repositório no GitHub (incluindo `.github/workflows/windows.yml`) e acione `Actions > Build Windows EXE > Run workflow`, ou faça push da tag `v1.0.0`. O `.exe` será disponibilizado nos **artifacts** do job, sem precisar instalar Node na máquina de quem usar o instalador. O pipeline baixa o yt-dlp oficial antes de empacotar. Para distribuir ao público, considere assinatura de código Windows.

## Estrutura
- `src/main.js`: janela, integração IPC, persistência e fila.
- `src/backend.js`: consulta e download via yt-dlp, progresso e cancelamento.
- `src/links.js`: validador de URL com testes.
- `src/preload.js`: interface IPC de capacidades limitadas.
- `src/renderer/`: HTML, CSS, JS da interface.
- `scripts/`: preparação, execução e compilação no Windows.
- `.github/workflows/windows.yml`: compilação na nuvem.

## Privacidade e segurança
URLs limitadas a HTTPS em domínios exatos do Instagram; processos são executados via `spawn` sem shell, interface Electron com `contextIsolation`, sem Node no renderer e `sandbox`. Os downloads ficam localmente na pasta escolhida. O programa não coleta senhas nem envia analytics. Evite links ou conteúdo cujo download você não tenha permissão.

## Diagnóstico
- **Extrator não instalado**: execute o script PowerShell na raiz do projeto, então reinicie o app.
- **ERROR: login required/HTTP Error**: conteúdo indisponível sem autorização pelo extrator; não indica defeito na interface.
- **MP3 não funciona**: instale FFmpeg.
- **Arquivo não encontrado**: confira pasta escolhida, permissões, antivírus e nome de arquivo.
- **npm não reconhecido**: instale Node.js e reinicie o terminal.
- **Windows SmartScreen**: instalador não assinado; verifique origem e, para produção, assine o executável.

## Licença
MIT apenas para o código original deste projeto. Electron, yt-dlp e FFmpeg têm suas próprias licenças e requisitos.

## Correção v1.0.1: Electron incompleto no Windows
Execute **`scripts\CORRIGIR-E-ABRIR.bat`**. O pacote npm pode conter arquivos JS do Electron sem o executável quando scripts pós-instalação estão bloqueados. O reparador baixa o binário oficial apenas se estiver ausente, confere a soma SHA256 publicada pelo projeto Electron e inicia diretamente `electron.exe`, independentemente do wrapper do npm. Se o acesso ao GitHub estiver bloqueado, será mostrado um erro claro. Esse reparo não altera o restante do seu código.
>>>>>>> 51a50f0 (Stories Hunter REA v1.0.3 - atualizador)
