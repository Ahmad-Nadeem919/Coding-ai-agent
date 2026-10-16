import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Github, Chrome } from "lucide-react";

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to continue to Codex">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline"><Github className="size-4" /> GitHub</Button>
        <Button variant="outline"><Chrome className="size-4" /> Google</Button>
      </div>
      <div className="relative py-2 text-center text-xs text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-border"><span className="relative bg-card px-2">or</span></div>
      <div className="space-y-3">
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@company.com" /></div>
        <div>
          <div className="flex justify-between"><Label htmlFor="pw">Password</Label><Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link></div>
          <Input id="pw" type="password" placeholder="••••••••" />
        </div>
        <Button className="w-full">Sign in</Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">No account? <Link href="/signup" className="text-primary hover:underline">Create one</Link></p>
    </AuthCard>
  );
}
