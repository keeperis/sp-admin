import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeSavedProductFields, type ProductQuickEditDraft } from './product-quick-edit';

test('saving order preserves stock refreshed while the request was pending', () => {
  const current: ProductQuickEditDraft = {
    order: { value: 8, baseline: 3 },
    stock: { value: 4, baseline: 4 },
    error: '',
  };
  const saved = mergeSavedProductFields(current, { order: 8 });
  assert.deepEqual(saved.order, { value: 8, baseline: 8 });
  assert.equal(saved.stock, current.stock);
  assert.deepEqual(saved.stock, { value: 4, baseline: 4 });
  assert.equal(current.order.baseline, 3);
});

test('saving stock preserves order refreshed while the request was pending', () => {
  const current: ProductQuickEditDraft = {
    order: { value: 12, baseline: 12 },
    stock: { value: 6, baseline: 4 },
    error: 'Previous attempt failed',
  };
  const saved = mergeSavedProductFields(current, { stock: 6 });
  assert.equal(saved.order, current.order);
  assert.deepEqual(saved.stock, { value: 6, baseline: 6 });
  assert.equal(saved.error, '');
  assert.equal(current.stock.baseline, 4);
});

test('explicit zero quantities and order values become the saved baseline', () => {
  const current: ProductQuickEditDraft = {
    order: { value: 0, baseline: 12 },
    stock: { value: 0, baseline: 4 },
    error: '',
  };
  assert.deepEqual(mergeSavedProductFields(current, { order: 0, stock: 0 }), {
    order: { value: 0, baseline: 0 },
    stock: { value: 0, baseline: 0 },
    error: '',
  });
});
