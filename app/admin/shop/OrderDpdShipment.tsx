'use client';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import type { ShopDpdLocker, ShopOrderView } from '@/lib/shop/commerce-contract';
import { initialDpdShipmentFields, type DpdRecipient as Recipient } from '@/lib/shop/dpd-recipient';

export type DpdTracking = { number: string; url: string };
type Locker = ShopDpdLocker;
type Shipment = {
  state: 'creating' | 'created' | 'uncertain' | 'rejected';
  environment: 'production' | 'sandbox';
  requestId: string;
  parcelNumbers: string[];
  trackingUrl: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  recipient: Recipient;
  deliveryType: 'courier' | 'locker';
  lockerId: string;
  weightKg: number;
  parcelCount: number;
};
type DpdState = {
  settings: {
    environment: 'production' | 'sandbox';
    credentialsConfigured: boolean;
    revision: number;
  };
  shipment: Shipment | null;
};
type CreateInput = {
  environment: 'production' | 'sandbox';
  expectedConfigRevision: number;
  recipient: Recipient;
  deliveryType: 'courier' | 'locker';
  lockerId: string;
  weightKg: number;
  parcelCount: 1;
  confirmProduction: boolean;
};

export function OrderDpdShipment({
  order,
  disabled,
  onTrackingReady,
}: {
  order: ShopOrderView;
  disabled: boolean;
  onTrackingReady: (tracking: DpdTracking) => void;
}) {
  const buyerLocker = order.delivery.dpdLocker;
  const buyerCourierAddress = order.delivery.courierAddress;
  const initial = useRef(initialDpdShipmentFields(order)).current;
  const [data, setData] = useState<DpdState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsStatusCheck, setNeedsStatusCheck] = useState(false);
  const [recipient, setRecipient] = useState<Recipient>(initial.recipient);
  const [deliveryType, setDeliveryType] = useState<'courier' | 'locker'>(initial.deliveryType);
  const [lockerId, setLockerId] = useState(initial.lockerId);
  const courierAddress = useRef({
    street: buyerCourierAddress?.street || '',
    city: buyerCourierAddress?.city || '',
    postalCode: buyerCourierAddress?.postalCode || '',
  });
  const [lockers, setLockers] = useState<Locker[] | null>(null);
  const [loadingLockers, setLoadingLockers] = useState(false);
  const [weightKg, setWeightKg] = useState<string | number>('');
  const [confirmProduction, setConfirmProduction] = useState(false);
  const [format, setFormat] = useState<'A4' | 'A6'>('A4');
  const request = useRef<{ requestId: string; input: CreateInput } | null>(null);
  const requestRejected = useRef(false);
  const locked = useRef(false);
  const trackingCallback = useRef(onTrackingReady);
  trackingCallback.current = onTrackingReady;

  const acceptState = useCallback((next: DpdState) => {
    setData(next);
    setNeedsStatusCheck(false);
    if (
      (next.shipment?.state === 'rejected' &&
        (!request.current || next.shipment.requestId === request.current.requestId)) ||
      (requestRejected.current && (!next.shipment || next.shipment.state === 'rejected'))
    ) {
      request.current = null;
      requestRejected.current = false;
    }
    if (next.shipment?.state === 'created' && next.shipment.parcelNumbers.length > 0) {
      request.current = null;
      trackingCallback.current({
        number: next.shipment.parcelNumbers.join(', '),
        url: next.shipment.trackingUrl || '',
      });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next: DpdState = await shopRequest(`orders/${order.id}/dpd`);
      acceptState(next);
    } catch (e) {
      setError((e as Error).message || 'Nepavyko gauti DPD siuntos būsenos.');
    } finally {
      setLoading(false);
    }
  }, [acceptState, order.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const shipment = data?.shipment;
  const production =
    (shipment && shipment.state !== 'rejected'
      ? shipment.environment
      : data?.settings.environment) === 'production';
  const pending = shipment?.state === 'creating' || shipment?.state === 'uncertain';
  const created = shipment?.state === 'created';
  const alreadySent =
    order.fulfillmentStatus === 'shipped' ||
    order.fulfillmentStatus === 'fulfilled' ||
    !!order.trackingNumber;
  const withdrawalPending = !!order.withdrawalRequestedAt;
  const selectedLocker =
    lockers?.find((locker) => locker.id === lockerId) ||
    (buyerLocker?.id === lockerId ? buyerLocker : undefined);
  const lockerUnavailable =
    deliveryType === 'locker' &&
    !!lockerId &&
    lockers !== null &&
    !lockers.some((locker) => locker.id === lockerId);
  const recipientNameTooLong = recipient.name.length > 35;
  const recipientEmailTooLong = recipient.email.length > 30;
  const courierAddressChanged =
    buyerCourierAddress &&
    (deliveryType !== 'courier' ||
      recipient.street !== buyerCourierAddress.street ||
      recipient.city !== buyerCourierAddress.city ||
      recipient.postalCode !== buyerCourierAddress.postalCode);
  const inputsDisabled = disabled || busy || loading || needsStatusCheck || !!request.current;
  const createDisabled =
    disabled ||
    loading ||
    needsStatusCheck ||
    pending ||
    !data?.settings.credentialsConfigured ||
    alreadySent ||
    withdrawalPending ||
    lockerUnavailable ||
    recipientNameTooLong ||
    recipientEmailTooLong ||
    (production && !confirmProduction);

  function changeRecipient(key: keyof Recipient, value: string) {
    setRecipient((current) => ({ ...current, [key]: value }));
    if (deliveryType === 'courier' && ['street', 'city', 'postalCode'].includes(key)) {
      courierAddress.current = { ...courierAddress.current, [key]: value };
    }
  }

  function selectLocker(value: string | null) {
    const locker = lockers?.find((entry) => entry.id === value);
    setLockerId(value || '');
    setRecipient((current) => ({
      ...current,
      street: locker?.street || '',
      city: locker?.city || '',
      postalCode: locker?.postalCode || '',
    }));
  }

  function changeDeliveryType(value: string | null) {
    const nextType = value === 'courier' ? 'courier' : 'locker';
    if (nextType === deliveryType) return;
    setDeliveryType(nextType);
    // Keep a courier address separate from the locker, including manual edits.
    setRecipient((current) => ({
      ...current,
      street: nextType === 'locker' ? selectedLocker?.street || '' : courierAddress.current.street,
      city: nextType === 'locker' ? selectedLocker?.city || '' : courierAddress.current.city,
      postalCode:
        nextType === 'locker'
          ? selectedLocker?.postalCode || ''
          : courierAddress.current.postalCode,
    }));
  }

  async function loadLockers() {
    if (loadingLockers || !data?.settings.credentialsConfigured) return;
    setLoadingLockers(true);
    setError('');
    try {
      const result: { lockers: Locker[] } = await shopRequest('shipping/dpd/lockers');
      setLockers(result.lockers);
    } catch (e) {
      setError((e as Error).message || 'Nepavyko gauti DPD paštomatų.');
    } finally {
      setLoadingLockers(false);
    }
  }

  async function createShipment(event: FormEvent) {
    event.preventDefault();
    if (!data || createDisabled || locked.current || created) return;
    if (!request.current) {
      if (typeof weightKg !== 'number' || weightKg <= 0) {
        setError('Įrašyk supakuotos siuntos svorį kilogramais.');
        return;
      }
      if (deliveryType === 'locker' && !lockerId) {
        setError('Pasirink DPD paštomatą.');
        return;
      }
      request.current = {
        requestId: crypto.randomUUID(),
        input: {
          environment: data.settings.environment,
          expectedConfigRevision: data.settings.revision,
          recipient,
          deliveryType,
          lockerId: deliveryType === 'locker' ? lockerId : '',
          weightKg,
          parcelCount: 1,
          confirmProduction,
        },
      };
    }
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      // Keep the status here: a confirmed rejection can be corrected after refreshing,
      // while a network failure must retain the exact request for a safe retry.
      const response = await fetch(`/api/admin/shop/orders/${order.id}/dpd`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          ...request.current.input,
          requestId: request.current.requestId,
        }),
      });
      const result = await response
        .json()
        .catch(() => ({ error: 'Serveris grąžino netinkamą atsakymą.' }));
      if (!response.ok) {
        requestRejected.current = [400, 409, 422].includes(response.status);
        throw new Error(result.error || 'Nepavyko sukurti DPD siuntos.');
      }
      if (!result?.settings || !Object.hasOwn(result, 'shipment')) {
        throw new Error('Negavome siuntos patvirtinimo. Atnaujink DPD būseną.');
      }
      acceptState(result as DpdState);
    } catch (e) {
      setError((e as Error).message || 'Nepavyko patvirtinti siuntos sukūrimo.');
      setNeedsStatusCheck(true);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function downloadLabel() {
    if (!created || disabled || locked.current || (production && !confirmProduction)) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const label: { filename: string; contentType: 'application/pdf'; base64: string } =
        await shopRequest(`orders/${order.id}/dpd/label`, 'POST', { format, confirmProduction });
      const bytes = Uint8Array.from(atob(label.base64), (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: label.contentType }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = label.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message || 'Nepavyko gauti DPD etiketės.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <Paper withBorder p="md" mt="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>DPD siunta</Title>
          {data && (
            <Badge color={production ? 'orange' : 'blue'} variant="light">
              {production ? 'Tikra DPD paskyra' : 'DPD testinė aplinka'}
            </Badge>
          )}
        </Group>
        {loading && <Loader size="sm" aria-label="Gaunama DPD siuntos būsena" />}
        {data && !data.settings.credentialsConfigured && (
          <Alert color="yellow">
            Pirmiausia <a href="/admin/shop/dpd">DPD nustatymuose</a> išsaugok veikiančius
            prisijungimus. Vien prisijungimo patikra jų neišsaugo.
          </Alert>
        )}
        {withdrawalPending && !created && !pending && (
          <Alert color="yellow">
            Gautas sutarties atsisakymo prašymas. Prieš siunčiant reikia jį išspręsti.
          </Alert>
        )}
        {shipment?.state === 'rejected' && (
          <Alert color="red" title="DPD siuntos nesukūrė">
            {shipment.errorMessage || 'Patikrink gavėjo duomenis ir bandyk dar kartą.'}
          </Alert>
        )}
        {pending && (
          <Alert
            color="yellow"
            title={
              shipment.state === 'creating' ? 'Siunta kuriama' : 'Reikia patikrinti DPD paskyroje'
            }
          >
            {shipment.state === 'creating'
              ? 'Užklausa jau užregistruota. Atnaujink būseną prieš tęsdamas.'
              : 'DPD galėjo priimti užklausą, bet patvirtinimo negavome. Patikrink siuntą DPD paskyroje. Naujos siuntos čia nebekuriame, kad jos nedubliuotume.'}
            {shipment.errorMessage && (
              <Text size="sm" mt="xs">
                {shipment.errorMessage}
              </Text>
            )}
          </Alert>
        )}
        {created && shipment && (
          <>
            <Badge color="teal" variant="light">
              Siunta sukurta
            </Badge>
            <Text size="sm">Siuntos numeris: {shipment.parcelNumbers.join(', ')}</Text>
            <Text size="sm">
              {shipment.recipient.name} · {shipment.recipient.street}, {shipment.recipient.city}
            </Text>
            <Text size="xs" c="dimmed">
              {shipment.weightKg} kg · {shipment.parcelCount} pakuotė ·{' '}
              {new Date(shipment.createdAt).toLocaleString('lt-LT')}
            </Text>
            {shipment.trackingUrl && (
              <Text
                component="a"
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
              >
                Atidaryti DPD siuntos sekimą ↗
              </Text>
            )}
            {production && (
              <Checkbox
                label="Suprantu, kad etiketė bus gauta iš tikros DPD paskyros"
                checked={confirmProduction}
                onChange={(event) => setConfirmProduction(event.currentTarget.checked)}
                disabled={disabled || busy}
              />
            )}
            <Group align="end">
              <Select
                label="Etiketės formatas"
                value={format}
                onChange={(value) => setFormat(value === 'A6' ? 'A6' : 'A4')}
                data={[
                  { value: 'A4', label: 'A4 · įprastas spausdintuvas' },
                  { value: 'A6', label: 'A6 · etikečių spausdintuvas' },
                ]}
                allowDeselect={false}
                disabled={disabled || busy}
              />
              <Button
                loading={busy}
                onClick={downloadLabel}
                disabled={disabled || (production && !confirmProduction)}
              >
                Atsisiųsti etiketę (PDF)
              </Button>
            </Group>
            <Text size="sm" c="dimmed">
              Siuntėjo adresas imamas iš DPD paskyros — patikrink jį etiketėje. Siuntos sukūrimas
              nepakeičia užsakymo būsenos. Perdavimo DPD metu pažymėk užsakymą išsiųstu žemiau —
              tada bus paruoštas pirkėjo pranešimas.
            </Text>
          </>
        )}
        {!created &&
          !pending &&
          !withdrawalPending &&
          data?.settings.credentialsConfigured &&
          (alreadySent ? (
            <Text size="sm" c="dimmed">
              Užsakymas jau išsiųstas, įvykdytas arba turi siuntos numerį. Nauja DPD siunta čia
              nekuriama.
            </Text>
          ) : (
            <form onSubmit={createShipment}>
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Sukuriama viena pakuotė Lietuvoje. Pirkėjo pasirinkimas:{' '}
                  {order.delivery.location || order.delivery.label}.
                </Text>
                <TextInput
                  label="Gavėjo vardas ir pavardė"
                  value={recipient.name}
                  onChange={(event) => changeRecipient('name', event.currentTarget.value)}
                  error={
                    recipientNameTooLong
                      ? 'DPD gavėjo vardui ir pavardei priima iki 35 simbolių. Pakoreguok tik siuntos gavėjo įrašą.'
                      : undefined
                  }
                  required
                  maxLength={35}
                  disabled={inputsDisabled}
                />
                <TextInput
                  label="Gavėjo telefonas"
                  description="Naudok tarptautinį formatą, pvz., +370…"
                  type="tel"
                  value={recipient.phone}
                  onChange={(event) => changeRecipient('phone', event.currentTarget.value)}
                  required
                  pattern="[+][1-9][0-9]{7,14}"
                  maxLength={16}
                  disabled={inputsDisabled}
                />
                <TextInput
                  label="Gavėjo el. paštas"
                  type="email"
                  value={recipient.email}
                  onChange={(event) => changeRecipient('email', event.currentTarget.value)}
                  description="DPD el. paštas neprivalomas; pristatymo pranešimui naudojamas telefonas."
                  error={
                    recipientEmailTooLong
                      ? 'DPD priima iki 30 simbolių. Gali išvalyti šį lauką — užsakymo el. paštas nesikeis.'
                      : undefined
                  }
                  maxLength={30}
                  disabled={inputsDisabled}
                />
                <Select
                  label="DPD pristatymo būdas"
                  value={deliveryType}
                  onChange={changeDeliveryType}
                  data={[
                    { value: 'locker', label: 'Į DPD paštomatą' },
                    { value: 'courier', label: 'Kurjeriu gavėjo adresu' },
                  ]}
                  allowDeselect={false}
                  disabled={inputsDisabled}
                />
                {deliveryType === 'locker' && selectedLocker && (
                  <Paper withBorder radius="sm" p="sm">
                    <Text size="xs" c="dimmed" mb={4}>
                      {buyerLocker?.id === lockerId
                        ? 'Pirkėjo pasirinktas DPD paštomatas'
                        : 'Siuntai parinktas DPD paštomatas'}
                    </Text>
                    <Text size="sm" fw={600}>
                      {selectedLocker.name}
                    </Text>
                    <Text size="sm">
                      {selectedLocker.street}, {selectedLocker.city}, {selectedLocker.postalCode}
                    </Text>
                    {buyerLocker?.id === lockerId && (
                      <Text size="xs" c="dimmed" mt={4}>
                        Pasirinkimas perkeltas iš užsakymo. Įrašyk supakuotos siuntos svorį.
                      </Text>
                    )}
                  </Paper>
                )}
                {buyerLocker && (deliveryType !== 'locker' || lockerId !== buyerLocker.id) && (
                  <Alert color="yellow" title="Pristatymas pakeistas siuntos formoje">
                    Pirkėjas pasirinko {buyerLocker.name}, {buyerLocker.street}, {buyerLocker.city}.
                    Keisk pristatymą tik suderinęs su pirkėju. Užsakymo pasirinkimas nesikeičia.
                  </Alert>
                )}
                {buyerCourierAddress && (
                  <Paper withBorder radius="sm" p="sm">
                    <Text size="xs" c="dimmed" mb={4}>
                      Pirkėjo nurodytas pristatymo adresas
                    </Text>
                    <Text size="sm" fw={600}>
                      {buyerCourierAddress.street}, {buyerCourierAddress.city},{' '}
                      {buyerCourierAddress.postalCode}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      Adresas perkeltas iš užsakymo. Įrašyk supakuotos siuntos svorį.
                    </Text>
                  </Paper>
                )}
                {courierAddressChanged && (
                  <Alert color="yellow" title="Pristatymas pakeistas siuntos formoje">
                    Keisk pristatymo būdą ar adresą tik suderinęs su pirkėju. Užsakymo pasirinkimas
                    nesikeičia.
                  </Alert>
                )}
                {lockerUnavailable && (
                  <Alert color="yellow">
                    Pasirinkto paštomato dabartiniame DPD sąraše nebėra. Prieš kuriant siuntą
                    suderink su pirkėju kitą paštomatą.
                  </Alert>
                )}
                {deliveryType === 'locker' ? (
                  lockers ? (
                    <Select
                      label="DPD paštomatas"
                      placeholder="Ieškok pagal miestą, adresą ar pavadinimą"
                      data={lockers.map((locker) => ({
                        value: locker.id,
                        label: `${locker.city} · ${locker.name} · ${locker.street}`,
                      }))}
                      value={lockerId || null}
                      onChange={selectLocker}
                      searchable
                      required
                      nothingFoundMessage="Paštomatų nerasta"
                      disabled={inputsDisabled}
                    />
                  ) : (
                    <Button
                      variant="light"
                      onClick={loadLockers}
                      loading={loadingLockers}
                      disabled={inputsDisabled}
                    >
                      {selectedLocker ? 'Keisti DPD paštomatą' : 'Pasirinkti DPD paštomatą'}
                    </Button>
                  )
                ) : (
                  <>
                    <TextInput
                      label="Gatvė, namo ir buto numeris"
                      value={recipient.street}
                      onChange={(event) => changeRecipient('street', event.currentTarget.value)}
                      required
                      maxLength={35}
                      disabled={inputsDisabled}
                    />
                    <TextInput
                      label="Miestas"
                      value={recipient.city}
                      onChange={(event) => changeRecipient('city', event.currentTarget.value)}
                      required
                      maxLength={25}
                      disabled={inputsDisabled}
                    />
                    <TextInput
                      label="Pašto kodas"
                      description="Lietuvos pašto kodas — 5 skaitmenys."
                      value={recipient.postalCode}
                      onChange={(event) => changeRecipient('postalCode', event.currentTarget.value)}
                      required
                      pattern="[0-9]{5}"
                      maxLength={5}
                      disabled={inputsDisabled}
                    />
                  </>
                )}
                <NumberInput
                  label="Supakuotos siuntos svoris (kg)"
                  description={`Sverk kartu su pakuote. ${deliveryType === 'locker' ? 'Paštomatui — iki 20 kg.' : 'Kurjeriui — iki 31,5 kg.'}`}
                  value={weightKg}
                  onChange={setWeightKg}
                  min={0.001}
                  max={deliveryType === 'locker' ? 20 : 31.5}
                  decimalScale={3}
                  decimalSeparator=","
                  allowNegative={false}
                  required
                  disabled={inputsDisabled}
                />
                {production && (
                  <Checkbox
                    label="Suprantu, kad siunta bus užregistruota tikroje DPD paskyroje"
                    description="Tai galioja ir kuriant siuntą iš testinio parduotuvės užsakymo."
                    checked={confirmProduction}
                    onChange={(event) => setConfirmProduction(event.currentTarget.checked)}
                    disabled={disabled || busy || needsStatusCheck}
                    required
                  />
                )}
                {request.current && !needsStatusCheck && (
                  <Text size="sm" c="dimmed">
                    Siuntos įrašo dar nėra. Pakartojimas naudos tą pačią užklausą ir tuos pačius
                    duomenis.
                  </Text>
                )}
                <Button type="submit" loading={busy} disabled={createDisabled}>
                  {request.current ? 'Pakartoti tą pačią užklausą' : 'Sukurti DPD siuntą'}
                </Button>
              </Stack>
            </form>
          ))}
        {error && <Alert color="red">{error}</Alert>}
        {needsStatusCheck && (
          <Text size="sm">
            Prieš tęsiant reikia atnaujinti siuntos būseną. Užklausa galėjo būti priimta.
          </Text>
        )}
        <Button variant="default" onClick={load} loading={loading} disabled={disabled || busy}>
          Atnaujinti DPD būseną
        </Button>
      </Stack>
    </Paper>
  );
}
