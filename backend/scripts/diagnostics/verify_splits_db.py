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
    # Check the last manual sale
    sql = "SELECT id, product_name, profit, split_seller, split_local, split_app, split_dev, split_company FROM sales WHERE source = 'manual' ORDER BY id DESC LIMIT 1;"
    row = conn.execute(text(sql)).fetchone()
    
    if row:
        print("--- ÚLTIMA VENTA MANUAL ---")
        print(f"ID: {row.id}")
        print(f"Producto: {row.product_name}")
        print(f"Profit: {row.profit}")
        print(f"Split Vendedor (40%): {row.split_seller}")
        print(f"Split Local (25%): {row.split_local}")
        print(f"Split App (25%): {row.split_app}")
        print(f"Split Dev (5%): {row.split_dev}")
        print(f"Split Empresa (5%): {row.split_company}")
        
    else:
        print("No se encontraron ventas manuales.")

