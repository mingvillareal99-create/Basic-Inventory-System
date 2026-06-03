import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/format";
import {
  ShoppingCart, ShoppingBag, DownloadSimple, X,
} from "@phosphor-icons/react";

function formatDateLong(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function buildReceiptCSV(group) {
  const lines = [];
  const ref = group.id.slice(-8).toUpperCase();
  lines.push(`Stockroom ${group.type === "buy" ? "Purchase" : "Sale"} Receipt`);
  lines.push(`Reference,${ref}`);
  lines.push(`Type,${group.type === "buy" ? "Buy / Restock" : "Sell"}`);
  lines.push(`Recorded by,${group.user_email}`);
  lines.push(`Date,${formatDateLong(group.created_at)}`);
  if (group.note) lines.push(`Note,"${String(group.note).replace(/"/g, '""')}"`);
  lines.push("");
  lines.push("Product,Quantity,Unit Price (PHP),Subtotal (PHP)");
  group.items.forEach((it) => {
    const safeName = `"${String(it.product_name).replace(/"/g, '""')}"`;
    lines.push(
      `${safeName},${it.quantity},${Number(it.unit_price).toFixed(2)},${Number(it.total).toFixed(2)}`
    );
  });
  lines.push("");
  lines.push(`,,Total units,${group.total_units}`);
  lines.push(`,,Grand total (PHP),${Number(group.total_amount).toFixed(2)}`);
  return lines.join("\n");
}

function downloadGroup(group) {
  const csv = buildReceiptCSV(group);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date(group.created_at).toISOString().slice(0, 16).replace(/[-:T]/g, "");
  a.href = url;
  a.download = `${group.type}-${stamp}-${group.id.slice(-6)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TransactionDetailsDialog({ open, onOpenChange, group }) {
  if (!group) return null;
  const isBuy = group.type === "buy";
  const Icon = isBuy ? ShoppingCart : ShoppingBag;
  const ref = group.id.slice(-8).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="tx-details-dialog" className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-border">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isBuy ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Icon size={22} weight="fill" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {isBuy ? "Purchase" : "Sale"} receipt
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-0.5">
                    Reference #{ref}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Recorded by</p>
              <p className="font-medium truncate" data-testid="tx-details-user">{group.user_email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Date</p>
              <p className="font-medium" data-testid="tx-details-date">{formatDateLong(group.created_at)}</p>
            </div>
            {group.note && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Note</p>
                <p className="font-medium" data-testid="tx-details-note">{group.note}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="px-6 py-4 max-h-[40vh] overflow-y-auto" data-testid="tx-details-items">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
            <span>Item</span>
            <span>Subtotal</span>
          </div>
          <ul className="divide-y divide-border">
            {group.items.map((it) => (
              <li key={it.id} data-testid={`tx-details-item-${it.id}`} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{it.product_name}</p>
                  <p className="text-sm text-muted-foreground tabular">
                    {it.quantity} × {formatPeso(it.unit_price)}
                  </p>
                </div>
                <p className="font-semibold tabular shrink-0">{formatPeso(it.total)}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Total */}
        <div className="px-6 py-4 bg-primary-soft border-t border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Grand total</p>
            <p className="text-xs text-muted-foreground">
              {group.items.length} item(s) · {group.total_units} unit(s)
            </p>
          </div>
          <p className="text-2xl font-semibold tabular text-primary" data-testid="tx-details-total">
            {formatPeso(group.total_amount)}
          </p>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="tx-details-close-btn"
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <X size={14} /> Close
          </Button>
          <Button
            type="button"
            data-testid="tx-details-download-btn"
            onClick={() => downloadGroup(group)}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <DownloadSimple size={16} weight="bold" /> Download (CSV)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
