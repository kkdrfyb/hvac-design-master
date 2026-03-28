PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE migrations (
    domain TEXT,
    step INTEGER,
    migration TEXT
);
INSERT INTO migrations VALUES('GlobalKeyValueStore',0,'CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;');
CREATE TABLE kv_store (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
INSERT INTO kv_store VALUES('system_id','1e364a5f-01c9-4ffb-9719-7209537847e2');
COMMIT;
