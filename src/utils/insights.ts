import type { EconomyBuyer, EconomyCategory, EconomyTopProduct, SlowMover } from '@/hooks/useEconomy';
import { money } from './productUtils';

const daysSince = (value: string | null) => {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
};

export const buildEconomyInsights = ({
  topProducts,
  topBuyers,
  categories,
  slowMovers,
}: {
  topProducts: EconomyTopProduct[];
  topBuyers: EconomyBuyer[];
  categories: EconomyCategory[];
  slowMovers: SlowMover[];
}) => {
  const insights: string[] = [];
  const totalRevenue = categories.reduce((sum, row) => sum + row.revenue, 0);
  const topCategory = categories[0];
  if (topCategory && totalRevenue > 0) {
    insights.push(`${topCategory.category} is your top revenue driver (${((topCategory.revenue / totalRevenue) * 100).toFixed(0)}% of total)`);
  }
  const topBuyer = topBuyers[0];
  if (topBuyer) {
    insights.push(`${topBuyer.name} is your best customer - ${topBuyer.total_purchases} purchases`);
  }
  const slow = slowMovers[0];
  if (slow) {
    const days = daysSince(slow.last_sale);
    insights.push(`${slow.name} ${days === null ? 'has never sold' : `has not sold in ${days} days`} - ${money(slow.tied_capital)} tied up`);
  }
  const topProduct = topProducts[0];
  if (topProduct) {
    insights.push(`${topProduct.name} leads product revenue with ${money(topProduct.revenue)}`);
  }
  return insights;
};
