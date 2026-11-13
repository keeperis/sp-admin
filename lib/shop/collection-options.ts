import type { ShopCollection } from './contract';

/** Keep hidden and previously selected memberships visible until explicitly removed. */
export function collectionOptions(collections: ShopCollection[], selected: string[] = []) {
  const options = [...collections]
    .sort((a, b) => a.order - b.order)
    .map((collection) => ({
      value: collection.id,
      label: `${collection.label}${collection.active ? '' : ' (paslėpta)'}`,
    }));
  const known = new Set(options.map((option) => option.value));
  for (const id of new Set(selected)) {
    if (!known.has(id)) options.push({ value: id, label: `Nebepasiekiama kolekcija (${id})` });
  }
  return options;
}
