"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, Gitlab, Container, Cloud, Database, Slack, MessageSquare, ClipboardList, FileText, Package, Zap, Flame } from "lucide-react";

const INTEGRATIONS = [
  { id: "github", name: "GitHub", icon: Github, connected: true, desc: "Repositories, PRs, issues" },
  { id: "gitlab", name: "GitLab", icon: Gitlab, desc: "Merge requests and pipelines" },
  { id: "bitbucket", name: "Bitbucket", icon: Package, desc: "Atlassian source control" },
  { id: "docker", name: "Docker", icon: Container, desc: "Container registry" },
  { id: "vercel", name: "Vercel", icon: Zap, connected: true, desc: "Deploy previews" },
  { id: "netlify", name: "Netlify", icon: Cloud, desc: "Build & deploy" },
  { id: "supabase", name: "Supabase", icon: Database, desc: "Postgres & auth" },
  { id: "firebase", name: "Firebase", icon: Flame, desc: "BaaS platform" },
  { id: "slack", name: "Slack", icon: Slack, desc: "Team notifications" },
  { id: "discord", name: "Discord", icon: MessageSquare, desc: "Community & bots" },
  { id: "linear", name: "Linear", icon: ClipboardList, desc: "Issue tracker" },
  { id: "notion", name: "Notion", icon: FileText, desc: "Docs & knowledge base" },
];

export function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">Integrations</h2><p className="text-sm text-muted-foreground">Connect Codex to your workflow.</p></div>
      <div className="grid sm:grid-cols-2 gap-3">
        {INTEGRATIONS.map((i) => (
          <Card key={i.id}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="size-10 rounded-lg bg-muted grid place-items-center"><i.icon className="size-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{i.name}</span>
                  {i.connected && <Badge variant="outline" className="border-success text-success text-[10px]">Connected</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{i.desc}</p>
              </div>
              <Button size="sm" variant={i.connected ? "outline" : "default"}>{i.connected ? "Manage" : "Connect"}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
