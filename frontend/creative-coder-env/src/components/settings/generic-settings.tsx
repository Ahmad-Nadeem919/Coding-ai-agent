"use client";
import { Card, CardContent } from "@/components/ui/card";
export function GenericSettings() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Coming soon</h2>
      <p className="text-sm text-muted-foreground">This section is scaffolded and ready to wire up to your backend.</p>
      <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Configure this section from your backend settings API.</CardContent></Card>
    </div>
  );
}
