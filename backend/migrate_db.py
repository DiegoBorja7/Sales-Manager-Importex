
from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        try:
            print('Adding external_id column...')
            conn.execute(text('ALTER TABLE sales ADD COLUMN external_id VARCHAR;'))
            
            print('Adding unique constraint on external_id...')
            conn.execute(text('ALTER TABLE sales ADD CONSTRAINT uq_sale_external_id UNIQUE (external_id);'))
            
            print('Dropping the old uq_sale_duplicate constraint...')
            conn.execute(text('ALTER TABLE sales DROP CONSTRAINT uq_sale_duplicate;'))
            
            conn.commit()
            print('Migration completed successfully!')
        except Exception as e:
            print(f'Error during migration (maybe it was already run?): {e}')

if __name__ == '__main__':
    migrate()

