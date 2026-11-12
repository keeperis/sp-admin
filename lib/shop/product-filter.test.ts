import assert from 'node:assert/strict';
import test from 'node:test';
import type { ShopProduct } from './contract';
import { filterShopProducts } from './product-filter';

function product(
  id: string,
  status: ShopProduct['status'],
  order: number,
  name = id,
  slug = id,
): ShopProduct {
  return {
    id,
    name,
    slug,
    status,
    order,
    kind: '',
    secondaryAttribute: '',
    category: 'cups',
    price: 30,
    stock: 1,
    images: [],
    color: '',
    colorHex: '',
    size: '',
    material: '',
    description: '',
    ritual: '',
    care: '',
    delivery: '',
    badge: '',
    featured: false,
  };
}

const ids = (products: ShopProduct[]) => products.map((item) => item.id);

test('default and active filters show published products and drafts, excluding archived products', () => {
  const products = [
    product('archived', 'archived', 0),
    product('published', 'published', 2),
    product('draft', 'draft', 1),
  ];
  assert.deepEqual(ids(filterShopProducts(products)), ['draft', 'published']);
  assert.deepEqual(ids(filterShopProducts(products, { status: 'active' })), ['draft', 'published']);
});

test('each explicit status filter shows only that status', () => {
  const products = [
    product('archived', 'archived', 0),
    product('published', 'published', 2),
    product('draft', 'draft', 1),
  ];
  for (const status of ['published', 'draft', 'archived'] as const) {
    assert.deepEqual(ids(filterShopProducts(products, { status })), [status]);
  }
});

test('search trims whitespace and matches Lithuanian names or slugs case-insensitively', () => {
  const products = [
    product('cup', 'published', 2, 'Ąžuolo puodelis', 'azuolo-puodelis'),
    product('vase', 'draft', 1, 'Vaza', 'unikali-zalia-vaza'),
  ];
  assert.deepEqual(ids(filterShopProducts(products, { query: '  ĄŽUOLO  ' })), ['cup']);
  assert.deepEqual(ids(filterShopProducts(products, { query: ' ZALIA-VAZA ' })), ['vase']);
  assert.deepEqual(ids(filterShopProducts(products, { query: '   ' })), ['vase', 'cup']);
});

test('matching archived products stay hidden until the archived filter is selected', () => {
  const products = [
    product('old-cup', 'archived', 0, 'Puodelis'),
    product('old-vase', 'archived', 1, 'Vaza'),
    product('new-cup', 'draft', 2, 'Puodelis'),
  ];
  assert.deepEqual(ids(filterShopProducts(products, { query: 'puodelis' })), ['new-cup']);
  assert.deepEqual(ids(filterShopProducts(products, { status: 'archived', query: 'puodelis' })), [
    'old-cup',
  ]);
});

test('sorting is ascending and stable without mutating the source array or products', () => {
  const products = Object.freeze([
    Object.freeze(product('last', 'published', 8)),
    Object.freeze(product('tied-first', 'draft', 2)),
    Object.freeze(product('first', 'published', 0)),
    Object.freeze(product('tied-second', 'published', 2)),
  ]);
  const filtered = filterShopProducts(products);
  assert.deepEqual(ids(filtered), ['first', 'tied-first', 'tied-second', 'last']);
  assert.deepEqual(
    products.map((item) => item.id),
    ['last', 'tied-first', 'first', 'tied-second'],
  );
  assert.notEqual(filtered, products);
  assert.equal(filtered[0], products[2]);
});
