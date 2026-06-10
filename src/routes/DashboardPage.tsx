import { AlertTriangle, Banknote, BarChart2, CheckCircle2, Package, RotateCcw, ShoppingCart, TrendingUp, type LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/store/AuthContext';
import { useDashboardData, type DashboardSale, type DashboardStockItem, type WeeklyRevenuePoint } from '@/hooks/useDashboardData';
import { useInterval } from '@/hooks/useInterval';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'DZD',
    maximumFractionDigits: 0,
  }).format(value);

const currentGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
};

const fullDate = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

const attributesLabel = (attributes: Record<string, string>) => {
  const values = Object.values(attributes).filter(Boolean);
  return values.length ? values.join(' / ') : 'Default';
};

const relativeTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);

  if (date.toDateString() === now.toDateString()) {
    return time;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${time}`;
  }
  return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date)} ${time}`;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone?: 'ok' | 'warn' | 'danger';
}) => (
  <Card className="stat-card">
    <div className="stat-icon">
      <Icon size={18} />
    </div>
    <strong>{value}</strong>
    <span>{label}</span>
    <p className={tone ? `stat-sub-${tone}` : ''}>{sub}</p>
  </Card>
);

const WeeklyRevenueChart = ({ data }: { data: WeeklyRevenuePoint[] }) => {
  const width = 720;
  const height = 260;
  const padding = { top: 22, right: 24, bottom: 36, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1);

  const points = data.map((point, index) => {
    const x = padding.left + (chartWidth / Math.max(data.length - 1, 1)) * index;
    const y = padding.top + chartHeight - (point.revenue / maxRevenue) * chartHeight;
    return { ...point, x, y };
  });

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${path} L ${points.at(-1)?.x ?? padding.left} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  return (
    <Card className="dashboard-panel weekly-panel">
      <div className="panel-heading">
        <div>
          <h2>Revenue - Last 7 Days</h2>
          <p>Daily revenue trend</p>
        </div>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Revenue over the last seven days">
          {[0, 0.5, 1].map((ratio) => {
            const y = padding.top + chartHeight - chartHeight * ratio;
            return <line key={ratio} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="chart-grid" />;
          })}
          <path d={area} className="chart-area" />
          <path d={path} className="chart-line" />
          {points.map((point) => (
            <g key={point.date}>
              <circle cx={point.x} cy={point.y} r="4" className="chart-dot" />
              <text x={point.x} y={height - 12} textAnchor="middle" className="chart-label">
                {point.label}
              </text>
            </g>
          ))}
          <text x={padding.left - 10} y={padding.top + 4} textAnchor="end" className="chart-label">
            {money(maxRevenue)}
          </text>
          <text x={padding.left - 10} y={padding.top + chartHeight} textAnchor="end" className="chart-label">
            {money(0)}
          </text>
        </svg>
      </div>
    </Card>
  );
};

const LowStockPanel = ({ items }: { items: DashboardStockItem[] }) => {
  const navigate = useNavigate();

  return (
    <Card className="dashboard-panel low-stock-panel">
      <div className="panel-heading">
        <div>
          <h2>
            <AlertTriangle size={18} />
            Low Stock
          </h2>
          <p>{items.length ? `${items.length} items need attention` : 'Inventory looks steady'}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="dashboard-empty compact">
          <CheckCircle2 size={28} />
          <span>All items are well stocked</span>
        </div>
      ) : (
        <div className="low-stock-list">
          {items.slice(0, 8).map((item) => (
            <button key={item.variantId} type="button" className="low-stock-row" onClick={() => navigate(`/stock?variant=${item.variantId}`)}>
              <span>
                <strong>{item.productName}</strong>
                <small>{attributesLabel(item.attributes)}</small>
              </span>
              {item.quantity === 0 ? <Badge variant="danger">Out</Badge> : <Badge variant="warn">{item.quantity} left</Badge>}
            </button>
          ))}
        </div>
      )}
      <Link className="panel-link" to="/stock?filter=low">
        View all low stock
      </Link>
    </Card>
  );
};

