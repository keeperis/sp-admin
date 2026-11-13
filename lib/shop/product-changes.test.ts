import assert from 'node:assert/strict';
import test from 'node:test';
import type { ShopProduct } from './contract';
import { productChanges } from './product-changes';

const initial: ShopProduct = {
  id: 'cup',
  slug: 'cup',
  name: 'Puodelis',
  kind: 'Keramika',
  secondaryAttribute: '',
  category: 'cups',
  price: 38,
  stock: 5,
  images: [{ url: '/api/shop/demo/mug', alt: 'Puodelis' }],
  color: 'Rožinė',
  colorHex: '#ffcccc',
  size: '300 ml',
  material: 'Molis',
  description: 'Rankų darbo puodelis.',
  ritual: '',
  care: 'Plauti rankomis',
  delivery: '',
  badge: '',
  status: 'published',
  featured: true,
  order: 0,
};

test('text edits do not submit untouched inventory, image arrays or other product fields', () => {
  const edited = structuredClone(initial);
  edited.name = 'Naujas pavadinimas';
  edited.care = '';
  assert.deepEqual(productChanges(initial, edited), { name: 'Naujas pavadinimas', care: '' });
  assert.deepEqual(productChanges(initial, structuredClone(initial)), {});
});

test('explicit stock and image edits are included, while the identity stays in the route', () => {
  const edited = structuredClone(initial);
  edited.stock = 2;
  edited.images.push({ url: '/api/shop/demo/bowl', alt: 'Antra nuotrauka' });
  edited.id = 'ignored';
  assert.deepEqual(productChanges(initial, edited), { stock: 2, images: edited.images });
  assert.equal(initial.images.length, 1);
  assert.equal(initial.stock, 5);
});

test('collection memberships change only when explicitly edited, including clearing every membership', () => {
  const member = { ...initial, collectionIds: ['hidden', 'shown'] };
  assert.deepEqual(productChanges(member, { ...member, name: 'Naujas vardas' }), {
    name: 'Naujas vardas',
  });
  assert.deepEqual(productChanges(member, { ...member, collectionIds: [] }), {
    collectionIds: [],
  });
  assert.deepEqual(productChanges(initial, { ...initial, name: 'Pakeista' }), { name: 'Pakeista' });
  assert.deepEqual(productChanges(initial, { ...initial, collectionIds: ['shown'] }), {
    collectionIds: ['shown'],
  });
});
