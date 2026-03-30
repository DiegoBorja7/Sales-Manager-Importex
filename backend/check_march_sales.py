import os
from database import engine
from sqlalchemy import text, extract
from models import Sale

with engine.connect() as conn:
    sql = """
    SELECT count(*) 
    FROM sales 
    WHERE source = 'csv' 
      AND EXTRACT(YEAR FROM sale_date) = 2026 
      AND EXTRACT(MONTH FROM sale_date) = 3;
    """
    march_count = conn.execute(text(sql)).scalar()
    print(f"Ventas CSV de Marzo 2026: {march_count}")
