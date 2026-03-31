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

def migrate_precision_v4():
    with engine.connect() as conn:
        with conn.begin():
            print("Migrando columnas de split a NUMERIC(14, 4)...")
            sql = """
            ALTER TABLE sales ALTER COLUMN split_seller TYPE NUMERIC(14, 4);
            ALTER TABLE sales ALTER COLUMN split_local TYPE NUMERIC(14, 4);
            ALTER TABLE sales ALTER COLUMN split_app TYPE NUMERIC(14, 4);
            ALTER TABLE sales ALTER COLUMN split_dev TYPE NUMERIC(14, 4);
            ALTER TABLE sales ALTER COLUMN split_company TYPE NUMERIC(14, 4);
            """
            conn.execute(text(sql))
            print("Migración completada exitosamente.")

if __name__ == "__main__":
    migrate_precision_v4()

