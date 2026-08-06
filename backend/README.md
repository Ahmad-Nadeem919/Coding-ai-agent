# Coding Agent

A terminal-based AI coding agent that chats, generates, edits, and manages
code using Google's Gemini 2.5 Flash model. Built with `google-genai`,
`Typer`, and `Rich`.

## Features

- Natural-language chat with streaming, Markdown-rendered, syntax-highlighted
  responses
- Code generation, modification, explanation, debugging, and refactoring
- Whole-project generation via a structured file-block protocol
- Safe filesystem tools: read, write, edit, delete (with backup), rename,
  and search files, plus a directory tree view
- Run shell commands from within the session (confirmation required)
- Persistent, resumable conversation history stored locally
- Large-context conversations with automatic history trimming

## Installation

```bash
cd coding-agent
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set your API key:

```
GEMINI_API_KEY=your-api-key-here
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

## Usage

Start an interactive session in the current directory:

```bash
python main.py
```

Useful flags:

```bash
python main.py --model gemini-2.5-flash --temperature 0.4
python main.py --workdir /path/to/project
python main.py --resume <session-id>
python main.py sessions   # list saved sessions without starting a chat
```

## Commands

| Command | Description |
| --- | --- |
| `/help` | Show all commands |
| `/new` | Start a new, empty conversation session |
| `/history [id]` | List saved sessions, or resume the given one |
| `/clear` | Clear the screen and reset the current conversation |
| `/model [name\|temperature=X]` | Show or change the active model/temperature |
| `/read <file>` | Display a file and share it with the assistant |
| `/write <file>` | Ask the assistant to generate a new file |
| `/edit <file>` | Ask the assistant to modify an existing file |
| `/delete <file>` | Delete a file (confirmation required, backup kept) |
| `/rename <src> <dst>` | Rename or move a file |
| `/tree [path]` | Show the project directory tree |
| `/search <query>` | Search project files for text |
| `/run <command>` | Run a shell command (confirmation required) |
| `/exit` | Save and exit |

Anything not starting with `/` is sent to the assistant as a chat message.

## How file generation works

When the model needs to create or update files, it emits them wrapped as:

```
===FILE: relative/path/to/file.ext
<complete file content>
===END FILE===
```

The agent parses these blocks out of the response, shows a summary table of
proposed changes, and — after you confirm — writes them to disk, backing up
any file that already exists.

## HTTP API

The same agent is also exposed as a FastAPI app (`app/`) for the Next.js
frontend, or any other HTTP client. It reuses every module above — no logic
is duplicated — and is stateless between requests: each chat/session
endpoint reads and writes the same `~/.coding_agent/history` files the CLI
uses, so `python main.py` and the API can resume each other's sessions.

Start it (from the `backend` directory, with the venv activated):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive docs: `http://localhost:8000/docs`.

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Liveness check |
| `GET /api/sessions` | List saved sessions |
| `POST /api/sessions` | Create a new, empty session |
| `GET /api/sessions/{id}` | Get a session with full message history |
| `DELETE /api/sessions/{id}` | Delete a session |
| `POST /api/chat/stream` | `{message, session_id?}` → NDJSON stream of `chunk`/`warning`/`error`/`done` events. `done` includes any parsed file blocks. |
| `GET /api/settings` | Current model name + temperature |
| `PUT /api/settings` | `{model_name?, temperature?}` |
| `GET /api/files/tree?path=.` | Directory tree |
| `GET /api/files/content?path=` | Read a file |
| `POST /api/files/write` | `{path, content}` — write a file (backs up existing) |
| `POST /api/files/apply-blocks` | `{blocks: [{path, content}]}` — write file blocks proposed by a chat reply |
| `DELETE /api/files?path=` | Delete a file (backup kept) |
| `POST /api/files/rename` | `{src, dst}` |
| `GET /api/files/search?query=` | Search project files for text |
| `POST /api/shell/run` | `{command, timeout?}` — run a shell command in the workdir |

Configuration (env vars, in addition to the ones in `.env`):

- `CODING_AGENT_WORKDIR` — project directory the file/shell tools operate in (default: the directory `uvicorn` is started from).
- `FRONTEND_ORIGIN` — comma-separated CORS origin(s) allowed to call the API (default: `http://localhost:3000`).

### Security

`/api/shell/run` executes arbitrary shell commands with the API process's
own OS permissions, and the `/api/files` write/delete/rename endpoints
mutate files on disk (backups are kept, but there is no server-side
confirmation prompt like the CLI's). The frontend is expected to confirm
destructive actions client-side before calling these endpoints. **Do not
expose this server beyond localhost / your own trusted network** — there is
no authentication layer.

## Project layout

```
coding-agent/
├── main.py           CLI entry point (Typer)
├── agent.py           REPL, command dispatch, chat orchestration
├── gemini_client.py    Gemini API wrapper (streaming, retries)
├── tools.py            File-block parsing, shell command execution
├── config.py            Configuration loading from .env
├── prompts.py            System prompt and file-block protocol
├── memory.py             In-session conversation state
├── filesystem.py           Safe, sandboxed file operations
├── history.py                Session persistence (save/list/resume)
├── utils.py                   Logging, console, formatting helpers
├── app/                        FastAPI wrapper (see "HTTP API" above)
│   ├── main.py                   App instance, CORS, router registration
│   ├── state.py                   Shared Config/GeminiClient/HistoryManager singleton
│   ├── schemas.py                 Pydantic request/response models
│   └── routers/                   sessions, chat, files, shell, settings
├── requirements.txt
├── .env.example
└── README.md
```

## Data storage

The agent stores its data under `~/.coding_agent/`:

- `history/` — saved conversation sessions (JSON)
- `backups/` — timestamped backups made before any file is overwritten or deleted
- `logs/` — application logs

## Notes

- All file operations are sandboxed to the working directory (`--workdir`,
  default: the current directory) and cannot escape it.
- `/run` and `/delete` always ask for confirmation before acting.
- Transient Gemini API errors are retried automatically with exponential
  backoff; persistent or authentication failures are reported immediately.
