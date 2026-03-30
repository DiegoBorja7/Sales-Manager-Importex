import os
from database import engine
from sqlalchemy import text

def fix_manual_sales_prices():
    with engine.connect() as conn:
        with conn.begin():
            # Actualiza el costo de proveedor (purchase_price) y recalcula la utilidad (profit) 
            # basándose única y estrictamente en la tabla de productos (Inventario)
            # para TODAS las ventas donde el origen sea 'manual' (Tienda).
            sql = """
            UPDATE sales
            SET purchase_price = products.purchase_price,
                profit = sales.sale_price - (products.purchase_price * sales.quantity)
            FROM products
            WHERE sales.product_id = products.id
              AND sales.source = 'manual';
            """
            result = conn.execute(text(sql))
            print(f"Éxito: Se corrigieron {result.rowcount} ventas manuales históricas basándose en el Catálogo de Inventario.")

if __name__ == "__main__":
    fix_manual_sales_prices()
