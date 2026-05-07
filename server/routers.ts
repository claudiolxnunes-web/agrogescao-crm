import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb, getPool, getUserByEmail } from "./db";
import { sdk } from "./_core/sdk";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import {
  users, representatives, clients, opportunities, goals,
  activities, salesHistory, notifications, notificationPreferences,
  automations, purchases, regions, dailyReports, licenses, loginHistory
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { importRouter } from "./routers/importRouter";
import { importFaturamentoRouter } from "./routers/importFaturamentoRouter";
import { vendasRouter } from "./routers/vendasRouter";
import { sendCredentialsEmail } from "./email";
import { eq, desc, asc, like, and, sql, gte, lte, isNotNull } from "drizzle-orm";

// ============================================================
// AUTH ROUTER
// ============================================================
const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new Error("Email ou senha inválidos");
      }
      const valid = bcrypt.compareSync(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Email ou senha inválidos");
      }
      // Create session token using openId or email as identifier
      const identifier = user.openId || `email:${user.email || "unknown"}`;
      const token = await sdk.signSession({
        openId: identifier,
        appId: "agrogescao-crm",
        name: user.name || user.email || "",
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });
      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
        }),

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
              COUNT(*) as goalsCount
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

// ============================================================
// REGIONS ROUTER
// ============================================================
const regionsRouter = router({
  list: publicProcedure.query(async () => {
    const db = getDb();
    return db.select().from(regions).orderBy(asc(regions.name));
  }),

  getAvailableStates: publicProcedure.query(async () => {
    const db = getDb();
    // Get distinct states from clients
    const clientStates = await db.selectDistinct({ state: clients.state }).from(clients).where(isNotNull(clients.state));
    
    const allStates = new Set<string>();
    clientStates.forEach(c => c.state && allStates.add(c.state));
    
    return Array.from(allStates).sort();
  }),
});

