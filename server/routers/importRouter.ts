/**
 * importRouter.ts
 * Handles intelligent Excel/CSV import for clients and purchases (sales history)
 * - Reads headers from first row automatically
 * - Maps columns by title using AI + smart fallback
 * - Ignores unrecognized columns silently (no errors)
 * - Supports large volumes with batch processing (chunks of 100)
 */
import * as XLSX from "xlsx";
import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { clients, regions, representatives, purchases } from "../../drizzle/schema";
import { eq, ilike } from "drizzle-orm";
 
// ============================================================
// FIELD DEFINITIONS — what can be mapped from a spreadsheet
// ============================================================
 
const CLIENT_FIELDS = [
  { field: "name",               label: "Nome / Razão Social",                           required: true },
  { field: "type",               label: "Tipo (fazenda_ruminantes | fabrica_racao | revenda_agropecuaria)" },
  { field: "contactName",        label: "Nome do Contato / Responsável" },
  { field: "cnpj",               label: "CNPJ / CPF" },
  { field: "phone",              label: "Telefone / Celular" },
  { field: "email",              label: "E-mail" },
  { field: "city",               label: "Cidade / Município" },
  { field: "state",              label: "Estado (UF)" },
  { field: "address",            label: "Endereço" },
  { field: "status",             label: "Status (active | inactive | prospect)" },
  { field: "businessPotential",  label: "Potencial de Negócio (R$)" },
  { field: "notes",              label: "Observações / Notas" },
  // Fazenda de Ruminantes
  { field: "animalCount",        label: "Número de Animais" },
  { field: "animalTypes",        label: "Tipos de Animais" },
  { field: "productionType",     label: "Tipo de Produção" },
  { field: "propertyArea",       label: "Área da Propriedade (hectares)" },
  { field: "farmingSystem",      label: "Sistema de Criação / Manejo" },
  { field: "consumedProducts",   label: "Produtos Consumidos" },
  // Fábrica de Ração
  { field: "productionCapacity", label: "Capacidade de Produção (ton/mês)" },
  { field: "productLines",       label: "Linhas de Produtos" },
  { field: "rationTypes",        label: "Tipos de Ração" },
  { field: "rawMaterialVolume",  label: "Volume de Matéria Prima" },
  // Revenda Agropecuária
  { field: "coveredMunicipalities", label: "Municípios Cobertos / Área de Cobertura" },
  { field: "productMix",         label: "Mix de Produtos" },
  { field: "monthlySalesVolume", label: "Volume Mensal de Vendas" },
  { field: "finalClientsCount",  label: "Número de Clientes Finais" },
];
 
const PURCHASES_FIELDS = [
  { field: "clientName",         label: "Nome do Cliente",                               required: true },
  { field: "representativeName", label: "Nome do Representante",                          required: true },
  { field: "product",            label: "Produto",                                        required: true },
  { field: "quantity",           label: "Quantidade",                                     required: true },
  { field: "value",              label: "Valor (R$)",                                     required: true },
  { field: "purchaseDate",       label: "Data da Compra / Venda (DD/MM/YYYY ou YYYY-MM-DD)", required: true },
  { field: "unit",               label: "Unidade (ton, kg, saco, etc.)" },
  { field: "invoiceNumber",      label: "Número da Nota Fiscal / NF" },
  { field: "notes",              label: "Observações" },
];
 
const BATCH_SIZE = 100;
 
// ============================================================
// SMART FALLBACK MAPPING — string-based heuristics
// ============================================================
 
