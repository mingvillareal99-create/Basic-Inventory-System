import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/format";
import {
  ShoppingCart, ShoppingBag, DownloadSimple, X,
} from "@phosphor-icons/react";
import { jsPDF } from "jspdf";

function formatDateLong(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function downloadGroup(group) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const ref = group.id.slice(-8).toUpperCase();
  const isBuy = group.type === "buy";
  
  // Set font
  doc.setFont("helvetica", "normal");

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 109, 58); // primary green
  doc.text(`STOCKROOM ${isBuy ? "PURCHASE" : "SALE"} RECEIPT`, 14, 22);

  // Divider line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, 26, 196, 26);

  // Metadata section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  doc.text("Reference:", 14, 34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`#${ref}`, 40, 34);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Date:", 14, 40);
  doc.setTextColor(30, 30, 30);
  doc.text(formatDateLong(group.created_at), 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Recorded by:", 14, 46);
  doc.setTextColor(30, 30, 30);
  doc.text(group.user_username, 40, 46);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Type:", 14, 52);
  doc.setTextColor(30, 30, 30);
  doc.text(isBuy ? "Buy / Restock" : "Sell", 40, 52);

  let currentY = 58;

  if (group.note) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Note:", 14, currentY);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "italic");
    const splitNote = doc.splitTextToSize(group.note, 150);
    doc.text(splitNote, 40, currentY);
    doc.setFont("helvetica", "normal");
    currentY += (splitNote.length * 5) + 2;
  } else {
    currentY += 2;
  }

  // Draw table header block
  doc.setFillColor(245, 245, 245);
  doc.rect(14, currentY, 182, 8, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Product Name", 16, currentY + 5.5);
  doc.text("Qty", 120, currentY + 5.5, { align: "right" });
  doc.text("Unit Price", 155, currentY + 5.5, { align: "right" });
  doc.text("Total", 192, currentY + 5.5, { align: "right" });

  currentY += 8;

  // Draw items
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  
  group.items.forEach((it) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
      doc.setFillColor(245, 245, 245);
      doc.rect(14, currentY, 182, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Product Name", 16, currentY + 5.5);
      doc.text("Qty", 120, currentY + 5.5, { align: "right" });
      doc.text("Unit Price", 155, currentY + 5.5, { align: "right" });
      doc.text("Total", 192, currentY + 5.5, { align: "right" });
      currentY += 10;
      doc.setFont("helvetica", "normal");
    }

    const priceText = `PHP ${Number(it.unit_price).toFixed(2)}`;
    const totalText = `PHP ${Number(it.total).toFixed(2)}`;
    
    const splitName = doc.splitTextToSize(it.product_name, 90);
    const rowHeight = Math.max(splitName.length * 5, 8);

    doc.text(splitName, 16, currentY + 5);
    doc.text(String(it.quantity), 120, currentY + 5, { align: "right" });
    doc.text(priceText, 155, currentY + 5, { align: "right" });
    doc.text(totalText, 192, currentY + 5, { align: "right" });

    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(14, currentY + rowHeight, 196, currentY + rowHeight);

    currentY += rowHeight;
  });

  // Totals Section
  currentY += 5;
  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(245, 252, 247); // soft green tint
  doc.rect(14, currentY, 182, 22, "F");
  doc.setDrawColor(210, 235, 218);
  doc.setLineWidth(0.5);
  doc.rect(14, currentY, 182, 22, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Total Units:", 20, currentY + 8);
  doc.setTextColor(30, 30, 30);
  doc.text(String(group.total_units), 50, currentY + 8);

  doc.setTextColor(100, 100, 100);
  doc.text("Grand Total:", 20, currentY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(26, 109, 58); // primary green
  doc.text(`PHP ${Number(group.total_amount).toFixed(2)}`, 50, currentY + 15);

  const stamp = new Date(group.created_at).toISOString().slice(0, 16).replace(/[-:T]/g, "");
  doc.save(`${group.type}-${stamp}-${group.id.slice(-6)}.pdf`);
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
              <p className="font-medium truncate" data-testid="tx-details-user">{group.user_username}</p>
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
            <DownloadSimple size={16} weight="bold" /> Download (PDF)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
