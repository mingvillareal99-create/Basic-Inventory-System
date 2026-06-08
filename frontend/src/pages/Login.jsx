import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Package, Eye, EyeSlash } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(username, password);
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
            <h1 className="text-2xl font-semibold tracking-tight">Palm's Inventory</h1>
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
              <Label htmlFor="username" className="text-sm">Username</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 text-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
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

      </div>
    </div>
  );
}
