import type { ShopProduct } from './contract';

export type ProductQuickEditChanges = Partial<Pick<ShopProduct, 'order' | 'stock'>>;

export type NumberDraft = { value: number | string; baseline: number };

export type ProductQuickEditDraft = {
  order: NumberDraft;
  stock: NumberDraft;
  error: string;
};

/** A successful patch owns only its submitted fields; refreshed values may be newer. */
export function mergeSavedProductFields(
  current: ProductQuickEditDraft,
  saved: ProductQuickEditChanges,
): ProductQuickEditDraft {
  return {
    order:
      saved.order === undefined ? current.order : { value: saved.order, baseline: saved.order },
    stock:
      saved.stock === undefined ? current.stock : { value: saved.stock, baseline: saved.stock },
    error: '',
  };
}
