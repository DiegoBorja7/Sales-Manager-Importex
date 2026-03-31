from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent
while BACKEND_ROOT.name != 'backend' and BACKEND_ROOT.parent != BACKEND_ROOT:
    BACKEND_ROOT = BACKEND_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    with conn.begin():
        sql_path = Path(__file__).with_name("migrations_commissions.sql")
        sql = sql_path.read_text(encoding="utf-8")
        conn.execute(text(sql))
print("Migración de comisiones completada.")

