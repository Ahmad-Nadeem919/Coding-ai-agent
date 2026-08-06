"""Sandboxed filesystem tools: tree, read, write, delete, rename, search.

All paths are resolved relative to the configured workdir by ``filesystem``
and cannot escape it (``PathSecurityError`` -> 403).
"""

from __future__ import annotations

from typing import Callable, TypeVar

from fastapi import APIRouter, Depends, HTTPException

import filesystem
from app.schemas import (
    ApplyBlocksRequest,
    FileContentOut,
    MkdirRequest,
    RenameRequest,
    SearchResultOut,
    TreeEntryOut,
    WriteFileRequest,
)
from app.state import AppState, get_state

router = APIRouter(prefix="/api/files", tags=["files"])

T = TypeVar("T")


def _call(fn: Callable[..., T], *args: object, **kwargs: object) -> T:
    try:
        return fn(*args, **kwargs)
    except filesystem.PathSecurityError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except (FileNotFoundError, IsADirectoryError, NotADirectoryError, FileExistsError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/tree", response_model=list[TreeEntryOut])
def get_tree(path: str = ".", state: AppState = Depends(get_state)) -> list[TreeEntryOut]:
    entries = _call(filesystem.list_tree, state.config.workdir, path)
    return [TreeEntryOut(depth=depth, name=name, is_dir=is_dir) for depth, name, is_dir in entries]


@router.get("/content", response_model=FileContentOut)
def read_file(path: str, state: AppState = Depends(get_state)) -> FileContentOut:
    content = _call(filesystem.read_file, state.config.workdir, path)
    return FileContentOut(path=path, content=content)


@router.post("/write")
def write_file(req: WriteFileRequest, state: AppState = Depends(get_state)) -> dict:
    resolved = _call(
        filesystem.write_file, state.config.workdir, req.path, req.content, state.config.backup_dir
    )
    return {"path": str(resolved.relative_to(state.config.workdir))}


@router.post("/apply-blocks")
def apply_blocks(req: ApplyBlocksRequest, state: AppState = Depends(get_state)) -> dict:
    written: list[str] = []
    for block in req.blocks:
        resolved = _call(
            filesystem.write_file,
            state.config.workdir,
            block.path,
            block.content,
            state.config.backup_dir,
        )
        written.append(str(resolved.relative_to(state.config.workdir)))
    return {"written": written}


@router.post("/mkdir")
def make_directory(req: MkdirRequest, state: AppState = Depends(get_state)) -> dict:
    resolved = _call(filesystem.create_directory, state.config.workdir, req.path)
    return {"path": str(resolved.relative_to(state.config.workdir))}


@router.delete("")
def delete_file(path: str, state: AppState = Depends(get_state)) -> dict:
    target = _call(filesystem.resolve_path, state.config.workdir, path)
    delete_fn = filesystem.delete_directory if target.is_dir() else filesystem.delete_file
    resolved = _call(delete_fn, state.config.workdir, path, state.config.backup_dir)
    return {"deleted": str(resolved.relative_to(state.config.workdir))}


@router.post("/rename")
def rename_file(req: RenameRequest, state: AppState = Depends(get_state)) -> dict:
    resolved = _call(filesystem.rename_file, state.config.workdir, req.src, req.dst)
    return {"path": str(resolved.relative_to(state.config.workdir))}


@router.get("/search", response_model=list[SearchResultOut])
def search_files(
    query: str,
    root: str = ".",
    regex: bool = False,
    case_sensitive: bool = False,
    glob: str = "*",
    state: AppState = Depends(get_state),
) -> list[SearchResultOut]:
    results = _call(
        filesystem.search_files,
        state.config.workdir,
        query,
        root,
        regex,
        case_sensitive,
        glob,
    )
    return [
        SearchResultOut(file=str(r.file), line_number=r.line_number, line=r.line) for r in results
    ]
