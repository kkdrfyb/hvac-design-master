from __future__ import annotations

import re
import zlib
from pathlib import Path


OBJECT_RE = re.compile(rb"(\d+)\s+(\d+)\s+obj(.*?)endobj", re.S)
STREAM_RE = re.compile(rb"stream\r?\n(.*?)\r?\nendstream", re.S)
FONT_REF_RE = re.compile(rb"/([A-Za-z0-9]+)\s+(\d+)\s+0\s+R")
TEXT_FONT_RE = re.compile(r"/([A-Za-z0-9]+)\s+[\d.]+\s+Tf")
TEXT_SHOW_RE = re.compile(r"<([0-9A-Fa-f]+)>\s*Tj")
TEXT_ARRAY_RE = re.compile(r"\[(.*?)\]\s*TJ")
PLAIN_TEXT_RE = re.compile(r"\((.*?)\)\s*Tj")
PAGE_RE = re.compile(rb"/Type\s*/Page\b")
OBJSTM_RE = re.compile(rb"/Type\s*/ObjStm\b")


def _parse_objects(pdf_bytes: bytes) -> dict[int, bytes]:
    objects = {int(match.group(1)): match.group(3) for match in OBJECT_RE.finditer(pdf_bytes)}
    return _expand_object_streams(objects)


def _get_stream_data(body: bytes) -> bytes | None:
    match = STREAM_RE.search(body)
    if not match:
        return None
    data = match.group(1)
    if b"/FlateDecode" in body:
        try:
            data = zlib.decompress(data)
        except zlib.error:
            return None
    return data


def _expand_object_streams(objects: dict[int, bytes]) -> dict[int, bytes]:
    expanded = dict(objects)

    for body in list(objects.values()):
        if not OBJSTM_RE.search(body):
            continue

        stream = _get_stream_data(body)
        n_match = re.search(rb"/N\s+(\d+)", body)
        first_match = re.search(rb"/First\s+(\d+)", body)
        if not stream or not n_match or not first_match:
            continue

        count = int(n_match.group(1))
        first = int(first_match.group(1))
        if first <= 0 or first > len(stream):
            continue

        header_text = stream[:first].decode("latin1", errors="ignore")
        header_numbers = [int(value) for value in re.findall(r"\d+", header_text)]
        if len(header_numbers) < count * 2:
            continue

        pairs = [
            (header_numbers[index * 2], header_numbers[index * 2 + 1])
            for index in range(count)
        ]
        object_blob = stream[first:]
        for index, (obj_num, offset) in enumerate(pairs):
            if offset >= len(object_blob):
                continue
            next_offset = pairs[index + 1][1] if index + 1 < len(pairs) else len(object_blob)
            chunk = object_blob[offset:next_offset].strip()
            if chunk and obj_num not in expanded:
                expanded[obj_num] = chunk

    return expanded


def _parse_cmap(stream: bytes) -> dict[str, str]:
    text = stream.decode("latin1", errors="ignore")
    mapping: dict[str, str] = {}

    for _, block in re.findall(r"(\d+)\s+beginbfchar\s*(.*?)\s*endbfchar", text, re.S):
        for source, target in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            mapping[source.upper()] = bytes.fromhex(target).decode("utf-16-be", errors="ignore")

    for _, block in re.findall(r"(\d+)\s+beginbfrange\s*(.*?)\s*endbfrange", text, re.S):
        for start, end, target in re.findall(
            r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block
        ):
            start_code = int(start, 16)
            end_code = int(end, 16)
            target_code = int(target, 16)
            for offset, codepoint in enumerate(range(start_code, end_code + 1)):
                mapping[f"{codepoint:04X}"] = bytes.fromhex(f"{target_code + offset:04X}").decode(
                    "utf-16-be", errors="ignore"
                )

        for start, end, targets_block in re.findall(
            r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[(.*?)\]", block, re.S
        ):
            targets = re.findall(r"<([0-9A-Fa-f]+)>", targets_block)
            for offset, codepoint in enumerate(range(int(start, 16), int(end, 16) + 1)):
                if offset >= len(targets):
                    break
                mapping[f"{codepoint:04X}"] = bytes.fromhex(targets[offset]).decode(
                    "utf-16-be", errors="ignore"
                )

    return mapping


