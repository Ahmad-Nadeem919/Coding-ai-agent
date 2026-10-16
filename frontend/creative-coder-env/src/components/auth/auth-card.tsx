"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid place-items-center px-4 bg-[radial-gradient(1200px_600px_at_50%_-10%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent)]">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-chart-5 grid place-items-center shadow-lg shadow-primary/25"><Sparkles className="size-4 text-primary-foreground" /></div>
          <span className="font-semibold tracking-tight">Codex</span>
        </Link>
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
