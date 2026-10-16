"""Shared, process-wide agent state for the FastAPI app.

The API is single-user and single-process, so a lazily-built singleton
(mirroring what ``CodingAgent`` wires up for the CLI) is sufficient: one
``Config``, one ``GeminiClient``, one ``HistoryManager``. Individual chat
sessions are not held in memory between requests — they are loaded from and
saved back to disk via ``HistoryManager`` on every call, so multiple browser
tabs/sessions can be used concurrently without shared mutable chat state.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from config import Config
from gemini_client import GeminiClient
from history import HistoryManager


@dataclass
class AppState:
    config: Config
    client: GeminiClient
    history_manager: HistoryManager


@lru_cache
def get_state() -> AppState:
    overrides: dict[str, object] = {}
    workdir = os.getenv("CODING_AGENT_WORKDIR")
    if workdir:
        overrides["workdir"] = workdir

    config = Config.load(**overrides)
    client = GeminiClient(
        api_key=config.gemini_api_key,
        model_name=config.model_name,
        max_retries=config.max_retries,
        timeout=config.request_timeout,
        web_search=config.web_search,
    )
    history_manager = HistoryManager(config.history_dir)
    return AppState(config=config, client=client, history_manager=history_manager)
