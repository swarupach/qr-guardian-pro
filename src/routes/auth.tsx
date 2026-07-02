import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, User as UserIcon } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import cyberBg from "@/assets/cyber-bg.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — QR Shield" },
      { name: "description", content: "Sign in to QR Shield to start analyzing QR codes for phishing, malware, and scams." },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});
const signupSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Name is required").max(100),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  };

  const onSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      name: fd.get("name"), email: fd.get("email"),
      password: fd.get("password"), confirm: fd.get("confirm"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!fd.get("terms")) { toast.error("You must accept the terms"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name: parsed.data.name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your inbox to verify.");
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setLoading(false); toast.error("Google sign-in failed"); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen relative grid place-items-center px-4 py-12">
      <img src={cyberBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" width={1920} height={1280} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md glass-strong rounded-3xl p-8"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="size-10 rounded-xl gradient-primary grid place-items-center glow">
            <Shield className="size-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">QR Shield</span>
        </Link>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid grid-cols-2 w-full glass">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={onLogin} className="space-y-4 mt-6">
              <Field icon={Mail} name="email" type="email" placeholder="you@email.com" label="Email" />
              <Field icon={Lock} name="password" type="password" placeholder="••••••••" label="Password" />
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <Checkbox name="remember" defaultChecked /> Remember me
                </label>
                <button type="button" className="text-primary hover:underline" onClick={async () => {
                  const email = (document.querySelector<HTMLInputElement>('input[name="email"]')?.value || "").trim();
                  if (!email) return toast.error("Enter your email first");
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
                  if (error) toast.error(error.message); else toast.success("Password reset email sent");
                }}>Forgot?</button>
              </div>
              <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 glow h-11">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <Divider />
              <GoogleBtn onClick={onGoogle} disabled={loading} />
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={onSignup} className="space-y-4 mt-6">
              <Field icon={UserIcon} name="name" type="text" placeholder="Jane Doe" label="Full name" />
              <Field icon={Mail} name="email" type="email" placeholder="you@email.com" label="Email" />
              <Field icon={Lock} name="password" type="password" placeholder="At least 6 characters" label="Password" />
              <Field icon={Lock} name="confirm" type="password" placeholder="Repeat password" label="Confirm password" />
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox name="terms" className="mt-0.5" />
                <span>I agree to the Terms of Service and Privacy Policy.</span>
              </label>
              <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 glow h-11">
                {loading ? "Creating account…" : "Create account"}
              </Button>
              <Divider />
              <GoogleBtn onClick={onGoogle} disabled={loading} />
            </form>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, label, ...props }: { icon: React.ComponentType<{ className?: string }>; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.name}>{label}</Label>
      <div className="relative">
        <Icon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input id={props.name} {...props} className="pl-9 h-11 bg-white/5 border-white/10" />
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-2">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
      <div className="relative flex justify-center text-xs"><span className="bg-transparent px-2 text-muted-foreground">or continue with</span></div>
    </div>
  );
}

function GoogleBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" onClick={onClick} disabled={disabled} variant="outline" className="w-full h-11 glass border-white/10">
      <svg className="size-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13 4.5 4 13.5 4 24.5s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.1z"/><path fill="#4CAF50" d="M24 44.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.9 16.2 44.5 24 44.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.3 0-1.3-.1-2.7-.4-4z"/></svg>
      Google
    </Button>
  );
}