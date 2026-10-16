// Centralized types

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  status?: "streaming" | "complete" | "error";
  toolCalls?: ToolCall[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
  messageCount: number;
  messages?: Message[];
}

export interface ToolCall {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error";
  input?: unknown;
  output?: unknown;
  durationMs?: number;
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  language?: string;
  children?: FileNode[];
}

/** Raw flat entry as returned by GET /api/files/tree. */
export interface TreeEntry {
  depth: number;
  name: string;
  is_dir: boolean;
}

export interface FileBlock {
  path: string;
  content: string;
  lines?: number;
  size?: number;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  language: string;
}

export interface AgentEvent {
  id: string;
  kind: "thinking" | "planning" | "read" | "write" | "exec" | "tool" | "wait" | "done";
  label: string;
  time: number;
  detail?: string;
}

export interface TaskStep {
  id: string;
  title: string;
  status: "pending" | "running" | "done" | "error";
  durationMs?: number;
}
