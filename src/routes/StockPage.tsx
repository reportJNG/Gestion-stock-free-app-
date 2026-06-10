import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Download, PackageMinus, PackagePlus, QrCode, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useStock, type StockRow, type StockSort, type StockStatusFilter } from '@/hooks/useStock';
import { useStockAdjust } from '@/hooks/useStockAdjust';
import { money, stockStatus, variantLabel } from '@/utils/productUtils';

interface MovementRow {
  id: number;
  type: 'sale' | 'restock' | 'adjustment' | 'loss' | 'return';
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  buyer_name: string | null;
  note: string;
  created_at: string;
}

const relative = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const StockPage = () => {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight') ?? searchParams.get('variant');
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StockStatusFilter>((searchParams.get('filter') === 'low' ? 'low' : 'all') as StockStatusFilter);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<StockSort>('name');
  const [edit, setEdit] = useState<{ row: StockRow; direction: 1 | -1 } | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [qrRow, setQrRow] = useState<StockRow | null>(null);
  const [historyRow, setHistoryRow] = useState<StockRow | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkQty, setBulkQty] = useState<Record<number, number>>({});
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const { rows, allFilteredRows, isLoading, refetch, totals, page, setPage, hasMore, categories } = useStock(search, status, category, sort);
  const { adjust, isLoading: isAdjusting, error } = useStockAdjust();

  useEffect(() => {
    if (!highlightId) return;
    const node = rowRefs.current[highlightId];
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const id = window.setTimeout(() => node?.classList.remove('row-highlight'), 3000);
    return () => window.clearTimeout(id);
  }, [highlightId, rows]);

  useEffect(() => {
    if (!historyRow) return;
    window.api.db.stock.getMovements(historyRow.variantId).then((data: MovementRow[]) => setMovements(data));
  }, [historyRow]);

  const confirmAdjust = async () => {
    if (!edit) return;
    const ok = await adjust(edit.row, qty * edit.direction, note);
    if (ok) {
      notify({ title: 'Stock updated', variant: 'success' });
      setEdit(null);
      setQty(1);
      setNote('');
      await refetch();
    }
  };

  const exportCsv = async () => {
    const header = ['Product Name', 'Category', 'SKU', 'Variant Attributes', 'Current Stock', 'Cost Price', 'Sell Price', 'Stock Value', 'Last Updated'];
    const body = allFilteredRows.map((row) =>
      [
        row.productName,
        row.category,
        row.sku,
        variantLabel(row.attributes),
        row.quantity,
        row.costPrice,
        row.sellPrice,
        row.quantity * row.costPrice,
        row.lastUpdated,
      ].map(csvEscape).join(','),
    );
    const csv = [header.map(csvEscape).join(','), ...body].join('\n');
    await window.api.file.saveCsv(`stockflow-stock-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const applyBulk = async () => {
    let count = 0;
    for (const row of rows) {
      const next = bulkQty[row.variantId];
      if (next === undefined || next === row.quantity) continue;
      const ok = await adjust(row, next - row.quantity, 'Bulk restock');
      if (ok) count += 1;
    }
    notify({ title: `Updated ${count} items`, variant: 'success' });
    setBulkOpen(false);
    setBulkQty({});
    await refetch();
  };

  return (
    <div className="stock-page">
      <div className="products-header">
        <div>
          <h1>Stock</h1>
          <p>{totals.total} variants tracked across {totals.products} products</p>
        </div>
        <div className="detail-actions">
          <Button variant="ghost" type="button" onClick={exportCsv}><Download size={16} />Export CSV</Button>
          <Button variant="secondary" type="button" onClick={() => setBulkOpen(true)}><PackagePlus size={16} />Bulk Restock</Button>
        </div>
      </div>

      <div className="stock-summary">
        <button type="button" onClick={() => setStatus(status === 'in' ? 'all' : 'in')}>In Stock: {totals.in} items</button>
        <button type="button" onClick={() => setStatus(status === 'low' ? 'all' : 'low')}>Low Stock: {totals.low} items</button>
        <button type="button" onClick={() => setStatus(status === 'out' ? 'all' : 'out')}>Out of Stock: {totals.out} items</button>
      </div>

      <div className="stock-filters">
        <label className="search-field"><input placeholder="Search product name or SKU..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="status-tabs">
          {(['all', 'in', 'low', 'out'] as StockStatusFilter[]).map((item) => (
            <button key={item} className={status === item ? 'tab-active' : ''} type="button" onClick={() => setStatus(item)}>
              {item === 'in' ? 'In Stock' : item === 'low' ? 'Low' : item === 'out' ? 'Out' : 'All'}
            </button>
          ))}
        </div>
        <select className="input-control sort-select" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input-control sort-select" value={sort} onChange={(event) => setSort(event.target.value as StockSort)}>
          <option value="name">Name A-Z</option><option value="high">Stock High-Low</option><option value="low">Stock Low-High</option><option value="updated">Last Updated</option>
        </select>
      </div>

      <div className="stock-table-wrap">
        <table className="stock-table">
          <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th><th>Value</th><th>Last Updated</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7}>Loading stock...</td></tr> : rows.map((row) => {
              const statusInfo = stockStatus(row.quantity, row.lowStockThreshold);
              return (
                <tr key={row.variantId} ref={(node) => { rowRefs.current[String(row.variantId)] = node; }} className={String(row.variantId) === highlightId ? 'row-highlight' : ''}>
                  <td><strong>{row.productName}</strong><Badge>{row.category}</Badge></td>
                  <td>{variantLabel(row.attributes)}</td>
                  <td><button className="sku-copy" type="button" onClick={() => navigator.clipboard.writeText(row.sku)}>{row.sku}</button></td>
                  <td>
                    {edit?.row.variantId === row.variantId ? (
                      <div className="stock-inline-form">
                        <div><button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>-</button><input value={qty} type="number" min={1} onChange={(event) => setQty(Number(event.target.value))} /><button type="button" onClick={() => setQty(qty + 1)}>+</button></div>
                        <input placeholder="Optional note (reason, batch...)" value={note} onChange={(event) => setNote(event.target.value)} />
                        <span>{error}</span>
                        <Button size="sm" type="button" loading={isAdjusting} onClick={confirmAdjust}>Confirm</Button>
                        <Button size="sm" variant="ghost" type="button" onClick={() => setEdit(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className={`stock-number stock-${statusInfo.variant}`}><strong>{row.quantity}</strong>{statusInfo.variant !== 'ok' ? <Badge variant={statusInfo.variant}>{statusInfo.label === 'Out of Stock' ? 'Out' : 'Low'}</Badge> : null}</div>
                    )}
                  </td>
                  <td>{money(row.quantity * row.costPrice)}</td>
                  <td><button className="last-updated" type="button" onClick={() => setHistoryRow(row)}>{relative(row.lastUpdated)}</button></td>
                  <td><div className="row-actions"><Button variant="ghost" size="sm" type="button" onClick={() => setEdit({ row, direction: 1 })}><PackagePlus size={15} /></Button><Button variant="ghost" size="sm" type="button" onClick={() => setEdit({ row, direction: -1 })}><PackageMinus size={15} /></Button><Button variant="ghost" size="sm" type="button" onClick={() => setQrRow(row)}><QrCode size={15} /></Button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore ? <Button variant="secondary" type="button" onClick={() => setPage(page + 1)}>Load more</Button> : null}

      <Modal open={bulkOpen} title="Bulk Restock" onClose={() => setBulkOpen(false)}>
        <div className="form-stack">
          <p className="muted-text">Update multiple items at once</p>
          <div className="bulk-list">{rows.slice(0, 20).map((row) => <label key={row.variantId}><span>{row.productName} - {variantLabel(row.attributes)} ({row.quantity})</span><input className="input-control" type="number" value={bulkQty[row.variantId] ?? row.quantity} onChange={(event) => setBulkQty((current) => ({ ...current, [row.variantId]: Number(event.target.value) }))} /></label>)}</div>
          <Button type="button" onClick={applyBulk}>Apply All</Button>
        </div>
      </Modal>

      <Modal open={Boolean(qrRow)} title="Variant QR" onClose={() => setQrRow(null)}>
        {qrRow ? <div className="qr-modal-content"><img src={qrRow.qrCodeData} alt={qrRow.sku} /><code>{qrRow.sku}</code></div> : null}
      </Modal>

      <aside className={`history-drawer ${historyRow ? 'history-drawer-open' : ''}`}>
        <div className="history-header"><h2>Movement History</h2><button className="icon-button" type="button" onClick={() => setHistoryRow(null)}><X size={18} /></button></div>
        <p>{historyRow ? `${historyRow.productName} ${variantLabel(historyRow.attributes)}` : ''}</p>
        {movements.length ? movements.map((move) => <div className="movement-item" key={move.id}>{move.quantity_delta >= 0 ? <ArrowUp size={16} /> : move.type === 'loss' ? <AlertTriangle size={16} /> : <ArrowDown size={16} />}<div><Badge variant={move.quantity_delta >= 0 ? 'ok' : 'danger'}>{move.type}</Badge><strong className={move.quantity_delta >= 0 ? 'delta-up' : 'delta-down'}>{move.quantity_delta > 0 ? '+' : ''}{move.quantity_delta}</strong><span>{move.quantity_before} → {move.quantity_after}</span><small>{relative(move.created_at)} {move.buyer_name ? `· ${move.buyer_name}` : ''}</small>{move.note ? <small>{move.note}</small> : null}</div></div>) : <div className="dashboard-empty compact">No movements recorded yet</div>}
      </aside>
    </div>
  );
};
