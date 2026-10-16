"use client";
import { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { runCommand } from "@/services/api-client";

type Line = { id: string; text: string; kind?: "cmd" | "out" | "err" | "ok" };
const uid = () => Math.random().toString(36).slice(2, 8);

const WELCOME: Line[] = [
  { id: uid(), text: "Connected to backend shell — commands run with the server process's own permissions.", kind: "out" },
];

interface Tab { id: string; name: string; lines: Line[]; input: string; running?: boolean; }

export function TerminalPanel() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: uid(), name: "shell", lines: WELCOME, input: "" }]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const active = tabs.find((t) => t.id === activeId)!;
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [activeId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999 }); }, [active.lines.length]);

  const update = (id: string, patch: Partial<Tab>) => setTabs((ts) => ts.map((t) => t.id === id ? { ...t, ...patch } : t));
  const appendLines = (id: string, lines: Line[]) =>
    setTabs((ts) => ts.map((t) => t.id === id ? { ...t, lines: [...t.lines, ...lines] } : t));

  async function run(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const tabId = active.id;
    update(tabId, { input: "" });
    appendLines(tabId, [{ id: uid(), text: "$ " + trimmed, kind: "cmd" }]);

    if (trimmed === "clear") {
      update(tabId, { lines: [] });
      return;
    }

    const confirmed = typeof window !== "undefined" && window.confirm(
      `Run this command on the backend?\n\n  ${trimmed}\n\nThis executes with the server process's own permissions on its working directory.`
    );
    if (!confirmed) {
      appendLines(tabId, [{ id: uid(), text: "cancelled", kind: "err" }]);
      return;
    }

    update(tabId, { running: true });
    try {
      const res = await runCommand(trimmed);
      const out: Line[] = [];
      if (res.stdout.trim()) out.push({ id: uid(), text: res.stdout.replace(/\n$/, ""), kind: "out" });
      if (res.stderr.trim()) out.push({ id: uid(), text: res.stderr.replace(/\n$/, ""), kind: "err" });
      if (res.timed_out) out.push({ id: uid(), text: "command timed out", kind: "err" });
      out.push({ id: uid(), text: `exit ${res.returncode}`, kind: res.returncode === 0 ? "ok" : "err" });
      appendLines(tabId, out);
    } catch (e: any) {
      appendLines(tabId, [{ id: uid(), text: e.message ?? "Command failed", kind: "err" }]);
    } finally {
      update(tabId, { running: false });
    }
  }

  function addTab() {
    const t: Tab = { id: uid(), name: `shell ${tabs.length + 1}`, lines: WELCOME, input: "" };
    setTabs((ts) => [...ts, t]); setActiveId(t.id);
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0d12] text-zinc-100 font-mono text-[12.5px]">
      <div className="h-8 shrink-0 border-b border-zinc-800 flex items-center pl-2 gap-0.5 bg-zinc-950/60">
        <TerminalIcon className="size-3.5 text-zinc-500 mr-1" />
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveId(t.id)} className={cn("h-7 px-3 text-xs rounded-t-md flex items-center gap-2 group", t.id === activeId ? "bg-[#0b0d12] text-zinc-100" : "text-zinc-500 hover:text-zinc-200")}>
            {t.name}
            {tabs.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); setTabs((ts) => ts.filter((x) => x.id !== t.id)); if (activeId === t.id) setActiveId(tabs[0].id); }} className="opacity-0 group-hover:opacity-100 hover:bg-zinc-800 rounded p-0.5">
                <X className="size-2.5" />
              </span>
            )}
          </button>
        ))}
        <Button size="icon" variant="ghost" className="size-6 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800" onClick={addTab}><Plus className="size-3" /></Button>
        <div className="flex-1" />
        <Button size="icon" variant="ghost" className="size-6 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800" onClick={() => update(active.id, { lines: [] })}><Trash2 className="size-3" /></Button>
      </div>
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-3 space-y-0.5">
          {active.lines.map((l) => (
            <div key={l.id} className={cn(
              "whitespace-pre-wrap leading-5",
              l.kind === "cmd" && "text-primary",
              l.kind === "err" && "text-red-400",
              l.kind === "ok" && "text-emerald-400",
            )}>{l.text}</div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-primary">$</span>
            <input
              ref={inputRef}
              value={active.input}
              disabled={active.running}
              onChange={(e) => update(active.id, { input: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") run(active.input); }}
              className="flex-1 bg-transparent outline-none disabled:opacity-50"
              placeholder={active.running ? "running…" : ""}
              autoFocus
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
