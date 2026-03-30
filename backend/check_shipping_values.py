import os
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    sql = "SELECT id, product_name, shipping_cost FROM sales WHERE source = 'csv' AND shipping_cost > 0 LIMIT 10;"
    result = conn.execute(text(sql)).fetchall()
    print("Ventas con costo de envío > 0:")
    for row in result:
        print(row)
    
    sql2 = "SELECT count(*) FROM sales WHERE source = 'csv';"
    count = conn.execute(text(sql2)).scalar()
    print(f"Total ventas CSV: {count}")
    
    sql3 = "SELECT count(*) FROM sales WHERE source = 'csv' AND shipping_cost = 0;"
    count0 = conn.execute(text(sql3)).scalar()
    print(f"Total ventas CSV con envío 0: {count0}")
