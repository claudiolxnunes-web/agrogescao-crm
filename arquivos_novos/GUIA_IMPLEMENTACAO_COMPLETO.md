# 🚀 GUIA DE IMPLEMENTAÇÃO - GESTÃO REGIONAL CRM

## 📦 ARQUIVOS CRIADOS

Todos os arquivos estão prontos para copiar e colar no VS Code!

### 1️⃣ PÁGINA CLIENTES
**Arquivo:** `Clients.tsx`
**Local no projeto:** `client/src/pages/Clients.tsx`

**Funcionalidades:**
- ✅ Listar clientes com paginação (10 por página)
- ✅ Buscar por nome, código ou cidade
- ✅ Criar novo cliente (modal)
- ✅ Editar cliente (modal)
- ✅ Deletar cliente (com confirmação)
- ✅ Status ativo/inativo com cores
- ✅ Tabela responsiva

**Mock data:** 3 clientes
**Depois conectar:** `trpc.client.list.useQuery()`

---

### 2️⃣ PÁGINA REPRESENTANTES
**Arquivo:** `Representatives.tsx`
**Local no projeto:** `client/src/pages/Representatives.tsx`

**Funcionalidades:**
- ✅ Listar representantes
- ✅ Buscar por nome ou região
- ✅ Criar novo representante (modal)
- ✅ Editar representante (modal)
- ✅ Deletar representante
- ✅ KPIs: Total de vendas, clientes gerenciados, ticket médio
- ✅ Tabela com tendências (up/down)

**Mock data:** 3 representantes
**Depois conectar:** `trpc.representative.list.useQuery()`

---

### 3️⃣ PÁGINA OPORTUNIDADES
**Arquivo:** `Opportunities.tsx`
**Local no projeto:** `client/src/pages/Opportunities.tsx`

**Funcionalidades:**
- ✅ Kanban board com 5 etapas: Prospecção, Proposta, Negociação, Vencida, Perdida
- ✅ Criar nova oportunidade (modal)
- ✅ Mover oportunidade entre etapas (botões)
- ✅ Deletar oportunidade
- ✅ KPIs: Valor total, oportunidades ativas, vendas concretizadas
- ✅ Cards com resumo por etapa

**Mock data:** 4 oportunidades
**Depois conectar:** `trpc.opportunity.list.useQuery()`

---

### 4️⃣ DASHBOARD MELHORADO
**Arquivo:** `Dashboard_IMPROVED.tsx`
**Local no projeto:** `client/src/pages/Dashboard.tsx` (substituir)

**Funcionalidades:**
- ✅ 4 KPI Cards: Representantes, Clientes, Faturamento, Produtos
- ✅ Gráfico de linha: Evolução de faturamento (6 meses)
- ✅ Gráfico de barras: Faturamento por segmento
- ✅ Gráfico de pizza: Clientes por segmento (ABC)
- ✅ Resumo de métricas: Ticket médio, clientes por rep, taxa conversão
- ✅ Top 3 representantes com tendências
- ✅ Resumo por segmento

**Mock data:** Completo com 6 meses histórico
**Depois conectar:** `trpc.dashboard.metrics.useQuery()`

---

### 5️⃣ PÁGINA MAPA
**Arquivo:** `Map.tsx`
**Local no projeto:** `client/src/pages/Map.tsx`

**Funcionalidades:**
- ✅ Mapa SVG interativo de São Paulo com 5 regiões
- ✅ Círculos proporcionais ao número de clientes
- ✅ Visualização em Grade ou Lista
- ✅ Clique em região para ver detalhes
- ✅ KPIs: Total clientes, regiões, faturamento
- ✅ Busca por região ou cliente
- ✅ Detalhes expandidos: clientes, representantes, faturamento

**Mock data:** 5 regiões SP com clientes
**Depois conectar:** `trpc.client.byRegion.useQuery()`

---

### 6️⃣ COMPONENTE FILTROS AVANÇADO
**Arquivo:** `AdvancedFilter.tsx`
**Local no projeto:** `client/src/components/AdvancedFilter.tsx`

**Funcionalidades:**
- ✅ Busca por termo
- ✅ Filtros múltiplos (status, tipo, segmento, etc)
- ✅ Contador de filtros ativos
- ✅ Botão limpar filtros
- ✅ Reutilizável em qualquer página
- ✅ Exemplo de uso documentado

**Como usar:**
```typescript
import { AdvancedFilter } from "@/components/AdvancedFilter";

const filterOptions = [
  {
    id: "status",
    label: "Status",
    options: [
      { value: "ativo", label: "Ativo" },
      { value: "inativo", label: "Inativo" },
    ],
  },
];

<AdvancedFilter
  onSearch={handleSearch}
  onFilter={handleFilter}
  onReset={handleReset}
  filterOptions={filterOptions}
/>
```

---

## 📋 PASSOS PARA IMPLEMENTAR

### PASSO 1: Copiar arquivos

1. Abra VS Code
2. Para cada arquivo:
   - Copia o conteúdo do arquivo .tsx
   - Clica em `File → New File`
   - Cola o conteúdo
   - Salva em `client/src/pages/` ou `client/src/components/`

