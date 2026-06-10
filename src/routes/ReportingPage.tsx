import { useMemo, useState } from 'react';
import { BarChart2, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDateRange, isoDay, type Period } from '@/hooks/useDateRange';
import { useReports, type SalesLogRow, type SummaryRow } from '@/hooks/useReports';
import { money, parseAttributes, variantLabel } from '@/utils/productUtils';

const periods: Array<{ value: Period; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

const sum = (rows: SummaryRow[], key: keyof SummaryRow) => rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
const pct = (current: number, previous: number) => (previous ? ((current - previous) / previous) * 100 : current ? 100 : 0);
const chartDate = (day: string) => new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit' }).format(new Date(day));
const colors = ['#f0f0f0', '#b0b0b0', '#808080', '#505050', '#303030', '#181818'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="report-tooltip">
      <strong>{label}</strong>
      {payload.map((entry: any) => (
        <span key={entry.dataKey}>{entry.name}: {typeof entry.value === 'number' ? money(entry.value) : entry.value}</span>
      ))}
    </div>
  );
};

const MetricCard = ({ label, value, sub, change }: { label: string; value: string; sub: string; change?: number }) => (
  <Card className="stat-card">
    <strong>{value}</strong>
    <span>{label}</span>
    <p className={change === undefined ? '' : change >= 0 ? 'stat-sub-ok' : 'stat-sub-danger'}>{sub}</p>
  </Card>
);

