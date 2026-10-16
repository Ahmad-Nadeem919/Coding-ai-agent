import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ChatView } from "@/components/chat/chat-view";

export default function WorkspacePage() {
  return (
    <WorkspaceShell>
      <ChatView />
    </WorkspaceShell>
  );
}
