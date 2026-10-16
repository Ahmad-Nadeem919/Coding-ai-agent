"use client";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bot, User, Copy, RefreshCw, Pencil, GitBranch, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`shrink-0 size-8 rounded-lg grid place-items-center ${isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-primary to-chart-5 text-primary-foreground"}`}>
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? "flex flex-col items-end" : ""}`}>
        <div className={`inline-block max-w-full ${isUser ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2" : "text-foreground"}`}>
          {isUser ? (
            <div className="whitespace-pre-wrap text-sm">{message.content}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-transparent prose-pre:p-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    if (inline) return <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono" {...props}>{children}</code>;
                    return (
                      <div className="my-3 rounded-lg overflow-hidden border bg-[#282c34]">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 text-xs text-muted-foreground">
                          <span className="font-mono">{match?.[1] ?? "code"}</span>
                          <button onClick={() => { navigator.clipboard.writeText(String(children)); toast.success("Copied"); }} className="hover:text-foreground"><Copy className="size-3" /></button>
                        </div>
                        <SyntaxHighlighter language={match?.[1] ?? "text"} style={oneDark as any} customStyle={{ margin: 0, background: "transparent", fontSize: 12.5 }} PreTag="div">
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    );
                  },
                  table: ({ children }) => <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>,
                }}
              >
                {message.content || (message.status === "streaming" ? "▍" : "")}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && message.status !== "streaming" && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1.5">
            <Button size="icon" variant="ghost" className="size-6" onClick={copy}>
              {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
            </Button>
            <Button size="icon" variant="ghost" className="size-6"><RefreshCw className="size-3" /></Button>
            <Button size="icon" variant="ghost" className="size-6"><GitBranch className="size-3" /></Button>
          </div>
        )}
        {isUser && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
            <Button size="icon" variant="ghost" className="size-6"><Pencil className="size-3" /></Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
