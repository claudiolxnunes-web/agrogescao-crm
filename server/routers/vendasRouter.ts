import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { salesInvoices, openOrders, products, representatives } from "../../drizzle/schema";
import { eq, sql, and, gte, lte, like, desc, isNotNull } from "drizzle-orm";

// ============================================================
// Router de Vendas / Faturamento
// ============================================================

export const vendasRouter = router({

  // ── Totais gerais com filtros ──────────────────────────────
  getTotals: protectedProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      ano: z.number().optional(),
      repCode: z.string().optional(),
      region: z.string().optional(),
      productGroup: z.string().optional(),
      tipoOperacao: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: ReturnType<typeof and>[] = [];

      if (input.mesAno) conditions.push(eq(salesInvoices.mesAno, input.mesAno));
      if (input.ano) conditions.push(eq(salesInvoices.ano, input.ano));
      if (input.repCode) conditions.push(eq(salesInvoices.repCode, input.repCode));
      if (input.tipoOperacao) conditions.push(eq(salesInvoices.tipoOperacao, input.tipoOperacao));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totals] = await db
        .select({
          totalFaturamento: sql<number>`COALESCE(SUM(${salesInvoices.faturamentoRealizado}), 0)`,
          totalVolume: sql<number>`COALESCE(SUM(${salesInvoices.volumeVendas}), 0)`,
          totalQtdSacos: sql<number>`COALESCE(SUM(${salesInvoices.qtdSacos}), 0)`,
          totalNFs: sql<number>`COUNT(DISTINCT ${salesInvoices.invoiceNumber})`,
          totalLinhas: sql<number>`COUNT(*)`,
          totalClientes: sql<number>`COUNT(DISTINCT ${salesInvoices.clientCode})`,
          totalRepresentantes: sql<number>`COUNT(DISTINCT ${salesInvoices.repCode})`,
          mediaMbCbPct: sql<number>`COALESCE(AVG(${salesInvoices.mbCbPct}), 0)`,
          totalComissao: sql<number>`COALESCE(SUM(${salesInvoices.comissaoValor}), 0)`,
          totalMbCbTotal: sql<number>`COALESCE(SUM(${salesInvoices.mbCbTotal}), 0)`,
        })
        .from(salesInvoices)
        .where(whereClause);

      return totals;
    }),

  // ── Vendas por representante ───────────────────────────────
  getByRepresentative: protectedProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      ano: z.number().optional(),
      region: z.string().optional(),
      productGroup: z.string().optional(),
      tipoOperacao: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: ReturnType<typeof and>[] = [];

      if (input.mesAno) conditions.push(eq(salesInvoices.mesAno, input.mesAno));
      if (input.ano) conditions.push(eq(salesInvoices.ano, input.ano));
      if (input.tipoOperacao) conditions.push(eq(salesInvoices.tipoOperacao, input.tipoOperacao));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          repCode: salesInvoices.repCode,
          repName: salesInvoices.repName,
          totalFaturamento: sql<number>`COALESCE(SUM(${salesInvoices.faturamentoRealizado}), 0)`,
          totalVolume: sql<number>`COALESCE(SUM(${salesInvoices.volumeVendas}), 0)`,
          totalQtdSacos: sql<number>`COALESCE(SUM(${salesInvoices.qtdSacos}), 0)`,
          totalNFs: sql<number>`COUNT(DISTINCT ${salesInvoices.invoiceNumber})`,
          totalLinhas: sql<number>`COUNT(*)`,
          totalClientes: sql<number>`COUNT(DISTINCT ${salesInvoices.clientCode})`,
          totalProdutos: sql<number>`COUNT(DISTINCT ${salesInvoices.productCode})`,
          mediaMbCbPct: sql<number>`COALESCE(AVG(${salesInvoices.mbCbPct}), 0)`,
          totalMbCbTotal: sql<number>`COALESCE(SUM(${salesInvoices.mbCbTotal}), 0)`,
          totalComissao: sql<number>`COALESCE(SUM(${salesInvoices.comissaoValor}), 0)`,
        })
        .from(salesInvoices)
        .where(whereClause)
        .groupBy(salesInvoices.repCode, salesInvoices.repName)
        .orderBy(desc(sql`SUM(${salesInvoices.faturamentoRealizado})`))
        .limit(input.limit);

      return rows;
    }),

  // ── Detalhamento de vendas por representante ───────────────
  getDetailByRep: protectedProcedure
    .input(z.object({
      repCode: z.string(),
      mesAno: z.string().optional(),
      ano: z.number().optional(),
      tipoOperacao: z.string().optional(),
      groupBy: z.enum(["client", "product", "invoice"]).default("client"),
      limit: z.number().default(200),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: ReturnType<typeof and>[] = [
        eq(salesInvoices.repCode, input.repCode),
      ];
      if (input.mesAno) conditions.push(eq(salesInvoices.mesAno, input.mesAno));
      if (input.ano) conditions.push(eq(salesInvoices.ano, input.ano));
      if (input.tipoOperacao) conditions.push(eq(salesInvoices.tipoOperacao, input.tipoOperacao));

      const whereClause = and(...conditions);

      if (input.groupBy === "client") {
        return await db
          .select({
            clientCode: salesInvoices.clientCode,
            clientName: salesInvoices.clientName,
            totalFaturamento: sql<number>`COALESCE(SUM(${salesInvoices.faturamentoRealizado}), 0)`,
            totalVolume: sql<number>`COALESCE(SUM(${salesInvoices.volumeVendas}), 0)`,
            totalQtdSacos: sql<number>`COALESCE(SUM(${salesInvoices.qtdSacos}), 0)`,
            totalNFs: sql<number>`COUNT(DISTINCT ${salesInvoices.invoiceNumber})`,
            totalProdutos: sql<number>`COUNT(DISTINCT ${salesInvoices.productCode})`,
            mediaMbCbPct: sql<number>`COALESCE(AVG(${salesInvoices.mbCbPct}), 0)`,
          })
          .from(salesInvoices)
          .where(whereClause)
          .groupBy(salesInvoices.clientCode, salesInvoices.clientName)
          .orderBy(desc(sql`SUM(${salesInvoices.faturamentoRealizado})`))
          .limit(input.limit);
      }

      if (input.groupBy === "product") {
        return await db
          .select({
            productCode: salesInvoices.productCode,
            productName: salesInvoices.productName,
            totalFaturamento: sql<number>`COALESCE(SUM(${salesInvoices.faturamentoRealizado}), 0)`,
            totalVolume: sql<number>`COALESCE(SUM(${salesInvoices.volumeVendas}), 0)`,
            totalQtdSacos: sql<number>`COALESCE(SUM(${salesInvoices.qtdSacos}), 0)`,
            totalNFs: sql<number>`COUNT(DISTINCT ${salesInvoices.invoiceNumber})`,
            totalClientes: sql<number>`COUNT(DISTINCT ${salesInvoices.clientCode})`,
            mediaMbCbPct: sql<number>`COALESCE(AVG(${salesInvoices.mbCbPct}), 0)`,
          })
          .from(salesInvoices)
          .where(whereClause)
          .groupBy(salesInvoices.productCode, salesInvoices.productName)
          .orderBy(desc(sql`SUM(${salesInvoices.faturamentoRealizado})`))
          .limit(input.limit);
      }

      // groupBy === "invoice" — lista de NFs individuais
      return await db
        .select({
          id: salesInvoices.id,
          invoiceNumber: salesInvoices.invoiceNumber,
          orderNumber: salesInvoices.orderNumber,
          invoiceDate: salesInvoices.invoiceDate,
          clientCode: salesInvoices.clientCode,
          clientName: salesInvoices.clientName,
          productCode: salesInvoices.productCode,
          productName: salesInvoices.productName,
          qtdSacos: salesInvoices.qtdSacos,
          precoPorSaco: salesInvoices.precoPorSaco,
          faturamentoRealizado: salesInvoices.faturamentoRealizado,
          volumeVendas: salesInvoices.volumeVendas,
          mbCbPct: salesInvoices.mbCbPct,
          mbCbTotal: salesInvoices.mbCbTotal,
          comissaoValor: salesInvoices.comissaoValor,
          tipoOperacao: salesInvoices.tipoOperacao,
          mesAno: salesInvoices.mesAno,
        })
        .from(salesInvoices)
        .where(whereClause)
        .orderBy(desc(salesInvoices.invoiceDate))
        .limit(input.limit);
    }),

  // ── Vendas por produto ─────────────────────────────────────
  getByProduct: protectedProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      ano: z.number().optional(),
      repCode: z.string().optional(),
      tipoOperacao: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: ReturnType<typeof and>[] = [];
      if (input.mesAno) conditions.push(eq(salesInvoices.mesAno, input.mesAno));
      if (input.ano) conditions.push(eq(salesInvoices.ano, input.ano));
      if (input.repCode) conditions.push(eq(salesInvoices.repCode, input.repCode));
      if (input.tipoOperacao) conditions.push(eq(salesInvoices.tipoOperacao, input.tipoOperacao));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return await db
        .select({
          productCode: salesInvoices.productCode,
          productName: salesInvoices.productName,
          totalFaturamento: sql<number>`COALESCE(SUM(${salesInvoices.faturamentoRealizado}), 0)`,
          totalVolume: sql<number>`COALESCE(SUM(${salesInvoices.volumeVendas}), 0)`,
          totalQtdSacos: sql<number>`COALESCE(SUM(${salesInvoices.qtdSacos}), 0)`,
          totalNFs: sql<number>`COUNT(DISTINCT ${salesInvoices.invoiceNumber})`,
          totalClientes: sql<number>`COUNT(DISTINCT ${salesInvoices.clientCode})`,
          mediaMbCbPct: sql<number>`COALESCE(AVG(${salesInvoices.mbCbPct}), 0)`,
        })
        .from(salesInvoices)
        .where(whereClause)
        .groupBy(salesInvoices.productCode, salesInvoices.productName)
        .orderBy(desc(sql`SUM(${salesInvoices.faturamentoRealizado})`))
        .limit(input.limit);
    }),

  // ── Evolução mensal (para gráfico de linha) ────────────────
  getMonthlyEvolution: protectedProcedure
    .input(z.object({
      repCode: z.string().optional(),
      tipoOperacao: z.string().optional(),
      limit: z.number().default(24),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: ReturnType<typeof and>[] = [
        isNotNull(salesInvoices.mesAno),
      ];
      if (input.repCode) conditions.push(eq(salesInvoices.repCode, input.repCode));
      if (input.tipoOperacao) conditions.push(eq(salesInvoices.tipoOperacao, input.tipoOperacao));

      return await db
        .select({
          mesAno: salesInvoices.mesAno,
          ano: salesInvoices.ano,
          totalFaturamento: sql<number>`COALESCE(SUM(${salesInvoices.faturamentoRealizado}), 0)`,
          totalVolume: sql<number>`COALESCE(SUM(${salesInvoices.volumeVendas}), 0)`,
          totalQtdSacos: sql<number>`COALESCE(SUM(${salesInvoices.qtdSacos}), 0)`,
          totalNFs: sql<number>`COUNT(DISTINCT ${salesInvoices.invoiceNumber})`,
        })
        .from(salesInvoices)
        .where(and(...conditions))
        .groupBy(salesInvoices.mesAno, salesInvoices.ano)
        .orderBy(salesInvoices.ano, salesInvoices.mesAno)
        .limit(input.limit);
    }),

  // ── Lista de filtros disponíveis (meses, representantes, etc.) ──
  getFilterOptions: protectedProcedure
    .query(async () => {
      const db = await getDb();

      const [meses, reps, tiposOp] = await Promise.all([
        db.selectDistinct({ mesAno: salesInvoices.mesAno, ano: salesInvoices.ano })
          .from(salesInvoices)
          .where(isNotNull(salesInvoices.mesAno))
          .orderBy(salesInvoices.ano, salesInvoices.mesAno),
        db.selectDistinct({ repCode: salesInvoices.repCode, repName: salesInvoices.repName })
          .from(salesInvoices)
          .where(isNotNull(salesInvoices.repCode))
          .orderBy(salesInvoices.repName),
        db.selectDistinct({ tipoOperacao: salesInvoices.tipoOperacao })
          .from(salesInvoices)
          .where(isNotNull(salesInvoices.tipoOperacao)),
      ]);

      return { meses, reps, tiposOp };
    }),

  // ── Vendas por UF (estado) ──────────────────────────────────
  getByUF: protectedProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      ano: z.number().optional(),
      repCode: z.string().optional(),
      tipoOperacao: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: ReturnType<typeof and>[] = [
        isNotNull(salesInvoices.uf),
      ];
      if (input.mesAno) conditions.push(eq(salesInvoices.mesAno, input.mesAno));
      if (input.ano) conditions.push(eq(salesInvoices.ano, input.ano));
      if (input.repCode) conditions.push(eq(salesInvoices.repCode, input.repCode));
      if (input.tipoOperacao) conditions.push(eq(salesInvoices.tipoOperacao, input.tipoOperacao));

      return await db
        .select({
          uf: salesInvoices.uf,
          totalFaturamento: sql<number>`COALESCE(SUM(${salesInvoices.faturamentoRealizado}), 0)`,
          totalVolume: sql<number>`COALESCE(SUM(${salesInvoices.volumeVendas}), 0)`,
          totalQtdSacos: sql<number>`COALESCE(SUM(${salesInvoices.qtdSacos}), 0)`,
          totalNFs: sql<number>`COUNT(DISTINCT ${salesInvoices.invoiceNumber})`,
          totalClientes: sql<number>`COUNT(DISTINCT ${salesInvoices.clientCode})`,
          totalRepresentantes: sql<number>`COUNT(DISTINCT ${salesInvoices.repCode})`,
          mediaMbCbPct: sql<number>`COALESCE(AVG(${salesInvoices.mbCbPct}), 0)`,
        })
        .from(salesInvoices)
        .where(and(...conditions))
        .groupBy(salesInvoices.uf)
        .orderBy(desc(sql`SUM(${salesInvoices.faturamentoRealizado})`))
        .limit(input.limit);
    }),

  // ── Filtros: adicionar UFs disponíveis ────────────────────────
  getUFOptions: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const ufs = await db
        .selectDistinct({ uf: salesInvoices.uf })
        .from(salesInvoices)
        .where(isNotNull(salesInvoices.uf))
        .orderBy(salesInvoices.uf);
      return ufs.map(r => r.uf).filter(Boolean) as string[];
    }),

  // ── Pedidos em aberto ──────────────────────────────────────
  getOpenOrders: protectedProcedure
    .input(z.object({
      repCode: z.string().optional(),
      limit: z.number().default(200),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: ReturnType<typeof and>[] = [];
      if (input.repCode) conditions.push(eq(openOrders.repCode, input.repCode));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return await db
        .select()
        .from(openOrders)
        .where(whereClause)
        .orderBy(desc(openOrders.createdAt))
        .limit(input.limit);
    }),
});
