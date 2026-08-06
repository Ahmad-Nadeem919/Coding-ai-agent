"""Persistence for chat sessions: saving, listing, and resuming conversations."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

from memory import ConversationMemory

logger = logging.getLogger("coding_agent.history")


@dataclass
class SessionSummary:
    """Lightweight metadata about a saved session, for listing."""

    session_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


class HistoryManager:
    """Reads and writes conversation sessions as JSON files on disk."""

    def __init__(self, history_dir: Path) -> None:
        self.history_dir = Path(history_dir)
        self.history_dir.mkdir(parents=True, exist_ok=True)

    def _path_for(self, session_id: str) -> Path:
        return self.history_dir / f"{session_id}.json"

    def new_session(self) -> ConversationMemory:
        return ConversationMemory()

    def save(self, memory: ConversationMemory) -> Path:
        """Persist a conversation to disk, overwriting any previous save."""
        path = self._path_for(memory.session_id)
        path.write_text(json.dumps(memory.to_dict(), indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info("Saved session %s to %s", memory.session_id, path)
        return path

    def load(self, session_id: str) -> ConversationMemory:
        """Load a conversation session by its ID (or unambiguous prefix)."""
        path = self._path_for(session_id)
        if not path.exists():
            matches = list(self.history_dir.glob(f"{session_id}*.json"))
            if len(matches) == 1:
                path = matches[0]
            elif len(matches) > 1:
                raise ValueError(f"Session ID '{session_id}' is ambiguous; be more specific.")
            else:
                raise FileNotFoundError(f"No saved session found with ID '{session_id}'.")

        data = json.loads(path.read_text(encoding="utf-8"))
        return ConversationMemory.from_dict(data)

    def list_sessions(self) -> list[SessionSummary]:
        """Return metadata for all saved sessions, most recently updated first."""
        summaries: list[SessionSummary] = []
        for path in self.history_dir.glob("*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                logger.warning("Skipping unreadable session file: %s", path)
                continue
            summaries.append(
                SessionSummary(
                    session_id=data.get("session_id", path.stem),
                    title=data.get("title", "New conversation"),
                    created_at=data.get("created_at", ""),
                    updated_at=data.get("updated_at", ""),
                    message_count=len(data.get("messages", [])),
                )
            )
        summaries.sort(key=lambda s: s.updated_at, reverse=True)
        return summaries

    def delete(self, session_id: str) -> None:
        path = self._path_for(session_id)
        if path.exists():
            path.unlink()
            logger.info("Deleted session %s", session_id)
