import os
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    with conn.begin():
        sql = "ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0;"
        conn.execute(text(sql))
print("Columna shipping_cost añadida con éxito.")
