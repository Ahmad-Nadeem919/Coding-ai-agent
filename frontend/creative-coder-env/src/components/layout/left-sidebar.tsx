"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MessageSquarePlus, Search, Star, FolderKanban, FileCode2, GitBranch, BookMarked, Layers, Settings, User, Circle, Trash2, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { useChatStore } from "@/stores/chat-store";
import { useUIStore } from "@/stores/ui-store";
import { FileExplorer } from "@/components/editor/file-explorer";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

function Section({ icon: Icon, title, defaultOpen = true, children, action }: any) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="w-full px-3 py-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground group">
        <Icon className="size-3.5" />
        <span className="flex-1 text-left">{title}</span>
        {action}
      </CollapsibleTrigger>
      <CollapsibleContent><div className="pb-1">{children}</div></CollapsibleContent>
    </Collapsible>
  );
}

export function LeftSidebar() {
  const [q, setQ] = useState("");
  const { sessions, activeId, starred: starredMap, selectSession, newConversation, deleteConversation, toggleStar } = useChatStore();
  const { toggleLeft } = useUIStore();
  const filtered = sessions.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  const starred = filtered.filter((c) => starredMap[c.session_id]);
  const recent = filtered.filter((c) => !starredMap[c.session_id]);

  return (
    <aside className="h-full bg-sidebar text-sidebar-foreground flex flex-col border-r">
      <div className="p-2 flex items-center gap-1">
        <Button size="sm" className="flex-1 justify-start gap-2 h-8" onClick={() => newConversation()}>
          <MessageSquarePlus className="size-4" /> New chat
        </Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={toggleLeft}><ChevronLeft className="size-4" /></Button>
      </div>
      <div className="px-2 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats…" className="h-8 pl-7 text-xs bg-sidebar-accent/40 border-sidebar-border" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {starred.length > 0 && (
          <Section icon={Star} title="Starred">
            {starred.map((c) => (
              <ConversationRow key={c.session_id} c={c} active={c.session_id === activeId} starred onClick={() => selectSession(c.session_id)} onDelete={() => deleteConversation(c.session_id)} onStar={() => toggleStar(c.session_id)} />
            ))}
          </Section>
        )}
        <Section icon={MessageSquarePlus} title="Recent chats">
          {recent.length === 0 && <div className="px-4 py-2 text-xs text-muted-foreground">No conversations yet.</div>}
          {recent.map((c) => (
            <ConversationRow key={c.session_id} c={c} active={c.session_id === activeId} onClick={() => selectSession(c.session_id)} onDelete={() => deleteConversation(c.session_id)} onStar={() => toggleStar(c.session_id)} />
          ))}
        </Section>

        <Section icon={FolderKanban} title="Projects" defaultOpen={false}>
          {["codex-web", "api-gateway", "billing-service"].map((p) => (
            <button key={p} className="w-full flex items-center gap-2 px-4 py-1 text-xs hover:bg-sidebar-accent text-left">
              <Circle className="size-2 fill-primary text-primary" /> {p}
            </button>
          ))}
        </Section>

        <Section icon={FileCode2} title="Files">
          <FileExplorer compact />
        </Section>

        <Section icon={GitBranch} title="Branches" defaultOpen={false}>
          {["main", "feat/auth-jwt", "fix/hydration"].map((b, i) => (
            <div key={b} className={cn("px-4 py-1 text-xs flex items-center gap-2", i === 0 && "text-primary")}>
              <GitBranch className="size-3" /> {b}
            </div>
          ))}
        </Section>

        <Section icon={BookMarked} title="Saved prompts" defaultOpen={false}>
          {["/review-pr", "/explain-error", "/write-tests", "/gen-commit"].map((p) => (
            <div key={p} className="px-4 py-1 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer">{p}</div>
          ))}
        </Section>

        <Section icon={Layers} title="Templates" defaultOpen={false}>
          {["Next.js SaaS", "REST API", "React component library", "CLI tool"].map((t) => (
            <div key={t} className="px-4 py-1 text-xs hover:bg-sidebar-accent cursor-pointer">{t}</div>
          ))}
        </Section>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <Link href="/settings"><SidebarItem icon={Settings}>Settings</SidebarItem></Link>
        <SidebarItem icon={User}>Alex Rivera</SidebarItem>
      </div>
    </aside>
  );
}

function SidebarItem({ icon: Icon, children }: any) {
  return (
    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-sidebar-accent text-left">
      <Icon className="size-3.5" /> {children}
    </button>
  );
}

function ConversationRow({ c, active, starred, onClick, onDelete, onStar }: any) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-full text-left px-3 py-1.5 text-xs group flex items-center gap-2 hover:bg-sidebar-accent",
            active && "bg-sidebar-accent text-primary"
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="truncate">{c.title}</div>
            <div className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}</div>
          </div>
          {starred && <Star className="size-3 fill-warning text-warning" />}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onStar}>{starred ? <><StarOff className="size-3.5" /> Unstar</> : <><Star className="size-3.5" /> Star</>}</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="size-3.5" /> Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
