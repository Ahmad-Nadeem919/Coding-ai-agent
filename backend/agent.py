"""The CodingAgent: orchestrates the REPL, commands, memory, and the model."""

from __future__ import annotations

import logging
from pathlib import Path

from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt
from rich.syntax import Syntax
from rich.table import Table

import filesystem
import tools
from config import Config
from gemini_client import GeminiClient, GeminiClientError
from history import HistoryManager
from memory import ConversationMemory
from prompts import FILE_BLOCK_END, FILE_BLOCK_START, SYSTEM_PROMPT
from utils import (
    confirm,
    console,
    detect_lexer,
    human_size,
    print_error,
    print_info,
    print_success,
    print_warning,
    render_tree,
    setup_logging,
)

logger = logging.getLogger("coding_agent.agent")

HELP_ROWS: list[tuple[str, str]] = [
    ("/help", "Show this help message"),
    ("/new", "Start a new, empty conversation session"),
    ("/history [id]", "List saved sessions, or resume the given one"),
    ("/clear", "Clear the screen and reset the current conversation"),
    ("/model [name|temperature=X]", "Show or change the active model/temperature"),
    ("/read <file>", "Display a file and share it with the assistant"),
    ("/write <file>", "Ask the assistant to generate a new file"),
    ("/edit <file>", "Ask the assistant to modify an existing file"),
    ("/delete <file>", "Delete a file (confirmation required, backup kept)"),
    ("/rename <src> <dst>", "Rename or move a file"),
    ("/tree [path]", "Show the project directory tree"),
    ("/search <query>", "Search project files for text"),
    ("/run <command>", "Run a shell command (confirmation required)"),
    ("/exit", "Save and exit"),
]


