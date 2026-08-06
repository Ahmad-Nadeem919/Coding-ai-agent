You are a senior AI software engineer.

Your task is to write the COMPLETE source code for a terminal-based AI coding agent.

The project must be production-quality and fully functional.

## Goal

Build a CLI coding agent that accepts natural language programming requests from the user and generates code using the Gemini API.

The generated project should be clean, modular, and extensible.

Do not provide explanations.

Only generate the project files.

The project should be complete and runnable.

## Tech Stack

Language:
- Python 3.12+

AI Model:
- Gemini 2.5 Flash

SDK:
- google-genai

CLI:
- Rich
- Typer

Configuration:
- .env

Environment Variables:
GEMINI_API_KEY=

## Features

Create a coding assistant that can:

- Chat with the user
- Generate code
- Modify code
- Explain code
- Debug code
- Refactor code
- Generate entire projects
- Read existing files
- Edit existing files
- Create new files
- Delete files (after confirmation)
- Rename files
- Search project files
- Maintain conversation history
- Support very large prompts
- Stream model responses
- Support Markdown output
- Support syntax highlighting
- Save chat history
- Resume previous conversations

## Commands

/help

/new

/history

/clear

/model

/exit

/read <file>

/write <file>

/edit <file>

/delete <file>

/tree

/search

/run

## Project Structure

coding-agent/

main.py

agent.py

gemini_client.py

tools.py

config.py

prompts.py

memory.py

filesystem.py

history.py

utils.py

requirements.txt

README.md

.env.example

## Agent Behavior

The coding assistant should:

Carefully understand user requirements.

Ask questions only when the request is genuinely ambiguous.

Otherwise immediately start implementing.

Generate production-quality code.

Produce complete files.

Never intentionally omit implementations.

Avoid TODO placeholders.

Respect the existing project structure.

Write maintainable code.

Use modern Python.

Handle API failures.

Retry transient errors.

Support streaming.

Support multi-turn conversations.

## System Prompt

Create a high-quality system prompt for the coding assistant that emphasizes:

- accurate coding
- clean architecture
- complete implementations
- debugging
- refactoring
- project awareness
- concise explanations

## Gemini Client

Implement a reusable Gemini client using the latest google-genai SDK.

Use:

model="gemini-2.5-flash"

Load the API key from:

.env

Support streaming responses.

Support configurable temperature.

Support configurable max tokens.

## File Editing

Implement safe filesystem operations.

Read files.

Write files.

Create directories.

Backup files before editing.

Handle UTF-8 correctly.

## Memory

Maintain chat history.

Store conversations locally.

Load previous sessions.

## UI

Use Rich.

Colored output.

Syntax highlighting.

Progress indicators.

Streaming text.

Tables.

Panels.

Beautiful CLI.

## Code Quality

Use:

type hints

dataclasses

logging

error handling

modular architecture

clean OOP

## Deliverables

Generate every source file.

Generate requirements.txt.

Generate README.md.

Generate .env.example.

Generate complete runnable code.

Never shorten large files.

Never replace code with placeholders.

Never say "implementation omitted."

Continue until every project file has been generated.