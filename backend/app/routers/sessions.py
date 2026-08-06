"""Session listing, creation, retrieval, and deletion."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.schemas import MessageOut, SessionOut, SessionSummaryOut
from app.state import AppState, get_state
from memory import ConversationMemory

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _to_session_out(memory: ConversationMemory) -> SessionOut:
    return SessionOut(
        session_id=memory.session_id,
        title=memory.title,
        created_at=memory.created_at,
        updated_at=memory.updated_at,
        messages=[
            MessageOut(role=m.role, content=m.content, timestamp=m.timestamp) for m in memory.messages
        ],
    )


@router.get("", response_model=list[SessionSummaryOut])
def list_sessions(state: AppState = Depends(get_state)) -> list[SessionSummaryOut]:
    return [
        SessionSummaryOut(
            session_id=s.session_id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=s.message_count,
        )
        for s in state.history_manager.list_sessions()
    ]


@router.post("", response_model=SessionOut)
def create_session(state: AppState = Depends(get_state)) -> SessionOut:
    memory = state.history_manager.new_session()
    state.history_manager.save(memory)
    return _to_session_out(memory)


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: str, state: AppState = Depends(get_state)) -> SessionOut:
    try:
        memory = state.history_manager.load(session_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _to_session_out(memory)


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: str, state: AppState = Depends(get_state)) -> None:
    state.history_manager.delete(session_id)
