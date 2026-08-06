"""Shell command execution.

Mirrors the CLI's ``/run`` command. There is no server-side confirmation
step here — the HTTP request itself is the user's explicit action, so the
frontend MUST present its own confirmation prompt before calling this
endpoint. This executes arbitrary shell commands with the API process's own
permissions; never expose this server beyond localhost.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

import tools
from app.schemas import RunCommandRequest, RunCommandResponse
from app.state import AppState, get_state

router = APIRouter(prefix="/api/shell", tags=["shell"])


@router.post("/run", response_model=RunCommandResponse)
def run_command(req: RunCommandRequest, state: AppState = Depends(get_state)) -> RunCommandResponse:
    result = tools.run_shell_command(req.command, state.config.workdir, timeout=req.timeout)
    return RunCommandResponse(
        command=result.command,
        returncode=result.returncode,
        stdout=result.stdout,
        stderr=result.stderr,
        timed_out=result.timed_out,
    )
