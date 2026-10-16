import { create } from "zustand";
import type { EditorTab, FileBlock, FileNode, TreeEntry } from "@/types";
import * as api from "@/services/api-client";

const uid = () => Math.random().toString(36).slice(2, 10);

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  json: "json", md: "markdown", mdx: "markdown", py: "python", css: "css", scss: "scss", html: "html",
  yml: "yaml", yaml: "yaml", sh: "shell", sql: "sql", go: "go", rs: "rust", java: "java", rb: "ruby",
  toml: "toml", txt: "plaintext", env: "plaintext",
};

function languageFor(name: string): string {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return LANGUAGE_BY_EXT[ext] ?? "plaintext";
}

/** Convert the backend's flat, depth-first entry list into a nested tree with real paths. */
export function buildTree(entries: TreeEntry[]): FileNode[] {
  const root: FileNode[] = [];
  const stack: FileNode[] = [];
  for (const { depth, name, is_dir } of entries) {
    stack.length = depth;
    const parent = stack[stack.length - 1];
    const path = parent ? `${parent.path}/${name}` : name;
    const node: FileNode = {
      id: path,
      name,
      path,
      type: is_dir ? "folder" : "file",
      language: is_dir ? undefined : languageFor(name),
      children: is_dir ? [] : undefined,
    };
    if (parent) parent.children!.push(node);
    else root.push(node);
    if (is_dir) stack.push(node);
  }
  return root;
}

function flatten(tree: FileNode[], out: Map<string, FileNode> = new Map()) {
  for (const n of tree) {
    out.set(n.path, n);
    if (n.children) flatten(n.children, out);
  }
  return out;
}

/** Rewrite `path` if it equals or is nested under `oldPrefix`, mapping it under `newPrefix`. */
function remapPath(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix;
  if (path.startsWith(oldPrefix + "/")) return newPrefix + path.slice(oldPrefix.length);
  return path;
}

function withoutPrefix<T>(rec: Record<string, T>, prefix: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [p, v] of Object.entries(rec)) {
    if (p !== prefix && !p.startsWith(prefix + "/")) out[p] = v;
  }
  return out;
}

interface EditorState {
  tree: FileNode[];
  loadingTree: boolean;
  tabs: EditorTab[];
  activeTabId: string | null;
  fileContents: Record<string, string>;
  savedContents: Record<string, string>;

  loadTree: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  saveActiveFile: () => Promise<void>;
  createFile: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  renameNode: (oldPath: string, newPath: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
  duplicateFile: (path: string) => Promise<void>;
  applyFileBlocks: (blocks: FileBlock[]) => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tree: [],
  loadingTree: false,
  tabs: [],
  activeTabId: null,
  fileContents: {},
  savedContents: {},

  loadTree: async () => {
    set({ loadingTree: true });
    try {
      const entries = await api.getTree();
      set({ tree: buildTree(entries), loadingTree: false });
    } catch {
      set({ loadingTree: false });
    }
  },

  openFile: async (path) => {
    const node = flatten(get().tree).get(path);
    if (!node || node.type !== "file") return;
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    if (!(path in get().fileContents)) {
      const { content } = await api.getFileContent(path);
      set((s) => ({
        fileContents: { ...s.fileContents, [path]: content },
        savedContents: { ...s.savedContents, [path]: content },
      }));
    }
    const tab: EditorTab = { id: uid(), path, name: node.name, language: node.language ?? "plaintext" };
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId = s.activeTabId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId;
      return { tabs, activeTabId };
    }),

  setActive: (id) => set({ activeTabId: id }),

  updateContent: (path, content) => set((s) => ({ fileContents: { ...s.fileContents, [path]: content } })),

  saveFile: async (path) => {
    const content = get().fileContents[path];
    if (content === undefined) return;
    await api.writeFile(path, content);
    set((s) => ({ savedContents: { ...s.savedContents, [path]: content } }));
  },

  saveActiveFile: async () => {
    const active = get().tabs.find((t) => t.id === get().activeTabId);
    if (active) await get().saveFile(active.path);
  },

  createFile: async (path) => {
    await api.writeFile(path, "");
    set((s) => ({
      fileContents: { ...s.fileContents, [path]: "" },
      savedContents: { ...s.savedContents, [path]: "" },
    }));
    await get().loadTree();
    await get().openFile(path);
  },

  createFolder: async (path) => {
    await api.mkdir(path);
    await get().loadTree();
  },

  renameNode: async (oldPath, newPath) => {
    await api.renameFile(oldPath, newPath);
    set((s) => {
      const tabs = s.tabs.map((t) => {
        const np = remapPath(t.path, oldPath, newPath);
        return np === t.path ? t : { ...t, path: np, name: np.split("/").pop()! };
      });
      const fileContents: Record<string, string> = {};
      for (const [p, c] of Object.entries(s.fileContents)) fileContents[remapPath(p, oldPath, newPath)] = c;
      const savedContents: Record<string, string> = {};
      for (const [p, c] of Object.entries(s.savedContents)) savedContents[remapPath(p, oldPath, newPath)] = c;
      return { tabs, fileContents, savedContents };
    });
    await get().loadTree();
  },

  deleteNode: async (path) => {
    await api.deleteFile(path);
    set((s) => ({
      tabs: s.tabs.filter((t) => t.path !== path),
      activeTabId:
        s.tabs.find((t) => t.id === s.activeTabId)?.path === path
          ? (s.tabs.find((t) => t.path !== path)?.id ?? null)
          : s.activeTabId,
      fileContents: withoutPrefix(s.fileContents, path),
      savedContents: withoutPrefix(s.savedContents, path),
    }));
    await get().loadTree();
  },

  duplicateFile: async (path) => {
    const flat = flatten(get().tree);
    const node = flat.get(path);
    if (!node || node.type !== "file") return;
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    const dotIdx = node.name.lastIndexOf(".");
    const base = dotIdx > 0 ? node.name.slice(0, dotIdx) : node.name;
    const ext = dotIdx > 0 ? node.name.slice(dotIdx) : "";
    let candidateName = `${base} copy${ext}`;
    let n = 2;
    let newPath = dir ? `${dir}/${candidateName}` : candidateName;
    while (flat.has(newPath)) {
      candidateName = `${base} copy ${n}${ext}`;
      newPath = dir ? `${dir}/${candidateName}` : candidateName;
      n++;
    }
    const content = get().fileContents[path] ?? (await api.getFileContent(path)).content;
    await api.writeFile(newPath, content);
    await get().loadTree();
  },

  applyFileBlocks: async (blocks) => {
    if (blocks.length === 0) return;
    await api.applyBlocks(blocks);
    set((s) => {
      const fileContents = { ...s.fileContents };
      const savedContents = { ...s.savedContents };
      for (const b of blocks) {
        fileContents[b.path] = b.content;
        savedContents[b.path] = b.content;
      }
      return { fileContents, savedContents };
    });
    await get().loadTree();
  },
}));
