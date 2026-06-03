import { Package, Warning, CurrencyDollar } from "@phosphor-icons/react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function StatCard({ index, label, value, sub, icon: Icon, accent, testid }) {
  return (
    <div
      data-testid={testid}
      className="group border border-border bg-card p-6 flex flex-col justify-between min-h-[140px] transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {index} / {label}
        </span>
        <Icon size={16} className={accent || "text-muted-foreground"} />
      </div>
      <div className="space-y-1">
        <p className="font-mono text-4xl tracking-tight">{value}</p>
        {sub && (
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border-l border-t border-border">
      <div className="border-r border-b border-border -ml-px -mt-px">
        <StatCard
          index="01"
          label="Total Products"
          value={stats.total}
          sub="unique SKUs tracked"
          icon={Package}
          testid="stat-total"
        />
      </div>
      <div className="border-r border-b border-border -mt-px">
        <StatCard
          index="02"
          label="Low Stock"
          value={stats.low}
          sub="below 5 units"
          icon={Warning}
          accent={stats.low > 0 ? "text-warning" : "text-muted-foreground"}
          testid="stat-low"
        />
      </div>
      <div className="border-r border-b border-border -mt-px">
        <StatCard
          index="03"
          label="Inventory Value"
          value={`$${fmt(stats.value)}`}
          sub="quantity × unit price"
          icon={CurrencyDollar}
          testid="stat-value"
        />
      </div>
    </div>
  );
}
