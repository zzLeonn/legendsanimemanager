import sqlite3
import os

path = os.path.join(
    os.environ["APPDATA"],
    "com.legends.anime.manager",
    "legends_anime.db"
)

db = sqlite3.connect(path)

rows = db.execute("""
    SELECT id, title, photo, photo_file_id
    FROM anime
    LIMIT 15
""").fetchall()

for row in rows:
    print(row)

db.close()
