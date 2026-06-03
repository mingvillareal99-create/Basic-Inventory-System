import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Package } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <div
      data-testid="login-page"
      className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 px-4 py-12 relative"
    >
      <button
        data-testid="theme-toggle-login"
        type="button"
        onClick={toggle}
        className="absolute top-4 right-4 h-10 w-10 inline-flex items-center justify-center border border-border hover:bg-muted transition-colors rounded-lg bg-card"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center card-shadow">
            <Package size={28} weight="fill" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Stockroom</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Simple inventory for everyday use
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border card-shadow p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage your inventory.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email address</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-12 text-base"
              />
            </div>

            {error && (
              <div
                data-testid="login-error"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg"
              >
                {error}
              </div>
            )}

            <Button
              data-testid="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-medium"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium text-foreground">Demo admin:</span>{" "}
            admin@example.com / admin123
          </p>
          <p>New accounts are created by an admin inside the app.</p>
        </div>
      </div>
    </div>
  );
}
