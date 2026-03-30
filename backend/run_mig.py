import os
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    with conn.begin():
        sql = open('migrations_commissions.sql', encoding='utf-8').read()
        conn.execute(text(sql))
print("Migración de comisiones completada.")
