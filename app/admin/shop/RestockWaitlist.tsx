'use client';

import { Alert, Anchor, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';

type ProductDemand = { productId: string; name: string | null; waiting: number };
type WaitlistPage = (
  | { products: ProductDemand[] }
  | { subscribers: { email: string; createdAt: string }[] }
) & { hasMore: boolean };

const registrationDate = new Intl.DateTimeFormat('lt-LT', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Vilnius',
});

function productName(product: ProductDemand) {
  return product.name ?? `Pašalinta prekė (${product.productId})`;
}

function WaitlistResults({
  path,
  page,
  onPage,
  onSelect,
  onRetry,
}: {
  path: string;
  page: number;
  onPage: (value: number) => void;
  onSelect: (product: ProductDemand) => void;
  onRetry: () => void;
}) {
  const [data, setData] = useState<WaitlistPage | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    shopRequest(path)
      .then((result: WaitlistPage) => {
        if (active) setData(result);
      })
      .catch((problem: Error) => {
        if (active) setError(problem.message);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (error)
    return (
      <Alert color="red" title="Laukiančiųjų sąrašo įkelti nepavyko">
        <Text size="sm">{error}</Text>
        <Button mt="sm" variant="light" onClick={onRetry}>
          Bandyti dar kartą
        </Button>
      </Alert>
    );
  if (!data) return <Loader size="sm" aria-label="Kraunamas sąrašas" />;
  return (
    <Stack>
      {'products' in data ? (
        data.products.length ? (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Prekė</Table.Th>
                <Table.Th ta="right">Laukia</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.products.map((product) => (
                <Table.Tr key={product.productId}>
                  <Table.Td>
                    <Anchor
                      component="button"
                      type="button"
                      ta="left"
                      py={6}
                      style={{ overflowWrap: 'anywhere' }}
                      onClick={() => onSelect(product)}
                    >
                      {productName(product)}
                    </Anchor>
                  </Table.Td>
                  <Table.Td ta="right">{product.waiting}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed">
            {page > 1
              ? 'Šiame puslapyje prekių nebėra.'
              : 'Šiuo metu prekių papildymo niekas nelaukia.'}
          </Text>
        )
      ) : data.subscribers.length ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>El. paštas</Table.Th>
              <Table.Th>Laukia nuo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.subscribers.map((subscriber) => (
              <Table.Tr key={subscriber.email}>
                <Table.Td style={{ overflowWrap: 'anywhere' }}>{subscriber.email}</Table.Td>
                <Table.Td>
                  <time dateTime={subscriber.createdAt}>
                    {registrationDate.format(new Date(subscriber.createdAt))}
                  </time>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text c="dimmed">
          {page > 1
            ? 'Šiame puslapyje laukiančiųjų nebėra.'
            : 'Šios prekės papildymo šiuo metu niekas nelaukia.'}
        </Text>
      )}
      {(page > 1 || data.hasMore) && (
        <Group gap="sm">
          <Button
            variant="default"
            size="xs"
            disabled={page === 1}
            onClick={() => onPage(page - 1)}
          >
            Ankstesnis
          </Button>
          <Text size="sm">{page} psl.</Text>
          <Button
            variant="default"
            size="xs"
            disabled={!data.hasMore}
            onClick={() => onPage(page + 1)}
          >
            Kitas
          </Button>
        </Group>
      )}
    </Stack>
  );
}

export function RestockWaitlist({ version }: { version: number }) {
  const [selected, setSelected] = useState<ProductDemand | null>(null);
  const [rankingPage, setRankingPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [subscriberPage, setSubscriberPage] = useState(1);
  const page = selected ? subscriberPage : rankingPage;
  const path = `restock-waitlist${selected ? `/${encodeURIComponent(selected.productId)}` : ''}?page=${page}`;
  return (
    <Stack>
      {selected && (
        <Button variant="default" size="xs" w="fit-content" onClick={() => setSelected(null)}>
          Grįžti prie prekių
        </Button>
      )}
      <Title order={3}>{selected ? productName(selected) : 'Laukiamiausios prekės'}</Title>
      <WaitlistResults
        key={`${version}:${attempt}:${path}`}
        path={path}
        page={page}
        onRetry={() => setAttempt((value) => value + 1)}
        onPage={selected ? setSubscriberPage : setRankingPage}
        onSelect={(product) => {
          setSelected(product);
          setSubscriberPage(1);
        }}
      />
    </Stack>
  );
}
