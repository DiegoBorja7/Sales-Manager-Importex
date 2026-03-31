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
        print("Starting migration to create stock_movements table...")
        
        try:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS stock_movements (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL,
                reason VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """))
            print("[+] Table stock_movements created successfully.")
            
            conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_stock_movements_product_id ON stock_movements (product_id);
            """))
            print("[+] Index on product_id created or verified.")
        except Exception as e:
            print("[-] Error creating table/index:", e)

    print("Migration finished!")

if __name__ == "__main__":
    run_migration()
