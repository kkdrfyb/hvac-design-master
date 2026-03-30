from __future__ import annotations

import json
import os
import sqlite3
import shutil
import bcrypt
import io
import zipfile
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

# Load environment variables from server/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

SERVER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SERVER_DIR.parent
DIST_DIR = PROJECT_ROOT / "dist"
DB_PATH = SERVER_DIR / "hvac.db"
UPLOAD_ROOT = SERVER_DIR / "uploads"
JWT_SECRET = os.getenv("JWT_SECRET", "hvac-secret-key")
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
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


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


def _ensure_column(db: sqlite3.Connection, table: str, column: str, column_sql: str) -> None:
    cols = db.execute(f"PRAGMA table_info({table})").fetchall()
    if any(row["name"] == column for row in cols):
        return
    db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_sql}")


def _seed_knowledge_data(db: sqlite3.Connection) -> None:
    now = datetime.now(timezone.utc).isoformat()
    clause_count = db.execute("SELECT COUNT(1) AS cnt FROM clauses").fetchone()["cnt"]
    if clause_count == 0:
        for item in DEFAULT_CLAUSES:
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
    with get_db() as db:
        for username, role in default_users:
            row = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if row:
                db.execute(
                    "UPDATE users SET password = ?, role = ?, must_change_password = 1 WHERE id = ?",
                    (hash_password("123456"), role, row["id"]),
                )
                continue
            db.execute(
                "INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, 1)",
                (username, hash_password("123456"), role),
            )


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    ensure_default_test_users()


def create_access_token(payload: Dict[str, Any]) -> str:
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
) -> Dict[str, Any]:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("id")
        username = payload.get("username")
        role = payload.get("role")
        if not user_id or not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        return {"id": user_id, "username": username, "role": role}
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
    password = data.get("password") or ""
    role = data.get("role") or "user"
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    if role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Invalid role")

    hashed_password = hash_password(password)
    must_change_password = bool(data.get("mustChangePassword", True))

    with get_db() as db:
        try:
            cur = db.execute(
                "INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, ?)",
                (username, hashed_password, role, 1 if must_change_password else 0),
            )
        except sqlite3.IntegrityError as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Username already exists")
            raise HTTPException(status_code=500, detail=str(e))

    return {
        "id": cur.lastrowid,
        "username": username,
        "role": role,
        "mustChangePassword": must_change_password,
    }


@app.post("/api/auth/login")
async def login(request: Request):
    data = await request.json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        stored_password = row["password"] or ""
        if not verify_password(password, stored_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not is_bcrypt_hash(stored_password):
            db.execute(
                "UPDATE users SET password = ? WHERE id = ?",
                (hash_password(password), row["id"]),
            )

    token = create_access_token(
        {"id": row["id"], "username": row["username"], "role": row["role"]}
    )
    return {
        "token": token,
        "user": {
            "id": row["id"],
            "username": row["username"],
            "role": row["role"],
            "mustChangePassword": bool(row["must_change_password"]),
        },
    }


@app.get("/api/auth/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute(
            "SELECT id, username, role, must_change_password FROM users WHERE id = ?",
            (user["id"],),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user": {
            "id": row["id"],
            "username": row["username"],
            "role": row["role"],
            "mustChangePassword": bool(row["must_change_password"]),
        }
    }


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

    with get_db() as db:
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
        rows = db.execute("SELECT * FROM projects").fetchall()

    result = []
    for row in rows:
        row_dict = dict(row)
        data_raw = row_dict.pop("data", None) or "{}"
        try:
            extra = json.loads(data_raw)
        except json.JSONDecodeError:
            extra = {}
        result.append({**row_dict, **extra})
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
        if k not in ("id", "name", "code", "user_id", "owner", "data")
    }
    data_json = json.dumps(data_obj, ensure_ascii=False)

    with get_db() as db:
        existing = db.execute(
            "SELECT user_id FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        if existing:
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
            project_data=data_obj,
        )
    return {"id": project_id, "name": name, "code": code}


@app.delete("/api/projects/{project_id}")
def delete_project(
    project_id: str, user: Dict[str, Any] = Depends(get_current_user)
):
    require_admin(user)
    with get_db() as db:
        file_rows = db.execute(
            "SELECT id, relative_path FROM files WHERE project_id = ?",
            (project_id,),
        ).fetchall()
        _delete_file_rows(db, file_rows)
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
            "SELECT id, name, code FROM projects WHERE id = ?",
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

    if not rows:
        raise HTTPException(status_code=404, detail="No files found for export")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zip_file:
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
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
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
