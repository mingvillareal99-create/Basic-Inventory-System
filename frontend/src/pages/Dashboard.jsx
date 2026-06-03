import { useEffect, useMemo, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import ProductDialog from "@/components/ProductDialog";
import StatsBar from "@/components/StatsBar";
import InventoryTable from "@/components/InventoryTable";
import {
  Sun,
  Moon,
  SignOut,
  Plus,
  MagnifyingGlass,
  Package,
} from "@phosphor-icons/react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/products");
      setProducts(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s)
    );
  }, [products, search]);

  const stats = useMemo(() => {
    const total = products.length;
    const low = products.filter((p) => p.quantity < 5).length;
    const value = products.reduce((sum, p) => sum + p.quantity * p.price, 0);
    return { total, low, value };
  }, [products]);

  const onSave = async (payload) => {
    try {
      if (editing) {
        const { data } = await api.patch(`/products/${editing.id}`, payload);
        setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        toast.success("Product updated");
      } else {
        const { data } = await api.post("/products", payload);
        setProducts((prev) => [data, ...prev]);
        toast.success("Product added");
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  const onAdjust = async (id, delta) => {
    try {
      const { data } = await api.patch(`/products/${id}/stock`, { delta });
      setProducts((prev) => prev.map((p) => (p.id === id ? data : p)));
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product deleted");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="dashboard-page">
      <Toaster position="top-right" theme={theme} />

      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 border border-border flex items-center justify-center">
              <Package size={16} weight="duotone" />
            </div>
            <div className="leading-tight">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Stockroom
              </p>
              <p className="font-heading text-sm">Inventory Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3">
              {user?.email}
            </span>
            <button
              data-testid="theme-toggle-btn"
              onClick={toggle}
              className="h-9 w-9 inline-flex items-center justify-center border border-border hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              data-testid="logout-btn"
              onClick={logout}
              className="h-9 px-3 inline-flex items-center gap-2 border border-border hover:bg-muted transition-colors text-xs font-mono uppercase tracking-wider"
            >
              <SignOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 md:py-12 space-y-8">
        {/* Heading + actions */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 animate-fade-up">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Overview / {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
            </p>
            <h1 className="font-heading text-4xl md:text-5xl tracking-tight leading-none">
              All inventory.
            </h1>
            <p className="text-sm text-muted-foreground max-w-md">
              Search, restock, and prune your catalog. Items below 5 units are flagged.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                data-testid="search-input"
                placeholder="Search name or category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-none h-11 pl-9 w-full md:w-80"
              />
            </div>
            <Button
              data-testid="add-product-btn"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="rounded-none h-11 px-4 gap-2"
            >
              <Plus size={14} weight="bold" /> Add product
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StatsBar stats={stats} />

        {/* Table */}
        <InventoryTable
          products={filtered}
          loading={loading}
          onAdjust={onAdjust}
          onDelete={onDelete}
          onEdit={(p) => {
            setEditing(p);
            setDialogOpen(true);
          }}
        />
      </main>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        product={editing}
        onSave={onSave}
      />
    </div>
  );
}