function buildFallbackMapping(headers: string[], importType: "clients" | "purchases"): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
 
  for (const header of headers) {
    const h = header.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .trim();
 
    let matched: string | null = null;
 
    if (importType === "clients") {
      if (h.match(/^nome$|razao.?social|nome.?empresa|empresa|cliente/)) matched = "name";
      else if (h.match(/contato|responsavel|atendente/)) matched = "contactName";
      else if (h.match(/cnpj|cpf|doc/)) matched = "cnpj";
      else if (h.match(/telefone|celular|fone|tel|whatsapp/)) matched = "phone";
      else if (h.match(/e.?mail|email/)) matched = "email";
      else if (h.match(/cidade|municipio|localidade/)) matched = "city";
      else if (h.match(/^estado$|^uf$|estado.uf|uf.estado/)) matched = "state";
      else if (h.match(/endereco|logradouro|rua|avenida|av\.|rua\./)) matched = "address";
      else if (h.match(/status|situacao/)) matched = "status";
      else if (h.match(/potencial|pot\.?neg|pot\.?biz|valor.pot/)) matched = "businessPotential";
      else if (h.match(/obs|observ|nota|comentario|anotacao/)) matched = "notes";
      else if (h.match(/tipo|segmento|categoria/)) matched = "type";
      // Fazenda
      else if (h.match(/num.?animal|qtd.?animal|quant.?animal|cabecas|cab\./)) matched = "animalCount";
      else if (h.match(/tipo.?animal|especie|raca/)) matched = "animalTypes";
      else if (h.match(/tipo.?producao|producao/)) matched = "productionType";
      else if (h.match(/area|hectare|ha\b|tamanho/)) matched = "propertyArea";
      else if (h.match(/sistema.?criacao|manejo|confinamento|pastagem/)) matched = "farmingSystem";
      else if (h.match(/produto.?consum|consum/)) matched = "consumedProducts";
      // Fábrica
      else if (h.match(/capacidade|cap\.?prod|ton.?mes/)) matched = "productionCapacity";
      else if (h.match(/linha.?prod|linhas/)) matched = "productLines";
      else if (h.match(/tipo.?racao|racao/)) matched = "rationTypes";
      else if (h.match(/materia.?prima|mp\b/)) matched = "rawMaterialVolume";
      // Revenda
      else if (h.match(/municipio.?coberto|cobertura|area.?atend/)) matched = "coveredMunicipalities";
      else if (h.match(/mix.?prod|portfolio/)) matched = "productMix";
      else if (h.match(/volume.?mensal|vol\.?mensal|vendas.?mes/)) matched = "monthlySalesVolume";
      else if (h.match(/clientes.?finais|num.?clientes|qtd.?clientes/)) matched = "finalClientsCount";
    } else {
      // purchases
      if (h.match(/^cliente$|nome.?cliente|razao.?social/)) matched = "clientName";
      else if (h.match(/representante|rep\b|vendedor/)) matched = "representativeName";
      else if (h.match(/produto|item|mercadoria/)) matched = "product";
      else if (h.match(/^qtd$|quantidade|quant\b/)) matched = "quantity";
      else if (h.match(/^valor$|preco|vl\b|vr\b|total/)) matched = "value";
      else if (h.match(/data|dt\b|venda|compra/)) matched = "purchaseDate";
      else if (h.match(/unidade|un\b|und\b/)) matched = "unit";
      else if (h.match(/nota.?fiscal|nf\b|nfe|invoice/)) matched = "invoiceNumber";
      else if (h.match(/obs|observ|nota\b|comentario/)) matched = "notes";
    }
 
    mapping[header] = matched;
  }
 
  return mapping;
}
 
// ============================================================
// ROUTER
// ============================================================
 
