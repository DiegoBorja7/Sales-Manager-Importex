import os
from database import engine
from sqlalchemy import text

def fix_csv_historical_prices():
    with engine.connect() as conn:
        with conn.begin():
            # El antiguo purchase_price guardaba el COSTO TOTAL de la fila.
            # 1. El profit real es la Venta - Ese Costo Total (purchase_price anterior)
            # 2. El purchase_price real (unitario) es Ese Costo Total / quantity
            sql = """
            UPDATE sales
            SET profit = sale_price - purchase_price,
                purchase_price = purchase_price / quantity
            WHERE source = 'csv' AND quantity > 0;
            """
            result = conn.execute(text(sql))
            print(f"Éxito: Se re-calcularon los costos unitarios y utilidades de {result.rowcount} ventas del E-commerce.")

if __name__ == "__main__":
    fix_csv_historical_prices()
