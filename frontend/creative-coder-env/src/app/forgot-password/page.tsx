import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ForgotPage() {
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a reset link">
      <div className="space-y-3">
        <div><Label>Email</Label><Input type="email" placeholder="you@company.com" /></div>
        <Button className="w-full">Send reset link</Button>
      </div>
      <p className="text-center text-xs text-muted-foreground"><Link href="/login" className="text-primary hover:underline">Back to sign in</Link></p>
    </AuthCard>
  );
}
