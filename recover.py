import sqlite3
import sys

dbs = [r'C:\Users\kkdr_\AppData\Local\Zed\db\0-stable\db.sqlite', r'C:\Users\kkdr_\AppData\Local\Zed\db\0-global\db.sqlite']
found = []

for db in dbs:
    try:
        conn = sqlite3.connect(db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        for table in tables:
            cursor.execute(f"SELECT * FROM {table}")
            for row in cursor.fetchall():
                for col in row:
                    text = ''
                    if isinstance(col, bytes):
                        try:
                            text = col.decode('utf-8', errors='ignore')
                        except:
                            pass
                    elif isinstance(col, str):
                        text = col
                    if len(text) > 20 and ('设计' in text or '问题' in text or '模板' in text):
                        found.append(f"--- FOUND IN {db} -> {table} ---\n{text}\n")
    except Exception as e:
        print(f"Error reading {db}: {e}")

with open('zed_recovery.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(found))
print("Done. Saved to zed_recovery.txt")
