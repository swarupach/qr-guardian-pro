import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Shield, LayoutDashboard, ScanLine, History, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export function Navbar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const links = [
    { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/scan", label: "Scan", Icon: ScanLine },
    { to: "/history", label: "History", Icon: History },
  ] as const;

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="size-9 rounded-xl gradient-primary grid place-items-center glow group-hover:scale-105 transition-transform">
            <Shield className="size-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">QR Shield</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                  active ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}