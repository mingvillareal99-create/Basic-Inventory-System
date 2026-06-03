import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
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
      errs.quantity = "Must be 0 or more";
    if (Number.isNaN(Number(form.price)) || Number(form.price) < 0)
      errs.price = "Must be 0 or more";
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
      <DialogContent data-testid="product-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {product ? "Edit product" : "Add a product"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Update product details. Changes save instantly."
              : "Add a new product to your inventory."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="p-name">Product name</Label>
            <Input
              id="p-name"
              data-testid="product-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Wireless Mouse"
              className="h-11"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-category">Category</Label>
            <Input
              id="p-category"
              data-testid="product-category-input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Accessories"
              className="h-11"
            />
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-qty">Quantity in stock</Label>
              <Input
                id="p-qty"
                data-testid="product-quantity-input"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="h-11 tabular"
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-price">Unit price (₱)</Label>
              <Input
                id="p-price"
                data-testid="product-price-input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="h-11 tabular"
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="cancel-product-btn"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="save-product-btn" className="bg-primary hover:bg-primary/90">
              {product ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
