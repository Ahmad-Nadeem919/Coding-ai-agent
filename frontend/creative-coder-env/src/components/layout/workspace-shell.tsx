"use client";
import { useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { TopNav } from "./top-nav";
import { StatusBar } from "./status-bar";
import { LeftSidebar } from "./left-sidebar";
import { RightPanel } from "./right-panel";
import { TerminalPanel } from "@/components/terminal/terminal";
import { useUIStore } from "@/stores/ui-store";
import { useEditorStore } from "@/stores/editor-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { motion, AnimatePresence } from "framer-motion";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  const { leftOpen, rightOpen, bottomOpen } = useUIStore();
  const loadTree = useEditorStore((s) => s.loadTree);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground overflow-hidden">
      <TopNav />
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="h-full">
          <AnimatePresence initial={false}>
            {leftOpen && (
              <>
                <Panel defaultSize={18} minSize={14} maxSize={30} order={1}>
                  <LeftSidebar />
                </Panel>
                <PanelResizeHandle className="w-px bg-border hover:bg-primary/40 transition-colors" />
              </>
            )}
          </AnimatePresence>

          <Panel defaultSize={rightOpen ? 54 : 82} minSize={30} order={2}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={bottomOpen ? 65 : 100} minSize={30}>
                <motion.div layout className="h-full min-h-0 bg-background">
                  {children}
                </motion.div>
              </Panel>
              {bottomOpen && (
                <>
                  <PanelResizeHandle className="h-px bg-border hover:bg-primary/40 transition-colors" />
                  <Panel defaultSize={35} minSize={12}>
                    <TerminalPanel />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {rightOpen && (
            <>
              <PanelResizeHandle className="w-px bg-border hover:bg-primary/40 transition-colors" />
              <Panel defaultSize={28} minSize={18} maxSize={45} order={3}>
                <RightPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
      <StatusBar />
    </div>
  );
}
