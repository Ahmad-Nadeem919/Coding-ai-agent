"use client";
import { SettingsSection, Row } from "./general-settings";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const ACCENTS = [
  { id: "violet", color: "oklch(0.55 0.22 265)" },
  { id: "emerald", color: "oklch(0.65 0.17 150)" },
  { id: "rose", color: "oklch(0.65 0.24 15)" },
  { id: "amber", color: "oklch(0.75 0.17 75)" },
  { id: "cyan", color: "oklch(0.7 0.14 210)" },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize, accent, setAccent, reducedMotion, setReducedMotion } = useSettingsStore();
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">Appearance</h2><p className="text-sm text-muted-foreground">Tune Codex to your taste.</p></div>
      <SettingsSection title="Theme">
        <div className="grid grid-cols-3 gap-2">
          {["light", "dark", "system"].map((t) => (
            <button key={t} onClick={() => setTheme(t)} className={cn("border rounded-lg p-4 text-sm capitalize", theme === t && "border-primary ring-2 ring-primary/20")}>{t}</button>
          ))}
        </div>
      </SettingsSection>
      <SettingsSection title="Accent color">
        <div className="flex gap-2">
          {ACCENTS.map((a) => (
            <button key={a.id} onClick={() => setAccent(a.id)} className={cn("size-9 rounded-full ring-offset-2 ring-offset-background", accent === a.id && "ring-2 ring-primary")} style={{ background: a.color }} />
          ))}
        </div>
      </SettingsSection>
      <SettingsSection title="Typography">
        <Row label={`Editor font size: ${fontSize}px`}>
          <div className="w-56"><Slider min={11} max={20} step={1} value={[fontSize]} onValueChange={([v]) => setFontSize(v)} /></div>
        </Row>
      </SettingsSection>
      <SettingsSection title="Motion">
        <Row label="Reduce motion" hint="Minimize animations"><Switch checked={reducedMotion} onCheckedChange={setReducedMotion} /></Row>
      </SettingsSection>
    </div>
  );
}
