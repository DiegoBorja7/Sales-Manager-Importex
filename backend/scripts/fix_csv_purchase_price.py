"""
fix_csv_purchase_price.py
─────────────────────────
One-shot migration: convierte purchase_price de CSV sales de
precio UNITARIO → precio TOTAL (purchase_price * quantity).

Ejecutar UNA SOLA VEZ desde la carpeta /backend con el venv activo:
  python scripts/fix_csv_purchase_price.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM sales WHERE source = 'csv'"
    ))
    total = result.scalar()
    print(f"ℹ  Registros CSV a migrar: {total}")

    updated = conn.execute(text(
        """
        UPDATE sales
        SET purchase_price = purchase_price * quantity
        WHERE source = 'csv'
          AND quantity > 1
        """
    ))
    conn.commit()
    print(f"✅  Migración completada. Filas actualizadas: {updated.rowcount}")
    print("   (Filas con quantity=1 no necesitan cambio — purchase_price ya era el total)")
