import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, ScanLine, X, ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, Lock, Globe, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { analyzeQr, type AnalysisResult } from "@/lib/qr-analyzer";
import { decodeQrFromFile } from "@/lib/qr-decoder";
import { RiskBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "Scan QR — QR Shield" }] }),
  component: ScanPage,
});

function ScanPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const qc = useQueryClient();

  const handleResult = useCallback(async (content: string) => {
    const analysis = analyzeQr(content);
    setResult(analysis);
    const { error } = await supabase.from("scan_history").insert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      qr_content: content,
      qr_type: analysis.decoded.type,
      security_score: analysis.score,
      risk_level: analysis.level,
      reasons: analysis.reasons,
      decoded_data: analysis.decoded as never,
    });
    if (error) toast.error("Could not save scan: " + error.message);
    else qc.invalidateQueries({ queryKey: ["scans"] });
  }, [qc]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Scan a QR code</h1>
        <p className="text-muted-foreground mt-1">Use your camera or drop an image — we'll analyze the result instantly.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <Tabs defaultValue="upload">
            <TabsList className="grid grid-cols-2 w-full glass">
              <TabsTrigger value="upload"><Upload className="size-4 mr-2" />Upload</TabsTrigger>
              <TabsTrigger value="camera"><Camera className="size-4 mr-2" />Camera</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-6">
              <Uploader onDecoded={handleResult} />
            </TabsContent>
            <TabsContent value="camera" className="mt-6">
              <CameraScanner onDecoded={handleResult} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="glass rounded-2xl p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {result ? (
              <ResultPanel key={result.decoded.raw} result={result} onClear={() => setResult(null)} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full grid place-items-center text-center"
              >
                <div>
                  <div className="size-16 mx-auto rounded-2xl glass grid place-items-center mb-4">
                    <ScanLine className="size-7 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Scan results will appear here.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Uploader({ onDecoded }: { onDecoded: (s: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    if (!/image\/(png|jpe?g)/i.test(file.type)) return toast.error("Please upload a PNG or JPG image");
    setBusy(true);
    try {
      const content = await decodeQrFromFile(file);
      if (!content) toast.error("No QR code detected in that image");
      else onDecoded(content);
    } catch {
      toast.error("Failed to read image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handle(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-12 text-center ${
        dragging ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/60 hover:bg-white/5"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
      />
      <Upload className="size-10 mx-auto text-primary mb-3" />
      <p className="font-medium">{busy ? "Decoding…" : "Drop a QR image here"}</p>
      <p className="text-sm text-muted-foreground mt-1">or click to browse · PNG, JPG, JPEG</p>
    </div>
  );
}

function CameraScanner({ onDecoded }: { onDecoded: (s: string) => void }) {
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled || !containerRef.current) return;
      const id = "qr-camera-region";
      containerRef.current.innerHTML = `<div id="${id}" class="rounded-xl overflow-hidden"></div>`;
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner as never;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            onDecoded(decoded);
            scanner.stop().catch(() => {}).finally(() => setActive(false));
          },
          () => {},
        );
      } catch (e) {
        toast.error("Could not access camera — check browser permissions");
        setActive(false);
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [active, onDecoded]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="rounded-xl bg-black/40 aspect-square w-full grid place-items-center overflow-hidden">
        {!active && (
          <div className="text-center p-8">
            <Camera className="size-10 mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Camera is off</p>
          </div>
        )}
      </div>
      <Button
        onClick={() => setActive((a) => !a)}
        className={`w-full h-11 ${active ? "" : "gradient-primary border-0 glow"}`}
        variant={active ? "outline" : "default"}
      >
        {active ? <><X className="size-4" />Stop camera</> : <><Camera className="size-4" />Start camera</>}
      </Button>
    </div>
  );
}

function ResultPanel({ result, onClear }: { result: AnalysisResult; onClear: () => void }) {
  const { score, level, reasons, explanation, decoded } = result;
  const verdict = {
    safe: { Icon: ShieldCheck, label: "Safe to continue", color: "text-safe", bg: "bg-safe/15", ring: "ring-safe/30" },
    suspicious: { Icon: AlertTriangle, label: "Proceed with caution", color: "text-warn", bg: "bg-warn/15", ring: "ring-warn/30" },
    dangerous: { Icon: ShieldAlert, label: "Dangerous — do not open", color: "text-danger", bg: "bg-danger/15", ring: "ring-danger/30" },
  }[level];

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      <div className="flex items-start gap-4">
        <div className={`size-14 rounded-2xl ${verdict.bg} ring-1 ${verdict.ring} grid place-items-center shrink-0`}>
          <verdict.Icon className={`size-7 ${verdict.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <RiskBadge level={level} />
          <h2 className={`text-xl font-bold mt-1.5 ${verdict.color}`}>{verdict.label}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClear}><X className="size-4" /></Button>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-muted-foreground">Security score</span>
          <span className="text-2xl font-bold tabular-nums">{score}<span className="text-base text-muted-foreground">/100</span></span>
        </div>
        <Progress value={score} className="h-2" />
      </div>

      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Decoded content</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-primary/20 text-primary">{decoded.type}</span>
          {decoded.https && <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-safe/20 text-safe inline-flex items-center gap-1"><Lock className="size-3" />HTTPS</span>}
          {decoded.https === false && <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-danger/20 text-danger inline-flex items-center gap-1"><Lock className="size-3" />HTTP</span>}
        </div>
        <p className="text-sm font-mono break-all">{decoded.raw}</p>
        {decoded.domain && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat icon={Globe} label="Domain" value={decoded.domain} />
            <Stat icon={Link2} label="Length" value={`${decoded.raw.length} chars`} />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Analysis</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Detected indicators</h3>
        <ul className="space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={`mt-1.5 size-1.5 rounded-full shrink-0 ${
                r.severity === "danger" ? "bg-danger" : r.severity === "warn" ? "bg-warn" : "bg-safe"
              }`} />
              <span className="text-muted-foreground">{r.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {decoded.url && level !== "dangerous" && (
        <a href={decoded.url} target="_blank" rel="noopener noreferrer">
          <Button className={`w-full h-11 ${level === "safe" ? "gradient-primary border-0 glow" : ""}`} variant={level === "safe" ? "default" : "outline"}>
            <ExternalLink className="size-4" />
            {level === "safe" ? "Open website" : "Open anyway"}
          </Button>
        </a>
      )}
      {level === "dangerous" && (
        <div className="rounded-xl bg-danger/10 border border-danger/30 p-4 text-sm text-danger">
          Opening blocked — this QR code shows strong indicators of phishing or malware.
        </div>
      )}
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm truncate">{value}</div>
      </div>
    </div>
  );
}