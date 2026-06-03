import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ShoppingCart, ArrowsLeftRight, MagnifyingGlass } from "@phosphor-icons/react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function TransactionsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const params = filter !== "all" ? { type: filter } : {};
      const { data } = await api.get("/transactions", { params });
      setItems(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const filtered = items.filter((t) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      t.product_name.toLowerCase().includes(s) ||
      t.user_email.toLowerCase().includes(s)
    );
  });

  const totalBuy = items.filter((t) => t.type === "buy").reduce((a, t) => a + t.total, 0);
  const totalSell = items.filter((t) => t.type === "sell").reduce((a, t) => a + t.total, 0);

  return (
    <div className="space-y-6 animate-fade-up" data-testid="transactions-tab">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Activity log
        </p>
        <h1 className="text-3xl md:text-4xl tracking-tight font-semibold mt-1">
          Transactions.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Every buy or sell is recorded with the actor, time, and value.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden">
        <div className="bg-card p-4 space-y-1" data-testid="tx-stat-count">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Total / 01</p>
          <p className="text-2xl md:text-3xl font-mono tabular">{items.length}</p>
          <p className="text-xs text-muted-foreground">transactions</p>
        </div>
        <div className="bg-card p-4 space-y-1" data-testid="tx-stat-buy">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Bought / 02</p>
          <p className="text-2xl md:text-3xl font-mono tabular text-success">${fmt(totalBuy)}</p>
          <p className="text-xs text-muted-foreground">spent restocking</p>
        </div>
        <div className="bg-card p-4 space-y-1 col-span-2 md:col-span-1" data-testid="tx-stat-sell">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Sold / 03</p>
          <p className="text-2xl md:text-3xl font-mono tabular">${fmt(totalSell)}</p>
          <p className="text-xs text-muted-foreground">revenue</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="tx-search"
            placeholder="Search by product or user"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-10"
          />
        </div>
        <div className="inline-flex border border-border rounded-md overflow-hidden">
          {["all", "buy", "sell"].map((f) => (
            <button
              key={f}
              data-testid={`tx-filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-4 h-11 text-xs uppercase tracking-wider font-medium transition-colors ${
                filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-card">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center" data-testid="tx-empty">
            <p className="font-semibold mb-1">No transactions yet.</p>
            <p className="text-sm text-muted-foreground">Hit the BUY or SELL button to record one.</p>
          </div>
        ) : (
          <div className="divide-y divide-border" data-testid="tx-list">
            {filtered.map((t) => {
              const isBuy = t.type === "buy";
              const Icon = isBuy ? ShoppingCart : ArrowsLeftRight;
              return (
                <div key={t.id} data-testid={`tx-row-${t.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className={`h-10 w-10 shrink-0 rounded-md flex items-center justify-center ${isBuy ? "bg-success/15 text-success" : "bg-foreground/10 text-foreground"}`}>
                    <Icon size={18} weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.product_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className={`uppercase font-mono ${isBuy ? "text-success" : ""}`}>{t.type}</span>
                      {" · "}{t.user_email}{" · "}{formatDate(t.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono tabular text-sm">
                      {isBuy ? "+" : "−"}{t.quantity}
                    </p>
                    <p className="font-mono tabular text-xs text-muted-foreground">
                      ${fmt(t.total)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
