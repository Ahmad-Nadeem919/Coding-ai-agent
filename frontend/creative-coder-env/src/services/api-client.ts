// Client for the coding-agent FastAPI backend (see D:\coding_agent\backend).
import type { FileBlock, TreeEntry } from "@/types";

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    return JSON.stringify(body);
  } catch {
    return res.statusText || `Request failed with status ${res.status}`;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new ApiError(res.status, await extractError(res));
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionSummary {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SessionDetail {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: SessionMessage[];
}

export const listSessions = () => apiFetch<SessionSummary[]>("/sessions");
export const createSession = () => apiFetch<SessionDetail>("/sessions", { method: "POST" });
export const getSession = (id: string) => apiFetch<SessionDetail>(`/sessions/${encodeURIComponent(id)}`);
export const deleteSession = (id: string) =>
  apiFetch<void>(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Chat streaming (NDJSON over POST /api/chat/stream)
// ---------------------------------------------------------------------------

export type ChatStreamEvent =
  | { type: "chunk"; text: string }
  | { type: "warning"; message: string }
  | { type: "error"; message: string }
  | {
      type: "done";
      session_id: string;
      title: string;
      updated_at: string;
      full_text: string;
      file_blocks: FileBlock[];
    };

export async function* streamChat(
  payload: { message: string; sessionId: string | null },
  signal?: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(`${BASE_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: payload.message, session_id: payload.sessionId }),
    signal,
  });
  if (!res.ok || !res.body) throw new ApiError(res.status, await extractError(res));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) yield JSON.parse(line) as ChatStreamEvent;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as ChatStreamEvent;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export const getTree = (path = ".") => apiFetch<TreeEntry[]>(`/files/tree?path=${encodeURIComponent(path)}`);
export const getFileContent = (path: string) =>
  apiFetch<{ path: string; content: string }>(`/files/content?path=${encodeURIComponent(path)}`);
export const writeFile = (path: string, content: string) =>
  apiFetch<{ path: string }>("/files/write", { method: "POST", body: JSON.stringify({ path, content }) });
export const mkdir = (path: string) =>
  apiFetch<{ path: string }>("/files/mkdir", { method: "POST", body: JSON.stringify({ path }) });
export const deleteFile = (path: string) =>
  apiFetch<{ deleted: string }>(`/files?path=${encodeURIComponent(path)}`, { method: "DELETE" });
export const renameFile = (src: string, dst: string) =>
  apiFetch<{ path: string }>("/files/rename", { method: "POST", body: JSON.stringify({ src, dst }) });
export const applyBlocks = (blocks: FileBlock[]) =>
  apiFetch<{ written: string[] }>("/files/apply-blocks", {
    method: "POST",
    body: JSON.stringify({ blocks: blocks.map((b) => ({ path: b.path, content: b.content })) }),
  });
export const searchFiles = (query: string, root = ".") =>
  apiFetch<{ file: string; line_number: number; line: string }[]>(
    `/files/search?query=${encodeURIComponent(query)}&root=${encodeURIComponent(root)}`
  );

// ---------------------------------------------------------------------------
// Shell — executes arbitrary commands with the backend process's own
// permissions. The backend does no confirmation of its own; callers MUST
// confirm with the user before invoking this.
// ---------------------------------------------------------------------------

export interface RunCommandResult {
  command: string;
  returncode: number;
  stdout: string;
  stderr: string;
  timed_out: boolean;
}

export const runCommand = (command: string, timeout = 120) =>
  apiFetch<RunCommandResult>("/shell/run", { method: "POST", body: JSON.stringify({ command, timeout }) });

// ---------------------------------------------------------------------------
// Settings (read-only from the frontend's perspective — the backend picks
// the model; the UI only ever displays it)
// ---------------------------------------------------------------------------

export const getModelSettings = () => apiFetch<{ model_name: string; temperature: number }>("/settings");
