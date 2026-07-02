import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { Shield, ScanLine, AlertTriangle, ShieldAlert, ShieldCheck, Activity, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — QR Shield" }] }),
  component: Dashboard,
});

const scansQuery = {
  queryKey: ["scans"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("scan_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },
};

function Dashboard() {
  return (
    <div className="space-y-8">
      <Header />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

function Header() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1">Here's a snapshot of your QR security activity.</p>
      </div>
      <Link to="/scan">
        <Button className="gradient-primary border-0 glow h-11 px-5">
          <ScanLine className="size-4" /> Quick scan
        </Button>
      </Link>
    </motion.div>
  );
}

function DashboardContent() {
  const { data: scans } = useSuspenseQuery(scansQuery);
  const stats = {
    total: scans.length,
    safe: scans.filter((s) => s.risk_level === "safe").length,
    suspicious: scans.filter((s) => s.risk_level === "suspicious").length,
    dangerous: scans.filter((s) => s.risk_level === "dangerous").length,
  };
  const recent = scans.slice(0, 6);

  const cards = [
    { label: "Total scans", value: stats.total, Icon: Activity, accent: "text-primary", bg: "bg-primary/15" },
    { label: "Safe", value: stats.safe, Icon: ShieldCheck, accent: "text-safe", bg: "bg-safe/15" },
    { label: "Suspicious", value: stats.suspicious, Icon: AlertTriangle, accent: "text-warn", bg: "bg-warn/15" },
    { label: "Dangerous", value: stats.dangerous, Icon: ShieldAlert, accent: "text-danger", bg: "bg-danger/15" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <div className={`size-9 rounded-lg grid place-items-center ${c.bg}`}>
                <c.Icon className={`size-4 ${c.accent}`} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold tabular-nums">{c.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent scans</h2>
          <Link to="/history" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="size-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No scans yet. Run your first scan to see it here.</p>
            <Link to="/scan" className="inline-block mt-4">
              <Button className="gradient-primary border-0 glow"><ScanLine className="size-4" /> Scan now</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {recent.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <RiskBadge level={s.risk_level as "safe" | "suspicious" | "dangerous"} />
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wide">{s.qr_type}</span>
                  </div>
                  <p className="truncate text-sm mt-1 font-mono">{s.qr_content}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{s.security_score}/100</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function RiskBadge({ level }: { level: "safe" | "suspicious" | "dangerous" }) {
  const map = {
    safe: { label: "Safe", cls: "bg-safe/20 text-safe border-safe/30" },
    suspicious: { label: "Suspicious", cls: "bg-warn/20 text-warn border-warn/30" },
    dangerous: { label: "Dangerous", cls: "bg-danger/20 text-danger border-danger/30" },
  } as const;
  const m = map[level];
  return <Badge variant="outline" className={`${m.cls} font-medium`}>{m.label}</Badge>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}