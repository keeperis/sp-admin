'use client';
import { Alert, Paper, SimpleGrid, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';

type Statistics = {
  today: { orderCount: number; revenueCents: number };
  month: { orderCount: number; revenueCents: number };
  activeProducts: number;
  outOfStockProducts: number;
  pendingOrders: number;
};
const euros = (cents: number) =>
  new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
export function ShopStatistics({ version }: { version: string }) {
  const [data, setData] = useState<Statistics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!version) return;
    let active = true;
    void shopRequest('statistics')
      .then((next) => {
        if (active) {
          setData(next);
          setError('');
        }
      })
      .catch((problem) => {
        if (active) setError(problem.message);
      });
    return () => {
      active = false;
    };
  }, [version]);
  const cards = [
    {
      label: 'Pardavimai šiandien',
      value: data ? euros(data.today.revenueCents) : '—',
      detail: data ? `${data.today.orderCount} apmokėtų užsakymų` : 'Kraunama…',
    },
    {
      label: 'Šį mėnesį',
      value: data ? euros(data.month.revenueCents) : '—',
      detail: data ? `${data.month.orderCount} apmokėtų užsakymų` : 'Kraunama…',
    },
    {
      label: 'Aktyvios prekės',
      value: data?.activeProducts ?? '—',
      detail: 'Paskelbtos parduotuvėje',
    },
    {
      label: 'Be likučio',
      value: data?.outOfStockProducts ?? '—',
      detail: 'Paskelbtos, likutis 0',
    },
    { label: 'Laukia vykdymo', value: data?.pendingOrders ?? '—', detail: 'Apmokėti užsakymai' },
  ];
  return (
    <>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm">
        {cards.map((card) => (
          <Paper key={card.label} withBorder radius="md" p="md">
            <Text size="xs" c="dimmed">
              {card.label}
            </Text>
            <Text size="xl" fw={600} my={4}>
              {card.value}
            </Text>
            <Text size="xs" c="dimmed">
              {card.detail}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
      {error && (
        <Alert color="orange" title="Statistikos atnaujinti nepavyko">
          {error}
        </Alert>
      )}
    </>
  );
}
