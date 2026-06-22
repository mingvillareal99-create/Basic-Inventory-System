import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, formatApiErrorDetail } from "@/lib/api";
import { formatPeso } from "@/lib/format";
import { toast } from "sonner";
import {
  ShoppingCart, ShoppingBag, Plus, Trash,
} from "@phosphor-icons/react";

const newLine = () => ({
  key: `line-${Math.random().toString(36).slice(2, 9)}`,
  product_id: "",
  quantity: 1,
  unit_price: 0,
});

export default function CartDialog({
  open, onOpenChange, type = "buy", defaultProduct = null, products = [], onCompleted,
}) {
  const isBuy = type === "buy";
  const [lines, setLines] = useState([newLine()]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [newlyAddedKey, setNewlyAddedKey] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewlyAddedKey(null);
      setShowConfirmClose(false);
    }
  }, [open]);

  const isDirty = () => {
    if (lines.length > 1) return true;
    if (lines.length === 1) {
      const l = lines[0];
      if (l.product_id) {
        if (defaultProduct) {
          if (
            l.product_id !== defaultProduct.id ||
            l.quantity !== 1 ||
            l.unit_price !== (Number(defaultProduct.price) || 0)
          ) {
            return true;
          }
        } else {
          return true;
        }
      } else {
        if (l.quantity !== 1 || l.unit_price !== 0) return true;
      }
    }
    if (note.trim().length > 0) return true;
    return false;
  };

  const handleCloseAttempt = () => {
    if (isDirty()) {
      setShowConfirmClose(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (val) => {
    if (val === false) {
      handleCloseAttempt();
    } else {
      onOpenChange(val);
    }
  };

  useEffect(() => {
    if (!open) return;
    setError("");
    setNote("");
    setSubmitting(false);
    if (defaultProduct) {
      setLines([{
        ...newLine(),
        product_id: defaultProduct.id,
        quantity: 1,
        unit_price: Number(defaultProduct.price) || 0,
      }]);
    } else {
      setLines([newLine()]);
    }
  }, [open, defaultProduct]);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.id] = p; });
    return m;
  }, [products]);

  const usedIds = useMemo(
    () => new Set(lines.map((l) => l.product_id).filter(Boolean)),
    [lines]
  );

  const updateLine = (key, patch) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.product_id) {
          const p = productMap[patch.product_id];
          if (p) next.unit_price = Number(p.price) || 0;
        }
        return next;
      })
    );
  };

  const addLine = () => {
    if (lines.length > 0 && !lines[lines.length - 1].product_id) {
      toast.warning("Please select a product for the empty slot first.");
      const lastKey = lines[lines.length - 1].key;
      setNewlyAddedKey(null);
      setTimeout(() => setNewlyAddedKey(lastKey), 10);
      return;
    }
    const item = newLine();
    setLines((prev) => [...prev, item]);
    setNewlyAddedKey(item.key);
  };

  const removeLine = (key) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));

  const lineTotals = lines.map((l) => Number(l.quantity || 0) * Number(l.unit_price || 0));
  const grandTotal = lineTotals.reduce((a, b) => a + b, 0);
  const totalUnits = lines.reduce((a, l) => a + (Number(l.quantity) || 0), 0);

  const validate = () => {
    const valid = lines.filter((l) => l.product_id);
    if (valid.length === 0) return "Add at least one product";
    const ids = new Set();
    for (const [i, l] of valid.entries()) {
      if (ids.has(l.product_id)) return `Line ${i + 1}: same product added twice`;
      ids.add(l.product_id);
      const qty = parseInt(l.quantity, 10);
      if (!qty || qty <= 0) return `Line ${i + 1}: quantity must be greater than 0`;
      const price = parseFloat(l.unit_price);
      if (Number.isNaN(price) || price < 0) return `Line ${i + 1}: invalid unit price`;
      if (!isBuy) {
        const p = productMap[l.product_id];
        if (p && qty > p.quantity) return `Line ${i + 1}: only ${p.quantity} ${p.name} in stock`;
      }
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    const items = lines
      .filter((l) => l.product_id)
      .map((l) => ({
        product_id: l.product_id,
        quantity: parseInt(l.quantity, 10),
        unit_price: parseFloat(l.unit_price),
      }));

    try {
      setSubmitting(true);
      setError("");
      const { data } = await api.post("/transactions/bulk", {
        type, items, note: note || null,
      });
      toast.success(
        `${isBuy ? "Bought" : "Sold"} ${totalUnits} item${totalUnits === 1 ? "" : "s"} across ${items.length} line${items.length === 1 ? "" : "s"}`
      );
      onCompleted?.(data);
      onOpenChange(false);
    } catch (e2) {
      setError(formatApiErrorDetail(e2.response?.data?.detail) || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent data-testid="cart-dialog" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {isBuy ? <ShoppingCart size={22} weight="fill" className="text-primary" /> : <ShoppingBag size={22} weight="fill" />}
            {isBuy ? "Buy items" : "Sell items"}
          </DialogTitle>
          <DialogDescription>
            Add as many products as you need. Each line is saved as its own transaction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1" data-testid="cart-lines">
            {lines.map((l, idx) => {
              const p = productMap[l.product_id];
              const lineTotal = lineTotals[idx];
              const overSell = !isBuy && p && parseInt(l.quantity, 10) > p.quantity;
              return (
                <div
                  key={l.key}
                  data-testid={`cart-line-${idx}`}
                  className={cn(
                    "border border-border bg-muted/30 rounded-xl p-4 space-y-3 transition-all",
                    newlyAddedKey === l.key && "animate-glow-green"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Item {idx + 1}
                    </span>
                    <button
                      type="button"
                      data-testid={`cart-line-remove-${idx}`}
                      onClick={() => removeLine(l.key)}
                      disabled={lines.length === 1}
                      className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Remove item"
                    >
                      <Trash size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_90px_120px] gap-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Product</Label>
                      <Select
                        value={l.product_id}
                        onValueChange={(v) => updateLine(l.key, { product_id: v })}
                      >
                        <SelectTrigger data-testid={`cart-product-${idx}`} className="h-11 bg-card">
                          <SelectValue placeholder="Choose product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.length === 0 && (
                            <SelectItem value="__none__" disabled>No products available</SelectItem>
                          )}
                          {products.map((prod) => (
                            <SelectItem
                              key={prod.id}
                              value={prod.id}
                              disabled={usedIds.has(prod.id) && prod.id !== l.product_id}
                              data-testid={`cart-product-${idx}-option-${prod.id}`}
                            >
                              {prod.name} — {prod.quantity} in stock
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        data-testid={`cart-qty-${idx}`}
                        type="number"
                        min="1"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                        className="h-11 tabular bg-card"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit price (₱)</Label>
                      <Input
                        data-testid={`cart-price-${idx}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.unit_price}
                        onChange={(e) => updateLine(l.key, { unit_price: e.target.value })}
                        className="h-11 tabular bg-card"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {p ? (
                        <>
                          Available: <span className={`tabular font-medium ${overSell ? "text-destructive" : ""}`}>{p.quantity}</span>
                          {overSell && " · not enough stock"}
                        </>
                      ) : (
                        "Select a product"
                      )}
                    </span>
                    <span className="font-semibold tabular" data-testid={`cart-line-total-${idx}`}>
                      {formatPeso(lineTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            data-testid="cart-add-line-btn"
            onClick={addLine}
            className="w-full h-11 gap-2"
          >
            <Plus size={16} weight="bold" /> Add another item
          </Button>

          <div className="space-y-2">
            <Label htmlFor="cart-note">Note (optional)</Label>
            <Input
              id="cart-note"
              data-testid="cart-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11"
              placeholder="Supplier invoice #, customer name, etc."
            />
          </div>

          <div className="flex items-center justify-between bg-primary-soft rounded-xl px-4 py-3 border border-primary/20">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xs text-muted-foreground">
                {lines.filter((l) => l.product_id).length} item(s) · {totalUnits} unit(s)
              </p>
            </div>
            <span className="tabular text-2xl font-semibold text-primary" data-testid="cart-grand-total">
              {formatPeso(grandTotal)}
            </span>
          </div>

          {error && (
            <div data-testid="cart-error" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" data-testid="cart-cancel-btn" onClick={handleCloseAttempt}>
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="cart-submit-btn"
              disabled={submitting}
              className="bg-primary hover:bg-primary/90"
            >
              {submitting ? "Saving…" : isBuy ? `Confirm buy · ${formatPeso(grandTotal)}` : `Confirm sale · ${formatPeso(grandTotal)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
      <AlertDialogContent data-testid="cart-confirm-close-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel? Your changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="cart-confirm-close-cancel-btn">
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="cart-confirm-close-confirm-btn"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              setShowConfirmClose(false);
              onOpenChange(false);
            }}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
