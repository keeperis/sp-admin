'use client';
import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import type { ShopOrderView } from '@/lib/shop/commerce-contract';
import { bankPaymentConfirmation, isLiveCommerce } from '@/lib/shop/commerce-mode';

export function OrderPaymentQuickAction({
  order,
  disabled,
  onChange,
}: {
  order: ShopOrderView;
  disabled: boolean;
  onChange: (order: ShopOrderView) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  if (order.paymentMethod !== 'bank_transfer' || order.status !== 'awaiting_payment') return null;
  const live = isLiveCommerce(order.mode);
  async function confirm() {
    if (lock.current || disabled) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      onChange(
        await shopRequest(
          `orders/${order.id}/mark-paid`,
          'POST',
          bankPaymentConfirmation(order.mode),
        ),
      );
      setOpened(false);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button size="sm" variant="light" disabled={disabled} onClick={() => setOpened(true)}>
        {live ? 'Patvirtinti pavedimą' : 'Imituoti pavedimą'}
      </Button>
      <Modal
        opened={opened}
        onClose={() => {
          if (!busy) setOpened(false);
        }}
        title={live ? 'Patvirtinti gautą pavedimą' : 'Testinis pavedimas'}
        size="sm"
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
      >
        <Stack>
          <Text>{order.number}</Text>
          <Text size="sm">
            {live
              ? `Patikrink banko išraše, kad gauta ${(order.totalCents / 100).toLocaleString('lt-LT', { style: 'currency', currency: 'EUR' })}. Mokėjimo paskirtis: ${order.paymentReference}.`
              : 'Imituojamas tik testinio užsakymo apmokėjimas.'}
          </Text>
          {error && <Alert color="red">{error}</Alert>}
          <Group>
            <Button variant="default" disabled={busy} onClick={() => setOpened(false)}>
              Grįžti
            </Button>
            <Button color="teal" loading={busy} onClick={confirm}>
              {live ? 'Lėšos tikrai gautos' : 'Patvirtinti imitavimą'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
