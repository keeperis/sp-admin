'use client';
import { Alert, Badge, Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import { fulfillmentStatusLabels, type ShopOrderView } from '@/lib/shop/commerce-contract';
import type { DpdTracking } from './OrderDpdShipment';

const date = (value: string) => new Date(value).toLocaleString('lt-LT');

export function OrderFulfillment({
  order,
  disabled,
  suggestedTracking,
  onChange,
}: {
  order: ShopOrderView;
  disabled: boolean;
  suggestedTracking?: DpdTracking | null;
  onChange: (order: ShopOrderView) => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<{ signature: string; requestId: string } | null>(null);
  const locked = useRef(false);
  const trackingEdited = useRef(false);
  useEffect(() => {
    if (!suggestedTracking || trackingEdited.current) return;
    setTrackingNumber((current) => current || suggestedTracking.number);
    setTrackingUrl((current) => current || suggestedTracking.url);
  }, [suggestedTracking]);
  const status = order.fulfillmentStatus;
  const nextStatus =
    status === 'unfulfilled'
      ? 'preparing'
      : status === 'preparing'
        ? order.delivery.method === 'studio'
          ? 'ready_for_pickup'
          : 'shipped'
        : status === 'ready_for_pickup' || status === 'shipped'
          ? 'fulfilled'
          : null;
  const actionLabel =
    nextStatus === 'preparing'
      ? 'Pradėti ruošti užsakymą'
      : nextStatus === 'ready_for_pickup'
        ? 'Pažymėti: paruoštas atsiimti'
        : nextStatus === 'shipped'
          ? 'Pažymėti: išsiųstas'
          : 'Pažymėti: įvykdytas';

  async function updateFulfillment(event: FormEvent) {
    event.preventDefault();
    if (!nextStatus || disabled || locked.current || order.status !== 'paid') return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const input = {
        expectedRevision: order.fulfillmentRevision,
        status: nextStatus,
        ...(nextStatus === 'shipped'
          ? { trackingNumber: trackingNumber.trim(), trackingUrl: trackingUrl.trim() || undefined }
          : {}),
      };
      const signature = JSON.stringify(input);
      if (request.current?.signature !== signature) {
        request.current = { signature, requestId: crypto.randomUUID() };
      }
      const updated = await shopRequest(`orders/${order.id}/fulfillment`, 'POST', {
        ...input,
        requestId: request.current.requestId,
      });
      request.current = null;
      onChange(updated);
    } catch (e) {
      setError((e as Error).message || 'Nepavyko pakeisti užsakymo vykdymo būsenos.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <Stack gap="sm" mt="md">
      <Title order={4}>Užsakymo vykdymas</Title>
      <Group>
        <Badge color={status === 'fulfilled' ? 'teal' : 'blue'} variant="light">
          {fulfillmentStatusLabels[status]}
        </Badge>
        {order.fulfillmentUpdatedAt && (
          <Text size="xs" c="dimmed">
            {date(order.fulfillmentUpdatedAt)}
          </Text>
        )}
      </Group>
      {order.trackingNumber && <Text size="sm">Siuntos numeris: {order.trackingNumber}</Text>}
      {order.trackingUrl && (
        <Text
          component="a"
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          Atidaryti siuntos sekimą ↗
        </Text>
      )}
      {nextStatus && (
        <form onSubmit={updateFulfillment}>
          <Stack gap="sm">
            {nextStatus === 'shipped' && (
              <>
                <TextInput
                  label="Siuntos numeris"
                  description="Numeris bus rodomas pirkėjui ir išsiuntimo pranešime."
                  value={trackingNumber}
                  onChange={(event) => {
                    trackingEdited.current = true;
                    setTrackingNumber(event.currentTarget.value);
                  }}
                  required
                  maxLength={120}
                  disabled={disabled || busy}
                />
                <TextInput
                  label="Siuntos sekimo nuoroda"
                  description="Neprivaloma. Naudok vežėjo nuorodą, prasidedančią https://."
                  type="url"
                  pattern="https://.*"
                  value={trackingUrl}
                  onChange={(event) => {
                    trackingEdited.current = true;
                    setTrackingUrl(event.currentTarget.value);
                  }}
                  maxLength={2000}
                  disabled={disabled || busy}
                />
              </>
            )}
            <Button type="submit" loading={busy} disabled={disabled} variant="light">
              {actionLabel}
            </Button>
          </Stack>
        </form>
      )}
      {error && <Alert color="red">{error}</Alert>}
      <Text size="xs" c="dimmed">
        Pirkėjas šią būseną matys savo užsakymo nuorodoje. Pažymėk išsiųstu tik perdavęs siuntą
        vežėjui. Būsenos pakeitimas pats DPD siuntos nesukuria.
      </Text>
      {order.fulfillmentHistory.length > 0 && (
        <details>
          <summary>Vykdymo istorija</summary>
          <Stack gap="xs" mt="sm">
            {order.fulfillmentHistory.map((entry) => (
              <Text size="sm" key={entry.revision}>
                {date(entry.at)} · {fulfillmentStatusLabels[entry.status]}
                {entry.trackingNumber ? ` · ${entry.trackingNumber}` : ''}
              </Text>
            ))}
          </Stack>
        </details>
      )}
    </Stack>
  );
}
