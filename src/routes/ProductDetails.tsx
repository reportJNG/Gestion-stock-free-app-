import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Minus, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useProduct } from '@/hooks/useProduct';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { printLabel } from '@/utils/printLabel';
import { attributeText, categoryIcons, margin, money, parseAttributes, stockStatus, variantLabel, type ProductRow, type VariantRow } from '@/utils/productUtils';

const fmtDate = (value?: string) => (value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)) : '-');

const EditProductModal = ({ product, open, onClose, onSaved }: { product: ProductRow; open: boolean; onClose: () => void; onSaved: () => void }) => {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [costPrice, setCostPrice] = useState(product.cost_price);
  const [sellPrice, setSellPrice] = useState(product.sell_price);
  const [unit, setUnit] = useState(product.unit);
  const [lowStockThreshold, setLowStockThreshold] = useState(product.low_stock_threshold);

  const save = async () => {
    await window.api.db.products.update(product.id, {
      name,
      description,
      costPrice,
      sellPrice,
      unit,
      lowStockThreshold,
    });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} title="Edit Product" onClose={onClose}>
      <div className="form-stack">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <label className="input-field">
          <span>Description</span>
          <textarea className="textarea-control" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="form-grid-two">
          <Input label="Cost Price" type="number" value={costPrice} onChange={(event) => setCostPrice(Number(event.target.value))} />
          <Input label="Sell Price" type="number" value={sellPrice} onChange={(event) => setSellPrice(Number(event.target.value))} />
        </div>
        <div className="form-grid-two">
          <Input label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)} />
          <Input label="Low Stock Threshold" type="number" value={lowStockThreshold} onChange={(event) => setLowStockThreshold(Number(event.target.value))} />
        </div>
        <Button type="button" onClick={save}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
};

