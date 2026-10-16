"use client";
import Link from "next/link";
import { ArrowLeft, Settings2, Palette, Plug, Keyboard, Bell, Shield, Lock, CreditCard, UserCircle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const NAV = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "security", label: "Security", icon: Lock },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "experimental", label: "Experimental", icon: FlaskConical },
];

export function SettingsShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="h-dvh flex flex-col">
      <header className="h-12 shrink-0 border-b flex items-center px-3 gap-2 bg-sidebar/60">
        <Link href="/workspace" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to workspace
        </Link>
        <div className="mx-2 h-4 w-px bg-border" />
        <h1 className="text-sm font-semibold">Settings</h1>
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside className="w-56 border-r bg-sidebar/40 shrink-0">
          <ScrollArea className="h-full py-3">
            <nav className="px-2 space-y-0.5">
              {NAV.map((n) => {
                const href = n.id === "general" ? "/settings" : `/settings/${n.id}`;
                const isActive = active === n.id;
                return (
                  <Link key={n.id} href={href} className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}>
                    <n.icon className="size-4" /> {n.label}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>
        <main className="flex-1 min-w-0">
          <ScrollArea className="h-full"><div className="p-8 max-w-3xl">{children}</div></ScrollArea>
        </main>
      </div>
    </div>
  );
}
