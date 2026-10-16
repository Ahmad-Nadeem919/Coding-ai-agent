import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Message } from "@/types";
import * as api from "@/services/api-client";

const uid = () => Math.random().toString(36).slice(2, 10);

function toMessage(m: api.SessionMessage): Message {
  return {
    id: uid(),
    role: m.role,
    content: m.content,
    createdAt: Date.parse(m.timestamp) || Date.now(),
    status: "complete",
  };
}

interface ChatState {
  sessions: api.SessionSummary[];
  loadingSessions: boolean;
  activeId: string | null;
  messages: Record<string, Message[]>;
  /** Starring isn't a backend concept — kept locally and persisted by session id. */
  starred: Record<string, boolean>;
  streaming: boolean;
  abortController: AbortController | null;

  refreshSessions: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  newConversation: () => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  toggleStar: (id: string) => void;
  addMessage: (convId: string, msg: Message) => void;
  updateMessage: (convId: string, msgId: string, patch: Partial<Message>) => void;
  appendToMessage: (convId: string, msgId: string, delta: string) => void;
  updateSessionMeta: (id: string, patch: Partial<api.SessionSummary>) => void;
  setStreaming: (b: boolean, ac?: AbortController | null) => void;
  stopStreaming: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      loadingSessions: false,
      activeId: null,
      messages: {},
      starred: {},
      streaming: false,
      abortController: null,

      refreshSessions: async () => {
        set({ loadingSessions: true });
        try {
          const sessions = await api.listSessions();
          set({ sessions, loadingSessions: false });
        } catch {
          set({ loadingSessions: false });
        }
      },

      selectSession: async (id) => {
        set({ activeId: id });
        if (get().messages[id]) return;
        const detail = await api.getSession(id);
        set((s) => ({ messages: { ...s.messages, [id]: detail.messages.map(toMessage) } }));
      },

      newConversation: async () => {
        const detail = await api.createSession();
        set((s) => ({
          sessions: [
            {
              session_id: detail.session_id,
              title: detail.title,
              created_at: detail.created_at,
              updated_at: detail.updated_at,
              message_count: 0,
            },
            ...s.sessions,
          ],
          activeId: detail.session_id,
          messages: { ...s.messages, [detail.session_id]: [] },
        }));
        return detail.session_id;
      },

      deleteConversation: async (id) => {
        await api.deleteSession(id);
        set((s) => {
          const messages = { ...s.messages };
          delete messages[id];
          return {
            sessions: s.sessions.filter((c) => c.session_id !== id),
            activeId: s.activeId === id ? null : s.activeId,
            messages,
          };
        });
      },

      toggleStar: (id) => set((s) => ({ starred: { ...s.starred, [id]: !s.starred[id] } })),

      addMessage: (convId, msg) =>
        set((s) => ({ messages: { ...s.messages, [convId]: [...(s.messages[convId] ?? []), msg] } })),

      updateMessage: (convId, msgId, patch) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [convId]: (s.messages[convId] ?? []).map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
          },
        })),

      appendToMessage: (convId, msgId, delta) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [convId]: (s.messages[convId] ?? []).map((m) =>
              m.id === msgId ? { ...m, content: m.content + delta } : m
            ),
          },
        })),

      updateSessionMeta: (id, patch) =>
        set((s) => ({ sessions: s.sessions.map((c) => (c.session_id === id ? { ...c, ...patch } : c)) })),

      setStreaming: (b, ac) => set({ streaming: b, abortController: ac ?? null }),
      stopStreaming: () => {
        get().abortController?.abort();
        set({ streaming: false, abortController: null });
      },
    }),
    { name: "codex-chat-ui", partialize: (s) => ({ starred: s.starred }) }
  )
);
