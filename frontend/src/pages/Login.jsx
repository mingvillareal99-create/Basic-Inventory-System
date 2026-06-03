import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Package } from "@phosphor-icons/react";

const LOGIN_BG =
  "https://images.pexels.com/photos/7641148/pexels-photo-7641148.jpeg";

export default function Login() {
  const { login, register } = useAuth();
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res =
      mode === "login"
        ? await login(email, password)
        : await register(email, password, name);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <div
      className="min-h-screen w-full relative grid lg:grid-cols-2"
      data-testid="login-page"
    >
      {/* Image side */}
      <div
        className="hidden lg:block relative"
        style={{
          backgroundImage: `url(${LOGIN_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 h-full p-12 flex flex-col justify-between text-white">
          <div className="flex items-center gap-2">
            <Package size={22} weight="duotone" />
            <span className="font-mono uppercase text-xs tracking-[0.2em]">
              STOCKROOM / v1
            </span>
          </div>
          <div className="space-y-6">
            <h1 className="font-heading text-5xl xl:text-6xl leading-[0.95] tracking-tight">
              Inventory,
              <br />
              <span className="text-white/60">at a glance.</span>
            </h1>
            <p className="text-sm text-white/60 max-w-md leading-relaxed">
              A minimalist control room for your products — search, adjust,
              and ship without leaving the table.
            </p>
            <div className="flex items-center gap-6 pt-6 text-xs font-mono uppercase tracking-wider text-white/40">
              <span>01 — Add</span>
              <span>02 — Adjust</span>
              <span>03 — Audit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-sm space-y-8 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <Package size={20} weight="duotone" />
              <span className="font-mono uppercase text-xs tracking-[0.2em]">
                Stockroom
              </span>
            </div>
            <button
              data-testid="theme-toggle-login"
              type="button"
              onClick={toggle}
              className="ml-auto h-9 w-9 inline-flex items-center justify-center border border-border hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {mode === "login" ? "01 / Sign in" : "01 / Create account"}
            </p>
            <h2 className="font-heading text-3xl tracking-tight">
              {mode === "login" ? "Welcome back." : "Set up your workspace."}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Continue to your inventory dashboard."
                : "New here? Register a fresh account in seconds."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                  Name
                </Label>
                <Input
                  id="name"
                  data-testid="register-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Doe"
                  className="rounded-none h-11"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Email
              </Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="rounded-none h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Password
              </Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-none h-11"
              />
            </div>

            {error && (
              <div
                data-testid="login-error"
                className="text-xs text-destructive border border-destructive/40 px-3 py-2 font-mono"
              >
                {error}
              </div>
            )}

            <Button
              data-testid={mode === "login" ? "login-submit-btn" : "register-submit-btn"}
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-none font-medium tracking-wide"
            >
              {loading ? "..." : mode === "login" ? "Sign in →" : "Create account →"}
            </Button>
          </form>

          <div className="flex items-center justify-between pt-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <span>{mode === "login" ? "No account?" : "Have an account?"}</span>
            <button
              data-testid="toggle-auth-mode-btn"
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-foreground hover:underline"
            >
              {mode === "login" ? "Register →" : "Sign in →"}
            </button>
          </div>

          <p className="font-mono text-[10px] text-muted-foreground border-t border-border pt-4">
            Demo: admin@example.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
