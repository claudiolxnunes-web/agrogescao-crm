/**
 * migrate-and-seed.ts
 * Runs on every server startup.
 * - Creates all tables in MySQL if they don't exist
 * - Seeds realistic agribusiness data if the database is empty
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

function getMysqlConfig() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
}

async function exec(conn: mysql.Connection, sql: string, args?: any[]) {
  return conn.execute(sql, args || []);
}

async function queryRows<T = any>(conn: mysql.Connection, sql: string, args?: any[]): Promise<T[]> {
  const [rows] = await conn.execute(sql, args || []);
  return rows as T[];
}

async function insertGetId(conn: mysql.Connection, sql: string, args?: any[]): Promise<number> {
  const [result] = await conn.execute(sql, args || []);
  return (result as any).insertId;
}

export async function initializeDatabase() {
  const conn = await mysql.createConnection(getMysqlConfig());
  try {
    await createTables(conn);
    const rows = await queryRows<{cnt: number}>(conn, "SELECT COUNT(*) as cnt FROM users");
    const count = Number(rows[0]?.cnt ?? 0);
    if (count > 0) {
      console.log("[Seed] Database already seeded, skipping...");
      return;
    }
    console.log("[Seed] Starting database seed...");
    await seedDatabase(conn);
    console.log("[Seed] Database seeded successfully!");
  } finally {
    await conn.end();
  }
}

async function createTables(conn: mysql.Connection) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      openId VARCHAR(64) UNIQUE,
      name TEXT,
      email VARCHAR(320) UNIQUE,
      passwordHash VARCHAR(255),
      loginMethod VARCHAR(64) DEFAULT 'email',
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS regions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE,
      totalClients INT DEFAULT 0,
      totalReps INT DEFAULT 0,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS representatives (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(320) UNIQUE,
      phone VARCHAR(20),
      regionId INT,
      territory VARCHAR(200),
      status ENUM('active','inactive') DEFAULT 'active',
      performanceScore INT DEFAULT 0,
      totalSales DOUBLE DEFAULT 0,
      totalClients INT DEFAULT 0,
      totalOpportunities INT DEFAULT 0,
      avatar VARCHAR(10),
      hireDate TIMESTAMP NULL,
      notes TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (regionId) REFERENCES regions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      type ENUM('fazenda_ruminantes','fabrica_racao','revenda_agropecuaria') NOT NULL,
      cnpj VARCHAR(20),
      email VARCHAR(320),
      phone VARCHAR(20),
      address VARCHAR(300),
      city VARCHAR(100),
      state VARCHAR(2),
      regionId INT,
      representativeId INT,
      totalPurchases DOUBLE DEFAULT 0,
      lastPurchaseDate TIMESTAMP NULL,
      businessPotential DOUBLE DEFAULT 0,
      purchasePotential DOUBLE DEFAULT 0,
      segment VARCHAR(100),
      status ENUM('active','inactive','prospect') DEFAULT 'active',
      notes TEXT,
      lat DOUBLE,
      lng DOUBLE,
      contactName VARCHAR(200),
      website VARCHAR(300),
      animalCount INT,
      animalTypes VARCHAR(200),
      productionType VARCHAR(100),
      propertyArea DOUBLE,
      farmingSystem VARCHAR(100),
      consumedProducts VARCHAR(300),
      productionCapacity DOUBLE,
      productLines VARCHAR(300),
      rationTypes VARCHAR(300),
      rawMaterialVolume DOUBLE,
      coveredMunicipalities INT,
      productMix VARCHAR(300),
      monthlySalesVolume DOUBLE,
      finalClientsCount INT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (regionId) REFERENCES regions(id),
      FOREIGN KEY (representativeId) REFERENCES representatives(id)
    )`,
    `CREATE TABLE IF NOT EXISTS opportunities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(300) NOT NULL,
      clientId INT,
      representativeId INT,
      regionId INT,
      value DOUBLE NOT NULL DEFAULT 0,
      stage ENUM('prospecting','qualification','proposal','negotiation','won','lost') NOT NULL DEFAULT 'prospecting',
      probability INT DEFAULT 0,
      expectedCloseDate TIMESTAMP NULL,
      actualCloseDate TIMESTAMP NULL,
      product VARCHAR(200),
      notes TEXT,
      lostReason VARCHAR(300),
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id),
      FOREIGN KEY (representativeId) REFERENCES representatives(id),
      FOREIGN KEY (regionId) REFERENCES regions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS goals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      representativeId INT,
      regionId INT,
      name VARCHAR(200),
      period VARCHAR(20) NOT NULL,
      targetValue DOUBLE NOT NULL,
      currentValue DOUBLE DEFAULT 0,
      type ENUM('sales','clients','opportunities','visits') DEFAULT 'sales',
      status ENUM('on_track','at_risk','achieved','missed') DEFAULT 'on_track',
      startDate TIMESTAMP NULL,
      endDate TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (representativeId) REFERENCES representatives(id),
      FOREIGN KEY (regionId) REFERENCES regions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('visit','call','email','proposal','meeting','demo') NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      clientId INT,
      representativeId INT,
      opportunityId INT,
      scheduledAt TIMESTAMP NULL,
      completedAt TIMESTAMP NULL,
      status ENUM('pending','completed','cancelled') DEFAULT 'pending',
      outcome TEXT,
      location VARCHAR(300),
      duration INT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id),
      FOREIGN KEY (representativeId) REFERENCES representatives(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sales_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      representativeId INT,
      regionId INT,
      month INT NOT NULL,
      year INT NOT NULL,
      value DOUBLE NOT NULL DEFAULT 0,
      clientsCount INT DEFAULT 0,
      opportunitiesCount INT DEFAULT 0,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (representativeId) REFERENCES representatives(id),
      FOREIGN KEY (regionId) REFERENCES regions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT,
      type ENUM('goal_risk','high_value_opportunity','new_client','activity_due','system') NOT NULL,
      title VARCHAR(300) NOT NULL,
      message TEXT NOT NULL,
      isRead BOOLEAN DEFAULT false,
      relatedId INT,
      relatedType VARCHAR(50),
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT,
      channel ENUM('whatsapp','sms','email','inapp') NOT NULL,
      eventType VARCHAR(100) NOT NULL,
      enabled BOOLEAN DEFAULT true,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS automations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      \`trigger\` ENUM('opportunity_created','goal_at_risk','long_cycle','client_inactive','high_value') NOT NULL,
      action VARCHAR(300) NOT NULL,
      conditions TEXT,
      isActive BOOLEAN DEFAULT true,
      executionCount INT DEFAULT 0,
      lastExecutedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      clientId INT,
      representativeId INT,
      product VARCHAR(200) NOT NULL,
      value DOUBLE NOT NULL,
      quantity DOUBLE DEFAULT 1,
      unit VARCHAR(20) DEFAULT 'ton',
      purchaseDate TIMESTAMP NOT NULL,
      invoiceNumber VARCHAR(50),
      notes TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id),
      FOREIGN KEY (representativeId) REFERENCES representatives(id)
    )`,
    `CREATE TABLE IF NOT EXISTS daily_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      representativeId INT,
      reportDate VARCHAR(10) NOT NULL,
      visitsCount INT DEFAULT 0,
      callsCount INT DEFAULT 0,
      proposalsCount INT DEFAULT 0,
      ordersCount INT DEFAULT 0,
      totalOrderValue DOUBLE DEFAULT 0,
      generalNotes TEXT,
      status ENUM('draft','submitted') DEFAULT 'draft',
      submittedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (representativeId) REFERENCES representatives(id)
    )`,
  ];

  for (const sql of tables) {
    try {
      await conn.execute(sql);
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        console.error("[Migration] Error:", e.message?.substring(0, 100));
      }
    }
  }

  // Ensure users table has passwordHash column (may have been created without it)
  try {
    await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash VARCHAR(255)");
  } catch (_) {}

  console.log("[Migration] Schema applied successfully");
}

async function seedDatabase(conn: mysql.Connection) {
  // ============================================================
  // ADMIN USER
  // ============================================================
  const passwordHash = bcrypt.hashSync("Clxn@032461", 10);
  const adminId = await insertGetId(conn,
    `INSERT INTO users (name, email, passwordHash, loginMethod, role) VALUES (?, ?, ?, 'email', 'admin')`,
    ["Claudio Nunes", "claudiolx.nunes@gmail.com", passwordHash]
  );

  // ============================================================
  // REGIÕES (todos os 27 estados do Brasil)
  // ============================================================
  const regionData = [
    { name: "Acre", code: "AC" },
    { name: "Alagoas", code: "AL" },
    { name: "Amapá", code: "AP" },
    { name: "Amazonas", code: "AM" },
    { name: "Bahia", code: "BA" },
    { name: "Ceará", code: "CE" },
    { name: "Distrito Federal", code: "DF" },
    { name: "Espírito Santo", code: "ES" },
    { name: "Goiás", code: "GO" },
    { name: "Maranhão", code: "MA" },
    { name: "Mato Grosso", code: "MT" },
    { name: "Mato Grosso do Sul", code: "MS" },
    { name: "Minas Gerais", code: "MG" },
    { name: "Pará", code: "PA" },
    { name: "Paraíba", code: "PB" },
    { name: "Paraná", code: "PR" },
    { name: "Pernambuco", code: "PE" },
    { name: "Piauí", code: "PI" },
    { name: "Rio de Janeiro", code: "RJ" },
    { name: "Rio Grande do Norte", code: "RN" },
    { name: "Rio Grande do Sul", code: "RS" },
    { name: "Rondônia", code: "RO" },
    { name: "Roraima", code: "RR" },
    { name: "Santa Catarina", code: "SC" },
    { name: "São Paulo", code: "SP" },
    { name: "Sergipe", code: "SE" },
    { name: "Tocantins", code: "TO" },
  ];
  const regionMap: Record<string, number> = {};
  for (const r of regionData) {
    const id = await insertGetId(conn, "INSERT INTO regions (name, code) VALUES (?, ?)", [r.name, r.code]);
    regionMap[r.code] = id;
  }

  // ============================================================
  // REPRESENTANTES (22)
  // ============================================================
  const repData = [
    { name: "Carlos Eduardo Silva", email: "carlos.silva@agrogescao.com.br", phone: "(11) 99234-5678", code: "SP", territory: "Interior SP - Ribeirão Preto", score: 92, sales: 1900000, clients: 13, opps: 8 },
    { name: "Beatriz Gomes", email: "beatriz.gomes@agrogescao.com.br", phone: "(65) 98765-4321", code: "MT", territory: "Mato Grosso - Sorriso/Lucas do Rio Verde", score: 90, sales: 1600000, clients: 15, opps: 9 },
    { name: "Ana Paula Ferreira", email: "ana.ferreira@agrogescao.com.br", phone: "(11) 97654-3210", code: "SP", territory: "Grande SP - Campinas/Sorocaba", score: 88, sales: 1500000, clients: 9, opps: 7 },
    { name: "Thiago Mendes", email: "thiago.mendes@agrogescao.com.br", phone: "(31) 96543-2109", code: "MG", territory: "Triângulo Mineiro - Uberlândia/Uberaba", score: 85, sales: 2100000, clients: 18, opps: 11 },
    { name: "Leonardo Alves", email: "leonardo.alves@agrogescao.com.br", phone: "(62) 95432-1098", code: "GO", territory: "Goiás - Rio Verde/Jataí", score: 83, sales: 1750000, clients: 14, opps: 8 },
    { name: "Fernanda Costa", email: "fernanda.costa@agrogescao.com.br", phone: "(51) 94321-0987", code: "RS", territory: "Rio Grande do Sul - Passo Fundo/Cruz Alta", score: 81, sales: 1400000, clients: 11, opps: 6 },
    { name: "Roberto Santos", email: "roberto.santos@agrogescao.com.br", phone: "(41) 93210-9876", code: "PR", territory: "Paraná - Cascavel/Maringá", score: 79, sales: 1300000, clients: 10, opps: 7 },
    { name: "Mariana Lima", email: "mariana.lima@agrogescao.com.br", phone: "(65) 92109-8765", code: "MT", territory: "Mato Grosso - Cuiabá/Rondonópolis", score: 77, sales: 1200000, clients: 9, opps: 5 },
    { name: "Paulo Rodrigues", email: "paulo.rodrigues@agrogescao.com.br", phone: "(67) 91098-7654", code: "MS", territory: "MS - Campo Grande/Dourados", score: 75, sales: 1100000, clients: 8, opps: 6 },
    { name: "Juliana Pereira", email: "juliana.pereira@agrogescao.com.br", phone: "(31) 90987-6543", code: "MG", territory: "Sul de Minas - Lavras/Alfenas", score: 73, sales: 980000, clients: 7, opps: 4 },
    { name: "Gustavo Oliveira", email: "gustavo.oliveira@agrogescao.com.br", phone: "(11) 89876-5432", code: "SP", territory: "SP - Bauru/Marília", score: 71, sales: 920000, clients: 7, opps: 5 },
    { name: "Camila Souza", email: "camila.souza@agrogescao.com.br", phone: "(62) 88765-4321", code: "GO", territory: "GO - Anápolis/Catalão", score: 69, sales: 850000, clients: 6, opps: 4 },
    { name: "Diego Martins", email: "diego.martins@agrogescao.com.br", phone: "(71) 87654-3210", code: "BA", territory: "Bahia - Barreiras/Luís Eduardo Magalhães", score: 67, sales: 780000, clients: 6, opps: 3 },
    { name: "Patrícia Nunes", email: "patricia.nunes@agrogescao.com.br", phone: "(51) 86543-2109", code: "RS", territory: "RS - Santa Maria/Uruguaiana", score: 65, sales: 720000, clients: 5, opps: 3 },
    { name: "Rafael Barbosa", email: "rafael.barbosa@agrogescao.com.br", phone: "(41) 85432-1098", code: "PR", territory: "PR - Londrina/Apucarana", score: 63, sales: 680000, clients: 5, opps: 4 },
    { name: "Vanessa Carvalho", email: "vanessa.carvalho@agrogescao.com.br", phone: "(31) 84321-0987", code: "MG", territory: "MG - Montes Claros/Pirapora", score: 61, sales: 620000, clients: 5, opps: 3 },
    { name: "Marcos Araújo", email: "marcos.araujo@agrogescao.com.br", phone: "(65) 83210-9876", code: "MT", territory: "MT - Alta Floresta/Sinop", score: 59, sales: 580000, clients: 4, opps: 3 },
    { name: "Luciana Freitas", email: "luciana.freitas@agrogescao.com.br", phone: "(67) 82109-8765", code: "MS", territory: "MS - Três Lagoas/Corumbá", score: 57, sales: 540000, clients: 4, opps: 2 },
    { name: "André Moreira", email: "andre.moreira@agrogescao.com.br", phone: "(11) 81098-7654", code: "SP", territory: "SP - Presidente Prudente/Araçatuba", score: 55, sales: 500000, clients: 4, opps: 3 },
    { name: "Simone Teixeira", email: "simone.teixeira@agrogescao.com.br", phone: "(71) 80987-6543", code: "BA", territory: "BA - Feira de Santana/Vitória da Conquista", score: 53, sales: 460000, clients: 3, opps: 2 },
    { name: "Bruno Nascimento", email: "bruno.nascimento@agrogescao.com.br", phone: "(62) 79876-5432", code: "GO", territory: "GO - Itumbiara/Morrinhos", score: 51, sales: 420000, clients: 3, opps: 2 },
    { name: "Tatiana Ramos", email: "tatiana.ramos@agrogescao.com.br", phone: "(41) 78765-4321", code: "PR", territory: "PR - Foz do Iguaçu/Toledo", score: 49, sales: 380000, clients: 3, opps: 2 },
  ];

  const repIds: number[] = [];
  const repHash = bcrypt.hashSync("Rep@2025", 10);
  for (const rep of repData) {
    const repId = await insertGetId(conn,
      `INSERT INTO representatives (name, email, phone, regionId, territory, status, performanceScore, totalSales, totalClients, totalOpportunities, hireDate)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [rep.name, rep.email, rep.phone, regionMap[rep.code], rep.territory, rep.score, rep.sales, rep.clients, rep.opps,
       new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)]
    );
    repIds.push(repId);
    // Create user account for each rep (ignore duplicate errors)
    try {
      await exec(conn,
        `INSERT INTO users (name, email, passwordHash, loginMethod, role) VALUES (?, ?, ?, 'email', 'user')`,
        [rep.name, rep.email, repHash]
      );
    } catch (_) {}
  }

  // ============================================================
  // CLIENTES (59)
  // ============================================================
  const stateToRegion: Record<string, string> = {
    SP: "SP", MG: "MG", MT: "MT", GO: "GO", RS: "RS", PR: "PR", BA: "BA", MS: "MS"
  };

  const fazendas = [
    { name: "Fazenda Santa Fé", city: "Sorriso", state: "MT", repIdx: 1, animals: 3200, animalType: "Bovinos de corte", prodType: "Confinamento", area: 4500, system: "Intensivo", products: "Núcleo bovino, Sal mineral", potential: 380000 },
    { name: "Fazenda Boa Esperança", city: "Uberlândia", state: "MG", repIdx: 3, animals: 2800, animalType: "Bovinos de corte", prodType: "Semiconfinamento", area: 3800, system: "Semi-intensivo", products: "Suplemento proteico, Sal mineral", potential: 320000 },
    { name: "Agropecuária São João", city: "Rio Verde", state: "GO", repIdx: 4, animals: 4100, animalType: "Bovinos de corte e leite", prodType: "Misto", area: 5200, system: "Extensivo/Intensivo", products: "Ração lactação, Núcleo bovino", potential: 450000 },
    { name: "Fazenda Cerrado Verde", city: "Barreiras", state: "BA", repIdx: 12, animals: 2200, animalType: "Bovinos de corte", prodType: "Confinamento", area: 3100, system: "Intensivo", products: "Núcleo bovino, Sal mineral", potential: 260000 },
    { name: "Rancho Paraíso", city: "Campo Grande", state: "MS", repIdx: 8, animals: 3600, animalType: "Bovinos de corte", prodType: "Confinamento", area: 4800, system: "Intensivo", products: "Suplemento energético, Sal mineral", potential: 410000 },
    { name: "Fazenda Três Irmãos", city: "Cascavel", state: "PR", repIdx: 6, animals: 1800, animalType: "Suínos e aves", prodType: "Integrado", area: 1200, system: "Intensivo", products: "Ração suínos, Ração frango", potential: 220000 },
    { name: "Haras Bela Vista", city: "Ribeirão Preto", state: "SP", repIdx: 0, animals: 450, animalType: "Equinos e bovinos", prodType: "Misto", area: 800, system: "Semi-intensivo", products: "Ração equinos, Sal mineral", potential: 180000 },
    { name: "Fazenda Horizonte", city: "Passo Fundo", state: "RS", repIdx: 5, animals: 2100, animalType: "Bovinos de leite", prodType: "Produção de leite", area: 2800, system: "Intensivo", products: "Ração lactação, Núcleo leiteiro", potential: 290000 },
    { name: "Agropecuária Vitória", city: "Dourados", state: "MS", repIdx: 8, animals: 1600, animalType: "Bovinos de corte", prodType: "Semiconfinamento", area: 2200, system: "Semi-intensivo", products: "Núcleo bovino, Sal mineral", potential: 195000 },
    { name: "Fazenda Palmeiras", city: "Sinop", state: "MT", repIdx: 16, animals: 2900, animalType: "Bovinos de corte", prodType: "Confinamento", area: 3900, system: "Intensivo", products: "Suplemento proteico, Sal mineral", potential: 340000 },
    { name: "Sítio São Pedro", city: "Lavras", state: "MG", repIdx: 9, animals: 980, animalType: "Bovinos de leite e suínos", prodType: "Misto", area: 1400, system: "Semi-intensivo", products: "Ração lactação, Ração suínos", potential: 145000 },
    { name: "Fazenda Conquista", city: "Anápolis", state: "GO", repIdx: 11, animals: 1750, animalType: "Bovinos de corte", prodType: "Semiconfinamento", area: 2400, system: "Semi-intensivo", products: "Núcleo bovino, Sal mineral", potential: 210000 },
    { name: "Agropecuária Minuano", city: "Santa Maria", state: "RS", repIdx: 13, animals: 1300, animalType: "Bovinos de leite", prodType: "Produção de leite", area: 1800, system: "Intensivo", products: "Ração lactação, Núcleo leiteiro", potential: 175000 },
    { name: "Fazenda Progresso", city: "Londrina", state: "PR", repIdx: 14, animals: 2400, animalType: "Suínos", prodType: "Granja integrada", area: 1600, system: "Intensivo", products: "Ração suínos crescimento, Ração suínos terminação", potential: 285000 },
    { name: "Rancho Esperança", city: "Montes Claros", state: "MG", repIdx: 15, animals: 1100, animalType: "Bovinos de corte", prodType: "Extensivo", area: 1900, system: "Extensivo", products: "Sal mineral, Suplemento proteico", potential: 130000 },
    { name: "Fazenda Boa Vista", city: "Presidente Prudente", state: "SP", repIdx: 18, animals: 1950, animalType: "Bovinos de corte", prodType: "Confinamento", area: 2700, system: "Intensivo", products: "Núcleo bovino, Sal mineral", potential: 230000 },
    { name: "Agropecuária Planalto", city: "Itumbiara", state: "GO", repIdx: 20, animals: 1400, animalType: "Bovinos de corte", prodType: "Semiconfinamento", area: 2000, system: "Semi-intensivo", products: "Suplemento energético, Sal mineral", potential: 170000 },
    { name: "Fazenda Recanto Verde", city: "Toledo", state: "PR", repIdx: 21, animals: 1650, animalType: "Aves e suínos", prodType: "Integrado", area: 1100, system: "Intensivo", products: "Ração frango, Ração suínos", potential: 200000 },
    { name: "Sítio Bom Retiro", city: "Feira de Santana", state: "BA", repIdx: 19, animals: 820, animalType: "Bovinos de corte", prodType: "Extensivo", area: 1200, system: "Extensivo", products: "Sal mineral", potential: 95000 },
    { name: "Fazenda Ipê Amarelo", city: "Alta Floresta", state: "MT", repIdx: 16, animals: 2600, animalType: "Bovinos de corte", prodType: "Confinamento", area: 3500, system: "Intensivo", products: "Núcleo bovino, Sal mineral", potential: 310000 },
  ];

  const fabricas = [
    { name: "Nutrição Animal Cerrado", city: "Uberlândia", state: "MG", repIdx: 3, capacity: 15000, lines: "Bovinos, Suínos, Aves", types: "Ração completa, Núcleo, Suplemento", volume: 12000, potential: 850000 },
    { name: "Agromix Rações", city: "Rio Verde", state: "GO", repIdx: 4, capacity: 22000, lines: "Bovinos, Suínos, Aves, Equinos", types: "Ração completa, Premix, Núcleo", volume: 18000, potential: 1200000 },
    { name: "Rações Pampa Sul", city: "Passo Fundo", state: "RS", repIdx: 5, capacity: 18000, lines: "Bovinos de leite, Suínos", types: "Ração lactação, Ração suínos, Núcleo", volume: 14500, potential: 980000 },
    { name: "Nutrimax Alimentos", city: "Cascavel", state: "PR", repIdx: 6, capacity: 25000, lines: "Aves, Suínos, Bovinos", types: "Ração frango, Ração suínos, Núcleo bovino", volume: 21000, potential: 1400000 },
    { name: "Central de Rações MT", city: "Sorriso", state: "MT", repIdx: 1, capacity: 30000, lines: "Bovinos, Suínos, Aves", types: "Ração completa, Núcleo, Premix", volume: 25000, potential: 1650000 },
    { name: "Alimentos Agro SP", city: "Ribeirão Preto", state: "SP", repIdx: 0, capacity: 20000, lines: "Bovinos, Suínos, Equinos", types: "Ração completa, Núcleo, Sal mineral", volume: 16500, potential: 1100000 },
    { name: "Rações Campo Verde", city: "Campo Grande", state: "MS", repIdx: 8, capacity: 12000, lines: "Bovinos, Suínos", types: "Ração completa, Núcleo bovino", volume: 9500, potential: 640000 },
    { name: "Nutrição Baiana", city: "Barreiras", state: "BA", repIdx: 12, capacity: 10000, lines: "Bovinos, Caprinos", types: "Ração completa, Sal mineral", volume: 8000, potential: 520000 },
    { name: "Agrofeed Nordeste", city: "Feira de Santana", state: "BA", repIdx: 19, capacity: 8000, lines: "Bovinos, Caprinos, Ovinos", types: "Ração completa, Suplemento", volume: 6500, potential: 420000 },
    { name: "Rações Planalto GO", city: "Anápolis", state: "GO", repIdx: 11, capacity: 14000, lines: "Bovinos, Suínos, Aves", types: "Ração completa, Núcleo, Premix", volume: 11000, potential: 740000 },
  ];

  const revendas = [
    { name: "Agropecuária São Paulo", city: "Campinas", state: "SP", repIdx: 2, municipalities: 12, mix: "Rações, Medicamentos, Defensivos, Sementes", volume: 450000, clients: 280 },
    { name: "Casa Agropecuária Mineira", city: "Uberlândia", state: "MG", repIdx: 3, municipalities: 8, mix: "Rações, Sal mineral, Medicamentos", volume: 380000, clients: 210 },
    { name: "Agro Sul Rio Grande", city: "Santa Maria", state: "RS", repIdx: 13, municipalities: 15, mix: "Rações, Sementes, Defensivos, Fertilizantes", volume: 520000, clients: 340 },
    { name: "Distribuidora Agro PR", city: "Londrina", state: "PR", repIdx: 14, municipalities: 10, mix: "Rações, Medicamentos, Sementes", volume: 410000, clients: 260 },
    { name: "Agropecuária Centro-Oeste", city: "Cuiabá", state: "MT", repIdx: 7, municipalities: 18, mix: "Rações, Sal mineral, Defensivos", volume: 680000, clients: 420 },
    { name: "Revenda Agro Goiás", city: "Goiânia", state: "GO", repIdx: 11, municipalities: 14, mix: "Rações, Sementes, Medicamentos, Fertilizantes", volume: 590000, clients: 380 },
    { name: "Agro Nordeste Bahia", city: "Barreiras", state: "BA", repIdx: 12, municipalities: 20, mix: "Rações, Sal mineral, Medicamentos", volume: 350000, clients: 190 },
    { name: "Casa Rural MS", city: "Dourados", state: "MS", repIdx: 8, municipalities: 9, mix: "Rações, Defensivos, Sementes", volume: 310000, clients: 175 },
    { name: "Agropecuária Interior SP", city: "Bauru", state: "SP", repIdx: 10, municipalities: 11, mix: "Rações, Sal mineral, Medicamentos, Sementes", volume: 420000, clients: 270 },
    { name: "Distribuidora Agro MG", city: "Lavras", state: "MG", repIdx: 9, municipalities: 7, mix: "Rações, Medicamentos, Sal mineral", volume: 280000, clients: 155 },
    { name: "Agro Paraná Centro", city: "Maringá", state: "PR", repIdx: 6, municipalities: 13, mix: "Rações, Sementes, Defensivos, Fertilizantes", volume: 490000, clients: 310 },
    { name: "Casa Agropecuária RS", city: "Cruz Alta", state: "RS", repIdx: 5, municipalities: 11, mix: "Rações, Sementes, Medicamentos", volume: 360000, clients: 225 },
    { name: "Agro Mato Grosso Norte", city: "Sinop", state: "MT", repIdx: 16, municipalities: 16, mix: "Rações, Sal mineral, Defensivos", volume: 550000, clients: 350 },
    { name: "Distribuidora Agro GO", city: "Rio Verde", state: "GO", repIdx: 4, municipalities: 12, mix: "Rações, Medicamentos, Sementes, Fertilizantes", volume: 470000, clients: 295 },
    { name: "Agropecuária Vitória BA", city: "Vitória da Conquista", state: "BA", repIdx: 19, municipalities: 17, mix: "Rações, Sal mineral, Medicamentos", volume: 320000, clients: 180 },
    { name: "Casa Rural SP Interior", city: "Araçatuba", state: "SP", repIdx: 18, municipalities: 9, mix: "Rações, Sal mineral, Sementes", volume: 340000, clients: 200 },
    { name: "Agro Sul MS", city: "Três Lagoas", state: "MS", repIdx: 17, municipalities: 8, mix: "Rações, Medicamentos, Defensivos", volume: 270000, clients: 145 },
    { name: "Distribuidora Agro PR Sul", city: "Foz do Iguaçu", state: "PR", repIdx: 21, municipalities: 10, mix: "Rações, Sementes, Defensivos", volume: 380000, clients: 240 },
    { name: "Agropecuária Minuano RS", city: "Uruguaiana", state: "RS", repIdx: 13, municipalities: 12, mix: "Rações, Sal mineral, Sementes, Fertilizantes", volume: 430000, clients: 275 },
    { name: "Casa Agro MG Norte", city: "Montes Claros", state: "MG", repIdx: 15, municipalities: 14, mix: "Rações, Medicamentos, Sal mineral", volume: 310000, clients: 170 },
    { name: "Agro Centro-Oeste GO", city: "Catalão", state: "GO", repIdx: 20, municipalities: 11, mix: "Rações, Sementes, Defensivos", volume: 360000, clients: 220 },
    { name: "Distribuidora Rural MT", city: "Rondonópolis", state: "MT", repIdx: 7, municipalities: 15, mix: "Rações, Sal mineral, Medicamentos, Defensivos", volume: 510000, clients: 320 },
    { name: "Agropecuária Nordeste BA", city: "Luís Eduardo Magalhães", state: "BA", repIdx: 12, municipalities: 22, mix: "Rações, Sal mineral, Sementes", volume: 400000, clients: 250 },
    { name: "Casa Rural SP Oeste", city: "Presidente Prudente", state: "SP", repIdx: 18, municipalities: 10, mix: "Rações, Medicamentos, Sal mineral", volume: 350000, clients: 210 },
    { name: "Agro Sul PR", city: "Cascavel", state: "PR", repIdx: 6, municipalities: 14, mix: "Rações, Sementes, Defensivos, Fertilizantes", volume: 460000, clients: 290 },
    { name: "Distribuidora Agro RS Norte", city: "Erechim", state: "RS", repIdx: 5, municipalities: 13, mix: "Rações, Sementes, Medicamentos", volume: 390000, clients: 245 },
    { name: "Agropecuária Pantanal MS", city: "Corumbá", state: "MS", repIdx: 17, municipalities: 6, mix: "Rações, Sal mineral", volume: 220000, clients: 120 },
    { name: "Casa Rural GO Centro", city: "Jataí", state: "GO", repIdx: 4, municipalities: 9, mix: "Rações, Sementes, Medicamentos", volume: 310000, clients: 185 },
    { name: "Agro Minas Sul", city: "Alfenas", state: "MG", repIdx: 9, municipalities: 8, mix: "Rações, Sal mineral, Medicamentos", volume: 260000, clients: 145 },
  ];

  const clientIds: number[] = [];

  for (const f of fazendas) {
    const regionId = regionMap[stateToRegion[f.state] || "SP"];
    const repId = repIds[f.repIdx] || repIds[0];
    const id = await insertGetId(conn,
      `INSERT INTO clients (name, type, city, state, regionId, representativeId, totalPurchases, businessPotential, purchasePotential, status, animalCount, animalTypes, productionType, propertyArea, farmingSystem, consumedProducts, segment, contactName, lat, lng)
       VALUES (?, 'fazenda_ruminantes', ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, 'Pecuária', ?, ?, ?)`,
      [f.name, f.city, f.state, regionId, repId, f.potential * 0.6, f.potential, f.potential * 0.8,
       f.animals, f.animalType, f.prodType, f.area, f.system, f.products,
       `Responsável ${f.name}`, -15 + Math.random() * -10, -50 + Math.random() * -10]
    );
    clientIds.push(id);
  }

  for (const f of fabricas) {
    const regionId = regionMap[stateToRegion[f.state] || "SP"];
    const repId = repIds[f.repIdx] || repIds[0];
    const id = await insertGetId(conn,
      `INSERT INTO clients (name, type, city, state, regionId, representativeId, totalPurchases, businessPotential, purchasePotential, status, productionCapacity, productLines, rationTypes, rawMaterialVolume, segment, contactName, lat, lng)
       VALUES (?, 'fabrica_racao', ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 'Indústria de Rações', ?, ?, ?)`,
      [f.name, f.city, f.state, regionId, repId, f.potential * 0.7, f.potential, f.potential * 0.9,
       f.capacity, f.lines, f.types, f.volume,
       `Gerente Comercial ${f.name}`, -15 + Math.random() * -10, -50 + Math.random() * -10]
    );
    clientIds.push(id);
  }

  for (const r of revendas) {
    const regionId = regionMap[stateToRegion[r.state] || "SP"];
    const repId = repIds[r.repIdx] || repIds[0];
    const id = await insertGetId(conn,
      `INSERT INTO clients (name, type, city, state, regionId, representativeId, totalPurchases, businessPotential, purchasePotential, status, coveredMunicipalities, productMix, monthlySalesVolume, finalClientsCount, segment, contactName, lat, lng)
       VALUES (?, 'revenda_agropecuaria', ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 'Distribuição', ?, ?, ?)`,
      [r.name, r.city, r.state, regionId, repId, r.volume * 0.5, r.volume * 1.5, r.volume,
       r.municipalities, r.mix, r.volume, r.clients,
       `Gerente ${r.name}`, -15 + Math.random() * -10, -50 + Math.random() * -10]
    );
    clientIds.push(id);
  }

  // ============================================================
  // OPORTUNIDADES (60)
  // ============================================================
  const stages = ["prospecting", "qualification", "proposal", "negotiation", "won", "lost"];
  const stageProbabilities: Record<string, number> = {
    prospecting: 20, qualification: 40, proposal: 60, negotiation: 80, won: 100, lost: 0
  };
  const products = [
    "Núcleo Bovino Premium", "Sal Mineral Bovinos", "Ração Lactação 22%", "Suplemento Proteico",
    "Ração Frango Crescimento", "Ração Suínos Terminação", "Premix Vitamínico", "Núcleo Leiteiro",
    "Ração Equinos Performance", "Suplemento Energético", "Sal Mineral Ovinos", "Ração Caprinos"
  ];
  const oppTitles = [
    "Fornecimento de Núcleo Bovino", "Contrato Anual de Sal Mineral", "Ração para Confinamento",
    "Suplementação Proteica - Safra", "Fornecimento de Premix", "Contrato de Ração Lactação",
    "Pacote de Nutrição Integrado", "Fornecimento Ração Frango", "Suplementação Mineral Ovinos",
    "Contrato Ração Suínos", "Nutrição Equinos - Temporada", "Pacote Sal + Suplemento"
  ];

  for (let i = 0; i < 60; i++) {
    const clientId = clientIds[i % clientIds.length];
    const repId = repIds[i % repIds.length];
    const stage = stages[i % stages.length];
    const value = 50000 + Math.floor(Math.random() * 450000);
    const title = `${oppTitles[i % oppTitles.length]} - ${i + 1}`;
    const product = products[i % products.length];
    const daysFromNow = Math.floor(Math.random() * 90) - 30;
    const expectedClose = new Date();
    expectedClose.setDate(expectedClose.getDate() + daysFromNow);
    const regionId = regionMap[Object.keys(regionMap)[i % Object.keys(regionMap).length]];

    await exec(conn,
      `INSERT INTO opportunities (title, clientId, representativeId, regionId, value, stage, probability, expectedCloseDate, product, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, clientId, repId, regionId, value, stage, stageProbabilities[stage], expectedClose, product,
       `Oportunidade ${i + 1} - Negociação em andamento`]
    );
  }

  // ============================================================
  // ATIVIDADES (50)
  // ============================================================
  const activityTypes = ["visit", "call", "email", "proposal", "meeting", "demo"];
  const activityTitles = [
    "Visita técnica na fazenda", "Ligação de follow-up", "Envio de proposta comercial",
    "Reunião de apresentação", "Demonstração de produto", "Visita de pós-venda",
    "Ligação de prospecção", "Reunião de negociação", "Visita para diagnóstico nutricional",
    "Apresentação de nova linha"
  ];

  for (let i = 0; i < 50; i++) {
    const clientId = clientIds[i % clientIds.length];
    const repId = repIds[i % repIds.length];
    const type = activityTypes[i % activityTypes.length];
    const title = activityTitles[i % activityTitles.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() - daysAgo);
    const status = daysAgo > 0 ? "completed" : "pending";

    await exec(conn,
      `INSERT INTO activities (type, title, description, clientId, representativeId, scheduledAt, completedAt, status, outcome, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [type, title, `Atividade ${i + 1} - ${title}`, clientId, repId, scheduledAt,
       status === "completed" ? scheduledAt : null, status,
       status === "completed" ? "Reunião produtiva, cliente demonstrou interesse" : null,
       30 + Math.floor(Math.random() * 90)]
    );
  }

  // ============================================================
  // METAS
  // ============================================================
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const period = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  for (let i = 0; i < repIds.length; i++) {
    const rep = repData[i];
    const target = (rep.sales / 12) * 1.1;
    const current = target * (0.5 + Math.random() * 0.7);
    const status = current / target >= 1 ? "achieved" : current / target >= 0.7 ? "on_track" : "at_risk";
    await exec(conn,
      `INSERT INTO goals (representativeId, regionId, name, period, targetValue, currentValue, type, status)
       VALUES (?, ?, ?, ?, ?, ?, 'sales', ?)`,
      [repIds[i], regionMap[rep.code], `Meta de Vendas - ${rep.name.split(" ")[0]}`, period, target, current, status]
    );
  }

  for (const [code, regionId] of Object.entries(regionMap)) {
    const target = 500000 + Math.random() * 1000000;
    const current = target * (0.5 + Math.random() * 0.7);
    const status = current / target >= 1 ? "achieved" : current / target >= 0.7 ? "on_track" : "at_risk";
    await exec(conn,
      `INSERT INTO goals (regionId, name, period, targetValue, currentValue, type, status)
       VALUES (?, ?, ?, ?, ?, 'sales', ?)`,
      [regionId, `Meta Regional ${code}`, period, target, current, status]
    );
  }

  // ============================================================
  // HISTÓRICO DE VENDAS (12 meses)
  // ============================================================
  for (let m = 1; m <= 12; m++) {
    const monthNum = ((currentMonth - m - 1 + 12) % 12) + 1;
    const yearNum = currentMonth - m <= 0 ? currentYear - 1 : currentYear;
    for (let i = 0; i < Math.min(repIds.length, 8); i++) {
      const value = 80000 + Math.random() * 200000;
      await exec(conn,
        `INSERT INTO sales_history (representativeId, regionId, month, year, value, clientsCount, opportunitiesCount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [repIds[i], regionMap[repData[i].code], monthNum, yearNum, value,
         3 + Math.floor(Math.random() * 5), 2 + Math.floor(Math.random() * 4)]
      );
    }
  }

  // ============================================================
  // AUTOMAÇÕES
  // ============================================================
  const automationData = [
    { name: "Alerta Meta em Risco", trigger: "goal_at_risk", action: "Enviar notificação ao gerente regional", conditions: '{"threshold": 0.7}', active: true },
    { name: "Follow-up Oportunidade Criada", trigger: "opportunity_created", action: "Criar atividade de follow-up em 3 dias", conditions: '{"minValue": 50000}', active: true },
    { name: "Alerta Ciclo Longo", trigger: "long_cycle", action: "Notificar gerente sobre oportunidade parada", conditions: '{"days": 30}', active: true },
    { name: "Reativação Cliente Inativo", trigger: "client_inactive", action: "Agendar visita de reativação", conditions: '{"days": 60}', active: false },
    { name: "Prioridade Alto Valor", trigger: "high_value", action: "Escalar para gerente regional", conditions: '{"minValue": 200000}', active: true },
  ];
  for (const a of automationData) {
    await exec(conn,
      "INSERT INTO automations (name, `trigger`, action, conditions, isActive, executionCount) VALUES (?, ?, ?, ?, ?, ?)",
      [a.name, a.trigger, a.action, a.conditions, a.active, Math.floor(Math.random() * 50)]
    );
  }

  // ============================================================
  // NOTIFICAÇÕES
  // ============================================================
  const notifData = [
    { type: "goal_risk", title: "Meta em Risco - Thiago Mendes", message: "A meta de Thiago Mendes está em 68% do objetivo mensal. Ação necessária." },
    { type: "high_value_opportunity", title: "Oportunidade de Alto Valor", message: "Nova oportunidade de R$ 380.000 identificada para Nutrição Animal Cerrado." },
    { type: "new_client", title: "Novo Cliente Cadastrado", message: "Fazenda Ipê Amarelo foi adicionada à carteira de Marcos Araújo." },
    { type: "activity_due", title: "Atividade Pendente", message: "Visita técnica na Fazenda Santa Fé está agendada para hoje." },
    { type: "system", title: "Relatório Semanal Disponível", message: "O relatório de performance da semana está disponível para visualização." },
  ];
  for (const n of notifData) {
    await exec(conn,
      "INSERT INTO notifications (userId, type, title, message, isRead) VALUES (?, ?, ?, ?, ?)",
      [adminId, n.type, n.title, n.message, false]
    );
  }

  console.log(`[Seed] Complete! 1 admin + 22 reps + 59 clients + 60 opportunities + 50 activities + goals + sales history`);
}

