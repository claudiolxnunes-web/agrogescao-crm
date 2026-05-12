@echo off
REM ============================================================================
REM 🚀 SCRIPT SUPER RÁPIDO - COPIA TUDO DE UMA VEZ
REM ============================================================================

setlocal enabledelayedexpansion
color 0A
title 🚀 DEPLOY RÁPIDO - Gestão Regional CRM

cls
echo.
echo ╔════════════════════════════════════════════════════════════════════════════╗
echo ║                 🚀 DEPLOY AUTOMÁTICO - RÁPIDO                             ║
echo ║                                                                            ║
echo ║     Este script vai copiar TODOS os arquivos automaticamente               ║
echo ╚════════════════════════════════════════════════════════════════════════════╝
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
    cls
    color 0C
    echo.
    echo ╔════════════════════════════════════════════════════════════════════════════╗
    echo ║                        ❌ ERRO - PASTA NÃO ENCONTRADA                       ║
    echo ╚════════════════════════════════════════════════════════════════════════════╝
    echo.
    echo A pasta 'arquivos_novos' não foi encontrada!
    echo.
    echo O QUE FAZER:
    echo   1. Cria uma pasta chamada 'arquivos_novos' na RAIZ do projeto
    echo   2. Descompacta o ZIP dentro dessa pasta
    echo   3. Clica 2x neste arquivo (deploy-rapido.bat) novamente
    echo.
    pause
    exit /b 1
)

echo ⏳ Iniciando cópia de arquivos...
echo.

REM Variáveis de contagem
set "copiedCount=0"
set "failedCount=0"
set "totalCount=0"

REM ============================================================================
REM COPIAR TODAS AS PÁGINAS
REM ============================================================================

set "pages=Clients.tsx Representatives.tsx Opportunities.tsx Map.tsx AIPlanning.tsx Goals.tsx Alerts.tsx Interactions.tsx Surveys.tsx"

for %%P in (%pages%) do (
    set /a totalCount+=1
    if exist "%sourceFolder%\%%P" (
        copy "%sourceFolder%\%%P" "%pagesFolder%\%%P" >nul 2>&1
        if !errorlevel! equ 0 (
            set /a copiedCount+=1
            echo ✅ %%P
        ) else (
            set /a failedCount+=1
            echo ❌ ERRO ao copiar: %%P
        )
    ) else (
        set /a failedCount+=1
        echo ❌ NÃO ENCONTRADO: %%P
    )
)

REM ============================================================================
REM SUBSTITUIR DASHBOARD
REM ============================================================================

set /a totalCount+=1
if exist "%sourceFolder%\Dashboard_IMPROVED.tsx" (
    copy "%sourceFolder%\Dashboard_IMPROVED.tsx" "%pagesFolder%\Dashboard.tsx" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a copiedCount+=1
        echo ✅ Dashboard.tsx
    ) else (
        set /a failedCount+=1
        echo ❌ ERRO ao copiar: Dashboard.tsx
    )
) else (
    set /a failedCount+=1
    echo ❌ NÃO ENCONTRADO: Dashboard_IMPROVED.tsx
)

REM ============================================================================
REM COPIAR COMPONENTES
REM ============================================================================

set /a totalCount+=1
if exist "%sourceFolder%\AdvancedFilter.tsx" (
    copy "%sourceFolder%\AdvancedFilter.tsx" "%componentsFolder%\AdvancedFilter.tsx" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a copiedCount+=1
        echo ✅ AdvancedFilter.tsx
    ) else (
        set /a failedCount+=1
        echo ❌ ERRO ao copiar: AdvancedFilter.tsx
    )
) else (
    set /a failedCount+=1
    echo ❌ NÃO ENCONTRADO: AdvancedFilter.tsx
)

REM ============================================================================
REM SUBSTITUIR DASHBOARDLAYOUT
REM ============================================================================

set /a totalCount+=1
if exist "%sourceFolder%\DashboardLayout_FINAL.tsx" (
    copy "%sourceFolder%\DashboardLayout_FINAL.tsx" "%componentsFolder%\DashboardLayout.tsx" >nul 2>&1
    if !errorlevel! equ 0 (
        set /a copiedCount+=1
        echo ✅ DashboardLayout.tsx
    ) else (
        set /a failedCount+=1
        echo ❌ ERRO ao copiar: DashboardLayout.tsx
    )
) else (
    set /a failedCount+=1
    echo ❌ NÃO ENCONTRADO: DashboardLayout_FINAL.tsx
)

REM ============================================================================
REM RESULTADO FINAL
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════════════════╗

if %failedCount% equ 0 (
    color 0B
    echo ║                    ✅ SUCESSO - DEPLOY COMPLETO!                          ║
) else (
    color 0E
    echo ║                ⚠️  DEPLOY PARCIAL - ALGUNS ERROS ENCONTRADOS               ║
)

echo ╚════════════════════════════════════════════════════════════════════════════╝
echo.

echo 📊 RESULTADO:
echo    Total: %totalCount% arquivos
echo    Copiados: %copiedCount%
echo    Erros: %failedCount%
echo.

if %failedCount% equ 0 (
    color 0B
    echo ✅ Todos os arquivos foram copiados com sucesso!
) else (
    color 0E
    echo ⚠️  Alguns arquivos tiveram problema - verifique a lista acima
)

color 0A
echo.
echo ════════════════════════════════════════════════════════════════════════════
echo 📋 PRÓXIMOS PASSOS:
echo ════════════════════════════════════════════════════════════════════════════
echo.
echo 1️⃣  ABRA: App.tsx (ou seu arquivo de rotas)
echo.
echo 2️⃣  ADICIONE IMPORTS no topo:
echo.
echo     import Clients from "@/pages/Clients";
echo     import Representatives from "@/pages/Representatives";
echo     import Opportunities from "@/pages/Opportunities";
echo     import Dashboard from "@/pages/Dashboard";
echo     import Map from "@/pages/Map";
echo     import AIPlanning from "@/pages/AIPlanning";
echo     import Goals from "@/pages/Goals";
echo     import Alerts from "@/pages/Alerts";
echo     import Interactions from "@/pages/Interactions";
echo     import Surveys from "@/pages/Surveys";
echo.
echo 3️⃣  ADICIONE ROTAS onde estão suas rotas:
echo.
echo     Route path="/" component={Dashboard}
echo     Route path="/clientes" component={Clients}
echo     Route path="/representantes" component={Representatives}
echo     Route path="/oportunidades" component={Opportunities}
echo     Route path="/mapa" component={Map}
echo     Route path="/planejamento" component={AIPlanning}
echo     Route path="/metas" component={Goals}
echo     Route path="/alertas" component={Alerts}
echo     Route path="/interacoes" component={Interactions}
echo     Route path="/enquetes" component={Surveys}
echo.
echo 4️⃣  ABRE TERMINAL e roda:
echo     pnpm dev
echo.
echo 5️⃣  TESTA no navegador: http://localhost:3001
echo.
echo 6️⃣  COMMIT:
echo     git add .
echo     git commit -m "feat: add complete CRM features"
echo     git push origin master
echo.
echo ════════════════════════════════════════════════════════════════════════════
echo.

color 0B
echo 🎉 Pronto! Bora testar! 💪
color 0A
echo.

pause
