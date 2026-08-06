"""Safe filesystem operations for the coding agent.

All paths are resolved relative to a configured working directory and are
validated to stay within it, preventing accidental (or model-directed)
access outside the project root. Every destructive write is preceded by a
timestamped backup.
"""

from __future__ import annotations

import dataclasses
import logging
import re
import shutil
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("coding_agent.filesystem")

DEFAULT_IGNORE_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    ".venv",
    "venv",
    "env",
    ".coding_agent",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "dist",
    "build",
    ".idea",
    ".vscode",
    "egg-info",
}


class PathSecurityError(Exception):
    """Raised when a path would escape the configured working directory."""


@dataclasses.dataclass
class SearchResult:
    """A single line matched during a project search."""

    file: Path
    line_number: int
    line: str


def resolve_path(workdir: Path, path: str | Path) -> Path:
    """Resolve ``path`` relative to ``workdir`` and ensure it stays inside it.

    Raises:
        PathSecurityError: if the resolved path escapes ``workdir``.
    """
    workdir = Path(workdir).resolve()
    candidate = Path(path)
    resolved = candidate if candidate.is_absolute() else workdir / candidate
    resolved = resolved.resolve()
    try:
        resolved.relative_to(workdir)
    except ValueError as exc:
        raise PathSecurityError(
            f"Path '{path}' resolves outside the project directory '{workdir}'."
        ) from exc
    return resolved


def read_file(workdir: Path, path: str | Path) -> str:
    """Read a UTF-8 text file and return its contents."""
    resolved = resolve_path(workdir, path)
    if not resolved.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if not resolved.is_file():
        raise IsADirectoryError(f"Not a file: {path}")
    return resolved.read_text(encoding="utf-8", errors="strict")


