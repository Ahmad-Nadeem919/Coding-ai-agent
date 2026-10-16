"use client";
import { GitBranch, Wifi, CheckCircle2, Zap } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { useSettingsStore } from "@/stores/settings-store";

export function StatusBar() {
  const active = useChatStore((s) => (s.activeId ? s.messages[s.activeId] : undefined));
  const streaming = useChatStore((s) => s.streaming);
  const backendModel = useSettingsStore((s) => s.backendModel);
  const tokens = active?.reduce((n, m) => n + m.content.length / 4, 0) ?? 0;

  return (
    <footer className="h-6 shrink-0 border-t bg-sidebar/60 backdrop-blur px-3 flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1"><GitBranch className="size-3" /> main</span>
      <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-success" /> No issues</span>
      <span className="flex items-center gap-1"><Wifi className="size-3" /> Connected</span>
      <div className="flex-1" />
      {backendModel && <span>{backendModel}</span>}
      <span>{Math.round(tokens)} tok</span>
      <span className={`flex items-center gap-1 ${streaming ? "text-primary" : ""}`}>
        <Zap className="size-3" /> {streaming ? "Streaming…" : "Idle"}
      </span>
      <span>UTF-8 · LF · TS</span>
    </footer>
  );
}
