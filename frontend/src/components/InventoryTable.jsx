import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShoppingCart, ShoppingBag, PencilSimple, Trash, Warning, Archive,
} from "@phosphor-icons/react";
import { formatPeso } from "@/lib/format";

export default function InventoryTable({
  products, loading, isAdmin, onBuy, onSell, onDelete, onEdit,
}) {
  const [confirmId, setConfirmId] = useState(null);

  if (loading) {
    return (
      <div
        data-testid="table-loading"
        className="bg-card rounded-xl border border-border card-shadow p-12 text-center text-muted-foreground"
      >
        Loading inventory…
      </div>
    );
  }

  if (!products.length) {
    return (
      <div
        data-testid="empty-state"
        className="bg-card rounded-xl border border-border card-shadow p-12 text-center"
      >
        <div className="h-16 w-16 mx-auto rounded-xl bg-muted flex items-center justify-center mb-4">
          <Archive size={28} className="text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold mb-1">No products yet</p>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Add your first product to start tracking inventory."
            : "Ask your admin to add products."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div
        data-testid="inventory-table"
        className="hidden sm:block bg-card rounded-xl border border-border card-shadow overflow-x-auto"
      >
        <table className="w-full text-sm md:text-base">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground px-5 py-3">
                Product
              </th>
              <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground px-5 py-3">
                Category
              </th>
              <th className="text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground px-5 py-3">
                In stock
              </th>
              <th className="text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground px-5 py-3">
                Unit price
              </th>
              {isAdmin && (
                <th className="text-right text-xs uppercase tracking-wide font-semibold text-muted-foreground px-5 py-3 w-[140px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const low = p.quantity < 5;
              return (
                <tr
                  key={p.id}
                  data-testid={`product-row-${p.id}`}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Archive size={16} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        {low && (
                          <p
                            data-testid={`low-stock-flag-${p.id}`}
                            className="flex items-center gap-1 text-xs text-warning mt-0.5"
                          >
                            <Warning size={12} weight="fill" /> Low stock
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <span className="inline-block bg-muted px-2.5 py-1 text-xs font-medium rounded-md">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span
                      data-testid={`qty-${p.id}`}
                      className={`tabular font-medium ${low ? "text-warning" : ""}`}
                    >
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right tabular font-medium">
                    {formatPeso(p.price)}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          data-testid={`buy-${p.id}`}
                          onClick={() => onBuy?.(p)}
                          className="h-10 px-3 inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
                          title="Buy / restock"
                        >
                          <ShoppingCart size={14} weight="bold" />
                          <span className="hidden md:inline">Buy</span>
                        </button>
                        <button
                          data-testid={`sell-${p.id}`}
                          onClick={() => onSell?.(p)}
                          disabled={p.quantity === 0}
                          className="h-10 px-3 inline-flex items-center gap-1.5 border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                          title="Sell"
                        >
                          <ShoppingBag size={14} weight="bold" />
                          <span className="hidden md:inline">Sell</span>
                        </button>
                        <button
                          data-testid={`edit-${p.id}`}
                          onClick={() => onEdit?.(p)}
                          className="h-10 w-10 inline-flex items-center justify-center border border-border hover:bg-muted rounded-lg transition-colors"
                          title="Edit"
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          data-testid={`delete-${p.id}`}
                          onClick={() => setConfirmId(p.id)}
                          className="h-10 w-10 inline-flex items-center justify-center border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3" data-testid="inventory-cards">
        {products.map((p) => {
          const low = p.quantity < 5;
          return (
            <div
              key={p.id}
              data-testid={`product-card-${p.id}`}
              className="bg-card border border-border rounded-xl card-shadow p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{p.category}</p>
                  {low && (
                    <p
                      data-testid={`low-stock-flag-${p.id}`}
                      className="flex items-center gap-1 text-xs text-warning font-medium mt-1.5"
                    >
                      <Warning size={12} weight="fill" /> Low stock
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p
                    data-testid={`qty-${p.id}`}
                    className={`text-2xl font-semibold tabular leading-none ${low ? "text-warning" : ""}`}
                  >
                    {p.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">in stock</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="font-semibold tabular">{formatPeso(p.price)}</p>
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      data-testid={`buy-${p.id}`}
                      onClick={() => onBuy?.(p)}
                      className="h-10 px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold"
                    >
                      Buy
                    </button>
                    <button
                      data-testid={`sell-${p.id}`}
                      onClick={() => onSell?.(p)}
                      disabled={p.quantity === 0}
                      className="h-10 px-3 border border-border hover:bg-muted disabled:opacity-40 rounded-lg text-sm font-semibold"
                    >
                      Sell
                    </button>
                    <button
                      data-testid={`edit-${p.id}`}
                      onClick={() => onEdit?.(p)}
                      className="h-10 w-10 inline-flex items-center justify-center border border-border hover:bg-muted rounded-lg"
                    >
                      <PencilSimple size={16} />
                    </button>
                    <button
                      data-testid={`delete-${p.id}`}
                      onClick={() => setConfirmId(p.id)}
                      className="h-10 w-10 inline-flex items-center justify-center border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive rounded-lg"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                )}
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
              This will permanently remove the item from your inventory. This cannot be undone.
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
