import { memo } from 'react';
import { PackageMinus, PackagePlus, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { money, stockStatus, variantLabel } from '@/utils/productUtils';
import type { StockRow as StockRowType } from '@/hooks/useStock';

interface StockRowProps {
  row: StockRowType;
  highlightId: string | null;
  editVariantId: number | null;
  qty: number;
  note: string;
  error: string;
  isAdjusting: boolean;
  rowRef: (node: HTMLTableRowElement | null) => void;
  onQtyChange: (qty: number) => void;
  onNoteChange: (note: string) => void;
  onStartEdit: (row: StockRowType, direction: 1 | -1) => void;
  onCancelEdit: () => void;
  onConfirmAdjust: () => void;
  onShowQr: (row: StockRowType) => void;
  onShowHistory: (row: StockRowType) => void;
  relative: (value: string) => string;
}

export const StockRow = memo(({
  row,
  highlightId,
  editVariantId,
  qty,
  note,
  error,
  isAdjusting,
  rowRef,
  onQtyChange,
  onNoteChange,
  onStartEdit,
  onCancelEdit,
  onConfirmAdjust,
  onShowQr,
  onShowHistory,
  relative,
}: StockRowProps) => {
  const statusInfo = stockStatus(row.quantity, row.lowStockThreshold);

  return (
    <tr ref={rowRef} className={String(row.variantId) === highlightId ? 'row-highlight' : ''}>
      <td>
        <strong>{row.productName}</strong>
        <Badge>{row.category}</Badge>
      </td>
      <td>{variantLabel(row.attributes)}</td>
      <td>
        <button className="sku-copy" type="button" onClick={() => navigator.clipboard.writeText(row.sku)}>
          {row.sku}
        </button>
      </td>
      <td>
        {editVariantId === row.variantId ? (
          <div className="stock-inline-form">
            <div>
              <button type="button" onClick={() => onQtyChange(Math.max(1, qty - 1))}>-</button>
              <input value={qty} type="number" min={1} onChange={(event) => onQtyChange(Number(event.target.value))} />
              <button type="button" onClick={() => onQtyChange(qty + 1)}>+</button>
            </div>
            <input placeholder="Optional note (reason, batch...)" value={note} onChange={(event) => onNoteChange(event.target.value)} />
            <span>{error}</span>
            <Button size="sm" type="button" loading={isAdjusting} onClick={onConfirmAdjust}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className={`stock-number stock-${statusInfo.variant}`}>
            <strong>{row.quantity}</strong>
            {statusInfo.variant !== 'ok' ? (
              <Badge variant={statusInfo.variant}>{statusInfo.label === 'Out of Stock' ? 'Out' : 'Low'}</Badge>
            ) : null}
          </div>
        )}
      </td>
      <td>{money(row.quantity * row.costPrice)}</td>
      <td>
        <button className="last-updated" type="button" onClick={() => onShowHistory(row)}>
          {relative(row.lastUpdated)}
        </button>
      </td>
      <td>
        <div className="row-actions">
          <Button variant="ghost" size="sm" type="button" onClick={() => onStartEdit(row, 1)}>
            <PackagePlus size={15} />
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => onStartEdit(row, -1)}>
            <PackageMinus size={15} />
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => onShowQr(row)}>
            <QrCode size={15} />
          </Button>
        </div>
      </td>
    </tr>
  );
});

StockRow.displayName = 'StockRow';
