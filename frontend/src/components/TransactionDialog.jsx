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
import { toast } from "sonner";
import { ShoppingCart, ArrowsLeftRight } from "@phosphor-icons/react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function TransactionDialog({
  open, onOpenChange, type = "buy", defaultProduct = null, products = [], onCompleted,
}) {
  const isBuy = type === "buy";
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  useEffect(() => {
    if (!open) return;
    const initial = defaultProduct || products[0] || null;
    setProductId(initial?.id || "");
    setUnitPrice(initial ? Number(initial.price) : 0);
    setQuantity(1);
    setNote("");
    setError("");
  }, [open, defaultProduct, products]);

  useEffect(() => {
    if (selected) setUnitPrice(Number(selected.price));
  }, [selected]);

  const total = Number(quantity || 0) * Number(unitPrice || 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!productId) return setError("Pick a product");
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) return setError("Quantity must be > 0");
    if (!isBuy && selected && qty > selected.quantity) {
      return setError(`Only ${selected.quantity} in stock`);
    }
    const price = parseFloat(unitPrice);
    if (Number.isNaN(price) || price < 0) return setError("Invalid unit price");

    try {
      setSubmitting(true);
      const { data } = await api.post("/transactions", {
        product_id: productId,
        type,
        quantity: qty,
        unit_price: price,
        note: note || null,
      });
      toast.success(`${isBuy ? "Bought" : "Sold"} ${qty} × ${data.product_name}`);
      onCompleted?.(data);
      onOpenChange(false);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="transaction-dialog" className="max-w-md">
        <DialogHeader>
          <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${isBuy ? "text-success" : "text-muted-foreground"}`}>
            {isBuy ? "Buy / restock" : "Sell / record sale"}
          </p>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {isBuy ? <ShoppingCart size={22} weight="fill" /> : <ArrowsLeftRight size={22} weight="fill" />}
            {isBuy ? "Buy items" : "Sell items"}
          </DialogTitle>
          <DialogDescription>
            {isBuy
              ? "Restock by recording a purchase. Stock will increase."
              : "Record a sale. Stock will decrease and revenue will be logged."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger data-testid="tx-product-select" className="h-11">
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {products.length === 0 && (
                  <SelectItem value="__none__" disabled>No products available</SelectItem>
                )}
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id} data-testid={`tx-product-option-${p.id}`}>
                    {p.name} · {p.category} · {p.quantity} in stock
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Quantity</Label>
              <Input
                data-testid="tx-quantity-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11 font-mono text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Unit price ($)</Label>
              <Input
                data-testid="tx-price-input"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="h-11 font-mono text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.2em]">Note (optional)</Label>
            <Input
              data-testid="tx-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11"
              placeholder="Supplier invoice #, customer name, etc."
            />
          </div>

          <div className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-3 border border-border">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Total
            </span>
            <span className="font-mono tabular text-xl font-semibold" data-testid="tx-total">
              ${fmt(total)}
            </span>
          </div>

          {error && (
            <div data-testid="tx-error" className="text-xs text-destructive border border-destructive/40 px-3 py-2 font-mono rounded-md">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" data-testid="tx-cancel-btn" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="tx-submit-btn"
              disabled={submitting}
              className={isBuy ? "bg-success hover:bg-success/90 text-white" : ""}
            >
              {submitting ? "Saving…" : isBuy ? "Confirm purchase →" : "Confirm sale →"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
