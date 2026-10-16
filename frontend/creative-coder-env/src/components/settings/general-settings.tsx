"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SettingsSection({ title, description, children }: any) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function Row({ label, hint, children }: any) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">Basic preferences for your workspace.</p>
      </div>
      <SettingsSection title="Workspace">
        <Row label="Workspace name"><Input defaultValue="Codex Studio" className="w-64" /></Row>
        <Row label="Default language">
          <Select defaultValue="typescript">
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="rust">Rust</SelectItem>
              <SelectItem value="go">Go</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Autosave" hint="Save file edits every 500ms"><Switch defaultChecked /></Row>
        <Row label="Format on save"><Switch defaultChecked /></Row>
      </SettingsSection>
      <SettingsSection title="Chat behavior">
        <Row label="Show token counter" hint="Estimate tokens as you type"><Switch defaultChecked /></Row>
        <Row label="Auto-scroll during streaming"><Switch defaultChecked /></Row>
        <Row label="Send on Enter" hint="Shift+Enter for newline"><Switch defaultChecked /></Row>
      </SettingsSection>
    </div>
  );
}
