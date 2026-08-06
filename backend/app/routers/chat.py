"""Streaming chat endpoint.

Streams newline-delimited JSON (NDJSON) events so the frontend can render
the assistant's reply incrementally, mirroring the CLI's live-updating
panel. Event shapes:

    {"type": "chunk", "text": "..."}
    {"type": "warning", "message": "..."}          # stream interrupted, partial reply kept
    {"type": "error", "message": "..."}             # request failed, no reply produced
    {"type": "done", "session_id", "title", "updated_at", "full_text", "file_blocks"}
"""

from __future__ import annotations

import json
from collections.abc import Iterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

import tools
from app.schemas import ChatRequest
from app.state import AppState, get_state
from gemini_client import GeminiClientError
from prompts import SYSTEM_PROMPT

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _event(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


def _stream(req: ChatRequest, state: AppState) -> Iterator[str]:
    history_manager = state.history_manager
    config = state.config
    client = state.client

    if req.session_id:
        try:
            memory = history_manager.load(req.session_id)
        except (FileNotFoundError, ValueError):
            memory = history_manager.new_session()
    else:
        memory = history_manager.new_session()

    memory.add("user", req.message)
    memory.trim(config.max_history_messages, config.max_history_chars)
    contents = memory.to_gemini_contents()

    full_text = ""
    error: Exception | None = None
    try:
        for chunk in client.stream_chat(
            contents,
            system_prompt=SYSTEM_PROMPT,
            temperature=config.temperature,
            max_output_tokens=config.max_output_tokens,
        ):
            full_text += chunk
            yield _event({"type": "chunk", "text": chunk})
    except GeminiClientError as exc:
        error = exc

    if error is not None:
        if full_text:
            yield _event({"type": "warning", "message": f"Response interrupted: {error}"})
        else:
            yield _event({"type": "error", "message": str(error)})
            return

    memory.add("assistant", full_text)
    history_manager.save(memory)

    blocks = tools.parse_file_blocks(full_text)
    file_blocks = [
        {
            "path": b.path,
            "content": b.content,
            "lines": b.content.count("\n") + 1,
            "size": len(b.content.encode("utf-8")),
        }
        for b in blocks
    ]

    yield _event(
        {
            "type": "done",
            "session_id": memory.session_id,
            "title": memory.title,
            "updated_at": memory.updated_at,
            "full_text": full_text,
            "file_blocks": file_blocks,
        }
    )


@router.post("/stream")
def stream_chat(req: ChatRequest, state: AppState = Depends(get_state)) -> StreamingResponse:
    return StreamingResponse(_stream(req, state), media_type="application/x-ndjson")
