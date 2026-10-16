"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileCode2, FileJson, FileText, FilePlus, FolderPlus, RefreshCw, Loader2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { FileNode } from "@/types";
import { cn } from "@/lib/utils";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { toast } from "sonner";

function iconFor(node: FileNode) {
  if (node.type === "folder") return Folder;
  if (node.name.endsWith(".json")) return FileJson;
  if (node.name.endsWith(".md")) return FileText;
  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(node.name)) return FileCode2;
  return File;
}

type Creating = { parentPath: string; type: "file" | "folder" } | null;

const ExplorerCtx = createContext<{
  creating: Creating;
  setCreating: (v: Creating) => void;
  renamingPath: string | null;
  setRenamingPath: (p: string | null) => void;
} | null>(null);

function useExplorerUI() {
  const ctx = useContext(ExplorerCtx);
  if (!ctx) throw new Error("useExplorerUI must be used within FileExplorer");
  return ctx;
}

function InlineInput({
  depth, initial = "", placeholder, onSubmit, onCancel,
}: { depth: number; initial?: string; placeholder?: string; onSubmit: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit(value);
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => onCancel()}
      style={{ paddingLeft: 8 + depth * 12 + 16 }}
      className="block text-xs bg-sidebar-accent/60 border border-primary/50 rounded-sm py-0.5 pr-2 outline-none w-[calc(100%-8px)] mx-1"
    />
  );
}

function Node({ node, depth = 0, compact }: { node: FileNode; depth?: number; compact?: boolean }) {
  const [open, setOpen] = useState(depth < 2);
  const openFile = useEditorStore((s) => s.openFile);
  const createFile = useEditorStore((s) => s.createFile);
  const createFolder = useEditorStore((s) => s.createFolder);
  const renameNode = useEditorStore((s) => s.renameNode);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const duplicateFile = useEditorStore((s) => s.duplicateFile);
  const active = useEditorStore((s) => s.tabs.find((t) => t.path === node.path && t.id === s.activeTabId));
  const { creating, setCreating, renamingPath, setRenamingPath } = useExplorerUI();
  const Icon = node.type === "folder" ? (open ? FolderOpen : Folder) : iconFor(node);

  const isCreatingHere = node.type === "folder" && creating?.parentPath === node.path;

  async function submitRename(name: string) {
    setRenamingPath(null);
    const trimmed = name.trim();
    if (!trimmed || trimmed === node.name) return;
    const parent = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";
    const newPath = parent ? `${parent}/${trimmed}` : trimmed;
    try {
      await renameNode(node.path, newPath);
    } catch (e: any) {
      toast.error("Rename failed", { description: e.message });
    }
  }

  async function submitCreateHere(name: string) {
    const type = creating?.type;
    setCreating(null);
    const trimmed = name.trim();
    if (!trimmed || !type) return;
    const path = `${node.path}/${trimmed}`;
    try {
      if (type === "file") await createFile(path);
      else await createFolder(path);
    } catch (e: any) {
      toast.error(`Couldn't create ${type}`, { description: e.message });
    }
  }

  async function handleDelete() {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${node.name}"?`)) return;
    try {
      await deleteNode(node.path);
    } catch (e: any) {
      toast.error("Delete failed", { description: e.message });
    }
  }

  async function handleDuplicate() {
    try {
      await duplicateFile(node.path);
    } catch (e: any) {
      toast.error("Duplicate failed", { description: e.message });
    }
  }

  if (renamingPath === node.path) {
    return <InlineInput depth={depth} initial={node.name} onSubmit={submitRename} onCancel={() => setRenamingPath(null)} />;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <button
            onClick={() => (node.type === "folder" ? setOpen((v) => !v) : openFile(node.path))}
            className={cn(
              "w-full flex items-center gap-1 px-2 py-0.5 text-xs hover:bg-sidebar-accent group",
              active && "bg-sidebar-accent text-primary"
            )}
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            {node.type === "folder"
              ? (open ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />)
              : <span className="w-3 shrink-0" />}
            <Icon className={cn("size-3.5 shrink-0", node.type === "folder" ? "text-chart-2" : "text-muted-foreground")} />
            <span className="truncate flex-1 text-left">{node.name}</span>
          </button>
          {node.type === "folder" && (open || isCreatingHere) && (
            <>
              {isCreatingHere && (
                <InlineInput
                  depth={depth + 1}
                  placeholder={creating!.type === "file" ? "file name" : "folder name"}
                  onSubmit={submitCreateHere}
                  onCancel={() => setCreating(null)}
                />
              )}
              {open && node.children?.map((c) => <Node key={c.id} node={c} depth={depth + 1} compact={compact} />)}
            </>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {node.type === "folder" && (
          <>
            <ContextMenuItem onClick={() => { setOpen(true); setCreating({ parentPath: node.path, type: "file" }); }}>New file</ContextMenuItem>
            <ContextMenuItem onClick={() => { setOpen(true); setCreating({ parentPath: node.path, type: "folder" }); }}>New folder</ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={() => setRenamingPath(node.path)}>Rename</ContextMenuItem>
        {node.type === "file" && <ContextMenuItem onClick={handleDuplicate}>Duplicate</ContextMenuItem>}
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive" onClick={handleDelete}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FileExplorer({ compact }: { compact?: boolean }) {
  const tree = useEditorStore((s) => s.tree);
  const loadingTree = useEditorStore((s) => s.loadingTree);
  const loadTree = useEditorStore((s) => s.loadTree);
  const createFile = useEditorStore((s) => s.createFile);
  const createFolder = useEditorStore((s) => s.createFolder);
  const [creating, setCreating] = useState<Creating>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  async function submitRootCreate(name: string) {
    const type = creating?.type;
    setCreating(null);
    const trimmed = name.trim();
    if (!trimmed || !type) return;
    try {
      if (type === "file") await createFile(trimmed);
      else await createFolder(trimmed);
    } catch (e: any) {
      toast.error(`Couldn't create ${type}`, { description: e.message });
    }
  }

  return (
    <ExplorerCtx.Provider value={{ creating, setCreating, renamingPath, setRenamingPath }}>
      <div className="py-1">
        <div className="flex items-center gap-0.5 px-2 pb-1">
          <button title="New file" onClick={() => setCreating({ parentPath: "", type: "file" })} className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground">
            <FilePlus className="size-3.5" />
          </button>
          <button title="New folder" onClick={() => setCreating({ parentPath: "", type: "folder" })} className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground">
            <FolderPlus className="size-3.5" />
          </button>
          <button title="Refresh" onClick={() => loadTree()} className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground ml-auto">
            {loadingTree ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </button>
        </div>
        {creating?.parentPath === "" && (
          <InlineInput depth={0} placeholder={creating.type === "file" ? "file name" : "folder name"} onSubmit={submitRootCreate} onCancel={() => setCreating(null)} />
        )}
        {tree.length === 0 && !loadingTree && !creating && (
          <div className="px-3 py-2 text-xs text-muted-foreground">No files yet — create one above.</div>
        )}
        {tree.map((n) => <Node key={n.id} node={n} compact={compact} />)}
      </div>
    </ExplorerCtx.Provider>
  );
}
