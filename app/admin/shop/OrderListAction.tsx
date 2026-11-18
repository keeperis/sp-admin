'use client';
import { Alert, Button, Stack } from '@mantine/core';
import { useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import type { ShopOrderView } from '@/lib/shop/commerce-contract';

export function OrderListAction({
  order,
  disabled,
  onChange,
}: {
  order: ShopOrderView;
  disabled: boolean;
  onChange: (order: ShopOrderView) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<{ requestId: string; signature: string } | null>(null);
  const lock = useRef(false);
  const next =
    order.delivery.method !== 'studio'
      ? order.fulfillmentStatus === 'shipped'
        ? 'fulfilled'
        : null
      : order.fulfillmentStatus === 'unfulfilled'
        ? 'preparing'
        : order.fulfillmentStatus === 'preparing'
          ? 'ready_for_pickup'
          : order.fulfillmentStatus === 'ready_for_pickup'
            ? 'fulfilled'
            : null;
  if (!next) return null;
  async function update() {
    if (disabled || lock.current || !next) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const input = { expectedRevision: order.fulfillmentRevision, status: next };
    const signature = JSON.stringify(input);
    if (request.current?.signature !== signature)
      request.current = { requestId: crypto.randomUUID(), signature };
    try {
      onChange(
        await shopRequest(`orders/${order.id}/fulfillment`, 'POST', {
          ...input,
          requestId: request.current.requestId,
        }),
      );
      request.current = null;
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <Stack gap="xs">
      <Button
        variant="light"
        disabled={disabled || !!order.withdrawalRequestedAt}
        loading={busy}
        onClick={update}
      >
        {next === 'preparing'
          ? 'Pradėti ruošti'
          : next === 'ready_for_pickup'
            ? 'Paruoštas atsiimti'
            : order.delivery.method === 'studio'
              ? 'Prekės atsiimtos'
              : 'Gavėjas gavo siuntą'}
      </Button>
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
    </Stack>
  );
}
