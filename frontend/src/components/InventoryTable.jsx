import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShoppingCart, ArrowsLeftRight, PencilSimple, Trash, Warning, Archive,
} from "@phosphor-icons/react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function InventoryTable({
  products, loading, isAdmin, onBuy, onSell, onDelete, onEdit,
}) {
  const [confirmId, setConfirmId] = useState(null);

  if (loading) {
    return (
      <div
        data-testid="table-loading"
        className="border border-border rounded-md p-12 text-center font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground"
      >
        Loading inventory…
      </div>
    );
  }

  if (!products.length) {
    return (
      <div data-testid="empty-state" className="border border-border rounded-md p-12 text-center space-y-3">
        <Archive size={28} className="mx-auto text-muted-foreground" />
        <p className="text-xl font-semibold">No products found.</p>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Add your first product to start tracking inventory." : "Ask your admin to add products."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden sm:block border border-border rounded-md overflow-x-auto bg-card" data-testid="inventory-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">#</th>
              <th className="text-left font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">Product</th>
              <th className="text-left font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">Category</th>
              <th className="text-right font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">Stock</th>
              <th className="text-right font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">Unit</th>
              <th className="text-right font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3 w-[260px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const low = p.quantity < 5;
              return (
                <tr key={p.id} data-testid={`product-row-${p.id}`} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {low && (
                        <Warning size={14} weight="fill" className="text-destructive shrink-0" data-testid={`low-stock-flag-${p.id}`} />
                      )}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="border border-border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider rounded-sm">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono tabular ${low ? "text-destructive font-semibold" : ""}`} data-testid={`qty-${p.id}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular">${fmt(p.price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        data-testid={`buy-${p.id}`}
                        onClick={() => onBuy?.(p)}
                        className="h-9 px-2 inline-flex items-center gap-1 border border-success/40 text-success hover:bg-success/10 transition-colors rounded-md text-xs font-medium"
                        title="Buy / restock"
                      >
                        <ShoppingCart size={14} weight="bold" />
                        <span className="hidden md:inline">Buy</span>
                      </button>
                      <button
                        data-testid={`sell-${p.id}`}
                        onClick={() => onSell?.(p)}
                        disabled={p.quantity === 0}
                        className="h-9 px-2 inline-flex items-center gap-1 border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md text-xs font-medium"
                        title="Sell"
                      >
                        <ArrowsLeftRight size={14} weight="bold" />
                        <span className="hidden md:inline">Sell</span>
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            data-testid={`edit-${p.id}`}
                            onClick={() => onEdit?.(p)}
                            className="h-9 w-9 inline-flex items-center justify-center border border-border hover:bg-muted transition-colors rounded-md"
                            title="Edit"
                          >
                            <PencilSimple size={14} />
                          </button>
                          <button
                            data-testid={`delete-${p.id}`}
                            onClick={() => setConfirmId(p.id)}
                            className="h-9 w-9 inline-flex items-center justify-center border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors rounded-md"
                            title="Delete"
                          >
                            <Trash size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2" data-testid="inventory-cards">
        {products.map((p) => {
          const low = p.quantity < 5;
          return (
            <div key={p.id} data-testid={`product-card-${p.id}`} className="border border-border bg-card rounded-md p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {low && <Warning size={12} weight="fill" className="text-destructive shrink-0" data-testid={`low-stock-flag-${p.id}`} />}
                    <p className="font-semibold truncate">{p.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono tabular text-lg leading-none ${low ? "text-destructive font-semibold" : ""}`} data-testid={`qty-${p.id}`}>
                    {p.quantity}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">in stock</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <p className="font-mono tabular text-sm">${fmt(p.price)}</p>
                <div className="flex items-center gap-1">
                  <button data-testid={`buy-${p.id}`} onClick={() => onBuy?.(p)} className="h-9 px-3 border border-success/40 text-success hover:bg-success/10 rounded-md text-xs font-semibold">
                    Buy
                  </button>
                  <button data-testid={`sell-${p.id}`} onClick={() => onSell?.(p)} disabled={p.quantity === 0} className="h-9 px-3 border border-border hover:bg-muted disabled:opacity-30 rounded-md text-xs font-semibold">
                    Sell
                  </button>
                  {isAdmin && (
                    <>
                      <button data-testid={`edit-${p.id}`} onClick={() => onEdit?.(p)} className="h-9 w-9 inline-flex items-center justify-center border border-border hover:bg-muted rounded-md">
                        <PencilSimple size={14} />
                      </button>
                      <button data-testid={`delete-${p.id}`} onClick={() => setConfirmId(p.id)} className="h-9 w-9 inline-flex items-center justify-center border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive rounded-md">
                        <Trash size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent data-testid="confirm-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the item from your inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-btn"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onDelete(confirmId); setConfirmId(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