class CodingAgent:
    """Drives the interactive terminal session."""

    def __init__(self, config: Config, session_id: str | None = None) -> None:
        self.config = config
        self.console = console
        setup_logging(config.log_dir, config.log_level)

        self.client = GeminiClient(
            api_key=config.gemini_api_key,
            model_name=config.model_name,
            max_retries=config.max_retries,
            timeout=config.request_timeout,
        )
        self.history_manager = HistoryManager(config.history_dir)
        self.workdir = config.workdir

        if session_id:
            try:
                self.memory: ConversationMemory = self.history_manager.load(session_id)
                print_info(f"Resumed session '{self.memory.session_id}' ({len(self.memory.messages)} messages).")
            except (FileNotFoundError, ValueError) as exc:
                print_warning(f"{exc} Starting a new session instead.")
                self.memory = self.history_manager.new_session()
        else:
            self.memory = self.history_manager.new_session()

        self._exit_requested = False
        self._commands = {
            "/help": self.cmd_help,
            "/new": self.cmd_new,
            "/history": self.cmd_history,
            "/clear": self.cmd_clear,
            "/model": self.cmd_model,
            "/exit": self.cmd_exit,
            "/quit": self.cmd_exit,
            "/read": self.cmd_read,
            "/write": self.cmd_write,
            "/edit": self.cmd_edit,
            "/delete": self.cmd_delete,
            "/rename": self.cmd_rename,
            "/tree": self.cmd_tree,
            "/search": self.cmd_search,
            "/run": self.cmd_run,
        }

    # ------------------------------------------------------------------ #
    # Main loop
    # ------------------------------------------------------------------ #

    def run(self) -> None:
        self._print_welcome()
        while not self._exit_requested:
            try:
                user_input = Prompt.ask("\n[bold cyan]you[/bold cyan]")
            except (EOFError, KeyboardInterrupt):
                self.console.print()
                self.cmd_exit("")
                break

            stripped = user_input.strip()
            if not stripped:
                continue

            if stripped.startswith("/"):
                self._dispatch_command(stripped)
            else:
                self._chat_turn(stripped)

    def _print_welcome(self) -> None:
        self.console.print(
            Panel(
                f"[accent]Coding Agent[/accent] — powered by Gemini ({self.config.model_name})\n"
                f"Working directory: [muted]{self.workdir}[/muted]\n"
                f"Session: [muted]{self.memory.session_id}[/muted]\n"
                "Type a message to chat, or [bold]/help[/bold] for commands.",
                border_style="accent",
                title="Welcome",
                title_align="left",
            )
        )

    def _dispatch_command(self, raw: str) -> None:
        parts = raw.split(maxsplit=1)
        name = parts[0].lower()
        arg = parts[1] if len(parts) > 1 else ""
        handler = self._commands.get(name)
        if handler is None:
            print_error(f"Unknown command: {name}. Type /help for a list of commands.")
            return
        try:
            handler(arg)
        except filesystem.PathSecurityError as exc:
            print_error(str(exc))
        except (FileNotFoundError, IsADirectoryError, NotADirectoryError, FileExistsError) as exc:
            print_error(str(exc))
        except Exception as exc:  # noqa: BLE001 - keep the REPL alive on any command failure
            logger.exception("Command '%s' failed", name)
            print_error(f"Command failed: {exc}")

    # ------------------------------------------------------------------ #
    # Chat
    # ------------------------------------------------------------------ #

    def _chat_turn(self, user_input: str, announce: str | None = None) -> None:
        if announce:
            print_info(announce)

        self.memory.add("user", user_input)
        self.memory.trim(self.config.max_history_messages, self.config.max_history_chars)
        contents = self.memory.to_gemini_contents()

        self.console.print()
        full_text = ""
        error: Exception | None = None

        try:
            with Live(console=self.console, refresh_per_second=12, vertical_overflow="visible") as live:
                live.update(Panel("[muted]thinking…[/muted]", title="assistant", border_style="green"))
                for chunk in self.client.stream_chat(
                    contents,
                    system_prompt=SYSTEM_PROMPT,
                    temperature=self.config.temperature,
                    max_output_tokens=self.config.max_output_tokens,
                ):
                    full_text += chunk
                    live.update(Panel(Markdown(full_text), title="assistant", border_style="green"))
        except GeminiClientError as exc:
            error = exc

        if error is not None:
            if full_text:
                print_warning(f"Response interrupted: {error}")
            else:
                print_error(str(error))
                self.memory.messages.pop()  # drop the user turn; no assistant reply was produced
                return

        self.memory.add("assistant", full_text)
        self.history_manager.save(self.memory)
        self._maybe_apply_file_blocks(full_text)

    def _maybe_apply_file_blocks(self, text: str) -> None:
        blocks = tools.parse_file_blocks(text)
        if not blocks:
            return

        table = Table(title="Proposed file changes", show_lines=False)
        table.add_column("Path", style="accent")
        table.add_column("Lines", justify="right")
        table.add_column("Size", justify="right")
        for block in blocks:
            table.add_row(block.path, str(block.content.count("\n") + 1), human_size(len(block.content.encode("utf-8"))))
        self.console.print(table)

        if confirm(f"Write {len(blocks)} file(s) to disk?", default=True):
            written = tools.apply_file_blocks(blocks, self.workdir, self.config.backup_dir)
            for path in written:
                print_success(f"Wrote {path.relative_to(self.workdir)}")
        else:
            print_info("Discarded proposed file changes.")

    # ------------------------------------------------------------------ #
    # Commands
    # ------------------------------------------------------------------ #

    def cmd_help(self, _arg: str) -> None:
        table = Table(title="Commands", show_lines=False)
        table.add_column("Command", style="accent", no_wrap=True)
        table.add_column("Description")
        for cmd, desc in HELP_ROWS:
            table.add_row(cmd, desc)
        self.console.print(table)

    def cmd_new(self, _arg: str) -> None:
        if self.memory.messages:
            self.history_manager.save(self.memory)
        self.memory = self.history_manager.new_session()
        print_success(f"Started new session '{self.memory.session_id}'.")

    def cmd_history(self, arg: str) -> None:
        arg = arg.strip()
        if not arg:
            sessions = self.history_manager.list_sessions()
            if not sessions:
                print_info("No saved sessions yet.")
                return
            table = Table(title="Saved sessions", show_lines=False)
            table.add_column("ID", style="accent")
            table.add_column("Title")
            table.add_column("Messages", justify="right")
            table.add_column("Updated")
            for s in sessions:
                table.add_row(s.session_id, s.title, str(s.message_count), s.updated_at)
            self.console.print(table)
            print_info("Resume one with: /history <id>")
            return

        if self.memory.messages:
            self.history_manager.save(self.memory)
        self.memory = self.history_manager.load(arg)
        print_success(f"Resumed session '{self.memory.session_id}' ({len(self.memory.messages)} messages).")

    def cmd_clear(self, _arg: str) -> None:
        self.console.clear()
        self.memory.clear()
        print_info("Conversation context cleared.")

    def cmd_model(self, arg: str) -> None:
        arg = arg.strip()
        if not arg:
            print_info(f"Model: {self.config.model_name} | Temperature: {self.config.temperature}")
            return
        if arg.lower().startswith("temperature="):
            try:
                value = float(arg.split("=", 1)[1])
            except ValueError:
                print_error("Temperature must be a number, e.g. /model temperature=0.5")
                return
            self.config.temperature = value
            print_success(f"Temperature set to {value}.")
            return

        self.config.model_name = arg
        self.client.set_model(arg)
        print_success(f"Model set to {arg}.")

    def cmd_exit(self, _arg: str) -> None:
        if self.memory.messages:
            self.history_manager.save(self.memory)
        print_info("Session saved. Goodbye!")
        self._exit_requested = True

    def cmd_read(self, arg: str) -> None:
        path = self._require_arg(arg, "Usage: /read <file>")
        if path is None:
            return
        content = filesystem.read_file(self.workdir, path)
        syntax = Syntax(content, detect_lexer(path), line_numbers=True, word_wrap=False)
        self.console.print(Panel(syntax, title=path, border_style="accent"))
        self.memory.add(
            "user",
            f"[Shared file '{path}' for context]\n```\n{content}\n```",
        )

    def cmd_write(self, arg: str) -> None:
        path = self._require_arg(arg, "Usage: /write <file>")
        if path is None:
            return
        prompt = (
            f"Create the file at `{path}`. Respond only with the file, using the "
            f"file-block format described in your instructions. Base its contents on "
            f"the current conversation context; if nothing relevant has been "
            f"discussed yet, use sensible, well-documented defaults appropriate for "
            f"a file at this path."
        )
        self._chat_turn(prompt, announce=f"Asking the assistant to write {path}…")

    def cmd_edit(self, arg: str) -> None:
        path = self._require_arg(arg, "Usage: /edit <file>")
        if path is None:
            return
        content = filesystem.read_file(self.workdir, path)
        instructions = Prompt.ask("What changes would you like?")
        if not instructions.strip():
            print_info("No changes requested.")
            return
        prompt = (
            f"Here is the current content of `{path}`:\n\n"
            f"{FILE_BLOCK_START} {path}\n{content}\n{FILE_BLOCK_END}\n\n"
            f"Apply the following change and respond with the complete updated "
            f"file using the same file-block format:\n{instructions}"
        )
        self._chat_turn(prompt, announce=f"Asking the assistant to update {path}…")

    def cmd_delete(self, arg: str) -> None:
        path = self._require_arg(arg, "Usage: /delete <file>")
        if path is None:
            return
        if not confirm(f"Delete '{path}'? A backup will be kept.", default=False):
            print_info("Cancelled.")
            return
        filesystem.delete_file(self.workdir, path, self.config.backup_dir)
        print_success(f"Deleted {path} (backup saved).")

    def cmd_rename(self, arg: str) -> None:
        parts = arg.split(maxsplit=1)
        if len(parts) != 2:
            print_error("Usage: /rename <src> <dst>")
            return
        src, dst = parts
        result = filesystem.rename_file(self.workdir, src, dst)
        print_success(f"Renamed {src} -> {result.relative_to(self.workdir)}")

    def cmd_tree(self, arg: str) -> None:
        root = arg.strip() or "."
        entries = filesystem.list_tree(self.workdir, root=root)
        label = self.workdir.name if root == "." else root
        self.console.print(render_tree(entries, root_label=label))

    def cmd_search(self, arg: str) -> None:
        pattern = arg.strip() or Prompt.ask("Search pattern")
        if not pattern:
            print_info("No pattern given.")
            return
        results = filesystem.search_files(self.workdir, pattern)
        if not results:
            print_info(f"No matches for '{pattern}'.")
            return
        table = Table(title=f"Matches for '{pattern}' ({len(results)})", show_lines=False)
        table.add_column("File", style="accent")
        table.add_column("Line", justify="right")
        table.add_column("Text")
        for r in results[:200]:
            table.add_row(str(r.file), str(r.line_number), r.line[:120])
        self.console.print(table)
        if len(results) > 200:
            print_info(f"Showing first 200 of {len(results)} matches.")

    def cmd_run(self, arg: str) -> None:
        command = arg.strip() or Prompt.ask("Command to run")
        if not command:
            print_info("No command given.")
            return
        if not confirm(f"Run '{command}' in {self.workdir}?", default=False):
            print_info("Cancelled.")
            return
        result = tools.run_shell_command(command, self.workdir)
        if result.stdout:
            self.console.print(Panel(result.stdout.rstrip(), title="stdout", border_style="green"))
        if result.stderr:
            self.console.print(Panel(result.stderr.rstrip(), title="stderr", border_style="warning"))
        style = "success" if result.returncode == 0 else "error"
        self.console.print(f"[{style}]Exit code: {result.returncode}[/{style}]")

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _require_arg(self, arg: str, usage: str) -> str | None:
        arg = arg.strip()
        if not arg:
            print_error(usage)
            return None
        return arg
