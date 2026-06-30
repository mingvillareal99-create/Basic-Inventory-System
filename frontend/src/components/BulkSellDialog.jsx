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
import { api, formatApiErrorDetail } from "@/lib/api";
import { formatPeso } from "@/lib/format";
import { toast } from "sonner";
import {
  ShoppingBag, MagnifyingGlass, Warning, Check, X, Eye
} from "@phosphor-icons/react";

export default function BulkSellDialog({
  open,
  onOpenChange,
  products = [],
  defaultProduct = null,
  onCompleted,
}) {
  const [items, setItems] = useState([]);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setNote("");
      setSearch("");
      setShowSelectedOnly(false);
      setShowPreviewDialog(false);

      // Filter to only products in stock
      const inStockProducts = products.filter((p) => p.quantity > 0);

      // Sort: if defaultProduct is provided, put it first
      const sortedProducts = [...inStockProducts].sort((a, b) => {
        if (defaultProduct) {
          if (a.id === defaultProduct.id) return -1;
          if (b.id === defaultProduct.id) return 1;
        }
        return a.name.localeCompare(b.name);
      });

      const initialItems = sortedProducts.map((p) => {
        const isDefault = defaultProduct && defaultProduct.id === p.id;
        return {
          product_id: p.id,
          name: p.name,
          category: p.category,
          available_stock: p.quantity,
          quantity: isDefault ? 1 : 0,
          unit_price: Number(p.price) || 0,
        };
      });

      setItems(initialItems);
    }
  }, [open, defaultProduct, products]);

  // Handle Search & Selection Filter
  const filteredItems = useMemo(() => {
    let result = items;
    
    if (showSelectedOnly) {
      result = result.filter((item) => (parseInt(item.quantity, 10) || 0) > 0);
    }

    const s = search.trim().toLowerCase();
    if (s) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(s) ||
          item.category.toLowerCase().includes(s)
      );
    }
    return result;
  }, [items, search, showSelectedOnly]);

  const updateItem = (productId, patch) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const updated = { ...item, ...patch };
        
        // Ensure quantity doesn't exceed stock and is not negative
        if (patch.quantity !== undefined) {
          let qty = parseInt(patch.quantity, 10);
          if (Number.isNaN(qty)) {
            updated.quantity = "";
          } else {
            qty = Math.max(0, Math.min(qty, item.available_stock));
            updated.quantity = qty;
          }
        }

        if (patch.unit_price !== undefined) {
          let price = parseFloat(patch.unit_price);
          if (Number.isNaN(price)) {
            updated.unit_price = "";
          } else {
            updated.unit_price = Math.max(0, price);
          }
        }

        return updated;
      })
    );
  };

  // Shortcuts
  const fillAllMax = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        quantity: item.available_stock,
      }))
    );
    toast.info("Filled all quantities to maximum available stock.");
  };

  const clearAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        quantity: 0,
      }))
    );
  };

  // Totals calculations
  const activeItems = useMemo(() => {
    return items.filter((item) => (parseInt(item.quantity, 10) || 0) > 0);
  }, [items]);

  const totalUnits = useMemo(() => {
    return activeItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
  }, [activeItems]);

  const grandTotal = useMemo(() => {
    return activeItems.reduce(
      (sum, item) => sum + (parseInt(item.quantity, 10) || 0) * (parseFloat(item.unit_price) || 0),
      0
    );
  }, [activeItems]);

  // Dirty check for cancel alert
  const isDirty = () => {
    const hasActiveQuantity = items.some(
      (item) =>
        (defaultProduct && item.product_id === defaultProduct.id ? item.quantity !== 1 : item.quantity > 0)
    );
    return hasActiveQuantity || note.trim().length > 0;
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

  const handleOpenPreview = (e) => {
    e?.preventDefault();
    if (activeItems.length === 0) {
      setError("Please specify a quantity greater than 0 for at least one item.");
      return;
    }

    // Validation check
    for (const item of activeItems) {
      const qty = parseInt(item.quantity, 10);
      if (qty > item.available_stock) {
        setError(`Insufficient stock for '${item.name}' (available: ${item.available_stock}).`);
        return;
      }
      if (parseFloat(item.unit_price) < 0) {
        setError(`Price for '${item.name}' cannot be negative.`);
        return;
      }
    }

    setError("");
    setShowPreviewDialog(true);
  };

  const handleFinalSubmit = async (e) => {
    e?.preventDefault();
    if (activeItems.length === 0) {
      setError("Please specify a quantity greater than 0 for at least one item.");
      return;
    }

    const payloadItems = activeItems.map((item) => ({
      product_id: item.product_id,
      quantity: parseInt(item.quantity, 10),
      unit_price: parseFloat(item.unit_price),
    }));

    try {
      setSubmitting(true);
      setError("");
      const { data } = await api.post("/transactions/bulk", {
        type: "sell",
        items: payloadItems,
        note: note || null,
      });
      toast.success(`Successfully bulk sold ${totalUnits} units of ${payloadItems.length} product(s).`);
      onCompleted?.(data);
      setShowPreviewDialog(false);
      onOpenChange(false);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Failed to process sale.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent data-testid="bulk-sell-dialog" className="max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <ShoppingBag size={22} weight="fill" className="text-primary" />
              Bulk Sell Worksheet
            </DialogTitle>
            <DialogDescription>
              Adjust sell quantities and prices for in-stock inventory. Only items with quantity &gt; 0 will be checked out.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenPreview} className="space-y-4 pt-2">
            {/* Search and Quick Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="text"
                  placeholder="Filter items by name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9 pr-8"
                  data-testid="sell-filter-input"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenPreview}
                  className="h-10 text-xs px-3 gap-1.5 transition-all font-semibold"
                  data-testid="sell-toggle-preview-btn"
                >
                  <Eye size={14} weight="bold" />
                  Preview Selected ({activeItems.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillAllMax}
                  disabled={showSelectedOnly}
                  className="h-10 text-xs px-3"
                  data-testid="sell-fill-all-btn"
                >
                  Fill All Max
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearAll}
                  className="h-10 text-xs px-3 text-muted-foreground hover:text-foreground"
                  data-testid="sell-clear-all-btn"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Scrollable worksheet */}
            <div className="border border-border rounded-xl bg-muted/10 overflow-hidden">
              <div className="max-h-[40vh] overflow-y-auto" data-testid="sell-worksheet-lines">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {showSelectedOnly
                      ? "No active items selected yet. Set a quantity greater than 0 to see items here."
                      : search
                      ? "No products match your filter."
                      : "No in-stock products available."}
                  </div>
                ) : (
                  <>
                    {/* Desktop table view */}
                    <div className="hidden sm:block">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                          <tr className="text-muted-foreground bg-muted/40 font-medium">
                            <th className="text-left p-3 font-medium">Product</th>
                            <th className="text-right p-3 w-[100px] font-medium">In Stock</th>
                            <th className="text-center p-3 w-[160px] font-medium">Sell Qty</th>
                            <th className="text-right p-3 w-[130px] font-medium">Unit Price (₱)</th>
                            <th className="text-right p-3 w-[110px] font-medium">Total (₱)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredItems.map((item) => {
                            const isDefault = defaultProduct && item.product_id === defaultProduct.id;
                            const lineTotal = (parseInt(item.quantity, 10) || 0) * (parseFloat(item.unit_price) || 0);
                            const isLowStock = item.available_stock < 5;

                            return (
                              <tr
                                key={item.product_id}
                                data-testid={`sell-row-${item.product_id}`}
                                className={cn(
                                  "hover:bg-muted/20 transition-colors",
                                  isDefault && "bg-primary-soft/30 hover:bg-primary-soft/40"
                                )}
                              >
                                <td className="p-3">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                  </div>
                                </td>
                                <td className="p-3 text-right tabular">
                                  <span className={cn(isLowStock ? "text-warning font-medium" : "text-muted-foreground")}>
                                    {item.available_stock}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      max={item.available_stock}
                                      value={item.quantity}
                                      onChange={(e) => updateItem(item.product_id, { quantity: e.target.value })}
                                      className="h-9 w-20 text-center tabular bg-card"
                                      data-testid={`sell-qty-${item.product_id}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateItem(item.product_id, { quantity: item.available_stock })}
                                      className="h-9 px-2 text-xs border border-border hover:bg-muted rounded-md font-medium transition-colors shrink-0"
                                      title="Sell maximum available"
                                      data-testid={`sell-max-${item.product_id}`}
                                    >
                                      Max
                                    </button>
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => updateItem(item.product_id, { unit_price: e.target.value })}
                                    className="h-9 w-24 text-right tabular bg-card ml-auto"
                                    data-testid={`sell-price-${item.product_id}`}
                                  />
                                </td>
                                <td className="p-3 text-right tabular font-medium">
                                  {formatPeso(lineTotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards view */}
                    <div className="block sm:hidden divide-y divide-border">
                      {filteredItems.map((item) => {
                        const isDefault = defaultProduct && item.product_id === defaultProduct.id;
                        const lineTotal = (parseInt(item.quantity, 10) || 0) * (parseFloat(item.unit_price) || 0);
                        const isLowStock = item.available_stock < 5;

                        return (
                          <div
                            key={item.product_id}
                            data-testid={`sell-card-${item.product_id}`}
                            className={cn(
                              "p-3.5 space-y-3 transition-colors",
                              isDefault && "bg-primary-soft/10"
                            )}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                              </div>
                              <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded border",
                                isLowStock 
                                  ? "text-warning bg-warning/5 border-warning/20" 
                                  : "text-muted-foreground bg-muted border-border"
                              )}>
                                {item.available_stock} in stock
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 items-end">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sell Qty</Label>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.available_stock}
                                    value={item.quantity}
                                    onChange={(e) => updateItem(item.product_id, { quantity: e.target.value })}
                                    className="h-9 text-center tabular bg-card"
                                    data-testid={`sell-qty-mobile-${item.product_id}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateItem(item.product_id, { quantity: item.available_stock })}
                                    className="h-9 px-2 text-xs border border-border hover:bg-muted rounded-md font-semibold transition-colors shrink-0"
                                    data-testid={`sell-max-mobile-${item.product_id}`}
                                  >
                                    Max
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Unit Price (₱)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(item.product_id, { unit_price: e.target.value })}
                                  className="h-9 text-right tabular bg-card w-full"
                                  data-testid={`sell-price-mobile-${item.product_id}`}
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/40">
                              <span className="text-muted-foreground">Line Total</span>
                              <span className="font-semibold tabular text-foreground">{formatPeso(lineTotal)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-2">
              <Label htmlFor="sell-note">Note (optional)</Label>
              <Input
                id="sell-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-11"
                placeholder="Invoice #, customer details, bulk sale explanation, etc."
                data-testid="sell-note-input"
              />
            </div>

            {/* Total display summary */}
            <div className="flex items-center justify-between bg-primary-soft rounded-xl px-4 py-3 border border-primary/20">
              <div>
                <p className="text-sm text-muted-foreground">Checkout Total</p>
                <p className="text-xs text-muted-foreground">
                  {activeItems.length} product(s) · {totalUnits} unit(s)
                </p>
              </div>
              <span className="tabular text-2xl font-semibold text-primary" data-testid="sell-grand-total">
                {formatPeso(grandTotal)}
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div
                data-testid="sell-error"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg"
              >
                {error}
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAttempt}
                data-testid="sell-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 min-w-[150px]"
                data-testid="sell-submit-btn"
              >
                Confirm sale · {formatPeso(grandTotal)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent data-testid="sell-preview-dialog" className="max-w-2xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <ShoppingBag size={22} weight="fill" className="text-primary" />
              Confirm Bulk Sale
            </DialogTitle>
            <DialogDescription>
              Please review the items and prices below before completing the bulk sale.
            </DialogDescription>
          </DialogHeader>

          {/* Table of selected items */}
          <div className="border border-border rounded-xl bg-muted/10 overflow-hidden my-2">
            <div className="max-h-[40vh] overflow-y-auto" data-testid="sell-preview-lines">
              {/* Desktop view */}
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                    <tr className="text-muted-foreground bg-muted/40 font-medium">
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-right p-3 w-[100px] font-medium">Sell Qty</th>
                      <th className="text-right p-3 w-[130px] font-medium">Unit Price (₱)</th>
                      <th className="text-right p-3 w-[120px] font-medium">Total (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeItems.map((item) => {
                      const lineTotal = (parseInt(item.quantity, 10) || 0) * (parseFloat(item.unit_price) || 0);
                      return (
                        <tr key={item.product_id} data-testid={`sell-preview-row-${item.product_id}`} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            </div>
                          </td>
                          <td className="p-3 text-right tabular">{item.quantity}</td>
                          <td className="p-3 text-right tabular">{formatPeso(item.unit_price)}</td>
                          <td className="p-3 text-right tabular font-medium">{formatPeso(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile view */}
              <div className="block sm:hidden divide-y divide-border">
                {activeItems.map((item) => {
                  const lineTotal = (parseInt(item.quantity, 10) || 0) * (parseFloat(item.unit_price) || 0);
                  return (
                    <div key={item.product_id} data-testid={`sell-preview-card-${item.product_id}`} className="p-3.5 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                        <span className="text-xs font-semibold tabular bg-muted px-2 py-0.5 rounded border border-border">
                          {item.quantity} units
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Price</span>
                        <span className="tabular">{formatPeso(item.unit_price)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/40">
                        <span className="text-muted-foreground">Line Total</span>
                        <span className="font-semibold tabular text-foreground">{formatPeso(lineTotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Optional Note Display */}
          {note.trim() && (
            <div className="space-y-1 my-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note</span>
              <p className="text-sm p-3 bg-muted/30 rounded-lg border border-border italic text-foreground" data-testid="sell-preview-note">
                {note}
              </p>
            </div>
          )}

          {/* Total display summary */}
          <div className="flex items-center justify-between bg-primary-soft rounded-xl px-4 py-3 border border-primary/20 my-2">
            <div>
              <p className="text-sm text-muted-foreground">Checkout Total</p>
              <p className="text-xs text-muted-foreground">
                {activeItems.length} product(s) · {totalUnits} unit(s)
              </p>
            </div>
            <span className="tabular text-2xl font-semibold text-primary" data-testid="sell-preview-grand-total">
              {formatPeso(grandTotal)}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg my-2">
              {error}
            </div>
          )}

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
              disabled={submitting}
              data-testid="sell-preview-back-btn"
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 min-w-[150px]"
              data-testid="sell-preview-submit-btn"
            >
              {submitting ? "Processing..." : `Confirm & Submit · ${formatPeso(grandTotal)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard confirmation dialog */}
      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent data-testid="sell-confirm-close-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have active quantities specified in the worksheet. Closing this dialog will discard your changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="sell-confirm-close-cancel-btn">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmClose(false);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="sell-confirm-close-confirm-btn"
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