def _build_font_maps(objects: dict[int, bytes]) -> dict[str, dict[str, str]]:
    font_object_to_cmap: dict[int, dict[str, str]] = {}
    alias_to_cmap: dict[str, dict[str, str]] = {}

    for obj_num, body in objects.items():
        if b"/ToUnicode" not in body:
            continue
        cmap_ref = re.search(rb"/ToUnicode\s+(\d+)\s+0\s+R", body)
        if not cmap_ref:
            continue
        cmap_stream = _get_stream_data(objects.get(int(cmap_ref.group(1)), b""))
        if cmap_stream:
            font_object_to_cmap[obj_num] = _parse_cmap(cmap_stream)

    for body in objects.values():
        if b"/Font" not in body:
            continue
        for alias, ref in FONT_REF_RE.findall(body):
            ref_num = int(ref)
            cmap = font_object_to_cmap.get(ref_num)
            if cmap:
                alias_to_cmap[alias.decode("ascii", errors="ignore")] = cmap

    return alias_to_cmap


def _decode_hex_text(hex_text: str, cmap: dict[str, str]) -> str:
    chars: list[str] = []
    for idx in range(0, len(hex_text), 4):
        code = hex_text[idx : idx + 4].upper()
        chars.append(cmap.get(code, ""))
    return "".join(chars)


def _extract_stream_text(stream: bytes, alias_to_cmap: dict[str, dict[str, str]]) -> str:
    text = stream.decode("latin1", errors="ignore")
    current_font = ""
    chunks: list[str] = []

    for line in text.splitlines():
        font_match = TEXT_FONT_RE.search(line)
        if font_match:
            current_font = font_match.group(1)
        cmap = alias_to_cmap.get(current_font, {})

        for hex_text in TEXT_SHOW_RE.findall(line):
            decoded = _decode_hex_text(hex_text, cmap)
            if decoded:
                chunks.append(decoded)

        for array_text in TEXT_ARRAY_RE.findall(line):
            parts = [_decode_hex_text(item, cmap) for item in re.findall(r"<([0-9A-Fa-f]+)>", array_text)]
            joined = "".join(part for part in parts if part)
            if joined:
                chunks.append(joined)

        for plain_text in PLAIN_TEXT_RE.findall(line):
            if plain_text:
                chunks.append(plain_text)

        if "ET" in line and chunks and chunks[-1] != "\n":
            chunks.append("\n")

    merged = "".join(chunks)
    merged = re.sub(r"\n{2,}", "\n", merged)
    return merged.strip()


def _page_stream_refs(page_body: bytes, objects: dict[int, bytes]) -> list[int]:
    contents_match = re.search(rb"/Contents\s*(\[(.*?)\]|(\d+)\s+0\s+R)", page_body, re.S)
    if not contents_match:
        return []
    block = contents_match.group(0)
    refs = [int(ref) for ref in re.findall(rb"(\d+)\s+0\s+R", block)]
    if len(refs) == 1:
        referenced = objects.get(refs[0], b"").strip()
        if referenced.startswith(b"["):
            nested_refs = [int(ref) for ref in re.findall(rb"(\d+)\s+0\s+R", referenced)]
            if nested_refs:
                return nested_refs
    return refs


def extract_pdf_pages(pdf_path: Path) -> list[str]:
    objects = _parse_objects(pdf_path.read_bytes())
    alias_to_cmap = _build_font_maps(objects)
    pages: list[str] = []

    for _, body in sorted(objects.items()):
        if not PAGE_RE.search(body):
            continue
        refs = _page_stream_refs(body, objects)
        page_text_parts: list[str] = []
        for ref in refs:
            stream = _get_stream_data(objects.get(ref, b""))
            if not stream:
                continue
            extracted = _extract_stream_text(stream, alias_to_cmap)
            if extracted:
                page_text_parts.append(extracted)
        page_text = "\n".join(part for part in page_text_parts if part).strip()
        if page_text:
            pages.append(page_text)

    return pages


def split_text_chunks(text: str, max_length: int = 1800) -> list[str]:
    normalized = text.replace("\r", "\n")
    normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
    if not normalized:
        return []
    if len(normalized) <= max_length:
        return [normalized]

    chunks: list[str] = []
    current = ""
    sentences = re.split(r"(?<=[。；！？\n])", normalized)
    for sentence in sentences:
        part = sentence.strip()
        if not part:
            continue
        if len(current) + len(part) <= max_length:
            current += part
            continue
        if current:
            chunks.append(current)
            current = ""
        if len(part) <= max_length:
            current = part
            continue
        start = 0
        while start < len(part):
            end = start + max_length
            chunks.append(part[start:end])
            start = end
    if current:
        chunks.append(current)
    return chunks
