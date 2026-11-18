'use client';
import { Alert, Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import type { ShopOrderView } from '@/lib/shop/commerce-contract';
import { openLabelPrintWindow, showLabelPdf } from '@/lib/shop/label-print';

type Context = {
  settings: {
    environment: 'production' | 'sandbox';
    credentialsConfigured: boolean;
    revision: number;
  };
  shipment: {
    state: 'creating' | 'created' | 'uncertain' | 'rejected';
    environment: 'production' | 'sandbox';
  } | null;
  suggestedWeightKg: number | null;
  missingWeightProducts: { id: string; name: string; quantity: number }[];
  order?: ShopOrderView;
};
type Request = {
  requestId: string;
  expectedConfigRevision: number;
  environment: 'production' | 'sandbox';
  confirmProduction: boolean;
  weightKg?: number;
};

export function OrderDpdQuickAction({
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
  const [missing, setMissing] = useState<Context | null>(null);
  const [weightKg, setWeightKg] = useState<number | string>('');
  const maxWeightKg = order.delivery.method === 'parcel' ? 20 : 31.5;
  const locked = useRef(false);
  const request = useRef<Request | null>(null);
  async function print(overrideWeight?: number) {
    if (locked.current || disabled) return;
    locked.current = true;
    setBusy(true);
    setError('');
    const target = openLabelPrintWindow();
    try {
      let context: Context = await shopRequest(`orders/${order.id}/dpd`);
      if (context.shipment?.state === 'creating' || context.shipment?.state === 'uncertain') {
        throw new Error(
          'DPD užklausa jau pateikta, bet siuntos patvirtinimo dar nėra. Patikrink būseną išsamioje peržiūroje — antros siuntos nekuriame.',
        );
      }
      if (context.shipment?.state !== 'created') {
        const expectedEnvironment = order.mode === 'live' ? 'production' : 'sandbox';
        if (context.settings.environment !== expectedEnvironment)
          throw new Error(
            'Užsakymo mokėjimo režimas neatitinka DPD aplinkos. Testiniam užsakymui reikia testinės DPD paskyros, tikram — produkcinės.',
          );
        if (!context.settings.credentialsConfigured)
          throw new Error('Pirmiausia išsaugok DPD prisijungimus: Nustatymai → DPD siuntimas.');
        if (!context.suggestedWeightKg && !overrideWeight && !request.current) {
          setMissing(context);
          target?.close();
          return;
        }
        if (!request.current)
          request.current = {
            requestId: crypto.randomUUID(),
            expectedConfigRevision: context.settings.revision,
            environment: context.settings.environment,
            confirmProduction: context.settings.environment === 'production',
            ...(overrideWeight ? { weightKg: overrideWeight } : {}),
          };
        const response = await fetch(`/api/admin/shop/orders/${order.id}/dpd/quick`, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify(request.current),
        });
        const result = await response
          .json()
          .catch(() => ({ error: 'Negautas DPD atsakymas. Bandyk dar kartą patikrinti būseną.' }));
        if (!response.ok) {
          if ([400, 409, 422].includes(response.status)) request.current = null;
          throw new Error(result.error || 'Nepavyko sukurti siuntos.');
        }
        context = result;
        if (context.shipment?.state !== 'created')
          throw new Error('Siuntos sukūrimas dar nepatvirtintas. Atnaujink būseną.');
        request.current = null;
        setMissing(null);
      }
      if (context.order) onChange(context.order);
      const label = await shopRequest(`orders/${order.id}/dpd/label`, 'POST', {
        format: 'A6',
        confirmProduction: context.shipment.environment === 'production',
      });
      if (label.order) onChange(label.order);
      showLabelPdf(target, label);
    } catch (problem) {
      target?.close();
      setError(problem instanceof Error ? problem.message : 'Nepavyko paruošti etiketės.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Stack gap="xs">
      <Button
        size="sm"
        color="teal"
        leftSection={<IconPrinter size={16} />}
        disabled={disabled || order.mode !== 'live' || !!order.withdrawalRequestedAt}
        loading={busy}
        onClick={() => void print()}
      >
        Spausdinti DPD etiketę
      </Button>
      {order.mode !== 'live' && (
        <Text size="xs" c="dimmed">
          Testiniam užsakymui reikia testinės DPD aplinkos. Atverk išsamią peržiūrą.
        </Text>
      )}
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
      <Modal
        opened={!!missing}
        onClose={() => {
          if (!busy) setMissing(null);
        }}
        title="Siuntos svoris"
        size="sm"
        closeOnClickOutside={!busy}
      >
        <Stack>
          <Text size="sm">Šios prekės dar neturi svorio:</Text>
          {missing?.missingWeightProducts.map((item) => (
            <Text size="sm" key={item.id}>
              {item.name} × {item.quantity}
            </Text>
          ))}
          <NumberInput
            label="Visos supakuotos siuntos svoris, kg"
            description="Įrašyk bendrą visų prekių ir pakuotės svorį."
            value={weightKg}
            onChange={setWeightKg}
            min={0.001}
            max={maxWeightKg}
            decimalScale={3}
            decimalSeparator=","
            disabled={busy}
          />
          <Text size="xs" c="dimmed">
            Sukūrus DPD siuntą užsakymas bus pažymėtas „Ruošiamas“. Etiketė atsidarys A6 formatu.
          </Text>
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="space-between">
            <Button variant="default" disabled={busy} onClick={() => setMissing(null)}>
              Atšaukti
            </Button>
            <Button
              loading={busy}
              disabled={typeof weightKg !== 'number' || weightKg <= 0 || weightKg > maxWeightKg}
              onClick={() => void print(Number(weightKg))}
            >
              Kurti ir spausdinti
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
