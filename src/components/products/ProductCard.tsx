import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { attributeText, categoryIcons, margin, money, stockStatus, type ProductRow } from '@/utils/productUtils';

export const ProductCard = ({ product }: { product: ProductRow }) => {
  const navigate = useNavigate();
  const Icon = categoryIcons[product.category] ?? categoryIcons.other;
  const quantity = Number(product.total_quantity ?? 0);
  const status = stockStatus(quantity, product.low_stock_threshold);
  const variantCount = Number(product.variant_count ?? 0);

  return (
    <Card className="product-card" clickable onClick={() => navigate(`/products/${product.id}`)}>
      <div className="product-card-top">
        <span className="product-category">
          <Icon size={24} />
          <Badge>{product.category}</Badge>
        </span>
        <span className="product-id">#{product.id}</span>
      </div>
      <div className="product-card-main">
        <h3>{product.name}</h3>
        <p>{product.description || 'No description'}</p>
      </div>
      <div className="product-price-line">
        <span>
          Costs {money(product.cost_price)} - Sells {money(product.sell_price)}
        </span>
        <Badge variant={margin(product.cost_price, product.sell_price) >= 0 ? 'ok' : 'danger'}>
          {margin(product.cost_price, product.sell_price).toFixed(0)}% margin
        </Badge>
      </div>
      <div className="product-stock-line">
        <strong>{quantity} total</strong>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <small>{variantCount || 1} variants</small>
    </Card>
  );
};

export const ProductPreviewCard = ({
  name,
  description,
  category,
  costPrice,
  sellPrice,
}: {
  name: string;
  description: string;
  category: string;
  costPrice: number;
  sellPrice: number;
}) => {
  const Icon = categoryIcons[category] ?? categoryIcons.other;
  return (
    <Card className="product-card preview-card">
      <div className="product-card-top">
        <span className="product-category">
          <Icon size={24} />
          <Badge>{category}</Badge>
        </span>
        <span className="product-id">#NEW</span>
      </div>
      <div className="product-card-main">
        <h3>{name || 'Product name'}</h3>
        <p>{description || 'Optional description'}</p>
      </div>
      <div className="product-price-line">
        <span>
          Costs {money(costPrice)} - Sells {money(sellPrice)}
        </span>
        <Badge variant={margin(costPrice, sellPrice) >= 0 ? 'ok' : 'danger'}>{margin(costPrice, sellPrice).toFixed(0)}% margin</Badge>
      </div>
      <div className="product-stock-line">
        <strong>0 total</strong>
        <Badge variant="danger">Out of Stock</Badge>
      </div>
      <small>{attributeText({})}</small>
    </Card>
  );
};
