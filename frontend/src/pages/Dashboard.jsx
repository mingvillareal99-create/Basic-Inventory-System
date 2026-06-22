import { useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast, Toaster } from "sonner";
import {
  Sun, Moon, SignOut, Package, ShoppingCart, ShoppingBag,
  ArrowsLeftRight, Users, Storefront,
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

  const visibleTabs = TABS.filter((t) => t.roles.includes(user?.role));

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

  const onTransactionComplete = () => loadProducts();

  return (
    <div className="min-h-screen bg-muted/30 text-foreground" data-testid="dashboard-page">
      <Toaster position="top-right" theme={theme} richColors />

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Package size={20} weight="fill" />
            </div>
            <div>
              <p className="text-base font-semibold leading-tight">Palm's Inventory</p>
              <p className="text-xs text-muted-foreground leading-tight">Inventory dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col text-right leading-tight pr-2">
              <span className="text-sm font-medium" data-testid="header-user-username">{user?.username}</span>
              <span className="text-xs text-muted-foreground capitalize" data-testid="header-user-role">
                {user?.role}
              </span>
            </div>
            <button
              data-testid="theme-toggle-btn"
              onClick={toggle}
              className="h-10 w-10 inline-flex items-center justify-center border border-border hover:bg-muted transition-colors rounded-lg"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              data-testid="logout-btn"
              onClick={logout}
              className="h-10 px-3 inline-flex items-center gap-2 border border-border hover:bg-muted transition-colors text-sm font-medium rounded-lg"
            >
              <SignOut size={16} /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <nav className="flex gap-1 overflow-x-auto -mb-px">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  data-testid={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`px-2.5 sm:px-4 py-3.5 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={18} weight={active ? "fill" : "regular"} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10 pb-32 md:pb-10">
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
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-bottom"
      >
        <div className="px-4 py-3 flex gap-3">
          <button
            data-testid="mobile-buy-btn"
            onClick={() => setTxDialog({ open: true, type: "buy", product: null })}
            className="flex-1 h-14 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl card-shadow transition-colors"
          >
            <ShoppingCart size={20} weight="bold" />
            Buy
          </button>
          {isAdmin && (
            <button
              data-testid="mobile-sell-btn"
              onClick={() => setTxDialog({ open: true, type: "sell", product: null })}
              className="flex-1 h-14 inline-flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-xl card-shadow transition-colors"
            >
              <ShoppingBag size={20} weight="bold" />
              Sell
            </button>
          )}
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
