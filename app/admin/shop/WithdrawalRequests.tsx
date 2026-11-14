'use client';
import { Alert, Anchor, Badge, Button, Group, Stack, Table, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import type { ShopNotificationView } from '@/lib/shop/commerce-contract';

type WithdrawalEmail = Pick<ShopNotificationView, 'status' | 'attempts' | 'sentAt' | 'lastError'>;
export type Withdrawal = {
  _id: string;
  orderNumber: string;
  name: string;
  email: string;
  items: string;
  createdAt: string;
  emailNotifications?: { buyer: WithdrawalEmail; seller: WithdrawalEmail };
};

const emailLabels: Record<WithdrawalEmail['status'], string> = {
  pending: 'Laukia siuntimo',
  sending: 'Siunčiamas',
  sent: 'Išsiųstas',
  failed: 'Siuntimas nepavyko; bus kartojamas',
  dead: 'Siuntimą reikia pakartoti',
  preview: 'Tik peržiūra, neišsiųstas',
};
const date = (value: string) =>
  new Date(value).toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius' });

export function WithdrawalRequests({
  withdrawals,
  busy,
  availableOrderNumbers,
  onOpenOrder,
  onRetry,
}: {
  withdrawals: Withdrawal[];
  busy: boolean;
  availableOrderNumbers: string[];
  onOpenOrder: (orderNumber: string) => void;
  onRetry: (withdrawalId: string, recipient: 'buyer' | 'seller') => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const filtered = withdrawals.filter((request) =>
    `${request._id} ${request.orderNumber} ${request.name} ${request.email} ${request.items}`
      .toLocaleLowerCase('lt-LT')
      .includes(query.trim().toLocaleLowerCase('lt-LT')),
  );
  return (
    <Stack>
      <Alert color="blue" title="Gauti sutarties atsisakymai">
        Čia užregistruojami pirkėjų pateikti atsisakymai. Pirkėjui siunčiamas gavimo patvirtinimas,
        parduotuvei — pranešimas. Tai nėra pinigų grąžinimo patvirtinimas: prekių grąžinimą ir lėšų
        grąžinimą sutvarkyk atskirai, susisiekęs su pirkėju.
      </Alert>
      <TextInput
        label="Ieškoti atsisakymo"
        placeholder="Užsakymo arba prašymo numeris, vardas, el. paštas…"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {!filtered.length ? (
        <Text c="dimmed">
          {withdrawals.length ? 'Paiešką atitinkančių prašymų nėra.' : 'Prašymų dar nėra.'}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={950}>
          <Table verticalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Gauta / užsakymas</Table.Th>
                <Table.Th>Pirkėjas</Table.Th>
                <Table.Th>Grąžinamos prekės</Table.Th>
                <Table.Th>Laiškų būsena</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((request) => (
                <Table.Tr key={request._id}>
                  <Table.Td style={{ minWidth: 200 }}>
                    <Text size="sm">{date(request.createdAt)}</Text>
                    <Text size="sm" fw={600}>
                      {request.orderNumber || 'Užsakymo numeris nenurodytas'}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
                      Prašymo nr. {request._id}
                    </Text>
                    {availableOrderNumbers.includes(request.orderNumber) && (
                      <Button
                        size="xs"
                        variant="subtle"
                        disabled={busy}
                        onClick={() => onOpenOrder(request.orderNumber)}
                      >
                        Peržiūrėti užsakymą
                      </Button>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{request.name}</Text>
                    <Anchor href={`mailto:${request.email}`} size="sm">
                      {request.email}
                    </Anchor>
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {request.items || 'Prekės nenurodytos'}
                  </Table.Td>
                  <Table.Td style={{ minWidth: 265 }}>
                    {request.emailNotifications ? (
                      <Stack gap="md">
                        {(['buyer', 'seller'] as const).map((recipient) => {
                          const notification = request.emailNotifications![recipient];
                          const failed = ['failed', 'dead'].includes(notification.status);
                          return (
                            <Stack key={recipient} gap={4}>
                              <Group gap="xs">
                                <Text size="sm" fw={500}>
                                  {recipient === 'buyer' ? 'Pirkėjui' : 'Parduotuvei'}
                                </Text>
                                <Badge
                                  size="sm"
                                  variant="light"
                                  color={
                                    failed
                                      ? 'red'
                                      : notification.status === 'sent'
                                        ? 'teal'
                                        : 'gray'
                                  }
                                >
                                  {emailLabels[notification.status]}
                                </Badge>
                              </Group>
                              {notification.sentAt && (
                                <Text size="xs" c="dimmed">
                                  {date(notification.sentAt)}
                                </Text>
                              )}
                              {failed && (
                                <>
                                  <Text size="xs" c="red">
                                    {notification.lastError || 'Nepavyko išsiųsti laiško.'}
                                  </Text>
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    disabled={busy}
                                    onClick={() => void onRetry(request._id, recipient)}
                                  >
                                    Kartoti siuntimą
                                  </Button>
                                </>
                              )}
                            </Stack>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Šio ankstesnio prašymo laiškų būsenos neužregistruotos.
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
