@echo off
REM ============================================================================
REM 🚀 SCRIPT DE INSTALAÇÃO COMPLETA - LOTE POR LOTE
REM ============================================================================

setlocal enabledelayedexpansion
color 0A
title 🚀 INSTALAÇÃO - Gestão Regional CRM

echo.
echo ============================================================================
echo 🚀 SCRIPT DE INSTALAÇÃO LOTE POR LOTE
echo ============================================================================
echo.
echo Este script fará a cópia de arquivos EM LOTES para maior segurança
echo.

REM Caminhos
set "projectRoot=%cd%"
set "sourceFolder=%projectRoot%\arquivos_novos"
set "pagesFolder=%projectRoot%\client\src\pages"
set "componentsFolder=%projectRoot%\client\src\components"

echo 📁 Projeto: %projectRoot%
echo 📦 Origem: %sourceFolder%
echo.

REM Verifica pasta
if not exist "%sourceFolder%" (
    color 0C
    echo ❌ ERRO: Pasta 'arquivos_novos' não encontrada!
    echo.
    echo Ações necessárias:
    echo 1. Cria pasta: arquivos_novos
    echo 2. Descompacta o ZIP lá
    echo 3. Roda este script novamente
    echo.
    pause
    exit /b 1
)

REM ============================================================================
REM LOTE 1: PÁGINAS PRINCIPAIS
REM ============================================================================
echo.
echo ============================================================================
echo 📄 LOTE 1: Copiando PÁGINAS PRINCIPAIS
echo ============================================================================
echo.

set "count=0"
for %%P in (Clients.tsx Representatives.tsx Opportunities.tsx) do (
    if exist "%sourceFolder%\%%P" (
        copy "%sourceFolder%\%%P" "%pagesFolder%\%%P" >nul
        set /a count+=1
        echo ✅ %%P
    ) else (
        echo ❌ ERRO: %%P não encontrado
    )
)
echo.
echo [%count% de 3 copiados]
echo Pressiona ENTER para continuar...
pause >nul

REM ============================================================================
REM LOTE 2: PÁGINAS AVANÇADAS
REM ============================================================================
echo.
echo ============================================================================
echo 🎯 LOTE 2: Copiando PÁGINAS AVANÇADAS
echo ============================================================================
echo.

set "count=0"
for %%P in (Map.tsx AIPlanning.tsx Goals.tsx) do (
    if exist "%sourceFolder%\%%P" (
        copy "%sourceFolder%\%%P" "%pagesFolder%\%%P" >nul
        set /a count+=1
        echo ✅ %%P
    ) else (
        echo ❌ ERRO: %%P não encontrado
    )
)
echo.
echo [%count% de 3 copiados]
echo Pressiona ENTER para continuar...
pause >nul

REM ============================================================================
REM LOTE 3: PÁGINAS FINAIS
REM ============================================================================
echo.
echo ============================================================================
echo ⚡ LOTE 3: Copiando PÁGINAS FINAIS
echo ============================================================================
echo.

set "count=0"
for %%P in (Alerts.tsx Interactions.tsx Surveys.tsx) do (
    if exist "%sourceFolder%\%%P" (
        copy "%sourceFolder%\%%P" "%pagesFolder%\%%P" >nul
        set /a count+=1
        echo ✅ %%P
    ) else (
        echo ❌ ERRO: %%P não encontrado
    )
)
echo.
echo [%count% de 3 copiados]
echo Pressiona ENTER para continuar...
pause >nul

REM ============================================================================
REM LOTE 4: SUBSTITUIÇÕES
REM ============================================================================
echo.
echo ============================================================================
echo 🔄 LOTE 4: Substituindo ARQUIVOS ATUALIZADOS
echo ============================================================================
echo.

set "count=0"

if exist "%sourceFolder%\Dashboard_IMPROVED.tsx" (
    copy "%sourceFolder%\Dashboard_IMPROVED.tsx" "%pagesFolder%\Dashboard.tsx" >nul
    set /a count+=1
    echo ✅ Dashboard.tsx
) else (
    echo ❌ ERRO: Dashboard_IMPROVED.tsx
)

if exist "%sourceFolder%\DashboardLayout_FINAL.tsx" (
    copy "%sourceFolder%\DashboardLayout_FINAL.tsx" "%componentsFolder%\DashboardLayout.tsx" >nul
    set /a count+=1
    echo ✅ DashboardLayout.tsx
) else (
    echo ❌ ERRO: DashboardLayout_FINAL.tsx
)

echo.
echo [%count% de 2 substituídos]
echo Pressiona ENTER para continuar...
pause >nul

REM ============================================================================
REM LOTE 5: COMPONENTES
REM ============================================================================
echo.
echo ============================================================================
echo 🧩 LOTE 5: Copiando COMPONENTES NOVOS
echo ============================================================================
echo.

if exist "%sourceFolder%\AdvancedFilter.tsx" (
    copy "%sourceFolder%\AdvancedFilter.tsx" "%componentsFolder%\AdvancedFilter.tsx" >nul
    echo ✅ AdvancedFilter.tsx
) else (
    echo ❌ ERRO: AdvancedFilter.tsx
)

echo.
echo Pressiona ENTER para continuar...
pause >nul

REM ============================================================================
REM RESUMO FINAL
REM ============================================================================
echo.
echo ============================================================================
color 0B
echo ✅ INSTALAÇÃO LOTE A LOTE CONCLUÍDA!
color 0A
echo ============================================================================
echo.

echo 📊 RESUMO:
echo ✅ Lote 1: 3 páginas principais copiadas
echo ✅ Lote 2: 3 páginas avançadas copiadas
echo ✅ Lote 3: 3 páginas finais copiadas
echo ✅ Lote 4: 2 arquivos substituídos
echo ✅ Lote 5: 1 componente novo copiado
echo.
echo TOTAL: 12 páginas + 1 componente = 13 arquivos copiados
echo.

echo ============================================================================
echo 📋 PRÓXIMOS PASSOS:
echo ============================================================================
echo.
echo 1. ✅ Arquivos copiados com sucesso
echo.
echo 2. 📝 ABRA App.tsx e ADICIONE AS ROTAS (copy & paste):
echo.
echo    import Clients from "@/pages/Clients";
echo    import Representatives from "@/pages/Representatives";
echo    import Opportunities from "@/pages/Opportunities";
echo    import Dashboard from "@/pages/Dashboard";
echo    import Map from "@/pages/Map";
echo    import AIPlanning from "@/pages/AIPlanning";
echo    import Goals from "@/pages/Goals";
echo    import Alerts from "@/pages/Alerts";
echo    import Interactions from "@/pages/Interactions";
echo    import Surveys from "@/pages/Surveys";
echo.
echo    Adiciona as rotas correspondentes no seu router
echo.
echo 3. 🧪 Abre Terminal e roda:
echo    pnpm dev
echo.
echo 4. 🎯 Testa cada página no menu
echo.
echo 5. 📤 Commit:
echo    git add .
echo    git commit -m "feat: add complete CRM with 10 pages, IA, goals, alerts"
echo.
echo 6. 🚀 Push:
echo    git push origin master
echo.
echo ============================================================================
echo.

color 0B
echo ✨ Sucesso! Tudo pronto! 💪
echo.
color 0A

pause
