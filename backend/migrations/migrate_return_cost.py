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

def migrate_return_cost():
    with engine.connect() as conn:
        with conn.begin():
            print("Agregando columna 'return_cost' a la tabla 'sales'...")
            # Numeric(14, 4) matches the new high-precision standard
            sql = """
            ALTER TABLE sales ADD COLUMN IF NOT EXISTS return_cost NUMERIC(14, 4) DEFAULT 0;
            """
            conn.execute(text(sql))
            print("Migración de columna 'return_cost' completada exitosamente.")

if __name__ == "__main__":
    migrate_return_cost()