export const ReportingPage = () => {
  const [period, setPeriod] = useState<Period>('last30');
  const [custom, setCustom] = useState({ start: isoDay(new Date()), end: isoDay(new Date()) });
  const [sortKey, setSortKey] = useState<keyof SalesLogRow>('sold_at');
  const [page, setPage] = useState(1);
  const range = useDateRange(period, custom);
  const { summary, hourly, categories, comparison, salesLog, isLoading } = useReports(range);

  const totals = useMemo(() => {
    const revenue = sum(summary, 'revenue');
    const profit = sum(summary, 'profit');
    const units = sum(summary, 'total_units');
    const transactions = sum(summary, 'total_sales');
    const prevRevenue = sum(comparison.previous, 'revenue');
    return {
      revenue,
      profit,
      units,
      transactions,
      uniqueProducts: summary.reduce((max, row) => Math.max(max, row.unique_products), 0),
      revenueChange: pct(revenue, prevRevenue),
      margin: revenue ? (profit / revenue) * 100 : 0,
      avgPerDay: summary.length ? transactions / summary.length : 0,
    };
  }, [comparison.previous, summary]);

  const chartData = summary.map((row) => ({ ...row, label: chartDate(row.day) }));
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({ hour, sales_count: hourly.find((row) => row.hour === hour)?.sales_count ?? 0 }));
  const peak = hourlyData.reduce((best, row) => (row.sales_count > best.sales_count ? row : best), hourlyData[0]);
  const sortedLog = [...salesLog].sort((a, b) => String(b[sortKey]).localeCompare(String(a[sortKey])));
  const pagedLog = sortedLog.slice((page - 1) * 20, page * 20);
  const hasAnyData = summary.length || salesLog.length;

  const exportCsv = async () => {
    const header = ['Date/Time', 'Product', 'Variant', 'Qty', 'Unit Price', 'Total', 'Buyer'];
    const rows = sortedLog.map((sale) => [
      sale.sold_at,
      sale.product_name,
      variantLabel(parseAttributes(sale.attributes)),
      sale.quantity,
      sale.unit_price,
      sale.total,
      sale.buyer_name ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    await window.api.file.saveCsv(`stockflow-sales-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  if (!isLoading && !hasAnyData) {
    return (
      <Card className="reports-empty">
        <BarChart2 size={48} />
        <h2>No sales data yet</h2>
        <p>Start scanning items to sell and your reports will appear here</p>
        <Link className="button button-primary button-md" to="/scan">Go to Scanner</Link>
      </Card>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>Reports</h1>
        <div className="period-tabs">
          {periods.map((item) => <button key={item.value} className={period === item.value ? 'period-active' : ''} onClick={() => setPeriod(item.value)}>{item.label}</button>)}
        </div>
      </div>
      {period === 'custom' ? <div className="custom-range"><input type="date" value={custom.start} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} /><input type="date" value={custom.end} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} /></div> : null}

      <div className="stats-grid">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <div className="shimmer skeleton-stat" key={i} />) : <>
          <MetricCard label="Total Revenue" value={money(totals.revenue)} sub={`${totals.revenueChange >= 0 ? '↑' : '↓'} ${Math.abs(totals.revenueChange).toFixed(1)}%`} change={totals.revenueChange} />
          <MetricCard label="Total Profit" value={money(totals.profit)} sub={`${totals.margin.toFixed(1)}% margin`} />
          <MetricCard label="Units Sold" value={String(totals.units)} sub={`${totals.uniqueProducts} unique products`} />
          <MetricCard label="Total Transactions" value={String(totals.transactions)} sub={`${totals.avgPerDay.toFixed(1)} avg per day`} />
        </>}
      </div>

      <Card className="report-panel">
        <h2>Revenue & Profit Over Time</h2>
        {isLoading ? <div className="shimmer skeleton-chart" /> : chartData.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="var(--border-subtle)" vertical={false} opacity={0.5} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fill: 'var(--text-muted)' }} tickFormatter={(v) => money(Number(v))} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar name="Revenue" dataKey="revenue" fill="rgba(255,255,255,0.15)" />
              <Line name="Profit" dataKey="profit" stroke="#4ade80" dot={{ r: 3, fill: '#4ade80' }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">No sales in this period</div>}
      </Card>

      <div className="report-chart-row">
        <Card className="report-panel">
          <h2>Category Breakdown</h2>
          {categories.length ? <ResponsiveContainer width="100%" height={280}><PieChart><Tooltip content={<CustomTooltip />} /><Pie data={categories} dataKey="revenue" nameKey="category" innerRadius={60} outerRadius={95}>{categories.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie></PieChart></ResponsiveContainer> : <div className="chart-empty">No data for this period</div>}
          <div className="category-legend">{categories.map((row) => <span key={row.category}>{row.category}: {money(row.revenue)} / {row.sales_count} sales</span>)}</div>
        </Card>
        <Card className="report-panel">
          <h2>Best Hours to Sell</h2>
          <ResponsiveContainer width="100%" height={280}><BarChart data={hourlyData}><XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)' }} /><YAxis tick={{ fill: 'var(--text-muted)' }} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="sales_count">{hourlyData.map((row) => <Cell key={row.hour} fill={row.hour === peak.hour ? '#ffffff' : 'var(--bg-elevated)'} />)}</Bar></BarChart></ResponsiveContainer>
          <p className="muted-text">Your busiest time: {peak.hour}:00 - {Math.min(peak.hour + 1, 24)}:00</p>
        </Card>
      </div>

      <Card className="report-panel">
        <h2>Period Comparison</h2>
        <table className="comparison-table"><tbody>{[
          ['Revenue', sum(comparison.current, 'revenue'), sum(comparison.previous, 'revenue'), money],
          ['Profit', sum(comparison.current, 'profit'), sum(comparison.previous, 'profit'), money],
          ['Units Sold', sum(comparison.current, 'total_units'), sum(comparison.previous, 'total_units'), String],
          ['Transactions', sum(comparison.current, 'total_sales'), sum(comparison.previous, 'total_sales'), String],
        ].map(([label, cur, prev, fmt]: any) => { const change = pct(cur, prev); return <tr key={label}><th>{label}</th><td>{fmt(cur)}</td><td>{fmt(prev)}</td><td className={change >= 0 ? 'stat-sub-ok' : 'stat-sub-danger'}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%</td></tr>; })}</tbody></table>
      </Card>

      <Card className="report-panel">
        <div className="panel-heading"><h2>Sales Log</h2><Button variant="ghost" onClick={exportCsv}><Download size={16} />Export</Button></div>
        <div className="table-scroll"><table className="sales-table"><thead><tr>{['sold_at', 'product_name', 'attributes', 'quantity', 'unit_price', 'total', 'buyer_name'].map((key) => <th key={key} onClick={() => setSortKey(key as keyof SalesLogRow)}>{key.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{pagedLog.map((sale) => <tr key={sale.id}><td>{new Date(sale.sold_at).toLocaleString()}</td><td>{sale.product_name}</td><td>{variantLabel(parseAttributes(sale.attributes))}</td><td>{sale.quantity}</td><td>{money(sale.unit_price)}</td><td>{money(sale.total)}</td><td>{sale.buyer_name || '-'}</td></tr>)}</tbody></table></div>
        <div className="pagination-row"><Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button><span>Page {page}</span><Button variant="ghost" disabled={page * 20 >= sortedLog.length} onClick={() => setPage(page + 1)}>Next</Button></div>
      </Card>
    </div>
  );
};
