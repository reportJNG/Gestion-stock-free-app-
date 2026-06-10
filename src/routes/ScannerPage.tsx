import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Minus, Plus, Scan, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useScanner } from '@/hooks/useScanner';
import { useSaleLookup, type SaleVariant } from '@/hooks/useSaleLookup';
import { useRecordSale } from '@/hooks/useRecordSale';
import { categoryIcons, money, stockStatus, variantLabel } from '@/utils/productUtils';

interface BuyerRow {
  name: string;
}

interface ProductRow {
  id: number;
  name: string;
  category: string;
}

interface VariantRow {
  id: number;
  sku: string;
  attributes: string;
}

const parseAttrs = (value: string) => {
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
};

export const ScannerPage = () => {
  const navigate = useNavigate();
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [skuInput, setSkuInput] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [productMatches, setProductMatches] = useState<ProductRow[]>([]);
  const [productVariants, setProductVariants] = useState<VariantRow[]>([]);
  const [recentScans, setRecentScans] = useState<Array<{ sku: string; productName: string; time: string }>>([]);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyers, setBuyers] = useState<BuyerRow[]>([]);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [allowOversell, setAllowOversell] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [session, setSession] = useState({ sales: 0, revenue: 0 });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { variant, isLoading, error, notFoundSku, lookup, setVariant, reset } = useSaleLookup();
  const { record, isLoading: isRecording, result, reset: resetResult } = useRecordSale();

  const handleScanResult = useCallback(
    async (value: string) => {
      const found = await lookup(value);
      if (found) {
        setRecentScans((current) => [{ sku: found.sku, productName: found.productName, time: new Date().toLocaleTimeString() }, ...current].slice(0, 5));
      }
    },
    [lookup],
  );

  const scanner = useScanner('qr-reader', handleScanResult);

  useEffect(() => {
    if (mode === 'camera') {
      void scanner.startCamera();
    } else {
      void scanner.stopCamera();
      window.setTimeout(() => manualInputRef.current?.focus(), 50);
    }
  }, [mode]);

  useEffect(() => {
    window.api.db.all('SELECT name FROM buyers ORDER BY total_spent DESC LIMIT 50').then((rows: BuyerRow[]) => setBuyers(rows));
  }, []);

  useEffect(() => {
    if (nameSearch.trim().length < 2) {
      setProductMatches([]);
      return;
    }
    window.api.db
      .all('SELECT id, name, category FROM products WHERE name LIKE ? AND is_archived = 0 ORDER BY name LIMIT 8', [`%${nameSearch}%`])
      .then((rows: ProductRow[]) => setProductMatches(rows));
  }, [nameSearch]);

  const loadProductVariants = async (id: number) => {
    const rows = (await window.api.db.variants.getByProduct(id)) as VariantRow[];
    setProductVariants(rows);
  };

  useEffect(() => {
    const id = Number(productId);
    if (!id) {
      setProductVariants([]);
      return;
    }
    void loadProductVariants(id);
  }, [productId]);

  const resolveVariantSku = async (sku: string) => {
    setSkuInput(sku);
    const found = await lookup(sku);
    if (found) setMode('manual');
  };

  const resetPanel = useCallback(() => {
    reset();
    resetResult();
    setQuantity(1);
    setBuyerName('');
    setNote('');
    setAllowOversell(false);
    setCountdown(0);
  }, [reset, resetResult]);

  const confirmSale = useCallback(async () => {
    if (!variant || quantity <= 0) return;
    if (variant.quantity < quantity && !allowOversell) return;
    const sale = await record(variant, quantity, buyerName, note);
    if (sale) {
      setSession((current) => ({ sales: current.sales + 1, revenue: current.revenue + sale.total }));
      setCountdown(4);
    }
  }, [allowOversell, buyerName, note, quantity, record, variant]);

  useEffect(() => {
    if (!result || countdown <= 0) return;
    const id = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(id);
  }, [countdown, result]);

  useEffect(() => {
    if (result && countdown === 0) {
      resetPanel();
    }
  }, [countdown, resetPanel, result]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'F1' || (event.ctrlKey && event.key.toLowerCase() === 's')) {
        event.preventDefault();
        setMode('manual');
        manualInputRef.current?.focus();
      }
      if (event.key === 'Escape') resetPanel();
      if (event.ctrlKey && event.key.toLowerCase() === 'm') setMode('manual');
      if (event.ctrlKey && event.key.toLowerCase() === 'c') setMode('camera');
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [resetPanel]);

  const Icon = variant ? categoryIcons[variant.category] ?? categoryIcons.other : Scan;
  const status = variant ? stockStatus(variant.quantity, variant.lowStockThreshold) : null;
  const buyerSuggestions = useMemo(
    () => buyers.filter((buyer) => buyer.name.toLowerCase().includes(buyerName.toLowerCase()) && buyerName.trim()).slice(0, 5),
    [buyerName, buyers],
  );

  return (
    <div className="scanner-page" onClick={() => countdown && setCountdown(0)}>
      <section className="scanner-left">
        <p className="eyebrow">Scanner</p>
        <div className="mode-tabs">
          <button className={mode === 'camera' ? 'mode-active' : ''} type="button" onClick={() => setMode('camera')}>Camera</button>
          <button className={mode === 'manual' ? 'mode-active' : ''} type="button" onClick={() => setMode('manual')}>Manual</button>
        </div>

        {mode === 'camera' ? (
          <>
            <div className="camera-box">
              <div id="qr-reader" />
              <div className="scan-corners" />
              {scanner.isActive ? <div className="scan-line" /> : null}
            </div>
            <div className="camera-status">
              <span className={scanner.isActive ? 'status-dot ok' : 'status-dot danger'} />
              {scanner.isActive ? 'Camera active' : scanner.error || 'Camera not found'}
              <Button variant="ghost" size="sm" type="button" onClick={() => (scanner.isActive ? void scanner.stopCamera() : void scanner.startCamera())}>
                {scanner.isActive ? 'Stop Camera' : 'Start Camera'}
              </Button>
            </div>
            {scanner.error ? (
              <div className="camera-warning">
                <strong>Camera access denied</strong>
                <span>Please allow camera access in Electron settings or use manual mode</span>
                <Button size="sm" type="button" onClick={() => setMode('manual')}>Switch to Manual</Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="manual-panel">
            <label className="input-field">
              <span>Scan or type SKU</span>
              <input
                ref={manualInputRef}
                className="input-control mono-input"
                placeholder="PID000001V0001"
                value={skuInput}
                onChange={(event) => setSkuInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void resolveVariantSku(skuInput)}
              />
            </label>
            <label className="input-field autocomplete-wrap">
              <span>Search by product name</span>
              <input className="input-control" placeholder="Start typing..." value={nameSearch} onChange={(event) => setNameSearch(event.target.value)} />
              {productMatches.length ? (
                <div className="autocomplete-list">
                  {productMatches.map((product) => (
                    <button key={product.id} type="button" onClick={() => { setNameSearch(product.name); setProductId(String(product.id)); void loadProductVariants(product.id); }}>
                      {product.name}<small>{product.category}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <Input label="Product ID" type="number" value={productId} onChange={(event) => setProductId(event.target.value)} />
            {productVariants.length ? (
              <div className="variant-picker">
                {productVariants.map((item) => (
                  <button key={item.id} type="button" onClick={() => void resolveVariantSku(item.sku)}>
                    {variantLabel(parseAttrs(item.attributes))}
                  </button>
                ))}
              </div>
            ) : null}
            <Button type="button" loading={isLoading} onClick={() => void resolveVariantSku(skuInput)}>
              <Search size={16} /> Lookup
            </Button>
          </div>
        )}

        <div className="recent-scans">
          <h3>Recent</h3>
          {recentScans.map((scan) => (
            <button key={`${scan.sku}-${scan.time}`} type="button" onClick={() => void resolveVariantSku(scan.sku)}>
              <code>{scan.sku}</code><span>{scan.productName}</span><small>{scan.time}</small>
            </button>
          ))}
        </div>

        <button className="shortcuts-toggle" type="button" onClick={() => setShowShortcuts((current) => !current)}>Shortcuts</button>
        {showShortcuts ? <div className="shortcuts-panel">F1/Ctrl+S focus scan · Esc reset · Ctrl+M manual · Ctrl+C camera</div> : null}
        <div className="session-strip">Session: {session.sales} sales | {money(session.revenue)}</div>
      </section>

      <section className="scanner-right">
        {!variant && !error && !result ? (
          <div className="scanner-empty"><Scan size={64} /><h2>Scan or search for an item</h2><p>Point your camera at a QR code or use manual search</p></div>
        ) : null}
        {error && !variant ? (
          <div className="scanner-empty"><AlertCircle size={64} /><h2>Item not found</h2><p>SKU: {notFoundSku} - not in your products</p><Button type="button" onClick={() => setMode('manual')}>Search products manually</Button><Button variant="ghost" type="button" onClick={() => navigate('/products')}>Add this as new product</Button></div>
        ) : null}
        {result ? (
          <div className="success-panel"><CheckCircle2 size={72} /><h2>Sale recorded!</h2><p>{result.quantity}x {result.variant.productName} - {money(result.total)}</p><p>Buyer: {result.buyerName}</p><p>Current stock: {result.newStock}</p>{countdown ? <small>Next scan in {countdown}...</small> : null}<Button type="button" onClick={resetPanel}>Scan Next</Button><Button variant="secondary" type="button" onClick={() => navigate(`/products/${result.variant.productId}`)}>View Product</Button><Button variant="ghost" type="button" onClick={() => { resetResult(); setQuantity(1); }}>New Sale for Same Item</Button></div>
        ) : null}
        {variant && !result ? (
          <div className="sale-panel">
            <div className="item-summary-card">
              <div className="detail-title-row"><Icon size={32} /><Badge>{variant.category}</Badge></div>
              <h2>{variant.productName}</h2>
              <div className="chip-row">{Object.entries(variant.attributes).map(([key, value]) => <Badge key={key}>{key}: {value}</Badge>)}</div>
              <code>{variant.sku}</code>
              <strong className="sale-price">{money(variant.sellPrice)}</strong>
              <div className={`stock-number stock-${status?.variant}`}><strong>{variant.quantity}</strong><span>After this sale: {variant.quantity - quantity}</span></div>
              {variant.quantity <= 0 ? <div className="stock-warning">This item is OUT OF STOCK</div> : null}
              {variant.quantity < quantity ? <label className="oversell-confirm"><input type="checkbox" checked={allowOversell} onChange={(event) => setAllowOversell(event.target.checked)} /> Proceed anyway? Stock will become {variant.quantity - quantity}</label> : null}
            </div>
            <div className="sale-form">
              <label>Quantity to sell</label>
              <div className="qty-stepper"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button><input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /><button type="button" onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button></div>
              <label className="input-field autocomplete-wrap"><span>Buyer name (optional)</span><input className="input-control" placeholder="Customer name or skip..." value={buyerName} onChange={(event) => setBuyerName(event.target.value)} />{buyerSuggestions.length ? <div className="autocomplete-list">{buyerSuggestions.map((buyer) => <button key={buyer.name} type="button" onClick={() => setBuyerName(buyer.name)}>{buyer.name}</button>)}</div> : null}</label>
              <Button variant="ghost" size="sm" type="button" onClick={() => setBuyerName('')}>Skip</Button>
              {showNote ? <Input placeholder="Note" value={note} onChange={(event) => setNote(event.target.value)} /> : <Button variant="ghost" size="sm" type="button" onClick={() => setShowNote(true)}>Add note</Button>}
              <Button size="lg" type="button" loading={isRecording} disabled={variant.quantity < quantity && !allowOversell} onClick={confirmSale}><Check size={18} />Record sale of {quantity}x for {money(quantity * variant.sellPrice)}</Button>
              <Button variant="ghost" type="button" onClick={resetPanel}>Cancel</Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};
