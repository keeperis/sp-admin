'use client';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import {
  documentKinds,
  fulfillmentStatusLabels,
  orderStatusLabels,
  type ShopOrderView,
} from '@/lib/shop/commerce-contract';
import {
  bankPaymentConfirmation,
  isLiveCommerce,
  orderStatusLabel,
  paymentLabel,
} from '@/lib/shop/commerce-mode';
import { type DpdTracking, OrderDpdShipment } from './OrderDpdShipment';
import { OrderFulfillment } from './OrderFulfillment';
import { OrderNotifications } from './OrderNotifications';

type Withdrawal = {
  _id: string;
  orderNumber: string;
  name: string;
  email: string;
  items: string;
  createdAt: string;
};
const euros = (cents: number) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const date = (value: string) => new Date(value).toLocaleString('lt-LT');
const statusColor = (status: ShopOrderView['status']) =>
  status === 'paid'
    ? 'teal'
    : status === 'payment_review'
      ? 'red'
      : status === 'awaiting_payment'
        ? 'yellow'
        : 'gray';
export function OrdersPanel() {
  const [orders, setOrders] = useState<ShopOrderView[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [selected, setSelected] = useState<ShopOrderView | null>(null);
  const [dpdTracking, setDpdTracking] = useState<(DpdTracking & { orderId: string }) | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingCancellation, setConfirmingCancellation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>('all');
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const data = await shopRequest('orders');
      setOrders(data.orders);
      setWithdrawals(data.withdrawals);
      setSelected((current) =>
        current
          ? data.orders.find((order: ShopOrderView) => order.id === current.id) || current
          : null,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function markPaid() {
    if (!selected || !confirming || busy) return;
    setBusy(true);
    setError('');
    try {
      const order = await shopRequest(`orders/${selected.id}/mark-paid`, 'POST', {
        ...bankPaymentConfirmation(selected.mode),
      });
      setSelected(order);
      setConfirming(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancelOrder() {
    if (!selected || !confirmingCancellation || busy || selected.status !== 'awaiting_payment')
      return;
    setBusy(true);
    setError('');
    try {
      const order = await shopRequest(`orders/${selected.id}/cancel`, 'POST', {
        confirmCancellation: true,
      });
      setSelected(order);
      setConfirmingCancellation(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function updateOrder(order: ShopOrderView) {
    setOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
    setSelected((current) => (current?.id === order.id ? order : current));
  }
  const filtered = orders.filter(
    (o) =>
      (status === 'all' || o.status === status) &&
      `${o.number} ${o.customer.name} ${o.customer.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Užsakymai</Title>
          <Text size="sm" c="dimmed">
            Rodomi 50 naujausių užsakymų ir 50 atsisakymo prašymų.
          </Text>
        </div>
        <Button variant="default" loading={busy} onClick={load}>
          Atnaujinti užsakymus
        </Button>
      </Group>
      <Alert color="yellow">
        Kiekvieno užsakymo mokėjimas pažymėtas TEST arba LIVE. TEST užsakymai yra bandomieji; LIVE
        užsakymai — tikri pardavimai. „Stripe“ būseną patvirtina serveris, o LIVE pavedimo gavimą
        patvirtink tik patikrinęs lėšas banke. Užsakymai rezervuoja prekių likutį iki nurodyto
        termino. Vykdymas ir laiškų būsenos pateikiami užsakymo viduje. Sąskaitos ir pinigų
        grąžinimas tvarkomi atskirai.
      </Alert>
      {error && <Alert color="red">{error}</Alert>}
      <Group>
        <TextInput
          aria-label="Ieškoti užsakymo"
          placeholder="Numeris, vardas, el. paštas…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <Select
          aria-label="Užsakymo būsena"
          value={status}
          onChange={setStatus}
          allowDeselect={false}
          data={[
            { value: 'all', label: 'Visos būsenos' },
            ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label })),
          ]}
        />
        {busy && <Loader size="sm" />}
      </Group>
      <Table.ScrollContainer minWidth={780}>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              {['Numeris / data', 'Pirkėjas', 'Mokėjimas', 'Suma', 'Būsena', ''].map((label) => (
                <Table.Th key={label}>{label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((o) => (
              <Table.Tr key={o.id}>
                <Table.Td>
                  <Text size="sm" fw={600}>
                    {o.number}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {date(o.createdAt)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{o.customer.name}</Text>
                  <Text size="xs" c="dimmed">
                    {o.customer.email}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {paymentLabel(o.paymentMethod, o.mode)}
                  {isLiveCommerce(o.mode) && (
                    <Text size="xs" c="teal">
                      LIVE · tikras mokėjimas
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{euros(o.totalCents)}</Table.Td>
                <Table.Td>
                  <Badge color={statusColor(o.status)} variant="light">
                    {orderStatusLabel(o.status, o.mode)}
                  </Badge>
                  {o.status === 'paid' && (
                    <Text size="xs" c="dimmed" mt={4}>
                      {fulfillmentStatusLabels[o.fulfillmentStatus]}
                    </Text>
                  )}
                  {o.withdrawalRequestedAt && (
                    <Text size="xs" c="orange">
                      Gautas atsisakymo prašymas
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="subtle"
                    disabled={busy}
                    onClick={() => {
                      setConfirming(false);
                      setConfirmingCancellation(false);
                      setSelected(o);
                    }}
                  >
                    Peržiūrėti
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {!filtered.length && <Text c="dimmed">Užsakymų dar nėra arba jie neatitinka filtro.</Text>}
      <Title order={3}>Sutarties atsisakymo prašymai</Title>
      <Text size="sm" c="dimmed">
        Prašymai nepakeičia apmokėjimo būsenos ir automatiškai negrąžina pinigų. Patikrink užsakymą
        bei pirkėjo tapatybę.
      </Text>
      {!withdrawals.length ? (
        <Text c="dimmed">Prašymų dar nėra.</Text>
      ) : (
        <Table.ScrollContainer minWidth={650}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Gauta / užsakymas</Table.Th>
                <Table.Th>Pirkėjas</Table.Th>
                <Table.Th>Prekės / prašymas</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {withdrawals.map((w) => (
                <Table.Tr key={w._id}>
                  <Table.Td>
                    {date(w.createdAt)}
                    <Text size="sm">{w.orderNumber}</Text>
                  </Table.Td>
                  <Table.Td>
                    {w.name}
                    <Text size="sm">{w.email}</Text>
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {w.items}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      <Modal
        opened={!!selected}
        onClose={() => {
          if (!busy) {
            setConfirming(false);
            setConfirmingCancellation(false);
            setSelected(null);
          }
        }}
        title={selected?.number}
        size="lg"
      >
        {selected && (
          <Stack>
            <Badge color={statusColor(selected.status)}>
              {orderStatusLabel(selected.status, selected.mode)}
            </Badge>
            <Text fw={600} c={isLiveCommerce(selected.mode) ? 'teal' : 'orange'}>
              {isLiveCommerce(selected.mode)
                ? 'LIVE · tikras užsakymas'
                : 'TEST · bandomasis užsakymas'}
            </Text>
            {selected.status === 'payment_review' && (
              <Alert color="red" title="Mokėjimą reikia patikrinti">
                Užsakymas automatiškai nepatvirtintas. Patikrink mokėjimo būseną, sumą ir prekių
                likutį prieš vykdydamas užsakymą. Pirkėjas neturi mokėti pakartotinai.
              </Alert>
            )}
            {selected.status === 'awaiting_payment' && selected.reservationExpiresAt && (
              <Text size="sm">Prekės rezervuotos iki: {date(selected.reservationExpiresAt)}</Text>
            )}
            <Text>
              {selected.customer.name} · {selected.customer.email} ·{' '}
              {selected.customer.phone || 'Telefonas nenurodytas'}
            </Text>
            <Text size="sm">
              {selected.delivery.label}: {selected.delivery.location}
            </Text>
            {selected.lines.map((l) => (
              <Group key={l.id} justify="space-between">
                <Text>
                  {l.name} × {l.quantity}
                </Text>
                <Text>{euros(l.totalCents)}</Text>
              </Group>
            ))}
            <Text>Pristatymas: {euros(selected.shippingCents)}</Text>
            <Text fw={700}>Iš viso: {euros(selected.totalCents)}</Text>
            <Text size="sm">Mokėjimo paskirtis: {selected.paymentReference}</Text>
            <Text size="sm">
              {selected.paymentMethod === 'card'
                ? paymentLabel(selected.paymentMethod, selected.mode)
                : `Pavedimas · ${selected.bank.beneficiaryName || 'Gavėjas nenurodytas'} · ${selected.bank.iban || 'IBAN nenurodytas'}`}
            </Text>
            {selected.paidAt && <Text size="sm">Apmokėta: {date(selected.paidAt)}</Text>}
            {selected.status === 'paid' &&
              ['parcel', 'courier'].includes(selected.delivery.method) && (
                <OrderDpdShipment
                  key={`dpd:${selected.id}`}
                  order={selected}
                  disabled={busy}
                  onTrackingReady={(tracking) =>
                    setDpdTracking({ ...tracking, orderId: selected.id })
                  }
                />
              )}
            {selected.status === 'paid' && (
              <OrderFulfillment
                key={selected.id}
                order={selected}
                disabled={busy}
                suggestedTracking={dpdTracking?.orderId === selected.id ? dpdTracking : null}
                onChange={updateOrder}
              />
            )}
            <OrderNotifications
              key={`notifications:${selected.id}`}
              orderId={selected.id}
              version={`${selected.status}:${selected.fulfillmentRevision}`}
            />
            <Text size="sm">Dokumentai patvirtinti: {date(selected.acceptedAt)}</Text>
            {documentKinds.map((k) => (
              <details key={k}>
                <summary>
                  {selected.documents[k].title} · {selected.documents[k].version}
                </summary>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} mt="sm">
                  {selected.documents[k].body}
                </Text>
              </details>
            ))}
            {selected.paymentMethod === 'bank_transfer' &&
              selected.status === 'awaiting_payment' &&
              (confirming ? (
                <Alert
                  color="yellow"
                  title={
                    isLiveCommerce(selected.mode)
                      ? 'Patvirtinti faktiškai gautą pavedimą?'
                      : 'Patvirtinti testinį apmokėjimą?'
                  }
                >
                  {isLiveCommerce(selected.mode)
                    ? `Patikrink banko išraše, kad gauta ${euros(selected.totalCents)}, o mokėjimo paskirtis yra ${selected.paymentReference}. Patvirtinimas pažymės šį užsakymą kaip apmokėtą ir leis pradėti jo vykdymą.`
                    : 'Imituojamas tik šio užsakymo pavedimo gavimas. Tikras bankinis mokėjimas neatliekamas.'}
                  <Group mt="sm">
                    <Button color="teal" loading={busy} onClick={markPaid}>
                      {isLiveCommerce(selected.mode)
                        ? 'Taip, lėšos tikrai gautos'
                        : 'Taip, imituoti gavimą'}
                    </Button>
                    <Button variant="default" disabled={busy} onClick={() => setConfirming(false)}>
                      {isLiveCommerce(selected.mode)
                        ? 'Grįžti nepatvirtinus'
                        : 'Atšaukti imitavimą'}
                    </Button>
                  </Group>
                </Alert>
              ) : (
                <Button
                  color="teal"
                  disabled={busy || confirmingCancellation}
                  onClick={() => setConfirming(true)}
                >
                  {isLiveCommerce(selected.mode)
                    ? 'Patvirtinti gautą pavedimą'
                    : 'Imituoti pavedimo gavimą'}
                </Button>
              ))}
            {selected.status === 'awaiting_payment' &&
              (confirmingCancellation ? (
                <Alert color="yellow" title="Atšaukti neapmokėtą užsakymą?">
                  Prekių rezervacija bus atlaisvinta. Šio užsakymo apmokėti nebegalima.
                  <Group mt="sm">
                    <Button color="red" loading={busy} onClick={cancelOrder}>
                      Taip, atšaukti užsakymą
                    </Button>
                    <Button
                      variant="default"
                      disabled={busy}
                      onClick={() => setConfirmingCancellation(false)}
                    >
                      Tęsti užsakymą
                    </Button>
                  </Group>
                </Alert>
              ) : (
                <Button
                  color="red"
                  variant="outline"
                  disabled={busy || confirming}
                  onClick={() => setConfirmingCancellation(true)}
                >
                  Atšaukti užsakymą
                </Button>
              ))}
            {error && <Alert color="red">{error}</Alert>}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