export const importRouter = router({
  /**
   * Step 1: Parse the Excel/CSV file, read headers from first row,
   * and use AI (with smart fallback) to map columns to system fields.
   * Unrecognized columns are mapped to null and silently ignored.
   */
  analyzeFile: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      importType: z.enum(["clients", "purchases"]).default("clients"),
    }))
    .mutation(async ({ input }) => {
      // Parse the file
      const buffer = Buffer.from(input.fileBase64, "base64");
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(buffer, { type: "buffer" });
      } catch {
        throw new Error("Não foi possível ler o arquivo. Certifique-se de que é um arquivo .xlsx, .xls ou .csv válido.");
      }
 
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("O arquivo não contém planilhas.");
 
      const sheet = workbook.Sheets[sheetName];
      // header:1 → first row becomes the header array
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
 
      if (rawData.length < 1) {
        throw new Error("O arquivo está vazio.");
      }
 
      // First row = headers
      const headers = (rawData[0] as any[]).map(h => String(h ?? "").trim()).filter(h => h !== "");
 
      if (headers.length === 0) {
        throw new Error("A primeira linha do arquivo não contém cabeçalhos reconhecíveis.");
      }
 
      const dataRows = rawData.slice(1).filter(row =>
        row.some((cell: any) => String(cell ?? "").trim() !== "")
      );
 
      const sampleRows = dataRows.slice(0, 5).map(row =>
        headers.reduce((obj, h, i) => ({ ...obj, [h]: String(row[i] ?? "").trim() }), {} as Record<string, string>)
      );
      const totalRows = dataRows.length;
 
      const fields = input.importType === "purchases" ? PURCHASES_FIELDS : CLIENT_FIELDS;
 
      // --- Try AI mapping first ---
      let mapping: Record<string, string | null> = {};
      let confidence = "low";
      let aiNotes = "";
 
      const fieldDescriptions = fields
        .map(f => `"${f.field}": ${f.label}${f.required ? " (OBRIGATÓRIO)" : ""}`)
        .join("\n");
 
      const prompt = `Você é um assistente especializado em CRM agropecuário. Analise os cabeçalhos de uma planilha e mapeie cada coluna para o campo correto do sistema.
 
CAMPOS DISPONÍVEIS NO SISTEMA:
${fieldDescriptions}
 
CABEÇALHOS DA PLANILHA (${headers.length} colunas):
${headers.map((h, i) => `${i}: "${h}"`).join("\n")}
 
EXEMPLO DE DADOS (primeiras linhas):
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}
 
Retorne um JSON com o mapeamento:
{
  "mapping": {
    "NOME_EXATO_DO_CABEÇALHO": "nome_do_campo_do_sistema_ou_null"
  },
  "confidence": "high|medium|low",
  "notes": "breve descrição do mapeamento"
}
 
REGRAS IMPORTANTES:
- Use null para colunas que não correspondem a nenhum campo do sistema (NÃO gere erro, apenas ignore)
- Seja inteligente com variações: "Qtd Animais" → "animalCount", "Tel. Celular" → "phone", "Dt. Venda" → "purchaseDate"
- Inclua TODOS os cabeçalhos no mapping, mesmo os que serão null
- O campo "name" (Nome) é obrigatório para clientes`;
 
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um assistente de CRM agropecuário. Responda APENAS com JSON válido, sem markdown, sem texto adicional fora do JSON." },
            { role: "user", content: prompt },
          ],
        });
 
        const rawContent = response.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        if (content) {
          const parsed = JSON.parse(content);
          mapping = parsed.mapping || {};
          confidence = parsed.confidence || "low";
          aiNotes = parsed.notes || "";
 
          // Ensure all headers are present in mapping (fill missing with null)
          for (const h of headers) {
            if (!(h in mapping)) mapping[h] = null;
          }
        }
      } catch {
        // Fallback: smart string-matching heuristics
        mapping = buildFallbackMapping(headers, input.importType);
        confidence = "medium";
        aiNotes = "Mapeamento automático por correspondência de títulos. Verifique e ajuste se necessário.";
      }
 
      return {
        headers,
        sampleRows,
        totalRows,
        mapping,
        confidence,
        aiNotes,
        availableFields: fields,
      };
    }),
 
  /**
   * Step 2a: Import clients using the confirmed mapping.
   * Columns mapped to null are silently ignored.
   */
  importClients: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      mapping: z.record(z.string(), z.string().nullable()),
      defaultType: z.enum(["fazenda_ruminantes", "fabrica_racao", "revenda_agropecuaria"]).optional(),
      defaultRegionId: z.number().optional(),
      defaultRepId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
 
      const buffer = Buffer.from(input.fileBase64, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
 
      const headers = (rawData[0] as any[]).map(h => String(h ?? "").trim());
      const dataRows = rawData.slice(1).filter(row =>
        row.some((cell: any) => String(cell ?? "").trim() !== "")
      );
 
      // Build field → column-index lookup (only for mapped, non-null entries)
      const fieldToIdx: Record<string, number> = {};
      for (const [header, field] of Object.entries(input.mapping)) {
        if (field) {
          const idx = headers.indexOf(header);
          if (idx >= 0) fieldToIdx[field] = idx;
        }
      }
 
      const getValue = (row: any[], field: string): string => {
        const idx = fieldToIdx[field];
        return idx !== undefined ? String(row[idx] ?? "").trim() : "";
      };
 
      const parseNum = (v: string): number | undefined => {
        const n = parseFloat(v.replace(/[^\d.,]/g, "").replace(",", "."));
        return isNaN(n) ? undefined : n;
      };
      const parseIntVal = (v: string): number | undefined => {
        const n = parseInt(v.replace(/[^\d]/g, ""), 10);
        return isNaN(n) ? undefined : n;
      };
 
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
 
      // Pré-carregar registros existentes para upsert (atualiza se já existir)
      const existingClientByCode = new Map<string, number>(); // clientCode → id
      const existingClientByName = new Map<string, number>(); // name lower → id
      const allExistingClients = await db.select({ id: clients.id, clientCode: clients.clientCode, name: clients.name }).from(clients);
      for (const ec of allExistingClients) {
        if (ec.clientCode) existingClientByCode.set(ec.clientCode.trim(), ec.id);
        if (ec.name) existingClientByName.set(ec.name.trim().toLowerCase(), ec.id);
      }
 
      for (let batchStart = 0; batchStart < dataRows.length; batchStart += BATCH_SIZE) {
        const batch = dataRows.slice(batchStart, Math.min(batchStart + BATCH_SIZE, dataRows.length));
 
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNum = batchStart + i + 2; // +2: 1-based + header row
 
          const name = getValue(row, "name");
          if (!name) { skipped++; continue; }
 
          // Verificar se já existe para fazer upsert (atualiza em vez de pular)
          const rowClientCode = getValue(row, "clientCode")?.trim();
          const existingId = rowClientCode
            ? existingClientByCode.get(rowClientCode)
            : existingClientByName.get(name.trim().toLowerCase());
          const isUpdate = !!existingId;
 
          // Determine client type
          let clientType: "fazenda_ruminantes" | "fabrica_racao" | "revenda_agropecuaria" =
            input.defaultType || "fazenda_ruminantes";
          const typeRaw = getValue(row, "type").toLowerCase();
          if (typeRaw.match(/fazenda|ruminante/)) clientType = "fazenda_ruminantes";
          else if (typeRaw.match(/fabrica|fábrica|racao|ração/)) clientType = "fabrica_racao";
          else if (typeRaw.match(/revenda/)) clientType = "revenda_agropecuaria";
 
          // Normalize status
          let status: "active" | "inactive" | "prospect" = "active";
          const statusRaw = getValue(row, "status").toLowerCase();
          if (statusRaw.match(/inativo|inactive/)) status = "inactive";
          else if (statusRaw.match(/prospect|potencial/)) status = "prospect";
 
          try {
            const clientData = {
              name,
              type: clientType,
              contactName:        getValue(row, "contactName")     || undefined,
              cnpj:               getValue(row, "cnpj")            || undefined,
              phone:              getValue(row, "phone")           || undefined,
              email:              getValue(row, "email")           || undefined,
              city:               getValue(row, "city")            || undefined,
              state:              getValue(row, "state")?.substring(0, 2).toUpperCase() || undefined,
              address:            getValue(row, "address")         || undefined,
              status,
              businessPotential:  parseNum(getValue(row, "businessPotential")) ?? 0,
              notes:              getValue(row, "notes")           || undefined,
              regionId:           input.defaultRegionId            || undefined,
              representativeId:   input.defaultRepId               || undefined,
              // Fazenda de Ruminantes
              animalCount:        parseIntVal(getValue(row, "animalCount")),
              animalTypes:        getValue(row, "animalTypes")     || undefined,
              productionType:     getValue(row, "productionType")  || undefined,
              propertyArea:       parseNum(getValue(row, "propertyArea")),
              farmingSystem:      getValue(row, "farmingSystem")   || undefined,
              consumedProducts:   getValue(row, "consumedProducts")|| undefined,
              // Fábrica de Ração
              productionCapacity: parseNum(getValue(row, "productionCapacity")),
              productLines:       getValue(row, "productLines")    || undefined,
              rationTypes:        getValue(row, "rationTypes")     || undefined,
              rawMaterialVolume:  parseNum(getValue(row, "rawMaterialVolume")),
              // Revenda Agropecuária
              coveredMunicipalities: parseIntVal(getValue(row, "coveredMunicipalities")),
              productMix:         getValue(row, "productMix")      || undefined,
              monthlySalesVolume: parseNum(getValue(row, "monthlySalesVolume")),
              finalClientsCount:  parseIntVal(getValue(row, "finalClientsCount")),
            } as any;
 
            if (isUpdate) {
              // UPSERT: atualiza registro existente
              await db.update(clients).set({ ...clientData, updatedAt: new Date() }).where(eq(clients.id, existingId!));
            } else {
              // INSERT: novo registro
              if (rowClientCode) clientData.clientCode = rowClientCode;
              await db.insert(clients).values(clientData);
            }
            imported++;
          } catch (e: any) {
            errors.push(`Linha ${rowNum}: ${String(e?.message ?? e).substring(0, 120)}`);
            skipped++;
          }
        }
      }
 
      return { imported, skipped, errors: errors.slice(0, 20), total: dataRows.length };
    }),
 
  /**
   * Step 2b: Import purchases (individual sale records) using the confirmed mapping.
   * Columns mapped to null are silently ignored.
   */
  importPurchases: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      mapping: z.record(z.string(), z.string().nullable()),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
 
      const buffer = Buffer.from(input.fileBase64, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
 
      const headers = (rawData[0] as any[]).map(h => String(h ?? "").trim());
      const dataRows = rawData.slice(1).filter(row =>
        row.some((cell: any) => String(cell ?? "").trim() !== "")
      );
 
      const fieldToIdx: Record<string, number> = {};
      for (const [header, field] of Object.entries(input.mapping)) {
        if (field) {
          const idx = headers.indexOf(header);
          if (idx >= 0) fieldToIdx[field] = idx;
        }
      }
 
      const getValue = (row: any[], field: string): string => {
        const idx = fieldToIdx[field];
        return idx !== undefined ? String(row[idx] ?? "").trim() : "";
      };
 
      const parseNum = (v: string): number => {
        const n = parseFloat(v.replace(/[^\d.,]/g, "").replace(",", "."));
        return isNaN(n) ? 0 : n;
      };
 
      const parseDate = (dateStr: string): Date => {
        const s = dateStr.trim();
        if (!s) return new Date();
        // DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const [d, m, y] = s.split("/");
          return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
        }
        // DD-MM-YYYY
        if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
          const [d, m, y] = s.split("-");
          return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
        }
        // Excel serial number
        if (/^\d{5}$/.test(s)) {
          return XLSX.SSF.parse_date_code(parseInt(s)) as unknown as Date;
        }
        return new Date(s);
      };
 
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
 
      for (let batchStart = 0; batchStart < dataRows.length; batchStart += BATCH_SIZE) {
        const batch = dataRows.slice(batchStart, Math.min(batchStart + BATCH_SIZE, dataRows.length));
 
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNum = batchStart + i + 2;
 
          const clientName   = getValue(row, "clientName");
          const repName      = getValue(row, "representativeName");
          const product      = getValue(row, "product");
          const quantityStr  = getValue(row, "quantity");
          const valueStr     = getValue(row, "value");
          const dateStr      = getValue(row, "purchaseDate");
 
          // Skip rows missing required fields (no error — just skip silently)
          if (!clientName || !repName || !product || !quantityStr || !valueStr) {
            skipped++;
            continue;
          }
 
          try {
            // Resolve client by name (partial match)
            const clientResult = await db
              .select({ id: clients.id })
              .from(clients)
              .where(ilike(clients.name, `%${clientName}%`))
              .limit(1);
            const clientId = clientResult[0]?.id;
 
            // Resolve representative by name (partial match)
            const repResult = await db
              .select({ id: representatives.id })
              .from(representatives)
              .where(ilike(representatives.name, `%${repName}%`))
              .limit(1);
            const repId = repResult[0]?.id;
 
            if (!clientId) {
              errors.push(`Linha ${rowNum}: Cliente "${clientName}" não encontrado no sistema`);
              skipped++;
              continue;
            }
            if (!repId) {
              errors.push(`Linha ${rowNum}: Representante "${repName}" não encontrado no sistema`);
              skipped++;
              continue;
            }
 
            const quantity = parseNum(quantityStr);
            const value    = parseNum(valueStr);
            const purchaseDate = parseDate(dateStr);
 
            if (value <= 0) {
              errors.push(`Linha ${rowNum}: Valor inválido "${valueStr}"`);
              skipped++;
              continue;
            }
 
            await db.insert(purchases).values({
              clientId,
              representativeId: repId,
              product,
              quantity: quantity || 1,
              value,
              purchaseDate,
              unit:          getValue(row, "unit")          || "un",
              invoiceNumber: getValue(row, "invoiceNumber") || undefined,
              notes:         getValue(row, "notes")         || undefined,
            } as any);
            imported++;
          } catch (e: any) {
            errors.push(`Linha ${rowNum}: ${String(e?.message ?? e).substring(0, 120)}`);
            skipped++;
          }
        }
      }
 
      return { imported, skipped, errors: errors.slice(0, 20), total: dataRows.length };
    }),
 
  // Keep backward-compat alias so existing frontend calls still work
  importSalesHistory: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      mapping: z.record(z.string(), z.string().nullable()),
    }))
    .mutation(async ({ input, ctx }) => {
      // Delegate to importPurchases
      const db = getDb();
      const buffer = Buffer.from(input.fileBase64, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
      const headers = (rawData[0] as any[]).map(h => String(h ?? "").trim());
      const dataRows = rawData.slice(1).filter(row =>
        row.some((cell: any) => String(cell ?? "").trim() !== "")
      );
 
      // Remap legacy field names to new ones
      const remapped: Record<string, string | null> = {};
      for (const [header, field] of Object.entries(input.mapping)) {
        if (field === "saleDate") remapped[header] = "purchaseDate";
        else remapped[header] = field;
      }
 
      const fieldToIdx: Record<string, number> = {};
      for (const [header, field] of Object.entries(remapped)) {
        if (field) {
          const idx = headers.indexOf(header);
          if (idx >= 0) fieldToIdx[field] = idx;
        }
      }
 
      const getValue = (row: any[], field: string): string => {
        const idx = fieldToIdx[field];
        return idx !== undefined ? String(row[idx] ?? "").trim() : "";
      };
      const parseNum = (v: string): number => {
        const n = parseFloat(v.replace(/[^\d.,]/g, "").replace(",", "."));
        return isNaN(n) ? 0 : n;
      };
      const parseDate = (dateStr: string): Date => {
        const s = dateStr.trim();
        if (!s) return new Date();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const [d, m, y] = s.split("/");
          return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
        }
        return new Date(s);
      };
 
      let imported = 0, skipped = 0;
      const errors: string[] = [];
 
      for (let batchStart = 0; batchStart < dataRows.length; batchStart += BATCH_SIZE) {
        const batch = dataRows.slice(batchStart, Math.min(batchStart + BATCH_SIZE, dataRows.length));
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNum = batchStart + i + 2;
          const clientName = getValue(row, "clientName");
          const repName    = getValue(row, "representativeName");
          const product    = getValue(row, "product");
          const quantityStr = getValue(row, "quantity");
          const valueStr   = getValue(row, "value");
          if (!clientName || !repName || !product || !quantityStr || !valueStr) { skipped++; continue; }
          try {
            const clientResult = await db.select({ id: clients.id }).from(clients).where(ilike(clients.name, `%${clientName}%`)).limit(1);
            const clientId = clientResult[0]?.id;
            const repResult = await db.select({ id: representatives.id }).from(representatives).where(ilike(representatives.name, `%${repName}%`)).limit(1);
            const repId = repResult[0]?.id;
            if (!clientId || !repId) { errors.push(`Linha ${rowNum}: Cliente ou representante não encontrado`); skipped++; continue; }
            await db.insert(purchases).values({
              clientId, representativeId: repId, product,
              quantity: parseNum(quantityStr) || 1,
              value: parseNum(valueStr),
              purchaseDate: parseDate(getValue(row, "purchaseDate")),
              unit: getValue(row, "unit") || "un",
              invoiceNumber: getValue(row, "invoiceNumber") || undefined,
              notes: getValue(row, "notes") || undefined,
            } as any);
            imported++;
          } catch (e: any) {
            errors.push(`Linha ${rowNum}: ${String(e?.message ?? e).substring(0, 120)}`);
            skipped++;
          }
        }
      }
      return { imported, skipped, errors: errors.slice(0, 20), total: dataRows.length };
    }),
});
 