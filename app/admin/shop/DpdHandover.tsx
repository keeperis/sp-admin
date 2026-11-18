'use client';
import { Alert, Button, Checkbox, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import type { ShopOrderView } from '@/lib/shop/commerce-contract';
import type { DpdPickup, DpdPickupsData } from '@/lib/shop/dpd-pickup-contract';

export function DpdHandover({ onChange }: { onChange: (orders: ShopOrderView[]) => void }) {
  const [pickups, setPickups] = useState<DpdPickup[]>([]);
  const [pickupId, setPickupId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [closing, setClosing] = useState(false);
  const request = useRef<{ requestId: string; pickupId: string; orderIds: string[] } | null>(null);
  const lock = useRef(false);
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const next: DpdPickupsData = await shopRequest('shipping/dpd/pickups');
      setPickups(next.pickups);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const eligible = pickups.filter(
    (p) => ['confirmed', 'external'].includes(p.state) && p.claimActive !== false && !p.closedAt,
  );
  const current = eligible.find((p) => p.id === pickupId);
  const remainingIds =
    current?.orderIds.filter((id) => !(current.handedOverOrderIds || []).includes(id)) || [];
  const choose = (id: string | null) => {
    if (request.current || busy) return;
    setPickupId(id);
    const pickup = eligible.find((p) => p.id === id);
    setSelectedIds(
      pickup?.orderIds.filter((orderId) => !(pickup.handedOverOrderIds || []).includes(orderId)) ||
        [],
    );
    setResult('');
    setError('');
    setClosing(false);
  };
  async function handover() {
    if (lock.current || !current || !selectedIds.length) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setResult('');
    if (!request.current)
      request.current = {
        requestId: crypto.randomUUID(),
        pickupId: current.id,
        orderIds: selectedIds,
      };
    try {
      const response = await fetch(
        `/api/admin/shop/shipping/dpd/pickups/${request.current.pickupId}/handover`,
        {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({
            requestId: request.current.requestId,
            orderIds: request.current.orderIds,
            confirmed: true,
          }),
        },
      );
      const next = await response
        .json()
        .catch(() => ({ error: 'Negautas patvirtinimas. Pakartok tą patį veiksmą.' }));
      if (!response.ok) {
        if ([400, 409, 422].includes(response.status)) request.current = null;
        throw new Error(next.error || 'Nepavyko pažymėti siuntų.');
      }
      onChange(next.orders);
      setPickups((items) => items.map((p) => (p.id === next.pickup.id ? next.pickup : p)));
      const failures = next.results.filter((item: { status: string }) => item.status === 'failed');
      setResult(`Pažymėta išsiųstais: ${next.results.length - failures.length}.`);
      if (failures.length)
        setError(
          failures
            .map(
              (item: { orderId: string; error?: string }) =>
                `${current.orderNumbers[current.orderIds.indexOf(item.orderId)] || item.orderId}: ${item.error || 'Nepavyko'}`,
            )
            .join(' '),
        );
      if (next.completed) {
        request.current = null;
        setSelectedIds([]);
      }
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function closePickup() {
    if (lock.current || !current || request.current || !closing) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const next: { pickup: DpdPickup } = await shopRequest(
        `shipping/dpd/pickups/${current.id}/close`,
        'POST',
        { confirmed: true },
      );
      setPickups((items) =>
        items.map((pickup) => (pickup.id === next.pickup.id ? next.pickup : pickup)),
      );
      setPickupId(null);
      setSelectedIds([]);
      setClosing(false);
      setResult(
        'Paėmimas užbaigtas. Nepaimtas siuntas galima pasirinkti naujam kurjerio iškvietimui.',
      );
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Stack>
      <Text size="sm">
        Pasirink kurjerio iškvietimą ir pažymėk tik fiziškai perduotas siuntas. Nepaimtų siuntų
        žymėjimą nuimk.
      </Text>
      {busy && !pickups.length && <Loader size="sm" />}
      <Select
        label="Kurjerio iškvietimas"
        placeholder="Pasirink iškvietimą"
        value={pickupId}
        onChange={choose}
        disabled={busy || !!request.current || closing}
        data={eligible.map((p) => ({
          value: p.id,
          label: `${p.pickupTime.replace('T', ' ')} · ${p.orderIds.filter((id) => !(p.handedOverOrderIds || []).includes(id)).length} nepaimtų siuntų${p.source === 'external' ? ' · išorinis' : ''}`,
        }))}
      />
      {!busy && !eligible.length && (
        <Alert color="blue">
          Nėra neužbaigtų patvirtintų iškvietimų. Pirmiausia iškviesk kurjerį arba užregistruok
          iškvietimą iš kitos sistemos.
        </Alert>
      )}
      {current && (
        <Stack gap="sm">
          {remainingIds.map((id) => (
            <Checkbox
              key={id}
              checked={selectedIds.includes(id)}
              disabled={busy || !!request.current || closing}
              label={current.orderNumbers[current.orderIds.indexOf(id)] || id}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setSelectedIds((ids) =>
                  checked ? [...ids, id] : ids.filter((value) => value !== id),
                );
              }}
            />
          ))}
          {remainingIds.length > 0 ? (
            <Text size="sm" c="dimmed">
              Pasirinkti užsakymai bus pažymėti „Išsiųstas“, pirkėjams bus paruošti pranešimai.
            </Text>
          ) : (
            <Text size="sm" c="teal">
              Visos šio iškvietimo siuntos pažymėtos paimtomis.
            </Text>
          )}
          {closing ? (
            <Alert color="orange" title="Užbaigti kurjerio paėmimą?">
              <Stack gap="sm">
                {remainingIds.length > 0 && (
                  <Text size="sm">
                    Nepaimti užsakymai:{' '}
                    {remainingIds
                      .map((id) => current.orderNumbers[current.orderIds.indexOf(id)] || id)
                      .join(', ')}
                    . Juos bus galima pasirinkti naujam iškvietimui.
                  </Text>
                )}
                <Text size="sm">
                  Užbaigiame tik šį paėmimo įrašą mūsų sistemoje. Tai neatšaukia DPD iškvietimo ir
                  nepažymi likusių siuntų išsiųstomis. Jei kurjeris dar turėtų atvykti pagal šį
                  iškvietimą, jo neužbaik.
                </Text>
                <Group>
                  <Button color="orange" loading={busy} onClick={closePickup}>
                    Taip, užbaigti paėmimą
                  </Button>
                  <Button variant="default" disabled={busy} onClick={() => setClosing(false)}>
                    Grįžti
                  </Button>
                </Group>
              </Stack>
            </Alert>
          ) : (
            <Button
              variant="outline"
              color="gray"
              disabled={busy || !!request.current}
              onClick={() => setClosing(true)}
            >
              Užbaigti paėmimą
            </Button>
          )}
        </Stack>
      )}
      {result && (
        <Alert color="teal" role="status">
          {result}
        </Alert>
      )}
      {error && <Alert color="red">{error}</Alert>}
      {request.current && (
        <Text size="sm" c="dimmed">
          Pakartojimas pratęs tą patį perdavimą ir nedubliuos jau patvirtintų siuntų.
        </Text>
      )}
      <Group justify="space-between">
        <Button variant="default" onClick={load} disabled={busy || !!request.current || closing}>
          Atnaujinti
        </Button>
        <Button
          color="teal"
          onClick={handover}
          loading={busy}
          disabled={!current || !selectedIds.length || closing}
        >
          {request.current ? 'Pakartoti patvirtinimą' : `Siuntos paimtos (${selectedIds.length})`}
        </Button>
      </Group>
    </Stack>
  );
}
