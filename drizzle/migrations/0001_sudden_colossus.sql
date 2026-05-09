ALTER TABLE `representatives` ADD `homeState` varchar(5);--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD `uf` varchar(5);--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD `municipio` varchar(200);--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD `regiao` varchar(100);--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD `codGrupoCliente` varchar(30);--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD `grupoCliente` varchar(200);--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD `segmentacao` varchar(100);--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD `categoria` varchar(100);