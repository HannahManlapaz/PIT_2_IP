import os
import sys
from dotenv import load_dotenv
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
load_dotenv()
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library.settings')
import django
django.setup()
from django.db import connection
with connection.cursor() as c:
    c.execute("SELECT app, name, applied FROM django_migrations WHERE app IN ('auth','user') ORDER BY app, name")
    for row in c.fetchall():
        print(row)
