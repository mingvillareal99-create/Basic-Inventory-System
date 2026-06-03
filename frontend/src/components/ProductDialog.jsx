import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const empty = { name: "", quantity: 0, price: 0, category: "" };

export default function ProductDialog({ open, onOpenChange, product, onSave }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        quantity: product.quantity,
        price: product.price,
        category: product.category,
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [product, open]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.category.trim()) errs.category = "Required";
    if (Number.isNaN(Number(form.quantity)) || Number(form.quantity) < 0)
      errs.quantity = "Must be ≥ 0";
    if (Number.isNaN(Number(form.price)) || Number(form.price) < 0)
      errs.price = "Must be ≥ 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      category: form.category.trim(),
      quantity: parseInt(form.quantity, 10),
      price: parseFloat(form.price),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none border-border max-w-md"
        data-testid="product-dialog"
      >
        <DialogHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {product ? "Edit / 02" : "New / 01"}
          </p>
          <DialogTitle className="font-heading text-2xl">
            {product ? "Update product" : "Add a product"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Adjust details. Saved instantly to MongoDB."
              : "Catalog a new SKU with starting stock."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-name" className="font-mono text-[10px] uppercase tracking-[0.2em]">
              Product Name
            </Label>
            <Input
              id="p-name"
              data-testid="product-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Wireless Mouse"
              className="rounded-none h-10"
            />
            {errors.name && <p className="text-xs text-destructive font-mono">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-category" className="font-mono text-[10px] uppercase tracking-[0.2em]">
              Category
            </Label>
            <Input
              id="p-category"
              data-testid="product-category-input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Accessories"
              className="rounded-none h-10"
            />
            {errors.category && <p className="text-xs text-destructive font-mono">{errors.category}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-qty" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Quantity
              </Label>
              <Input
                id="p-qty"
                data-testid="product-quantity-input"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="rounded-none h-10 font-mono"
              />
              {errors.quantity && <p className="text-xs text-destructive font-mono">{errors.quantity}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-price" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Unit Price (₱)
              </Label>
              <Input
                id="p-price"
                data-testid="product-price-input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="rounded-none h-10 font-mono"
              />
              {errors.price && <p className="text-xs text-destructive font-mono">{errors.price}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="cancel-product-btn"
              onClick={() => onOpenChange(false)}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="save-product-btn" className="rounded-none">
              {product ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
