from __future__ import annotations

import json
import os
import sqlite3
import shutil
import bcrypt
import io
import csv
import re
import zipfile
import xml.etree.ElementTree as ET
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from urllib.parse import quote
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt

from pdf_text_extractor import extract_pdf_pages, split_text_chunks
from folder_scanner import scan_folder, apply_scan_selection, ScanResult

# Load environment variables from server/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

SERVER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SERVER_DIR.parent
DIST_DIR = PROJECT_ROOT / "dist"
GB_DIR = PROJECT_ROOT / "GB"
KNOWLEDGE_CACHE_DIR = SERVER_DIR / ".knowledge-cache"
DB_PATH = SERVER_DIR / "hvac.db"
ACCOUNTS_DB_PATH = SERVER_DIR / "accounts.db"
UPLOAD_ROOT = SERVER_DIR / "uploads"
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET 环境变量未设置！请在 server/.env 中添加 JWT_SECRET=your-secret-key"
    )
JWT_ALGORITHM = "HS256"
MAX_UPLOAD_FILE_SIZE = 100 * 1024 * 1024  # 100MB

DEFAULT_CLAUSES = [
    {
        "id": "m2",
        "code": "GB 50016-2014",
        "clause_number": "9.3.11",
        "content": "通风、空气调节系统的风管在穿越防火分区处、穿越通风、空气调节机房的房间隔墙和楼板处等部位应设置防火阀。",
    },
    {
        "id": "m4",
        "code": "GB 50019-2015",
        "clause_number": "6.3.9",
        "content": "事故通风的排风口，应配置在有害气体散发量可能最大的地点。",
    },
    {
        "id": "m6",
        "code": "GB 50016-2014",
        "clause_number": "9.3.2",
        "content": "厂房内有爆炸危险场所的排风管道，严禁穿过防火墙和有爆炸危险的房间隔墙。",
    },
]

DEFAULT_CLAUSES += [
    {
        "id": "m50019_notice",
        "code": "GB 50019-2015",
        "clause_number": "公告第822号",
        "content": "《工业建筑供暖通风与空气调节设计规范》GB 50019-2015 自2016年2月1日起实施；公告列明的强制性条文包括5.4.12、5.5.2、5.7.4、5.8.17、6.1.13、6.2.2、6.3.2、6.3.10、6.4.7、6.9.2、6.9.3、6.9.9、6.9.12、6.9.13、6.9.15、6.9.19、6.9.30、8.5.6、9.1.2、9.4.4(4)、9.7.12、9.11.3、10.2.12、11.2.11、11.6.7。",
    },
    {
        "id": "m50019_outline",
        "code": "GB 50019-2015",
        "clause_number": "第6章至第11章",
        "content": "本规范的暖通核心内容覆盖通风、除尘与有害气体净化、空气调节、冷源与热源、矿井空气调节以及监测与控制，可作为工业项目暖通系统设计、校核和复核的基础检索入口。",
    },
    {
        "id": "m50736_notice",
        "code": "GB 50736-2012",
        "clause_number": "公告第1270号",
        "content": "《民用建筑供暖通风与空气调节设计规范》GB 50736-2012 自2012年10月1日起实施；公告列明的强制性条文包括3.0.6(1)、5.2.1、5.3.5、5.3.10、5.4.3(1)、5.4.6、5.5.1、5.5.5、5.5.8、5.6.1、5.6.6、5.7.3、5.9.5、5.10.1、6.1.6、6.3.2、6.3.9(2)、6.6.13、6.6.16、7.2.1、7.2.10、7.2.11(1、3)、7.5.2(3)、7.5.6、8.1.2、8.1.8、8.2.2、8.2.5、8.3.4(1)、8.3.5(4)、8.5.20(1)、8.7.7(4)、8.10.3(1、2、3)、8.11.14、9.1.5(1、2、3、4)、9.4.9。",
    },
    {
        "id": "m50736_scope",
        "code": "GB 50736-2012",
        "clause_number": "1.0.2",
        "content": "本规范适用于新建、改建和扩建民用建筑的供暖、通风与空气调节设计，不适用于有特殊用途、特殊净化与防护要求的建筑物以及临时性建筑物设计。",
    },
    {
        "id": "m50736_outline",
        "code": "GB 50736-2012",
        "clause_number": "第5章至第11章",
        "content": "本规范主要技术内容包括供暖、通风、空气调节、冷源与热源、检测与监控、消声与隔振、绝热与防腐，可作为民用建筑暖通设计的基础索引。",
    },
    {
        "id": "m50016_notice",
        "code": "GB 50016-2014（2018年版）",
        "clause_number": "2018年版说明",
        "content": "《建筑设计防火规范》GB 50016-2014（2018年版）仍是大量建筑防火审查与复核的常用依据，但自GB 55037-2022实施后，公告列明的相关强制性条文应按新通用规范执行。",
    },
    {
        "id": "m50016_replace",
        "code": "GB 50016-2014（2018年版）",
        "clause_number": "与GB 55037-2022衔接",
        "content": "官方公告明确，GB 50016-2014（2018年版）中被废止的强制性条文包含多项暖通和防排烟条款，如8.5.3、9.3.2、9.3.11、9.3.16等；项目审查时需注意与GB 55037-2022的衔接。",
    },
    {
        "id": "m55036_notice",
        "code": "GB 55036-2022",
        "clause_number": "公告第116号",
        "content": "《消防设施通用规范》GB 55036-2022 自2023年3月1日起实施，为强制性工程建设规范，全部条文必须严格执行；现行工程建设标准相关规定与本规范不一致时，以本规范为准。",
    },
    {
        "id": "m55036_outline",
        "code": "GB 55036-2022",
        "clause_number": "主要章节",
        "content": "本规范主要章节覆盖消防给水与消火栓系统、自动喷水灭火系统、泡沫灭火系统、水喷雾与细水雾灭火系统、固定消防炮、气体灭火系统、干粉灭火系统、灭火器、防烟排烟系统和火灾自动报警系统。",
    },
    {
        "id": "m55037_notice",
        "code": "GB 55037-2022",
        "clause_number": "公告第189号",
        "content": "《建筑防火通用规范》GB 55037-2022 自2023年6月1日起实施，为强制性工程建设规范，全部条文必须严格执行；现行工程建设标准相关规定与本规范不一致时，以本规范为准。",
    },
    {
        "id": "m55037_outline",
        "code": "GB 55037-2022",
        "clause_number": "主要章节",
        "content": "本规范主要章节覆盖总平面布局、建筑平面布置与防火分隔、建筑结构耐火、建筑构造与装修、安全疏散与避难、消防设施、供暖通风与空调系统、电气设计、施工、使用和维护。",
    },
    {
        "id": "m55037_hvac",
        "code": "GB 55037-2022",
        "clause_number": "第9章",
        "content": "第9章专门规定供暖、通风与空调系统防火要求，按“一般规定、供暖系统、通风与空气调节系统”展开，是暖通专业进行防火复核时的重点章节。",
    },
]

GB_FULLTEXT_SOURCES = [
    {
        "filename_keyword": "50019-2015",
        "code": "GB 50019-2015",
        "title": "工业建筑供暖通风与空气调节设计规范",
    },
    {
        "filename_keyword": "50736-2012",
        "code": "GB 50736-2012",
        "title": "民用建筑供暖通风与空气调节设计规范",
    },
    {
        "filename_keyword": "50016-2014",
        "code": "GB 50016-2014（2018年版）",
        "title": "建筑设计防火规范",
    },
    {
        "filename_keyword": "55036-2022",
        "code": "GB 55036-2022",
        "title": "消防设施通用规范",
    },
    {
        "filename_keyword": "55037-2022",
        "code": "GB 55037-2022",
        "title": "建筑防火通用规范",
    },
]

DEFAULT_COMMON_ERRORS = [
    {
        "id": "err1",
        "title": "防火阀设置遗漏",
        "category": "通风系统",
        "description": "经常遗漏穿越重要机房或变形缝处的防火阀。",
        "solution": "检查所有穿越防火分区、变形缝及重要设备机房的管段，并在系统图中标注。",
    },
    {
        "id": "err2",
        "title": "冷凝水管坡度不足",
        "category": "通用设计流程",
        "description": "吊顶空间有限时，冷凝水管坡度往往小于0.005，导致排水不畅漏水。",
        "solution": "在剖面图中严格复核吊顶高度，确保至少1%的坡度，必要时增加提升泵。",
    },
]

auth_scheme = HTTPBearer(auto_error=False)

app = FastAPI(title="HVAC Design Master API")

# CORS: allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="frontend-assets")


