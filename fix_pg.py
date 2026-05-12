import psycopg2

conn = psycopg2.connect(
    dbname="library_db_qw15",
    user="library_db_qw15_user",
    password="eud1pOu24i3owVsxbo3K9glo1zEWM2ml",
    host="dpg-d7ibqdfavr4c73fifb0g-a.singapore-postgres.render.com",
    port="5432"
)
cur = conn.cursor()

# Drop all tables
cur.execute("""
    DO $$ DECLARE r RECORD;
    BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
    END $$;
""")

# Drop all sequences
cur.execute("""
    DO $$ DECLARE r RECORD;
    BEGIN
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
            EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        END LOOP;
    END $$;
""")

# Drop all custom types
cur.execute("""
    DO $$ DECLARE r RECORD;
    BEGIN
        FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'c') LOOP
            EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
    END $$;
""")

conn.commit()
print("All tables, sequences, and types dropped")
cur.close()
conn.close()