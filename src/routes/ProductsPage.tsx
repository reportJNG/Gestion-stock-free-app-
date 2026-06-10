import { useEffect, useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreateProductModal } from '@/components/products/CreateProductModal';
import { ProductCard } from '@/components/products/ProductCard';
import { useProducts, type ProductSort } from '@/hooks/useProducts';

interface TemplateRow {
  name: string;
}

export const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<ProductSort>('newest');
  const [categories, setCategories] = useState<string[]>([]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const { products, isLoading, refetch, total, page, setPage, hasMore } = useProducts(search, category, sort);
  const hasFilters = Boolean(search || category !== 'all');

  useEffect(() => {
    window.api.db.categoryTemplates.getAll().then((rows: TemplateRow[]) => setCategories(rows.map((row) => row.name)));
  }, []);

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setSort('newest');
  };

  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>Products</h1>
          <p>Browse, create, and manage your inventory.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          New Product
        </Button>
      </div>

      <div className="products-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input value={search} placeholder="Search by name or ID..." onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="input-control sort-select" value={sort} onChange={(event) => setSort(event.target.value as ProductSort)}>
          <option value="newest">Newest</option>
          <option value="name">Name A-Z</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </select>
      </div>

      <div className="category-pills">
        {['all', ...categories].map((item) => (
          <button key={item} type="button" className={category === item ? 'pill-active' : ''} onClick={() => setCategory(item)}>
            {item === 'all' ? 'All' : item}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="product-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="shimmer skeleton-stat" key={index} />
          ))}
        </div>
      ) : products.length ? (
        <>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {hasMore ? (
            <div className="load-more-row">
              <Button variant="secondary" type="button" onClick={() => setPage(page + 1)}>
                Load more
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="products-empty">
          <Package size={48} />
          <h2>{hasFilters ? 'No products match your search' : 'No products yet'}</h2>
          <p>{hasFilters ? 'Try a different name, ID, or category.' : 'Start by creating your first product.'}</p>
          {hasFilters ? (
            <Button type="button" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create Product
            </Button>
          )}
        </div>
      )}

      <CreateProductModal open={isCreateOpen} onClose={() => setCreateOpen(false)} onCreated={() => void refetch()} />
    </div>
  );
};
