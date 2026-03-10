
import os
import psycopg2
from dotenv import load_dotenv

def migrate():
    load_dotenv()
    conn_str = os.getenv('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()
        
        print('Adding external_id column...')
        try:
            cur.execute('ALTER TABLE sales ADD COLUMN external_id VARCHAR;')
        except Exception as e:
            print(f'Column exists: {e}')
            
        print('Adding unique constraint...')
        try:
            cur.execute('ALTER TABLE sales ADD CONSTRAINT uq_sale_external_id UNIQUE (external_id);')
        except Exception as e:
            print(f'Constraint exists: {e}')
            
        print('Dropping old constraint...')
        try:
            cur.execute('ALTER TABLE sales DROP CONSTRAINT uq_sale_duplicate;')
        except Exception as e:
            print(f'Old constraint already dropped: {e}')
            
        print('Done!')
        cur.close()
        conn.close()
    except Exception as e:
        print(f'Fatal DB Error: {e}')

if __name__ == '__main__':
    migrate()

