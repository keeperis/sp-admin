import type { ShopProduct } from './contract';

/** Send only edits made in this form; untouched fields may have changed on the server. */
export function productChanges(initial: ShopProduct, edited: ShopProduct) {
  return Object.fromEntries(
    Object.entries(edited).filter(
      ([key, value]) =>
        key !== 'id' && JSON.stringify(value) !== JSON.stringify(initial[key as keyof ShopProduct]),
    ),
  ) as Partial<Omit<ShopProduct, 'id'>>;
}
