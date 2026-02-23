from __future__ import annotations

import json
import os
import sqlite3
import shutil
import bcrypt
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

# Load environment variables from server/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

SERVER_DIR = Path(__file__).resolve().parent
DB_PATH = SERVER_DIR / "hvac.db"
UPLOAD_ROOT = SERVER_DIR / "uploads"
JWT_SECRET = os.getenv("JWT_SECRET", "hvac-secret-key")
JWT_ALGORITHM = "HS256"

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
              role TEXT DEFAULT 'user'
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
    default_users = ("user1", "user2", "user3")
    with get_db() as db:
        for username in default_users:
            row = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if row:
                db.execute(
                    "UPDATE users SET password = ?, role = 'user' WHERE id = ?",
                    (hash_password("password123"), row["id"]),
                )
                continue
            db.execute(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                (username, hash_password("password123"), "user"),
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


@app.post("/api/auth/register", status_code=201)
async def register(request: Request):
    data = await request.json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    hashed_password = hash_password(password)
    role = "user"

    with get_db() as db:
        try:
            cur = db.execute(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                (username, hashed_password, role),
            )
        except sqlite3.IntegrityError as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Username already exists")
            raise HTTPException(status_code=500, detail=str(e))

    return {"id": cur.lastrowid, "username": username, "role": role}


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
        "user": {"id": row["id"], "username": row["username"], "role": row["role"]},
    }


@app.get("/api/auth/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": user}


@app.get("/api/projects")
def list_projects(user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM projects WHERE user_id = ?", (user["id"],)
        ).fetchall()

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
        if existing and existing["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        if existing:
            db.execute(
                """
                UPDATE projects
                SET name = ?, code = ?, data = ?
                WHERE id = ? AND user_id = ?
                """,
                (name, code, data_json, project_id, user["id"]),
            )
        else:
            db.execute(
                """
                INSERT INTO projects (id, user_id, name, code, data)
                VALUES (?, ?, ?, ?, ?)
                """,
                (project_id, user["id"], name, code, data_json),
            )
        _sync_project_files(
            db,
            user_id=user["id"],
            project_id=project_id,
            project_data=data_obj,
        )
    return {"id": project_id, "name": name, "code": code}


@app.delete("/api/projects/{project_id}")
def delete_project(
    project_id: str, user: Dict[str, Any] = Depends(get_current_user)
):
    with get_db() as db:
        file_rows = db.execute(
            "SELECT id, relative_path FROM files WHERE project_id = ? AND user_id = ?",
            (project_id, user["id"]),
        ).fetchall()
        _delete_file_rows(db, file_rows, user["id"])
        db.execute(
            "DELETE FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user["id"]),
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


def _delete_file_rows(db: sqlite3.Connection, rows: list[sqlite3.Row], user_id: int) -> None:
    for row in rows:
        db.execute("DELETE FROM files WHERE id = ? AND user_id = ?", (row["id"], user_id))
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
        "downloadPath": f"/api/files/{file_id}",
    }


def _collect_referenced_file_ids(project_data: Dict[str, Any]) -> set[str]:
    file_ids: set[str] = set()
    sub_projects = project_data.get("subProjects")
    if not isinstance(sub_projects, list):
        return file_ids
    for sub_project in sub_projects:
        tasks = sub_project.get("tasks") if isinstance(sub_project, dict) else None
        if not isinstance(tasks, list):
            continue
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
    return file_ids


def _sync_project_files(
    db: sqlite3.Connection,
    *,
    user_id: int,
    project_id: str,
    project_data: Dict[str, Any],
) -> None:
    referenced_ids = _collect_referenced_file_ids(project_data)
    existing_files = db.execute(
        "SELECT id, relative_path FROM files WHERE user_id = ? AND project_id = ?",
        (user_id, project_id),
    ).fetchall()
    to_delete = [row for row in existing_files if row["id"] not in referenced_ids]
    _delete_file_rows(db, to_delete, user_id)


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
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user["id"]),
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
            with stored_path.open("wb") as out_file:
                shutil.copyfileobj(incoming.file, out_file)

            size = stored_path.stat().st_size
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
            WHERE id = ? AND user_id = ?
            """,
            (
                json.dumps(project_data, ensure_ascii=False),
                project_id,
                user["id"],
            ),
        )
        _sync_project_files(
            db,
            user_id=user["id"],
            project_id=project_id,
            project_data=project_data,
        )

    return {"taskId": task_id, "version": version_entry, "task": task}


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
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user["id"]),
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
                WHERE user_id = ? AND project_id = ? AND id IN ({placeholders})
                """,
                (user["id"], project_id, *file_ids),
            ).fetchall()
            _delete_file_rows(db, rows, user["id"])

        db.execute(
            """
            UPDATE projects
            SET data = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                json.dumps(project_data, ensure_ascii=False),
                project_id,
                user["id"],
            ),
        )
        _sync_project_files(
            db,
            user_id=user["id"],
            project_id=project_id,
            project_data=project_data,
        )

    return {"taskId": task_id, "deletedVersion": version, "task": task}


@app.get("/api/files/{file_id}")
def download_file(file_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM files WHERE id = ? AND user_id = ?",
            (file_id, user["id"]),
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

    return FileResponse(
        path=file_path,
        filename=row["original_name"],
        media_type=row["mime_type"] or "application/octet-stream",
    )
