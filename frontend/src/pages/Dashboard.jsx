import { useEffect, useMemo, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast, Toaster } from "sonner";
import {
  Sun, Moon, SignOut, Package, ShoppingCart, ArrowsLeftRight,
  Users, Storefront,
} from "@phosphor-icons/react";
import InventoryTab from "@/components/tabs/InventoryTab";
import TransactionsTab from "@/components/tabs/TransactionsTab";
import AccountsTab from "@/components/tabs/AccountsTab";
import CartDialog from "@/components/CartDialog";

const TABS = [
  { id: "inventory", label: "Inventory", icon: Storefront, roles: ["admin", "personnel"] },
  { id: "transactions", label: "Transactions", icon: ArrowsLeftRight, roles: ["admin", "personnel"] },
  { id: "accounts", label: "Accounts", icon: Users, roles: ["admin"] },
];

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState("inventory");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [txDialog, setTxDialog] = useState({ open: false, type: "buy", product: null });

  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.roles.includes(user?.role)),
    [user]
  );

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const { data } = await api.get("/products");
      setProducts(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const onTransactionComplete = (tx) => {
    // refresh product list to reflect new stock
    loadProducts();
    return tx;
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="dashboard-page">
      <Toaster position="top-right" theme={theme} richColors />

      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 border border-border flex items-center justify-center rounded-md">
              <Package size={18} weight="duotone" />
            </div>
            <div className="leading-tight">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Stockroom
              </p>
              <p className="text-sm font-semibold">Inventory Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col text-right leading-tight pr-2">
              <span className="text-xs font-medium" data-testid="header-user-email">{user?.email}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground" data-testid="header-user-role">
                {user?.role}
              </span>
            </div>
            <button
              data-testid="theme-toggle-btn"
              onClick={toggle}
              className="h-10 w-10 inline-flex items-center justify-center border border-border hover:bg-muted transition-colors rounded-md"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              data-testid="logout-btn"
              onClick={logout}
              className="h-10 px-3 inline-flex items-center gap-2 border border-border hover:bg-muted transition-colors text-xs font-medium rounded-md"
            >
              <SignOut size={16} /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-10">
          <nav className="flex gap-1 overflow-x-auto -mb-px">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  data-testid={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={16} weight={active ? "fill" : "regular"} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-10 py-6 md:py-10 pb-32 md:pb-10">
        {tab === "inventory" && (
          <InventoryTab
            products={products}
            loading={productsLoading}
            isAdmin={isAdmin}
            reload={loadProducts}
            onBuy={(p) => setTxDialog({ open: true, type: "buy", product: p })}
            onSell={(p) => setTxDialog({ open: true, type: "sell", product: p })}
          />
        )}
        {tab === "transactions" && <TransactionsTab />}
        {tab === "accounts" && isAdmin && <AccountsTab currentUser={user} />}
      </main>

      {/* Mobile floating buy/sell action bar */}
      <div
        data-testid="mobile-action-bar"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur safe-bottom"
      >
        <div className="px-4 py-3 flex gap-3">
          <button
            data-testid="mobile-buy-btn"
            onClick={() => setTxDialog({ open: true, type: "buy", product: null })}
            className="flex-1 h-14 inline-flex items-center justify-center gap-2 bg-success/90 hover:bg-success text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            <ShoppingCart size={20} weight="bold" />
            BUY
          </button>
          <button
            data-testid="mobile-sell-btn"
            onClick={() => setTxDialog({ open: true, type: "sell", product: null })}
            className="flex-1 h-14 inline-flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-lg shadow-sm transition-colors"
          >
            <ArrowsLeftRight size={20} weight="bold" />
            SELL
          </button>
        </div>
      </div>

      <CartDialog
        open={txDialog.open}
        type={txDialog.type}
        defaultProduct={txDialog.product}
        products={products}
        onOpenChange={(o) => setTxDialog((d) => ({ ...d, open: o }))}
        onCompleted={onTransactionComplete}
      />
    </div>
  );
}
