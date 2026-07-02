import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Trash2, Download, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Scan history — QR Shield" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Scan history</h1>
        <p className="text-muted-foreground mt-1">Every QR code you've scanned, searchable and exportable.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <HistoryList />
      </Suspense>
    </div>
  );
}

function HistoryList() {
  const qc = useQueryClient();
  const { data: scans } = useSuspenseQuery({
    queryKey: ["scans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scan_history")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => scans.filter((s) => {
    if (filter !== "all" && s.risk_level !== filter) return false;
    if (q && !s.qr_content.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [scans, q, filter]);

  const exportCsv = () => {
    const rows = [
      ["Date", "Type", "Risk", "Score", "Content"].join(","),
      ...filtered.map((s) =>
        [
          new Date(s.created_at).toISOString(),
          s.qr_type,
          s.risk_level,
          s.security_score,
          JSON.stringify(s.qr_content),
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-shield-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("scan_history").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Scan deleted");
    qc.invalidateQueries({ queryKey: ["scans"] });
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search content…"
            className="pl-9 h-10 bg-white/5 border-white/10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px] h-10 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risks</SelectItem>
            <SelectItem value="safe">Safe</SelectItem>
            <SelectItem value="suspicious">Suspicious</SelectItem>
            <SelectItem value="dangerous">Dangerous</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="size-4" />CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <HistoryIcon className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No scans match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Content</th>
                <th className="px-2 py-2 font-medium">Score</th>
                <th className="px-2 py-2 font-medium">Risk</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((s) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/5"
                >
                  <td className="px-2 py-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="px-2 py-3 text-xs uppercase tracking-wide text-muted-foreground">{s.qr_type}</td>
                  <td className="px-2 py-3 max-w-[320px] truncate font-mono text-sm">{s.qr_content}</td>
                  <td className="px-2 py-3 text-sm tabular-nums font-semibold">{s.security_score}</td>
                  <td className="px-2 py-3"><RiskBadge level={s.risk_level as "safe" | "suspicious" | "dangerous"} /></td>
                  <td className="px-2 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)} aria-label="Delete">
                      <Trash2 className="size-4 text-muted-foreground hover:text-danger" />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}