@contextmanager
def _connect_db(path: Path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


@contextmanager
def get_db():
    with _connect_db(DB_PATH) as conn:
        yield conn


@contextmanager
def get_accounts_db():
    with _connect_db(ACCOUNTS_DB_PATH) as conn:
        yield conn


def init_db() -> None:
    with get_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE,
              password TEXT,
              role TEXT DEFAULT 'user',
              must_change_password INTEGER DEFAULT 0
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
              id TEXT PRIMARY KEY,
              user_id INTEGER,
              name TEXT,
              code TEXT,
              data TEXT,
              FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS user_project_permissions (
              user_id INTEGER NOT NULL,
              project_id TEXT NOT NULL,
              can_edit INTEGER DEFAULT 1,
              PRIMARY KEY (user_id, project_id),
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(project_id) REFERENCES projects(id)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS user_subproject_permissions (
              user_id INTEGER NOT NULL,
              project_id TEXT NOT NULL,
              sub_project_id TEXT NOT NULL,
              can_edit INTEGER DEFAULT 1,
              PRIMARY KEY (user_id, project_id, sub_project_id),
              FOREIGN KEY(user_id) REFERENCES users(id),
              FOREIGN KEY(project_id) REFERENCES projects(id)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS files (
              id TEXT PRIMARY KEY,
              user_id INTEGER NOT NULL,
              project_id TEXT NOT NULL,
              sub_project_id TEXT NOT NULL,
              task_id TEXT NOT NULL,
              stage TEXT,
              version TEXT,
              original_name TEXT NOT NULL,
              stored_name TEXT NOT NULL,
              relative_path TEXT NOT NULL,
              mime_type TEXT,
              size INTEGER DEFAULT 0,
              uploaded_at TEXT NOT NULL,
              uploaded_by TEXT NOT NULL,
              source TEXT DEFAULT 'manual',
              FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS clauses (
              id TEXT PRIMARY KEY,
              code TEXT NOT NULL,
              clause_number TEXT NOT NULL,
              content TEXT NOT NULL,
              project_type TEXT,
              stage TEXT,
              updated_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS common_errors (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              category TEXT NOT NULL,
              description TEXT NOT NULL,
              solution TEXT NOT NULL,
              project_type TEXT,
              stage TEXT,
              updated_at TEXT NOT NULL
            )
            """
        )
        _ensure_column(db, "users", "must_change_password", "INTEGER DEFAULT 0")
        _seed_knowledge_data(db)
        _import_gb_fulltext_clauses(db)


def init_accounts_db() -> None:
    with get_accounts_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE,
              password TEXT,
              role TEXT DEFAULT 'user',
              must_change_password INTEGER DEFAULT 0
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS user_project_permissions (
              user_id INTEGER NOT NULL,
              project_id TEXT NOT NULL,
              can_edit INTEGER DEFAULT 1,
              PRIMARY KEY (user_id, project_id)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS user_subproject_permissions (
              user_id INTEGER NOT NULL,
              project_id TEXT NOT NULL,
              sub_project_id TEXT NOT NULL,
              can_edit INTEGER DEFAULT 1,
              PRIMARY KEY (user_id, project_id, sub_project_id)
            )
            """
        )
        _ensure_column(db, "users", "must_change_password", "INTEGER DEFAULT 0")


def _ensure_column(db: sqlite3.Connection, table: str, column: str, column_sql: str) -> None:
    cols = db.execute(f"PRAGMA table_info({table})").fetchall()
    if any(row["name"] == column for row in cols):
        return
    db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_sql}")


def _seed_knowledge_data(db: sqlite3.Connection) -> None:
    now = datetime.now(timezone.utc).isoformat()
    existing_clause_ids = {
        row["id"] for row in db.execute("SELECT id FROM clauses").fetchall()
    }
    for item in DEFAULT_CLAUSES:
        if item["id"] in existing_clause_ids:
            continue
        db.execute(
            """
            INSERT INTO clauses (id, code, clause_number, content, project_type, stage, updated_at)
            VALUES (?, ?, ?, ?, NULL, NULL, ?)
            """,
            (item["id"], item["code"], item["clause_number"], item["content"], now),
        )

    error_count = db.execute("SELECT COUNT(1) AS cnt FROM common_errors").fetchone()["cnt"]
    if error_count == 0:
        for item in DEFAULT_COMMON_ERRORS:
            db.execute(
                """
                INSERT INTO common_errors (id, title, category, description, solution, project_type, stage, updated_at)
                VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)
                """,
                (item["id"], item["title"], item["category"], item["description"], item["solution"], now),
            )


def _import_gb_fulltext_clauses(db: sqlite3.Connection) -> None:
    if not GB_DIR.exists():
        return

    now = datetime.now(timezone.utc).isoformat()
    known_files = list(GB_DIR.glob("*.pdf"))
    if not known_files:
        return

    KNOWLEDGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    for source in GB_FULLTEXT_SOURCES:
        pdf_path = next(
            (path for path in known_files if source["filename_keyword"] in path.name),
            None,
        )
        if not pdf_path:
            continue

        try:
            cache_path = KNOWLEDGE_CACHE_DIR / f"{source['filename_keyword']}.json"
            if cache_path.exists() and cache_path.stat().st_mtime >= pdf_path.stat().st_mtime:
                pages = json.loads(cache_path.read_text(encoding="utf-8"))
                if not isinstance(pages, list) or not any(str(page).strip() for page in pages):
                    pages = extract_pdf_pages(pdf_path)
                    cache_path.write_text(
                        json.dumps(pages, ensure_ascii=False),
                        encoding="utf-8",
                    )
            else:
                pages = extract_pdf_pages(pdf_path)
                cache_path.write_text(
                    json.dumps(pages, ensure_ascii=False),
                    encoding="utf-8",
                )
        except Exception:
            continue

        db.execute(
            "DELETE FROM clauses WHERE id LIKE ?",
            (_build_standard_clause_pattern(source),),
        )

        chunk_index = 0
        for page_number, page_text in enumerate(pages, start=1):
            for sub_index, chunk in enumerate(split_text_chunks(page_text), start=1):
                clause_id = f"gb_fulltext_{source['filename_keyword'].replace('-', '_')}_{page_number:03d}_{sub_index:02d}"
                clause_number = (
                    f"全文 第{page_number}页"
                    if sub_index == 1
                    else f"全文 第{page_number}页-{sub_index}"
                )
                db.execute(
                    """
                    INSERT OR REPLACE INTO clauses (id, code, clause_number, content, project_type, stage, updated_at)
                    VALUES (?, ?, ?, ?, NULL, NULL, ?)
                    """,
                    (
                        clause_id,
                        f"{source['code']} 全文",
                        clause_number,
                        chunk,
                        now,
                    ),
                )
                chunk_index += 1


def _build_standard_id(source: Dict[str, str]) -> str:
    return source["filename_keyword"]


def _get_standard_source(standard_id: str) -> Dict[str, str]:
    source = next(
        (item for item in GB_FULLTEXT_SOURCES if _build_standard_id(item) == standard_id),
        None,
    )
    if not source:
        raise HTTPException(status_code=404, detail="Standard not found")
    return source


def _find_standard_pdf_path(source: Dict[str, str]) -> Path | None:
    if not GB_DIR.exists():
        return None
    return next(
        (path for path in GB_DIR.glob("*.pdf") if source["filename_keyword"] in path.name),
        None,
    )


def _build_standard_clause_pattern(source: Dict[str, str]) -> str:
    return f"gb_fulltext_{source['filename_keyword'].replace('-', '_')}_%"


def _build_excerpt(content: str, query: str, radius: int = 90) -> str:
    text = re.sub(r"\s+", " ", content or "").strip()
    if not text:
        return ""
    if not query:
        return text[: radius * 2] + ("..." if len(text) > radius * 2 else "")

    index = text.lower().find(query.lower())
    if index < 0:
        return text[: radius * 2] + ("..." if len(text) > radius * 2 else "")

    start = max(0, index - radius)
    end = min(len(text), index + len(query) + radius)
    excerpt = text[start:end]
    if start > 0:
        excerpt = "..." + excerpt
    if end < len(text):
        excerpt = excerpt + "..."
    return excerpt


def _table_exists(db: sqlite3.Connection, table_name: str) -> bool:
    row = db.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def migrate_legacy_account_data() -> None:
    with get_db() as project_db:
        if not _table_exists(project_db, "users"):
            return

        legacy_users = project_db.execute(
            """
            SELECT id, username, password, role, COALESCE(must_change_password, 0) AS must_change_password
            FROM users
            ORDER BY id
            """
        ).fetchall()
        if not legacy_users:
            return

        legacy_project_permissions = (
            project_db.execute(
                """
                SELECT user_id, project_id, can_edit
                FROM user_project_permissions
                ORDER BY user_id, project_id
                """
            ).fetchall()
            if _table_exists(project_db, "user_project_permissions")
            else []
        )
        legacy_subproject_permissions = (
            project_db.execute(
                """
                SELECT user_id, project_id, sub_project_id, can_edit
                FROM user_subproject_permissions
                ORDER BY user_id, project_id, sub_project_id
                """
            ).fetchall()
            if _table_exists(project_db, "user_subproject_permissions")
            else []
        )

    with get_accounts_db() as accounts_db:
        existing_users = accounts_db.execute(
            "SELECT id, username FROM users ORDER BY id"
        ).fetchall()
        username_to_id = {row["username"]: int(row["id"]) for row in existing_users}
        used_ids = {int(row["id"]) for row in existing_users}
        legacy_to_account_id: dict[int, int] = {}

        for row in legacy_users:
            legacy_id = int(row["id"])
            username = row["username"]
            if username in username_to_id:
                target_id = username_to_id[username]
            elif legacy_id not in used_ids:
                accounts_db.execute(
                    """
                    INSERT INTO users (id, username, password, role, must_change_password)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        legacy_id,
                        username,
                        row["password"],
                        row["role"],
                        int(row["must_change_password"] or 0),
                    ),
                )
                target_id = legacy_id
            else:
                cur = accounts_db.execute(
                    """
                    INSERT INTO users (username, password, role, must_change_password)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        username,
                        row["password"],
                        row["role"],
                        int(row["must_change_password"] or 0),
                    ),
                )
                target_id = int(cur.lastrowid)

            username_to_id[username] = target_id
            used_ids.add(target_id)
            legacy_to_account_id[legacy_id] = target_id

        for row in legacy_project_permissions:
            target_user_id = legacy_to_account_id.get(int(row["user_id"]))
            if target_user_id is None:
                continue
            accounts_db.execute(
                """
                INSERT OR IGNORE INTO user_project_permissions (user_id, project_id, can_edit)
                VALUES (?, ?, ?)
                """,
                (target_user_id, row["project_id"], int(row["can_edit"] or 0)),
            )

        for row in legacy_subproject_permissions:
            target_user_id = legacy_to_account_id.get(int(row["user_id"]))
            if target_user_id is None:
                continue
            accounts_db.execute(
                """
                INSERT OR IGNORE INTO user_subproject_permissions (user_id, project_id, sub_project_id, can_edit)
                VALUES (?, ?, ?, ?)
                """,
                (
                    target_user_id,
                    row["project_id"],
                    row["sub_project_id"],
                    int(row["can_edit"] or 0),
                ),
            )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, stored: str) -> bool:
    if not stored:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
    except Exception:
        # Compatibility path for legacy plain-text passwords
        return password == stored


def is_bcrypt_hash(value: str) -> bool:
    return isinstance(value, str) and value.startswith("$2")


def ensure_default_test_users() -> None:
    default_users = (
        ("admin", "admin"),
        ("user1", "user"),
        ("user2", "user"),
        ("user3", "user"),
    )
    with get_accounts_db() as db:
        for username, role in default_users:
            row = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if row:
                continue
            db.execute(
                "INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, 0)",
                (username, hash_password("123456"), role),
            )


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    init_accounts_db()
    migrate_legacy_account_data()
    ensure_default_test_users()


def create_access_token(payload: Dict[str, Any]) -> str:
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _normalize_project_permission_ids(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    result: list[str] = []
    for item in value:
        project_id = str(item or "").strip()
        if project_id and project_id not in result:
            result.append(project_id)
    return result


def _normalize_subproject_permissions(value: Any) -> list[Dict[str, str]]:
    if not isinstance(value, list):
        return []
    result: list[Dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for item in value:
        if not isinstance(item, dict):
            continue
        project_id = str(item.get("projectId") or "").strip()
        sub_project_id = str(item.get("subProjectId") or "").strip()
        key = (project_id, sub_project_id)
        if project_id and sub_project_id and key not in seen:
            seen.add(key)
            result.append({"projectId": project_id, "subProjectId": sub_project_id})
    return result


def _get_project_subproject_ids(db: sqlite3.Connection, project_id: str) -> list[str] | None:
    row = db.execute(
        "SELECT data FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()
    if not row:
        return None
    try:
        project_data = json.loads(row["data"] or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Invalid project data: {exc}")
    sub_projects = project_data.get("subProjects")
    if not isinstance(sub_projects, list):
        return []
    result: list[str] = []
    for sub_project in sub_projects:
        if not isinstance(sub_project, dict):
            continue
        sub_project_id = str(sub_project.get("id") or "").strip()
        if sub_project_id and sub_project_id not in result:
            result.append(sub_project_id)
    return result


def _get_legacy_editable_project_ids(db: sqlite3.Connection, user_id: int) -> list[str]:
    with get_accounts_db() as accounts_db:
        rows = accounts_db.execute(
            """
            SELECT project_id
            FROM user_project_permissions
            WHERE user_id = ? AND can_edit = 1
            ORDER BY project_id
            """,
            (user_id,),
        ).fetchall()
        return [row["project_id"] for row in rows]


def _expand_project_ids_to_subproject_permissions(
    db: sqlite3.Connection, *, project_ids: list[str]
) -> list[Dict[str, str]]:
    result: list[Dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for project_id in project_ids:
        sub_project_ids = _get_project_subproject_ids(db, project_id)
        if sub_project_ids is None:
            continue
        for sub_project_id in sub_project_ids:
            key = (project_id, sub_project_id)
            if key in seen:
                continue
            seen.add(key)
            result.append({"projectId": project_id, "subProjectId": sub_project_id})
    return result


def _get_direct_editable_subproject_permissions(
    db: sqlite3.Connection, user_id: int
) -> list[Dict[str, str]]:
    with get_accounts_db() as accounts_db:
        rows = accounts_db.execute(
            """
            SELECT project_id, sub_project_id
            FROM user_subproject_permissions
            WHERE user_id = ? AND can_edit = 1
            ORDER BY project_id, sub_project_id
            """,
            (user_id,),
        ).fetchall()
        return [
            {"projectId": row["project_id"], "subProjectId": row["sub_project_id"]}
            for row in rows
        ]


def _get_editable_subproject_permissions(
    db: sqlite3.Connection, user_id: int
) -> list[Dict[str, str]]:
    result: list[Dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for item in _get_direct_editable_subproject_permissions(db, user_id):
        key = (item["projectId"], item["subProjectId"])
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    legacy_permissions = _expand_project_ids_to_subproject_permissions(
        db, project_ids=_get_legacy_editable_project_ids(db, user_id)
    )
    for item in legacy_permissions:
        key = (item["projectId"], item["subProjectId"])
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _get_editable_project_ids(db: sqlite3.Connection, user_id: int) -> list[str]:
    project_ids = set(_get_legacy_editable_project_ids(db, user_id))
    for permission in _get_direct_editable_subproject_permissions(db, user_id):
        project_ids.add(permission["projectId"])
    return sorted(project_ids)


def _set_editable_subproject_permissions(
    db: sqlite3.Connection, *, user_id: int, permissions: list[Dict[str, str]]
) -> None:
    db.execute("DELETE FROM user_project_permissions WHERE user_id = ?", (user_id,))
    db.execute("DELETE FROM user_subproject_permissions WHERE user_id = ?", (user_id,))
    for permission in permissions:
        db.execute(
            """
            INSERT INTO user_subproject_permissions (user_id, project_id, sub_project_id, can_edit)
            VALUES (?, ?, ?, 1)
            """,
            (user_id, permission["projectId"], permission["subProjectId"]),
        )


def _serialize_user(
    db: sqlite3.Connection, row: sqlite3.Row | Dict[str, Any]
) -> Dict[str, Any]:
    user_id = int(row["id"])
    return {
        "id": user_id,
        "username": row["username"],
        "role": row["role"],
        "mustChangePassword": bool(row["must_change_password"]),
        "editableProjectIds": []
        if row["role"] == "admin"
        else _get_editable_project_ids(db, user_id),
        "editableSubprojectPermissions": []
        if row["role"] == "admin"
        else _get_editable_subproject_permissions(db, user_id),
    }


def _can_edit_project(
    db: sqlite3.Connection, *, user: Dict[str, Any], project_id: str
) -> bool:
    if user.get("role") == "admin":
        return True
    with get_accounts_db() as accounts_db:
        legacy_row = accounts_db.execute(
            """
            SELECT 1
            FROM user_project_permissions
            WHERE user_id = ? AND project_id = ? AND can_edit = 1
            """,
            (user["id"], project_id),
        ).fetchone()
        if legacy_row is not None:
            return True
        row = accounts_db.execute(
            """
            SELECT 1
            FROM user_subproject_permissions
            WHERE user_id = ? AND project_id = ? AND can_edit = 1
            LIMIT 1
            """,
            (user["id"], project_id),
        ).fetchone()
        return row is not None


def _can_edit_subproject(
    db: sqlite3.Connection,
    *,
    user: Dict[str, Any],
    project_id: str,
    sub_project_id: str,
) -> bool:
    if user.get("role") == "admin":
        return True
    with get_accounts_db() as accounts_db:
        legacy_row = accounts_db.execute(
            """
            SELECT 1
            FROM user_project_permissions
            WHERE user_id = ? AND project_id = ? AND can_edit = 1
            """,
            (user["id"], project_id),
        ).fetchone()
        if legacy_row is not None:
            return True
        row = accounts_db.execute(
            """
            SELECT 1
            FROM user_subproject_permissions
            WHERE user_id = ? AND project_id = ? AND sub_project_id = ? AND can_edit = 1
            """,
            (user["id"], project_id, sub_project_id),
        ).fetchone()
        return row is not None


def _require_project_edit_access(
    db: sqlite3.Connection, *, user: Dict[str, Any], project_id: str
) -> None:
    if not _can_edit_project(db, user=user, project_id=project_id):
        raise HTTPException(status_code=403, detail="You do not have edit access to this project")


def _require_subproject_edit_access(
    db: sqlite3.Connection,
    *,
    user: Dict[str, Any],
    project_id: str,
    sub_project_id: str,
) -> None:
    if not _can_edit_subproject(
        db,
        user=user,
        project_id=project_id,
        sub_project_id=sub_project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have edit access to this subproject",
        )


def _validate_permission_project_ids(
    db: sqlite3.Connection, *, project_ids: list[str]
) -> list[str]:
    if not project_ids:
        return []
    rows = db.execute(
        f"SELECT id FROM projects WHERE id IN ({','.join('?' for _ in project_ids)})",
        project_ids,
    ).fetchall()
    existing_ids = {row["id"] for row in rows}
    missing_ids = [project_id for project_id in project_ids if project_id not in existing_ids]
    if missing_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown project ids: {', '.join(missing_ids)}",
        )
    return [project_id for project_id in project_ids if project_id in existing_ids]


def _validate_subproject_permissions(
    db: sqlite3.Connection, *, permissions: list[Dict[str, str]]
) -> list[Dict[str, str]]:
    if not permissions:
        return []
    project_cache: dict[str, list[str] | None] = {}
    missing_project_ids: list[str] = []
    missing_subprojects: list[str] = []
    validated: list[Dict[str, str]] = []
    for permission in permissions:
        project_id = permission["projectId"]
        sub_project_id = permission["subProjectId"]
        if project_id not in project_cache:
            project_cache[project_id] = _get_project_subproject_ids(db, project_id)
        sub_project_ids = project_cache[project_id]
        if sub_project_ids is None:
            if project_id not in missing_project_ids:
                missing_project_ids.append(project_id)
            continue
        if sub_project_id not in sub_project_ids:
            missing_subprojects.append(f"{project_id}/{sub_project_id}")
            continue
        validated.append(permission)
    if missing_project_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown project ids: {', '.join(missing_project_ids)}",
        )
    if missing_subprojects:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown subproject permissions: {', '.join(missing_subprojects)}",
        )
    return validated


IMPORT_FIELD_LABELS = {
    "username": "\u7528\u6237\u540d",
    "password": "\u5bc6\u7801",
    "role": "\u8d26\u6237\u7c7b\u578b",
    "projects": "\u6709\u6743\u9650\u7684\u9879\u76ee",
    "subprojects": "\u6709\u6743\u9650\u7684\u5b50\u9879",
}

IMPORT_HEADER_ALIASES = {
    "username": {IMPORT_FIELD_LABELS["username"], "username"},
    "password": {IMPORT_FIELD_LABELS["password"], "password"},
    "role": {
        IMPORT_FIELD_LABELS["role"],
        "role",
        "accounttype",
    },
    "projects": {
        IMPORT_FIELD_LABELS["projects"],
        "projects",
        "editableprojects",
    },
    "subprojects": {
        IMPORT_FIELD_LABELS["subprojects"],
        "subprojects",
        "editablesubprojects",
    },
}


def _normalize_import_header(value: Any) -> str:
    return "".join(str(value or "").strip().split()).lower()


def _normalize_match_token(value: Any) -> str:
    return str(value or "").strip().lower()


def _split_import_values(value: Any) -> list[str]:
    text = str(value or "").strip()
    if not text:
        return []
    return [item.strip() for item in re.split(r"[,\n\r;；，、]+", text) if item.strip()]


def _xlsx_column_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha()).upper()
    index = 0
    for ch in letters:
        index = index * 26 + (ord(ch) - ord("A") + 1)
    return max(index - 1, 0)


def _read_xlsx_rows(content: bytes) -> list[list[str]]:
    ns_main = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    ns_rel = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("main:si", ns_main):
                text = "".join(node.text or "" for node in item.findall(".//main:t", ns_main))
                shared_strings.append(text)

        workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
        sheet = workbook_root.find("main:sheets/main:sheet", ns_main)
        if sheet is None:
            return []

        workbook_rels_root = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relationship_id = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        target = None
        for relationship in workbook_rels_root.findall("rel:Relationship", ns_rel):
            if relationship.attrib.get("Id") == relationship_id:
                target = relationship.attrib.get("Target")
                break
        if not target:
            return []
        sheet_path = target if target.startswith("xl/") else f"xl/{target.lstrip('/')}"
        sheet_root = ET.fromstring(archive.read(sheet_path))

        rows: list[list[str]] = []
        for row in sheet_root.findall("main:sheetData/main:row", ns_main):
            values: dict[int, str] = {}
            max_index = -1
            for cell in row.findall("main:c", ns_main):
                cell_ref = cell.attrib.get("r", "")
                column_index = _xlsx_column_index(cell_ref)
                max_index = max(max_index, column_index)
                cell_type = cell.attrib.get("t")
                value = ""
                if cell_type == "inlineStr":
                    inline_node = cell.find("main:is", ns_main)
                    if inline_node is not None:
                        value = "".join(
                            node.text or "" for node in inline_node.findall(".//main:t", ns_main)
                        )
                else:
                    value_node = cell.find("main:v", ns_main)
                    raw_value = value_node.text if value_node is not None else ""
                    if cell_type == "s" and raw_value:
                        try:
                            value = shared_strings[int(raw_value)]
                        except (ValueError, IndexError):
                            value = raw_value
                    else:
                        value = raw_value or ""
                values[column_index] = value.strip()
            if max_index < 0:
                rows.append([])
            else:
                rows.append([values.get(index, "").strip() for index in range(max_index + 1)])
        return rows


def _read_import_rows(filename: str, content: bytes) -> list[Dict[str, str]]:
    suffix = Path(filename or "").suffix.lower()
    if suffix == ".xlsx":
        raw_rows = _read_xlsx_rows(content)
    elif suffix in {".csv", ".txt"}:
        decoded = content.decode("utf-8-sig")
        raw_rows = list(csv.reader(io.StringIO(decoded)))
    else:
        raise HTTPException(status_code=400, detail="Only .xlsx and .csv files are supported")

    if not raw_rows:
        return []

    alias_lookup = {
        _normalize_import_header(alias): field
        for field, aliases in IMPORT_HEADER_ALIASES.items()
        for alias in aliases
    }
    header_map: dict[str, int] = {}
    for index, header in enumerate(raw_rows[0]):
        field = alias_lookup.get(_normalize_import_header(header))
        if field and field not in header_map:
            header_map[field] = index

    required_fields = ["username", "password", "role", "projects", "subprojects"]
    missing_headers = [
        IMPORT_FIELD_LABELS[field] for field in required_fields if field not in header_map
    ]
    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"Missing headers: {', '.join(missing_headers)}",
        )

    rows: list[Dict[str, str]] = []
    for raw_row in raw_rows[1:]:
        row = {
            field: (
                str(raw_row[header_map[field]])
                if header_map[field] < len(raw_row)
                else ""
            ).strip()
            for field in required_fields
        }
        if not any(row.values()):
            continue
        rows.append(row)
    return rows


PROJECT_IMPORT_FIELD_LABELS = {
    "main_name": "项目名称",
    "main_code": "项目编号",
    "sub_name": "子项名称",
    "sub_code": "子项编号",
    "project_type": "项目类型",
    "stage": "设计阶段",
    "enabled_categories": "启用分类",
}

PROJECT_IMPORT_HEADER_ALIASES = {
    "main_name": {PROJECT_IMPORT_FIELD_LABELS["main_name"], "mainname", "projectname"},
    "main_code": {PROJECT_IMPORT_FIELD_LABELS["main_code"], "maincode", "projectcode"},
    "sub_name": {PROJECT_IMPORT_FIELD_LABELS["sub_name"], "subname", "subprojectname"},
    "sub_code": {PROJECT_IMPORT_FIELD_LABELS["sub_code"], "subcode", "subprojectcode"},
    "project_type": {PROJECT_IMPORT_FIELD_LABELS["project_type"], "projecttype", "type"},
    "stage": {PROJECT_IMPORT_FIELD_LABELS["stage"], "designstage", "stage"},
    "enabled_categories": {
        PROJECT_IMPORT_FIELD_LABELS["enabled_categories"],
        "enabledcategories",
        "categories",
    },
}


def _read_project_import_rows(filename: str, content: bytes) -> list[Dict[str, str]]:
    suffix = Path(filename or "").suffix.lower()
    if suffix == ".xlsx":
        raw_rows = _read_xlsx_rows(content)
    elif suffix in {".csv", ".txt"}:
        decoded = content.decode("utf-8-sig")
        raw_rows = list(csv.reader(io.StringIO(decoded)))
    else:
        raise HTTPException(status_code=400, detail="Only .xlsx and .csv files are supported")

    if not raw_rows:
        return []

    alias_lookup = {
        _normalize_import_header(alias): field
        for field, aliases in PROJECT_IMPORT_HEADER_ALIASES.items()
        for alias in aliases
    }
    header_map: dict[str, int] = {}
    for index, header in enumerate(raw_rows[0]):
        field = alias_lookup.get(_normalize_import_header(header))
        if field and field not in header_map:
            header_map[field] = index

    required_fields = ["main_name", "main_code", "sub_name", "sub_code", "project_type", "stage"]
    missing_headers = [
        PROJECT_IMPORT_FIELD_LABELS[field] for field in required_fields if field not in header_map
    ]
    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"Missing headers: {', '.join(missing_headers)}",
        )

    rows: list[Dict[str, str]] = []
    for raw_row in raw_rows[1:]:
        row = {
            field: (
                str(raw_row[header_map[field]])
                if header_map[field] < len(raw_row)
                else ""
            ).strip()
            for field in required_fields + ["enabled_categories"]
            if field in header_map
        }
        if not any(row.values()):
            continue
        rows.append(row)
    return rows


def _parse_import_role(value: str) -> str:
    normalized = _normalize_match_token(value)
    admin_tokens = {"admin", "管理员", "管理", "administrator"}
    user_tokens = {"user", "普通用户", "用户", "普通"}
    if normalized in admin_tokens:
        return "admin"
    if normalized in user_tokens or not normalized:
        return "user"
    raise ValueError(f"Unsupported account type: {value}")


def _build_permission_catalog(db: sqlite3.Connection) -> list[Dict[str, Any]]:
    rows = db.execute("SELECT id, name, code, data FROM projects ORDER BY name, code").fetchall()
    catalog: list[Dict[str, Any]] = []
    for row in rows:
        try:
            project_data = json.loads(row["data"] or "{}")
        except json.JSONDecodeError:
            project_data = {}
        sub_projects = project_data.get("subProjects")
        items: list[Dict[str, str]] = []
        if isinstance(sub_projects, list):
            for sub_project in sub_projects:
                if not isinstance(sub_project, dict):
                    continue
                sub_project_id = str(sub_project.get("id") or "").strip()
                if not sub_project_id:
                    continue
                items.append(
                    {
                        "id": sub_project_id,
                        "name": str(sub_project.get("name") or "").strip(),
                        "code": str(sub_project.get("code") or "").strip(),
                    }
                )
        catalog.append(
            {
                "id": row["id"],
                "name": row["name"] or "",
                "code": row["code"] or "",
                "subProjects": items,
            }
        )
    return catalog


def _match_project_catalog_item(
    catalog: list[Dict[str, Any]], token: str
) -> Dict[str, Any]:
    normalized = _normalize_match_token(token)
    matches = [
        item
        for item in catalog
        if normalized
        in {
            _normalize_match_token(item["id"]),
            _normalize_match_token(item["name"]),
            _normalize_match_token(item["code"]),
        }
    ]
    if not matches:
        raise ValueError(f"Unknown project: {token}")
    if len(matches) > 1:
        raise ValueError(f"Ambiguous project: {token}")
    return matches[0]


def _match_subproject_catalog_item(
    catalog_items: list[Dict[str, str]],
    token: str,
    *,
    project_label: str,
) -> Dict[str, str]:
    normalized = _normalize_match_token(token)
    matches = [
        item
        for item in catalog_items
        if normalized
        in {
            _normalize_match_token(item["id"]),
            _normalize_match_token(item["name"]),
            _normalize_match_token(item["code"]),
        }
    ]
    if not matches:
        raise ValueError(f"Unknown subproject: {token} ({project_label})")
    if len(matches) > 1:
        raise ValueError(f"Ambiguous subproject: {token} ({project_label})")
    return matches[0]


def _resolve_import_permissions(
    db: sqlite3.Connection,
    *,
    project_tokens: list[str],
    subproject_tokens: list[str],
) -> list[Dict[str, str]]:
    catalog = _build_permission_catalog(db)
    if not catalog:
        return []

    selected_projects: list[Dict[str, Any]] = []
    seen_projects: set[str] = set()
    for token in project_tokens:
        project = _match_project_catalog_item(catalog, token)
        if project["id"] not in seen_projects:
            seen_projects.add(project["id"])
            selected_projects.append(project)

    if not subproject_tokens:
        result: list[Dict[str, str]] = []
        for project in selected_projects:
            for sub_project in project["subProjects"]:
                result.append(
                    {
                        "projectId": project["id"],
                        "subProjectId": sub_project["id"],
                    }
                )
        return result

    result: list[Dict[str, str]] = []
    seen_permissions: set[tuple[str, str]] = set()
    for token in subproject_tokens:
        project_scope = selected_projects or catalog
        sub_token = token
        if "/" in token:
            project_token, sub_token = token.split("/", 1)
            project_scope = [_match_project_catalog_item(catalog, project_token.strip())]
        elif ">" in token:
            project_token, sub_token = token.split(">", 1)
            project_scope = [_match_project_catalog_item(catalog, project_token.strip())]

        matches: list[tuple[Dict[str, Any], Dict[str, str]]] = []
        for project in project_scope:
            try:
                matched_sub = _match_subproject_catalog_item(
                    project["subProjects"],
                    sub_token.strip(),
                    project_label=project["name"] or project["id"],
                )
                matches.append((project, matched_sub))
            except ValueError:
                continue

        if not matches:
            raise ValueError(f"Unknown subproject permission: {token}")
        if len(matches) > 1:
            raise ValueError(f"Ambiguous subproject permission: {token}")

        project, sub_project = matches[0]
        key = (project["id"], sub_project["id"])
        if key in seen_permissions:
            continue
        seen_permissions.add(key)
        result.append({"projectId": project["id"], "subProjectId": sub_project["id"]})
    return result


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
) -> Dict[str, Any]:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        with get_accounts_db() as db:
            row = db.execute(
                "SELECT id, username, role, must_change_password FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        return {
            "id": row["id"],
            "username": row["username"],
            "role": row["role"],
            "mustChangePassword": bool(row["must_change_password"]),
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def require_admin(user: Dict[str, Any]) -> None:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


@app.post("/api/auth/register", status_code=201)
async def register(
    request: Request, user: Dict[str, Any] = Depends(get_current_user)
):
    require_admin(user)
    data = await request.json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or "123456"
    role = data.get("role") or "user"
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Invalid role")

    hashed_password = hash_password(password)
    must_change_password = bool(data.get("mustChangePassword", False))
    editable_project_ids = _normalize_project_permission_ids(data.get("editableProjectIds"))
    editable_subproject_permissions = _normalize_subproject_permissions(
        data.get("editableSubprojectPermissions")
    )

    created_row: Dict[str, Any] | None = None
    with get_db() as db, get_accounts_db() as accounts_db:
        if editable_subproject_permissions:
            editable_subproject_permissions = _validate_subproject_permissions(
                db, permissions=editable_subproject_permissions
            )
        elif editable_project_ids:
            editable_project_ids = _validate_permission_project_ids(
                db, project_ids=editable_project_ids
            )
            editable_subproject_permissions = _expand_project_ids_to_subproject_permissions(
                db, project_ids=editable_project_ids
            )
        try:
            cur = accounts_db.execute(
                "INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, ?)",
                (username, hashed_password, role, 1 if must_change_password else 0),
            )
        except sqlite3.IntegrityError as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Username already exists")
            raise HTTPException(status_code=500, detail=str(e))
        if role != "admin":
            _set_editable_subproject_permissions(
                accounts_db,
                user_id=cur.lastrowid,
                permissions=editable_subproject_permissions,
            )
        row = accounts_db.execute(
            "SELECT id, username, role, must_change_password FROM users WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone()
        created_row = dict(row) if row else None
    if not created_row:
        raise HTTPException(status_code=500, detail="Failed to create user")
    with get_db() as db:
        return _serialize_user(db, created_row)


@app.post("/api/auth/import-users")
async def import_users(
    files: list[UploadFile] = File(...),
    user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin(user)
    if not files:
        raise HTTPException(status_code=400, detail="No file uploaded")

    incoming = files[0]
    content = await incoming.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    rows = _read_import_rows(incoming.filename or "", content)
    if not rows:
        return {
            "createdCount": 0,
            "updatedCount": 0,
            "errorCount": 0,
            "errors": [],
        }

    created_count = 0
    updated_count = 0
    errors: list[str] = []

    with get_db() as db, get_accounts_db() as accounts_db:
        for row_index, row in enumerate(rows, start=2):
            try:
                username = (row.get("username") or "").strip()
                if not username:
                    raise ValueError("Username is required")
                password = (row.get("password") or "").strip() or "123456"
                role = _parse_import_role((row.get("role") or "").strip())
                project_tokens = _split_import_values(row.get("projects"))
                subproject_tokens = _split_import_values(row.get("subprojects"))
                permissions = (
                    []
                    if role == "admin"
                    else _resolve_import_permissions(
                        db,
                        project_tokens=project_tokens,
                        subproject_tokens=subproject_tokens,
                    )
                )

                existing = accounts_db.execute(
                    "SELECT id FROM users WHERE username = ?",
                    (username,),
                ).fetchone()
                if existing:
                    accounts_db.execute(
                        """
                        UPDATE users
                        SET password = ?, role = ?, must_change_password = 0
                        WHERE id = ?
                        """,
                        (hash_password(password), role, existing["id"]),
                    )
                    target_user_id = existing["id"]
                    updated_count += 1
                else:
                    cur = accounts_db.execute(
                        """
                        INSERT INTO users (username, password, role, must_change_password)
                        VALUES (?, ?, ?, 0)
                        """,
                        (username, hash_password(password), role),
                    )
                    target_user_id = cur.lastrowid
                    created_count += 1

                _set_editable_subproject_permissions(
                    accounts_db,
                    user_id=int(target_user_id),
                    permissions=permissions,
                )
            except Exception as exc:
                errors.append(f"Row {row_index}: {exc}")

    return {
        "createdCount": created_count,
        "updatedCount": updated_count,
        "errorCount": len(errors),
        "errors": errors,
    }


@app.post("/api/projects/import")
async def import_projects(
    files: list[UploadFile] = File(...),
    user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin(user)
    if not files:
        raise HTTPException(status_code=400, detail="No file uploaded")

    incoming = files[0]
    content = await incoming.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    rows = _read_project_import_rows(incoming.filename or "", content)
    if not rows:
        return {"rows": []}

    normalized_rows: list[Dict[str, Any]] = []
    for row_index, row in enumerate(rows, start=2):
        main_name = (row.get("main_name") or "").strip()
        sub_name = (row.get("sub_name") or "").strip()
        if not main_name or not sub_name:
            raise HTTPException(
                status_code=400,
                detail=f"Row {row_index}: 项目名称和子项名称不能为空",
            )
        normalized_rows.append(
            {
                "mainName": main_name,
                "mainCode": (row.get("main_code") or "").strip(),
                "subName": sub_name,
                "subCode": (row.get("sub_code") or "").strip(),
                "type": (row.get("project_type") or "").strip(),
                "stage": (row.get("stage") or "").strip(),
                "enabledCategoryIds": _split_import_values(row.get("enabled_categories")),
            }
        )

    return {"rows": normalized_rows}


@app.post("/api/auth/login")
async def login(request: Request):
    data = await request.json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    with get_db() as db, get_accounts_db() as accounts_db:
        row = accounts_db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        stored_password = row["password"] or ""
        if not verify_password(password, stored_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not is_bcrypt_hash(stored_password):
            accounts_db.execute(
                "UPDATE users SET password = ? WHERE id = ?",
                (hash_password(password), row["id"]),
            )
        user_payload = _serialize_user(db, row)

    token = create_access_token(
        {"id": row["id"], "username": row["username"], "role": row["role"]}
    )
    return {"token": token, "user": user_payload}


@app.get("/api/auth/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as db, get_accounts_db() as accounts_db:
        row = accounts_db.execute(
            "SELECT id, username, role, must_change_password FROM users WHERE id = ?",
            (user["id"],),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return {"user": _serialize_user(db, row)}


@app.post("/api/auth/change-password")
async def change_password(
    request: Request, user: Dict[str, Any] = Depends(get_current_user)
):
    data = await request.json()
    old_password = data.get("oldPassword") or ""
    new_password = data.get("newPassword") or ""
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Both oldPassword and newPassword are required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    with get_accounts_db() as db:
        row = db.execute(
            "SELECT id, password FROM users WHERE id = ?",
            (user["id"],),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(old_password, row["password"] or ""):
            raise HTTPException(status_code=400, detail="Old password is incorrect")
        db.execute(
            "UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?",
            (hash_password(new_password), user["id"]),
        )
    return {"success": True}


@app.get("/api/auth/users")
def list_users(user: Dict[str, Any] = Depends(get_current_user)):
    require_admin(user)
    with get_db() as db, get_accounts_db() as accounts_db:
        rows = accounts_db.execute(
            """
            SELECT id, username, role, must_change_password
            FROM users
            ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, username
            """
        ).fetchall()
        return {"users": [_serialize_user(db, row) for row in rows]}


@app.put("/api/auth/users/{target_user_id}")
async def update_user(
    target_user_id: int,
    request: Request,
    user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin(user)
    data = await request.json()
    role = data.get("role") or "user"
    if role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Invalid role")
    editable_project_ids = _normalize_project_permission_ids(data.get("editableProjectIds"))
    editable_subproject_permissions = _normalize_subproject_permissions(
        data.get("editableSubprojectPermissions")
    )

    updated_row: Dict[str, Any] | None = None
    with get_db() as db, get_accounts_db() as accounts_db:
        row = accounts_db.execute(
            "SELECT id, username, role, must_change_password FROM users WHERE id = ?",
            (target_user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if target_user_id == user["id"] and role != "admin":
            raise HTTPException(status_code=400, detail="You cannot remove your own admin role")
        if editable_subproject_permissions:
            editable_subproject_permissions = _validate_subproject_permissions(
                db, permissions=editable_subproject_permissions
            )
        elif editable_project_ids:
            editable_project_ids = _validate_permission_project_ids(
                db, project_ids=editable_project_ids
            )
            editable_subproject_permissions = _expand_project_ids_to_subproject_permissions(
                db, project_ids=editable_project_ids
            )
        accounts_db.execute(
            "UPDATE users SET role = ? WHERE id = ?",
            (role, target_user_id),
        )
        if role == "admin":
            _set_editable_subproject_permissions(
                accounts_db, user_id=target_user_id, permissions=[]
            )
        else:
            _set_editable_subproject_permissions(
                accounts_db,
                user_id=target_user_id,
                permissions=editable_subproject_permissions,
            )
        updated = accounts_db.execute(
            "SELECT id, username, role, must_change_password FROM users WHERE id = ?",
            (target_user_id,),
        ).fetchone()
        updated_row = dict(updated) if updated else None
    if not updated_row:
        raise HTTPException(status_code=404, detail="User not found")
    with get_db() as db:
        return _serialize_user(db, updated_row)


@app.delete("/api/auth/users/{target_user_id}")
def delete_user(
    target_user_id: int,
    user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin(user)
    if target_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    with get_accounts_db() as db:
        row = db.execute(
            "SELECT id, role FROM users WHERE id = ?",
            (target_user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if row["role"] == "admin":
            admin_count = db.execute(
                "SELECT COUNT(1) AS cnt FROM users WHERE role = 'admin'"
            ).fetchone()["cnt"]
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot delete the last admin account")
        db.execute("DELETE FROM user_project_permissions WHERE user_id = ?", (target_user_id,))
        db.execute("DELETE FROM user_subproject_permissions WHERE user_id = ?", (target_user_id,))
        db.execute("DELETE FROM users WHERE id = ?", (target_user_id,))
    return {"success": True}


@app.get("/api/knowledge/standards")
def list_standards(user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as db:
        standards: list[Dict[str, Any]] = []
        for source in GB_FULLTEXT_SOURCES:
            standard_id = _build_standard_id(source)
            row = db.execute(
                """
                SELECT COUNT(1) AS cnt
                FROM clauses
                WHERE id LIKE ?
                """,
                (_build_standard_clause_pattern(source),),
            ).fetchone()
            pdf_path = _find_standard_pdf_path(source)
            standards.append(
                {
                    "id": standard_id,
                    "code": source["code"],
                    "title": source["title"],
                    "chunkCount": int(row["cnt"]) if row else 0,
                    "pdfAvailable": bool(pdf_path and pdf_path.exists()),
                }
            )
    return standards


@app.get("/api/knowledge/standards/search")
def search_standards(
    q: str,
    limit: int = 120,
    user: Dict[str, Any] = Depends(get_current_user),
):
    query = (q or "").strip()
    if not query:
        return []

    limit = max(1, min(limit, 300))
    with get_db() as db:
        rows = db.execute(
            """
            SELECT id, code, clause_number, content
            FROM clauses
            WHERE id LIKE 'gb_fulltext_%'
              AND (code LIKE ? OR clause_number LIKE ? OR content LIKE ?)
            ORDER BY code ASC, id ASC
            LIMIT ?
            """,
            (f"%{query}%", f"%{query}%", f"%{query}%", limit),
        ).fetchall()

    source_by_id = {_build_standard_id(source): source for source in GB_FULLTEXT_SOURCES}
    results: list[Dict[str, Any]] = []
    for row in rows:
        standard_id = None
        for candidate_id in source_by_id:
            prefix = f"gb_fulltext_{candidate_id.replace('-', '_')}_"
            if str(row["id"]).startswith(prefix):
                standard_id = candidate_id
                break
        if not standard_id:
            continue
        source = source_by_id[standard_id]
        results.append(
            {
                "id": row["id"],
                "standardId": standard_id,
                "code": source["code"],
                "title": source["title"],
                "clauseNumber": row["clause_number"],
                "excerpt": _build_excerpt(str(row["content"]), query),
            }
        )
    return results


@app.get("/api/knowledge/standards/{standard_id}")
def get_standard_detail(
    standard_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    source = _get_standard_source(standard_id)
    pdf_path = _find_standard_pdf_path(source)

    with get_db() as db:
        rows = db.execute(
            """
            SELECT id, clause_number, content
            FROM clauses
            WHERE id LIKE ?
            ORDER BY id ASC
            """,
            (_build_standard_clause_pattern(source),),
        ).fetchall()

    return {
        "id": standard_id,
        "code": source["code"],
        "title": source["title"],
        "pdfAvailable": bool(pdf_path and pdf_path.exists()),
        "chunks": [
            {
                "id": row["id"],
                "clauseNumber": row["clause_number"],
                "content": row["content"],
            }
            for row in rows
        ],
    }


@app.get("/api/knowledge/standards/{standard_id}/pdf")
def open_standard_pdf(
    standard_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    source = _get_standard_source(standard_id)
    pdf_path = _find_standard_pdf_path(source)
    if not pdf_path or not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")

    original_name = pdf_path.name
    ascii_fallback = original_name.encode("ascii", errors="ignore").decode("ascii") or "standard.pdf"
    encoded_name = quote(original_name)
    headers = {
        "Content-Disposition": f"inline; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded_name}",
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        headers=headers,
    )


@app.get("/api/knowledge/clauses")
def list_clauses(
    q: str | None = None,
    project_type: str | None = None,
    stage: str | None = None,
    user: Dict[str, Any] = Depends(get_current_user),
):
    sql = "SELECT * FROM clauses WHERE 1=1"
    params: list[Any] = []
    if q:
        sql += " AND (code LIKE ? OR clause_number LIKE ? OR content LIKE ?)"
        like = f"%{q}%"
        params.extend([like, like, like])
    if project_type:
        sql += " AND (project_type IS NULL OR project_type = ?)"
        params.append(project_type)
    if stage:
        sql += " AND (stage IS NULL OR stage = ?)"
        params.append(stage)
    sql += " ORDER BY updated_at DESC"

    with get_db() as db:
        rows = db.execute(sql, params).fetchall()
    return [
        {
            "id": row["id"],
            "code": row["code"],
            "clauseNumber": row["clause_number"],
            "content": row["content"],
            "projectType": row["project_type"],
            "stage": row["stage"],
        }
        for row in rows
    ]


@app.post("/api/knowledge/clauses")
async def create_clause(
    request: Request, user: Dict[str, Any] = Depends(get_current_user)
):
    require_admin(user)
    data = await request.json()
    code = (data.get("code") or "").strip()
    clause_number = (data.get("clauseNumber") or "").strip()
    content = (data.get("content") or "").strip()
    if not code or not clause_number or not content:
        raise HTTPException(status_code=400, detail="code, clauseNumber and content are required")
    clause_id = (data.get("id") or uuid4().hex).strip()
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as db:
        db.execute(
            """
            INSERT INTO clauses (id, code, clause_number, content, project_type, stage, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                clause_id,
                code,
                clause_number,
                content,
                data.get("projectType"),
                data.get("stage"),
                now,
            ),
        )
    return {
        "id": clause_id,
        "code": code,
        "clauseNumber": clause_number,
        "content": content,
        "projectType": data.get("projectType"),
        "stage": data.get("stage"),
    }


@app.put("/api/knowledge/clauses/{clause_id}")
async def update_clause(
    clause_id: str, request: Request, user: Dict[str, Any] = Depends(get_current_user)
):
    require_admin(user)
    data = await request.json()
    code = (data.get("code") or "").strip()
    clause_number = (data.get("clauseNumber") or "").strip()
    content = (data.get("content") or "").strip()
    if not code or not clause_number or not content:
        raise HTTPException(status_code=400, detail="code, clauseNumber and content are required")
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as db:
        updated = db.execute(
            """
            UPDATE clauses
            SET code = ?, clause_number = ?, content = ?, project_type = ?, stage = ?, updated_at = ?
            WHERE id = ?
            """,
            (code, clause_number, content, data.get("projectType"), data.get("stage"), now, clause_id),
        )
    if updated.rowcount == 0:
        raise HTTPException(status_code=404, detail="Clause not found")
    return {"success": True}


@app.delete("/api/knowledge/clauses/{clause_id}")
def delete_clause(clause_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    require_admin(user)
    with get_db() as db:
        deleted = db.execute("DELETE FROM clauses WHERE id = ?", (clause_id,))
    if deleted.rowcount == 0:
        raise HTTPException(status_code=404, detail="Clause not found")
    return {"success": True}


@app.get("/api/knowledge/errors")
def list_common_errors(
    q: str | None = None,
    project_type: str | None = None,
    stage: str | None = None,
    user: Dict[str, Any] = Depends(get_current_user),
):
    sql = "SELECT * FROM common_errors WHERE 1=1"
    params: list[Any] = []
    if q:
        sql += " AND (title LIKE ? OR description LIKE ? OR category LIKE ?)"
        like = f"%{q}%"
        params.extend([like, like, like])
    if project_type:
        sql += " AND (project_type IS NULL OR project_type = ?)"
        params.append(project_type)
    if stage:
        sql += " AND (stage IS NULL OR stage = ?)"
        params.append(stage)
    sql += " ORDER BY updated_at DESC"

    with get_db() as db:
        rows = db.execute(sql, params).fetchall()
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "category": row["category"],
            "description": row["description"],
            "solution": row["solution"],
            "projectType": row["project_type"],
            "stage": row["stage"],
        }
        for row in rows
    ]


@app.post("/api/knowledge/errors")
async def create_common_error(
    request: Request, user: Dict[str, Any] = Depends(get_current_user)
):
    require_admin(user)
    data = await request.json()
    title = (data.get("title") or "").strip()
    category = (data.get("category") or "").strip()
    description = (data.get("description") or "").strip()
    solution = (data.get("solution") or "").strip()
    if not title or not category or not description or not solution:
        raise HTTPException(status_code=400, detail="title, category, description and solution are required")
    error_id = (data.get("id") or uuid4().hex).strip()
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as db:
        db.execute(
            """
            INSERT INTO common_errors (id, title, category, description, solution, project_type, stage, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                error_id,
                title,
                category,
                description,
                solution,
                data.get("projectType"),
                data.get("stage"),
                now,
            ),
        )
    return {
        "id": error_id,
        "title": title,
        "category": category,
        "description": description,
        "solution": solution,
        "projectType": data.get("projectType"),
        "stage": data.get("stage"),
    }


@app.put("/api/knowledge/errors/{error_id}")
async def update_common_error(
    error_id: str, request: Request, user: Dict[str, Any] = Depends(get_current_user)
):
    require_admin(user)
    data = await request.json()
    title = (data.get("title") or "").strip()
    category = (data.get("category") or "").strip()
    description = (data.get("description") or "").strip()
    solution = (data.get("solution") or "").strip()
    if not title or not category or not description or not solution:
        raise HTTPException(status_code=400, detail="title, category, description and solution are required")
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as db:
        updated = db.execute(
            """
            UPDATE common_errors
            SET title = ?, category = ?, description = ?, solution = ?, project_type = ?, stage = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, category, description, solution, data.get("projectType"), data.get("stage"), now, error_id),
        )
    if updated.rowcount == 0:
        raise HTTPException(status_code=404, detail="Common error not found")
    return {"success": True}


@app.delete("/api/knowledge/errors/{error_id}")
def delete_common_error(error_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    require_admin(user)
    with get_db() as db:
        deleted = db.execute("DELETE FROM common_errors WHERE id = ?", (error_id,))
    if deleted.rowcount == 0:
        raise HTTPException(status_code=404, detail="Common error not found")
    return {"success": True}


@app.get("/api/projects")
def list_projects(user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute("SELECT * FROM projects ORDER BY name, code").fetchall()
        editable_project_ids: set[str] = set()
        editable_subproject_keys: set[tuple[str, str]] = set()
        if user.get("role") != "admin":
            editable_project_ids = set(_get_editable_project_ids(db, int(user["id"])))
            editable_subproject_keys = {
                (permission["projectId"], permission["subProjectId"])
                for permission in _get_editable_subproject_permissions(db, int(user["id"]))
            }

    result = []
    for row in rows:
        row_dict = dict(row)
        data_raw = row_dict.pop("data", None) or "{}"
        try:
            extra = json.loads(data_raw)
        except json.JSONDecodeError:
            extra = {}
        sub_projects = extra.get("subProjects")
        decorated_sub_projects: list[Dict[str, Any]] = []
        if isinstance(sub_projects, list):
            for sub_project in sub_projects:
                if not isinstance(sub_project, dict):
                    continue
                sub_project_id = str(sub_project.get("id") or "").strip()
                sub_can_edit = user.get("role") == "admin" or (
                    row_dict["id"],
                    sub_project_id,
                ) in editable_subproject_keys
                decorated_sub_projects.append({**sub_project, "canEdit": sub_can_edit})
        project_can_edit = user.get("role") == "admin" or row_dict["id"] in editable_project_ids or any(
            item.get("canEdit") for item in decorated_sub_projects
        )
        result.append(
            {
                **row_dict,
                **extra,
                "subProjects": decorated_sub_projects if isinstance(sub_projects, list) else sub_projects,
                "canEdit": project_can_edit,
            }
        )
    result.sort(key=lambda item: (0 if item.get("canEdit") else 1, item.get("name") or ""))
    return result


@app.post("/api/projects")
async def upsert_project(
    request: Request, user: Dict[str, Any] = Depends(get_current_user)
):
    payload = await request.json()
    project_id = payload.get("id")
    name = payload.get("name")
    code = payload.get("code")
    if not project_id or not name:
        raise HTTPException(status_code=400, detail="Project id and name are required")

    data_obj = {
        k: v
        for k, v in payload.items()
        if k not in ("id", "name", "code", "user_id", "owner", "data", "canEdit")
    }

    def _strip_permission_flags(value: Any) -> Any:
        if isinstance(value, dict):
            return {
                key: _strip_permission_flags(item_value)
                for key, item_value in value.items()
                if key != "canEdit"
            }
        if isinstance(value, list):
            return [_strip_permission_flags(item) for item in value]
        return value

    data_obj = _strip_permission_flags(data_obj)

    with get_db() as db:
        existing = db.execute(
            "SELECT user_id, data FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        if existing:
            if user.get("role") == "admin":
                merged_data_obj = data_obj
            else:
                existing_data = json.loads(existing["data"] or "{}")
                editable_permissions = _get_editable_subproject_permissions(db, int(user["id"]))
                editable_subproject_ids = {
                    permission["subProjectId"]
                    for permission in editable_permissions
                    if permission["projectId"] == project_id
                }
                if not editable_subproject_ids:
                    raise HTTPException(
                        status_code=403,
                        detail="You do not have edit access to this project",
                    )
                existing_subprojects = existing_data.get("subProjects")
                incoming_subprojects = data_obj.get("subProjects")
                if not isinstance(existing_subprojects, list):
                    existing_subprojects = []
                if not isinstance(incoming_subprojects, list):
                    incoming_subprojects = []
                incoming_map = {
                    str(sub_project.get("id") or "").strip(): sub_project
                    for sub_project in incoming_subprojects
                    if isinstance(sub_project, dict)
                }
                merged_subprojects = []
                for sub_project in existing_subprojects:
                    if not isinstance(sub_project, dict):
                        merged_subprojects.append(sub_project)
                        continue
                    sub_project_id = str(sub_project.get("id") or "").strip()
                    if (
                        sub_project_id
                        and sub_project_id in editable_subproject_ids
                        and sub_project_id in incoming_map
                    ):
                        merged_subprojects.append(incoming_map[sub_project_id])
                    else:
                        merged_subprojects.append(sub_project)
                merged_data_obj = {**existing_data, "subProjects": merged_subprojects}
            data_json = json.dumps(merged_data_obj, ensure_ascii=False)
            db.execute(
                """
                UPDATE projects
                SET name = ?, code = ?, data = ?
                WHERE id = ?
                """,
                (name, code, data_json, project_id),
            )
        else:
            require_admin(user)
            data_json = json.dumps(data_obj, ensure_ascii=False)
            db.execute(
                """
                INSERT INTO projects (id, user_id, name, code, data)
                VALUES (?, ?, ?, ?, ?)
                """,
                (project_id, user["id"], name, code, data_json),
            )
        _sync_project_files(
            db,
            project_id=project_id,
            project_data=merged_data_obj if existing else data_obj,
        )
    return {"id": project_id, "name": name, "code": code}


@app.delete("/api/projects/{project_id}")
def delete_project(
    project_id: str, user: Dict[str, Any] = Depends(get_current_user)
):
    require_admin(user)
    with get_db() as db, get_accounts_db() as accounts_db:
        file_rows = db.execute(
            "SELECT id, relative_path FROM files WHERE project_id = ?",
            (project_id,),
        ).fetchall()
        _delete_file_rows(db, file_rows)
        accounts_db.execute(
            "DELETE FROM user_project_permissions WHERE project_id = ?",
            (project_id,),
        )
        accounts_db.execute(
            "DELETE FROM user_subproject_permissions WHERE project_id = ?",
            (project_id,),
        )
        db.execute(
            "DELETE FROM projects WHERE id = ?",
            (project_id,),
        )
    return {"success": True}


def _load_project_data(row: sqlite3.Row) -> Dict[str, Any]:
    try:
        return json.loads(row["data"] or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Invalid project data: {exc}")


def _safe_basename(filename: str) -> str:
    base = Path(filename or "unnamed").name.strip()
    return base or "unnamed"


def _unlink_relative_file(relative_path: str) -> None:
    file_path = (SERVER_DIR / relative_path).resolve()
    try:
        file_path.relative_to(SERVER_DIR)
    except ValueError:
        return
    if file_path.exists():
        try:
            file_path.unlink()
        except OSError:
            pass


def _delete_file_rows(db: sqlite3.Connection, rows: list[sqlite3.Row]) -> None:
    for row in rows:
        db.execute("DELETE FROM files WHERE id = ?", (row["id"],))
        relative_path = row["relative_path"]
        if isinstance(relative_path, str):
            _unlink_relative_file(relative_path)


def _build_file_meta(
    *,
    file_id: str,
    original_name: str,
    size: int,
    uploaded_at: str,
    uploaded_by: str,
    source: str,
) -> Dict[str, Any]:
    suffix = Path(original_name).suffix.lstrip(".")
    return {
        "id": file_id,
        "name": original_name,
        "type": suffix or "file",
        "size": size,
        "uploadedAt": uploaded_at,
        "uploadedBy": uploaded_by,
        "source": source,
        "downloadPath": f"/files/{file_id}",
    }


def _escape_xml_text(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _generate_docx(text: str, output_path: Path) -> None:
    paragraphs = [
        f"<w:p><w:r><w:t>{_escape_xml_text(line)}</w:t></w:r></w:p>"
        for line in text.splitlines() if line.strip() != ""
    ]
    if not paragraphs:
        paragraphs = ["<w:p><w:r><w:t> </w:t></w:r></w:p>"]

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(paragraphs)
        + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>'
        "</w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/>'
        "</Relationships>"
    )

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", content_types)
        docx.writestr("_rels/.rels", rels)
        docx.writestr("word/document.xml", document_xml)


def _generate_pdf(text: str, output_path: Path) -> None:
    lines = [line.replace("(", "\\(").replace(")", "\\)") for line in text.splitlines() if line.strip()]
    if not lines:
        lines = [" "]
    content_lines = []
    y = 760
    for line in lines:
        content_lines.append(f"72 {y} Td ({line}) Tj")
        y -= 16
    content_stream = "BT /F1 12 Tf " + " ".join(content_lines) + " ET"
    content_bytes = content_stream.encode("utf-8")

    objects = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
    )
    objects.append(
        f"4 0 obj << /Length {len(content_bytes)} >> stream\n".encode("utf-8")
        + content_bytes
        + b"\nendstream endobj\n"
    )
    objects.append(b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")

    offsets = []
    pdf = io.BytesIO()
    pdf.write(b"%PDF-1.4\n")
    for obj in objects:
        offsets.append(pdf.tell())
        pdf.write(obj)
    xref_offset = pdf.tell()
    pdf.write(f"xref\n0 {len(objects)+1}\n".encode("utf-8"))
    pdf.write(b"0000000000 65535 f \n")
    for offset in offsets:
        pdf.write(f"{offset:010d} 00000 n \n".encode("utf-8"))
    pdf.write(
        f"trailer << /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode("utf-8")
    )
    output_path.write_bytes(pdf.getvalue())


def _store_generated_file(
    db: sqlite3.Connection,
    *,
    user: Dict[str, Any],
    project_id: str,
    sub_project_id: str,
    task_id: str,
    stage: str,
    original_name: str,
    content_writer: callable,
    source: str,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    uploaded_at = now.isoformat()
    upload_dir = UPLOAD_ROOT / str(user["id"]) / project_id / sub_project_id / task_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = uuid4().hex
    stored_name = f"{file_id}_{_safe_basename(original_name)}"
    stored_path = upload_dir / stored_name
    content_writer(stored_path)
    size = stored_path.stat().st_size

    relative_path = stored_path.relative_to(SERVER_DIR).as_posix()
    mime_type = "application/octet-stream"
    if original_name.lower().endswith(".docx"):
        mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif original_name.lower().endswith(".pdf"):
        mime_type = "application/pdf"

    db.execute(
        """
        INSERT INTO files (
          id, user_id, project_id, sub_project_id, task_id,
          stage, version, original_name, stored_name, relative_path,
          mime_type, size, uploaded_at, uploaded_by, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            file_id,
            user["id"],
            project_id,
            sub_project_id,
            task_id,
            stage,
            "AUTO",
            original_name,
            stored_name,
            relative_path,
            mime_type,
            size,
            uploaded_at,
            user["username"],
            source,
        ),
    )

    return _build_file_meta(
        file_id=file_id,
        original_name=original_name,
        size=size,
        uploaded_at=uploaded_at,
        uploaded_by=user["username"],
        source=source,
    )


def _collect_referenced_file_ids(project_data: Dict[str, Any]) -> set[str]:
    file_ids: set[str] = set()
    templates = project_data.get("designSpecTemplates")
    if isinstance(templates, list):
        for template in templates:
            if not isinstance(template, dict):
                continue
            docx = template.get("docxFile")
            if isinstance(docx, dict):
                file_id = docx.get("id")
                if isinstance(file_id, str) and file_id:
                    file_ids.add(file_id)
    sub_projects = project_data.get("subProjects")
    if not isinstance(sub_projects, list):
        return file_ids
    for sub_project in sub_projects:
        if not isinstance(sub_project, dict):
            continue
        tasks = sub_project.get("tasks")
        if isinstance(tasks, list):
            for task in tasks:
                versions = task.get("versions") if isinstance(task, dict) else None
                if not isinstance(versions, list):
                    continue
                for version in versions:
                    files = version.get("files") if isinstance(version, dict) else None
                    if not isinstance(files, list):
                        continue
                    for file_entry in files:
                        if not isinstance(file_entry, dict):
                            continue
                        file_id = file_entry.get("id")
                        if isinstance(file_id, str) and file_id:
                            file_ids.add(file_id)
        design_specs = sub_project.get("designSpecs")
        if isinstance(design_specs, list):
            for spec in design_specs:
                if not isinstance(spec, dict):
                    continue
                outputs = spec.get("outputs")
                if isinstance(outputs, dict):
                    for key in ("docx", "pdf"):
                        file_meta = outputs.get(key)
                        if isinstance(file_meta, dict):
                            file_id = file_meta.get("id")
                            if isinstance(file_id, str) and file_id:
                                file_ids.add(file_id)
                    dwg_files = outputs.get("dwgFiles")
                    if isinstance(dwg_files, list):
                        for file_meta in dwg_files:
                            if isinstance(file_meta, dict):
                                file_id = file_meta.get("id")
                                if isinstance(file_id, str) and file_id:
                                    file_ids.add(file_id)
        process_records = sub_project.get("processRecords")
        if isinstance(process_records, list):
            for record in process_records:
                if not isinstance(record, dict):
                    continue
                versions = record.get("versions")
                if not isinstance(versions, list):
                    continue
                for version in versions:
                    files = version.get("files") if isinstance(version, dict) else None
                    if not isinstance(files, list):
                        continue
                    for file_entry in files:
                        if not isinstance(file_entry, dict):
                            continue
                        file_id = file_entry.get("id")
                        if isinstance(file_id, str) and file_id:
                            file_ids.add(file_id)
    return file_ids


def _sync_project_files(
    db: sqlite3.Connection,
    *,
    project_id: str,
    project_data: Dict[str, Any],
) -> None:
    referenced_ids = _collect_referenced_file_ids(project_data)
    existing_files = db.execute(
        "SELECT id, relative_path FROM files WHERE project_id = ?",
        (project_id,),
    ).fetchall()
    to_delete = [row for row in existing_files if row["id"] not in referenced_ids]
    _delete_file_rows(db, to_delete)


@app.post("/api/projects/{project_id}/subprojects/{sub_project_id}/process-record-files")
async def upload_process_record_files(
    project_id: str,
    sub_project_id: str,
    files: list[UploadFile] = File(...),
    record_id: str = Form(..., alias="recordId"),
    stage: str = Form(...),
    kind: str = Form(...),
    subtype: str = Form(""),
    title: str = Form(...),
    user: Dict[str, Any] = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    now = datetime.now(timezone.utc)
    uploaded_at = now.isoformat()
    upload_dir = UPLOAD_ROOT / str(user["id"]) / project_id / sub_project_id / "process-records" / record_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    with get_db() as db:
        project_row = db.execute(
            "SELECT * FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")
        _require_project_edit_access(
            db,
            user=user,
            project_id=project_id,
        )

        project_data = _load_project_data(project_row)
        sub_projects = project_data.get("subProjects")
        if not isinstance(sub_projects, list):
            raise HTTPException(status_code=400, detail="Project has no subProjects")

        sub_project = next((sp for sp in sub_projects if sp.get("id") == sub_project_id), None)
        if not sub_project:
            raise HTTPException(status_code=404, detail="SubProject not found")

        process_records = sub_project.get("processRecords")
        if not isinstance(process_records, list):
            process_records = []
            sub_project["processRecords"] = process_records

        record = next((item for item in process_records if item.get("id") == record_id), None)
        if not record:
            record = {
                "id": record_id,
                "stage": stage,
                "kind": kind,
                "subtype": subtype.strip(),
                "title": title.strip() or "未命名资料",
                "detail": "",
                "createdAt": uploaded_at,
                "createdBy": user["username"],
                "versions": [],
            }
            process_records.insert(0, record)

        versions = record.get("versions")
        if not isinstance(versions, list):
            versions = []
        version_index = len(versions)
        version = chr(ord("A") + version_index) if version_index < 26 else f"V{version_index + 1}"

        file_entries: list[Dict[str, Any]] = []
        for incoming in files:
            original_name = _safe_basename(incoming.filename or "unnamed")
            file_id = uuid4().hex
            stored_name = f"{file_id}_{original_name}"
            stored_path = upload_dir / stored_name
            try:
                with stored_path.open("wb") as out_file:
                    shutil.copyfileobj(incoming.file, out_file)
                size = stored_path.stat().st_size
            except OSError as exc:
                raise HTTPException(status_code=500, detail=f"Write file failed: {exc}")

            if size > MAX_UPLOAD_FILE_SIZE:
                try:
                    stored_path.unlink(missing_ok=True)
                except OSError:
                    pass
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large: {original_name}. Limit is {MAX_UPLOAD_FILE_SIZE // (1024 * 1024)}MB",
                )

            relative_path = stored_path.relative_to(SERVER_DIR).as_posix()
            mime_type = incoming.content_type or "application/octet-stream"
            db.execute(
                """
                INSERT INTO files (
                  id, user_id, project_id, sub_project_id, task_id,
                  stage, version, original_name, stored_name, relative_path,
                  mime_type, size, uploaded_at, uploaded_by, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    file_id,
                    user["id"],
                    project_id,
                    sub_project_id,
                    f"process-record-{record_id}",
                    stage,
                    version,
                    original_name,
                    stored_name,
                    relative_path,
                    mime_type,
                    size,
                    uploaded_at,
                    user["username"],
                    "process-record",
                ),
            )
            file_entries.append(
                _build_file_meta(
                    file_id=file_id,
                    original_name=original_name,
                    size=size,
                    uploaded_at=uploaded_at,
                    uploaded_by=user["username"],
                    source="process-record",
                )
            )

        version_entry = {
            "version": version,
            "date": now.date().isoformat(),
            "files": file_entries,
        }
        record["versions"] = [version_entry, *versions]
        record["stage"] = stage
        record["kind"] = kind
        record["subtype"] = subtype.strip() or record.get("subtype") or ""
        record["title"] = title.strip() or record.get("title") or "未命名资料"

        log_entry = {
            "id": f"log_{uuid4().hex[:10]}",
            "action": "上传阶段资料",
            "actor": user["username"],
            "createdAt": uploaded_at,
            "targetType": "process",
            "targetId": record_id,
            "detail": f"{stage} · {subtype.strip() or title.strip() or record.get('title') or '未命名资料'} · 版本 {version}",
        }
        operation_logs = sub_project.get("operationLogs")
        if not isinstance(operation_logs, list):
            operation_logs = []
        sub_project["operationLogs"] = [log_entry, *operation_logs][:300]

        db.execute(
            """
            UPDATE projects
            SET data = ?
            WHERE id = ?
            """,
            (
                json.dumps(project_data, ensure_ascii=False),
                project_id,
            ),
        )
        _sync_project_files(
            db,
            project_id=project_id,
            project_data=project_data,
        )

    return {"record": record, "logs": [log_entry]}


# ── 文件夹扫描 API ─────────────────────────────────────────────────────

@app.post("/api/scan-folder")
async def api_scan_folder(body: dict, user: Dict[str, Any] = Depends(get_current_user)):
    """
    扫描指定文件夹路径，返回结构树。
    Body: { "rootPath": "D:\\projects\\制氯站" }
    """
    root_path = body.get("rootPath", "").strip()
    if not root_path:
        raise HTTPException(status_code=400, detail="rootPath is required")

    if not os.path.isdir(root_path):
        raise HTTPException(status_code=400, detail=f"目录不存在或无法访问: {root_path}")

    result = scan_folder(root_path)
    return result.to_dict()


@app.post("/api/projects/{project_id}/subprojects/{sub_project_id}/apply-scan")
async def api_apply_scan(
    project_id: str,
    sub_project_id: str,
    body: dict,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    将扫描结果中选中的文件导入项目，生成 process records。
    Body: {
        "stage": "初步设计",
        "rootPath": "D:\\projects\\制氯站",
        "records": [
            {
                "kind": "RECEIVED_INTERFACE",
                "subtype": "建筑条件",
                "version": "A版",
                "files": [
                    {"fullPath": "D:\\...\\条件图.pdf", "name": "条件图.pdf"}
                ]
            }
        ]
    }
    """
    stage = body.get("stage", "")
    root_path = body.get("rootPath", "")
    records_input = body.get("records", [])

    if not stage:
        raise HTTPException(status_code=400, detail="stage is required")
    if not records_input:
        raise HTTPException(status_code=400, detail="records is required")

    now = datetime.now(timezone.utc)
    uploaded_at = now.isoformat()

    with get_db() as db:
        project_row = db.execute(
            "SELECT * FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")
        _require_subproject_edit_access(
            db, user=user, project_id=project_id, sub_project_id=sub_project_id
        )

        project_data = _load_project_data(project_row)
        sub_projects = project_data.get("subProjects")
        if not isinstance(sub_projects, list):
            raise HTTPException(status_code=400, detail="Project has no subProjects")

        sub_project = next(
            (sp for sp in sub_projects if sp.get("id") == sub_project_id), None
        )
        if not sub_project:
            raise HTTPException(status_code=404, detail="SubProject not found")

        process_records = sub_project.get("processRecords")
        if not isinstance(process_records, list):
            process_records = []
            sub_project["processRecords"] = process_records

        process_stages = sub_project.get("processStages")
        if not isinstance(process_stages, list):
            process_stages = []
            sub_project["processStages"] = process_stages

        operation_logs = sub_project.get("operationLogs")
        if not isinstance(operation_logs, list):
            operation_logs = []

        created_records = []
        total_files = 0

        for record_item in records_input:
            kind = record_item.get("kind", "NOTE")
            subtype = record_item.get("subtype", "").strip()
            version_label = record_item.get("version", "A版")
            files_to_import = record_item.get("files", [])

            if not files_to_import:
                continue

            title = subtype or record_item.get("title", "") or "未命名资料"
            record_id = f"process_{uuid4().hex[:12]}"
            upload_dir = (
                UPLOAD_ROOT
                / str(user["id"])
                / project_id
                / sub_project_id
                / "process-records"
                / record_id
            )
            upload_dir.mkdir(parents=True, exist_ok=True)

            # 创建 process record
            record = {
                "id": record_id,
                "stage": stage,
                "kind": kind,
                "subtype": subtype,
                "title": title,
                "detail": f"从文件夹扫描导入: {root_path}",
                "changeSummary": "",
                "createdAt": uploaded_at,
                "createdBy": user["username"],
                "versions": [],
            }

            # 复制文件到 uploads
            file_entries = []
            for file_info in files_to_import:
                src_path = file_info.get("fullPath", "")
                original_name = file_info.get("name", os.path.basename(src_path))

                if not src_path or not os.path.isfile(src_path):
                    continue

                file_id = uuid4().hex
                stored_name = f"{file_id}_{original_name}"
                stored_path = upload_dir / stored_name

                try:
                    shutil.copy2(src_path, stored_path)
                    size = stored_path.stat().st_size
                except OSError as exc:
                    raise HTTPException(
                        status_code=500,
                        detail=f"复制文件失败 {original_name}: {exc}",
                    )

                if size > MAX_UPLOAD_FILE_SIZE:
                    stored_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"文件过大: {original_name}。上限 {MAX_UPLOAD_FILE_SIZE // (1024 * 1024)}MB",
                    )

                relative_path = stored_path.relative_to(SERVER_DIR).as_posix()
                ext = os.path.splitext(original_name)[1].lower()
                mime_type = {
                    ".pdf": "application/pdf",
                    ".dwg": "application/acad",
                    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ".zip": "application/zip",
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                }.get(ext, "application/octet-stream")

                db.execute(
                    """
                    INSERT INTO files (
                      id, user_id, project_id, sub_project_id, task_id,
                      stage, version, original_name, stored_name, relative_path,
                      mime_type, size, uploaded_at, uploaded_by, source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        file_id,
                        user["id"],
                        project_id,
                        sub_project_id,
                        f"process-record-{record_id}",
                        stage,
                        version_label,
                        original_name,
                        stored_name,
                        relative_path,
                        mime_type,
                        size,
                        uploaded_at,
                        user["username"],
                        "scan-import",
                    ),
                )

                file_entries.append(
                    {
                        "id": file_id,
                        "name": original_name,
                        "size": size,
                        "uploadedAt": uploaded_at,
                        "uploadedBy": user["username"],
                        "source": "scan-import",
                    }
                )
                total_files += 1

            if file_entries:
                record["versions"] = [
                    {
                        "version": version_label,
                        "date": now.date().isoformat(),
                        "files": file_entries,
                    }
                ]
                process_records.insert(0, record)
                created_records.append(record)

            # 确保 stage 在 processStages 中
            if stage not in process_stages:
                process_stages.append(stage)

        sub_project["processStages"] = process_stages

        if created_records:
            log_entry = {
                "id": f"log_{uuid4().hex[:10]}",
                "action": "文件夹扫描导入",
                "actor": user["username"],
                "createdAt": uploaded_at,
                "targetType": "process",
                "targetId": "batch",
                "detail": f"从 {root_path} 导入 {len(created_records)} 条记录，共 {total_files} 个文件",
            }
            sub_project["operationLogs"] = [log_entry, *operation_logs][:300]

            db.execute(
                """
                UPDATE projects
                SET data = ?
                WHERE id = ?
                """,
                (
                    json.dumps(project_data, ensure_ascii=False),
                    project_id,
                ),
            )
            _sync_project_files(
                db,
                project_id=project_id,
                project_data=project_data,
            )

    return {
        "imported": len(created_records),
        "totalFiles": total_files,
        "records": created_records,
    }


@app.post("/api/projects/{project_id}/subprojects/{sub_project_id}/tasks/{task_id}/files")
async def upload_task_files(
    project_id: str,
    sub_project_id: str,
    task_id: str,
    files: list[UploadFile] = File(...),
    source: str = Form("manual"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    now = datetime.now(timezone.utc)
    uploaded_at = now.isoformat()
    upload_dir = UPLOAD_ROOT / str(user["id"]) / project_id / sub_project_id / task_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    with get_db() as db:
        project_row = db.execute(
            "SELECT * FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")
        _require_subproject_edit_access(
            db,
            user=user,
            project_id=project_id,
            sub_project_id=sub_project_id,
        )

        project_data = _load_project_data(project_row)
        sub_projects = project_data.get("subProjects")
        if not isinstance(sub_projects, list):
            raise HTTPException(status_code=400, detail="Project has no subProjects")

        sub_project = next((sp for sp in sub_projects if sp.get("id") == sub_project_id), None)
        if not sub_project:
            raise HTTPException(status_code=404, detail="SubProject not found")

        tasks = sub_project.get("tasks")
        if not isinstance(tasks, list):
            raise HTTPException(status_code=400, detail="SubProject has no tasks")

        task = next((t for t in tasks if t.get("id") == task_id), None)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        versions = task.get("versions")
        if not isinstance(versions, list):
            versions = []
        version_index = len(versions)
        version = (
            chr(ord("A") + version_index)
            if version_index < 26
            else f"V{version_index + 1}"
        )

        file_entries: list[Dict[str, Any]] = []
        for incoming in files:
            original_name = _safe_basename(incoming.filename or "unnamed")
            file_id = uuid4().hex
            stored_name = f"{file_id}_{original_name}"
            stored_path = upload_dir / stored_name
            try:
                with stored_path.open("wb") as out_file:
                    shutil.copyfileobj(incoming.file, out_file)
                size = stored_path.stat().st_size
            except OSError as exc:
                raise HTTPException(status_code=500, detail=f"Write file failed: {exc}")

            if size > MAX_UPLOAD_FILE_SIZE:
                try:
                    stored_path.unlink(missing_ok=True)
                except OSError:
                    pass
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large: {original_name}. Limit is {MAX_UPLOAD_FILE_SIZE // (1024 * 1024)}MB",
                )

            relative_path = stored_path.relative_to(SERVER_DIR).as_posix()
            mime_type = incoming.content_type or "application/octet-stream"
            db.execute(
                """
                INSERT INTO files (
                  id, user_id, project_id, sub_project_id, task_id,
                  stage, version, original_name, stored_name, relative_path,
                  mime_type, size, uploaded_at, uploaded_by, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    file_id,
                    user["id"],
                    project_id,
                    sub_project_id,
                    task_id,
                    task.get("stage"),
                    version,
                    original_name,
                    stored_name,
                    relative_path,
                    mime_type,
                    size,
                    uploaded_at,
                    user["username"],
                    source,
                ),
            )
            file_entries.append(
                _build_file_meta(
                    file_id=file_id,
                    original_name=original_name,
                    size=size,
                    uploaded_at=uploaded_at,
                    uploaded_by=user["username"],
                    source=source,
                )
            )

        version_entry = {
            "version": version,
            "date": now.date().isoformat(),
            "files": file_entries,
        }
        task["versions"] = [version_entry, *versions]

        db.execute(
            """
            UPDATE projects
            SET data = ?
            WHERE id = ?
            """,
            (
                json.dumps(project_data, ensure_ascii=False),
                project_id,
            ),
        )
        _sync_project_files(
            db,
            project_id=project_id,
            project_data=project_data,
        )

    return {"taskId": task_id, "version": version_entry, "task": task}


@app.post("/api/projects/{project_id}/design-spec-templates")
async def create_design_spec_template(
    project_id: str,
    files: list[UploadFile] = File(...),
    name: str = Form(...),
    project_type: str = Form(..., alias="projectType"),
    stage: str = Form(...),
    description: str = Form(""),
    mapping_json: str = Form("", alias="mappingJson"),
    user: Dict[str, Any] = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="No template file uploaded")

    incoming = files[0]
    template_id = uuid4().hex
    now = datetime.now(timezone.utc).isoformat()
    upload_dir = UPLOAD_ROOT / str(user["id"]) / project_id / "design-spec-templates"
    upload_dir.mkdir(parents=True, exist_ok=True)

    original_name = _safe_basename(incoming.filename or "design-spec-template.docx")
    stored_name = f"{template_id}_{original_name}"
    stored_path = upload_dir / stored_name
    try:
        with stored_path.open("wb") as out_file:
            shutil.copyfileobj(incoming.file, out_file)
        size = stored_path.stat().st_size
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Write file failed: {exc}")

    if size > MAX_UPLOAD_FILE_SIZE:
        try:
            stored_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {original_name}. Limit is {MAX_UPLOAD_FILE_SIZE // (1024 * 1024)}MB",
        )

    relative_path = stored_path.relative_to(SERVER_DIR).as_posix()
    mime_type = incoming.content_type or "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    with get_db() as db:
        project_row = db.execute(
            "SELECT * FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")
        _require_subproject_edit_access(
            db,
            user=user,
            project_id=project_id,
            sub_project_id=sub_project_id,
        )

        project_data = _load_project_data(project_row)
        templates = project_data.get("designSpecTemplates")
        if not isinstance(templates, list):
            templates = []

        file_id = uuid4().hex
        db.execute(
            """
            INSERT INTO files (
              id, user_id, project_id, sub_project_id, task_id,
              stage, version, original_name, stored_name, relative_path,
              mime_type, size, uploaded_at, uploaded_by, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                file_id,
                user["id"],
                project_id,
                "global",
                f"design-spec-template-{template_id}",
                stage,
                "T",
                original_name,
                stored_name,
                relative_path,
                mime_type,
                size,
                now,
                user["username"],
                "design-spec-template",
            ),
        )

        file_meta = _build_file_meta(
            file_id=file_id,
            original_name=original_name,
            size=size,
            uploaded_at=now,
            uploaded_by=user["username"],
            source="design-spec-template",
        )

        template = {
            "id": template_id,
            "name": name.strip(),
            "projectType": project_type,
            "stage": stage,
            "description": description.strip() if isinstance(description, str) else "",
            "mappingJson": mapping_json.strip() if isinstance(mapping_json, str) else "",
            "docxFile": file_meta,
            "createdBy": user["username"],
            "createdAt": now,
        }

        templates = [template, *templates]
        project_data["designSpecTemplates"] = templates

        db.execute(
            """
            UPDATE projects
            SET data = ?
            WHERE id = ?
            """,
            (json.dumps(project_data, ensure_ascii=False), project_id),
        )
        _sync_project_files(db, project_id=project_id, project_data=project_data)

    return {"template": template}


def _render_design_spec_text(
    *,
    project: Dict[str, Any],
    sub_project: Dict[str, Any],
    template: Dict[str, Any],
    payload: Dict[str, Any],
) -> str:
    lines = [
        f"设计说明模板：{template.get('name', '')}",
        f"项目：{project.get('name', '')} ({project.get('code', '')})",
        f"子项：{sub_project.get('name', '')} ({sub_project.get('code', '')})",
        f"阶段：{payload.get('阶段', sub_project.get('stage', ''))}",
        "",
        "关键数据：",
    ]
    for key, value in payload.items():
        lines.append(f"- {key}: {value}")
    if not payload:
        lines.append("- （无关键数据）")
    return "\n".join(lines)


@app.post("/api/projects/{project_id}/subprojects/{sub_project_id}/design-specs/generate")
async def generate_design_spec(
    project_id: str,
    sub_project_id: str,
    request: Request,
    user: Dict[str, Any] = Depends(get_current_user),
):
    data = await request.json()
    template_id = (data.get("templateId") or "").strip()
    stage = (data.get("stage") or "").strip()
    payload = data.get("payload") or {}
    if not template_id:
        raise HTTPException(status_code=400, detail="templateId is required")
    if not stage:
        raise HTTPException(status_code=400, detail="stage is required")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be an object")

    with get_db() as db:
        project_row = db.execute(
            "SELECT * FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")
        _require_subproject_edit_access(
            db,
            user=user,
            project_id=project_id,
            sub_project_id=sub_project_id,
        )

        project_data = _load_project_data(project_row)
        sub_projects = project_data.get("subProjects")
        if not isinstance(sub_projects, list):
            raise HTTPException(status_code=400, detail="Project has no subProjects")

        sub_project = next((sp for sp in sub_projects if sp.get("id") == sub_project_id), None)
        if not sub_project:
            raise HTTPException(status_code=404, detail="SubProject not found")

        templates = project_data.get("designSpecTemplates") or []
        template = next((t for t in templates if t.get("id") == template_id), None)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        now = datetime.now(timezone.utc).isoformat()
        spec_id = uuid4().hex
        content = _render_design_spec_text(
            project=project_data,
            sub_project=sub_project,
            template=template,
            payload=payload,
        )

        docx_meta = _store_generated_file(
            db,
            user=user,
            project_id=project_id,
            sub_project_id=sub_project_id,
            task_id=f"design-spec-{spec_id}",
            stage=stage,
            original_name=f"{sub_project.get('name', 'sub')}_{stage}_设计说明.docx",
            content_writer=lambda path: _generate_docx(content, path),
            source="design-spec",
        )
        pdf_meta = _store_generated_file(
            db,
            user=user,
            project_id=project_id,
            sub_project_id=sub_project_id,
            task_id=f"design-spec-{spec_id}",
            stage=stage,
            original_name=f"{sub_project.get('name', 'sub')}_{stage}_设计说明.pdf",
            content_writer=lambda path: _generate_pdf(content, path),
            source="design-spec",
        )

        spec = {
            "id": spec_id,
            "templateId": template_id,
            "stage": stage,
            "payload": payload,
            "createdBy": user["username"],
            "createdAt": now,
            "outputs": {
                "docx": docx_meta,
                "pdf": pdf_meta,
                "dwgFiles": [],
            },
        }

        design_specs = sub_project.get("designSpecs")
        if not isinstance(design_specs, list):
            design_specs = []
        sub_project["designSpecs"] = [spec, *design_specs]

        db.execute(
            """
            UPDATE projects
            SET data = ?
            WHERE id = ?
            """,
            (json.dumps(project_data, ensure_ascii=False), project_id),
        )
        _sync_project_files(db, project_id=project_id, project_data=project_data)

    return {"designSpec": spec}


@app.post("/api/projects/{project_id}/subprojects/{sub_project_id}/design-specs/{spec_id}/dwg-fill")
async def fill_dwg_frames(
    project_id: str,
    sub_project_id: str,
    spec_id: str,
    request: Request,
    user: Dict[str, Any] = Depends(get_current_user),
):
    data = await request.json()
    file_ids = data.get("fileIds") or []
    if not isinstance(file_ids, list) or not file_ids:
        raise HTTPException(status_code=400, detail="fileIds is required")

    with get_db() as db:
        project_row = db.execute(
            "SELECT * FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")
        _require_subproject_edit_access(
            db,
            user=user,
            project_id=project_id,
            sub_project_id=sub_project_id,
        )

        project_data = _load_project_data(project_row)
        sub_projects = project_data.get("subProjects")
        if not isinstance(sub_projects, list):
            raise HTTPException(status_code=400, detail="Project has no subProjects")

        sub_project = next((sp for sp in sub_projects if sp.get("id") == sub_project_id), None)
        if not sub_project:
            raise HTTPException(status_code=404, detail="SubProject not found")

        design_specs = sub_project.get("designSpecs")
        if not isinstance(design_specs, list):
            raise HTTPException(status_code=400, detail="No design specs found")

        spec = next((item for item in design_specs if item.get("id") == spec_id), None)
        if not spec:
            raise HTTPException(status_code=404, detail="Design spec not found")

        placeholders = ",".join(["?"] * len(file_ids))
        rows = db.execute(
            f"""
            SELECT id, original_name, relative_path, stage
            FROM files
            WHERE project_id = ? AND id IN ({placeholders})
            """,
            (project_id, *file_ids),
        ).fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="No DWG files found")

        outputs = spec.get("outputs") if isinstance(spec.get("outputs"), dict) else {}
        dwg_outputs = outputs.get("dwgFiles")
        if not isinstance(dwg_outputs, list):
            dwg_outputs = []

        now = datetime.now(timezone.utc)
        uploaded_at = now.isoformat()
        upload_dir = UPLOAD_ROOT / str(user["id"]) / project_id / sub_project_id / f"design-spec-{spec_id}-dwg"
        upload_dir.mkdir(parents=True, exist_ok=True)

        for row in rows:
            relative_path = row["relative_path"]
            file_path = (SERVER_DIR / relative_path).resolve()
            try:
                file_path.relative_to(SERVER_DIR)
            except ValueError:
                continue
            if not file_path.exists():
                continue

            original_name = _safe_basename(row["original_name"])
            stem = Path(original_name).stem
            suffix = Path(original_name).suffix or ".dwg"
            new_name = f"{stem}_filled{suffix}"
            file_id = uuid4().hex
            stored_name = f"{file_id}_{new_name}"
            stored_path = upload_dir / stored_name
            shutil.copyfile(file_path, stored_path)
            size = stored_path.stat().st_size
            relative_new_path = stored_path.relative_to(SERVER_DIR).as_posix()

            db.execute(
                """
                INSERT INTO files (
                  id, user_id, project_id, sub_project_id, task_id,
                  stage, version, original_name, stored_name, relative_path,
                  mime_type, size, uploaded_at, uploaded_by, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    file_id,
                    user["id"],
                    project_id,
                    sub_project_id,
                    f"design-spec-{spec_id}-dwg",
                    row["stage"] or sub_project.get("stage"),
                    "AUTO",
                    new_name,
                    stored_name,
                    relative_new_path,
                    "application/octet-stream",
                    size,
                    uploaded_at,
                    user["username"],
                    "dwg-fill",
                ),
            )

            dwg_outputs.append(
                _build_file_meta(
                    file_id=file_id,
                    original_name=new_name,
                    size=size,
                    uploaded_at=uploaded_at,
                    uploaded_by=user["username"],
                    source="dwg-fill",
                )
            )

        outputs["dwgFiles"] = dwg_outputs
        spec["outputs"] = outputs

        sub_project["designSpecs"] = design_specs

        db.execute(
            """
            UPDATE projects
            SET data = ?
            WHERE id = ?
            """,
            (json.dumps(project_data, ensure_ascii=False), project_id),
        )
        _sync_project_files(db, project_id=project_id, project_data=project_data)

    return {"designSpec": spec}

@app.delete("/api/projects/{project_id}/subprojects/{sub_project_id}/tasks/{task_id}/versions/{version}")
def delete_task_version(
    project_id: str,
    sub_project_id: str,
    task_id: str,
    version: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    with get_db() as db:
        project_row = db.execute(
            "SELECT * FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")
        _require_project_edit_access(db, user=user, project_id=project_id)

        project_data = _load_project_data(project_row)
        sub_projects = project_data.get("subProjects")
        if not isinstance(sub_projects, list):
            raise HTTPException(status_code=400, detail="Project has no subProjects")

        sub_project = next((sp for sp in sub_projects if sp.get("id") == sub_project_id), None)
        if not sub_project:
            raise HTTPException(status_code=404, detail="SubProject not found")

        tasks = sub_project.get("tasks")
        if not isinstance(tasks, list):
            raise HTTPException(status_code=400, detail="SubProject has no tasks")

        task = next((t for t in tasks if t.get("id") == task_id), None)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        versions = task.get("versions")
        if not isinstance(versions, list):
            raise HTTPException(status_code=400, detail="Task has no versions")

        target_index = next(
            (
                idx
                for idx, entry in enumerate(versions)
                if isinstance(entry, dict) and entry.get("version") == version
            ),
            None,
        )
        if target_index is None:
            raise HTTPException(status_code=404, detail="Version not found")

        target_version = versions.pop(target_index)
        task["versions"] = versions

        files_in_version = target_version.get("files", []) if isinstance(target_version, dict) else []
        file_ids = [
            f.get("id")
            for f in files_in_version
            if isinstance(f, dict) and isinstance(f.get("id"), str) and f.get("id")
        ]
        if file_ids:
            placeholders = ",".join(["?"] * len(file_ids))
            rows = db.execute(
                f"""
                SELECT id, relative_path
                FROM files
                WHERE project_id = ? AND id IN ({placeholders})
                """,
                (project_id, *file_ids),
            ).fetchall()
            _delete_file_rows(db, rows)

        db.execute(
            """
            UPDATE projects
            SET data = ?
            WHERE id = ?
            """,
            (
                json.dumps(project_data, ensure_ascii=False),
                project_id,
            ),
        )
        _sync_project_files(
            db,
            project_id=project_id,
            project_data=project_data,
        )

    return {"taskId": task_id, "deletedVersion": version, "task": task}


@app.get("/api/files/{file_id}")
def download_file(file_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM files WHERE id = ?",
            (file_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="File not found")

    relative_path = row["relative_path"]
    file_path = (SERVER_DIR / relative_path).resolve()
    try:
        file_path.relative_to(SERVER_DIR)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File content not found")

    original_name = row["original_name"] or file_path.name
    ascii_fallback = original_name.encode("ascii", errors="ignore").decode("ascii") or "download.bin"
    encoded_name = quote(original_name)
    headers = {
        "Content-Disposition": f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded_name}",
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return FileResponse(
        path=file_path,
        media_type=row["mime_type"] or "application/octet-stream",
        headers=headers,
    )


@app.get("/api/projects/{project_id}/export")
def export_project_files(
    project_id: str,
    stage: str | None = None,
    user: Dict[str, Any] = Depends(get_current_user),
):
    with get_db() as db:
        project = db.execute(
            "SELECT id, name, code, data FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        if stage:
            rows = db.execute(
                """
                SELECT stage, task_id, version, original_name, relative_path
                FROM files
                WHERE project_id = ? AND stage = ?
                ORDER BY uploaded_at DESC
                """,
                (project_id, stage),
            ).fetchall()
        else:
            rows = db.execute(
                """
                SELECT stage, task_id, version, original_name, relative_path
                FROM files
                WHERE project_id = ?
                ORDER BY uploaded_at DESC
                """,
                (project_id,),
            ).fetchall()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zip_file:
        project_payload: Dict[str, Any]
        try:
            project_payload = json.loads(project["data"] or "{}")
        except json.JSONDecodeError:
            project_payload = {}

        manifest = {
            "projectId": project["id"],
            "projectName": project["name"],
            "projectCode": project["code"],
            "stage": stage,
            "exportedAt": datetime.now(timezone.utc).isoformat(),
            "fileCount": len(rows),
            "projectData": project_payload,
        }
        manifest_name = "stage_export_manifest.json" if stage else "project_export_manifest.json"
        zip_file.writestr(
            manifest_name,
            json.dumps(manifest, ensure_ascii=False, indent=2),
        )

        for row in rows:
            relative_path = row["relative_path"]
            file_path = (SERVER_DIR / relative_path).resolve()
            try:
                file_path.relative_to(SERVER_DIR)
            except ValueError:
                continue
            if not file_path.exists():
                continue
            stage_folder = row["stage"] or "unknown-stage"
            task_folder = row["task_id"] or "unknown-task"
            version_folder = row["version"] or "unknown-version"
            arcname = f"{stage_folder}/{task_folder}/{version_folder}/{row['original_name']}"
            zip_file.write(file_path, arcname=arcname)

    zip_buffer.seek(0)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    stage_part = f"_{stage}" if stage else "_all"
    filename = f"{project['name']}_{project['code']}{stage_part}_{timestamp}.zip"
    ascii_fallback = filename.encode("ascii", errors="ignore").decode("ascii") or f"project_export{stage_part}_{timestamp}.zip"
    encoded_name = quote(filename)
    headers = {
        "Content-Disposition": f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded_name}",
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return StreamingResponse(zip_buffer, media_type="application/zip", headers=headers)


@app.get("/", include_in_schema=False)
def serve_frontend_root():
    index_file = DIST_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend bundle not found")
    return FileResponse(index_file)


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_app(full_path: str):
    if full_path.startswith(("api/", "files/", "assets/")):
        raise HTTPException(status_code=404, detail="Not found")

    requested_path = (DIST_DIR / full_path).resolve()
    try:
        requested_path.relative_to(DIST_DIR)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")

    if requested_path.is_file():
        return FileResponse(requested_path)

    index_file = DIST_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend bundle not found")
    return FileResponse(index_file)
