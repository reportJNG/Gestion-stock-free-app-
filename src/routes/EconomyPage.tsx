import { useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useEconomy, type EconomyPeriod } from '@/hooks/useEconomy';
import { buildEconomyInsights } from '@/utils/insights';
import { categoryIcons, money } from '@/utils/productUtils';

const colors = ['#f0f0f0', '#b0b0b0', '#808080', '#505050', '#303030', '#181818'];
const relative = (value: string | null) => {
  if (!value) return 'Never sold';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};
const marginTone = (value: number) => (value > 20 ? 'ok' : value >= 10 ? 'warn' : 'danger');

export const EconomyPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<EconomyPeriod>('all');
  const [showAllProducts, setShowAllProducts] = useState(false);
  const { topProducts, topBuyers, categories, slowMovers, margins, isLoading } = useEconomy(period);
  const insights = buildEconomyInsights({ topProducts, topBuyers, categories, slowMovers });
  const visibleProducts = showAllProducts ? topProducts : topProducts.slice(0, 10);
  const maxRevenue = Math.max(...topProducts.map((row) => row.revenue), 1);
  const maxCategoryRevenue = Math.max(...categories.map((row) => row.revenue), 1);
  const slowCapital = slowMovers.reduce((sum, row) => sum + row.tied_capital, 0);
  const bestMargin = margins[0];
  const worstMargin = margins.at(-1);
  const overallMargin = useMemo(() => {
    const revenue = topProducts.reduce((sum, row) => sum + row.revenue, 0);
    const profit = topProducts.reduce((sum, row) => sum + row.profit, 0);
    return revenue ? (profit / revenue) * 100 : 0;
  }, [topProducts]);

  return (
    <div className="economy-page">
      <div className="reports-header">
        <div>
          <h1>Economy</h1>
          <p className="muted-text">Performance insights for your business</p>
        </div>
        <div className="period-tabs">
          {[
            ['all', 'All Time'],
            ['month', 'This Month'],
            ['year', 'This Year'],
          ].map(([value, label]) => (
            <button key={value} className={period === value ? 'period-active' : ''} onClick={() => setPeriod(value as EconomyPeriod)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {insights.length ? (
        <div className="insights-strip">
          {insights.map((insight) => (
            <span key={insight}><Lightbulb size={16} />{insight}</span>
          ))}
        </div>
      ) : null}

      {isLoading ? <div className="shimmer skeleton-chart" /> : null}

      <Card className="economy-section">
        <div className="panel-heading"><div><h2>Best Performing Products</h2><p>Ranked by revenue</p></div></div>
        <div className="economy-split">
          <div className="ranked-list">
            {visibleProducts.length ? visibleProducts.map((product, index) => (
              <button key={product.id} className="ranked-row" type="button" onClick={() => navigate(`/products/${product.id}`)}>
                <span className="rank-number">#{index + 1}</span>
                <div>
                  <strong>{product.name}</strong><Badge>{product.category}</Badge>
                  <p>{product.units_sold} units · {money(product.revenue)} · <span className="stat-sub-ok">{money(product.profit)}</span></p>
                  <div className="progress-bar"><span style={{ width: `${(product.revenue / maxRevenue) * 100}%`, opacity: Math.max(1 - index * 0.06, 0.2) }} /></div>
                </div>
              </button>
            )) : <div className="dashboard-empty compact">No product sales yet</div>}
            {topProducts.length > 10 ? <Button variant="ghost" onClick={() => setShowAllProducts((v) => !v)}>{showAllProducts ? 'Show less' : 'Show more'}</Button> : null}
          </div>
          <div className="economy-chart">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={topProducts.slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--text-muted)' }} />
                <Tooltip />
                <Bar dataKey="revenue" onClick={(data) => navigate(`/products/${data.id}`)}>
                  {topProducts.slice(0, 10).map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card className="economy-section">
        <div className="panel-heading"><div><h2>Your Best Customers</h2><p>Buyers ranked by total spending</p></div></div>
        {topBuyers.length ? <div className="buyer-list">{topBuyers.map((buyer, index) => <div key={buyer.id} className={`buyer-row buyer-rank-${index + 1}`} title={index < 3 ? 'Consider offering a discount' : ''}><span>#{index + 1}</span><strong>{buyer.name}</strong><b>{money(buyer.total_spent)}</b><small>x{buyer.total_purchases} orders · Avg {money(buyer.avg_order_value || 0)} · {relative(buyer.last_purchase)}</small></div>)}</div> : <div className="products-empty"><h2>No named buyers yet</h2><p>Capture buyer names when scanning to track your best customers</p><Link className="button button-primary button-md" to="/scan">Go to Scanner</Link></div>}
      </Card>

      <Card className="economy-section">
        <div className="panel-heading"><div><h2>Performance by Category</h2></div></div>
        <div className="category-performance-grid">{categories.map((cat) => { const Icon = categoryIcons[cat.category] ?? Package; return <Card key={cat.category} className="category-performance-card"><Icon size={32} /><h3>{cat.category}</h3><p>Products: {cat.product_count}</p><p>Units sold: {cat.units_sold}</p><p>Revenue: {money(cat.revenue)}</p><Badge variant={marginTone(cat.avg_margin)}>{cat.avg_margin.toFixed(0)} avg margin</Badge><div className="progress-bar"><span style={{ width: `${(cat.revenue / maxCategoryRevenue) * 100}%` }} /></div></Card>; })}</div>
        {categories.length ? <ResponsiveContainer width="100%" height={260}><PieChart><Tooltip /><Pie data={categories} dataKey="revenue" nameKey="category" innerRadius={60} outerRadius={95}>{categories.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie></PieChart></ResponsiveContainer> : null}
      </Card>

      <Card className="economy-section slow-section">
        <div className="panel-heading"><div><h2>Slow Moving Stock</h2><p>Items with stock that have not sold in 30+ days</p></div></div>
        {slowMovers.length ? <><p className="slow-capital">You have {money(slowCapital)} tied up in slow stock</p>{slowMovers.map((item) => <div className="slow-row" key={item.id}><div><strong>{item.name}</strong><Badge>{item.category}</Badge><p>Last sold: {relative(item.last_sale)}</p></div><span>{item.current_stock} in stock</span><b>{money(item.tied_capital)}</b><Button variant="ghost" onClick={() => navigate(`/products/${item.id}`)}>View Product</Button><Button variant="secondary" disabled>Adjust Price</Button></div>)}</> : <div className="dashboard-empty compact"><CheckCircle2 size={28} />All your products are selling well!</div>}
      </Card>

      <div className="detail-info-grid">
        <Card><p className="eyebrow">Best Margin Product</p><h2>{bestMargin?.name ?? '-'}</h2><Badge variant="ok">{(bestMargin?.margin_percent ?? 0).toFixed(1)}%</Badge><p>{money(bestMargin?.profit_per_unit ?? 0)} profit per unit</p></Card>
        <Card><p className="eyebrow">Worst Margin Product</p><h2>{worstMargin?.name ?? '-'}</h2><Badge variant="danger">{(worstMargin?.margin_percent ?? 0).toFixed(1)}%</Badge><p>Consider repricing</p></Card>
        <Card><p className="eyebrow">Overall Profit Margin</p><h2>{overallMargin.toFixed(1)}%</h2><p><TrendingUp size={16} /> Trend vs previous month coming soon</p></Card>
      </div>
    </div>
  );
};
