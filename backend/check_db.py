import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("backend/.env")

def check():
    db_url = os.getenv('SUPABASE_DB_URL').replace('+asyncpg', '')
    engine = create_engine(db_url)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [r[0] for r in res]
        print("Found tables:", tables)

if __name__ == "__main__":
    check()
