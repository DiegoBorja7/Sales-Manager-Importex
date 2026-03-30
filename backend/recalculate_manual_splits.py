import os
from database import engine
from sqlalchemy import text, extract
from decimal import Decimal

def recalculate_manual_splits():
    with engine.connect() as conn:
        with conn.begin():
            # 1. Fetch all manual sales for March 2026
            sql = """
            SELECT id, profit 
            FROM sales 
            WHERE source = 'manual' 
              AND EXTRACT(YEAR FROM sale_date) = 2026 
              AND EXTRACT(MONTH FROM sale_date) = 3;
            """
            result = conn.execute(text(sql)).fetchall()
            
            count = 0
            for row in result:
                sid = row[0]
                profit = Decimal(str(row[1]))
                
                # Cálculo de Alta Precisión (Sin redondeo temprano)
                s_seller = profit * Decimal('0.40')
                s_local = profit * Decimal('0.25')
                s_app = profit * Decimal('0.25')
                s_dev = profit * Decimal('0.05')
                s_company = profit * Decimal('0.05')
                
                update_sql = """
                UPDATE sales
                SET split_seller = :s,
                    split_local = :l,
                    split_app = :a,
                    split_dev = :d,
                    split_company = :c
                WHERE id = :id;
                """
                conn.execute(text(update_sql), {
                    "s": s_seller, "l": s_local, "a": s_app, "d": s_dev, "c": s_company, "id": sid
                })
                count += 1
            
            print(f"Éxito: Se recalcularon las comisiones de {count} ventas manuales de Marzo.")

if __name__ == "__main__":
    recalculate_manual_splits()
