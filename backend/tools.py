"""Higher-level agent tools built on top of filesystem primitives.

This module bridges model output and the filesystem: parsing the file-block
protocol described in ``prompts.py`` out of a model response, and running
shell commands on behalf of the user.
"""

from __future__ import annotations

import dataclasses
import logging
import re
import subprocess
from pathlib import Path

import filesystem
from prompts import FILE_BLOCK_END, FILE_BLOCK_START

logger = logging.getLogger("coding_agent.tools")

_FILE_BLOCK_RE = re.compile(
    re.escape(FILE_BLOCK_START) + r"[ \t]*(?P<path>[^\r\n]+?)[ \t]*\r?\n"
    r"(?P<content>.*?)"
    r"\r?\n?" + re.escape(FILE_BLOCK_END),
    re.DOTALL,
)


@dataclasses.dataclass
class FileBlock:
    """A single file emitted by the model, ready to be written to disk."""

    path: str
    content: str


@dataclasses.dataclass
class CommandResult:
    """The outcome of running a shell command."""

    command: str
    returncode: int
    stdout: str
    stderr: str
    timed_out: bool = False


def parse_file_blocks(text: str) -> list[FileBlock]:
    """Extract all file blocks from a model response."""
    blocks: list[FileBlock] = []
    for match in _FILE_BLOCK_RE.finditer(text):
        path = match.group("path").strip()
        content = match.group("content")
        blocks.append(FileBlock(path=path, content=content))
    return blocks


def apply_file_blocks(
    blocks: list[FileBlock],
    workdir: Path,
    backup_dir: Path,
) -> list[Path]:
    """Write each file block to disk, backing up any existing file first."""
    written: list[Path] = []
    for block in blocks:
        resolved = filesystem.write_file(workdir, block.path, block.content, backup_dir=backup_dir)
        written.append(resolved)
    return written


def run_shell_command(
    command: str,
    workdir: Path,
    timeout: int = 120,
) -> CommandResult:
    """Run a shell command in ``workdir`` and capture its output.

    The command is executed exactly as provided by the user via the
    ``/run`` command, which requires explicit confirmation before this
    function is called.
    """
    logger.info("Running command: %s", command)
    try:
        proc = subprocess.run(
            command,
            shell=True,
            cwd=str(workdir),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return CommandResult(
            command=command,
            returncode=proc.returncode,
            stdout=proc.stdout,
            stderr=proc.stderr,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode("utf-8", errors="replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        stderr = exc.stderr.decode("utf-8", errors="replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        return CommandResult(
            command=command,
            returncode=-1,
            stdout=stdout,
            stderr=stderr + f"\n[Command timed out after {timeout}s]",
            timed_out=True,
        )