const RecentSalesTable = ({ sales }: { sales: DashboardSale[] }) => (
  <Card className="dashboard-panel recent-sales-panel">
    <div className="panel-heading">
      <div>
        <h2>Recent Sales</h2>
        <p>Last 10 recorded transactions</p>
      </div>
      <Link className="panel-link" to="/reporting">
        View full reports
      </Link>
    </div>
    {sales.length === 0 ? (
      <div className="dashboard-empty">
        <BarChart2 size={32} />
        <span>No sales recorded yet</span>
        <Link className="button button-primary button-md" to="/scan">
          Go to Scanner
        </Link>
      </div>
    ) : (
      <div className="table-scroll">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Product</th>
              <th>Buyer</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{relativeTime(sale.soldAt)}</td>
                <td>
                  <strong>{sale.productName}</strong>
                  <small>{attributesLabel(sale.attributes)}</small>
                </td>
                <td>{sale.buyerName || '-'}</td>
                <td>{sale.quantity}</td>
                <td>{money(sale.total)}</td>
                <td>
                  <Badge variant="info">{sale.type}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Card>
);

const DashboardSkeleton = () => (
  <div className="dashboard-page">
    <div className="dashboard-header">
      <div>
        <div className="shimmer skeleton-line wide" />
        <div className="shimmer skeleton-line" />
      </div>
      <div className="shimmer skeleton-button" />
    </div>
    <div className="stats-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="shimmer skeleton-stat" key={index} />
      ))}
    </div>
    <div className="dashboard-row">
      <div className="shimmer skeleton-chart" />
      <div className="shimmer skeleton-side" />
    </div>
    <div className="dashboard-panel skeleton-table">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="shimmer skeleton-row" key={index} />
      ))}
    </div>
  </div>
);

export const DashboardPage = () => {
  const { user } = useAuth();
  const { stats, lowStock, recentSales, weeklyRevenue, isLoading, isRefreshing, refetch } = useDashboardData(user);

  useInterval(() => {
    void refetch(true);
  }, 60000);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const revenueSub =
    stats.revenueToday === 0
      ? 'No sales yet today'
      : stats.revenueDeltaPercent === null
        ? 'No sales yesterday'
        : `${stats.revenueDeltaPercent >= 0 ? '+' : ''}${stats.revenueDeltaPercent.toFixed(1)}% vs yesterday`;
  const revenueTone = stats.revenueDeltaPercent === null ? undefined : stats.revenueDeltaPercent >= 0 ? 'ok' : 'danger';

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            {currentGreeting()}, {user?.name}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <span>{fullDate()}</span>
          <Button variant="ghost" size="sm" type="button" onClick={() => void refetch(true)} disabled={isRefreshing}>
            {isRefreshing ? <Spinner size="sm" /> : <RotateCcw size={16} />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Banknote} label="Revenue Today" value={money(stats.revenueToday)} sub={revenueSub} tone={revenueTone} />
        <StatCard
          icon={TrendingUp}
          label="Profit Today"
          value={money(stats.profitToday)}
          sub={stats.marginPercent === null ? 'No margin yet' : `${stats.marginPercent.toFixed(1)}% margin`}
          tone="ok"
        />
        <StatCard
          icon={Package}
          label="Items in Stock"
          value={stats.itemsInStock.toString()}
          sub={stats.lowStockCount ? `${stats.lowStockCount} items running low` : `${stats.totalProducts} products tracked`}
          tone={stats.lowStockCount ? 'warn' : undefined}
        />
        <StatCard
          icon={ShoppingCart}
          label="Sales Today"
          value={stats.salesToday.toString()}
          sub={`${stats.uniqueProductsSoldToday} unique products sold`}
        />
      </div>

      <div className="dashboard-row">
        <WeeklyRevenueChart data={weeklyRevenue} />
        <LowStockPanel items={lowStock} />
      </div>

      <RecentSalesTable sales={recentSales} />
    </div>
  );
};
