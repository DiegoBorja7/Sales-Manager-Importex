from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent
while BACKEND_ROOT.name != 'backend' and BACKEND_ROOT.parent != BACKEND_ROOT:
    BACKEND_ROOT = BACKEND_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
import os
from database import SessionLocal
import models
from sqlalchemy import func

def check_sales_quantity():
    db = SessionLocal()
    try:
        # Check total rows and rows with quantity=0 or null
        total_rows = db.query(models.Sale).count()
        zero_qty_rows = db.query(models.Sale).filter(models.Sale.quantity == 0).count()
        null_qty_rows = db.query(models.Sale).filter(models.Sale.quantity == None).count()
        
        print(f"Total Sale rows: {total_rows}")
        print(f"Rows with quantity=0: {zero_qty_rows}")
        print(f"Rows with quantity=None: {null_qty_rows}")
        
        if zero_qty_rows > 0:
            sample = db.query(models.Sale).filter(models.Sale.quantity == 0).limit(5).all()
            print("Sample 0-qty rows:")
            for s in sample:
                print(f"ID: {s.id}, Product: {s.product_name}, Source: {s.source}, ExtID: {s.external_id}")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_sales_quantity()

