import os
from database import engine
from sqlalchemy import text
from decimal import Decimal, ROUND_HALF_UP

with engine.connect() as conn:
    sql = """
    SELECT id, product_name, sale_price, purchase_price, quantity, profit, 
           split_seller, split_local, split_app, split_dev, split_company
    FROM sales 
    WHERE product_name LIKE 'Llave %' AND source = 'manual'
    ORDER BY id DESC;
    """
    result = conn.execute(text(sql)).fetchall()
    
    print(f"--- ANALISIS DE FILAS EN DB ---")
    for row in result:
        print(f"ID: {row.id} | Qty: {row.quantity} | Profit: {row.profit}")
        print(f"  Calculado: 40%={row.profit*Decimal('0.40'):.4f}, 25%={row.profit*Decimal('0.25'):.4f}, 5%={row.profit*Decimal('0.05'):.4f}")
        print(f"  DB Values: {row.split_seller}, {row.split_local}, {row.split_app}, {row.split_dev}, {row.split_company}")
        sum_check = sum([row.split_seller or 0, row.split_local or 0, row.split_app or 0, row.split_dev or 0, row.split_company or 0])
        print(f"  Var: {row.profit - sum_check}")
