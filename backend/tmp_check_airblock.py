import os
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    sql = """
    SELECT id, sale_date, product_name, quantity, purchase_price, sale_price, profit
    FROM sales
    WHERE product_name ILIKE '%AirBlock Pro%'
      AND source = 'csv';
    """
    result = conn.execute(text(sql)).fetchall()
    
    with open('airblock_data.txt', 'w', encoding='utf-8') as f:
        f.write("Resultados de AirBlock Pro en CSV:\\n")
        for row in result:
            f.write(str(row) + "\\n")
