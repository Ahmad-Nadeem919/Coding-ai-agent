"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Sparkles, PanelLeft, PanelRight, PanelBottom, Command, Sun, Moon, LayoutDashboard, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettingsStore } from "@/stores/settings-store";

export function TopNav() {
  const { toggleLeft, toggleRight, toggleBottom, setCmd } = useUIStore();
  const { theme, setTheme } = useTheme();
  const { backendModel, loadBackendModel } = useSettingsStore();

  useEffect(() => {
    loadBackendModel();
  }, [loadBackendModel]);

  return (
    <header className="h-12 shrink-0 border-b bg-sidebar/60 backdrop-blur flex items-center px-2 gap-1">
      <div className="flex items-center gap-2 px-2">
        <div className="size-7 rounded-md bg-gradient-to-br from-primary to-chart-5 grid place-items-center shadow-sm shadow-primary/30">
          <Sparkles className="size-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Codex</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">/ AI Coding Agent</span>
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={toggleLeft}><PanelLeft className="size-4" /></Button>
      </TooltipTrigger><TooltipContent>Toggle sidebar (⌘B)</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={toggleBottom}><PanelBottom className="size-4" /></Button>
      </TooltipTrigger><TooltipContent>Toggle terminal (⌘J)</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={toggleRight}><PanelRight className="size-4" /></Button>
      </TooltipTrigger><TooltipContent>Toggle context (⌘\)</TooltipContent></Tooltip>

      <div className="flex-1 flex justify-center px-4">
        <Button variant="outline" size="sm" onClick={() => setCmd(true)} className="w-full max-w-md justify-between text-muted-foreground font-normal h-8 rounded-lg">
          <span className="flex items-center gap-2"><Command className="size-3.5" />Search files, commands, chats…</span>
          <kbd className="text-xs opacity-70">⌘K</kbd>
        </Button>
      </div>

      <Tooltip><TooltipTrigger asChild>
        <span className="h-8 flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          {backendModel ?? "…"}
        </span>
      </TooltipTrigger><TooltipContent>Model is configured on the backend</TooltipContent></Tooltip>

      <Link href="/dashboard"><Button variant="ghost" size="icon" className="size-8"><LayoutDashboard className="size-4" /></Button></Link>
      <Link href="/settings"><Button variant="ghost" size="icon" className="size-8"><Settings2 className="size-4" /></Button></Link>
      <Button variant="ghost" size="icon" className="size-8" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-1"><Avatar className="size-7"><AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback></Avatar></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>alex@codex.dev</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem><Link href="/settings/profile">Profile</Link></DropdownMenuItem>
          <DropdownMenuItem><Link href="/settings/billing">Billing</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem><Link href="/login">Sign out</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
