"use client";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useUIStore } from "@/stores/ui-store";
import { useChatStore } from "@/stores/chat-store";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, LayoutDashboard, Settings, FileCode2, Terminal, Sun, Moon, Sparkles, GitBranch, KeyRound } from "lucide-react";
import { useTheme } from "next-themes";

export function CommandPalette() {
  const { cmdOpen, setCmd } = useUIStore();
  const newConv = useChatStore((s) => s.newConversation);
  const router = useRouter();
  const { setTheme } = useTheme();

  const run = (fn: () => void) => { setCmd(false); fn(); };

  return (
    <CommandDialog open={cmdOpen} onOpenChange={setCmd}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => newConv())}><MessageSquarePlus /> New chat</CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/workspace"))}><FileCode2 /> Open workspace</CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/dashboard"))}><LayoutDashboard /> Dashboard</CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/settings"))}><Settings /> Settings</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="AI code actions">
          <CommandItem><Sparkles /> Generate code</CommandItem>
          <CommandItem><Sparkles /> Refactor selection</CommandItem>
          <CommandItem><Sparkles /> Fix bugs</CommandItem>
          <CommandItem><Sparkles /> Explain code</CommandItem>
          <CommandItem><Sparkles /> Generate tests</CommandItem>
          <CommandItem><Sparkles /> Generate commit message</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tools">
          <CommandItem><Terminal /> Toggle terminal</CommandItem>
          <CommandItem><GitBranch /> Git branches</CommandItem>
          <CommandItem><KeyRound /> Manage API keys</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Appearance">
          <CommandItem onSelect={() => run(() => setTheme("dark"))}><Moon /> Dark theme</CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("light"))}><Sun /> Light theme</CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("system"))}><Sun /> System theme</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
