import mysql from 'mysql2/promise';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function str(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' || s === 'null' || s === 'undefined' ? null : s;
}

function col(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return null;
}

async function importVendasFile(filePath) {
  console.log(`\nImporting vendas: ${filePath}`);
  const wb = XLSX.read(readFileSync(filePath));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  console.log(`  Total rows: ${rows.length}`);

  // Cache existing records using camelCase column names (MySQL returns them as-is)
  const [existingClients] = await db.execute('SELECT id, clientCode FROM clients WHERE clientCode IS NOT NULL');
  const clientMap = new Map(existingClients.map(r => [r.clientCode, r.id]));

  const [existingReps] = await db.execute('SELECT id, repCode FROM representatives WHERE repCode IS NOT NULL');
  const repMap = new Map(existingReps.map(r => [r.repCode, r.id]));

  const [existingProducts] = await db.execute('SELECT id, productCode FROM products WHERE productCode IS NOT NULL');
  const productMap = new Map(existingProducts.map(r => [r.productCode, r.id]));

  const [existingSales] = await db.execute('SELECT invoiceNumber, clientCode, productCode FROM sales_invoices');
  const salesSet = new Set(existingSales.map(r => `${r.invoiceNumber}|${r.clientCode}|${r.productCode}`));

  const [existingOrders] = await db.execute('SELECT orderNumber, clientCode, productCode FROM open_orders');
  const ordersSet = new Set(existingOrders.map(r => `${r.orderNumber}|${r.clientCode}|${r.productCode}`));

  let stats = { clientsNew:0, clientsSkip:0, repsNew:0, repsSkip:0, productsNew:0, productsSkip:0, salesNew:0, salesSkip:0, ordersNew:0, ordersSkip:0, errors:0 };

  for (const row of rows) {
    const clientCode = str(col(row, 'Cód. Cliente', 'Cod. Cliente', 'COD. CLIENTE'));
    const clientName = str(col(row, 'Nome do Cliente', 'NOME DO CLIENTE'));
    const repCode = str(col(row, 'Cód. RC', 'Cod. RC', 'COD. RC'));
    const repName = str(col(row, 'Representante', 'REPRESENTANTE'));
    const productCode = str(col(row, 'Cód. Produto', 'Cod. Produto', 'COD. PRODUTO'));
    const productName = str(col(row, 'Nome do Produto', 'NOME DO PRODUTO'));
    const invoiceNumber = str(col(row, 'Nota Fiscal', 'NOTA FISCAL'));
    const orderNumber = str(col(row, 'Pedido', 'PEDIDO'));
    const tipoOp = str(col(row, 'Tipo de Operação', 'Tipo de Operacao', 'TIPO DE OPERAÇÃO'));
    const uf = str(col(row, 'UF', 'uf', 'Estado', 'ESTADO'));
    const municipio = str(col(row, 'Município', 'Municipio', 'MUNICÍPIO'));
    const regiao = str(col(row, 'Região', 'Regiao', 'REGIÃO'));
    const segmentacao = str(col(row, 'Segmentação', 'Segmentacao', 'SEGMENTAÇÃO'));

    const isOpenOrder = !invoiceNumber || invoiceNumber === '0' ||
      (tipoOp && (tipoOp.toLowerCase().includes('carteira') || tipoOp.toLowerCase().includes('pedido em aberto')));

    // Upsert client
    if (clientCode && clientName && !clientMap.has(clientCode)) {
      try {
        const [res] = await db.execute(
          `INSERT INTO clients (name, clientCode, city, state, segment, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
          [clientName, clientCode, municipio, uf, segmentacao]
        );
        clientMap.set(clientCode, res.insertId);
        stats.clientsNew++;
      } catch (e) {
        if (!e.message.includes('Duplicate')) { console.error('Client err:', e.message.substring(0,100)); stats.errors++; }
        stats.clientsSkip++;
      }
    } else if (clientCode) {
      stats.clientsSkip++;
    }

    // Upsert representative
    if (repCode && repName && !repMap.has(repCode)) {
      try {
        const [res] = await db.execute(
          `INSERT INTO representatives (name, repCode, status, createdAt, updatedAt) VALUES (?, ?, 'active', NOW(), NOW())`,
          [repName, repCode]
        );
        repMap.set(repCode, res.insertId);
        stats.repsNew++;
      } catch (e) {
        if (!e.message.includes('Duplicate')) { console.error('Rep err:', e.message.substring(0,100)); stats.errors++; }
        stats.repsSkip++;
      }
    } else if (repCode) {
      stats.repsSkip++;
    }

    // Upsert product
    if (productCode && productName && !productMap.has(productCode)) {
      try {
        const [res] = await db.execute(
          `INSERT INTO products (productCode, name, productGroup, solution, subSolution, line, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [productCode, productName,
           str(col(row, 'Grupo Produto', 'GRUPO PRODUTO')),
           str(col(row, 'Solução', 'Solucao', 'SOLUÇÃO')),
           str(col(row, 'Subsolução', 'Subsolucao', 'SUBSOLUÇÃO')),
           str(col(row, 'Linha', 'LINHA'))]
        );
        productMap.set(productCode, res.insertId);
        stats.productsNew++;
      } catch (e) {
        if (!e.message.includes('Duplicate')) { console.error('Product err:', e.message.substring(0,100)); stats.errors++; }
        stats.productsSkip++;
      }
    } else if (productCode) {
      stats.productsSkip++;
    }

    if (isOpenOrder && orderNumber && clientCode) {
      const orderKey = `${orderNumber}|${clientCode}|${productCode}`;
      if (!ordersSet.has(orderKey)) {
        try {
          await db.execute(
            `INSERT INTO open_orders (orderNumber, orderDate, clientId, clientCode, clientName,
             productId, productCode, productName, representativeId, repCode, repName,
             qtdSacos, precoPorSaco, faturamentoEstimado, volumeEstimado,
             tipoOperacao, mesAno, ano, filial, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
            [
              orderNumber,
              parseDate(col(row, 'Data do Pedido', 'DATA DO PEDIDO')),
              clientMap.get(clientCode) || null,
              clientCode, clientName,
              productMap.get(productCode) || null,
              productCode, productName,
              repMap.get(repCode) || null,
              repCode, repName,
              parseNum(col(row, 'Qtde. Sacos', 'QTDE. SACOS')),
              parseNum(col(row, 'Preço por Saco', 'PREÇO POR SACO')),
              parseNum(col(row, 'Faturamento Realizado', 'FATURAMENTO REALIZADO')),
              parseNum(col(row, 'Volume (Vendas)', 'VOLUME (VENDAS)')),
              tipoOp,
              str(col(row, 'Mês/Ano', 'MÊS/ANO')),
              str(col(row, 'Ano', 'ANO')),
              str(col(row, 'Filial', 'FILIAL')),
            ]
          );
          ordersSet.add(orderKey);
          stats.ordersNew++;
        } catch (e) {
          if (!e.message.includes('Duplicate')) { console.error('Order err:', e.message.substring(0,150)); stats.errors++; }
          stats.ordersSkip++;
        }
      } else {
        stats.ordersSkip++;
      }
    } else if (!isOpenOrder && invoiceNumber && clientCode) {
      const saleKey = `${invoiceNumber}|${clientCode}|${productCode}`;
      if (!salesSet.has(saleKey)) {
        try {
          await db.execute(
            `INSERT INTO sales_invoices (invoiceNumber, orderNumber, invoiceDate, orderDate,
             clientId, clientCode, clientName, productId, productCode, productName,
             representativeId, repCode, repName, qtdSacos, precoPorSaco, precoPorKg,
             faturamentoRealizado, volumeVendas, descontoPct, pmr, mbCbPct, mbCbTotal,
             mlCbPct, mlCbTotal, custoBrillTotal, comissaoPct, tipoOperacao,
             mesAno, ano, filial, codFilial, grv, gnv, uf, municipio, regiao,
             segmentacao, categoria, grupoCliente, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              invoiceNumber, orderNumber,
              parseDate(col(row, 'Data da NF', 'DATA DA NF')),
              parseDate(col(row, 'Data do Pedido', 'DATA DO PEDIDO')),
              clientMap.get(clientCode) || null, clientCode, clientName,
              productMap.get(productCode) || null, productCode, productName,
              repMap.get(repCode) || null, repCode, repName,
              parseNum(col(row, 'Qtde. Sacos', 'QTDE. SACOS')),
              parseNum(col(row, 'Preço por Saco', 'PREÇO POR SACO')),
              parseNum(col(row, 'Preço por KG', 'PREÇO POR KG')),
              parseNum(col(row, 'Faturamento Realizado', 'FATURAMENTO REALIZADO')),
              parseNum(col(row, 'Volume (Vendas)', 'VOLUME (VENDAS)')),
              parseNum(col(row, 'Desconto %', 'DESCONTO %')),
              parseNum(col(row, 'PMR', 'pmr')),
              parseNum(col(row, 'MB CB %', 'MB CB%')),
              parseNum(col(row, 'MB CB Total', 'MB CB TOTAL')),
              parseNum(col(row, 'ML CB %', 'ML CB%')),
              parseNum(col(row, 'ML CB Total', 'ML CB TOTAL')),
              parseNum(col(row, 'Custo Brill Total', 'CUSTO BRILL TOTAL')),
              parseNum(col(row, 'Comissão', 'COMISSÃO')),
              tipoOp,
              str(col(row, 'Mês/Ano', 'MÊS/ANO')),
              str(col(row, 'Ano', 'ANO')),
              str(col(row, 'Filial', 'FILIAL')),
              str(col(row, 'Cód. Filial', 'CÓD. FILIAL')),
              str(col(row, 'GRV')),
              str(col(row, 'GNV')),
              uf, municipio, regiao, segmentacao,
              str(col(row, 'Categoria', 'CATEGORIA')),
              str(col(row, 'Grupo Cliente', 'GRUPO CLIENTE')),
            ]
          );
          salesSet.add(saleKey);
          stats.salesNew++;
        } catch (e) {
          if (!e.message.includes('Duplicate')) { console.error('Sale err:', e.message.substring(0,150)); stats.errors++; }
          stats.salesSkip++;
        }
      } else {
        stats.salesSkip++;
      }
    }
  }

  console.log(`  Clients: +${stats.clientsNew} new, ${stats.clientsSkip} skipped`);
  console.log(`  Reps: +${stats.repsNew} new, ${stats.repsSkip} skipped`);
  console.log(`  Products: +${stats.productsNew} new, ${stats.productsSkip} skipped`);
  console.log(`  Sales: +${stats.salesNew} new, ${stats.salesSkip} skipped`);
  console.log(`  Open Orders: +${stats.ordersNew} new, ${stats.ordersSkip} skipped`);
  if (stats.errors > 0) console.log(`  Errors: ${stats.errors}`);
}

await importVendasFile('/home/ubuntu/upload/data(68).xlsx');
await importVendasFile('/home/ubuntu/upload/data(69).xlsx');

// Final counts
const [[{ total: totalSales }]] = await db.execute('SELECT COUNT(*) as total FROM sales_invoices');
const [[{ total: totalOrders }]] = await db.execute('SELECT COUNT(*) as total FROM open_orders');
const [[{ total: totalClients }]] = await db.execute('SELECT COUNT(*) as total FROM clients');
const [[{ total: totalReps }]] = await db.execute('SELECT COUNT(*) as total FROM representatives');
const [[{ total: totalProducts }]] = await db.execute('SELECT COUNT(*) as total FROM products');
const [[{ total: totalRevenue }]] = await db.execute('SELECT SUM(faturamentoRealizado) as total FROM sales_invoices');

console.log('\n=== FINAL TOTALS ===');
console.log(`Sales invoices: ${totalSales} | Revenue: R$ ${parseFloat(totalRevenue||0).toLocaleString('pt-BR', {minimumFractionDigits:0})}`);
console.log(`Open orders: ${totalOrders}`);
console.log(`Clients: ${totalClients}`);
console.log(`Representatives: ${totalReps}`);
console.log(`Products: ${totalProducts}`);

await db.end();
