import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def run_migration():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: No DATABASE_URL found.")
        return

    engine = create_engine(db_url)
    
    with engine.begin() as conn:
        print("Starting migration on products table...")
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN purchased_by VARCHAR"))
            print("[+] Added purchased_by column.")
        except Exception as e:
            print("[-] purchased_by might already exist:", e)
            
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN purchase_date DATE"))
            print("[+] Added purchase_date column.")
        except Exception as e:
            print("[-] purchase_date might already exist:", e)

    print("Migration finished!")

if __name__ == "__main__":
    run_migration()
