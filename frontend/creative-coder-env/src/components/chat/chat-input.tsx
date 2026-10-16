"use client";
import { useRef, useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Paperclip, Image as ImageIcon, Mic, AtSign, Slash } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

const SLASH = [
  { cmd: "/explain", desc: "Explain selected code" },
  { cmd: "/refactor", desc: "Refactor for readability" },
  { cmd: "/test", desc: "Generate unit tests" },
  { cmd: "/fix", desc: "Fix bug in file" },
  { cmd: "/docs", desc: "Generate documentation" },
  { cmd: "/commit", desc: "Suggest commit message" },
];

export function ChatInput({ onSend, disabled }: { onSend: (t: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("");
  const stop = useChatStore((s) => s.stopStreaming);
  const streaming = useChatStore((s) => s.streaming);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showSlash, setShowSlash] = useState(false);

  function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t); setValue("");
    requestAnimationFrame(() => { if (ref.current) ref.current.style.height = "auto"; });
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === "Escape" && streaming) stop();
  }

  function autoresize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 260) + "px";
    setShowSlash(e.target.value.startsWith("/"));
  }

  const tokens = Math.round(value.length / 4);

  return (
    <div className="relative rounded-2xl border bg-card shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
      {showSlash && (
        <div className="absolute bottom-full mb-2 left-0 right-0 rounded-xl border bg-popover shadow-lg p-1 max-h-60 overflow-auto">
          {SLASH.filter((s) => s.cmd.startsWith(value.split(" ")[0])).map((s) => (
            <button key={s.cmd} onClick={() => { setValue(s.cmd + " "); setShowSlash(false); ref.current?.focus(); }} className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent text-left">
              <Slash className="size-3.5 text-primary" />
              <span className="font-mono text-xs">{s.cmd}</span>
              <span className="text-xs text-muted-foreground">{s.desc}</span>
            </button>
          ))}
        </div>
      )}

      <Textarea
        ref={ref}
        value={value}
        onChange={autoresize}
        onKeyDown={onKey}
        placeholder="Ask, edit, generate — try / for commands, @ to mention files"
        className="min-h-[52px] max-h-[260px] border-0 shadow-none focus-visible:ring-0 resize-none bg-transparent px-4 pt-3 pb-1 text-sm"
      />

      <div className="flex items-center gap-1 px-2 pb-2">
        <Button size="icon" variant="ghost" className="size-7"><Paperclip className="size-3.5" /></Button>
        <Button size="icon" variant="ghost" className="size-7"><ImageIcon className="size-3.5" /></Button>
        <Button size="icon" variant="ghost" className="size-7"><Mic className="size-3.5" /></Button>
        <Button size="icon" variant="ghost" className="size-7"><AtSign className="size-3.5" /></Button>

        <div className="flex-1" />

        <span className="text-[10px] text-muted-foreground tabular-nums">{tokens} tok · {value.length} ch</span>

        {streaming ? (
          <Button size="icon" variant="destructive" className="size-8 rounded-lg" onClick={stop}><Square className="size-3.5" /></Button>
        ) : (
          <Button size="icon" className="size-8 rounded-lg" onClick={submit} disabled={!value.trim()}><Send className="size-3.5" /></Button>
        )}
      </div>
    </div>
  );
}
