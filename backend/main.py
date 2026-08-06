"""CLI entry point for the coding agent, built with Typer."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import typer
from rich.table import Table

from agent import CodingAgent
from config import Config
from history import HistoryManager
from utils import console, print_error, print_info

app = typer.Typer(
    add_completion=False,
    help="A terminal-based AI coding agent powered by Gemini 2.5 Flash.",
)


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    model: Optional[str] = typer.Option(None, "--model", "-m", help="Override the Gemini model name."),
    temperature: Optional[float] = typer.Option(
        None, "--temperature", "-t", help="Override the sampling temperature."
    ),
    resume: Optional[str] = typer.Option(
        None, "--resume", "-r", help="Resume a previous session by ID."
    ),
    workdir: Optional[Path] = typer.Option(
        None, "--workdir", "-w", help="Project directory the agent operates in."
    ),
) -> None:
    """Launch the interactive coding agent (default when no subcommand is given)."""
    if ctx.invoked_subcommand is not None:
        return

    overrides: dict[str, object] = {}
    if model is not None:
        overrides["model_name"] = model
    if temperature is not None:
        overrides["temperature"] = temperature
    if workdir is not None:
        overrides["workdir"] = workdir

    config = Config.load(**overrides)

    try:
        agent = CodingAgent(config, session_id=resume)
    except Exception as exc:  # noqa: BLE001
        print_error(f"Failed to start the coding agent: {exc}")
        raise typer.Exit(code=1) from None

    agent.run()


@app.command()
def sessions() -> None:
    """List all saved conversation sessions without starting the agent."""
    config = Config.load()
    history_manager = HistoryManager(config.history_dir)
    saved = history_manager.list_sessions()
    if not saved:
        print_info("No saved sessions yet.")
        raise typer.Exit()

    table = Table(title="Saved sessions", show_lines=False)
    table.add_column("ID", style="accent")
    table.add_column("Title")
    table.add_column("Messages", justify="right")
    table.add_column("Updated")
    for s in saved:
        table.add_row(s.session_id, s.title, str(s.message_count), s.updated_at)
    console.print(table)


def run() -> None:
    """Console-script entry point."""
    app()


if __name__ == "__main__":
    run()