def backup_file(workdir: Path, path: str | Path, backup_dir: Path) -> Path | None:
    """Copy an existing file into ``backup_dir`` with a timestamp suffix.

    Returns the backup path, or ``None`` if the source file did not exist.
    """
    resolved = resolve_path(workdir, path)
    if not resolved.exists() or not resolved.is_file():
        return None

    backup_dir = Path(backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    safe_name = re.sub(r"[^\w.-]", "_", str(resolved.relative_to(Path(workdir).resolve())))
    backup_path = backup_dir / f"{safe_name}.{timestamp}.bak"
    shutil.copy2(resolved, backup_path)
    logger.info("Backed up %s to %s", resolved, backup_path)
    return backup_path


def write_file(
    workdir: Path,
    path: str | Path,
    content: str,
    backup_dir: Path | None = None,
) -> Path:
    """Write ``content`` to ``path``, creating parent directories as needed.

    If ``backup_dir`` is given and the file already exists, a backup is made
    first.
    """
    resolved = resolve_path(workdir, path)
    resolved.parent.mkdir(parents=True, exist_ok=True)

    if backup_dir is not None:
        backup_file(workdir, path, backup_dir)

    resolved.write_text(content, encoding="utf-8", newline="\n")
    logger.info("Wrote %s (%d bytes)", resolved, len(content.encode("utf-8")))
    return resolved


def create_directory(workdir: Path, path: str | Path) -> Path:
    """Create a directory (and parents) if it does not already exist."""
    resolved = resolve_path(workdir, path)
    resolved.mkdir(parents=True, exist_ok=True)
    return resolved


def delete_file(workdir: Path, path: str | Path, backup_dir: Path) -> Path:
    """Back up and then delete a file.

    Raises:
        FileNotFoundError: if the file does not exist.
    """
    resolved = resolve_path(workdir, path)
    if not resolved.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if resolved.is_dir():
        raise IsADirectoryError(f"Refusing to delete a directory with /delete: {path}")

    backup_file(workdir, path, backup_dir)
    resolved.unlink()
    logger.info("Deleted %s", resolved)
    return resolved


def delete_directory(workdir: Path, path: str | Path, backup_dir: Path) -> Path:
    """Recursively back up and then delete a directory.

    Raises:
        FileNotFoundError: if the directory does not exist.
        NotADirectoryError: if the path is not a directory.
    """
    resolved = resolve_path(workdir, path)
    if not resolved.exists():
        raise FileNotFoundError(f"Directory not found: {path}")
    if not resolved.is_dir():
        raise NotADirectoryError(f"Not a directory: {path}")

    backup_dir = Path(backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    safe_name = re.sub(r"[^\w.-]", "_", str(resolved.relative_to(Path(workdir).resolve())))
    backup_path = backup_dir / f"{safe_name}.{timestamp}.dir.bak"
    shutil.copytree(resolved, backup_path)
    shutil.rmtree(resolved)
    logger.info("Deleted directory %s (backed up to %s)", resolved, backup_path)
    return resolved


def rename_file(workdir: Path, src: str | Path, dst: str | Path) -> Path:
    """Rename/move a file within the project directory."""
    src_resolved = resolve_path(workdir, src)
    dst_resolved = resolve_path(workdir, dst)
    if not src_resolved.exists():
        raise FileNotFoundError(f"File not found: {src}")
    if dst_resolved.exists():
        raise FileExistsError(f"Destination already exists: {dst}")
    dst_resolved.parent.mkdir(parents=True, exist_ok=True)
    src_resolved.rename(dst_resolved)
    logger.info("Renamed %s -> %s", src_resolved, dst_resolved)
    return dst_resolved


def list_tree(
    workdir: Path,
    root: str | Path = ".",
    max_depth: int = 6,
    ignore_dirs: set[str] = DEFAULT_IGNORE_DIRS,
) -> list[tuple[int, str, bool]]:
    """Walk ``root`` and return a flat, depth-first list of directory entries.

    Each entry is ``(depth, name, is_dir)``, suitable for rendering with
    :func:`utils.render_tree`.
    """
    root_resolved = resolve_path(workdir, root)
    if not root_resolved.is_dir():
        raise NotADirectoryError(f"Not a directory: {root}")

    entries: list[tuple[int, str, bool]] = []

    def _walk(current: Path, depth: int) -> None:
        if depth > max_depth:
            return
        try:
            children = sorted(
                current.iterdir(), key=lambda p: (p.is_file(), p.name.lower())
            )
        except PermissionError:
            return
        for child in children:
            if child.name in ignore_dirs:
                continue
            is_dir = child.is_dir()
            entries.append((depth, child.name, is_dir))
            if is_dir:
                _walk(child, depth + 1)

    _walk(root_resolved, 0)
    return entries


def search_files(
    workdir: Path,
    pattern: str,
    root: str | Path = ".",
    regex: bool = False,
    case_sensitive: bool = False,
    glob_pattern: str = "*",
    ignore_dirs: set[str] = DEFAULT_IGNORE_DIRS,
    max_results: int = 500,
) -> list[SearchResult]:
    """Search text files under ``root`` for lines matching ``pattern``."""
    root_resolved = resolve_path(workdir, root)

    if regex:
        flags = 0 if case_sensitive else re.IGNORECASE
        matcher = re.compile(pattern, flags)
    else:
        needle = pattern if case_sensitive else pattern.lower()

        def matcher_fn(line: str) -> bool:
            haystack = line if case_sensitive else line.lower()
            return needle in haystack

        matcher = None

    results: list[SearchResult] = []

    for path in sorted(root_resolved.rglob(glob_pattern)):
        if any(part in ignore_dirs for part in path.parts):
            continue
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            continue

        for line_number, line in enumerate(text.splitlines(), start=1):
            matched = matcher.search(line) if regex else matcher_fn(line)
            if matched:
                results.append(SearchResult(file=path.relative_to(root_resolved), line_number=line_number, line=line.strip()))
                if len(results) >= max_results:
                    return results

    return results
