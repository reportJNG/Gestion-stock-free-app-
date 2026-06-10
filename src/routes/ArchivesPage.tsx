import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, BoxArchive, Download, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/format';
import { useSettings } from '@/hooks/useSettings';
import { money, parseAttributes, variantLabel } from '@/utils/productUtils';

interface ArchiveRow {
  id: number;
  product_id: number;
  product_snapshot: string;
  reason: string;
  archived_at: string;
  deleted_by_name: string;
}

interface Snapshot {
  id: number;
  user_id?: number;
  userId?: number;
  name: string;
  category: string;
  description: string;
  cost_price: number;
  sell_price: number;
  unit: string;
  variants?: Array<{ sku: string; attributes: string; quantity?: number }>;
}

const perPage = 20;
const relative = (value: string) => {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};

const parseSnapshot = (row: ArchiveRow): Snapshot => JSON.parse(row.product_snapshot) as Snapshot;

export const ArchivesPage = () => {
  const { user } = useAuth();
  const { notify } = useToast();
  const { currency } = useSettings();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [details, setDetails] = useState<ArchiveRow | null>(null);
  const [restoreRow, setRestoreRow] = useState<ArchiveRow | null>(null);

  const fetchArchives = useCallback(async () => {
    if (!user) return;
    const offset = (page - 1) * perPage;
    const fromDate = from ? `${from} 00:00:00` : undefined;
    const toDate = to ? `${to} 23:59:59` : undefined;
    const [archiveRows, count] = await Promise.all([
      window.api.db.archives.getAll(user.id, perPage, offset, query, fromDate, toDate) as Promise<ArchiveRow[]>,
      window.api.db.archives.count(user.id, query, fromDate, toDate) as Promise<{ total: number }>,
    ]);
    setRows(archiveRows);
    setTotal(count?.total ?? 0);
  }, [from, page, query, to, user]);

  useEffect(() => {
    void fetchArchives();
  }, [fetchArchives]);

  const stats = useMemo(() => {
    const snapshots = rows.map(parseSnapshot);
    const thisMonth = rows.filter((row) => {
      const date = new Date(row.archived_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const capital = snapshots.reduce((sum, snap) => {
      const stock = snap.variants?.reduce((variantSum, variant) => variantSum + Number(variant.quantity ?? 0), 0) ?? 0;
      return sum + stock * Number(snap.cost_price ?? 0);
    }, 0);
    return { thisMonth, capital };
  }, [rows]);

  const exportCsv = async () => {
    const csv = [
      ['Name', 'Category', 'Archived At', 'Reason', 'Deleted By'].join(','),
      ...rows.map((row) => {
        const snapshot = parseSnapshot(row);
        return [snapshot.name, snapshot.category, row.archived_at, row.reason, row.deleted_by_name].map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',');
      }),
    ].join('\n');
    await window.api.file.saveCsv(`stockflow-archives-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const restore = async () => {
    if (!restoreRow) return;
    const snapshot = parseSnapshot(restoreRow);
    const restored = await window.api.db.archives.restore(restoreRow.id) as { id?: number } | undefined;
    notify({ title: `${snapshot.name} restored`, message: 'Remember to restock it.', variant: 'success' });
    setRestoreRow(null);
    if (restored?.id) navigate(`/products/${restored.id}`);
    else await fetchArchives();
  };

  return (
    <div className="archives-page">
      <div className="products-header">
        <div><h1>Archives</h1><p>{total} archived products</p></div>
        <Button variant="ghost" onClick={exportCsv}><Download size={16} />Export Archives</Button>
      </div>

      <div className="archives-filters">
        <Input placeholder="Search archived products..." value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} />
        <Input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
        <Input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
      </div>

      <div className="archive-stats">
        <span>Total archived: {total}</span>
        <span>This month: {stats.thisMonth}</span>
        <span>Capital lost: {formatCurrency(stats.capital, currency)}</span>
      </div>

      {rows.length ? rows.map((row) => {
        const snap = parseSnapshot(row);
        return (
          <Card key={row.id} className="archive-row">
            <Archive size={28} />
            <div className="archive-row-main">
              <h2>{snap.name}</h2>
              <div className="chip-row"><Badge>{snap.category}</Badge><Badge>Archived</Badge></div>
              <p>Archived {relative(row.archived_at)} by {row.deleted_by_name}</p>
              {row.reason ? <em>Reason: {row.reason}</em> : null}
            </div>
            <div className="archive-actions">
              <Button variant="ghost" size="sm" onClick={() => setDetails(row)}>View Details</Button>
              <Button variant="secondary" size="sm" onClick={() => setRestoreRow(row)}><RotateCcw size={14} />Restore</Button>
            </div>
          </Card>
        );
      }) : (
        <Card className="products-empty"><BoxArchive size={48} /><h2>No archived products</h2><p>Products you remove will appear here</p></Card>
      )}

      <div className="pagination-row">
        <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
        <span>Page {page}</span>
        <Button variant="ghost" disabled={page * perPage >= total} onClick={() => setPage(page + 1)}>Next</Button>
      </div>

      <Modal open={Boolean(details)} title={details ? `Archived Product - ${parseSnapshot(details).name}` : 'Archived Product'} onClose={() => setDetails(null)}>
        {details ? (() => {
          const snap = parseSnapshot(details);
          const totalStock = snap.variants?.reduce((sum, variant) => sum + Number(variant.quantity ?? 0), 0) ?? 0;
          return <div className="archive-details"><p>Removed {new Date(details.archived_at).toLocaleString()} · {details.reason || 'No reason given'}</p><table className="comparison-table"><tbody><tr><th>Name</th><td>{snap.name}</td></tr><tr><th>Category</th><td>{snap.category}</td></tr><tr><th>Cost</th><td>{money(snap.cost_price)}</td></tr><tr><th>Sell Price</th><td>{money(snap.sell_price)}</td></tr><tr><th>Unit</th><td>{snap.unit}</td></tr><tr><th>Description</th><td>{snap.description}</td></tr></tbody></table><h3>Variants at time of archiving</h3><table className="sales-table"><thead><tr><th>SKU</th><th>Attributes</th><th>Stock at removal</th></tr></thead><tbody>{snap.variants?.map((variant) => <tr key={variant.sku}><td>{variant.sku}</td><td>{variantLabel(parseAttributes(variant.attributes))}</td><td>{variant.quantity ?? 0}</td></tr>)}</tbody></table><p>Total stock: {totalStock}</p><p>Capital value at removal: {formatCurrency(totalStock * snap.cost_price, currency)}</p></div>;
        })() : null}
      </Modal>

      <Modal open={Boolean(restoreRow)} title={restoreRow ? `Restore ${parseSnapshot(restoreRow).name}?` : 'Restore product?'} onClose={() => setRestoreRow(null)}>
        {restoreRow ? (() => {
          const snap = parseSnapshot(restoreRow);
          return <div className="form-stack"><p>This will bring {snap.name} back to your active products.</p><p>It will appear with {snap.variants?.length ?? 1} variants and 0 stock. You'll need to restock it manually.</p><div className="info-note">Stock quantities are not restored. Only product configuration and variant definitions will be recreated.</div><div className="auth-actions"><Button variant="ghost" onClick={() => setRestoreRow(null)}>Cancel</Button><Button onClick={restore}><RotateCcw size={16} />Restore Product</Button></div></div>;
        })() : null}
      </Modal>
    </div>
  );
};
