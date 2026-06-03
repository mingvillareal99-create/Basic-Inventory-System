import { useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsBar from "@/components/StatsBar";
import InventoryTable from "@/components/InventoryTable";
import ProductDialog from "@/components/ProductDialog";
import { MagnifyingGlass, Plus, ShoppingCart, ArrowsLeftRight } from "@phosphor-icons/react";

export default function InventoryTab({ products, loading, isAdmin, reload, onBuy, onSell }) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

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

  const onSaveProduct = async (payload) => {
    try {
      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product added");
      }
      setDialogOpen(false);
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  const onDeleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-fade-up">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Overview / {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
          </p>
          <h1 className="text-3xl md:text-4xl tracking-tight leading-none font-semibold mt-1">
            All inventory.
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mt-2">
            {isAdmin
              ? "Search, restock, and prune your catalog. Items below 5 units are flagged."
              : "Browse products and record buy / sell transactions."}
          </p>
        </div>

        {/* Desktop quick actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            data-testid="desktop-buy-btn"
            onClick={() => onBuy?.(null)}
            variant="outline"
            className="h-11 gap-2 border-success/40 hover:bg-success/10 text-success"
          >
            <ShoppingCart size={16} weight="bold" /> Buy
          </Button>
          <Button
            data-testid="desktop-sell-btn"
            onClick={() => onSell?.(null)}
            variant="outline"
            className="h-11 gap-2"
          >
            <ArrowsLeftRight size={16} weight="bold" /> Sell
          </Button>
          {isAdmin && (
            <Button
              data-testid="add-product-btn"
              onClick={() => { setEditing(null); setDialogOpen(true); }}
              className="h-11 px-4 gap-2"
            >
              <Plus size={14} weight="bold" /> Add product
            </Button>
          )}
        </div>
      </div>

      {/* Search + mobile add */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            data-testid="search-input"
            placeholder="Search name or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-10 text-base"
          />
        </div>
        {isAdmin && (
          <Button
            data-testid="add-product-btn-mobile"
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="h-12 px-4 gap-2 md:hidden"
          >
            <Plus size={16} weight="bold" /> Add product
          </Button>
        )}
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Table */}
      <InventoryTable
        products={filtered}
        loading={loading}
        isAdmin={isAdmin}
        onBuy={onBuy}
        onSell={onSell}
        onDelete={onDeleteProduct}
        onEdit={(p) => { setEditing(p); setDialogOpen(true); }}
      />

      <ProductDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        product={editing}
        onSave={onSaveProduct}
      />
    </div>
  );
}
