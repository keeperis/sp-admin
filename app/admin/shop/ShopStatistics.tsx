'use client';
import { Alert, Paper, SimpleGrid, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import styles from './ShopStatistics.module.css';

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
export function ShopStatistics({
  version,
  productFilterDisabled,
  onOutOfStock,
  onPendingOrders,
}: {
  version: string;
  productFilterDisabled: boolean;
  onOutOfStock: () => void;
  onPendingOrders: () => void;
}) {
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
      onSelect: onOutOfStock,
      disabled: productFilterDisabled,
    },
    {
      label: 'Laukia vykdymo',
      value: data?.pendingOrders ?? '—',
      detail: 'Apmokėti užsakymai',
      onSelect: onPendingOrders,
    },
  ];
  return (
    <>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm">
        {cards.map((card) => {
          const content = (
            <>
              <Text component="span" display="block" size="xs" c="dimmed">
                {card.label}
              </Text>
              <Text component="span" display="block" size="xl" fw={600} my={4}>
                {card.value}
              </Text>
              <Text component="span" display="block" size="xs" c="dimmed">
                {card.detail}
              </Text>
            </>
          );
          return card.onSelect ? (
            <Paper
              key={card.label}
              component="button"
              type="button"
              withBorder
              radius="md"
              p="md"
              className={styles.linkCard}
              disabled={card.disabled}
              onClick={card.onSelect}
            >
              {content}
            </Paper>
          ) : (
            <Paper key={card.label} withBorder radius="md" p="md">
              {content}
            </Paper>
          );
        })}
      </SimpleGrid>
      {error && (
        <Alert color="orange" title="Statistikos atnaujinti nepavyko">
          {error}
        </Alert>
      )}
    </>
  );
}
