'use client';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Tabs,
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
import { DpdHandover } from './DpdHandover';
import { DpdPickups } from './DpdPickups';
import { OrderDpdQuickAction } from './OrderDpdQuickAction';
import { type DpdTracking, OrderDpdShipment } from './OrderDpdShipment';
import { OrderFulfillment } from './OrderFulfillment';
import styles from './OrderList.module.css';
import { OrderListAction } from './OrderListAction';
import { OrderNotifications } from './OrderNotifications';
import { OrderPaymentQuickAction } from './OrderPaymentQuickAction';
import { OrderTrackingStatus } from './OrderTrackingStatus';
import { type Withdrawal, WithdrawalRequests } from './WithdrawalRequests';

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
export function OrdersPanel({ onChanged }: { onChanged: () => void }) {
  const [operation, setOperation] = useState<'pickup' | 'handover' | null>(null);
  const [fulfillment, setFulfillment] = useState<string | null>('all');
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
  const [activeSection, setActiveSection] = useState<string | null>('orders');
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const data = await shopRequest('orders');
      setOrders(data.orders);
      setWithdrawals(data.withdrawals);
      onChanged();
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
  }, [onChanged]);
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
      onChanged();
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
      onChanged();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function updateOrder(order: ShopOrderView) {
    onChanged();
    const merge = (current: ShopOrderView): ShopOrderView => ({
      ...order,
      ...(order.dpdTracking === undefined ? { dpdTracking: current.dpdTracking } : {}),
    });
    setOrders((current) => current.map((item) => (item.id === order.id ? merge(item) : item)));
    setSelected((current) => (current?.id === order.id ? merge(current) : current));
  }
  async function retryWithdrawalEmail(id: string, recipient: 'buyer' | 'seller') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await shopRequest(
        `withdrawals/${encodeURIComponent(id)}/notifications/${recipient}/retry`,
        'POST',
        {},
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openOrder(order: ShopOrderView) {
    setConfirming(false);
    setConfirmingCancellation(false);
    setSelected(order);
  }
  const filtered = orders.filter(
    (o) =>
      (status === 'all' || o.status === status) &&
      (fulfillment === 'all' || (o.status === 'paid' && o.fulfillmentStatus === fulfillment)) &&
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
            Ruošk siuntas, spausdink etiketes ir valdyk užsakymus čia pat.
          </Text>
        </div>
        <Button variant="default" loading={busy} onClick={load}>
          Atnaujinti
        </Button>
      </Group>
      <Group>
        <Button variant="light" onClick={() => setOperation('pickup')}>
          Iškviesti kurjerį
        </Button>
        <Button color="teal" variant="light" onClick={() => setOperation('handover')}>
          Siuntos paimtos
        </Button>
      </Group>
      {error && <Alert color="red">{error}</Alert>}
      <Tabs value={activeSection} onChange={setActiveSection}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="orders">Užsakymai</Tabs.Tab>
          <Tabs.Tab
            value="withdrawals"
            rightSection={<Badge size="sm">{withdrawals.length}</Badge>}
          >
            Sutarties atsisakymai
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="orders">
          <Stack>
            <div className={styles.filters}>
              <TextInput
                aria-label="Ieškoti užsakymo"
                placeholder="Numeris, vardas, el. paštas…"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
              />
              <Select
                aria-label="Mokėjimo būsena"
                value={status}
                onChange={setStatus}
                allowDeselect={false}
                data={[
                  { value: 'all', label: 'Visi mokėjimai' },
                  ...Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label })),
                ]}
              />
              <Select
                aria-label="Vykdymo būsena"
                value={fulfillment}
                onChange={setFulfillment}
                allowDeselect={false}
                data={[
                  { value: 'all', label: 'Visas vykdymas' },
                  ...Object.entries(fulfillmentStatusLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
            </div>
            {busy && <Loader size="sm" />}
            <ul className={styles.list} aria-label="Užsakymų sąrašas">
              {filtered.map((o) => (
                <li key={o.id}>
                  <Paper withBorder radius="md" p="md" className={styles.card}>
                    <div className={styles.identity}>
                      <Group justify="space-between" gap="xs">
                        <Text fw={600} size="sm">
                          {o.number}
                        </Text>
                        <Text fw={600}>{euros(o.totalCents)}</Text>
                      </Group>
                      <Text size="xs" c="dimmed" mb="sm">
                        {date(o.createdAt)}
                      </Text>
                      <Text size="sm">{o.customer.name}</Text>
                      <Text size="xs" c="dimmed">
                        {o.customer.email}
                      </Text>
                      <Text size="sm" mt="sm">
                        {o.lines.map((line) => `${line.name} × ${line.quantity}`).join(', ')}
                      </Text>
                    </div>
                    <Stack gap="xs">
                      <Badge color={statusColor(o.status)} variant="light">
                        {orderStatusLabel(o.status, o.mode)}
                      </Badge>
                      {o.status === 'paid' && (
                        <Badge
                          color={o.fulfillmentStatus === 'fulfilled' ? 'teal' : 'blue'}
                          variant="outline"
                        >
                          {fulfillmentStatusLabels[o.fulfillmentStatus]}
                        </Badge>
                      )}
                      <Text size="xs" c="dimmed">
                        {paymentLabel(o.paymentMethod, o.mode)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {o.delivery.label} · {o.delivery.location}
                      </Text>
                      {o.trackingNumber && (
                        <Text size="xs" c="dimmed">
                          DPD: {o.trackingNumber}
                        </Text>
                      )}
                      <OrderTrackingStatus tracking={o.dpdTracking} />
                      {o.withdrawalRequestedAt && (
                        <Text size="xs" c="orange">
                          Gautas atsisakymo prašymas
                        </Text>
                      )}
                    </Stack>
                    <div className={styles.actions}>
                      <OrderPaymentQuickAction order={o} disabled={busy} onChange={updateOrder} />
                      {o.status === 'paid' && ['parcel', 'courier'].includes(o.delivery.method) && (
                        <OrderDpdQuickAction order={o} disabled={busy} onChange={updateOrder} />
                      )}
                      {o.status === 'paid' && (
                        <OrderListAction order={o} disabled={busy} onChange={updateOrder} />
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        disabled={busy}
                        onClick={() => openOrder(o)}
                      >
                        Išsami peržiūra
                      </Button>
                    </div>
                  </Paper>
                </li>
              ))}
            </ul>
            {!filtered.length && (
              <Text c="dimmed">Užsakymų dar nėra arba jie neatitinka filtro.</Text>
            )}
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="withdrawals">
          <WithdrawalRequests
            withdrawals={withdrawals}
            busy={busy}
            availableOrderNumbers={orders.map((order) => order.number)}
            onOpenOrder={(number) => {
              const order = orders.find((item) => item.number === number);
              if (order) openOrder(order);
            }}
            onRetry={retryWithdrawalEmail}
          />
        </Tabs.Panel>
      </Tabs>
      <Modal
        opened={operation !== null}
        onClose={() => {
          setOperation(null);
          void load();
          onChanged();
        }}
        title={operation === 'pickup' ? 'DPD kurjerio iškvietimas' : 'Siuntų perdavimas kurjeriui'}
        size="xl"
        closeOnClickOutside={false}
      >
        {operation === 'pickup' && <DpdPickups configurationRevision={0} />}
        {operation === 'handover' && (
          <DpdHandover
            onChange={(updated) => {
              for (const order of updated) updateOrder(order);
            }}
          />
        )}
      </Modal>
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
            {selected.withdrawalRequestedAt && (
              <Alert color="orange" title="Gautas sutarties atsisakymas">
                Gauta {date(selected.withdrawalRequestedAt)}. Atsisakymo informaciją ir laiškų
                būsenas rasi skiltyje „Sutarties atsisakymai“. Pinigai automatiškai negrąžinami.
                <Button
                  mt="sm"
                  size="xs"
                  variant="light"
                  disabled={busy}
                  onClick={() => {
                    setSelected(null);
                    setActiveSection('withdrawals');
                  }}
                >
                  Atidaryti atsisakymus
                </Button>
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
                  onChange={updateOrder}
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
            <OrderTrackingStatus tracking={selected.dpdTracking} />
            <OrderNotifications
              key={`notifications:${selected.id}`}
              orderId={selected.id}
              version={`${selected.status}:${selected.fulfillmentRevision}`}
            />
            <Text size="sm">Dokumentai patvirtinti: {date(selected.acceptedAt)}</Text>
            {(selected.acceptedDocumentKinds || documentKinds).map((k) => (
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
