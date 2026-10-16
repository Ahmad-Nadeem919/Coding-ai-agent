"use client";
import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useChatStore } from "@/stores/chat-store";
import { useEditorStore } from "@/stores/editor-store";
import { toast } from "sonner";

export function useKeyboardShortcuts() {
  const { toggleLeft, toggleRight, toggleCmd, toggleBottom } = useUIStore();
  const newConv = useChatStore((s) => s.newConversation);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "k" && !e.shiftKey) { e.preventDefault(); toggleCmd(); }
      else if (e.key === "b") { e.preventDefault(); toggleLeft(); }
      else if (e.key === "j") { e.preventDefault(); toggleBottom(); }
      else if (e.key === "\\") { e.preventDefault(); toggleRight(); }
      else if (e.key === "n" && e.shiftKey) { e.preventDefault(); newConv(); }
      else if (e.key === "p" && e.shiftKey) { e.preventDefault(); toggleCmd(); }
      else if (e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().saveActiveFile().catch((err: Error) => {
          toast.error("Save failed", { description: err.message });
        });
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleLeft, toggleRight, toggleCmd, toggleBottom, newConv]);
}
