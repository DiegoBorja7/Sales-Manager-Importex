import os
from database import engine
from sqlalchemy import text
from decimal import Decimal

with engine.connect() as conn:
    sql = """
    SELECT id, product_name, sale_price, purchase_price, quantity, profit, 
           split_seller, split_local, split_app, split_dev, split_company
    FROM sales 
    WHERE product_name LIKE 'Llave %' AND source = 'manual'
    ORDER BY id DESC;
    """
    result = conn.execute(text(sql)).fetchall()
    
    print(f"--- DETALLE DE VENTAS DE LLAVE MULTIFUNCIONAL ---")
    total_profit = Decimal('0')
    sum_splits = [Decimal('0')] * 5
    
    for row in result:
        print(f"ID: {row.id} | Profit: {row.profit}")
        print(f"  Splits en DB: {row.split_seller}, {row.split_local}, {row.split_app}, {row.split_dev}, {row.split_company}")
        
        # Verify if splits sum to profit for this row
        row_sum = (row.split_seller or 0) + (row.split_local or 0) + (row.split_app or 0) + (row.split_dev or 0) + (row.split_company or 0)
        print(f"  Suma en DB: {row_sum:.4f} | Diferencia: {row.profit - row_sum:.4f}")
        
        total_profit += row.profit
        sum_splits[0] += row.split_seller or 0
        sum_splits[1] += row.split_local or 0
        sum_splits[2] += row.split_app or 0
        sum_splits[3] += row.split_dev or 0
        sum_splits[4] += row.split_company or 0
        
    print(f"--- TOTALES ---")
    print(f"Total Profit Grouped: {total_profit}")
    print(f"Suma Total Splits Grouped: { sum(sum_splits) }")
    print(f"Splits Totales: {sum_splits}")
