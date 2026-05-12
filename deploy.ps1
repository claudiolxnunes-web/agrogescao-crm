# 🚀 SCRIPT AUTOMÁTICO - COPIA TUDO PRO VSCODE

# ==============================================================================
# INSTRUÇÕES:
# 1. Salva este arquivo como: deploy.ps1
# 2. Coloca na RAIZ do seu projeto (gestao_regional-crm/)
# 3. Abre PowerShell como ADMIN
# 4. Roda: .\deploy.ps1
# 5. Pronto! Todos os arquivos copiados automaticamente!
# ==============================================================================

# Define cores pra output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "`n🚀 INICIANDO DEPLOY AUTOMÁTICO...`n"

# Caminhos base
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceFolder = "$projectRoot\arquivos_novos"  # Pasta onde você coloca o ZIP descompactado
$pagesFolder = "$projectRoot\client\src\pages"
$componentsFolder = "$projectRoot\client\src\components"

Write-Info "📁 Projeto: $projectRoot"
Write-Info "📦 Origem: $sourceFolder`n"

# Verificar se pasta de origem existe
if (-not (Test-Path $sourceFolder)) {
    Write-Error "❌ ERRO: Pasta '$sourceFolder' não encontrada!"
    Write-Info "Cria uma pasta 'arquivos_novos' na raiz e coloca os arquivos lá!"
    exit
}

# ==============================================================================
# 1. COPIAR PÁGINAS NOVAS
# ==============================================================================
Write-Info "📄 Copiando PÁGINAS..."

$pages = @(
    "Clients.tsx",
    "Representatives.tsx",
    "Opportunities.tsx",
    "Map.tsx",
    "AIPlanning.tsx",
    "Goals.tsx",
    "Alerts.tsx",
    "Interactions.tsx",
    "Surveys.tsx"
)

foreach ($page in $pages) {
    $source = "$sourceFolder\$page"
    $dest = "$pagesFolder\$page"
    
    if (Test-Path $source) {
        Copy-Item $source $dest -Force
        Write-Success "   ✅ $page"
    } else {
        Write-Error "   ❌ NÃO ENCONTROU: $page"
    }
}

# ==============================================================================
# 2. SUBSTITUIR DASHBOARD.TSX
# ==============================================================================
Write-Info "`n📊 Substituindo DASHBOARD.tsx..."

$dashboardSource = "$sourceFolder\Dashboard_IMPROVED.tsx"
$dashboardDest = "$pagesFolder\Dashboard.tsx"

if (Test-Path $dashboardSource) {
    Copy-Item $dashboardSource $dashboardDest -Force
    Write-Success "   ✅ Dashboard.tsx (renomeado de Dashboard_IMPROVED.tsx)"
} else {
    Write-Error "   ❌ NÃO ENCONTROU: Dashboard_IMPROVED.tsx"
}

# ==============================================================================
# 3. COPIAR COMPONENTES NOVOS
# ==============================================================================
Write-Info "`n🧩 Copiando COMPONENTES..."

$advancedFilterSource = "$sourceFolder\AdvancedFilter.tsx"
$advancedFilterDest = "$componentsFolder\AdvancedFilter.tsx"

if (Test-Path $advancedFilterSource) {
    Copy-Item $advancedFilterSource $advancedFilterDest -Force
    Write-Success "   ✅ AdvancedFilter.tsx"
} else {
    Write-Error "   ❌ NÃO ENCONTROU: AdvancedFilter.tsx"
}

# ==============================================================================
# 4. SUBSTITUIR DASHBOARDLAYOUT.TSX
# ==============================================================================
Write-Info "`n🎨 Substituindo DASHBOARDLAYOUT.tsx..."

$layoutSource = "$sourceFolder\DashboardLayout_FINAL.tsx"
$layoutDest = "$componentsFolder\DashboardLayout.tsx"

if (Test-Path $layoutSource) {
    Copy-Item $layoutSource $layoutDest -Force
    Write-Success "   ✅ DashboardLayout.tsx (renomeado de DashboardLayout_FINAL.tsx)"
} else {
    Write-Error "   ❌ NÃO ENCONTROU: DashboardLayout_FINAL.tsx"
}

# ==============================================================================
# 5. VERIFICAR ROTAS
# ==============================================================================
Write-Info "`n🔗 VERIFICANDO ROTAS..."

$appTsxPath = "$projectRoot\client\src\App.tsx"
$routerPath = "$projectRoot\client\src\router.tsx"

if (Test-Path $appTsxPath) {
    Write-Info "   📍 Encontrou: App.tsx"
    Write-Error "   ⚠️  VERIFIQUE E ADICIONE AS ROTAS MANUALMENTE:"
    Write-Info "      Veja o arquivo GUIA_RAPIDO_COPY_PASTE.md para detalhes!"
} elseif (Test-Path $routerPath) {
    Write-Info "   📍 Encontrou: router.tsx"
    Write-Error "   ⚠️  VERIFIQUE E ADICIONE AS ROTAS MANUALMENTE:"
    Write-Info "      Veja o arquivo GUIA_RAPIDO_COPY_PASTE.md para detalhes!"
} else {
    Write-Error "   ❌ NÃO ENCONTROU App.tsx nem router.tsx!"
}

# ==============================================================================
# 6. RESUMO
# ==============================================================================
Write-Info "`n" + "="*60
Write-Success "✅ DEPLOY CONCLUÍDO!"
Write-Info "="*60 + "`n"

Write-Info "📋 PRÓXIMOS PASSOS:"
Write-Info "1. ✅ Arquivos copiados para as pastas corretas"
Write-Info "2. 📝 ADICIONE ROTAS em App.tsx/router.tsx (veja GUIA_RAPIDO_COPY_PASTE.md)"
Write-Info "3. 🧪 Rode: pnpm dev"
Write-Info "4. 🎯 Teste cada página no menu"
Write-Info "5. 📤 Commit: git add . && git commit -m 'feat: add new CRM features'"
Write-Info "6. 🚀 Push: git push origin master`n"

Write-Success "Sucesso! Bora testar! 💪`n"

# Pausa pra ler
Read-Host "Pressiona ENTER para fechar"