export const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const productId = Number(id);
  const { product, variants, isLoading, refetch } = useProduct(Number.isFinite(productId) ? productId : null);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [qrVariant, setQrVariant] = useState<VariantRow | null>(null);
  const [stockEdit, setStockEdit] = useState<{ variantId: number; direction: 1 | -1 } | null>(null);
  const [stockQty, setStockQty] = useState(1);
  const [stockNote, setStockNote] = useState('');

  const totalStock = useMemo(() => variants.reduce((sum, variant) => sum + Number(variant.quantity ?? 0), 0), [variants]);

  if (isLoading) {
    return <div className="shimmer skeleton-chart" />;
  }

  if (!product) {
    return (
      <Card>
        <h2>Product not found</h2>
        <Link className="panel-link" to="/products">
          Back to products
        </Link>
      </Card>
    );
  }

  const Icon = categoryIcons[product.category] ?? categoryIcons.other;
  const status = stockStatus(totalStock, product.low_stock_threshold);

  const applyStock = async () => {
    if (!stockEdit || !user) return;
    const variant = variants.find((item) => item.id === stockEdit.variantId);
    if (!variant) return;
    const before = Number(variant.quantity ?? 0);
    const delta = stockQty * stockEdit.direction;
    const after = before + delta;
    if (after < 0) {
      notify({ title: 'Stock cannot go below zero', variant: 'error' });
      return;
    }
    if (delta > 0) {
      await window.api.db.variants.addQty(variant.id, user.id, delta, stockNote);
    } else {
      await window.api.db.run('UPDATE stock SET quantity = ?, updated_at = datetime(\'now\') WHERE variant_id = ?', [after, variant.id]);
      await window.api.db.run(
        `
          INSERT INTO stock_movements (variant_id, user_id, type, quantity_delta, quantity_before, quantity_after, note)
          VALUES (?, ?, 'adjustment', ?, ?, ?, ?)
        `,
        [variant.id, user.id, delta, before, after, stockNote],
      );
    }
    setStockEdit(null);
    setStockQty(1);
    setStockNote('');
    await refetch();
  };

  const archive = async () => {
    if (!user) return;
    await window.api.db.products.delete(product.id, user.id, archiveReason);
    notify({ title: 'Product archived', variant: 'success' });
    navigate('/products');
  };

  const handlePrintLabel = async (variant: VariantRow) => {
    try {
      await printLabel(
        {
          sku: variant.sku,
          attributes: parseAttributes(variant.attributes),
          qrCodeData: variant.qr_code_data,
        },
        { name: product.name },
      );
      notify({ title: 'Print dialog opened', variant: 'success' });
    } catch {
      notify({ title: 'Print failed', message: 'Could not open the print dialog.', variant: 'error' });
    }
  };

  return (
    <div className="product-detail-page">
      <div className="product-detail-header">
        <div>
          <div className="breadcrumb">
            <Link to="/products">Products</Link>
            <span>/</span>
            <span>{product.name}</span>
          </div>
          <div className="detail-title-row">
            <Icon size={32} />
            <Badge>{product.category}</Badge>
          </div>
          <h1>{product.name}</h1>
          <p>{product.description || 'No description'}</p>
          <small>Created {fmtDate(product.created_at)}</small>
        </div>
        <div className="detail-actions">
          <Button variant="secondary" type="button" onClick={() => setEditOpen(true)}>
            <Pencil size={16} />
            Edit
          </Button>
          <Button variant="danger" type="button" onClick={() => setArchiveOpen(true)}>
            <Trash2 size={16} />
            Archive
          </Button>
          {variants[0] ? (
            <Button variant="ghost" type="button" onClick={() => void handlePrintLabel(variants[0])}>
              <Printer size={16} />
              Print Label
            </Button>
          ) : null}
        </div>
      </div>

      <div className="detail-info-grid">
        <Card>
          <p className="eyebrow">Pricing</p>
          <h2>{money(product.sell_price)}</h2>
          <p>Cost {money(product.cost_price)}</p>
          <Badge variant={margin(product.cost_price, product.sell_price) >= 0 ? 'ok' : 'danger'}>{margin(product.cost_price, product.sell_price).toFixed(1)}% margin</Badge>
        </Card>
        <Card>
          <p className="eyebrow">Stock Summary</p>
          <h2>{totalStock}</h2>
          <p>Low threshold {product.low_stock_threshold}</p>
          <Badge variant={status.variant}>{status.label}</Badge>
        </Card>
        <Card>
          <p className="eyebrow">Details</p>
          <h2>#{product.id}</h2>
          <p>{product.category} / {product.unit}</p>
          <small>{fmtDate(product.created_at)}</small>
        </Card>
      </div>

      <Card className="variants-card">
        <div className="panel-heading">
          <h2>Variants & Stock</h2>
          <Button variant="ghost" size="sm" type="button" disabled>
            <Plus size={14} />
            Add new variant
          </Button>
        </div>
        <div className="table-scroll">
          <table className="sales-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Attributes</th>
                <th>Current Stock</th>
                <th>Last Updated</th>
                <th>QR Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => {
                const attrs = parseAttributes(variant.attributes);
                const variantStatus = stockStatus(variant.quantity, product.low_stock_threshold);
                return (
                  <tr key={variant.id}>
                    <td className="mono-cell">{variant.sku}</td>
                    <td>{attributeText(attrs)}</td>
                    <td><Badge variant={variantStatus.variant}>{variant.quantity}</Badge></td>
                    <td>{fmtDate(variant.updated_at ?? variant.created_at)}</td>
                    <td>
                      {variant.qr_code_data ? <button className="qr-thumb" type="button" onClick={() => setQrVariant(variant)}><img src={variant.qr_code_data} alt={variant.sku} /></button> : '-'}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button variant="ghost" size="sm" type="button" onClick={() => setStockEdit({ variantId: variant.id, direction: 1 })}><Plus size={14} /></Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => setStockEdit({ variantId: variant.id, direction: -1 })}><Minus size={14} /></Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => void handlePrintLabel(variant)}><Printer size={14} /></Button>
                      </div>
                      {stockEdit?.variantId === variant.id ? (
                        <div className="inline-stock-edit">
                          <Input type="number" min={1} value={stockQty} onChange={(event) => setStockQty(Number(event.target.value))} />
                          <Input placeholder="Note" value={stockNote} onChange={(event) => setStockNote(event.target.value)} />
                          <Button size="sm" type="button" onClick={applyStock}>Save</Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <EditProductModal product={product} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => void refetch()} />
      <Modal open={archiveOpen} title="Archive this product?" onClose={() => setArchiveOpen(false)}>
        <div className="form-stack">
          <p>This will remove {product.name} and all its variants from active products. All data is saved in Archives.</p>
          <Input label="Reason for archiving" value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} />
          <div className="auth-actions">
            <Button variant="ghost" type="button" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button variant="danger" type="button" onClick={archive}>Archive Product</Button>
          </div>
        </div>
      </Modal>
      <Modal open={Boolean(qrVariant)} title="QR Code" onClose={() => setQrVariant(null)}>
        {qrVariant ? (
          <div className="qr-modal-content">
            <img src={qrVariant.qr_code_data} alt={qrVariant.sku} />
            <code>{qrVariant.sku}</code>
            <div className="button-row">
              <Button variant="secondary" type="button" onClick={() => void handlePrintLabel(qrVariant)}>Print Label</Button>
              <Button variant="ghost" type="button" onClick={() => navigator.clipboard.writeText(qrVariant.sku)}>Copy SKU</Button>
              <a className="button button-ghost button-md" href={qrVariant.qr_code_data} download={`${qrVariant.sku}.png`}>Download QR</a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
