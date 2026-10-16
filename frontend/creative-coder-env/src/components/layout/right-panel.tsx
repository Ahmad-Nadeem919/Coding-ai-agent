"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Brain, FileText, Activity, Wrench, Database, PlayCircle, Package, ChevronDown, ChevronRight, CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import type { AgentEvent, TaskStep } from "@/types";

const events: AgentEvent[] = [
  { id: "1", kind: "thinking", label: "Analyzing your request", time: Date.now() - 60000 },
  { id: "2", kind: "planning", label: "Planning 4-step refactor", time: Date.now() - 55000 },
  { id: "3", kind: "read", label: "Read src/lib/auth/token.ts", time: Date.now() - 40000, detail: "142 lines" },
  { id: "4", kind: "read", label: "Read src/lib/auth/session.ts", time: Date.now() - 32000 },
  { id: "5", kind: "tool", label: "search_codebase('refreshToken')", time: Date.now() - 25000 },
  { id: "6", kind: "write", label: "Edited src/lib/auth/token.ts", time: Date.now() - 12000, detail: "+38 −11" },
  { id: "7", kind: "exec", label: "bun test auth", time: Date.now() - 4000 },
];

const steps: TaskStep[] = [
  { id: "1", title: "Read auth files", status: "done", durationMs: 340 },
  { id: "2", title: "Refactor token module", status: "done", durationMs: 1200 },
  { id: "3", title: "Add refresh cycle", status: "running" },
  { id: "4", title: "Run tests", status: "pending" },
];

const kindMeta: Record<AgentEvent["kind"], { icon: any; color: string }> = {
  thinking: { icon: Brain, color: "text-chart-5" },
  planning: { icon: Activity, color: "text-chart-2" },
  read: { icon: FileText, color: "text-chart-3" },
  write: { icon: FileText, color: "text-primary" },
  exec: { icon: PlayCircle, color: "text-warning" },
  tool: { icon: Wrench, color: "text-chart-4" },
  wait: { icon: Loader2, color: "text-muted-foreground" },
  done: { icon: CheckCircle2, color: "text-success" },
};

export function RightPanel() {
  return (
    <aside className="h-full bg-sidebar/40 border-l flex flex-col">
      <Tabs defaultValue="activity" className="h-full flex flex-col">
        <TabsList className="w-full justify-start rounded-none bg-transparent border-b h-9 px-2">
          <TabsTrigger value="activity" className="text-xs h-7"><Activity className="size-3.5 mr-1" />Activity</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs h-7"><CheckCircle2 className="size-3.5 mr-1" />Tasks</TabsTrigger>
          <TabsTrigger value="tools" className="text-xs h-7"><Wrench className="size-3.5 mr-1" />Tools</TabsTrigger>
          <TabsTrigger value="ctx" className="text-xs h-7"><Package className="size-3.5 mr-1" />Context</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full"><Timeline events={events} /></ScrollArea>
        </TabsContent>
        <TabsContent value="tasks" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full"><TaskProgress steps={steps} /></ScrollArea>
        </TabsContent>
        <TabsContent value="tools" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full"><ToolCalls /></ScrollArea>
        </TabsContent>
        <TabsContent value="ctx" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full"><ContextPane /></ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function Timeline({ events }: { events: AgentEvent[] }) {
  return (
    <div className="p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Agent activity</div>
      <ol className="relative border-l border-border ml-2 space-y-3">
        {events.map((e, i) => {
          const M = kindMeta[e.kind];
          return (
            <motion.li key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="ml-4">
              <span className={`absolute -left-2 grid place-items-center size-4 rounded-full bg-background border ${M.color}`}>
                <M.icon className="size-2.5" />
              </span>
              <div className="text-xs font-medium">{e.label}</div>
              {e.detail && <div className="text-[10px] text-muted-foreground mt-0.5">{e.detail}</div>}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function TaskProgress({ steps }: { steps: TaskStep[] }) {
  const done = steps.filter((s) => s.status === "done").length;
  return (
    <div className="p-3 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold">Current task</span>
          <span className="text-xs text-muted-foreground">{done}/{steps.length}</span>
        </div>
        <Progress value={(done / steps.length) * 100} className="h-1.5" />
      </div>
      <div className="space-y-1">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-sidebar-accent">
            {s.status === "done" && <CheckCircle2 className="size-3.5 text-success" />}
            {s.status === "running" && <Loader2 className="size-3.5 animate-spin text-primary" />}
            {s.status === "pending" && <Circle className="size-3.5 text-muted-foreground" />}
            {s.status === "error" && <AlertCircle className="size-3.5 text-destructive" />}
            <span className="flex-1">{s.title}</span>
            {s.durationMs && <span className="text-[10px] text-muted-foreground">{s.durationMs}ms</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolCard({ name, status, input, output, ms }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-md bg-background/50 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-accent/40 text-left">
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <Wrench className="size-3.5 text-chart-4" />
        <span className="text-xs font-mono flex-1 truncate">{name}</span>
        {status === "success" && <Badge variant="outline" className="text-[10px] h-4 border-success text-success">ok</Badge>}
        {status === "running" && <Badge variant="outline" className="text-[10px] h-4 border-primary text-primary">…</Badge>}
        <span className="text-[10px] text-muted-foreground">{ms}ms</span>
      </button>
      {open && (
        <div className="border-t bg-muted/30 p-2 space-y-2">
          <div><div className="text-[10px] text-muted-foreground mb-1">INPUT</div><pre className="text-[11px] font-mono overflow-x-auto">{JSON.stringify(input, null, 2)}</pre></div>
          <div><div className="text-[10px] text-muted-foreground mb-1">OUTPUT</div><pre className="text-[11px] font-mono overflow-x-auto">{output}</pre></div>
        </div>
      )}
    </div>
  );
}

function ToolCalls() {
  return (
    <div className="p-3 space-y-2">
      <ToolCard name="search_codebase" status="success" ms={120} input={{ query: "refreshToken" }} output="3 matches in 2 files" />
      <ToolCard name="read_file" status="success" ms={45} input={{ path: "src/lib/auth/token.ts" }} output="142 lines" />
      <ToolCard name="write_file" status="success" ms={230} input={{ path: "src/lib/auth/token.ts" }} output="modified" />
      <ToolCard name="run_command" status="running" ms={0} input={{ cmd: "bun test auth" }} output="running…" />
    </div>
  );
}

function ContextPane() {
  return (
    <div className="p-3 space-y-4 text-xs">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Project memory</div>
        <div className="space-y-1">
          {["Uses Next.js App Router", "Tailwind v4 + shadcn", "Zustand for state"].map((m) => (
            <div key={m} className="flex items-start gap-2 py-1"><Database className="size-3 mt-0.5 text-primary" />{m}</div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Attached files</div>
        {["src/lib/auth/token.ts", "src/lib/auth/session.ts"].map((f) => (
          <div key={f} className="flex items-center gap-2 py-1 font-mono"><FileText className="size-3" />{f}</div>
        ))}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Token usage</div>
        <div className="flex justify-between mb-1"><span>Context</span><span>12,340 / 200k</span></div>
        <Progress value={6} className="h-1" />
      </div>
      <Button size="sm" variant="outline" className="w-full">Clear context</Button>
    </div>
  );
}
