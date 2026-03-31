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
from decimal import Decimal

with engine.connect() as conn:
    sql = """
    SELECT id, product_name, profit, 
           split_seller, split_local, split_app, split_dev, split_company
    FROM sales 
    WHERE product_name LIKE 'Llave %' AND source = 'manual'
    ORDER BY id DESC;
    """
    result = conn.execute(text(sql)).fetchall()
    
    print(f"--- ANALISIS DE ALTA PRECISION (4 DECIMALES) ---")
    for row in result:
        print(f"ID: {row.id} | Profit: {row.profit}")
        print(f"  Splits en DB (4 dec): {row.split_seller}, {row.split_local}, {row.split_app}, {row.split_dev}, {row.split_company}")
        sum_check = sum([row.split_seller, row.split_local, row.split_app, row.split_dev, row.split_company])
        print(f"  Sum exact: {sum_check} | Balanced: {sum_check == row.profit}")

