import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("=== Calculating ABC Classification ===\n");

  // 1. ABC de Produtos (baseado em faturamento)
  console.log("1. Calculating ABC for Products...");
  const [productSales] = await db.execute(`
    SELECT 
      productId, 
      productCode,
      productName,
      SUM(faturamentoRealizado) as totalFat
    FROM sales_invoices
    WHERE faturamentoRealizado IS NOT NULL
    GROUP BY productId, productCode, productName
    ORDER BY totalFat DESC
  `);

  const totalProductFat = productSales.reduce((sum, p) => sum + (p.totalFat || 0), 0);
  let accumulatedFat = 0;
  for (const product of productSales) {
    accumulatedFat += product.totalFat || 0;
    const percentage = (accumulatedFat / totalProductFat) * 100;
    let abcClass = 'C';
    if (percentage <= 80) abcClass = 'A';
    else if (percentage <= 95) abcClass = 'B';

    await db.execute(
      "UPDATE products SET abcClass = ? WHERE id = ?",
      [abcClass, product.productId]
    );
  }
  console.log(`  Updated ${productSales.length} products`);

  // 2. ABC de Representantes (baseado em faturamento)
  console.log("2. Calculating ABC for Representatives...");
  const [repSales] = await db.execute(`
    SELECT 
      representativeId,
      repCode,
      repName,
      SUM(faturamentoRealizado) as totalFat
    FROM sales_invoices
    WHERE faturamentoRealizado IS NOT NULL AND representativeId IS NOT NULL
    GROUP BY representativeId, repCode, repName
    ORDER BY totalFat DESC
  `);

  const totalRepFat = repSales.reduce((sum, r) => sum + (r.totalFat || 0), 0);
  accumulatedFat = 0;
  for (const rep of repSales) {
    accumulatedFat += rep.totalFat || 0;
    const percentage = (accumulatedFat / totalRepFat) * 100;
    let abcClass = 'C';
    if (percentage <= 80) abcClass = 'A';
    else if (percentage <= 95) abcClass = 'B';

    await db.execute(
      "UPDATE representatives SET abcClass = ? WHERE id = ?",
      [abcClass, rep.representativeId]
    );
  }
  console.log(`  Updated ${repSales.length} representatives`);

  // 3. ABC de Clientes (baseado em faturamento)
  console.log("3. Calculating ABC for Clients...");
  const [clientSales] = await db.execute(`
    SELECT 
      clientId,
      clientCode,
      clientName,
      SUM(faturamentoRealizado) as totalFat
    FROM sales_invoices
    WHERE faturamentoRealizado IS NOT NULL AND clientId IS NOT NULL
    GROUP BY clientId, clientCode, clientName
    ORDER BY totalFat DESC
  `);

  const totalClientFat = clientSales.reduce((sum, c) => sum + (c.totalFat || 0), 0);
  accumulatedFat = 0;
  for (const client of clientSales) {
    accumulatedFat += client.totalFat || 0;
    const percentage = (accumulatedFat / totalClientFat) * 100;
    let abcClass = 'C';
    if (percentage <= 80) abcClass = 'A';
    else if (percentage <= 95) abcClass = 'B';

    await db.execute(
      "UPDATE clients SET abcClass = ? WHERE id = ?",
      [abcClass, client.clientId]
    );
  }
  console.log(`  Updated ${clientSales.length} clients`);

  // 4. Verificar inatividade de clientes (6+ meses sem compra)
  console.log("\n4. Checking Client Inactivity (6+ months)...");
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [inactiveClients] = await db.execute(`
    SELECT 
      c.id,
      c.clientCode,
      c.name,
      c.lastPurchaseDate,
      DATEDIFF(NOW(), c.lastPurchaseDate) as daysInactive
    FROM clients c
    WHERE c.status = 'active'
      AND (c.lastPurchaseDate IS NULL OR c.lastPurchaseDate < ?)
    ORDER BY c.lastPurchaseDate ASC
  `, [sixMonthsAgo]);

  console.log(`  Found ${inactiveClients.length} inactive clients`);

  // Atualizar status de inatividade
  for (const client of inactiveClients) {
    await db.execute(
      "UPDATE clients SET inactivityStatus = ? WHERE id = ?",
      ['inactive_6months', client.id]
    );

    // Criar alerta se não existir
    const [existing] = await db.execute(
      "SELECT id FROM inactivityAlerts WHERE clientId = ? AND alertStatus = 'active'",
      [client.id]
    );

    if (existing.length === 0) {
      await db.execute(
        `INSERT INTO inactivityAlerts (clientId, clientCode, clientName, lastPurchaseDate, daysInactive, alertStatus)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [client.id, client.clientCode, client.name, client.lastPurchaseDate, client.daysInactive]
      );
    }
  }

  // 5. Verificar métricas de vendas
  console.log("\n5. Calculating Sales Metrics...");
  const [metrics] = await db.execute(`
    SELECT 
      COUNT(*) as totalSales,
      SUM(faturamentoRealizado) as totalRevenue,
      AVG(descontoPct) as avgDiscount,
      AVG(precoPorSaco) as avgPrice,
      AVG(faturamentoRealizado) as avgTicket,
      SUM(CASE WHEN faturamentoRealizado IS NULL THEN 1 ELSE 0 END) as openOrders
    FROM sales_invoices
  `);

  console.log(`  Total Sales: ${metrics[0].totalSales}`);
  console.log(`  Total Revenue: R$ ${Number(metrics[0].totalRevenue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
  console.log(`  Avg Discount: ${(metrics[0].avgDiscount || 0).toFixed(2)}%`);
  console.log(`  Avg Price: R$ ${(metrics[0].avgPrice || 0).toFixed(2)}`);
  console.log(`  Avg Ticket: R$ ${(metrics[0].avgTicket || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
  console.log(`  Open Orders (Carteira): ${metrics[0].openOrders}`);

  // 6. Verificar ABC distribution
  console.log("\n6. ABC Distribution:");
  const [abcDist] = await db.execute(`
    SELECT 
      'Products' as type, abcClass, COUNT(*) as cnt FROM products WHERE abcClass IS NOT NULL GROUP BY abcClass
    UNION ALL
    SELECT 'Representatives', abcClass, COUNT(*) FROM representatives WHERE abcClass IS NOT NULL GROUP BY abcClass
    UNION ALL
    SELECT 'Clients', abcClass, COUNT(*) FROM clients WHERE abcClass IS NOT NULL GROUP BY abcClass
  `);

  for (const row of abcDist) {
    console.log(`  ${row.type} - Class ${row.abcClass}: ${row.cnt}`);
  }

  console.log("\n=== ABC CALCULATION COMPLETE ===");

  await db.end();
}

main().catch(console.error);
