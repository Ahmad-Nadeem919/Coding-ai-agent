"""In-memory conversation state for a single chat session."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

VALID_ROLES = {"user", "assistant"}
_ROLE_TO_GEMINI = {"user": "user", "assistant": "model"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_session_id() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class Message:
    """A single turn in a conversation."""

    role: str
    content: str
    timestamp: str = field(default_factory=_now_iso)

    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content, "timestamp": self.timestamp}

    @classmethod
    def from_dict(cls, data: dict) -> "Message":
        return cls(role=data["role"], content=data["content"], timestamp=data.get("timestamp", _now_iso()))


@dataclass
class ConversationMemory:
    """Holds the message history for one conversation session.

    Supports very large prompts/histories by trimming the oldest messages
    once configurable soft limits are exceeded, always keeping the most
    recent context intact.
    """

    session_id: str = field(default_factory=new_session_id)
    title: str = "New conversation"
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)
    messages: list[Message] = field(default_factory=list)

    def add(self, role: str, content: str) -> Message:
        if role not in VALID_ROLES:
            raise ValueError(f"Invalid role: {role!r}. Expected one of {VALID_ROLES}.")
        message = Message(role=role, content=content)
        self.messages.append(message)
        self.updated_at = message.timestamp
        if self.title == "New conversation" and role == "user":
            self.title = _derive_title(content)
        return message

    def clear(self) -> None:
        self.messages.clear()
        self.title = "New conversation"
        self.updated_at = _now_iso()

    def trim(self, max_messages: int, max_chars: int) -> None:
        """Drop the oldest messages once soft limits are exceeded."""
        if len(self.messages) > max_messages:
            self.messages = self.messages[-max_messages:]

        total_chars = sum(len(m.content) for m in self.messages)
        while total_chars > max_chars and len(self.messages) > 2:
            removed = self.messages.pop(0)
            total_chars -= len(removed.content)

    def to_gemini_contents(self) -> list[dict]:
        """Convert stored messages into the Gemini ``contents`` format."""
        return [
            {"role": _ROLE_TO_GEMINI[m.role], "parts": [{"text": m.content}]}
            for m in self.messages
        ]

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "title": self.title,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "messages": [m.to_dict() for m in self.messages],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ConversationMemory":
        return cls(
            session_id=data["session_id"],
            title=data.get("title", "New conversation"),
            created_at=data.get("created_at", _now_iso()),
            updated_at=data.get("updated_at", _now_iso()),
            messages=[Message.from_dict(m) for m in data.get("messages", [])],
        )


def _derive_title(first_message: str, max_len: int = 60) -> str:
    single_line = " ".join(first_message.strip().split())
    if len(single_line) <= max_len:
        return single_line or "New conversation"
    return single_line[: max_len - 1].rstrip() + "…"
