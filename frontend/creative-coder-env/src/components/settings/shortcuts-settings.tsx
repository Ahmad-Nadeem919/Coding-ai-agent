"use client";
import { Card, CardContent } from "@/components/ui/card";

const SC = [
  ["⌘K", "Open command palette"],
  ["⌘⇧P", "Command palette"],
  ["⌘B", "Toggle sidebar"],
  ["⌘\\", "Toggle context panel"],
  ["⌘J", "Toggle terminal"],
  ["⌘⇧N", "New conversation"],
  ["⌘⏎", "Send message"],
  ["Esc", "Stop generation"],
  ["⌘/", "Toggle comment (editor)"],
  ["⌘S", "Save file"],
  ["⌘F", "Find"],
  ["⌘⇧F", "Find in files"],
];

export function ShortcutsSettings() {
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">Keyboard shortcuts</h2><p className="text-sm text-muted-foreground">Everything you need at your fingertips.</p></div>
      <Card><CardContent className="p-0">
        {SC.map(([k, l]) => (
          <div key={k} className="flex items-center justify-between p-3 border-b last:border-b-0 text-sm">
            <span>{l}</span>
            <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{k}</kbd>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
