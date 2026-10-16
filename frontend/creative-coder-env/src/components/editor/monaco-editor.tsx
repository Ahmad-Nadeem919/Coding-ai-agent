"use client";
import dynamic from "next/dynamic";
import { useEditorStore } from "@/stores/editor-store";
import { useTheme } from "next-themes";
import { X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Monaco = dynamic(() => import("@monaco-editor/react").then((m) => m.default), { ssr: false });

export function MonacoEditorPanel() {
  const { tabs, activeTabId, setActive, closeTab, fileContents, savedContents, updateContent, saveFile } = useEditorStore();
  const { theme } = useTheme();
  const active = tabs.find((t) => t.id === activeTabId);

  async function handleSave(path: string) {
    try {
      await saveFile(path);
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="h-9 shrink-0 border-b flex items-center overflow-x-auto no-scrollbar">
        {tabs.length === 0 && <div className="px-3 text-xs text-muted-foreground">Open a file from the explorer to edit</div>}
        {tabs.map((t) => {
          const dirty = fileContents[t.path] !== savedContents[t.path];
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "group h-full flex items-center gap-2 px-3 border-r text-xs relative",
                t.id === activeTabId ? "bg-background text-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"
              )}
            >
              {dirty ? <Circle className="size-2 fill-warning text-warning" /> : <span className="size-2" />}
              <span>{t.name}</span>
              <span onClick={(e) => { e.stopPropagation(); closeTab(t.id); }} className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-0.5">
                <X className="size-3" />
              </span>
              {t.id === activeTabId && <span className="absolute inset-x-0 -top-px h-0.5 bg-primary" />}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0">
        {active ? (
          <Monaco
            key={active.id}
            height="100%"
            language={active.language}
            value={fileContents[active.path] ?? ""}
            onChange={(v) => updateContent(active.path, v ?? "")}
            onMount={(editor, monaco) => {
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => handleSave(active.path));
            }}
            theme={theme === "dark" ? "vs-dark" : "vs"}
            options={{ fontSize: 13, minimap: { enabled: true }, scrollBeyondLastLine: false, smoothScrolling: true, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", padding: { top: 12 } }}
          />
        ) : (
          <div className="h-full grid place-items-center text-muted-foreground text-sm">No file open</div>
        )}
      </div>
    </div>
  );
}
