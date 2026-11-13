import assert from 'node:assert/strict';
import test from 'node:test';
import { collectionOptions } from './collection-options';
import type { ShopCollection } from './contract';

const collection = (id: string, order: number, active = true): ShopCollection => ({
  id,
  slug: id,
  label: id,
  description: '',
  order,
  active,
  image: null,
});

test('collection choices keep hidden memberships available and use configured order', () => {
  const collections = [collection('hidden', 2, false), collection('shown', 1)];
  assert.deepEqual(collectionOptions(collections, ['hidden']), [
    { value: 'shown', label: 'shown' },
    { value: 'hidden', label: 'hidden (paslėpta)' },
  ]);
  assert.deepEqual(
    collections.map((item) => item.id),
    ['hidden', 'shown'],
  );
});

test('missing selected collections remain visible for explicit removal without invented choices', () => {
  assert.deepEqual(collectionOptions([], ['removed', 'removed']), [
    { value: 'removed', label: 'Nebepasiekiama kolekcija (removed)' },
  ]);
  assert.deepEqual(collectionOptions([]), []);
  assert.equal(collectionOptions([collection('known', 0)], ['known']).length, 1);
});
