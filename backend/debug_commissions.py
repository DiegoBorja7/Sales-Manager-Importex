import os
from database import engine
from sqlalchemy import text
from decimal import Decimal

with engine.connect() as conn:
    sql = """
    SELECT id, product_name, quantity, profit, 
           split_seller, split_local, split_app, split_dev, split_company
    FROM sales 
    WHERE product_name LIKE 'Llave %' AND source = 'manual'
    ORDER BY id DESC;
    """
    result = conn.execute(text(sql)).fetchall()
    
    print(f"--- DETALLE DE VENTAS DE LLAVE MULTIFUNCIONAL ---")
    sum_profit = Decimal('0')
    sum_splits = [Decimal('0')] * 5
    
    for row in result:
        print(f"ID: {row.id} | Qty: {row.quantity} | Profit: {row.profit}")
        print(f"  DB Splits: {row.split_seller}, {row.split_local}, {row.split_app}, {row.split_dev}, {row.split_company}")
        sum_profit += Decimal(str(row.profit))
        sum_splits[0] += Decimal(str(row.split_seller))
        sum_splits[1] += Decimal(str(row.split_local))
        sum_splits[2] += Decimal(str(row.split_app))
        sum_splits[3] += Decimal(str(row.split_dev))
        sum_splits[4] += Decimal(str(row.split_company))
        
    print(f"--- TOTALES CALCULADOS DESDE LA DB ---")
    print(f"Sum Utility: {sum_profit}")
    print(f"Sum Splits: {sum(sum_splits)}")
    print(f"Desglose Sum: {sum_splits}")
