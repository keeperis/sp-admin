'use client';

import { Button, NumberInput, Text } from '@mantine/core';
import { type FormEvent, useEffect, useState } from 'react';
import type { ShopProduct } from '@/lib/shop/contract';
import {
  mergeSavedProductFields,
  type ProductQuickEditChanges,
  type ProductQuickEditDraft,
} from '@/lib/shop/product-quick-edit';
import styles from './ProductQuickEdit.module.css';

export type { ProductQuickEditChanges } from '@/lib/shop/product-quick-edit';

type ProductQuickEditProps = {
  product: ShopProduct;
  onSave: (product: ShopProduct, changes: ProductQuickEditChanges) => Promise<boolean>;
  onDirtyChange?: (id: string, dirty: boolean) => void;
  disabled?: boolean;
};

function parseInteger(value: number | string, maximum: number): number | null {
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= maximum ? number : null;
}

export function ProductQuickEdit({
  product,
  onSave,
  onDirtyChange,
  disabled = false,
}: ProductQuickEditProps) {
  const [draft, setDraft] = useState<ProductQuickEditDraft>({
    order: { value: product.order, baseline: product.order },
    stock: { value: product.stock, baseline: product.stock },
    error: '',
  });
  const [saving, setSaving] = useState(false);
  const order = parseInteger(draft.order.value, 99999);
  const stock = parseInteger(draft.stock.value, 1000000);
  const orderDirty = order === null || order !== draft.order.baseline;
  const stockDirty = stock === null || stock !== draft.stock.baseline;
  const dirty = orderDirty || stockDirty;
  const stockChangedElsewhere = stockDirty && product.stock !== draft.stock.baseline;

  useEffect(() => {
    setDraft((current) => {
      if (current.order.baseline === product.order) return current;
      return {
        ...current,
        order: {
          baseline: product.order,
          // Other saves can refresh this row. Keep a local, unsaved value until
          // this row is explicitly saved; refresh a clean row from the server.
          value:
            parseInteger(current.order.value, 99999) === current.order.baseline
              ? product.order
              : current.order.value,
        },
      };
    });
  }, [product.order]);

  useEffect(() => {
    setDraft((current) => {
      if (current.stock.baseline === product.stock) return current;
      // Keep the original stock baseline for a dirty quantity. Advancing it
      // could overwrite stock reserved while the administrator was editing.
      if (parseInteger(current.stock.value, 1000000) !== current.stock.baseline) return current;
      return { ...current, stock: { value: product.stock, baseline: product.stock } };
    });
  }, [product.stock]);

  useEffect(() => {
    if (!dirty) return;
    const preventLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', preventLeaving);
    return () => window.removeEventListener('beforeunload', preventLeaving);
  }, [dirty]);

  useEffect(() => {
    onDirtyChange?.(product.id, dirty);
    return () => onDirtyChange?.(product.id, false);
  }, [product.id, dirty, onDirtyChange]);

  function change(field: 'order' | 'stock', value: number | string) {
    setDraft((current) => {
      // Reverting a stock edit also reveals newer stock received while editing.
      if (
        field === 'stock' &&
        parseInteger(value, 1000000) === current.stock.baseline &&
        product.stock !== current.stock.baseline
      ) {
        return { ...current, stock: { value: product.stock, baseline: product.stock }, error: '' };
      }
      return { ...current, [field]: { ...current[field], value }, error: '' };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || saving || !dirty || stockChangedElsewhere) return;
    if (order === null || stock === null) {
      setDraft((current) => ({
        ...current,
        error: 'Įrašykite sveikus skaičius: likutis 0–1000000, eiliškumas 0–99999.',
      }));
      return;
    }

    const changes: ProductQuickEditChanges = {};
    if (orderDirty) changes.order = order;
    if (stockDirty) changes.stock = stock;
    setSaving(true);
    setDraft((current) => ({ ...current, error: '' }));
    try {
      // Only a stock edit needs its original quantity for the API race check.
      const source = stockDirty ? { ...product, stock: draft.stock.baseline } : product;
      const saved = await onSave(source, changes);
      if (saved) {
        setDraft((current) => mergeSavedProductFields(current, changes));
      } else {
        setDraft((current) => ({
          ...current,
          error: 'Nepavyko išsaugoti. Pakeitimas paliktas; galite bandyti dar kartą.',
        }));
      }
    } catch (error) {
      setDraft((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Nepavyko išsaugoti pakeitimų.',
      }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.editor} onSubmit={submit} aria-busy={saving}>
      <div className={styles.controls}>
        <div className={styles.fields}>
          <NumberInput
            className={styles.field}
            label="Likutis, vnt."
            aria-label={`Laisvas likutis: ${product.name}`}
            size="sm"
            value={draft.stock.value}
            min={0}
            max={1000000}
            step={1}
            allowDecimal={false}
            allowNegative={false}
            disabled={disabled || saving}
            onChange={(value) => change('stock', value)}
          />
          <NumberInput
            className={styles.field}
            label="Eiliškumas"
            aria-label={`Eiliškumas parduotuvėje: ${product.name}`}
            size="sm"
            value={draft.order.value}
            min={0}
            max={99999}
            step={1}
            allowDecimal={false}
            allowNegative={false}
            disabled={disabled || saving}
            onChange={(value) => change('order', value)}
          />
        </div>
        <Button
          type="submit"
          size="xs"
          color="teal"
          loading={saving}
          disabled={disabled || !dirty || order === null || stock === null || stockChangedElsewhere}
          aria-label={`Išsaugoti likutį ir eiliškumą: ${product.name}`}
        >
          Išsaugoti
        </Button>
      </div>
      {dirty && (
        <Button
          className={styles.cancel}
          type="button"
          size="compact-xs"
          variant="subtle"
          color="gray"
          disabled={disabled || saving}
          aria-label={`Atšaukti pakeitimus: ${product.name}`}
          onClick={() =>
            setDraft({
              order: { value: product.order, baseline: product.order },
              stock: { value: product.stock, baseline: product.stock },
              error: '',
            })
          }
        >
          Atšaukti pakeitimus
        </Button>
      )}
      {stockChangedElsewhere && (
        <div className={styles.notice}>
          <Text size="xs" c="orange" role="status">
            Likutis pasikeitė: dabar {product.stock} vnt. Įkelkite naujausią likutį prieš jį
            keisdami.
          </Text>
          <Button
            type="button"
            size="compact-xs"
            variant="subtle"
            disabled={disabled || saving}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                stock: { value: product.stock, baseline: product.stock },
                error: '',
              }))
            }
          >
            Įkelti naujausią likutį
          </Button>
        </div>
      )}
      {draft.error && (
        <Text className={styles.error} role="alert" size="xs" c="red">
          {draft.error}
        </Text>
      )}
    </form>
  );
}
