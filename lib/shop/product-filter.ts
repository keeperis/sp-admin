import type { ShopProduct } from './contract';

export type ProductStatusFilter = 'active' | ShopProduct['status'];

type ProductFilterOptions = {
  status?: ProductStatusFilter;
  query?: string;
};

/** Archived products require an explicit filter, including when searching by name. */
export function filterShopProducts(
  products: readonly ShopProduct[],
  { status = 'active', query = '' }: ProductFilterOptions = {},
): ShopProduct[] {
  const search = query.trim().toLocaleLowerCase('lt');
  return (
    products
      .filter((product) => {
        const matchesStatus =
          status === 'active'
            ? product.status === 'published' || product.status === 'draft'
            : product.status === status;
        const matchesSearch =
          !search || `${product.name} ${product.slug}`.toLocaleLowerCase('lt').includes(search);
        return matchesStatus && matchesSearch;
      })
      // Array sorting is stable: products with equal order retain their incoming order.
      .sort((a, b) => a.order - b.order)
  );
}
