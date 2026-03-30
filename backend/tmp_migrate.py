from database import engine
from sqlalchemy import text

if __name__ == "__main__":
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE expenses ADD COLUMN target_source VARCHAR DEFAULT 'global' NOT NULL;"))
            conn.commit()
            print("Migration 006 successful!")
        except Exception as e:
            if 'already exists' in str(e):
                print("Column already exists.")
            else:
                print(f"Error: {e}")
