import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import QRCode from 'qrcode';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProductPreviewCard } from '@/components/products/ProductCard';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { categoryIcons, margin } from '@/utils/productUtils';
import type { AttributeDef } from '@/types';

interface TemplateRow {
  name: string;
  icon: string;
  attributes: string;
}

interface VariantDraft {
  attributes: Record<string, string>;
  initialQuantity: number;
}

const units = ['piece', 'kg', 'g', 'liter', 'ml', 'box', 'pack', 'meter'];

const labelFor = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const cartesian = (groups: Array<{ key: string; values: string[] }>): Array<Record<string, string>> => {
  if (!groups.length) return [{}];
  return groups.reduce<Array<Record<string, string>>>(
    (acc, group) => acc.flatMap((item) => group.values.map((value) => ({ ...item, [group.key]: value }))),
    [{}],
  );
};

export const CreateProductModal = ({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) => {
  const { user } = useAuth();
  const { notify } = useToast();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(user?.businessType ?? 'other');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [unit, setUnit] = useState('piece');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [attributeValues, setAttributeValues] = useState<Record<string, string[]>>({});
  const [singleValues, setSingleValues] = useState<Record<string, string>>({});
  const [initialStock, setInitialStock] = useState<Record<string, number>>({});
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [previewQr, setPreviewQr] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    window.api.db.categoryTemplates.getAll().then((rows: TemplateRow[]) => {
      setTemplates(rows);
      const wanted = user?.businessType ?? 'other';
      setCategory(rows.some((row) => row.name === wanted) ? wanted : 'other');
    });
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL('PREVIEW-001', { width: 160, margin: 1, color: { dark: '#ffffff', light: '#00000000' } }).then(setPreviewQr);
  }, [open]);

  const selectedTemplate = templates.find((template) => template.name === category);
  const attributes = useMemo<AttributeDef[]>(() => {
    if (!selectedTemplate) return [];
    try {
      return JSON.parse(selectedTemplate.attributes) as AttributeDef[];
    } catch {
      return [];
    }
  }, [selectedTemplate]);

  const variants = useMemo<VariantDraft[]>(() => {
    const multiGroups = attributes
      .filter((attribute) => attribute.type === 'multi')
      .map((attribute) => ({ key: attribute.key, values: attributeValues[attribute.key] ?? [] }))
      .filter((group) => group.values.length > 0);
    const base = cartesian(multiGroups).map((item) => ({ ...singleValues, ...item }));
    return base.map((attrs) => ({
      attributes: attrs,
      initialQuantity: initialStock[JSON.stringify(attrs)] ?? 0,
    }));
  }, [attributeValues, attributes, initialStock, singleValues]);

  const addTag = (key: string, value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setAttributeValues((current) => ({
      ...current,
      [key]: Array.from(new Set([...(current[key] ?? []), clean])),
    }));
    setTagDrafts((current) => ({ ...current, [key]: '' }));
  };

  const removeTag = (key: string, value: string) => {
    setAttributeValues((current) => ({ ...current, [key]: (current[key] ?? []).filter((item) => item !== value) }));
  };

  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>, key: string) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(key, tagDrafts[key] ?? '');
    }
  };

  const reset = () => {
    setStep(0);
    setName('');
    setDescription('');
    setCostPrice(0);
    setSellPrice(0);
    setUnit('piece');
    setLowStockThreshold(5);
    setAttributeValues({});
    setSingleValues({});
    setInitialStock({});
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      setError('Product name must be at least 2 characters.');
      setStep(0);
      return;
    }
    setIsSaving(true);
    try {
      await window.api.db.products.create({
        userId: user.id,
        name: name.trim(),
        category,
        description,
        costPrice,
        sellPrice,
        unit,
        lowStockThreshold,
        variants,
      });
      notify({ title: 'Product created', message: `Created with ${variants.length} variants.`, variant: 'success' });
      onCreated();
      close();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={open} title="New Product" onClose={close}>
      <div className="create-product-modal">
        <div className="create-form">
          <div className="modal-steps">
            {['Basic Info', 'Variants', 'Review'].map((label, index) => (
              <button key={label} type="button" className={step === index ? 'step-active' : ''} onClick={() => setStep(index)}>
                {label}
              </button>
            ))}
          </div>

          {step === 0 ? (
            <div className="form-stack">
              <Input label="Product Name" placeholder="e.g. White T-Shirt, iPhone Case..." value={name} onChange={(event) => setName(event.target.value)} error={error} />
              <div className="category-selector">
                <span>Category</span>
                <div className="business-grid">
                  {templates.map((template) => {
                    const Icon = categoryIcons[template.name] ?? categoryIcons.other;
                    return (
                      <button
                        key={template.name}
                        type="button"
                        className={`business-card ${category === template.name ? 'business-card-selected' : ''}`}
                        onClick={() => {
                          setCategory(template.name);
                          setAttributeValues({});
                          setSingleValues({});
                        }}
                      >
                        <Icon size={28} />
                        <span>{template.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="input-field">
                <span>Description</span>
                <textarea className="textarea-control" rows={3} placeholder="Optional description..." value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>
              <div className="form-grid-two">
                <Input label="What you paid for it" type="number" min={0} value={costPrice} onChange={(event) => setCostPrice(Number(event.target.value))} />
                <Input label="What you charge customers" type="number" min={0} value={sellPrice} onChange={(event) => setSellPrice(Number(event.target.value))} />
              </div>
              <p className={margin(costPrice, sellPrice) >= 0 ? 'margin-ok' : 'margin-danger'}>{margin(costPrice, sellPrice).toFixed(1)}% profit margin</p>
              <div className="form-grid-two">
                <label className="input-field">
                  <span>Unit</span>
                  <select className="input-control" value={unit} onChange={(event) => setUnit(event.target.value)}>
                    {units.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <Input label="Alert me when stock falls below this number" type="number" min={0} value={lowStockThreshold} onChange={(event) => setLowStockThreshold(Number(event.target.value))} />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="form-stack">
              <div>
                <h3>Configure Variants</h3>
                <p className="muted-text">Based on your category: {category}</p>
              </div>
              {attributes.length === 0 ? <Badge>1 default variant</Badge> : null}
              {attributes.map((attribute) =>
                attribute.type === 'multi' ? (
                  <div className="variant-field" key={attribute.key}>
                    <label>{attribute.label ?? labelFor(attribute.key)}</label>
                    <input
                      className="input-control"
                      value={tagDrafts[attribute.key] ?? ''}
                      placeholder="Type and press Enter"
                      onChange={(event) => setTagDrafts((current) => ({ ...current, [attribute.key]: event.target.value }))}
                      onKeyDown={(event) => onTagKeyDown(event, attribute.key)}
                    />
                    <div className="chip-row">
                      {(attribute.options ?? []).map((option) => (
                        <button key={option} type="button" className="suggestion-chip" onClick={() => addTag(attribute.key, option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="chip-row">
                      {(attributeValues[attribute.key] ?? []).map((value) => (
                        <span className="variant-chip" key={value}>
                          {value}
                          <button type="button" onClick={() => removeTag(attribute.key, value)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Input
                    key={attribute.key}
                    label={attribute.label ?? labelFor(attribute.key)}
                    type={attribute.type === 'date' ? 'date' : attribute.type === 'number' ? 'number' : 'text'}
                    value={singleValues[attribute.key] ?? ''}
                    onChange={(event) => setSingleValues((current) => ({ ...current, [attribute.key]: event.target.value }))}
                  />
                ),
              )}
              <strong>This will generate {variants.length} variants</strong>
              <div className="matrix-grid">
                {variants.map((variant) => (
                  <Badge key={JSON.stringify(variant.attributes)}>{Object.values(variant.attributes).filter(Boolean).join(' / ') || 'Default'}</Badge>
                ))}
              </div>
              <div className="variant-stock-table">
                {variants.map((variant) => {
                  const key = JSON.stringify(variant.attributes);
                  return (
                    <label key={key}>
                      <span>{Object.values(variant.attributes).filter(Boolean).join(' / ') || 'Default'}</span>
                      <input className="input-control" type="number" min={0} value={initialStock[key] ?? 0} onChange={(event) => setInitialStock((current) => ({ ...current, [key]: Number(event.target.value) }))} />
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="form-stack">
              <h3>Review</h3>
              <p className="muted-text">
                {name || 'Product'} - {category}
              </p>
              <div className="matrix-grid">
                {variants.map((variant) => (
                  <Badge key={JSON.stringify(variant.attributes)}>{Object.values(variant.attributes).filter(Boolean).join(' / ') || 'Default'}</Badge>
                ))}
              </div>
              <p>Total initial stock: {variants.reduce((sum, variant) => sum + variant.initialQuantity, 0)}</p>
              <Button type="button" loading={isSaving} onClick={submit}>
                Create Product
              </Button>
            </div>
          ) : null}

          <div className="modal-nav">
            <Button variant="ghost" type="button" onClick={() => (step === 0 ? close() : setStep((current) => current - 1))}>
              Back
            </Button>
            {step < 2 ? (
              <Button type="button" onClick={() => setStep((current) => current + 1)}>
                Next
              </Button>
            ) : null}
          </div>
        </div>

        <aside className="create-preview">
          <ProductPreviewCard name={name} description={description} category={category} costPrice={costPrice} sellPrice={sellPrice} />
          {previewQr ? <img className="qr-preview" src={previewQr} alt="Preview QR" /> : null}
          <code>PREVIEW-001</code>
        </aside>
      </div>
    </Modal>
  );
};