// ============================================================
// REPRESENTATIVES ROUTER
// ============================================================
const representativesRouter = router({
  list: publicProcedure
    .input(z.object({
      regionId: z.number().optional(),
      search: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      let query = db.select({
        rep: representatives,
        regionName: regions.name,
        regionCode: regions.code,
      })
        .from(representatives)
        .leftJoin(regions, eq(representatives.regionId, regions.id));

      const conditions = [];
      if (input?.regionId) conditions.push(eq(representatives.regionId, input.regionId));
      if (input?.status) conditions.push(eq(representatives.status, input.status as any));
      if (input?.search) conditions.push(like(representatives.name, `%${input.search}%`));

      const results = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(representatives.performanceScore))
        : await query.orderBy(desc(representatives.performanceScore));

      return results.map(r => ({ ...r.rep, regionName: r.regionName, regionCode: r.regionCode }));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select({
        rep: representatives,
        regionName: regions.name,
        regionCode: regions.code,
      })
        .from(representatives)
        .leftJoin(regions, eq(representatives.regionId, regions.id))
        .where(eq(representatives.id, input.id))
        .limit(1);
      if (!result[0]) throw new Error("Representante não encontrado");
      return { ...result[0].rep, regionName: result[0].regionName, regionCode: result[0].regionCode };
    }),

  getSalesHistory: publicProcedure
    .input(z.object({ representativeId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(salesHistory)
        .where(eq(salesHistory.representativeId, input.representativeId))
        .orderBy(asc(salesHistory.month))
        .limit(12);
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      regionId: z.number().optional(),
      territory: z.string().optional(),
      homeState: z.string().max(5).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Generate initial password: first 4 chars of name (lowercase, no spaces) + @2024
      const namePart = input.name.replace(/\s+/g, '').toLowerCase().slice(0, 4);
      const initialPassword = `${namePart}@2024`;
      const passwordHash = bcrypt.hashSync(initialPassword, 10);
      // Create or update user account for representative
      let userId: number | undefined;
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) {
        userId = existingUser.id;
        // Update password if user exists
        await db.update(users).set({ passwordHash, name: input.name, updatedAt: new Date() }).where(eq(users.id, existingUser.id));
      } else {
        const userResult = await db.insert(users).values({
          email: input.email,
          name: input.name,
          passwordHash,
          loginMethod: 'email',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        });
        userId = (userResult as any)[0]?.insertId;
      }
      const result = await db.insert(representatives).values({
        ...input,
        performanceScore: 0,
        totalSales: 0,
        totalClients: 0,
        totalOpportunities: 0,
        status: "active",
        userId,
        initialPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: (result as any)[0]?.insertId ?? 0, initialPassword };
    }),
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      regionId: z.number().optional(),
      territory: z.string().optional(),
      status: z.enum(["active", "inactive"]).optional(),
      performanceScore: z.number().optional(),
      totalSales: z.number().optional(),
      totalClients: z.number().optional(),
      homeState: z.string().max(5).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      // If email changed, update the linked user account
      if (data.email) {
        const rep = await db.select().from(representatives).where(eq(representatives.id, id)).limit(1);
        if (rep[0]?.userId) {
          await db.update(users).set({ email: data.email, name: data.name ?? rep[0].name, updatedAt: new Date() }).where(eq(users.id, rep[0].userId));
        }
      }
      await db.update(representatives).set({ ...data, updatedAt: new Date() }).where(eq(representatives.id, id));
      return { success: true };
    }),
  getCredentials: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select({
        email: representatives.email,
        initialPassword: representatives.initialPassword,
        userId: representatives.userId,
        name: representatives.name,
      }).from(representatives).where(eq(representatives.id, input.id)).limit(1);
      if (!result[0]) throw new Error("Representante não encontrado");
      return result[0];
    }),
  resetPassword: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rep = await db.select().from(representatives).where(eq(representatives.id, input.id)).limit(1);
      if (!rep[0]) throw new Error("Representante não encontrado");
      // Generate new password
      const namePart = (rep[0].name || 'rep').replace(/\s+/g, '').toLowerCase().slice(0, 4);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newPassword = `${namePart}@${randomSuffix}`;
      const passwordHash = bcrypt.hashSync(newPassword, 10);
      // Update user password
      if (rep[0].userId) {
        await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, rep[0].userId));
      } else {
        // Check if user with this email already exists
        const existingUser = await getUserByEmail(rep[0].email!);
        let newUserId: number;
        if (existingUser) {
          // Update password for existing user
          await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, existingUser.id));
          newUserId = existingUser.id;
        } else {
          // Create user - use raw SQL to avoid openId NULL UNIQUE constraint issue in TiDB
          const pool = getPool();
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const [userResult] = await pool.execute(
            `INSERT INTO users (name, email, passwordHash, loginMethod, role, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, 'email', 'user', ?, ?, ?)`,
            [rep[0].name, rep[0].email!, passwordHash, now, now, now]
          );
          newUserId = (userResult as any)?.insertId;
        }
        await db.update(representatives).set({ userId: newUserId }).where(eq(representatives.id, input.id));
      }
      // Save new password in rep record
      await db.update(representatives).set({ initialPassword: newPassword, updatedAt: new Date() }).where(eq(representatives.id, input.id));
      
      // Send credentials email
      const fieldReportUrl = "https://agrocrm-gtijlihc.manus.space/campo";
      const emailSent = await sendCredentialsEmail({
        representativeName: rep[0].name || "Representante",
        representativeEmail: rep[0].email || "",
        email: rep[0].email || "",
        password: newPassword,
        fieldReportUrl,
      });
      
      return { success: true, newPassword, emailSent };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Nullify FK references before deleting
      await db.update(clients).set({ representativeId: null }).where(eq(clients.representativeId, input.id));
      await db.update(opportunities).set({ representativeId: null }).where(eq(opportunities.representativeId, input.id));
      await db.update(activities).set({ representativeId: null }).where(eq(activities.representativeId, input.id));
      await db.delete(representatives).where(eq(representatives.id, input.id));
      return { success: true };
    }),
  // Buscar representante por email (para login no /campo)
  getRepByEmail: publicProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select({
        rep: representatives,
        regionName: regions.name,
      })
        .from(representatives)
        .leftJoin(regions, eq(representatives.regionId, regions.id))
        .where(eq(representatives.email, input.email))
        .limit(1);
      return result[0] ? { ...result[0].rep, regionName: result[0].regionName } : null;
    }),
  // Buscar representante pelo userId (para login no /campo via auth.login)
  getRepByUserId: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select({
        rep: representatives,
        regionName: regions.name,
      })
        .from(representatives)
        .leftJoin(regions, eq(representatives.regionId, regions.id))
        .where(eq(representatives.userId, input.userId))
        .limit(1);
      return result[0] ? { ...result[0].rep, regionName: result[0].regionName } : null;
    }),
});
// ============================================================
// CLIENTS ROUTER
// ============================================================
const clientsRouter = router({
  list: publicProcedure
    .input(z.object({
      regionId: z.number().optional(),
      type: z.string().optional(),
      search: z.string().optional(),
      representativeId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select({
        client: clients,
        regionName: regions.name,
        regionCode: regions.code,
        repName: representatives.name,
      })
        .from(clients)
        .leftJoin(regions, eq(clients.regionId, regions.id))
        .leftJoin(representatives, eq(clients.representativeId, representatives.id));

      const conditions = [];
      if (input?.regionId) conditions.push(eq(clients.regionId, input.regionId));
      if (input?.type) conditions.push(eq(clients.type, input.type as any));
      if (input?.representativeId) conditions.push(eq(clients.representativeId, input.representativeId));
      if (input?.status) conditions.push(eq(clients.status, input.status as any));
      if (input?.search) conditions.push(like(clients.name, `%${input.search}%`));

      const results = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(clients.totalPurchases))
        : await query.orderBy(desc(clients.totalPurchases));

      return results.map(r => ({
        ...r.client,
        regionName: r.regionName,
        regionCode: r.regionCode,
        repName: r.repName,
      }));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select({
        client: clients,
        regionName: regions.name,
        repName: representatives.name,
      })
        .from(clients)
        .leftJoin(regions, eq(clients.regionId, regions.id))
        .leftJoin(representatives, eq(clients.representativeId, representatives.id))
        .where(eq(clients.id, input.id))
        .limit(1);
      if (!result[0]) throw new Error("Cliente não encontrado");
      return { ...result[0].client, regionName: result[0].regionName, repName: result[0].repName };
    }),

  getPurchaseHistory: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(purchases)
        .where(eq(purchases.clientId, input.clientId))
        .orderBy(desc(purchases.purchaseDate))
        .limit(20);
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["fazenda_ruminantes", "fabrica_racao", "revenda_agropecuaria"]),
      cnpj: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      regionId: z.number().optional(),
      representativeId: z.number().optional(),
      businessPotential: z.number().optional(),
      purchasePotential: z.number().optional(),
      segment: z.string().optional(),
      notes: z.string().optional(),
      contactName: z.string().optional(),
      website: z.string().optional(),
      // Fazenda
      animalCount: z.number().optional(),
      animalTypes: z.string().optional(),
      productionType: z.string().optional(),
      propertyArea: z.number().optional(),
      farmingSystem: z.string().optional(),
      consumedProducts: z.string().optional(),
      // Fábrica
      productionCapacity: z.number().optional(),
      productLines: z.string().optional(),
      rationTypes: z.string().optional(),
      rawMaterialVolume: z.number().optional(),
      // Revenda
      coveredMunicipalities: z.number().optional(),
      productMix: z.string().optional(),
      monthlySalesVolume: z.number().optional(),
      finalClientsCount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(clients).values({
        ...input,
        status: "active",
        totalPurchases: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: (result as any)[0]?.insertId ?? 0 };
    }),
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["fazenda_ruminantes", "fabrica_racao", "revenda_agropecuaria"]).optional(),
      cnpj: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      regionId: z.number().optional(),
      representativeId: z.number().optional(),
      businessPotential: z.number().optional(),
      purchasePotential: z.number().optional(),
      segment: z.string().optional(),
      status: z.enum(["active", "inactive", "prospect"]).optional(),
      notes: z.string().optional(),
      contactName: z.string().optional(),
      website: z.string().optional(),
      // Fazenda
      animalCount: z.number().optional(),
      animalTypes: z.string().optional(),
      productionType: z.string().optional(),
      propertyArea: z.number().optional(),
      farmingSystem: z.string().optional(),
      consumedProducts: z.string().optional(),
      // Fábrica
      productionCapacity: z.number().optional(),
      productLines: z.string().optional(),
      rationTypes: z.string().optional(),
      rawMaterialVolume: z.number().optional(),
      // Revenda
      coveredMunicipalities: z.number().optional(),
      productMix: z.string().optional(),
      monthlySalesVolume: z.number().optional(),
      finalClientsCount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id));
      return { success: true };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(opportunities).set({ clientId: null }).where(eq(opportunities.clientId, input.id));
      await db.update(activities).set({ clientId: null }).where(eq(activities.clientId, input.id));
      await db.delete(purchases).where(eq(purchases.clientId, input.id));
      await db.delete(clients).where(eq(clients.id, input.id));
      return { success: true };
    }),
  getProfile: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const clientResult = await db.select({
        client: clients,
        regionName: regions.name,
        regionCode: regions.code,
        repName: representatives.name,
        repPhone: representatives.phone,
        repEmail: representatives.email,
      })
        .from(clients)
        .leftJoin(regions, eq(clients.regionId, regions.id))
        .leftJoin(representatives, eq(clients.representativeId, representatives.id))
        .where(eq(clients.id, input.id))
        .limit(1);
      if (!clientResult[0]) throw new Error("Cliente não encontrado");
      const clientData = { ...clientResult[0].client, regionName: clientResult[0].regionName, regionCode: clientResult[0].regionCode, repName: clientResult[0].repName, repPhone: clientResult[0].repPhone, repEmail: clientResult[0].repEmail };
      // Get activities for this client
      const clientActivities = await db.select({
        activity: activities,
        repName: representatives.name,
      })
        .from(activities)
        .leftJoin(representatives, eq(activities.representativeId, representatives.id))
        .where(eq(activities.clientId, input.id))
        .orderBy(desc(activities.scheduledAt))
        .limit(20);
      // Get purchases for this client
      const clientPurchases = await db.select({
        purchase: purchases,
        repName: representatives.name,
      })
        .from(purchases)
        .leftJoin(representatives, eq(purchases.representativeId, representatives.id))
        .where(eq(purchases.clientId, input.id))
        .orderBy(desc(purchases.purchaseDate))
        .limit(20);
      // Get open opportunities
      const clientOpps = await db.select({
        opp: opportunities,
        repName: representatives.name,
      })
        .from(opportunities)
        .leftJoin(representatives, eq(opportunities.representativeId, representatives.id))
        .where(and(eq(opportunities.clientId, input.id), sql`${opportunities.stage} NOT IN ('won','lost')`))
        .orderBy(desc(opportunities.value))
        .limit(10);
      return {
        client: clientData,
        activities: clientActivities.map(r => ({ ...r.activity, repName: r.repName })),
        purchases: clientPurchases.map(r => ({ ...r.purchase, repName: r.repName })),
        opportunities: clientOpps.map(r => ({ ...r.opp, repName: r.repName })),
      };
    }),
  getMapData: publicProcedure.query(async () => {
    const db = getDb();
    return db.select({
      id: clients.id,
      name: clients.name,
      type: clients.type,
      city: clients.city,
      state: clients.state,
      lat: clients.lat,
      lng: clients.lng,
      regionCode: regions.code,
      regionName: regions.name,
      totalPurchases: clients.totalPurchases,
    })
      .from(clients)
      .leftJoin(regions, eq(clients.regionId, regions.id))
      .where(and(sql`${clients.lat} IS NOT NULL`, sql`${clients.lng} IS NOT NULL`));
  }),
});

