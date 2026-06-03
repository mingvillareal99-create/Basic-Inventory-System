import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ShoppingCart, ShoppingBag, MagnifyingGlass } from "@phosphor-icons/react";
import { formatPeso } from "@/lib/format";

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
    <div className="space-y-6" data-testid="transactions-tab">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Every buy and sell is recorded here with who, when, and how much.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div data-testid="tx-stat-count" className="bg-card rounded-xl border border-border card-shadow p-5">
          <p className="text-sm text-muted-foreground">Total transactions</p>
          <p className="text-2xl md:text-3xl font-semibold tabular mt-1">{items.length}</p>
        </div>
        <div data-testid="tx-stat-buy" className="bg-card rounded-xl border border-border card-shadow p-5">
          <p className="text-sm text-muted-foreground">Money spent (buys)</p>
          <p className="text-2xl md:text-3xl font-semibold tabular mt-1 text-primary">{formatPeso(totalBuy)}</p>
        </div>
        <div data-testid="tx-stat-sell" className="bg-card rounded-xl border border-border card-shadow p-5">
          <p className="text-sm text-muted-foreground">Revenue (sells)</p>
          <p className="text-2xl md:text-3xl font-semibold tabular mt-1">{formatPeso(totalSell)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="tx-search"
            placeholder="Search by product or user"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-11 text-base"
          />
        </div>
        <div className="inline-flex border border-border rounded-lg overflow-hidden bg-card">
          {["all", "buy", "sell"].map((f) => (
            <button
              key={f}
              data-testid={`tx-filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-4 h-12 text-sm font-medium capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center" data-testid="tx-empty">
            <p className="font-semibold mb-1">No transactions yet</p>
            <p className="text-sm text-muted-foreground">Tap Buy or Sell to record one.</p>
          </div>
        ) : (
          <div className="divide-y divide-border" data-testid="tx-list">
            {filtered.map((t) => {
              const isBuy = t.type === "buy";
              const Icon = isBuy ? ShoppingCart : ShoppingBag;
              return (
                <div
                  key={t.id}
                  data-testid={`tx-row-${t.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className={`h-11 w-11 shrink-0 rounded-lg flex items-center justify-center ${isBuy ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon size={20} weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.product_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      <span className="capitalize">{t.type}</span>
                      {" · "}{t.user_email}
                      {" · "}{formatDate(t.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular">
                      {isBuy ? "+" : "−"}{t.quantity}
                    </p>
                    <p className="text-sm text-muted-foreground tabular">
                      {formatPeso(t.total)}
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
