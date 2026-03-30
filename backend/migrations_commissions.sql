-- Migración Módulo Tienda: Comisiones y Facturación
-- Aplica los campos extraídos del Excel.

ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR NULL,
    ADD COLUMN IF NOT EXISTS is_invoiced BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS split_seller NUMERIC(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS split_local NUMERIC(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS split_company NUMERIC(10, 2) NULL,
    ADD COLUMN IF NOT EXISTS split_ads NUMERIC(10, 2) NULL;