**Estrutura final:**
```
client/src/
├── pages/
│   ├── Dashboard.tsx (SUBSTITUIR)
│   ├── Clients.tsx (NOVO)
│   ├── Representatives.tsx (NOVO)
│   ├── Opportunities.tsx (NOVO)
│   └── Map.tsx (NOVO)
├── components/
│   └── AdvancedFilter.tsx (NOVO)
└── ...
```

### PASSO 2: Adicionar rotas no DashboardLayout.tsx

No `client/src/components/DashboardLayout.tsx`, atualize o array `menuItems`:

```typescript
const menuItems = [
  { icon: LayoutDashboard, label: "Início", path: "/" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Users, label: "Representantes", path: "/representantes" },
  { icon: Building2, label: "Clientes", path: "/clientes" },
  { icon: Briefcase, label: "Oportunidades", path: "/oportunidades" },
  { icon: Target, label: "Metas", path: "/metas" },
  { icon: ShoppingCart, label: "Pedidos", path: "/pedidos" },
  { icon: Package, label: "Importar", path: "/importacao" },
  { icon: Map, label: "Mapa", path: "/mapa" },
  { icon: Settings, label: "Preferências", path: "/preferencias" },
];
```

### PASSO 3: Importar páginas no App.tsx ou Router

No seu arquivo de rotas, importe e registre:

```typescript
import Clients from "@/pages/Clients";
import Representatives from "@/pages/Representatives";
import Opportunities from "@/pages/Opportunities";
import Dashboard from "@/pages/Dashboard";
import Map from "@/pages/Map";

// Nas rotas:
<Route path="/clientes" component={Clients} />
<Route path="/representantes" component={Representatives} />
<Route path="/oportunidades" component={Opportunities} />
<Route path="/" component={Dashboard} />
<Route path="/mapa" component={Map} />
```

### PASSO 4: Testar localmente

```powershell
cd C:\Users\clxn2\OneDrive\Área de Trabalho\gestao_regional-crm
pnpm dev
```

Acesse: http://localhost:3001

Teste cada página:
- /clientes
- /representantes
- /oportunidades
- /
- /mapa

### PASSO 5: Fazer commit

```powershell
git add .
git commit -m "feat: add clients, representatives, opportunities, improved dashboard, map and advanced filter components"
git push
```

---

## 🔌 PRÓXIMO PASSO: CONECTAR AO tRPC

Cada página tem dados **mock** que precisam ser conectados ao banco de dados real via tRPC.

### Exemplo: Conectar Clients.tsx ao tRPC

**No arquivo Clients.tsx, substituir:**

```typescript
// Antes (mock):
const [clients, setClients] = useState<Client[]>(mockClients);

// Depois (tRPC):
const { data: clients = [], isLoading } = trpc.client.list.useQuery();
const createMutation = trpc.client.create.useMutation({
  onSuccess: () => {
    // Refetch data
  },
});

const handleCreate = () => {
  createMutation.mutate(formData);
};
```

---

## 📊 RESUMO DO PROGRESSO

| Feature | Status | Arquivo |
|---------|--------|---------|
| Página Clientes | ✅ Pronto | Clients.tsx |
| Página Representantes | ✅ Pronto | Representatives.tsx |
| Página Oportunidades | ✅ Pronto | Opportunities.tsx |
| Dashboard Melhorado | ✅ Pronto | Dashboard_IMPROVED.tsx |
| Página Mapa | ✅ Pronto | Map.tsx |
| Filtros Avançado | ✅ Pronto | AdvancedFilter.tsx |
| Conexão tRPC | ⏳ TODO | - |
| Autenticação Real | ⏳ TODO | - |

---

## 🎯 PRÓXIMAS PRIORIDADES

1. **Conectar ao tRPC** - Integrar dados reais do banco
2. **Validações** - Forms com validação Zod
3. **Autenticação** - Restaurar auth real
4. **Gráficos dinâmicos** - Recharts com dados reais
5. **Paginação real** - Backend pagination
6. **Relatórios** - PDF exports
7. **Deploy** - Production ready

---

## 💡 DICAS

- Mock data já está funcional, teste tudo com ela primeiro
- Use `Ctrl+Shift+R` no navegador se mudar CSS/Tailwind
- Todos os componentes usam shadcn/ui (Button, Card, Input, etc)
- Recharts para gráficos, funciona perfeitamente
- Responsive design: mobile, tablet, desktop

---

## ✅ CHECKLIST

- [ ] Copiei Clients.tsx
- [ ] Copiei Representatives.tsx
- [ ] Copiei Opportunities.tsx
- [ ] Copiei Dashboard_IMPROVED.tsx e substitui o Dashboard
- [ ] Copiei Map.tsx
- [ ] Copiei AdvancedFilter.tsx
- [ ] Atualizei as rotas
- [ ] Testei todas as páginas localmente
- [ ] Fiz commit e push
- [ ] Planejei conexão ao tRPC

---

**Sucesso! 🚀 Agora você tem um CRM funcional com mock data!**
