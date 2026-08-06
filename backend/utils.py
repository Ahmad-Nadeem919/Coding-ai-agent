"""Shared utilities: logging setup, console/UI helpers, and small formatters."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm
from rich.theme import Theme
from rich.tree import Tree

# Windows terminals often default to a legacy codepage (e.g. cp1252) that
# cannot render the Unicode symbols used throughout the UI. Force UTF-8 on
# stdout/stderr so streamed Markdown, checkmarks, and tree glyphs never crash
# the process regardless of the host console's configured codepage.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

THEME = Theme(
    {
        "info": "cyan",
        "success": "bold green",
        "warning": "bold yellow",
        "error": "bold red",
        "muted": "grey62",
        "accent": "bold magenta",
    }
)

console = Console(theme=THEME, highlight=False)

_EXTENSION_LEXER_MAP = {
    ".py": "python",
    ".pyi": "python",
    ".js": "javascript",
    ".jsx": "jsx",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".json": "json",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".toml": "toml",
    ".md": "markdown",
    ".markdown": "markdown",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "scss",
    ".sql": "sql",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".ps1": "powershell",
    ".java": "java",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".kt": "kotlin",
    ".swift": "swift",
    ".xml": "xml",
    ".dockerfile": "dockerfile",
    ".ini": "ini",
    ".cfg": "ini",
    ".env": "bash",
    ".txt": "text",
}


def setup_logging(log_dir: Path, level: str = "INFO") -> logging.Logger:
    """Configure application-wide logging to both a rotating file and memory.

    Returns the root logger for the ``coding_agent`` namespace.
    """
    logger = logging.getLogger("coding_agent")
    logger.setLevel(level.upper())
    logger.propagate = False

    if logger.handlers:
        return logger

    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "coding_agent.log"

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )
    logger.addHandler(file_handler)
    return logger


def detect_lexer(path: str | Path) -> str:
    """Guess a Pygments lexer name for syntax highlighting from a file extension."""
    suffix = Path(path).suffix.lower()
    name = Path(path).name.lower()
    if name == "dockerfile":
        return "dockerfile"
    if name == "makefile":
        return "makefile"
    return _EXTENSION_LEXER_MAP.get(suffix, "text")


def human_size(num_bytes: int) -> str:
    """Format a byte count as a short human-readable string."""
    size = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024 or unit == "TB":
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def truncate(text: str, max_len: int = 2000, suffix: str = "\n… [truncated]") -> str:
    """Truncate ``text`` to at most ``max_len`` characters."""
    if len(text) <= max_len:
        return text
    return text[:max_len] + suffix


def confirm(question: str, default: bool = False) -> bool:
    """Prompt the user for a yes/no confirmation."""
    return Confirm.ask(f"[warning]{question}[/warning]", default=default, console=console)


def print_error(message: str) -> None:
    console.print(Panel(message, title="Error", border_style="error", title_align="left"))


def print_success(message: str) -> None:
    console.print(f"[success]✓ {message}[/success]")


def print_info(message: str) -> None:
    console.print(f"[info]{message}[/info]")


def print_warning(message: str) -> None:
    console.print(f"[warning]! {message}[/warning]")


def render_tree(
    entries: list[tuple[int, str, bool]],
    root_label: str,
) -> Tree:
    """Render a flat list of ``(depth, name, is_dir)`` entries as a Rich Tree.

    ``entries`` must be in depth-first pre-order, as produced by
    :func:`filesystem.list_tree`.
    """
    tree = Tree(f"[accent]{root_label}[/accent]")
    stack: list[Tree] = [tree]
    for depth, name, is_dir in entries:
        while len(stack) > depth + 1:
            stack.pop()
        label = f"[bold blue]{name}/[/bold blue]" if is_dir else name
        node = stack[-1].add(label)
        if is_dir:
            stack.append(node)
    return tree
