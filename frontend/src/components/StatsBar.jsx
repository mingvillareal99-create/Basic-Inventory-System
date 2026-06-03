import { Package, Warning, CurrencyCircleDollar } from "@phosphor-icons/react";
import { formatPeso } from "@/lib/format";

function StatCard({ label, value, sub, icon: Icon, iconClass, valueClass, testid }) {
  return (
    <div
      data-testid={testid}
      className="bg-card rounded-xl border border-border card-shadow p-5 flex items-start gap-4"
    >
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${iconClass || "bg-muted text-muted-foreground"}`}>
        <Icon size={20} weight="bold" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl md:text-3xl font-semibold mt-1 tabular ${valueClass || ""}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        testid="stat-total"
        label="Total products"
        value={stats.total}
        sub="Unique items tracked"
        icon={Package}
        iconClass="bg-primary-soft text-primary"
      />
      <StatCard
        testid="stat-low"
        label="Low stock"
        value={stats.low}
        sub="Items below 5 units"
        icon={Warning}
        iconClass={stats.low > 0 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}
        valueClass={stats.low > 0 ? "text-warning" : ""}
      />
      <StatCard
        testid="stat-value"
        label="Inventory value"
        value={formatPeso(stats.value)}
        sub="Quantity × unit price"
        icon={CurrencyCircleDollar}
        iconClass="bg-primary-soft text-primary"
      />
    </div>
  );
}
