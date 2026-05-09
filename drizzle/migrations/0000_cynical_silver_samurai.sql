CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('visit','call','email','proposal','meeting','demo') NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`clientId` int,
	`representativeId` int,
	`opportunityId` int,
	`scheduledAt` timestamp,
	`completedAt` timestamp,
	`status` enum('pending','completed','cancelled') DEFAULT 'pending',
	`outcome` text,
	`location` varchar(300),
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`trigger` enum('opportunity_created','goal_at_risk','long_cycle','client_inactive','high_value') NOT NULL,
	`action` varchar(300) NOT NULL,
	`conditions` text,
	`isActive` boolean DEFAULT true,
	`executionCount` int DEFAULT 0,
	`lastExecutedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientCode` varchar(30),
	`name` varchar(200) NOT NULL,
	`type` enum('fazenda_ruminantes','fabrica_racao','revenda_agropecuaria') NOT NULL,
	`cnpj` varchar(20),
	`email` varchar(320),
	`phone` varchar(20),
	`address` varchar(300),
	`city` varchar(100),
	`state` varchar(2),
	`regionId` int,
	`representativeId` int,
	`totalPurchases` double DEFAULT 0,
	`lastPurchaseDate` timestamp,
	`businessPotential` double DEFAULT 0,
	`purchasePotential` double DEFAULT 0,
	`segment` varchar(100),
	`status` enum('active','inactive','prospect') DEFAULT 'active',
	`notes` text,
	`lat` double,
	`lng` double,
	`contactName` varchar(200),
	`website` varchar(300),
	`animalCount` int,
	`animalTypes` varchar(200),
	`productionType` varchar(100),
	`propertyArea` double,
	`farmingSystem` varchar(100),
	`consumedProducts` varchar(300),
	`productionCapacity` double,
	`productLines` varchar(300),
	`rationTypes` varchar(300),
	`rawMaterialVolume` double,
	`coveredMunicipalities` int,
	`productMix` varchar(300),
	`monthlySalesVolume` double,
	`finalClientsCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_clientCode_unique` UNIQUE(`clientCode`)
);
--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`representativeId` int,
	`reportDate` varchar(10) NOT NULL,
	`visitsCount` int DEFAULT 0,
	`callsCount` int DEFAULT 0,
	`proposalsCount` int DEFAULT 0,
	`ordersCount` int DEFAULT 0,
	`totalOrderValue` double DEFAULT 0,
	`generalNotes` text,
	`status` enum('draft','submitted') DEFAULT 'draft',
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`representativeId` int,
	`regionId` int,
	`name` varchar(200),
	`description` text,
	`period` varchar(20) NOT NULL,
	`targetValue` double NOT NULL,
	`currentValue` double DEFAULT 0,
	`type` enum('sales','clients','opportunities','visits') DEFAULT 'sales',
	`status` enum('on_track','at_risk','achieved','missed','exceeded') DEFAULT 'on_track',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('free','basic','pro') NOT NULL DEFAULT 'free',
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`endDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `licenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loginHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loginHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`channel` enum('whatsapp','sms','email','inapp') NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`enabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('goal_risk','high_value_opportunity','new_client','activity_due','system') NOT NULL,
	`title` varchar(300) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean DEFAULT false,
	`relatedId` int,
	`relatedType` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `open_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50),
	`orderDate` timestamp,
	`clientId` int,
	`clientCode` varchar(30),
	`clientName` varchar(200),
	`productId` int,
	`productCode` varchar(30),
	`productName` varchar(300),
	`representativeId` int,
	`repCode` varchar(30),
	`repName` varchar(200),
	`qtdSacos` double,
	`precoPorSaco` double,
	`faturamentoEstimado` double,
	`volumeEstimado` double,
	`tipoOperacao` varchar(50),
	`mesAno` varchar(20),
	`ano` int,
	`filial` varchar(100),
	`status` enum('pending','confirmed','cancelled') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `open_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`clientId` int,
	`representativeId` int,
	`regionId` int,
	`value` double NOT NULL,
	`stage` enum('prospecting','qualification','proposal','negotiation','won','lost') NOT NULL DEFAULT 'prospecting',
	`probability` int DEFAULT 0,
	`expectedCloseDate` timestamp,
	`product` varchar(200),
	`notes` text,
	`lostReason` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(30),
	`name` varchar(300) NOT NULL,
	`productGroup` varchar(200),
	`productGroupCode` varchar(30),
	`solution` varchar(200),
	`subSolution` varchar(200),
	`line` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_productCode_unique` UNIQUE(`productCode`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int,
	`representativeId` int,
	`product` varchar(200) NOT NULL,
	`value` double NOT NULL,
	`quantity` double DEFAULT 1,
	`unit` varchar(20) DEFAULT 'ton',
	`purchaseDate` timestamp NOT NULL,
	`invoiceNumber` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`totalClients` int DEFAULT 0,
	`totalReps` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `regions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `representatives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repCode` varchar(30),
	`name` varchar(200) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`regionId` int,
	`territory` varchar(200),
	`status` enum('active','inactive') DEFAULT 'active',
	`performanceScore` int DEFAULT 0,
	`totalSales` double DEFAULT 0,
	`totalClients` int DEFAULT 0,
	`totalOpportunities` int DEFAULT 0,
	`avatar` varchar(10),
	`hireDate` timestamp,
	`notes` text,
	`userId` int,
	`initialPassword` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `representatives_id` PRIMARY KEY(`id`),
	CONSTRAINT `representatives_repCode_unique` UNIQUE(`repCode`),
	CONSTRAINT `representatives_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `sales_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`representativeId` int,
	`regionId` int,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`value` double NOT NULL,
	`clientsCount` int DEFAULT 0,
	`opportunitiesCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(50),
	`orderNumber` varchar(50),
	`invoiceDate` timestamp,
	`orderDate` timestamp,
	`clientId` int,
	`clientCode` varchar(30),
	`clientName` varchar(200),
	`productId` int,
	`productCode` varchar(30),
	`productName` varchar(300),
	`representativeId` int,
	`repCode` varchar(30),
	`repName` varchar(200),
	`qtdSacos` double,
	`precoPorSaco` double,
	`precoPorKg` double,
	`faturamentoRealizado` double,
	`faturamentoSemEncargos` double,
	`volumeVendas` double,
	`volumeConvertido` double,
	`bonificacao` double,
	`descontoPct` double,
	`pmr` int,
	`mbCbPct` double,
	`mbCbTotal` double,
	`mlCbPct` double,
	`mlCbTotal` double,
	`custoBrillTotal` double,
	`despComercial` double,
	`freteCarga` double,
	`icmsTotal` double,
	`pisTotal` double,
	`cofinsTotal` double,
	`comissaoPct` double,
	`comissaoValor` double,
	`tipoOperacao` varchar(50),
	`mesAno` varchar(20),
	`ano` int,
	`filial` varchar(100),
	`codFilial` varchar(20),
	`grv` varchar(200),
	`gnv` varchar(200),
	`cfop` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64),
	`name` text,
	`email` varchar(320),
	`passwordHash` varchar(255),
	`loginMethod` varchar(64) DEFAULT 'email',
	`role` enum('user','admin','superadmin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_regionId_regions_id_fk` FOREIGN KEY (`regionId`) REFERENCES `regions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_regionId_regions_id_fk` FOREIGN KEY (`regionId`) REFERENCES `regions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loginHistory` ADD CONSTRAINT `loginHistory_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `open_orders` ADD CONSTRAINT `open_orders_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `open_orders` ADD CONSTRAINT `open_orders_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `open_orders` ADD CONSTRAINT `open_orders_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_regionId_regions_id_fk` FOREIGN KEY (`regionId`) REFERENCES `regions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `representatives` ADD CONSTRAINT `representatives_regionId_regions_id_fk` FOREIGN KEY (`regionId`) REFERENCES `regions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `representatives` ADD CONSTRAINT `representatives_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_history` ADD CONSTRAINT `sales_history_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_history` ADD CONSTRAINT `sales_history_regionId_regions_id_fk` FOREIGN KEY (`regionId`) REFERENCES `regions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD CONSTRAINT `sales_invoices_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD CONSTRAINT `sales_invoices_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD CONSTRAINT `sales_invoices_representativeId_representatives_id_fk` FOREIGN KEY (`representativeId`) REFERENCES `representatives`(`id`) ON DELETE no action ON UPDATE no action;