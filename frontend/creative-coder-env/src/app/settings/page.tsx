import { SettingsShell } from "@/components/settings/settings-shell";
import { GeneralSettings } from "@/components/settings/general-settings";
export default function SettingsPage() {
  return <SettingsShell active="general"><GeneralSettings /></SettingsShell>;
}
