"""Configuration loading and management for the coding agent.

Centralizes all runtime configuration: API credentials, model parameters,
and the on-disk locations used for history and backups. Configuration is
sourced from environment variables (optionally loaded from a `.env` file)
with sane defaults for everything except the Gemini API key.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_OUTPUT_TOKENS = 8192
DEFAULT_MAX_RETRIES = 5
DEFAULT_REQUEST_TIMEOUT = 120
APP_DIR_NAME = ".coding_agent"


def _default_app_dir() -> Path:
    """Return (and create) the directory used to store agent data."""
    app_dir = Path.home() / APP_DIR_NAME
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir


@dataclass
class Config:
    """Runtime configuration for the coding agent.

    Attributes:
        gemini_api_key: API key used to authenticate with the Gemini API.
        model_name: Gemini model identifier to use for generation.
        temperature: Sampling temperature passed to the model.
        max_output_tokens: Maximum number of tokens the model may generate.
        streaming: Whether responses should be streamed to the terminal.
        workdir: Root directory the agent's filesystem tools operate within.
        app_dir: Root directory used to persist agent data on disk.
        history_dir: Directory where conversation sessions are stored.
        backup_dir: Directory where file backups are written before edits.
        log_dir: Directory where log files are written.
        log_level: Logging verbosity, e.g. "INFO" or "DEBUG".
        max_history_messages: Soft cap on messages kept in active memory.
        max_history_chars: Soft cap on total characters kept in active memory.
        request_timeout: Per-request timeout (seconds) for the Gemini API.
        max_retries: Maximum retry attempts for transient API failures.
        web_search: Whether the model may ground responses with live Google
            Search results.
    """

    gemini_api_key: str
    model_name: str = DEFAULT_MODEL
    temperature: float = DEFAULT_TEMPERATURE
    max_output_tokens: int = DEFAULT_MAX_OUTPUT_TOKENS
    streaming: bool = True
    web_search: bool = True
    workdir: Path = field(default_factory=Path.cwd)
    app_dir: Path = field(default_factory=_default_app_dir)
    history_dir: Path = field(init=False)
    backup_dir: Path = field(init=False)
    log_dir: Path = field(init=False)
    log_level: str = "INFO"
    max_history_messages: int = 200
    max_history_chars: int = 400_000
    request_timeout: int = DEFAULT_REQUEST_TIMEOUT
    max_retries: int = DEFAULT_MAX_RETRIES

    def __post_init__(self) -> None:
        self.workdir = Path(self.workdir).expanduser().resolve()
        self.app_dir = Path(self.app_dir).expanduser()
        self.history_dir = self.app_dir / "history"
        self.backup_dir = self.app_dir / "backups"
        self.log_dir = self.app_dir / "logs"
        for directory in (self.app_dir, self.history_dir, self.backup_dir, self.log_dir):
            directory.mkdir(parents=True, exist_ok=True)

    @classmethod
    def load(cls, env_file: Path | None = None, **overrides: object) -> "Config":
        """Build a :class:`Config` from environment variables and overrides.

        Environment variables are loaded from ``env_file`` if provided,
        otherwise from a ``.env`` file discovered relative to the current
        working directory. Explicit ``overrides`` (e.g. from CLI flags)
        always take precedence over environment-derived values.
        """
        if env_file is not None:
            load_dotenv(dotenv_path=env_file, override=False)
        else:
            load_dotenv(override=False)

        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            print(
                "ERROR: GEMINI_API_KEY is not set.\n"
                "Create a .env file in the project root (see .env.example) "
                "or export the variable before launching:\n"
                "  GEMINI_API_KEY=your-api-key-here",
                file=sys.stderr,
            )
            raise SystemExit(1)

        params: dict[str, object] = {
            "gemini_api_key": api_key,
            "model_name": os.getenv("GEMINI_MODEL", DEFAULT_MODEL),
            "temperature": float(os.getenv("GEMINI_TEMPERATURE", DEFAULT_TEMPERATURE)),
            "max_output_tokens": int(
                os.getenv("GEMINI_MAX_OUTPUT_TOKENS", DEFAULT_MAX_OUTPUT_TOKENS)
            ),
            "log_level": os.getenv("CODING_AGENT_LOG_LEVEL", "INFO"),
            "max_retries": int(os.getenv("GEMINI_MAX_RETRIES", DEFAULT_MAX_RETRIES)),
            "request_timeout": int(
                os.getenv("GEMINI_REQUEST_TIMEOUT", DEFAULT_REQUEST_TIMEOUT)
            ),
            "web_search": os.getenv("GEMINI_WEB_SEARCH", "true").strip().lower()
            not in ("0", "false", "no", "off"),
        }

        for key, value in overrides.items():
            if value is not None:
                params[key] = value

        return cls(**params)  # type: ignore[arg-type]
