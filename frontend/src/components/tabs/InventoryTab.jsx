import { useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsBar from "@/components/StatsBar";
import InventoryTable from "@/components/InventoryTable";
import ProductDialog from "@/components/ProductDialog";
import { MagnifyingGlass, Plus, ShoppingCart, ShoppingBag } from "@phosphor-icons/react";

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
      {/* Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Inventory
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {isAdmin
              ? "Manage your products and record stock movements."
              : "Browse products and record buy or sell transactions."}
          </p>
        </div>

        {/* Desktop quick actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            data-testid="desktop-buy-btn"
            onClick={() => onBuy?.(null)}
            className="h-11 gap-2 bg-primary hover:bg-primary/90"
          >
            <ShoppingCart size={16} weight="bold" /> Buy
          </Button>
          <Button
            data-testid="desktop-sell-btn"
            onClick={() => onSell?.(null)}
            variant="outline"
            className="h-11 gap-2"
          >
            <ShoppingBag size={16} weight="bold" /> Sell
          </Button>
          {isAdmin && (
            <Button
              data-testid="add-product-btn"
              onClick={() => { setEditing(null); setDialogOpen(true); }}
              variant="outline"
              className="h-11 px-4 gap-2"
            >
              <Plus size={16} weight="bold" /> Add product
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Search + mobile add */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            data-testid="search-input"
            placeholder="Search by name or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-11 text-base"
          />
        </div>
        {isAdmin && (
          <Button
            data-testid="add-product-btn-mobile"
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="h-12 px-4 gap-2 md:hidden bg-primary hover:bg-primary/90"
          >
            <Plus size={18} weight="bold" /> Add product
          </Button>
        )}
      </div>

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
