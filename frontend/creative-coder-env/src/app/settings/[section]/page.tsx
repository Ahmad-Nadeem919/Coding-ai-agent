import { notFound } from "next/navigation";
import { SettingsShell } from "@/components/settings/settings-shell";
import { GeneralSettings } from "@/components/settings/general-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";
import { ShortcutsSettings } from "@/components/settings/shortcuts-settings";
import { GenericSettings } from "@/components/settings/generic-settings";

const MAP: Record<string, { title: string; comp: React.ComponentType }> = {
  general: { title: "General", comp: GeneralSettings },
  appearance: { title: "Appearance", comp: AppearanceSettings },
  integrations: { title: "Integrations", comp: IntegrationsSettings },
  shortcuts: { title: "Shortcuts", comp: ShortcutsSettings },
  notifications: { title: "Notifications", comp: GenericSettings },
  privacy: { title: "Privacy", comp: GenericSettings },
  security: { title: "Security", comp: GenericSettings },
  billing: { title: "Billing", comp: GenericSettings },
  profile: { title: "Profile", comp: GenericSettings },
  experimental: { title: "Experimental", comp: GenericSettings },
};

export default async function SectionSettings({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const cfg = MAP[section];
  if (!cfg) notFound();
  const C = cfg.comp;
  return <SettingsShell active={section}><C /></SettingsShell>;
}
