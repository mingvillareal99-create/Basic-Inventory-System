import { useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsBar from "@/components/StatsBar";
import InventoryTable from "@/components/InventoryTable";
import ProductDialog from "@/components/ProductDialog";
import { MagnifyingGlass, Plus, ShoppingCart, ShoppingBag, DownloadSimple } from "@phosphor-icons/react";
import { jsPDF } from "jspdf";

export default function InventoryTab({ products, loading, isAdmin, reload, onBuy, onSell }) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s)
    );
  }, [products, search]);

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Title & Document Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text("Palm's Inventory", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text("Inventory Status Report", 15, 26);

      // Date and Filter context
      const todayStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.setFontSize(9);
      doc.text(`Generated: ${todayStr}`, 195, 20, { align: "right" });
      if (search.trim()) {
        doc.text(`Filter: "${search.trim()}"`, 195, 25, { align: "right" });
      } else {
        doc.text("Filter: All Products", 195, 25, { align: "right" });
      }

      // Stats block calculations
      const filteredTotal = filtered.length;
      const filteredLow = filtered.filter((p) => p.quantity < 5).length;
      const filteredValue = filtered.reduce((sum, p) => sum + p.quantity * p.price, 0);

      // Stats container background
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(15, 32, 180, 18, "F");
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.rect(15, 32, 180, 18, "D");

      // Stats labels
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFontSize(8);
      doc.text("TOTAL PRODUCTS", 20, 38);
      doc.text("LOW STOCK ITEMS", 80, 38);
      doc.text("TOTAL VALUE", 140, 38);

      // Stats values
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(String(filteredTotal), 20, 44);
      doc.text(String(filteredLow), 80, 44);
      doc.text(
        `PHP ${filteredValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        140,
        44
      );

      // Table configuration
      let y = 60;

      // Draw table header
      doc.setFillColor(71, 85, 105); // Slate-600
      doc.rect(15, y, 180, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255); // White
      doc.text("#", 17, y + 5.5);
      doc.text("Product Name", 25, y + 5.5);
      doc.text("Category", 85, y + 5.5);
      doc.text("In Stock", 140, y + 5.5, { align: "right" });
      doc.text("Unit Price", 168, y + 5.5, { align: "right" });
      doc.text("Total Value", 195, y + 5.5, { align: "right" });

      y += 8;

      // Render items
      filtered.forEach((p, index) => {
        // Page break logic
        if (y > 265) {
          doc.addPage();
          y = 20;

          // Re-draw table header
          doc.setFillColor(71, 85, 105); // Slate-600
          doc.rect(15, y, 180, 8, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255); // White
          doc.text("#", 17, y + 5.5);
          doc.text("Product Name", 25, y + 5.5);
          doc.text("Category", 85, y + 5.5);
          doc.text("In Stock", 140, y + 5.5, { align: "right" });
          doc.text("Unit Price", 168, y + 5.5, { align: "right" });
          doc.text("Total Value", 195, y + 5.5, { align: "right" });

          y += 8;
        }

        // Row background striping
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate-50
          doc.rect(15, y, 180, 8, "F");
        }

        // Draw line underneath row
        doc.setDrawColor(241, 245, 249); // Slate-100
        doc.line(15, y + 8, 195, y + 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85); // Slate-700
        doc.text(String(index + 1), 17, y + 5.5);

        // Word wrap / truncation
        let name = p.name;
        if (name.length > 30) {
          name = name.substring(0, 27) + "...";
        }
        doc.text(name, 25, y + 5.5);

        let cat = p.category;
        if (cat.length > 18) {
          cat = cat.substring(0, 15) + "...";
        }
        doc.text(cat, 85, y + 5.5);

        // Highlight low stock
        const isLow = p.quantity < 5;
        if (isLow) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(220, 38, 38); // Red-600
        }
        doc.text(String(p.quantity), 140, y + 5.5, { align: "right" });
        if (isLow) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
        }

        doc.text(p.price.toFixed(2), 168, y + 5.5, { align: "right" });
        doc.text((p.quantity * p.price).toFixed(2), 195, y + 5.5, { align: "right" });

        y += 8;
      });

      // Totals Row
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(15, y, 180, 8, "F");
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(15, y, 195, y);
      doc.line(15, y + 8, 195, y + 8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("TOTALS", 25, y + 5.5);

      const totalQty = filtered.reduce((sum, p) => sum + p.quantity, 0);
      doc.text(String(totalQty), 140, y + 5.5, { align: "right" });
      doc.text(
        `PHP ${filteredValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        195,
        y + 5.5,
        { align: "right" }
      );

      // Footers (Two-pass generation)
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.line(15, 280, 195, 280);
        doc.text("Palm's Inventory Report", 15, 285);
        doc.text(`Page ${i} of ${totalPages}`, 195, 285, { align: "right" });
      }

      // Save PDF
      const cleanDate = new Date().toISOString().slice(0, 10);
      doc.save(`palms_inventory_export_${cleanDate}.pdf`);
      toast.success("PDF exported successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF");
    }
  };

  const stats = useMemo(() => {
    const total = products.length;
    const low = products.filter((p) => p.quantity < 5).length;
    const value = products.reduce((sum, p) => sum + p.quantity * p.price, 0);
    return { total, low, value };
  }, [products]);

  const onSaveProduct = async (payload) => {
    try {
      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product added");
      }
      setDialogOpen(false);
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  const onDeleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Inventory
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {isAdmin
              ? "Manage your products and record stock movements."
              : "Browse products and record buy or sell transactions."}
          </p>
        </div>

        {/* Desktop quick actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            data-testid="download-pdf-btn"
            onClick={handleDownloadPdf}
            variant="outline"
            className="h-11 gap-2 border-border text-foreground hover:bg-muted"
          >
            <DownloadSimple size={16} weight="bold" /> Export PDF
          </Button>
          <Button
            data-testid="desktop-buy-btn"
            onClick={() => onBuy?.(null)}
            className="h-11 gap-2 bg-primary hover:bg-primary/90"
          >
            <ShoppingCart size={16} weight="bold" /> Buy
          </Button>
          <Button
            data-testid="desktop-sell-btn"
            onClick={() => onSell?.(null)}
            variant="outline"
            className="h-11 gap-2"
          >
            <ShoppingBag size={16} weight="bold" /> Sell
          </Button>
          {isAdmin && (
            <Button
              data-testid="add-product-btn"
              onClick={() => { setEditing(null); setDialogOpen(true); }}
              variant="outline"
              className="h-11 px-4 gap-2"
            >
              <Plus size={16} weight="bold" /> Add product
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Search + mobile actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            data-testid="search-input"
            placeholder="Search by name or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-11 text-base"
          />
        </div>
        <div className="flex gap-2 md:hidden">
          <Button
            data-testid="download-pdf-btn-mobile"
            onClick={handleDownloadPdf}
            variant="outline"
            className="h-12 flex-1 gap-2 sm:flex-none sm:px-6"
          >
            <DownloadSimple size={18} weight="bold" /> Export PDF
          </Button>
          {isAdmin && (
            <Button
              data-testid="add-product-btn-mobile"
              onClick={() => { setEditing(null); setDialogOpen(true); }}
              className="h-12 flex-1 gap-2 sm:flex-none sm:px-6 bg-primary hover:bg-primary/90"
            >
              <Plus size={18} weight="bold" /> Add product
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <InventoryTable
        products={filtered}
        loading={loading}
        isAdmin={isAdmin}
        onBuy={onBuy}
        onSell={onSell}
        onDelete={onDeleteProduct}
        onEdit={(p) => { setEditing(p); setDialogOpen(true); }}
      />

      <ProductDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        product={editing}
        onSave={onSaveProduct}
      />
    </div>
  );
}
