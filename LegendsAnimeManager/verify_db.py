import sqlite3
import os

path = os.path.join(
    os.environ["APPDATA"],
    "com.legends.anime.manager",
    "legends_anime.db"
)

db = sqlite3.connect(path)

tables = db.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall()

count = db.execute(
    "SELECT COUNT(*) FROM anime"
).fetchone()[0]

print("Database:", path)
print("Tables:", tables)
print("Anime count:", count)

db.close()
