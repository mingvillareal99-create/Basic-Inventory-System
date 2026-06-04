import { useEffect, useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart, ShoppingBag, MagnifyingGlass, CaretRight, Receipt,
} from "@phosphor-icons/react";
import { formatPeso } from "@/lib/format";
import TransactionDetailsDialog from "@/components/TransactionDetailsDialog";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// Group transactions that share user + type + created_at + note (a "cart" / bulk order)
function groupTransactions(items) {
  const map = new Map();
  for (const t of items) {
    const key = `${t.type}|${t.user_id}|${t.created_at}|${t.note || ""}`;
    if (!map.has(key)) {
      map.set(key, {
        id: t.id, // first child id becomes the group id (stable enough for testid)
        type: t.type,
        user_username: t.user_username,
        created_at: t.created_at,
        note: t.note,
        items: [],
        total_units: 0,
        total_amount: 0,
      });
    }
    const g = map.get(key);
    g.items.push(t);
    g.total_units += Number(t.quantity) || 0;
    g.total_amount += Number(t.total) || 0;
  }
  // Sort each group's items by product name; sort groups by date desc
  const groups = Array.from(map.values()).map((g) => ({
    ...g,
    items: [...g.items].sort((a, b) => a.product_name.localeCompare(b.product_name)),
  }));
  groups.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return groups;
}

export default function TransactionsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailsGroup, setDetailsGroup] = useState(null);

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

  const groups = useMemo(() => groupTransactions(items), [items]);

  const filteredGroups = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return groups;
    return groups.filter((g) => {
      if (g.user_username.toLowerCase().includes(s)) return true;
      if (g.note && g.note.toLowerCase().includes(s)) return true;
      return g.items.some((it) => it.product_name.toLowerCase().includes(s));
    });
  }, [groups, search]);

  const totalBuy = items.filter((t) => t.type === "buy").reduce((a, t) => a + t.total, 0);
  const totalSell = items.filter((t) => t.type === "sell").reduce((a, t) => a + t.total, 0);

  return (
    <div className="space-y-6" data-testid="transactions-tab">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Each row is one transaction. Click any row to view details or download a receipt.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div data-testid="tx-stat-count" className="bg-card rounded-xl border border-border card-shadow p-5">
          <p className="text-sm text-muted-foreground">Total transactions</p>
          <p className="text-2xl md:text-3xl font-semibold tabular mt-1">{groups.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{items.length} line item(s)</p>
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
            placeholder="Search by product, user, or note"
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
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center" data-testid="tx-empty">
            <div className="h-16 w-16 mx-auto rounded-xl bg-muted flex items-center justify-center mb-4">
              <Receipt size={28} className="text-muted-foreground" />
            </div>
            <p className="font-semibold mb-1">No transactions yet</p>
            <p className="text-sm text-muted-foreground">Tap Buy or Sell to record one.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border" data-testid="tx-list">
            {filteredGroups.map((g) => {
              const isBuy = g.type === "buy";
              const Icon = isBuy ? ShoppingCart : ShoppingBag;
              const ref = g.id.slice(-8).toUpperCase();
              const headline =
                g.items.length === 1
                  ? g.items[0].product_name
                  : `${g.items[0].product_name} + ${g.items.length - 1} more`;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    data-testid={`tx-row-${g.id}`}
                    onClick={() => setDetailsGroup(g)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className={`h-11 w-11 shrink-0 rounded-lg flex items-center justify-center ${isBuy ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon size={20} weight="bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center text-xs font-semibold uppercase px-2 py-0.5 rounded-md ${isBuy ? "bg-primary-soft text-primary" : "bg-muted text-foreground"}`}>
                          {g.type}
                        </span>
                        <span className="text-xs text-muted-foreground tabular">#{ref}</span>
                      </div>
                      <p className="font-medium truncate mt-1">{headline}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {g.user_username} · {formatDate(g.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold tabular text-base" data-testid={`tx-row-total-${g.id}`}>
                        {formatPeso(g.total_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.items.length} item · {g.total_units} unit{g.total_units === 1 ? "" : "s"}
                      </p>
                    </div>
                    <CaretRight size={16} className="text-muted-foreground shrink-0 hidden sm:block" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TransactionDetailsDialog
        open={!!detailsGroup}
        group={detailsGroup}
        onOpenChange={(o) => !o && setDetailsGroup(null)}
      />
    </div>
  );
}
