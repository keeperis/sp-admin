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
import { documentKinds, orderStatusLabels, type ShopOrderView } from '@/lib/shop/commerce-contract';

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
export function OrdersPanel() {
  const [orders, setOrders] = useState<ShopOrderView[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [selected, setSelected] = useState<ShopOrderView | null>(null);
  const [confirming, setConfirming] = useState(false);
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
        confirmTestPayment: true,
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
          <Title order={2}>Testiniai užsakymai</Title>
          <Text size="sm" c="dimmed">
            Rodomi 50 naujausių užsakymų ir 50 atsisakymo prašymų.
          </Text>
        </div>
        <Button variant="default" loading={busy} onClick={load}>
          Atnaujinti užsakymus
        </Button>
      </Group>
      <Alert color="yellow">
        Šiame sąraše nėra tikrų pardavimų. „Stripe“ būseną patvirtina serveris, pavedimo gavimą
        galima imituoti rankiniu būdu. Prekių likučiai nerezervuojami, sąskaitos ir laiškai
        nesiunčiami.
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
                  {o.paymentMethod === 'card' ? 'Stripe TEST' : 'Pavedimas · TEST'}
                </Table.Td>
                <Table.Td>{euros(o.totalCents)}</Table.Td>
                <Table.Td>
                  <Badge color={o.status === 'paid' ? 'teal' : 'yellow'} variant="light">
                    {orderStatusLabels[o.status]}
                  </Badge>
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
                    onClick={() => {
                      setConfirming(false);
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
            setSelected(null);
          }
        }}
        title={selected?.number}
        size="lg"
      >
        {selected && (
          <Stack>
            <Badge color={selected.status === 'paid' ? 'teal' : 'yellow'}>
              {orderStatusLabels[selected.status]}
            </Badge>
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
                ? 'Stripe TEST'
                : `Pavedimas · ${selected.bank.beneficiaryName || 'Gavėjas nenurodytas'} · ${selected.bank.iban || 'IBAN nenurodytas'}`}
            </Text>
            {selected.paidAt && <Text size="sm">Apmokėta: {date(selected.paidAt)}</Text>}
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
                <Alert color="yellow" title="Patvirtinti testinį apmokėjimą?">
                  Imituojamas tik šio užsakymo pavedimo gavimas. Tikras bankinis mokėjimas
                  neatliekamas.
                  <Group mt="sm">
                    <Button color="teal" loading={busy} onClick={markPaid}>
                      Taip, imituoti gavimą
                    </Button>
                    <Button variant="default" disabled={busy} onClick={() => setConfirming(false)}>
                      Atšaukti imitavimą
                    </Button>
                  </Group>
                </Alert>
              ) : (
                <Button color="teal" onClick={() => setConfirming(true)}>
                  Imituoti pavedimo gavimą
                </Button>
              ))}
            {error && <Alert color="red">{error}</Alert>}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
