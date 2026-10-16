import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { MonacoEditorPanel } from "@/components/editor/monaco-editor";

export default function EditorPage() {
  return <WorkspaceShell><MonacoEditorPanel /></WorkspaceShell>;
}
