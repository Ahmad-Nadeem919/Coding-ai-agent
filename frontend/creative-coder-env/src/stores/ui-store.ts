import { create } from "zustand";

interface UIState {
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  cmdOpen: boolean;
  activeRightTab: string;
  setLeft: (b: boolean) => void;
  setRight: (b: boolean) => void;
  setBottom: (b: boolean) => void;
  setCmd: (b: boolean) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleBottom: () => void;
  toggleCmd: () => void;
  setRightTab: (t: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftOpen: true, rightOpen: true, bottomOpen: false, cmdOpen: false,
  activeRightTab: "activity",
  setLeft: (b) => set({ leftOpen: b }),
  setRight: (b) => set({ rightOpen: b }),
  setBottom: (b) => set({ bottomOpen: b }),
  setCmd: (b) => set({ cmdOpen: b }),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  toggleBottom: () => set((s) => ({ bottomOpen: !s.bottomOpen })),
  toggleCmd: () => set((s) => ({ cmdOpen: !s.cmdOpen })),
  setRightTab: (t) => set({ activeRightTab: t }),
}));
