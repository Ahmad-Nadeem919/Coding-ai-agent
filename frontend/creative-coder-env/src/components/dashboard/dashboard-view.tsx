"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileCode2, Code2, CheckCircle2, Timer, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

const activity = Array.from({ length: 14 }).map((_, i) => ({
  day: `D${i + 1}`, chats: 8 + Math.round(Math.random() * 12), files: 3 + Math.round(Math.random() * 8),
}));
const langs = [
  { lang: "TS", loc: 12400 }, { lang: "TSX", loc: 8900 }, { lang: "CSS", loc: 2100 },
  { lang: "MD", loc: 1300 }, { lang: "JSON", loc: 800 }, { lang: "SQL", loc: 640 },
];

function Stat({ icon: Icon, label, value, delta, up }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="size-4" /></div>
          <Badge variant="outline" className={`text-[10px] gap-1 ${up ? "text-success border-success" : "text-destructive border-destructive"}`}>
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}{delta}
          </Badge>
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Project dashboard</h1>
          <p className="text-sm text-muted-foreground">Your coding agent activity over the last 14 days.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={MessageSquare} label="Conversations" value="248" delta="+12%" up />
          <Stat icon={FileCode2} label="Files generated" value="1,204" delta="+8%" up />
          <Stat icon={Code2} label="Lines of code" value="26,131" delta="+21%" up />
          <Stat icon={CheckCircle2} label="Tasks completed" value="87" delta="+4%" up />
          <Stat icon={Timer} label="Avg response" value="1.2s" delta="−9%" up />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Daily activity</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="chats" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="files" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Lines of code by language</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={langs}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="lang" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="loc" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
