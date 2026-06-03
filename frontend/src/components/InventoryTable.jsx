import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Minus,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  Archive,
} from "@phosphor-icons/react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function InventoryTable({
  products,
  loading,
  onAdjust,
  onDelete,
  onEdit,
}) {
  const [confirmId, setConfirmId] = useState(null);

  if (loading) {
    return (
      <div
        data-testid="table-loading"
        className="border border-border p-12 text-center font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground"
      >
        Loading inventory…
      </div>
    );
  }

  if (!products.length) {
    return (
      <div
        data-testid="empty-state"
        className="border border-border p-16 text-center space-y-3"
      >
        <Archive size={28} className="mx-auto text-muted-foreground" />
        <p className="font-heading text-xl">No products found.</p>
        <p className="text-sm text-muted-foreground">
          Add your first product to start tracking inventory.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border overflow-x-auto bg-card" data-testid="inventory-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">
                #
              </th>
              <th className="text-left font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">
                Product
              </th>
              <th className="text-left font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">
                Category
              </th>
              <th className="text-right font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">
                Stock
              </th>
              <th className="text-right font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">
                Unit Price
              </th>
              <th className="text-right font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3">
                Subtotal
              </th>
              <th className="text-right font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-4 py-3 w-[220px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const low = p.quantity < 5;
              return (
                <tr
                  key={p.id}
                  data-testid={`product-row-${p.id}`}
                  className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {low && (
                        <Warning
                          size={14}
                          weight="fill"
                          className="text-destructive shrink-0"
                          data-testid={`low-stock-flag-${p.id}`}
                        />
                      )}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="border border-border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-mono tabular ${low ? "text-destructive font-semibold" : ""}`}
                      data-testid={`qty-${p.id}`}
                    >
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular">
                    ${fmt(p.price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular text-muted-foreground">
                    ${fmt(p.price * p.quantity)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        data-testid={`decrement-${p.id}`}
                        onClick={() => onAdjust(p.id, -1)}
                        disabled={p.quantity === 0}
                        className="h-8 w-8 inline-flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Sell one (-1)"
                      >
                        <Minus size={12} weight="bold" />
                      </button>
                      <button
                        data-testid={`increment-${p.id}`}
                        onClick={() => onAdjust(p.id, 1)}
                        className="h-8 w-8 inline-flex items-center justify-center border border-border hover:bg-muted transition-colors"
                        title="Restock (+1)"
                      >
                        <Plus size={12} weight="bold" />
                      </button>
                      <button
                        data-testid={`edit-${p.id}`}
                        onClick={() => onEdit(p)}
                        className="h-8 w-8 inline-flex items-center justify-center border border-border hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <PencilSimple size={12} />
                      </button>
                      <button
                        data-testid={`delete-${p.id}`}
                        onClick={() => setConfirmId(p.id)}
                        className="h-8 w-8 inline-flex items-center justify-center border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
      >
        <AlertDialogContent className="rounded-none" data-testid="confirm-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the item from your inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-btn" className="rounded-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-btn"
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(confirmId);
                setConfirmId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
