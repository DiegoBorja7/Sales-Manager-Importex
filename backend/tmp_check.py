import sys
import os

# Set up django/sqlalchemy environment
from database import engine
from sqlalchemy import text
import pandas as pd

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, sale_date, product_name, sale_price, purchase_price, source FROM sales WHERE product_name ILIKE '%Multifuncional%'"))
    rows = result.fetchall()
    for r in rows:
        print(r)
