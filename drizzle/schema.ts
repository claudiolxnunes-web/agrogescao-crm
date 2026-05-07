import {
  int,
  mysqlTable,
  text,
  varchar,
  double,
  boolean,
  timestamp,
  mysqlEnum,
  bigint,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ============================================================
// USERS
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }).default("email"),
  role: mysqlEnum("role", ["user", "admin", "superadmin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  lastSignedIn: timestamp("lastSignedIn").notNull().defaultNow(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// REGIÕES
// ============================================================
export const regions = mysqlTable("regions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  totalClients: int("totalClients").default(0),
  totalReps: int("totalReps").default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export type Region = typeof regions.$inferSelect;

// ============================================================
// REPRESENTANTES
// ============================================================
export const representatives = mysqlTable("representatives", {
  id: int("id").primaryKey().autoincrement(),
  repCode: varchar("repCode", { length: 30 }).unique(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 20 }),
  regionId: int("regionId").references(() => regions.id),
  territory: varchar("territory", { length: 200 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active"),
  performanceScore: int("performanceScore").default(0),
  totalSales: double("totalSales").default(0),
  totalClients: int("totalClients").default(0),
  totalOpportunities: int("totalOpportunities").default(0),
  avatar: varchar("avatar", { length: 10 }),
  hireDate: timestamp("hireDate"),
  notes: text("notes"),
  userId: int("userId").references(() => users.id),
  initialPassword: varchar("initialPassword", { length: 100 }),
  homeState: varchar("homeState", { length: 5 }), // Estado sede do representante (UF)
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type Representative = typeof representatives.$inferSelect;
export type InsertRepresentative = typeof representatives.$inferInsert;

// ============================================================
// CLIENTES
// ============================================================
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  clientCode: varchar("clientCode", { length: 30 }).unique(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["fazenda_ruminantes", "fabrica_racao", "revenda_agropecuaria"]).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 300 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  regionId: int("regionId").references(() => regions.id),
  representativeId: int("representativeId").references(() => representatives.id),
  totalPurchases: double("totalPurchases").default(0),
  lastPurchaseDate: timestamp("lastPurchaseDate"),
  businessPotential: double("businessPotential").default(0),
  purchasePotential: double("purchasePotential").default(0),
  segment: varchar("segment", { length: 100 }),
  status: mysqlEnum("status", ["active", "inactive", "prospect"]).default("active"),
  notes: text("notes"),
  lat: double("lat"),
  lng: double("lng"),
  contactName: varchar("contactName", { length: 200 }),
  website: varchar("website", { length: 300 }),
  // Fazenda de Ruminantes
  animalCount: int("animalCount"),
  animalTypes: varchar("animalTypes", { length: 200 }),
  productionType: varchar("productionType", { length: 100 }),
  propertyArea: double("propertyArea"),
  farmingSystem: varchar("farmingSystem", { length: 100 }),
  consumedProducts: varchar("consumedProducts", { length: 300 }),
  // Fábrica de Ração
  productionCapacity: double("productionCapacity"),
  productLines: varchar("productLines", { length: 300 }),
  rationTypes: varchar("rationTypes", { length: 300 }),
  rawMaterialVolume: double("rawMaterialVolume"),
  // Revenda Agropecuária
  coveredMunicipalities: int("coveredMunicipalities"),
  productMix: varchar("productMix", { length: 300 }),
  monthlySalesVolume: double("monthlySalesVolume"),
  finalClientsCount: int("finalClientsCount"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ============================================================
// OPORTUNIDADES
// ============================================================
export const opportunities = mysqlTable("opportunities", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 300 }).notNull(),
  clientId: int("clientId").references(() => clients.id),
  representativeId: int("representativeId").references(() => representatives.id),
  regionId: int("regionId").references(() => regions.id),
  value: double("value").notNull(),
  stage: mysqlEnum("stage", ["prospecting", "qualification", "proposal", "negotiation", "won", "lost"]).notNull().default("prospecting"),
  probability: int("probability").default(0),
  expectedCloseDate: timestamp("expectedCloseDate"),
  product: varchar("product", { length: 200 }),
  notes: text("notes"),
  lostReason: varchar("lostReason", { length: 300 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = typeof opportunities.$inferInsert;

// ============================================================
// METAS
// ============================================================
export const goals = mysqlTable("goals", {
  id: int("id").primaryKey().autoincrement(),
  representativeId: int("representativeId").references(() => representatives.id),
  regionId: int("regionId").references(() => regions.id),
  name: varchar("name", { length: 200 }),
  description: text("description"),
  period: varchar("period", { length: 20 }).notNull(),
  targetValue: double("targetValue").notNull(),
  currentValue: double("currentValue").default(0),
  type: mysqlEnum("type", ["sales", "clients", "opportunities", "visits"]).default("sales"),
  status: mysqlEnum("status", ["on_track", "at_risk", "achieved", "missed", "exceeded"]).default("on_track"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

// ============================================================
// ATIVIDADES
// ============================================================
export const activities = mysqlTable("activities", {
  id: int("id").primaryKey().autoincrement(),
  type: mysqlEnum("type", ["visit", "call", "email", "proposal", "meeting", "demo"]).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  clientId: int("clientId").references(() => clients.id),
  representativeId: int("representativeId").references(() => representatives.id),
  opportunityId: int("opportunityId").references(() => opportunities.id),
  scheduledAt: timestamp("scheduledAt"),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending"),
  outcome: text("outcome"),
  location: varchar("location", { length: 300 }),
  duration: int("duration"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

// ============================================================
// HISTÓRICO DE VENDAS
// ============================================================
export const salesHistory = mysqlTable("sales_history", {
  id: int("id").primaryKey().autoincrement(),
  representativeId: int("representativeId").references(() => representatives.id),
  regionId: int("regionId").references(() => regions.id),
  month: int("month").notNull(),
  year: int("year").notNull(),
  value: double("value").notNull(),
  clientsCount: int("clientsCount").default(0),
  opportunitiesCount: int("opportunitiesCount").default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export type SalesHistory = typeof salesHistory.$inferSelect;
export type InsertSalesHistory = typeof salesHistory.$inferInsert;

// ============================================================
// NOTIFICAÇÕES
// ============================================================
export const notifications = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").references(() => users.id),
  type: mysqlEnum("type", ["goal_risk", "high_value_opportunity", "new_client", "activity_due", "system"]).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false),
  relatedId: int("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export type Notification = typeof notifications.$inferSelect;

// ============================================================
// PREFERÊNCIAS DE NOTIFICAÇÃO
// ============================================================
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").references(() => users.id),
  channel: mysqlEnum("channel", ["whatsapp", "sms", "email", "inapp"]).notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

// ============================================================
// AUTOMAÇÕES
// ============================================================
export const automations = mysqlTable("automations", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 200 }).notNull(),
  trigger: mysqlEnum("trigger", ["opportunity_created", "goal_at_risk", "long_cycle", "client_inactive", "high_value"]).notNull(),
  action: varchar("action", { length: 300 }).notNull(),
  conditions: text("conditions"),
  isActive: boolean("isActive").default(true),
  executionCount: int("executionCount").default(0),
  lastExecutedAt: timestamp("lastExecutedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type Automation = typeof automations.$inferSelect;

// ============================================================
// COMPRAS
// ============================================================
export const purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("clientId").references(() => clients.id),
  representativeId: int("representativeId").references(() => representatives.id),
  product: varchar("product", { length: 200 }).notNull(),
  value: double("value").notNull(),
  quantity: double("quantity").default(1),
  unit: varchar("unit", { length: 20 }).default("ton"),
  purchaseDate: timestamp("purchaseDate").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export type Purchase = typeof purchases.$inferSelect;

// ============================================================
// RELATÓRIOS DIÁRIOS
// ============================================================
export const dailyReports = mysqlTable("daily_reports", {
  id: int("id").primaryKey().autoincrement(),
  representativeId: int("representativeId").references(() => representatives.id),
  reportDate: varchar("reportDate", { length: 10 }).notNull(),
  visitsCount: int("visitsCount").default(0),
  callsCount: int("callsCount").default(0),
  proposalsCount: int("proposalsCount").default(0),
  ordersCount: int("ordersCount").default(0),
  totalOrderValue: double("totalOrderValue").default(0),
  generalNotes: text("generalNotes"),
  status: mysqlEnum("status", ["draft", "submitted"]).default("draft"),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = typeof dailyReports.$inferInsert;

// ============================================================
// LICENÇAS
// ============================================================
export const licenses = mysqlTable("licenses", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").references(() => users.id).notNull(),
  plan: mysqlEnum("plan", ["free", "basic", "pro"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).default("active").notNull(),
  startDate: timestamp("startDate").notNull().defaultNow(),
  endDate: timestamp("endDate").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

// ============================================================
// HISTÓRICO DE ACESSOS
// ============================================================
export const loginHistory = mysqlTable("loginHistory", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").references(() => users.id).notNull(),
  loginAt: timestamp("loginAt").notNull().defaultNow(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;

// ============================================================
// PRODUTOS
// ============================================================
export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  productCode: varchar("productCode", { length: 30 }).unique(),
  name: varchar("name", { length: 300 }).notNull(),
  productGroup: varchar("productGroup", { length: 200 }),
  productGroupCode: varchar("productGroupCode", { length: 30 }),
  solution: varchar("solution", { length: 200 }),
  subSolution: varchar("subSolution", { length: 200 }),
  line: varchar("line", { length: 200 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ============================================================
// VENDAS / NOTAS FISCAIS (Faturamento)
// ============================================================
export const salesInvoices = mysqlTable("sales_invoices", {
  id: int("id").primaryKey().autoincrement(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  orderNumber: varchar("orderNumber", { length: 50 }),
  invoiceDate: timestamp("invoiceDate"),
  orderDate: timestamp("orderDate"),
  clientId: int("clientId").references(() => clients.id),
  clientCode: varchar("clientCode", { length: 30 }),
  clientName: varchar("clientName", { length: 200 }),
  productId: int("productId").references(() => products.id),
  productCode: varchar("productCode", { length: 30 }),
  productName: varchar("productName", { length: 300 }),
  representativeId: int("representativeId").references(() => representatives.id),
  repCode: varchar("repCode", { length: 30 }),
  repName: varchar("repName", { length: 200 }),
  qtdSacos: double("qtdSacos"),
  precoPorSaco: double("precoPorSaco"),
  precoPorKg: double("precoPorKg"),
  faturamentoRealizado: double("faturamentoRealizado"),
  faturamentoSemEncargos: double("faturamentoSemEncargos"),
  volumeVendas: double("volumeVendas"),
  volumeConvertido: double("volumeConvertido"),
  bonificacao: double("bonificacao"),
  descontoPct: double("descontoPct"),
  pmr: int("pmr"),
  mbCbPct: double("mbCbPct"),
  mbCbTotal: double("mbCbTotal"),
  mlCbPct: double("mlCbPct"),
  mlCbTotal: double("mlCbTotal"),
  custoBrillTotal: double("custoBrillTotal"),
  despComercial: double("despComercial"),
  freteCarga: double("freteCarga"),
  icmsTotal: double("icmsTotal"),
  pisTotal: double("pisTotal"),
  cofinsTotal: double("cofinsTotal"),
  comissaoPct: double("comissaoPct"),
  comissaoValor: double("comissaoValor"),
  tipoOperacao: varchar("tipoOperacao", { length: 50 }),
  mesAno: varchar("mesAno", { length: 20 }),
  ano: int("ano"),
  filial: varchar("filial", { length: 100 }),
  codFilial: varchar("codFilial", { length: 20 }),
  grv: varchar("grv", { length: 200 }),
  gnv: varchar("gnv", { length: 200 }),
  cfop: varchar("cfop", { length: 10 }),
  // Campos geográficos
  uf: varchar("uf", { length: 5 }),
  municipio: varchar("municipio", { length: 200 }),
  regiao: varchar("regiao", { length: 100 }),
  codGrupoCliente: varchar("codGrupoCliente", { length: 30 }),
  grupoCliente: varchar("grupoCliente", { length: 200 }),
  segmentacao: varchar("segmentacao", { length: 100 }),
  categoria: varchar("categoria", { length: 100 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type InsertSalesInvoice = typeof salesInvoices.$inferInsert;

// ============================================================
// PEDIDOS EM ABERTO
// ============================================================
export const openOrders = mysqlTable("open_orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("orderNumber", { length: 50 }),
  orderDate: timestamp("orderDate"),
  clientId: int("clientId").references(() => clients.id),
  clientCode: varchar("clientCode", { length: 30 }),
  clientName: varchar("clientName", { length: 200 }),
  productId: int("productId").references(() => products.id),
  productCode: varchar("productCode", { length: 30 }),
  productName: varchar("productName", { length: 300 }),
  representativeId: int("representativeId").references(() => representatives.id),
  repCode: varchar("repCode", { length: 30 }),
  repName: varchar("repName", { length: 200 }),
  qtdSacos: double("qtdSacos"),
  precoPorSaco: double("precoPorSaco"),
  faturamentoEstimado: double("faturamentoEstimado"),
  volumeEstimado: double("volumeEstimado"),
  tipoOperacao: varchar("tipoOperacao", { length: 50 }),
  mesAno: varchar("mesAno", { length: 20 }),
  ano: int("ano"),
  filial: varchar("filial", { length: 100 }),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type OpenOrder = typeof openOrders.$inferSelect;
export type InsertOpenOrder = typeof openOrders.$inferInsert;
