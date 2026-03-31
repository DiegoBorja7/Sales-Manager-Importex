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
        sql = "ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0;"
        conn.execute(text(sql))
print("Columna shipping_cost añadida con éxito.")