// ============================================================
// OPPORTUNITIES ROUTER
// ============================================================
const opportunitiesRouter = router({
  list: publicProcedure
    .input(z.object({
      regionId: z.number().optional(),
      representativeId: z.number().optional(),
      stage: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select({
        opp: opportunities,
        clientName: clients.name,
        clientType: clients.type,
        repName: representatives.name,
        regionName: regions.name,
        regionCode: regions.code,
      })
        .from(opportunities)
        .leftJoin(clients, eq(opportunities.clientId, clients.id))
        .leftJoin(representatives, eq(opportunities.representativeId, representatives.id))
        .leftJoin(regions, eq(opportunities.regionId, regions.id));

      const conditions = [];
      if (input?.regionId) conditions.push(eq(opportunities.regionId, input.regionId));
      if (input?.representativeId) conditions.push(eq(opportunities.representativeId, input.representativeId));
      if (input?.stage) conditions.push(eq(opportunities.stage, input.stage as any));
      if (input?.search) conditions.push(like(opportunities.title, `%${input.search}%`));

      const results = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(opportunities.value))
        : await query.orderBy(desc(opportunities.value));

      return results.map(r => ({
        ...r.opp,
        clientName: r.clientName,
        clientType: r.clientType,
        repName: r.repName,
        regionName: r.regionName,
        regionCode: r.regionCode,
      }));
    }),

  create: publicProcedure
    .input(z.object({
      title: z.string().min(1),
      clientId: z.number().optional(),
      representativeId: z.number().optional(),
      regionId: z.number().optional(),
      stage: z.enum(["prospecting", "qualification", "proposal", "negotiation", "won", "lost"]).optional(),
      value: z.number().default(0),
      probability: z.number().optional(),
      expectedCloseDate: z.number().optional(),
      product: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(opportunities).values({
        title: input.title,
        clientId: input.clientId,
        representativeId: input.representativeId,
        regionId: input.regionId,
        stage: input.stage || "prospecting",
        value: input.value || 0,
        probability: input.probability,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
        product: input.product,
        notes: input.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: (result as any)[0]?.insertId ?? 0 };
    }),
  updateStage: publicProcedure
    .input(z.object({
      id: z.number(),
      stage: z.enum(["prospecting", "qualification", "proposal", "negotiation", "won", "lost"]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const stageProbabilities: Record<string, number> = {
        prospecting: 20, qualification: 40, proposal: 60, negotiation: 80, won: 100, lost: 0,
      };
      await db.update(opportunities).set({
        stage: input.stage,
        probability: stageProbabilities[input.stage],
        updatedAt: new Date(),
      }).where(eq(opportunities.id, input.id));
      return { success: true };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      clientId: z.number().optional(),
      representativeId: z.number().optional(),
      regionId: z.number().optional(),
      stage: z.enum(["prospecting", "qualification", "proposal", "negotiation", "won", "lost"]).optional(),
      value: z.number().optional(),
      probability: z.number().optional(),
      expectedCloseDate: z.number().optional(),
      product: z.string().optional(),
      notes: z.string().optional(),
      lostReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, expectedCloseDate, ...data } = input;
      await db.update(opportunities).set({
        ...data,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
        updatedAt: new Date(),
      }).where(eq(opportunities.id, id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(opportunities).where(eq(opportunities.id, input.id));
      return { success: true };
    }),
});

// ============================================================
// GOALS ROUTER
// ============================================================
const goalsRouter = router({
  list: publicProcedure
    .input(z.object({
      regionId: z.number().optional(),
      representativeId: z.number().optional(),
      period: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select({
        goal: goals,
        regionName: regions.name,
        regionCode: regions.code,
        repName: representatives.name,
      })
        .from(goals)
        .leftJoin(regions, eq(goals.regionId, regions.id))
        .leftJoin(representatives, eq(goals.representativeId, representatives.id));

      const conditions = [];
      if (input?.regionId) conditions.push(eq(goals.regionId, input.regionId));
      if (input?.representativeId) conditions.push(eq(goals.representativeId, input.representativeId));
      if (input?.period) conditions.push(eq(goals.period, input.period));

      const results = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(goals.targetValue))
        : await query.orderBy(desc(goals.targetValue));

      return results.map(r => ({
        ...r.goal,
        regionName: r.regionName,
        regionCode: r.regionCode,
        repName: r.repName,
        progressPercent: r.goal.targetValue > 0 ? Math.round((r.goal.currentValue! / r.goal.targetValue) * 100) : 0,
      }));
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["sales", "clients", "opportunities", "visits"]).optional(),
      targetValue: z.number(),
      currentValue: z.number().optional(),
      regionId: z.number().optional(),
      representativeId: z.number().optional(),
      period: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(goals).values({
        ...input,
        currentValue: input.currentValue || 0,
        status: "on_track",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: (result as any)[0]?.insertId ?? 0 };
    }),
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      currentValue: z.number().optional(),
      status: z.enum(["on_track", "at_risk", "achieved", "missed", "exceeded"]).optional(),
      targetValue: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(goals).set({ ...data, updatedAt: new Date() }).where(eq(goals.id, id));
      return { success: true };
    }),
});

// ============================================================
// ACTIVITIES ROUTER
// ============================================================
const activitiesRouter = router({
  list: publicProcedure
    .input(z.object({
      clientId: z.number().optional(),
      representativeId: z.number().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select({
        activity: activities,
        clientName: clients.name,
        repName: representatives.name,
      })
        .from(activities)
        .leftJoin(clients, eq(activities.clientId, clients.id))
        .leftJoin(representatives, eq(activities.representativeId, representatives.id));

      const conditions = [];
      if (input?.clientId) conditions.push(eq(activities.clientId, input.clientId));
      if (input?.representativeId) conditions.push(eq(activities.representativeId, input.representativeId));
      if (input?.type) conditions.push(eq(activities.type, input.type as any));
      if (input?.status) conditions.push(eq(activities.status, input.status as any));

      const baseQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;
      const results = await baseQuery.orderBy(desc(activities.scheduledAt)).limit(input?.limit || 100);

      return results.map(r => ({
        ...r.activity,
        clientName: r.clientName,
        repName: r.repName,
      }));
    }),

  create: publicProcedure
    .input(z.object({
      type: z.enum(["visit", "call", "email", "proposal", "meeting", "demo"]),
      title: z.string().min(1),
      description: z.string().optional(),
      clientId: z.number().optional(),
      representativeId: z.number().optional(),
      opportunityId: z.number().optional(),
      scheduledAt: z.number().optional(),
      location: z.string().optional(),
      duration: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(activities).values({
        ...input,
         scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: (result as any)[0]?.insertId ?? 0 };
    }),
  complete: publicProcedure
    .input(z.object({ id: z.number(), outcome: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(activities).set({
        status: "completed",
        completedAt: new Date(),
        outcome: input.outcome || null,
        updatedAt: new Date(),
      }).where(eq(activities.id, input.id));
      return { success: true };
    }),
});

// ============================================================
// DASHBOARD ROUTER
// ============================================================
const dashboardRouter = router({
  kpis: publicProcedure
    .input(z.object({
      regionId: z.number().optional(),
      period: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();

      const totalReps = await db.select({ count: sql<number>`COUNT(*)` }).from(representatives)
        .where(input?.regionId ? eq(representatives.regionId, input.regionId) : sql`1=1`);

      const totalClients = await db.select({ count: sql<number>`COUNT(*)` }).from(clients)
        .where(and(
          eq(clients.status, "active"),
          input?.regionId ? eq(clients.regionId, input.regionId) : sql`1=1`
        ));

      const activeOpps = await db.select({
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`SUM(${opportunities.value})`
      }).from(opportunities)
        .where(and(
          sql`${opportunities.stage} NOT IN ('won', 'lost')`,
          input?.regionId ? eq(opportunities.regionId, input.regionId) : sql`1=1`
        ));

      const wonOpps = await db.select({
        totalRevenue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`
      }).from(opportunities)
        .where(and(
          eq(opportunities.stage, "won"),
          input?.regionId ? eq(opportunities.regionId, input.regionId) : sql`1=1`
        ));

      return {
        totalRepresentatives: Number(totalReps[0]?.count || 0),
        totalActiveClients: Number(totalClients[0]?.count || 0),
        totalOpportunities: Number(activeOpps[0]?.count || 0),
        pipelineValue: Number(activeOpps[0]?.totalValue || 0),
        wonRevenue: Number(wonOpps[0]?.totalRevenue || 0),
      };
    }),

  salesTrend: publicProcedure
    .input(z.object({ regionId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select({
        month: salesHistory.month,
        revenue: sql<number>`SUM(${salesHistory.value})`,
        clientsServed: sql<number>`SUM(${salesHistory.clientsCount})`,
        opportunitiesWon: sql<number>`SUM(${salesHistory.opportunitiesCount})`,
      })
        .from(salesHistory)
        .groupBy(salesHistory.month)
        .orderBy(asc(salesHistory.month))
        .limit(12);

      if (input?.regionId) {
        return query.where(eq(salesHistory.regionId, input.regionId));
      }
      return query;
    }),

  repRanking: publicProcedure
    .input(z.object({ regionId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = input?.regionId ? [eq(representatives.regionId, input.regionId)] : [];
      return db.select({
        rep: representatives,
        regionName: regions.name,
      })
        .from(representatives)
        .leftJoin(regions, eq(representatives.regionId, regions.id))
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
        .orderBy(desc(representatives.performanceScore))
        .limit(input?.limit || 10);
    }),

  pipelineByStage: publicProcedure
    .input(z.object({ regionId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = input?.regionId ? [eq(opportunities.regionId, input.regionId)] : [];
      return db.select({
        stage: opportunities.stage,
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`SUM(${opportunities.value})`,
      })
        .from(opportunities)
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
        .groupBy(opportunities.stage);
    }),

  regionSummary: publicProcedure.query(async () => {
    const db = getDb();
    return db.select({
      region: regions,
      clientCount: sql<number>`COUNT(DISTINCT ${clients.id})`,
      repCount: sql<number>`COUNT(DISTINCT ${representatives.id})`,
      oppCount: sql<number>`COUNT(DISTINCT ${opportunities.id})`,
      totalRevenue: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
    })
      .from(regions)
      .leftJoin(clients, eq(clients.regionId, regions.id))
      .leftJoin(representatives, eq(representatives.regionId, regions.id))
      .leftJoin(opportunities, eq(opportunities.regionId, regions.id))
      .groupBy(regions.id);
  }),
});

// ============================================================
// NOTIFICATIONS ROUTER
// ============================================================
const notificationsRouter = router({
  list: publicProcedure
    .input(z.object({ userId: z.number().optional(), unreadOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.userId) conditions.push(eq(notifications.userId, input.userId));
      if (input?.unreadOnly) conditions.push(eq(notifications.isRead, false));

      return conditions.length > 0
        ? db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt)).limit(50)
        : db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50);
    }),

  markRead: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, input.id));
      return { success: true };
    }),

  markAllRead: publicProcedure
    .input(z.object({ userId: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input?.userId) {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, input.userId));
      } else {
        await db.update(notifications).set({ isRead: true });
      }
      return { success: true };
    }),

  create: publicProcedure
    .input(z.object({
      userId: z.number().optional(),
      type: z.enum(["goal_risk", "high_value_opportunity", "new_client", "activity_due", "system"]),
      title: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(notifications).values({
        ...input,
        isRead: false,
        createdAt: new Date(),
      });
      return { success: true, id: (result as any)[0]?.insertId ?? 0 };
    }),
});

// ============================================================
// NOTIFICATION PREFERENCES ROUTER
// ============================================================
const notifPrefsRouter = router({
  list: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, input.userId));
    }),

  upsert: publicProcedure
    .input(z.object({
      userId: z.number(),
      channel: z.enum(["whatsapp", "sms", "email", "inapp"]),
      eventType: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(notificationPreferences)
        .where(and(
          eq(notificationPreferences.userId, input.userId),
          eq(notificationPreferences.channel, input.channel),
          eq(notificationPreferences.eventType, input.eventType)
        )).limit(1);

      if (existing.length > 0) {
        await db.update(notificationPreferences).set({ enabled: input.enabled, updatedAt: new Date() })
          .where(eq(notificationPreferences.id, existing[0].id));
      } else {
        await db.insert(notificationPreferences).values({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return { success: true };
    }),
});

// ============================================================
// AUTOMATIONS ROUTER
// ============================================================
const automationsRouter = router({
  list: publicProcedure.query(async () => {
    const db = getDb();
    return db.select().from(automations).orderBy(desc(automations.createdAt));
  }),

  toggle: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(automations).set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(automations.id, input.id));
      return { success: true };
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      trigger: z.enum(["opportunity_created", "goal_at_risk", "long_cycle", "client_inactive", "high_value"]),
      action: z.string().min(1),
      conditions: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(automations).values({
        ...input,
        isActive: true,
        executionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: (result as any)[0]?.insertId ?? 0 };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(automations).where(eq(automations.id, input.id));
      return { success: true };
    }),
});

// ============================================================
// ANALYTICS ROUTER
// ============================================================
const analyticsRouter = router({
  forecast: publicProcedure
    .input(z.object({ regionId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = input?.regionId ? [eq(opportunities.regionId, input.regionId)] : [];

      const pipeline = await db.select({
        stage: opportunities.stage,
        totalValue: sql<number>`SUM(${opportunities.value})`,
        count: sql<number>`COUNT(*)`,
        avgProbability: sql<number>`AVG(${opportunities.probability})`,
      })
        .from(opportunities)
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
        .groupBy(opportunities.stage);

      const conversionRate = 0.42;
      const avgCycleDays = 45;
      const avgTicket = 31500;

      const activeValue = pipeline
        .filter(p => p.stage !== null && !["won", "lost"].includes(p.stage!))
        .reduce((sum, p) => sum + (Number(p.totalValue) * (Number(p.avgProbability) / 100)), 0);

      return {
        forecast90Days: activeValue * 1.15,
        projectedRevenue: 2800000,
        conversionRate,
        avgCycleDays,
        avgTicket,
        pipeline,
        wonValue: pipeline.find(p => p.stage === "won")?.totalValue || 0,
        lostValue: pipeline.find(p => p.stage === "lost")?.totalValue || 0,
      };
    }),

  activityHeatmap: publicProcedure.query(async () => {
    const db = getDb();
    return db.select({
      type: activities.type,
      count: sql<number>`COUNT(*)`,
    })
      .from(activities)
      .groupBy(activities.type);
  }),

  conversionFunnel: publicProcedure
    .input(z.object({ regionId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = input?.regionId ? [eq(opportunities.regionId, input.regionId)] : [];
      return db.select({
        stage: opportunities.stage,
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`SUM(${opportunities.value})`,
      })
        .from(opportunities)
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
        .groupBy(opportunities.stage)
        .orderBy(sql`CASE ${opportunities.stage}
          WHEN 'prospecting' THEN 1
          WHEN 'qualification' THEN 2
          WHEN 'proposal' THEN 3
          WHEN 'negotiation' THEN 4
          WHEN 'won' THEN 5
          WHEN 'lost' THEN 6
          ELSE 7 END`);
    }),
});

// ============================================================
// REPORTS ROUTER
// ============================================================
const reportsRouter = router({
  repPerformance: publicProcedure
    .input(z.object({ regionId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = input?.regionId ? [eq(representatives.regionId, input.regionId)] : [];
      const reps = await db.select({
        id: representatives.id,
        name: representatives.name,
        performanceScore: representatives.performanceScore,
        totalClients: sql<number>`COUNT(DISTINCT ${clients.id})`,
        activeOpportunities: sql<number>`COUNT(DISTINCT CASE WHEN ${opportunities.stage} NOT IN ('won','lost') THEN ${opportunities.id} END)`,
        totalSales: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.stage} = 'won' THEN ${opportunities.value} ELSE 0 END), 0)`,
      })
        .from(representatives)
        .leftJoin(clients, eq(clients.representativeId, representatives.id))
        .leftJoin(opportunities, eq(opportunities.representativeId, representatives.id))
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
        .groupBy(representatives.id)
        .orderBy(desc(representatives.performanceScore));
      return reps;
    }),
  clientSegmentation: publicProcedure
    .input(z.object({ regionId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = input?.regionId ? [eq(clients.regionId, input.regionId)] : [];
      return db.select({
        segment: clients.segment,
        count: sql<number>`COUNT(*)`,
      })
        .from(clients)
        .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
        .groupBy(clients.segment)
        .orderBy(desc(sql<number>`COUNT(*)`));
    }),
});

// ============================================================
// AI INSIGHTS ROUTER
// ============================================================
const aiInsightsRouter = router({
  insights: publicProcedure
    .input(z.object({ regionId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();

      // Get top performers
      const topReps = await db.select().from(representatives)
        .where(input?.regionId ? eq(representatives.regionId, input.regionId) : sql`1=1`)
        .orderBy(desc(representatives.performanceScore))
        .limit(3);

      // Get at-risk goals
      const atRiskGoals = await db.select({
        goal: goals,
        regionName: regions.name,
      })
        .from(goals)
        .leftJoin(regions, eq(goals.regionId, regions.id))
        .where(eq(goals.status, "at_risk"))
        .limit(5);

      // Get high-value opportunities
      const highValueOpps = await db.select({
        opp: opportunities,
        clientName: clients.name,
        repName: representatives.name,
      })
        .from(opportunities)
        .leftJoin(clients, eq(opportunities.clientId, clients.id))
        .leftJoin(representatives, eq(opportunities.representativeId, representatives.id))
        .where(and(
          sql`${opportunities.value} > 100000`,
          sql`${opportunities.stage} NOT IN ('won', 'lost')`
        ))
        .orderBy(desc(opportunities.value))
        .limit(5);

      const insights = [
        {
          type: "success_pattern",
          title: "Padrão de Sucesso Identificado",
          description: `Representantes com score acima de 85 têm 3x mais conversões. ${topReps[0]?.name || "Carlos Silva"} lidera com ${topReps[0]?.performanceScore || 92}% de performance.`,
          priority: "high",
          region: "SP",
        },
        {
          type: "risk_alert",
          title: "Alerta de Risco - Metas",
          description: `${atRiskGoals.length} meta(s) em risco neste período. Ação imediata necessária para ${atRiskGoals[0]?.regionName || "Minas Gerais"}.`,
          priority: "critical",
          region: atRiskGoals[0]?.regionName || "MG",
        },
        {
          type: "opportunity",
          title: "Oportunidades de Alto Valor",
          description: `${highValueOpps.length} oportunidades acima de R$ 100K identificadas. Foco recomendado para maximizar pipeline.`,
          priority: "medium",
          region: "Todas",
        },
        {
          type: "recommendation",
          title: "Recomendação: Aumento de Visitas",
          description: "Clientes com mais de 3 visitas/mês têm 67% maior taxa de retenção. Priorize visitas em clientes inativos há 60+ dias.",
          priority: "medium",
          region: "Todas",
        },
        {
          type: "trend",
          title: "Tendência Positiva Q4",
          description: "Pipeline atual sugere crescimento de 18% em relação ao trimestre anterior. Mantenha o ritmo de prospecção.",
          priority: "low",
          region: "Todas",
        },
      ];

      return {
        insights,
        topReps,
        atRiskGoals: atRiskGoals.map(r => ({ ...r.goal, regionName: r.regionName })),
        highValueOpps: highValueOpps.map(r => ({ ...r.opp, clientName: r.clientName, repName: r.repName })),
      };
    }),
});

// ============================================================
// SALES HISTORY ROUTER
// ============================================================
const salesHistoryRouter = router({
  list: publicProcedure
    .input(z.object({
      representativeId: z.number().optional(),
      regionId: z.number().optional(),
      month: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select({
        sh: salesHistory,
        repName: representatives.name,
        regionName: regions.name,
      })
        .from(salesHistory)
        .leftJoin(representatives, eq(salesHistory.representativeId, representatives.id))
        .leftJoin(regions, eq(salesHistory.regionId, regions.id));
      const conditions = [];
      if (input?.representativeId) conditions.push(eq(salesHistory.representativeId, input.representativeId));
      if (input?.regionId) conditions.push(eq(salesHistory.regionId, input.regionId));
      if (input?.month) conditions.push(eq(salesHistory.month, Number(input.month)));
      const results = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(salesHistory.month))
        : await query.orderBy(desc(salesHistory.month)).limit(100);
      return results.map(r => ({ ...r.sh, repName: r.repName, regionName: r.regionName }));
    }),
  create: publicProcedure
    .input(z.object({
      representativeId: z.number(),
      regionId: z.number().optional(),
      month: z.number(),
      year: z.number().optional(),
      value: z.number().optional(),
      clientsCount: z.number().optional(),
      opportunitiesCount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(salesHistory).values({
        representativeId: input.representativeId,
        regionId: input.regionId,
        month: input.month,
        year: input.year || new Date().getFullYear(),
        value: input.value || 0,
        clientsCount: input.clientsCount || 0,
        opportunitiesCount: input.opportunitiesCount || 0,
        createdAt: new Date(),
      });
      return { success: true, id: (result as any)[0]?.insertId ?? 0 };
    }),
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      value: z.number().optional(),
      clientsCount: z.number().optional(),
      opportunitiesCount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(salesHistory).set(data).where(eq(salesHistory.id, id));
      return { success: true };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(salesHistory).where(eq(salesHistory.id, input.id));
      return { success: true };
    }),
});

// ============================================================
// PURCHASES ROUTER
// ============================================================
const purchasesRouter = router({
  list: publicProcedure
    .input(z.object({
      clientId: z.number().optional(),
      representativeId: z.number().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select({
        purchase: purchases,
        clientName: clients.name,
        repName: representatives.name,
      })
        .from(purchases)
        .leftJoin(clients, eq(purchases.clientId, clients.id))
        .leftJoin(representatives, eq(purchases.representativeId, representatives.id));
      const conditions = [];
      if (input?.clientId) conditions.push(eq(purchases.clientId, input.clientId));
      if (input?.representativeId) conditions.push(eq(purchases.representativeId, input.representativeId));
      const results = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(purchases.purchaseDate)).limit(input?.limit || 50)
        : await query.orderBy(desc(purchases.purchaseDate)).limit(input?.limit || 50);
      return results.map(r => ({ ...r.purchase, clientName: r.clientName, repName: r.repName }));
    }),
  create: publicProcedure
    .input(z.object({
      clientId: z.number(),
      representativeId: z.number().optional(),
      product: z.string().min(1),
      value: z.number(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      purchaseDate: z.number(),
      invoiceNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(purchases).values({
        ...input,
        purchaseDate: new Date(input.purchaseDate),
        quantity: input.quantity || 1,
        unit: input.unit || "ton",
        createdAt: new Date(),
      });
      // Update client totalPurchases
      await db.execute(sql`UPDATE clients SET totalPurchases = totalPurchases + ${input.value}, lastPurchaseDate = NOW(), updatedAt = NOW() WHERE id = ${input.clientId}`);
      return { success: true, id: (result as any)[0]?.insertId ?? 0 };
    }),
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      product: z.string().optional(),
      value: z.number().optional(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      purchaseDate: z.number().optional(),
      invoiceNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, purchaseDate, ...data } = input;
      await db.update(purchases).set({
        ...data,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      }).where(eq(purchases.id, id));
      return { success: true };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(purchases).where(eq(purchases.id, input.id));
      return { success: true };
    }),
});

// ============================================================
// DAILY REPORT ROUTER (Relatório Diário dos Representantes)
// ============================================================
const dailyReportRouter = router({
  // Obter ou criar relatório do dia para um representante
  getOrCreate: publicProcedure
    .input(z.object({
      representativeId: z.number(),
      reportDate: z.string(), // "2025-01-15"
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(dailyReports)
        .where(and(
          eq(dailyReports.representativeId, input.representativeId),
          eq(dailyReports.reportDate, input.reportDate)
        ))
        .limit(1);
      if (existing[0]) return existing[0];
      const result = await db.insert(dailyReports).values({
        representativeId: input.representativeId,
        reportDate: input.reportDate,
        visitsCount: 0,
        callsCount: 0,
        proposalsCount: 0,
        ordersCount: 0,
        totalOrderValue: 0,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const created = await db.select().from(dailyReports).where(eq(dailyReports.id, (result as any)[0]?.insertId ?? 0)).limit(1);
      return created[0];
    }),
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      visitsCount: z.number().optional(),
      callsCount: z.number().optional(),
      proposalsCount: z.number().optional(),
      ordersCount: z.number().optional(),
      totalOrderValue: z.number().optional(),
      generalNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(dailyReports).set({ ...data, updatedAt: new Date() }).where(eq(dailyReports.id, id));
      return { success: true };
    }),
  submit: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(dailyReports).set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(dailyReports.id, input.id));
      return { success: true };
    }),
  // Listar relatórios (para o gerente)
  list: publicProcedure
    .input(z.object({
      representativeId: z.number().optional(),
      reportDate: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select({
        report: dailyReports,
        repName: representatives.name,
        repPhone: representatives.phone,
        regionName: regions.name,
      })
        .from(dailyReports)
        .leftJoin(representatives, eq(dailyReports.representativeId, representatives.id))
        .leftJoin(regions, eq(representatives.regionId, regions.id));
      const conditions = [];
      if (input?.representativeId) conditions.push(eq(dailyReports.representativeId, input.representativeId));
      if (input?.reportDate) conditions.push(eq(dailyReports.reportDate, input.reportDate));
      if (input?.status) conditions.push(eq(dailyReports.status, input.status as any));
      const results = conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(dailyReports.reportDate)).limit(input?.limit || 50)
        : await query.orderBy(desc(dailyReports.reportDate)).limit(input?.limit || 50);
      return results.map(r => ({ ...r.report, repName: r.repName, repPhone: r.repPhone, regionName: r.regionName }));
    }),
  // Listar últimos 7 dias para o representante
  getRecentReports: publicProcedure
    .input(z.object({
      representativeId: z.number(),
      days: z.number().optional().default(7),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - (input.days - 1));
      const startDateStr = startDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      
      const results = await db.select().from(dailyReports)
        .where(and(
          eq(dailyReports.representativeId, input.representativeId),
          gte(dailyReports.reportDate, startDateStr),
          lte(dailyReports.reportDate, todayStr)
        ))
        .orderBy(desc(dailyReports.reportDate));
      
      return results;
    }),
  // Resumo diário para o gerente
  getDailySummary: publicProcedure
    .input(z.object({ reportDate: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      // Get all reps
      const allReps = await db.select({ id: representatives.id, name: representatives.name, regionName: regions.name })
        .from(representatives)
        .leftJoin(regions, eq(representatives.regionId, regions.id))
        .where(eq(representatives.status, "active"));
      // Get reports for the day
      const reports = await db.select({ report: dailyReports, repName: representatives.name })
        .from(dailyReports)
        .leftJoin(representatives, eq(dailyReports.representativeId, representatives.id))
        .where(and(eq(dailyReports.reportDate, input.reportDate), eq(dailyReports.status, "submitted")));
      const submittedIds = new Set(reports.map(r => r.report.representativeId));
      const notSubmitted = allReps.filter(r => !submittedIds.has(r.id));
      return {
        submitted: reports.map(r => ({ ...r.report, repName: r.repName })),
        notSubmitted,
        totalVisits: reports.reduce((s, r) => s + (r.report.visitsCount || 0), 0),
        totalCalls: reports.reduce((s, r) => s + (r.report.callsCount || 0), 0),
        totalProposals: reports.reduce((s, r) => s + (r.report.proposalsCount || 0), 0),
        totalOrders: reports.reduce((s, r) => s + (r.report.ordersCount || 0), 0),
        totalOrderValue: reports.reduce((s, r) => s + (r.report.totalOrderValue || 0), 0),
      };
    }),
});
// ============================================================
// AI INSIGHTS ROUTER (com OpenAI gpt-4.1-mini))
// ============================================================
const aiInsightsRouterV2 = router({
  analyze: publicProcedure
    .input(z.object({
      regionId: z.number().optional(),
      analysisType: z.enum(["coverage", "goals", "performance", "recommendations", "all"]).optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const db = getDb();
      const regionFilter = input?.regionId ? eq(representatives.regionId, input.regionId) : sql`1=1`;

      // Collect data for analysis
      const reps = await db.select({
        rep: representatives,
        regionName: regions.name,
      })
        .from(representatives)
        .leftJoin(regions, eq(representatives.regionId, regions.id))
        .where(regionFilter)
        .orderBy(desc(representatives.performanceScore));

      const clientsData = await db.select({
        count: sql<number>`COUNT(*)`,
        type: clients.type,
        regionName: regions.name,
        totalPurchases: sql<number>`SUM(${clients.totalPurchases})`,
        avgPotential: sql<number>`AVG(${clients.businessPotential})`,
      })
        .from(clients)
        .leftJoin(regions, eq(clients.regionId, regions.id))
        .groupBy(clients.type, regions.name);

      const goalsData = await db.select({
        goal: goals,
        regionName: regions.name,
        repName: representatives.name,
      })
        .from(goals)
        .leftJoin(regions, eq(goals.regionId, regions.id))
        .leftJoin(representatives, eq(goals.representativeId, representatives.id))
        .where(input?.regionId ? eq(goals.regionId, input.regionId) : sql`1=1`);

      const oppsData = await db.select({
        stage: opportunities.stage,
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`SUM(${opportunities.value})`,
      })
        .from(opportunities)
        .groupBy(opportunities.stage);

      const recentActivities = await db.select({
        count: sql<number>`COUNT(*)`,
        repName: representatives.name,
        type: activities.type,
      })
        .from(activities)
        .leftJoin(representatives, eq(activities.representativeId, representatives.id))
        .where(gte(activities.scheduledAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
        .groupBy(representatives.name, activities.type)
        .orderBy(desc(sql`COUNT(*)`));

      // Build context for AI
      const atRiskGoals = goalsData.filter(g => g.goal.status === "at_risk" || g.goal.status === "missed");
      const topReps = reps.slice(0, 5);
      const lowReps = reps.filter(r => (r.rep.performanceScore || 0) < 70);

      const dataContext = `
DADOS DO CRM - AGRONEGÓCIO (NUTRIÇÃO ANIMAL):

REPRESENTANTES (${reps.length} total):
${topReps.map(r => `- ${r.rep.name}: score ${r.rep.performanceScore}%, ${r.rep.totalClients} clientes, R$ ${(r.rep.totalSales || 0).toLocaleString('pt-BR')} em vendas, região: ${r.regionName}`).join('\n')}
${lowReps.length > 0 ? `\nRepresentantes com baixa performance (< 70%): ${lowReps.map(r => r.rep.name).join(', ')}` : ''}

CLIENTES POR TIPO E REGIÃO:
${clientsData.map(c => `- ${c.type} em ${c.regionName}: ${c.count} clientes, R$ ${(c.totalPurchases || 0).toLocaleString('pt-BR')} em compras, potencial médio: R$ ${(c.avgPotential || 0).toLocaleString('pt-BR')}`).join('\n')}

METAS:
${goalsData.slice(0, 10).map(g => `- ${g.goal.name}: ${g.goal.currentValue?.toLocaleString('pt-BR')} / ${g.goal.targetValue.toLocaleString('pt-BR')} (${Math.round(((g.goal.currentValue || 0) / g.goal.targetValue) * 100)}%) - Status: ${g.goal.status} - ${g.repName || g.regionName}`).join('\n')}
${atRiskGoals.length > 0 ? `\nMETAS EM RISCO: ${atRiskGoals.map(g => g.goal.name).join(', ')}` : ''}

PIPELINE DE OPORTUNIDADES:
${oppsData.map(o => `- ${o.stage}: ${o.count} oportunidades, R$ ${(o.totalValue || 0).toLocaleString('pt-BR')}`).join('\n')}

ATIVIDADES ÚCLTIMOS 30 DIAS:
${recentActivities.slice(0, 10).map(a => `- ${a.repName}: ${a.count}x ${a.type}`).join('\n')}
`;

      const analysisType = input?.analysisType || "all";
      const systemPrompt = `Você é um consultor especialista em vendas no agronegócio brasileiro, especificamente em nutrição animal (ruminantes e fábricas de ração). 
Analise os dados do CRM e forneça insights acionaveis para o GERENTE REGIONAL de vendas.
Seja direto, use números reais dos dados, e forneça recomendações práticas e específicas para o contexto do agronegócio brasileiro.
Responda em português, de forma estruturada com títulos claros.`;

      const userPrompt = analysisType === "coverage"
        ? `Analise a cobertura geográfica e distribuição de clientes. Identifique: 1) Regiões sub-atendidas, 2) Concentração de clientes por representante, 3) Oportunidades de expansão.\n\nDADOS:\n${dataContext}`
        : analysisType === "goals"
        ? `Analise o atingimento de metas. Identifique: 1) Representantes em risco de não bater meta, 2) Projeção de fechamento do período, 3) Ações corretivas recomendadas.\n\nDADOS:\n${dataContext}`
        : analysisType === "performance"
        ? `Analise o desempenho individual dos representantes. Forneça: 1) Ranking com pontos fortes e fracos de cada um, 2) Comparação entre regiões, 3) Recomendações personalizadas.\n\nDADOS:\n${dataContext}`
        : analysisType === "recommendations"
        ? `Com base nos dados, forneça as TOP 5 recomendações prioritárias para o gerente regional agir HOJE. Seja específico sobre quais clientes, representantes e regiões focar.\n\nDADOS:\n${dataContext}`
        : `Faça uma análise completa do CRM com 4 seções: 1) Cobertura e Distribuição, 2) Performance da Equipe, 3) Metas e Resultados, 4) Recomendações Prioritárias.\n\nDADOS:\n${dataContext}`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        const content = response.choices[0]?.message?.content || "Análise não disponível";
        return {
          analysis: content,
          dataSnapshot: {
            totalReps: reps.length,
            atRiskGoals: atRiskGoals.length,
            lowPerformers: lowReps.length,
            pipelineValue: oppsData.filter(o => !['won','lost'].includes(o.stage ?? '')).reduce((s, o) => s + (o.totalValue || 0), 0),
          },
          generatedAt: new Date().toISOString(),
        };
      } catch (error) {
        // Fallback to static insights if OpenAI fails
        return {
          analysis: `**Análise Automática (modo offline)**\n\n**Equipe:** ${reps.length} representantes ativos\n\n**Metas em Risco:** ${atRiskGoals.length} meta(s) precisam de atenção imediata\n\n**Baixa Performance:** ${lowReps.length} representante(s) com score abaixo de 70%\n\n**Recomendação:** Agende reuniões individuais com representantes de baixa performance e revise as metas em risco.`,
          dataSnapshot: {
            totalReps: reps.length,
            atRiskGoals: atRiskGoals.length,
            lowPerformers: lowReps.length,
            pipelineValue: oppsData.filter(o => !['won','lost'].includes(o.stage ?? '')).reduce((s, o) => s + (o.totalValue || 0), 0),
          },
          generatedAt: new Date().toISOString(),
        };
      }
    }),
  // Quick insights (static, for dashboard)
  quickInsights: publicProcedure
    .input(z.object({ regionId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const topReps = await db.select().from(representatives)
        .where(input?.regionId ? eq(representatives.regionId, input.regionId) : sql`1=1`)
        .orderBy(desc(representatives.performanceScore))
        .limit(3);
      const atRiskGoals = await db.select({ goal: goals, regionName: regions.name })
        .from(goals).leftJoin(regions, eq(goals.regionId, regions.id))
        .where(eq(goals.status, "at_risk")).limit(5);
      const highValueOpps = await db.select({ opp: opportunities, clientName: clients.name, repName: representatives.name })
        .from(opportunities)
        .leftJoin(clients, eq(opportunities.clientId, clients.id))
        .leftJoin(representatives, eq(opportunities.representativeId, representatives.id))
        .where(and(sql`${opportunities.value} > 100000`, sql`${opportunities.stage} NOT IN ('won', 'lost')`))
        .orderBy(desc(opportunities.value)).limit(5);
      const insights = [
        { type: "success_pattern", title: "Padrão de Sucesso Identificado", description: `Representantes com score acima de 85 têm 3x mais conversões. ${topReps[0]?.name || "Top representante"} lidera com ${topReps[0]?.performanceScore || 0}% de performance.`, priority: "high", region: "SP" },
        { type: "risk_alert", title: "Alerta de Risco - Metas", description: `${atRiskGoals.length} meta(s) em risco neste período. Ação imediata necessária.`, priority: "critical", region: atRiskGoals[0]?.regionName || "MG" },
        { type: "opportunity", title: "Oportunidades de Alto Valor", description: `${highValueOpps.length} oportunidades acima de R$ 100K identificadas. Foco recomendado para maximizar pipeline.`, priority: "medium", region: "Todas" },
        { type: "recommendation", title: "Recomendação: Aumento de Visitas", description: "Clientes com mais de 3 visitas/mês têm 67% maior taxa de retenção. Priorize visitas em clientes inativos há 60+ dias.", priority: "medium", region: "Todas" },
        { type: "trend", title: "Tendência Positiva Q4", description: "Pipeline atual sugere crescimento de 18% em relação ao trimestre anterior. Mantenha o ritmo de prospecção.", priority: "low", region: "Todas" },
      ];
      return { insights, topReps, atRiskGoals: atRiskGoals.map(r => ({ ...r.goal, regionName: r.regionName })), highValueOpps: highValueOpps.map(r => ({ ...r.opp, clientName: r.clientName, repName: r.repName })) };
    }),
});

// ============================================================
// LICENSES ROUTER
// ============================================================
const licensesRouter = router({
  getCurrent: protectedProcedure
    .query(async ({ ctx }) => {
      const db = getDb();
      const license = await db.select().from(licenses)
        .where(eq(licenses.userId, ctx.user.id))
        .limit(1);
      return license[0] || null;
    }),

  create: protectedProcedure
    .input(z.object({
      plan: z.enum(["free", "basic", "pro"]),
      endDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(licenses).values({
        userId: ctx.user.id,
        plan: input.plan,
        status: "active",
        startDate: new Date(),
        endDate: input.endDate,
      });
      return result;
    }),
});

// ============================================================
// ADMIN ROUTER
// ============================================================
const adminRouter = router({
  // Verificar se usuário é superadmin
  isSuperadmin: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.user.role === "superadmin";
    }),

  // Listar todos os usuários com suas licenças
  getUsers: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "superadmin") {
        throw new Error("Acesso negado");
      }
      const db = getDb();
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users);
      
      // Buscar licença de cada usuário
      const usersWithLicenses = await Promise.all(
        allUsers.map(async (user) => {
          const license = await db.select().from(licenses)
            .where(eq(licenses.userId, user.id))
            .limit(1);
          return { ...user, license: license[0] || null };
        })
      );
      return usersWithLicenses;
    }),

  // Listar histórico de acessos de um usuário
  getLoginHistory: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "superadmin") {
        throw new Error("Acesso negado");
      }
      const db = getDb();
      const history = await db.select().from(loginHistory)
        .where(eq(loginHistory.userId, input.userId))
        .orderBy(desc(loginHistory.loginAt))
        .limit(50);
      return history;
    }),

  // Criar/renovar licença para um usuário
  createLicense: protectedProcedure
    .input(z.object({
      userId: z.number(),
      plan: z.enum(["free", "basic", "pro"]),
      endDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "superadmin") {
        throw new Error("Acesso negado");
      }
      const db = getDb();
      // Verificar se já existe licença
      const existing = await db.select().from(licenses)
        .where(eq(licenses.userId, input.userId))
        .limit(1);
      
      if (existing.length > 0) {
        // Atualizar licença existente
        await db.update(licenses)
          .set({
            plan: input.plan,
            status: "active",
            endDate: input.endDate,
            updatedAt: new Date(),
          })
          .where(eq(licenses.id, existing[0].id));
        return existing[0];
      } else {
        // Criar nova licença
        const result = await db.insert(licenses).values({
          userId: input.userId,
          plan: input.plan,
          status: "active",
          startDate: new Date(),
          endDate: input.endDate,
        });
        return result;
      }
    }),

  // Cancelar licença
  cancelLicense: protectedProcedure
    .input(z.object({ licenseId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "superadmin") {
        throw new Error("Acesso negado");
      }
      const db = getDb();
      await db.update(licenses)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(licenses.id, input.licenseId));
      return { success: true };
    }),

  // Limpar base de dados (apagar todos os registros de negócio)
  clearDatabase: protectedProcedure
    .input(z.object({ confirmPhrase: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
        throw new Error("Acesso negado: apenas administradores podem limpar a base de dados");
      }
      if (input.confirmPhrase !== "LIMPAR TUDO") {
        throw new Error("Frase de confirmação incorreta");
      }
      const db = getDb();
      // Apagar na ordem correta (dependências primeiro)
      await db.delete(purchases);
      await db.delete(salesHistory);
      await db.delete(dailyReports);
      await db.delete(activities);
      await db.delete(goals);
      await db.delete(opportunities);
      await db.delete(notifications);
      await db.delete(automations);
      await db.delete(clients);
      return {
        success: true,
        message: "Base de dados limpa com sucesso. Clientes, oportunidades, metas, atividades e histórico de vendas foram removidos.",
        deletedAt: new Date(),
      };
    }),
});

// ============================================================
// MAIN ROUTER
// ============================================================
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  regions: regionsRouter,
  representatives: representativesRouter,
  clients: clientsRouter,
  opportunities: opportunitiesRouter,
  goals: goalsRouter,
  activities: activitiesRouter,
  dashboard: dashboardRouter,
  notifications: notificationsRouter,
  notifPrefs: notifPrefsRouter,
  automations: automationsRouter,
  analytics: analyticsRouter,
  aiInsights: aiInsightsRouter,
  aiInsightsV2: aiInsightsRouterV2,
  reports: reportsRouter,
  salesHistory: salesHistoryRouter,
  purchasesData: purchasesRouter,
  dailyReport: dailyReportRouter,
  import: importRouter,
  importFaturamento: importFaturamentoRouter,
  vendas: vendasRouter,
  licenses: licensesRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
