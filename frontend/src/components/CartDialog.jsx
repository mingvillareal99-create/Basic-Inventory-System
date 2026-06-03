import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
  ShoppingCart, ArrowsLeftRight, Plus, Trash, ShoppingBag,
} from "@phosphor-icons/react";

const emptyLine = () => ({
  key: `line-${Math.random().toString(36).slice(2, 9)}`,
  product_id: "",
  quantity: 1,
  unit_price: 0,
});

export default function CartDialog({
  open, onOpenChange, type = "buy", defaultProduct = null, products = [], onCompleted,
}) {
  const isBuy = type === "buy";
  const [lines, setLines] = useState([emptyLine()]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setNote("");
    setSubmitting(false);
    if (defaultProduct) {
      setLines([{
        key: emptyLine().key,
        product_id: defaultProduct.id,
        quantity: 1,
        unit_price: Number(defaultProduct.price) || 0,
      }]);
    } else {
      setLines([emptyLine()]);
    }
  }, [open, defaultProduct]);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.id] = p; });
    return m;
  }, [products]);

  const usedIds = useMemo(() => new Set(lines.map((l) => l.product_id).filter(Boolean)), [lines]);

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

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key) => setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));

  const lineTotals = lines.map((l) => Number(l.quantity || 0) * Number(l.unit_price || 0));
  const grandTotal = lineTotals.reduce((a, b) => a + b, 0);
  const totalUnits = lines.reduce((a, l) => a + (Number(l.quantity) || 0), 0);

  const validate = () => {
    const valid = lines.filter((l) => l.product_id);
    if (valid.length === 0) return "Add at least one product";
    const ids = new Set();
    for (const [i, l] of valid.entries()) {
      if (ids.has(l.product_id)) return `Line ${i + 1}: duplicate product`;
      ids.add(l.product_id);
      const qty = parseInt(l.quantity, 10);
      if (!qty || qty <= 0) return `Line ${i + 1}: quantity must be > 0`;
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
      toast.success(`${isBuy ? "Bought" : "Sold"} ${totalUnits} item${totalUnits === 1 ? "" : "s"} across ${items.length} line${items.length === 1 ? "" : "s"}`);
      onCompleted?.(data);
      onOpenChange(false);
    } catch (e2) {
      setError(formatApiErrorDetail(e2.response?.data?.detail) || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cart-dialog" className="max-w-2xl">
        <DialogHeader>
          <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${isBuy ? "text-success" : "text-muted-foreground"}`}>
            {isBuy ? "Buy / restock cart" : "Sell / sales cart"}
          </p>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {isBuy ? <ShoppingCart size={22} weight="fill" /> : <ShoppingBag size={22} weight="fill" />}
            {isBuy ? "Buy items" : "Sell items"}
          </DialogTitle>
          <DialogDescription>
            Add multiple products in one go. Each line is recorded as a transaction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          {/* Lines */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1" data-testid="cart-lines">
            {lines.map((l, idx) => {
              const p = productMap[l.product_id];
              const lineTotal = lineTotals[idx];
              const overSell = !isBuy && p && parseInt(l.quantity, 10) > p.quantity;
              return (
                <div
                  key={l.key}
                  data-testid={`cart-line-${idx}`}
                  className="border border-border bg-muted/20 rounded-md p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      Line {String(idx + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      data-testid={`cart-line-remove-${idx}`}
                      onClick={() => removeLine(l.key)}
                      disabled={lines.length === 1}
                      className="h-7 w-7 inline-flex items-center justify-center border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove line"
                    >
                      <Trash size={12} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_120px] gap-2">
                    <Select
                      value={l.product_id}
                      onValueChange={(v) => updateLine(l.key, { product_id: v })}
                    >
                      <SelectTrigger data-testid={`cart-product-${idx}`} className="h-10">
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
                            {prod.name} · {prod.category} · {prod.quantity} in stock
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      data-testid={`cart-qty-${idx}`}
                      type="number"
                      min="1"
                      value={l.quantity}
                      onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                      className="h-10 font-mono"
                      placeholder="Qty"
                    />
                    <Input
                      data-testid={`cart-price-${idx}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.unit_price}
                      onChange={(e) => updateLine(l.key, { unit_price: e.target.value })}
                      className="h-10 font-mono"
                      placeholder="Unit ₱"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {p ? (
                        <>
                          Stock: <span className={`font-mono ${overSell ? "text-destructive font-semibold" : ""}`}>{p.quantity}</span>
                          {overSell && " · oversell!"}
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                    <span className="font-mono tabular text-sm font-medium" data-testid={`cart-line-total-${idx}`}>
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
            className="w-full h-10 gap-2"
          >
            <Plus size={14} weight="bold" /> Add line
          </Button>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Note (optional)</Label>
            <Input
              data-testid="cart-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10"
              placeholder="Supplier invoice #, customer name, etc."
            />
          </div>

          <div className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-3 border border-border">
            <div className="space-y-0.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total</p>
              <p className="text-xs text-muted-foreground">{lines.filter((l) => l.product_id).length} line(s) · {totalUnits} unit(s)</p>
            </div>
            <span className="font-mono tabular text-2xl font-semibold" data-testid="cart-grand-total">
              {formatPeso(grandTotal)}
            </span>
          </div>

          {error && (
            <div data-testid="cart-error" className="text-xs text-destructive border border-destructive/40 px-3 py-2 font-mono rounded-md">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" data-testid="cart-cancel-btn" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="cart-submit-btn"
              disabled={submitting}
              className={isBuy ? "bg-success hover:bg-success/90 text-white" : ""}
            >
              {submitting
                ? "Saving…"
                : isBuy
                ? `Confirm purchase · ${formatPeso(grandTotal)}`
                : `Confirm sale · ${formatPeso(grandTotal)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
