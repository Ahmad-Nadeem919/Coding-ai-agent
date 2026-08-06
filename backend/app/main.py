"""FastAPI entry point for the coding agent API.

Run with (from the ``backend`` directory):

    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat, files, sessions, settings, shell
from app.state import get_state
from utils import setup_logging

# Load .env before reading FRONTEND_ORIGIN below -- Config.load() (called lazily
# via get_state()) also loads it, but that happens after CORS middleware is
# configured, which is too late for FRONTEND_ORIGIN to have any effect.
load_dotenv(override=False)

logger = logging.getLogger("coding_agent.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    state = get_state()
    setup_logging(state.config.log_dir, state.config.log_level)
    logger.warning(
        "Coding Agent API starting. workdir=%s model=%s. "
        "/api/shell/run executes arbitrary shell commands with this process's permissions "
        "and /api/files write/delete/rename mutate files on disk (backups are kept) "
        "-- do not expose this server beyond localhost.",
        state.config.workdir,
        state.config.model_name,
    )
    yield


app = FastAPI(title="Coding Agent API", version="1.0.0", lifespan=lifespan)

_frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(files.router)
app.include_router(shell.router)
app.include_router(settings.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
