import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getModelSettings } from "@/services/api-client";

interface SettingsState {
  /** Read-only — set by the backend, never chosen in the UI. Null until fetched. */
  backendModel: string | null;
  fontSize: number;
  accent: string;
  reducedMotion: boolean;
  loadBackendModel: () => Promise<void>;
  setFontSize: (n: number) => void;
  setAccent: (c: string) => void;
  setReducedMotion: (b: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      backendModel: null,
      fontSize: 14,
      accent: "violet",
      reducedMotion: false,
      loadBackendModel: async () => {
        try {
          const { model_name } = await getModelSettings();
          set({ backendModel: model_name });
        } catch {
          // Backend unreachable — leave as null, UI falls back to a placeholder.
        }
      },
      setFontSize: (fontSize) => set({ fontSize }),
      setAccent: (accent) => set({ accent }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    { name: "codex-settings", partialize: (s) => ({ fontSize: s.fontSize, accent: s.accent, reducedMotion: s.reducedMotion }) }
  )
);
