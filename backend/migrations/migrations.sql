-- =============================================
-- IMPORTEX - Historial de Migraciones SQL
-- =============================================
-- Este archivo documenta TODOS los cambios 
-- manuales realizados a la base de datos PostgreSQL (Neon).
--
-- Instrucciones:
-- 1. Cada vez que se agrega una columna, índice o tabla nueva,
--    documentarlo aquí con fecha y descripción.
-- 2. Si despliegas en un entorno nuevo o recreas la DB,
--    ejecuta estas migraciones en orden después de create_all().
-- =============================================


-- ───────────────────────────────────────────
-- Migración 001 | 2026-03-10
-- Tabla inicial: sales
-- Creada automáticamente por SQLAlchemy create_all()
-- ───────────────────────────────────────────
-- No requiere SQL manual. La tabla se crea al iniciar la app.


-- ───────────────────────────────────────────
-- Migración 002 | 2026-03-10
-- Agregar columna external_id para control de duplicados (idempotencia)
-- ───────────────────────────────────────────
ALTER TABLE sales ADD COLUMN IF NOT EXISTS external_id VARCHAR UNIQUE;
CREATE INDEX IF NOT EXISTS ix_sales_external_id ON sales (external_id);


-- ───────────────────────────────────────────
-- Migración 003 | 2026-03-17
-- Agregar columna updated_at para rastrear última modificación
-- ───────────────────────────────────────────
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();


-- ───────────────────────────────────────────
-- Migración 004 | 2026-03-27
-- Índice compuesto (sale_date, seller) para reportes y filtros
-- ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_sales_date_seller ON sales (sale_date, seller);


-- ───────────────────────────────────────────
-- Migración 005 | 2026-03-27
-- Crear tabla expenses para registro de gastos operativos
-- ───────────────────────────────────────────
-- Creada por SQLAlchemy create_all() (clase Expense)
-- Índices creados:
-- ix_expenses_date_product en (expense_date, product_name)
-- ix_expenses_category en (category)

-- ───────────────────────────────────────────
-- Migración 006 | 2026-03-27
-- Soporte a segmentación de Origen 
-- ───────────────────────────────────────────
-- Añadir columna target_source a la tabla expenses para prorrateo
-- ALTER TABLE expenses ADD COLUMN IF NOT EXISTS target_source VARCHAR DEFAULT 'global' NOT NULL;


-- ───────────────────────────────────────────
-- Migración 007 | Fase 9 - Módulo de Inventario
-- Agregar tabla products y relacionar con sales
-- ───────────────────────────────────────────
-- CREATE TABLE IF NOT EXISTS products (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR UNIQUE NOT NULL,
--     sku VARCHAR UNIQUE,
--     purchase_price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
--     sale_price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
--     stock INTEGER DEFAULT 0 NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW(),
--     updated_at TIMESTAMP DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS ix_products_name ON products (name);
-- CREATE INDEX IF NOT EXISTS ix_products_sku ON products (sku);
--
-- ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id);
-- CREATE INDEX IF NOT EXISTS ix_sales_product_id ON sales (product_id);
