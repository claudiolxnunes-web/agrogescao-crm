@echo off
REM ============================================================================
REM 🚀 SCRIPT AUTOMÁTICO - DEPLOYMENT COMPLETO DO CRM
REM ============================================================================
REM 
REM INSTRUÇÕES:
REM 1. Salva este arquivo como: deploy.bat (na RAIZ do projeto)
REM 2. Descompacta o ZIP em uma pasta: arquivos_novos/
REM 3. Clica 2x no deploy.bat
REM 4. Pronto! Tudo copiado automaticamente!
REM
REM ============================================================================

setlocal enabledelayedexpansion
title 🚀 DEPLOY AUTOMÁTICO - Gestão Regional CRM

REM Define cores (só funciona no Windows 10+)
color 0A

echo.
echo ============================================================================
echo 🚀 INICIANDO DEPLOY AUTOMÁTICO...
echo ============================================================================
echo.

REM Caminhos
set "projectRoot=%cd%"
set "sourceFolder=%projectRoot%\arquivos_novos"
set "pagesFolder=%projectRoot%\client\src\pages"
set "componentsFolder=%projectRoot%\client\src\components"

echo 📁 Projeto: %projectRoot%
echo 📦 Origem: %sourceFolder%
echo.

REM Verifica se pasta de origem existe
if not exist "%sourceFolder%" (
    color 0C
    echo ❌ ERRO: Pasta 'arquivos_novos' não encontrada!
    echo.
    echo Cria uma pasta 'arquivos_novos' na raiz do projeto e coloca os arquivos lá!
    echo.
    pause
    exit /b 1
)

REM ============================================================================
REM 1. COPIAR PÁGINAS NOVAS
REM ============================================================================
echo.
echo 📄 Copiando PÁGINAS...
echo.

set "pages=Clients.tsx Representatives.tsx Opportunities.tsx Map.tsx AIPlanning.tsx Goals.tsx Alerts.tsx Interactions.tsx Surveys.tsx"

for %%P in (%pages%) do (
    if exist "%sourceFolder%\%%P" (
        copy "%sourceFolder%\%%P" "%pagesFolder%\%%P" >nul
        echo    ✅ %%P
    ) else (
        color 0C
        echo    ❌ NÃO ENCONTROU: %%P
        color 0A
    )
)

REM ============================================================================
REM 2. SUBSTITUIR DASHBOARD.TSX
REM ============================================================================
echo.
echo 📊 Substituindo DASHBOARD.tsx...
echo.

if exist "%sourceFolder%\Dashboard_IMPROVED.tsx" (
    copy "%sourceFolder%\Dashboard_IMPROVED.tsx" "%pagesFolder%\Dashboard.tsx" >nul
    echo    ✅ Dashboard.tsx ^(renomeado de Dashboard_IMPROVED.tsx^)
) else (
    color 0C
    echo    ❌ NÃO ENCONTROU: Dashboard_IMPROVED.tsx
    color 0A
)

REM ============================================================================
REM 3. COPIAR COMPONENTES NOVOS
REM ============================================================================
echo.
echo 🧩 Copiando COMPONENTES...
echo.

if exist "%sourceFolder%\AdvancedFilter.tsx" (
    copy "%sourceFolder%\AdvancedFilter.tsx" "%componentsFolder%\AdvancedFilter.tsx" >nul
    echo    ✅ AdvancedFilter.tsx
) else (
    color 0C
    echo    ❌ NÃO ENCONTROU: AdvancedFilter.tsx
    color 0A
)

REM ============================================================================
REM 4. SUBSTITUIR DASHBOARDLAYOUT.TSX
REM ============================================================================
echo.
echo 🎨 Substituindo DASHBOARDLAYOUT.tsx...
echo.

if exist "%sourceFolder%\DashboardLayout_FINAL.tsx" (
    copy "%sourceFolder%\DashboardLayout_FINAL.tsx" "%componentsFolder%\DashboardLayout.tsx" >nul
    echo    ✅ DashboardLayout.tsx ^(renomeado de DashboardLayout_FINAL.tsx^)
) else (
    color 0C
    echo    ❌ NÃO ENCONTROU: DashboardLayout_FINAL.tsx
    color 0A
)

REM ============================================================================
REM 5. RESUMO
REM ============================================================================
echo.
echo ============================================================================
color 0B
echo ✅ DEPLOY CONCLUÍDO COM SUCESSO!
color 0A
echo ============================================================================
echo.

echo 📋 PRÓXIMOS PASSOS:
echo.
echo 1. ✅ Arquivos copiados para as pastas corretas
echo.
echo 2. 📝 ADICIONE ROTAS em App.tsx ou router.tsx:
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
echo    Route path="/" component={Dashboard} /
echo    Route path="/clientes" component={Clients} /
echo    Route path="/representantes" component={Representatives} /
echo    Route path="/oportunidades" component={Opportunities} /
echo    Route path="/mapa" component={Map} /
echo    Route path="/planejamento" component={AIPlanning} /
echo    Route path="/metas" component={Goals} /
echo    Route path="/alertas" component={Alerts} /
echo    Route path="/interacoes" component={Interactions} /
echo    Route path="/enquetes" component={Surveys} /
echo.
echo 3. 🧪 Rode: pnpm dev
echo.
echo 4. 🎯 Teste cada página no menu
echo.
echo 5. 📤 Commit: git add . ^&^& git commit -m "feat: add new CRM features"
echo.
echo 6. 🚀 Push: git push origin master
echo.
echo ============================================================================
echo.

color 0B
echo ✨ Sucesso! Bora testar! 💪
echo.
color 0A

pause
