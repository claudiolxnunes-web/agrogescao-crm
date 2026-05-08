import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  clients, representatives, products, salesInvoices, openOrders
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
 
// ============================================================
// Helpers
// ============================================================
 
function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel serial date: days since 1900-01-01 (with Excel's leap year bug)
    // Excel epoch: Dec 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const msPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + val * msPerDay);
    if (!isNaN(date.getTime())) return date;
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}
 
function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}
 
function toStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}
 
function toInt(val: unknown): number | null {
  const n = toNum(val);
  return n === null ? null : Math.round(n);
}
 
// Busca valor usando múltiplos nomes alternativos de coluna
function col(row: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") return row[name];
  }
  return null;
}
 
// Determina se uma linha é pedido em aberto (sem NF ou tipo específico)
function isOpenOrder(row: Record<string, unknown>): boolean {
  const nf = toStr(row["Nota Fiscal"]);
  const tipo = toStr(row["Tipo de Operação"]);
  // Sem nota fiscal = pedido em aberto
  if (!nf) return true;
  // Tipo de operação indica pedido em aberto
  if (tipo && (tipo.toLowerCase().includes("pedido") || tipo.toLowerCase().includes("aberto"))) return true;
  return false;
}
 
// ============================================================
// Router
// ============================================================
export const importFaturamentoRouter = router({
 
  // Importar planilha de faturamento/vendas
  importFaturamento: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
 
      // Decodificar base64 e ler Excel
      const buffer = Buffer.from(input.fileBase64, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
 
      if (!rows.length) {
        return { success: false, message: "Arquivo vazio ou sem dados" };
      }
 
      // Contadores
      let clientsCreated = 0;
      let clientsSkipped = 0;
      let repsCreated = 0;
      let repsSkipped = 0;
      let productsCreated = 0;
      let productsSkipped = 0;
      let invoicesCreated = 0;
      let invoicesSkipped = 0;
      let openOrdersCreated = 0;
      let openOrdersSkipped = 0;
      const errors: string[] = [];
 
      // Cache em memória para evitar queries repetidas
      const clientCache = new Map<string, number>(); // clientCode -> id
      const repCache = new Map<string, number>(); // repCode -> id
      const productCache = new Map<string, number>(); // productCode -> id
 
      // Pré-carregar clientes existentes com clientCode
      const existingClients = await db.select({ id: clients.id, clientCode: clients.clientCode }).from(clients);
      for (const c of existingClients) {
        if (c.clientCode) clientCache.set(c.clientCode, c.id);
      }
 
      // Pré-carregar representantes existentes com repCode
      const existingReps = await db.select({ id: representatives.id, repCode: representatives.repCode }).from(representatives);
      for (const r of existingReps) {
        if (r.repCode) repCache.set(r.repCode, r.id);
      }
 
      // Pré-carregar produtos existentes com productCode
      const existingProducts = await db.select({ id: products.id, productCode: products.productCode }).from(products);
      for (const p of existingProducts) {
        if (p.productCode) productCache.set(p.productCode, p.id);
      }
 
      // Pré-carregar vendas existentes para controle de duplicidade
      // Chave: invoiceNumber + clientCode + productCode
      const existingInvoiceKeys = new Set<string>();
      const existingInvoices = await db.select({
        invoiceNumber: salesInvoices.invoiceNumber,
        clientCode: salesInvoices.clientCode,
        productCode: salesInvoices.productCode,
      }).from(salesInvoices);
      for (const inv of existingInvoices) {
        const key = `${inv.invoiceNumber}|${inv.clientCode}|${inv.productCode}`;
        existingInvoiceKeys.add(key);
      }
 
      // Processar cada linha
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
 
        try {
          // Suporte a múltiplos formatos de coluna (data73 NF-style e data72 pedidos-style)
          const clientCode = toStr(col(row, "Cód. Cliente", "Cód Cliente", "COD_CLIENTE"));
          const clientName = toStr(col(row, "Nome do Cliente", "Cliente", "NOME_CLIENTE"));
          const repCode    = toStr(col(row, "Cód. RC", "Cód ERC", "COD_RC", "Cód. ERC"));
          const repName    = toStr(col(row, "Representante", "ERC", "GRV", "REPRESENTANTE"));
          const productCode = toStr(col(row, "Cód. Produto", "Cód Produto", "COD_PRODUTO"));
          const productName = toStr(col(row, "Nome do Produto", "Produto", "NOME_PRODUTO"));
          const invoiceNumber = toStr(col(row, "Nota Fiscal", "NF", "NOTA_FISCAL"));
          const orderNumber   = toStr(col(row, "Pedido", "PEDIDO", "Pedido Green"));
 
          // ---- 1. UPSERT CLIENTE ----
          if (clientCode && clientName) {
            if (!clientCache.has(clientCode)) {
              // Determinar tipo baseado na categoria
              const categoria = toStr(row["Categoria"]) || "";
              let clientType: "fazenda_ruminantes" | "fabrica_racao" | "revenda_agropecuaria" = "fazenda_ruminantes";
              if (categoria.toLowerCase().includes("fabrica") || categoria.toLowerCase().includes("fábrica")) {
                clientType = "fabrica_racao";
              } else if (categoria.toLowerCase().includes("loja") || categoria.toLowerCase().includes("revenda") || categoria.toLowerCase().includes("cooperativa")) {
                clientType = "revenda_agropecuaria";
              }
 
              // Mapear UF para sigla de 2 letras
              const ufFull = toStr(row["UF"]) || "";
              const ufMap: Record<string, string> = {
                "MINAS GERAIS": "MG", "SÃO PAULO": "SP", "GOIÁS": "GO", "MATO GROSSO": "MT",
                "MATO GROSSO DO SUL": "MS", "PARANÁ": "PR", "RIO GRANDE DO SUL": "RS",
                "SANTA CATARINA": "SC", "BAHIA": "BA", "PARÁ": "PA", "TOCANTINS": "TO",
                "MARANHÃO": "MA", "PIAUÍ": "PI", "CEARÁ": "CE", "RIO GRANDE DO NORTE": "RN",
                "PARAÍBA": "PB", "PERNAMBUCO": "PE", "ALAGOAS": "AL", "SERGIPE": "SE",
                "ESPÍRITO SANTO": "ES", "RIO DE JANEIRO": "RJ", "RONDÔNIA": "RO",
                "ACRE": "AC", "AMAZONAS": "AM", "RORAIMA": "RR", "AMAPÁ": "AP",
                "DISTRITO FEDERAL": "DF",
              };
              const stateUF = ufMap[ufFull.toUpperCase()] || (ufFull.length === 2 ? ufFull : null);
 
              const inserted = await db.insert(clients).values({
                clientCode,
                name: clientName,
                type: clientType,
                city: toStr(row["Município"]),
                state: stateUF,
                segment: toStr(row["Segmentação"]),
              });
              const newId = Number((inserted as any).insertId);
              clientCache.set(clientCode, newId);
              clientsCreated++;
            } else {
              clientsSkipped++;
            }
          }
 
          // ---- 2. UPSERT REPRESENTANTE ----
          if (repCode && repName) {
            if (!repCache.has(repCode)) {
              const inserted = await db.insert(representatives).values({
                repCode,
                name: repName,
              });
              const newId = Number((inserted as any).insertId);
              repCache.set(repCode, newId);
              repsCreated++;
            } else {
              repsSkipped++;
            }
          }
 
          // ---- 3. UPSERT PRODUTO ----
          if (productCode && productName) {
            if (!productCache.has(productCode)) {
              const inserted = await db.insert(products).values({
                productCode,
                name: productName,
                productGroup: toStr(row["Grupo Produto"]),
                productGroupCode: toStr(row["Cód Grupo Produto"]),
                solution: toStr(row["Solução"]),
                subSolution: toStr(row["Subsolução"]),
                line: toStr(row["Linha"]),
              });
              const newId = Number((inserted as any).insertId);
              productCache.set(productCode, newId);
              productsCreated++;
            } else {
              productsSkipped++;
            }
          }
 
          const clientId = clientCode ? clientCache.get(clientCode) || null : null;
          const repId = repCode ? repCache.get(repCode) || null : null;
          const productId = productCode ? productCache.get(productCode) || null : null;
 
          // ---- 4. PEDIDO EM ABERTO ou VENDA ----
          if (isOpenOrder(row)) {
            // Pedido em aberto
            const orderKey = `${orderNumber}|${clientCode}|${productCode}`;
            if (existingInvoiceKeys.has(orderKey)) {
              openOrdersSkipped++;
            } else {
              await db.insert(openOrders).values({
                orderNumber,
                orderDate: parseDate(col(row, "Data do Pedido", "Inclusão do Pedido", "DATA_PEDIDO")),
                clientId,
                clientCode,
                clientName,
                productId,
                productCode,
                productName,
                representativeId: repId,
                repCode,
                repName,
                qtdSacos:            toNum(col(row, "Qtde. Sacos", "Pedido Volume", "QTD_SACOS")),
                precoPorSaco:        toNum(col(row, "Preço por Saco", "PRECO_SACO")),
                faturamentoEstimado: toNum(col(row, "Faturamento Realizado", "Pedido Valor", "FAT_REALIZADO")),
                volumeEstimado:      toNum(col(row, "Volume (Vendas)", "Pedido Volume", "VOLUME")),
                tipoOperacao:        toStr(col(row, "Tipo de Operação", "Status Tracking", "TIPO_OP")),
                mesAno:              toStr(col(row, "Mês/Ano", "MES_ANO")),
                ano:                 toInt(col(row, "Ano", "ANO")),
                filial:              toStr(col(row, "Filial", "FILIAL")),
              });
              existingInvoiceKeys.add(orderKey);
              openOrdersCreated++;
            }
          } else {
            // Venda com Nota Fiscal
            const invoiceKey = `${invoiceNumber}|${clientCode}|${productCode}`;
            if (existingInvoiceKeys.has(invoiceKey)) {
              invoicesSkipped++;
            } else {
              await db.insert(salesInvoices).values({
                invoiceNumber,
                orderNumber,
                invoiceDate: parseDate(row["Data da NF"]),
                orderDate: parseDate(row["Data do Pedido"]),
                clientId,
                clientCode,
                clientName,
                productId,
                productCode,
                productName,
                representativeId: repId,
                repCode,
                repName,
                qtdSacos: toNum(row["Qtde. Sacos"]),
                precoPorSaco: toNum(row["Preço por Saco"]),
                precoPorKg: toNum(row["Preço por KG"]),
                faturamentoRealizado: toNum(row["Faturamento Realizado"]),
                faturamentoSemEncargos: toNum(row["Faturamento S/ Encargos"]),
                volumeVendas: toNum(row["Volume (Vendas)"]),
                volumeConvertido: toNum(row["Volume (Convertido)"]),
                bonificacao: toNum(row["Bonificação"]),
                descontoPct: toNum(row["Desconto %"]),
                pmr: toInt(row["PMR"]),
                mbCbPct: toNum(row["MB CB %"]),
                mbCbTotal: toNum(row["MB CB Total"]),
                mlCbPct: toNum(row["ML CB % (Estimada)"]),
                mlCbTotal: toNum(row["ML CB Total (Estimada)"]),
                custoBrillTotal: toNum(row["Custo Brill Total"]),
                despComercial: toNum(row["Desp Comercial"]),
                freteCarga: toNum(row["Frete Carga Realizado"]),
                icmsTotal: toNum(row["ICMS Total"]),
                pisTotal: toNum(row["PIS Total"]),
                cofinsTotal: toNum(row["Cofins Total"]),
                comissaoPct: toNum(row["Comissão Realizado %"]),
                comissaoValor: toNum(row["Comissão Realizado"]),
                tipoOperacao: toStr(row["Tipo de Operação"]),
                mesAno: toStr(row["Mês/Ano"]),
                ano: toInt(row["Ano"]),
                filial: toStr(row["Filial"]),
                codFilial: toStr(row["Cód. Filial"]),
                grv: toStr(row["GRV"]),
                gnv: toStr(row["GNV"]),
                cfop: toStr(row["Cód CFOP"]),
                // Campos geográficos
                uf: toStr(row["UF"]),
                municipio: toStr(row["Município"]),
                regiao: toStr(row["Região"]),
                codGrupoCliente: toStr(row["Cód Grupo"]),
                grupoCliente: toStr(row["Grupo Cliente"]),
                segmentacao: toStr(row["Segmentação"]),
                categoria: toStr(row["Categoria"]),
              });
              existingInvoiceKeys.add(invoiceKey);
              invoicesCreated++;
            }
          }
 
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Linha ${i + 2}: ${msg}`);
          if (errors.length >= 10) break; // Limitar erros reportados
        }
      }
 
      return {
        success: true,
        summary: {
          totalRows: rows.length,
          clients: { created: clientsCreated, skipped: clientsSkipped },
          representatives: { created: repsCreated, skipped: repsSkipped },
          products: { created: productsCreated, skipped: productsSkipped },
          invoices: { created: invoicesCreated, skipped: invoicesSkipped },
          openOrders: { created: openOrdersCreated, skipped: openOrdersSkipped },
        },
        errors: errors.length > 0 ? errors : undefined,
        message: `Importação concluída: ${clientsCreated} clientes, ${repsCreated} representantes, ${productsCreated} produtos, ${invoicesCreated} vendas, ${openOrdersCreated} pedidos em aberto importados.`,
      };
    }),
 
  // Listar vendas/faturamento
  listInvoices: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      mesAno: z.string().optional(),
      clientCode: z.string().optional(),
      repCode: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;
 
      const rows = await db.select().from(salesInvoices)
        .limit(limit)
        .offset(offset)
        .orderBy(salesInvoices.invoiceDate);
 
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(salesInvoices);
      const total = Number(countResult[0]?.count || 0);
 
      return { rows, total, page, limit };
    }),
 
  // Listar pedidos em aberto
  listOpenOrders: protectedProcedure
    .query(async () => {
      const db = getDb();
      return db.select().from(openOrders).orderBy(openOrders.orderDate);
    }),
 
  // Listar produtos
  listProducts: protectedProcedure
    .query(async () => {
      const db = getDb();
      return db.select().from(products).orderBy(products.name);
    }),
});
 