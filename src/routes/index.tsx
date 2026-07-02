import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, ScanLine, AlertTriangle, Activity, Lock, Eye, ArrowRight } from "lucide-react";
import cyberBg from "@/assets/cyber-bg.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QR Shield — AI-Powered QR Code Security Scanner" },
      { name: "description", content: "Scan any QR code and instantly know if it's safe. AI-powered phishing, malware, and scam detection in under a second." },
      { property: "og:title", content: "QR Shield — AI-Powered QR Code Security Scanner" },
      { property: "og:description", content: "Scan any QR code and instantly know if it's safe. AI-powered phishing, malware, and scam detection." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl gradient-primary grid place-items-center glow">
            <Shield className="size-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">QR Shield</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth"><Button size="sm" className="gradient-primary border-0 glow">Get started</Button></Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img
          src={cyberBg}
          alt=""
          width={1920}
          height={1280}
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium mb-8"
          >
            <span className="size-1.5 rounded-full bg-safe animate-pulse" />
            AI-powered threat analysis · 13 detection layers
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]"
          >
            Don't trust a QR code.
            <br />
            <span className="gradient-text">Scan it.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            QR Shield analyzes every QR code for phishing, malware, suspicious redirects, and scam patterns — and explains the risk in plain English.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/auth">
              <Button size="lg" className="gradient-primary border-0 glow h-12 px-6 text-base">
                Start scanning free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base glass border-white/10">
                Sign in
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { Icon: ScanLine, title: "Camera + Image upload", desc: "Scan live with your camera or drop a QR image to decode instantly." },
            { Icon: AlertTriangle, title: "13 security checks", desc: "HTTPS, shorteners, homographs, phishing keywords, malware payloads, and more." },
            { Icon: Activity, title: "0–100 security score", desc: "Every scan gets a clear score with Safe, Suspicious or Dangerous verdict." },
            { Icon: Eye, title: "Plain-English reasoning", desc: "No jargon — see exactly why a code was flagged or trusted." },
            { Icon: Lock, title: "Private by default", desc: "Scans live in your account behind row-level security. Only you can see them." },
            { Icon: Shield, title: "Full scan history", desc: "Search, filter, and revisit every code you've ever scanned." },
          ].map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="glass rounded-2xl p-6"
            >
              <div className="size-10 rounded-xl bg-primary/15 grid place-items-center mb-4">
                <Icon className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} QR Shield — Stay safe out there.
      </footer>
    </div>
  );
}
