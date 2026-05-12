# 🚀 AgroGestão CRM - Próximos Passos

**Status**: Banco populado com 772 clientes, interface em desenvolvimento

---

## 🔴 CRÍTICOS (Amanhã)

### 1. Arrumar Query de Clientes
- **Problema**: Página `/clientes` mostra "0 clientes encontrados" 
- **Causa**: Query do tRPC está pedindo coluna que não existe ou formato errado
- **Solução**:
  - Verificar `server/routers.ts` ou arquivo principal de routers
  - Procurar função que lista clientes (provavelmente `getAll` ou `list`)
  - Comparar campos da query com colunas reais da tabela `clients`
  - Ajustar SELECT para usar colunas corretas

### 2. Arrumar Query de Vendas
- **Problema**: Página `/vendas` carrega mas KPIs mostram 0
- **Causa**: Queries retornam erro 500, provavelmente coluna não existe
- **Solução**:
  - Verificar `server/routers/vendasRouter.ts`
  - Checar se `representativeId` existe na tabela `clients`
  - Testar queries manualmente no phpMyAdmin
  - Ajustar JOINs se necessário

### 3. Limpar Interface
- **Problema**: Menu lateral desordenado, cores inconsistentes
- **Ação**:
  - Revisar `client/src/components/DashboardLayout.tsx`
  - Reordenar menu (agrupar por funcionalidade)
  - Verificar tema (tema claro vs escuro)
  - Remover ou ocultar páginas vazias

---

## 🟡 IMPORTANTES (Esta semana)

### 4. Restaurar Autenticação Real
- Atualmente: usuário "fake" via `useAuth.ts`
- **Fazer**:
  - Criar usuário de teste no banco
  - Ativar login com email/senha real
  - Integrar com sistema de permissões

### 5. Importar Dados de Vendas
- Se tiver arquivo Excel com faturamento:
  - Criar script similar ao `import_clientes_ativo_inativo.mjs`
  - Mapear colunas (cliente, período, valor, produto)
  - Popular tabela `sales_history` ou similar

### 6. Testar Todas as Páginas
- [ ] Dashboard
- [ ] Representantes
- [ ] Clientes
- [ ] Oportunidades
- [ ] Metas
- [ ] Atividades
- [ ] Vendas
- [ ] Analytics
- [ ] Relatórios

---

## 🟢 MÉDIO PRAZO (Próximas 2 semanas)

### 7. Deploy em Produção
**Opção A**: Railway (recomendado)
- Conectar repo GitHub
- Configurar variáveis de env
- Deploy automático
- Custo: ~$7/mês

**Opção B**: PlanetScale (MySQL na nuvem)
- Usar PlanetScale como banco
- Deploy em Railway ou Vercel
- Custo: ~$30-50/mês

### 8. Email de Notificações
- Configurar Resend (já tem chave no `.env`)
- Enviar credenciais para representantes
- Notificações de oportunidades/metas

### 9. Mapa Geográfico
- Validar página `/mapa`
- Testar drill-down por estado/cidade
- Integrar com dados de vendas

---

## 📋 Checklist de Debug (para testar amanhã)

```bash
# 1. Verificar banco de dados
SELECT COUNT(*) FROM clients; # deve retornar 772

# 2. Verificar se tem vendas no banco
SELECT COUNT(*) FROM sales_history; # pode ser 0, é OK

# 3. Testar query de clientes na mão
SELECT id, name, clientCode, city, state FROM clients LIMIT 10;

# 4. Rodar servidor com logs
pnpm dev # olhar se tem erros nas queries

# 5. Abrir DevTools (F12) na página Clientes
# Ir em Network → procurar requisição para tRPC
# Clicar em Response → ver o erro exato
```

---

## 🛠️ Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| `client/src/App.tsx` | Roteamento (desabilitou ProtectedRoute) |
| `client/src/_core/hooks/useAuth.ts` | Auth fake (remover depois) |
| `client/src/pages/Vendas.tsx` | Dashboard de vendas com drill-down |
| `server/routers.ts` | Todas as rotas tRPC (procurar clientes aqui) |
| `server/routers/vendasRouter.ts` | Queries de vendas |
| `import_clientes_ativo_inativo.mjs` | Script de importação (já rodou) |

---

## 📞 Contato

- **Usuário**: Claudio (claudiolx.nunes@gmail.com)
- **Stack**: React + TypeScript + tRPC + MySQL/XAMPP (local) ou PlanetScale (prod)
- **Repo**: https://github.com/claudiolxnunes-web/agrogescao-crm

---

**Última atualização**: 2026-05-09
**Status**: Pronto para debug amanhã ✅
