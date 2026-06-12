import { variantLabel } from '@/utils/productUtils';

export interface LabelVariant {
  sku: string;
  attributes: Record<string, string>;
  qrCodeData: string;
}

export interface LabelProduct {
  name: string;
}

export function formatAttributes(attributes: Record<string, string>): string {
  return variantLabel(attributes);
}

export function buildLabelHTML(variant: LabelVariant, product: LabelProduct): string {
  const attributes = formatAttributes(variant.attributes);

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: 60mm 40mm; margin: 2mm; }
    body { font-family: monospace; margin: 0; background: white; color: black; }
    .label { width: 56mm; height: 36mm; display: flex; flex-direction: column;
             align-items: center; justify-content: space-between; padding: 2mm; }
    .product-name { font-size: 8pt; font-weight: bold; text-align: center; }
    .attributes { font-size: 7pt; color: #444; }
    .qr { width: 20mm; height: 20mm; }
    .sku { font-size: 6pt; font-family: monospace; }
  </style>
</head>
<body>
  <div class="label">
    <div class="product-name">${product.name}</div>
    <div class="attributes">${attributes}</div>
    <img class="qr" src="${variant.qrCodeData}" alt="${variant.sku}" />
    <div class="sku">${variant.sku}</div>
  </div>
</body>
</html>`;
}

export async function printLabel(variant: LabelVariant, product: LabelProduct): Promise<void> {
  const html = buildLabelHTML(variant, product);
  await window.api.print.label(html);
}
