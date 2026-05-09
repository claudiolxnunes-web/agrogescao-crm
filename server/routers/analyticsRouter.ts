import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getPool } from "../db";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const analyticsRouter = router({
  // ============================================================
  // METAS - Drill-down por representante → solução → subsolução
  // ============================================================
  goals: router({
    // Totalização de metas por representante (sem deduplicação)
    getTotalByRep: protectedProcedure
      .input(z.object({ repId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const pool = getPool();
        const conn = await pool.getConnection();
        try {
          const query = `
            SELECT 
              representativeId,
              repCode,
              name as repName,
              SUM(targetValue) as totalTarget,
              SUM(currentValue) as totalCurrent,
              COUNT(*) as goalsCount,
              COUNT(DISTINCT CONCAT(especie, '|', subsolucao, '|', solucao)) as uniqueItems
            FROM goals
            WHERE representativeId IS NOT NULL
            ${input?.repId ? 'AND representativeId = ?' : ''}
            GROUP BY representativeId, repCode, name
            ORDER BY totalTarget DESC
          `;
          const params = input?.repId ? [input.repId] : [];
          const [result] = await conn.execute(query, params);
          return result as any[];
        } finally {
          conn.release();
        }
      }),

    // Drill-down: metas por representante → solução
    getByRepWithDrilldown: protectedProcedure
      .input(z.object({ repId: z.number() }))
      .query(async ({ input }) => {
        const pool = getPool();
        const conn = await pool.getConnection();
        try {
          const query = `
            SELECT 
              representativeId,
              repCode,
              name as repName,
              solucao,
              subsolucao,
              especie,
              period,
              SUM(targetValue) as totalTarget,
              SUM(currentValue) as totalCurrent,
              COUNT(*) as goalsCount,
              MAX(status) as status
            FROM goals
            WHERE representativeId = ?
            GROUP BY representativeId, repCode, name, solucao, subsolucao, especie, period
            ORDER BY totalTarget DESC
          `;
          const [result] = await conn.execute(query, [input.repId]);
          return result as any[];
        } finally {
          conn.release();
        }
      }),

    // Detalhes de uma meta específica
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const pool = getPool();
        const conn = await pool.getConnection();
        try {
          const query = `SELECT * FROM goals WHERE id = ?`;
          const [result] = await conn.execute(query, [input.id]);
          return (result as any[])[0] || null;
        } finally {
          conn.release();
        }
      }),
  }),

  // ============================================================
  // VENDAS - Métricas detalhadas
  // ============================================================
  sales: router({
    // Resumo geral de vendas
    getSummary: protectedProcedure.query(async () => {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const query = `
          SELECT 
            COUNT(*) as totalSales,
            SUM(CASE WHEN faturamentoRealizado IS NOT NULL THEN 1 ELSE 0 END) as invoicedSales,
            SUM(CASE WHEN faturamentoRealizado IS NULL THEN 1 ELSE 0 END) as openOrders,
            SUM(faturamentoRealizado) as totalRevenue,
            AVG(descontoPct) as avgDiscount,
            AVG(precoPorSaco) as avgPrice,
            AVG(faturamentoRealizado) as avgTicket,
            MIN(faturamentoRealizado) as minTicket,
            MAX(faturamentoRealizado) as maxTicket
          FROM sales_invoices
        `;
        const [result] = await conn.execute(query);
        return (result as any[])[0];
      } finally {
        conn.release();
      }
    }),

    // Vendas por região
    getByRegion: protectedProcedure.query(async () => {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const query = `
          SELECT 
            regiao,
            COUNT(*) as totalSales,
            SUM(faturamentoRealizado) as totalRevenue,
            AVG(faturamentoRealizado) as avgTicket,
            COUNT(DISTINCT clientCode) as uniqueClients,
            COUNT(DISTINCT representativeId) as uniqueReps
          FROM sales_invoices
          WHERE regiao IS NOT NULL AND regiao != ''
          GROUP BY regiao
          ORDER BY totalRevenue DESC
        `;
        const [result] = await conn.execute(query);
        return result as any[];
      } finally {
        conn.release();
      }
    }),

    // Vendas por representante
    getByRep: protectedProcedure.query(async () => {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const query = `
          SELECT 
            representativeId,
            repCode,
            repName,
            COUNT(*) as totalSales,
            SUM(faturamentoRealizado) as totalRevenue,
            AVG(faturamentoRealizado) as avgTicket,
            AVG(descontoPct) as avgDiscount,
            COUNT(DISTINCT clientCode) as uniqueClients,
            COUNT(DISTINCT productCode) as uniqueProducts,
            SUM(CASE WHEN faturamentoRealizado IS NULL THEN 1 ELSE 0 END) as openOrders
          FROM sales_invoices
          WHERE representativeId IS NOT NULL
          GROUP BY representativeId, repCode, repName
          ORDER BY totalRevenue DESC
        `;
        const [result] = await conn.execute(query);
        return result as any[];
      } finally {
        conn.release();
      }
    }),

    // Vendas por cliente
    getByClient: protectedProcedure.query(async () => {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const query = `
          SELECT 
            clientId,
            clientCode,
            clientName,
            COUNT(*) as totalSales,
            SUM(faturamentoRealizado) as totalRevenue,
            AVG(faturamentoRealizado) as avgTicket,
            COUNT(DISTINCT productCode) as uniqueProducts,
            COUNT(DISTINCT representativeId) as uniqueReps,
            MAX(invoiceDate) as lastSaleDate
          FROM sales_invoices
          WHERE clientId IS NOT NULL
          GROUP BY clientId, clientCode, clientName
          ORDER BY totalRevenue DESC
        `;
        const [result] = await conn.execute(query);
        return result as any[];
      } finally {
        conn.release();
      }
    }),

    // Vendas por produto
    getByProduct: protectedProcedure.query(async () => {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const query = `
          SELECT 
            productId,
            productCode,
            productName,
            COUNT(*) as totalSales,
            SUM(faturamentoRealizado) as totalRevenue,
            SUM(qtdSacos) as totalQuantity,
            AVG(precoPorSaco) as avgPrice,
            COUNT(DISTINCT clientCode) as uniqueClients,
            COUNT(DISTINCT representativeId) as uniqueReps
          FROM sales_invoices
          WHERE productId IS NOT NULL AND faturamentoRealizado IS NOT NULL
          GROUP BY productId, productCode, productName
          ORDER BY totalRevenue DESC
        `;
        const [result] = await conn.execute(query);
        return result as any[];
      } finally {
        conn.release();
      }
    }),
  }),

  // ============================================================
  // CLIENTES - Subdivididos por representante e status
  // ============================================================
  clients: router({
    // Clientes por representante (ativos/inativos)
    getByRepWithStatus: protectedProcedure
      .input(z.object({ repId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const pool = getPool();
        const conn = await pool.getConnection();
        try {
          const query = `
            SELECT 
              representativeId,
              status,
              inactivityStatus,
              abcClass,
              COUNT(*) as count,
              SUM(totalPurchases) as totalRevenue,
              AVG(totalPurchases) as avgRevenue,
              COUNT(DISTINCT city) as uniqueCities
            FROM clients
            ${input?.repId ? 'WHERE representativeId = ?' : ''}
            GROUP BY representativeId, status, inactivityStatus, abcClass
            ORDER BY representativeId, status, abcClass
          `;
          const params = input?.repId ? [input.repId] : [];
          const [result] = await conn.execute(query, params);
          return result as any[];
        } finally {
          conn.release();
        }
      }),

    // Alertas de inatividade (6+ meses)
    getInactiveAlerts: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const pool = getPool();
        const conn = await pool.getConnection();
        try {
          const query = `
            SELECT 
              ia.id,
              ia.clientId,
              ia.clientCode,
              ia.clientName,
              ia.lastPurchaseDate,
              ia.daysInactive,
              ia.alertStatus,
              c.representativeId,
              r.name as repName
            FROM inactivityAlerts ia
            LEFT JOIN clients c ON ia.clientId = c.id
            LEFT JOIN representatives r ON c.representativeId = r.id
            WHERE ia.alertStatus = 'active'
            ORDER BY ia.daysInactive DESC
            LIMIT ?
          `;
          const [result] = await conn.execute(query, [input?.limit || 50]);
          return result as any[];
        } finally {
          conn.release();
        }
      }),

    // Clientes por ABC class
    getByABCClass: protectedProcedure.query(async () => {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const query = `
          SELECT 
            abcClass,
            status,
            COUNT(*) as count,
            SUM(totalPurchases) as totalRevenue,
            AVG(totalPurchases) as avgRevenue
          FROM clients
          WHERE abcClass IS NOT NULL
          GROUP BY abcClass, status
          ORDER BY abcClass, status
        `;
        const [result] = await conn.execute(query);
        return result as any[];
      } finally {
        conn.release();
      }
    }),
  }),

  // ============================================================
  // PRODUTOS - Curva ABC
  // ============================================================
  products: router({
    // Produtos por ABC class
    getByABCClass: protectedProcedure.query(async () => {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const query = `
          SELECT 
            p.id,
            p.productCode,
            p.name,
            p.abcClass,
            COUNT(DISTINCT si.id) as totalSales,
            SUM(si.faturamentoRealizado) as totalRevenue,
            SUM(si.qtdSacos) as totalQuantity,
            AVG(si.precoPorSaco) as avgPrice
          FROM products p
          LEFT JOIN sales_invoices si ON p.id = si.productId
          WHERE p.abcClass IS NOT NULL
          GROUP BY p.id, p.productCode, p.name, p.abcClass
          ORDER BY p.abcClass, totalRevenue DESC
        `;
        const [result] = await conn.execute(query);
        return result as any[];
      } finally {
        conn.release();
      }
    }),
  }),

  // ============================================================
  // REPRESENTANTES - Curva ABC
  // ============================================================
  representatives: router({
    // Representantes por ABC class
    getByABCClass: protectedProcedure.query(async () => {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const query = `
          SELECT 
            r.id,
            r.repCode,
            r.name,
            r.abcClass,
            COUNT(DISTINCT si.id) as totalSales,
            SUM(si.faturamentoRealizado) as totalRevenue,
            COUNT(DISTINCT si.clientCode) as uniqueClients,
            COUNT(DISTINCT si.productCode) as uniqueProducts
          FROM representatives r
          LEFT JOIN sales_invoices si ON r.id = si.representativeId
          WHERE r.abcClass IS NOT NULL
          GROUP BY r.id, r.repCode, r.name, r.abcClass
          ORDER BY r.abcClass, totalRevenue DESC
        `;
        const [result] = await conn.execute(query);
        return result as any[];
      } finally {
        conn.release();
      }
    }),
  }),
});
