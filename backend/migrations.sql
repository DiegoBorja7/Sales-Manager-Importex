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
