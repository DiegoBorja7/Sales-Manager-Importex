from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent
while BACKEND_ROOT.name != 'backend' and BACKEND_ROOT.parent != BACKEND_ROOT:
    BACKEND_ROOT = BACKEND_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from database import engine
from sqlalchemy import text


def migrate_sale_returns():
    with engine.connect() as conn:
        with conn.begin():
            # 1) New table for returns
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS sale_returns (
                    id SERIAL PRIMARY KEY,
                    return_date DATE NOT NULL,
                    external_id VARCHAR NOT NULL UNIQUE,
                    product_name VARCHAR NOT NULL,
                    product_id INTEGER NULL REFERENCES products(id),
                    quantity INTEGER NOT NULL DEFAULT 1,
                    return_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
                    seller VARCHAR NULL,
                    source VARCHAR NOT NULL DEFAULT 'csv',
                    raw_status VARCHAR NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sale_returns_date_product ON sale_returns (return_date, product_name);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sale_returns_external_id ON sale_returns (external_id);"))

            # 2) Backfill historical CSV return_cost from sales (if any)
            conn.execute(text("""
                INSERT INTO sale_returns (
                    return_date, external_id, product_name, product_id, quantity,
                    return_cost, seller, source, raw_status
                )
                SELECT
                    sale_date, external_id, product_name, product_id, quantity,
                    return_cost, seller, 'csv', 'BACKFILL_FROM_SALES'
                FROM sales
                WHERE source = 'csv'
                  AND external_id IS NOT NULL
                  AND TRIM(external_id) <> ''
                  AND COALESCE(return_cost, 0) > 0
                ON CONFLICT (external_id)
                DO UPDATE SET
                    return_date = EXCLUDED.return_date,
                    product_name = EXCLUDED.product_name,
                    product_id = EXCLUDED.product_id,
                    quantity = EXCLUDED.quantity,
                    return_cost = EXCLUDED.return_cost,
                    seller = EXCLUDED.seller,
                    source = EXCLUDED.source,
                    raw_status = EXCLUDED.raw_status,
                    updated_at = NOW();
            """))

            # 3) Clean legacy csv return_cost in sales to keep single source of truth
            conn.execute(text("""
                UPDATE sales
                SET return_cost = 0
                WHERE source = 'csv'
                  AND COALESCE(return_cost, 0) > 0;
            """))

    print("Migración sale_returns completada.")


if __name__ == "__main__":
    migrate_sale_returns()
