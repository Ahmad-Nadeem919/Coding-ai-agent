"use client";
import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useEditorStore } from "@/stores/editor-store";
import { streamChat } from "@/services/api-client";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Sparkles, Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Message } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

const SUGGESTIONS = [
  { title: "Explain this repository", sub: "Give me an overview of the architecture" },
  { title: "Refactor a function", sub: "Extract & simplify the auth token module" },
  { title: "Generate tests", sub: "Unit tests for the pricing calculator" },
  { title: "Fix a bug", sub: "The reducer isn't picking up new items" },
];

export function ChatView() {
  const {
    sessions, activeId, messages, addMessage, appendToMessage, updateMessage, updateSessionMeta,
    setStreaming, streaming, newConversation, selectSession, refreshSessions,
  } = useChatStore();
  const applyFileBlocks = useEditorStore((s) => s.applyFileBlocks);
  const activeMessages = activeId ? messages[activeId] ?? [] : [];
  const activeSession = sessions.find((s) => s.session_id === activeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!activeId && sessions.length > 0) selectSession(sessions[0].session_id);
  }, [activeId, sessions, selectSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeMessages.length, activeMessages[activeMessages.length - 1]?.content]);

  async function handleSend(content: string) {
    let convId = activeId;
    if (!convId) {
      try {
        convId = await newConversation();
      } catch (e: any) {
        toast.error("Couldn't start a new conversation", { description: e.message });
        return;
      }
    }

    const userMsg: Message = { id: uid(), role: "user", content, createdAt: Date.now(), status: "complete" };
    addMessage(convId, userMsg);

    const assistantId = uid();
    addMessage(convId, { id: assistantId, role: "assistant", content: "", createdAt: Date.now(), status: "streaming" });

    const ac = new AbortController();
    setStreaming(true, ac);
    try {
      for await (const event of streamChat({ message: content, sessionId: convId }, ac.signal)) {
        if (event.type === "chunk") {
          appendToMessage(convId, assistantId, event.text);
        } else if (event.type === "warning") {
          toast.warning("Response interrupted", { description: event.message });
        } else if (event.type === "error") {
          updateMessage(convId, assistantId, { status: "error" });
          toast.error("Generation failed", { description: event.message });
        } else if (event.type === "done") {
          updateMessage(convId, assistantId, { status: "complete" });
          const prevCount = sessions.find((s) => s.session_id === convId)?.message_count ?? 0;
          updateSessionMeta(convId, { title: event.title, updated_at: event.updated_at, message_count: prevCount + 2 });
          if (event.file_blocks.length > 0) {
            try {
              await applyFileBlocks(event.file_blocks);
              toast.success(`Applied ${event.file_blocks.length} file change${event.file_blocks.length > 1 ? "s" : ""}`);
            } catch (e: any) {
              toast.error("Failed to write files", { description: e.message });
            }
          }
        }
      }
    } catch (e: any) {
      updateMessage(convId, assistantId, { status: "error" });
      toast.error("Generation failed", { description: e.message });
    } finally {
      setStreaming(false, null);
    }
  }

  if (activeMessages.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-2xl w-full text-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto size-14 rounded-2xl bg-gradient-to-br from-primary to-chart-5 grid place-items-center shadow-lg shadow-primary/20 mb-6">
              <Sparkles className="size-7 text-primary-foreground" />
            </motion.div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">How can I help you code today?</h1>
            <p className="text-muted-foreground mb-8">Ask about your codebase, generate features, refactor, or debug.</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s.title}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => handleSend(s.title + " — " + s.sub)}
                  className="text-left p-3 rounded-xl border bg-card hover:border-primary hover:shadow-md hover:shadow-primary/5 transition-all"
                >
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 max-w-3xl mx-auto w-full"><ChatInput onSend={handleSend} disabled={streaming} /></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 shrink-0 border-b flex items-center px-4 gap-2">
        <Bot className="size-4 text-primary" />
        <span className="text-sm font-medium truncate flex-1">{activeSession?.title ?? "Conversation"}</span>
        <span className="text-[11px] text-muted-foreground">{activeMessages.length} messages</span>
        <Button size="sm" variant="ghost" onClick={() => newConversation()}><MessageSquarePlus className="size-3.5" /> New</Button>
      </div>
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
          <AnimatePresence initial={false}>
            {activeMessages.map((m) => <MessageBubble key={m.id} message={m} />)}
          </AnimatePresence>
        </div>
      </ScrollArea>
      <div className="border-t p-4"><div className="max-w-3xl mx-auto"><ChatInput onSend={handleSend} disabled={streaming} /></div></div>
    </div>
  );
}
