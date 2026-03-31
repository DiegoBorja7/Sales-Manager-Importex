from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent
while BACKEND_ROOT.name != 'backend' and BACKEND_ROOT.parent != BACKEND_ROOT:
    BACKEND_ROOT = BACKEND_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
import os
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    with conn.begin():
        # Rename/Add columns to match the new split schema
        # Current columns suspected: split_seller, split_local, split_company, split_ads
        
        # 1. Rename split_ads to split_app if it exists
        try:
            conn.execute(text("ALTER TABLE sales RENAME COLUMN split_ads TO split_app;"))
            print("Renombrado split_ads a split_app.")
        except Exception:
            # If it doesn't exist, just add split_app
            conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS split_app NUMERIC(10, 2);"))
            print("Columna split_app añadida.")
            
        # 2. Add split_dev if it doesn't exist
        conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS split_dev NUMERIC(10, 2);"))
        print("Columna split_dev añadida.")

        # 3. Ensure other columns exist (they should, but just in case)
        conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS split_seller NUMERIC(10, 2);"))
        conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS split_local NUMERIC(10, 2);"))
        conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS split_company NUMERIC(10, 2);"))
        
        # 4. Ensure payment/invoice columns exist
        conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR;"))
        conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_invoiced BOOLEAN NOT NULL DEFAULT FALSE;"))

print("Migración de comisiones v2 completada.")

