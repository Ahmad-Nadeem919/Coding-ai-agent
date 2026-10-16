import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SignupPage() {
  return (
    <AuthCard title="Create your account" subtitle="Start building with an AI pair-programmer">
      <div className="space-y-3">
        <div><Label>Name</Label><Input placeholder="Alex Rivera" /></div>
        <div><Label>Email</Label><Input type="email" placeholder="you@company.com" /></div>
        <div><Label>Password</Label><Input type="password" placeholder="8+ characters" /></div>
        <Button className="w-full">Create account</Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">Have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link></p>
    </AuthCard>
  );
}
