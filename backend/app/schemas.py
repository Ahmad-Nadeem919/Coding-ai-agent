"""Pydantic request/response models for the coding agent API."""

from __future__ import annotations

from pydantic import BaseModel


class MessageOut(BaseModel):
    role: str
    content: str
    timestamp: str


class SessionSummaryOut(BaseModel):
    session_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


class SessionOut(BaseModel):
    session_id: str
    title: str
    created_at: str
    updated_at: str
    messages: list[MessageOut]


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class FileBlockOut(BaseModel):
    path: str
    content: str
    lines: int
    size: int


class ApplyBlockIn(BaseModel):
    path: str
    content: str


class ApplyBlocksRequest(BaseModel):
    blocks: list[ApplyBlockIn]


class WriteFileRequest(BaseModel):
    path: str
    content: str


class RenameRequest(BaseModel):
    src: str
    dst: str


class MkdirRequest(BaseModel):
    path: str


class TreeEntryOut(BaseModel):
    depth: int
    name: str
    is_dir: bool


class FileContentOut(BaseModel):
    path: str
    content: str


class SearchResultOut(BaseModel):
    file: str
    line_number: int
    line: str


class RunCommandRequest(BaseModel):
    command: str
    timeout: int = 120


class RunCommandResponse(BaseModel):
    command: str
    returncode: int
    stdout: str
    stderr: str
    timed_out: bool


class ModelSettingsOut(BaseModel):
    model_name: str
    temperature: float


class ModelSettingsUpdate(BaseModel):
    model_name: str | None = None
    temperature: float | None = None
