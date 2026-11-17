"""
文件夹扫描服务 — 遍历本地目录结构，映射为设计过程记录层次。

扫描规则：
  一级目录 → DesignProcessKind（中文名匹配）
  二级目录 → subtype
  含"版"字或 V1/V2 等 → 版本文件夹
  其余文件 → 挂到上级

Usage:
    from folder_scanner import scan_folder, ScanResult
    result = scan_folder("D:\\projects\\制氯站")
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Optional

# ── 中文目录名 → DesignProcessKind 映射 ──────────────────────────
PROCESS_KIND_DIR_MAP: Dict[str, str] = {
    "设计输入": "INPUT",
    "收到提资": "RECEIVED_INTERFACE",
    "计算结果": "CALCULATION",
    "对外提资": "INTERFACE",
    "输出成果": "DELIVERABLE",
    "出图后闭环": "POST_ISSUE",
    "设计备注": "NOTE",
}

REVERSE_KIND_MAP: Dict[str, str] = {v: k for k, v in PROCESS_KIND_DIR_MAP.items()}

# 常见版本目录名正则
_VERSION_PATTERNS = [
    re.compile(r"^(.+?)[版版本]$"),          # A版, B版, 初版, 最终版
    re.compile(r"^[Vv](\d+)$"),               # V1, v2
    re.compile(r"^版本[A-Z\d]", re.UNICODE),  # 版本A, 版本1
    re.compile(r"^[A-D]$"),                   # 单个字母 A, B, C
]

# 应该忽略的目录/文件（隐藏文件、系统文件等）
_SKIP_NAMES = {
    ".", "..", ".DS_Store", "Thumbs.db",
    "__pycache__", ".git", ".svn", ".idea",
}


# ── 数据模型 ─────────────────────────────────────────────────────


@dataclass
class ScannedFile:
    name: str
    relative_path: str       # 相对于 root_path
    full_path: str           # 绝对路径
    size: int = 0
    last_modified: str = ""  # ISO 格式

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "relativePath": self.relative_path.replace(os.sep, "/"),
            "fullPath": self.full_path,
            "size": self.size,
            "lastModified": self.last_modified,
        }


@dataclass
class ScannedVersion:
    label: str
    files: List[ScannedFile] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"label": self.label, "files": [f.to_dict() for f in self.files]}


@dataclass
class ScannedSubtype:
    subtype: str
    versions: List[ScannedVersion] = field(default_factory=list)
    direct_files: List[ScannedFile] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "subtype": self.subtype,
            "versions": [v.to_dict() for v in self.versions],
            "directFiles": [f.to_dict() for f in self.direct_files],
        }


@dataclass
class ScannedKindGroup:
    kind: str   # DesignProcessKind 枚举值
    label: str  # 中文标签
    subtypes: List[ScannedSubtype] = field(default_factory=list)
    direct_files: List[ScannedFile] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "label": self.label,
            "subtypes": [s.to_dict() for s in self.subtypes],
            "directFiles": [f.to_dict() for f in self.direct_files],
        }


@dataclass
class ScanResult:
    root_path: str
    kinds: List[ScannedKindGroup] = field(default_factory=list)
    unmatched_folders: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "rootPath": self.root_path,
            "kinds": [k.to_dict() for k in self.kinds],
            "unmatchedFolders": self.unmatched_folders,
            "warnings": self.warnings,
            "summary": self.summary,
        }

    @property
    def summary(self) -> dict:
        total_files = 0
        total_kinds = len(self.kinds)
        for k in self.kinds:
            for s in k.subtypes:
                total_files += len(s.direct_files)
                for v in s.versions:
                    total_files += len(v.files)
            total_files += len(k.direct_files)
        return {
            "kindCount": total_kinds,
            "fileCount": total_files,
            "unmatchedCount": len(self.unmatched_folders),
        }


# ── 工具函数 ─────────────────────────────────────────────────────


def _is_version_dir(name: str) -> bool:
    """判断目录名是否为版本目录"""
    if not name:
        return False
    for pattern in _VERSION_PATTERNS:
        if pattern.search(name):
            return True
    return False


def _is_skipped(name: str) -> bool:
    if name in _SKIP_NAMES:
        return True
    if name.startswith("."):
        return True
    return False


def _collect_files(
    dir_path: str,
    root_path: str,
    max_depth: int = 3,
    current_depth: int = 0,
) -> tuple[List[ScannedFile], List[ScannedVersion], List[str]]:
    """
    扫描目录中的文件和子目录。
    返回 (direct_files, versions, unmatched_subdirs)
    """
    direct_files: List[ScannedFile] = []
    versions: List[ScannedVersion] = []
    subdirs: List[str] = []  # 无法识别的子目录报告给上层

    try:
        entries = sorted(os.listdir(dir_path), key=lambda x: x.lower())
    except PermissionError:
        return direct_files, versions, [f"无权限访问: {dir_path}"]
    except OSError as e:
        return direct_files, versions, [f"读取目录失败: {dir_path} — {e}"]

    for entry in entries:
        if _is_skipped(entry):
            continue

        full_entry = os.path.join(dir_path, entry)
        rel_entry = os.path.relpath(full_entry, root_path)

        if os.path.isfile(full_entry):
            try:
                stat = os.stat(full_entry)
                mtime = datetime.fromtimestamp(stat.st_mtime).isoformat()
            except OSError:
                stat = os.stat(full_entry) if hasattr(os, 'stat') else None
                mtime = ""
            direct_files.append(ScannedFile(
                name=entry,
                relative_path=rel_entry,
                full_path=full_entry,
                size=getattr(stat, 'st_size', 0),
                last_modified=mtime,
            ))
        elif os.path.isdir(full_entry):
            if current_depth < max_depth and _is_version_dir(entry):
                # 版本目录 — 收集其下的文件
                version_files: List[ScannedFile] = []
                try:
                    inner_entries = sorted(os.listdir(full_entry), key=lambda x: x.lower())
                except (PermissionError, OSError):
                    inner_entries = []
                for ie in inner_entries:
                    if _is_skipped(ie):
                        continue
                    ie_full = os.path.join(full_entry, ie)
                    if os.path.isfile(ie_full):
                        try:
                            stat = os.stat(ie_full)
                            mtime = datetime.fromtimestamp(stat.st_mtime).isoformat()
                        except OSError:
                            stat = None
                            mtime = ""
                        version_files.append(ScannedFile(
                            name=ie,
                            relative_path=os.path.relpath(ie_full, root_path),
                            full_path=ie_full,
                            size=getattr(stat, 'st_size', 0) if stat else 0,
                            last_modified=mtime,
                        ))
                versions.append(ScannedVersion(
                    label=entry,
                    files=version_files,
                ))
            elif current_depth < max_depth:
                subdirs.append(full_entry)
            # 超过递归深度的子目录忽略

    return direct_files, versions, subdirs


# ── 主要扫描接口 ─────────────────────────────────────────────────


def scan_folder(root_path: str) -> ScanResult:
    """
    扫描根目录，返回结构化 ScanResult。
    """
    result = ScanResult(root_path=root_path)

    if not os.path.isdir(root_path):
        result.warnings.append(f"路径不存在或不是目录: {root_path}")
        return result

    try:
        top_entries = sorted(os.listdir(root_path), key=lambda x: x.lower())
    except PermissionError:
        result.warnings.append(f"无权限访问根目录: {root_path}")
        return result
    except OSError as e:
        result.warnings.append(f"读取根目录失败: {root_path} — {e}")
        return result

    for entry in top_entries:
        if _is_skipped(entry):
            continue

        full_entry = os.path.join(root_path, entry)
        if not os.path.isdir(full_entry):
            continue

        # 尝试匹配一级目录 → DesignProcessKind
        kind = PROCESS_KIND_DIR_MAP.get(entry)
        if kind is None:
            result.unmatched_folders.append(entry)
            continue

        group = ScannedKindGroup(kind=kind, label=entry)

        # 扫描该 kind 目录下的子目录/文件
        try:
            kind_entries = sorted(os.listdir(full_entry), key=lambda x: x.lower())
        except (PermissionError, OSError):
            result.warnings.append(f"无权限访问: {full_entry}")
            continue

        for sub_entry in kind_entries:
            if _is_skipped(sub_entry):
                continue
            sub_full = os.path.join(full_entry, sub_entry)

            if os.path.isfile(sub_full):
                # kind 目录下的直接文件
                try:
                    stat = os.stat(sub_full)
                    mtime = datetime.fromtimestamp(stat.st_mtime).isoformat()
                except OSError:
                    stat = None
                    mtime = ""
                group.direct_files.append(ScannedFile(
                    name=sub_entry,
                    relative_path=os.path.relpath(sub_full, root_path),
                    full_path=sub_full,
                    size=getattr(stat, 'st_size', 0) if stat else 0,
                    last_modified=mtime,
                ))

            elif os.path.isdir(sub_full):
                # 版本目录 or subtype 目录 or 无法识别的子目录
                if _is_version_dir(sub_entry):
                    # kind 下直接是版本目录（无 subtype 层级）
                    # 特殊处理：把 kind 本身当作 subtype
                    version_files: List[ScannedFile] = []
                    try:
                        v_entries = sorted(os.listdir(sub_full), key=lambda x: x.lower())
                    except (PermissionError, OSError):
                        v_entries = []
                    for ve in v_entries:
                        if _is_skipped(ve):
                            continue
                        ve_full = os.path.join(sub_full, ve)
                        if os.path.isfile(ve_full):
                            try:
                                stat = os.stat(ve_full)
                                mtime = datetime.fromtimestamp(stat.st_mtime).isoformat()
                            except OSError:
                                stat = None
                                mtime = ""
                            version_files.append(ScannedFile(
                                name=ve,
                                relative_path=os.path.relpath(ve_full, root_path),
                                full_path=ve_full,
                                size=getattr(stat, 'st_size', 0) if stat else 0,
                                last_modified=mtime,
                            ))
                    # 创建一个以 kind 标签为 subtype 的分组
                    existing = next(
                        (s for s in group.subtypes if s.subtype == group.label),
                        None
                    )
                    if not existing:
                        existing = ScannedSubtype(subtype=group.label)
                        group.subtypes.append(existing)
                    existing.versions.append(ScannedVersion(
                        label=sub_entry,
                        files=version_files,
                    ))
                else:
                    # subtype 目录
                    subtype_name = sub_entry
                    existing_subtype = next(
                        (s for s in group.subtypes if s.subtype == subtype_name),
                        None
                    )
                    if not existing_subtype:
                        existing_subtype = ScannedSubtype(subtype=subtype_name)
                        group.subtypes.append(existing_subtype)

                    # 扫描 subtype 目录
                    df, vers, extra = _collect_files(sub_full, root_path)
                    existing_subtype.direct_files.extend(df)
                    existing_subtype.versions.extend(vers)
                    if extra:
                        result.warnings.extend(extra)

        result.kinds.append(group)

    return result


def apply_scan_selection(
    root_path: str,
    selected_files: List[dict],
) -> List[dict]:
    """
    根据前端选中的文件列表，生成可导入的记录结构。
    每条记录格式：
    {
        "kind": "RECEIVED_INTERFACE",
        "subtype": "建筑条件",
        "stage": "初步设计",
        "title": "建筑条件",
        "version": "A版",
        "files": [{"fullPath": "...", "name": "..."}]
    }
    """
    records: List[dict] = []
    for item in selected_files:
        records.append({
            "kind": item.get("kind", ""),
            "subtype": item.get("subtype", ""),
            "stage": item.get("stage", ""),
            "title": item.get("subtype") or item.get("kind_label", ""),
            "version": item.get("version", "A版"),
            "files": [
                {
                    "fullPath": f["fullPath"],
                    "name": f.get("name", os.path.basename(f["fullPath"])),
                }
                for f in item.get("files", [])
            ],
        })
    return records


# ── 命令行测试 ───────────────────────────────────────────────────


if __name__ == "__main__":
    import sys
    import json

    path = sys.argv[1] if len(sys.argv) > 1 else "."
    result = scan_folder(path)
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
