from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Create products table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR UNIQUE NOT NULL,
            sku VARCHAR UNIQUE,
            purchase_price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
            sale_price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
            stock INTEGER DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """))
        conn.commit()
        
        # Add product_id to sales
        try:
            conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id);"))
            conn.commit()
        except Exception as e:
            print("Failed to add product_id (maybe it exists without IF NOT EXISTS support):", e)
            conn.rollback()

        # Indexes
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_products_name ON products (name);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_products_sku ON products (sku);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sales_product_id ON sales (product_id);"))
            conn.commit()
        except:
            conn.rollback()
        
        # Populate products
        print("Migrating unique product names...")
        conn.execute(text("""
        INSERT INTO products (name, purchase_price, sale_price, stock)
        SELECT DISTINCT(trim(product_name)), 0, 0, 0 
        FROM sales 
        WHERE trim(product_name) != '' AND product_name IS NOT NULL
        ON CONFLICT (name) DO NOTHING;
        """))
        conn.commit()
        
        # Update sales with product_ids
        print("Linking existing sales to products...")
        conn.execute(text("""
        UPDATE sales
        SET product_id = products.id
        FROM products
        WHERE trim(sales.product_name) = products.name
        AND sales.product_id IS NULL;
        """))
        conn.commit()
        
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
