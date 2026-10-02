'use client';

import { Button, Code, Stack, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import styles from './RecurringAdminPage.module.css';

export type ManualTransfer = {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: string;
  startDate: string;
  age: string;
};

export function ManualTransferList({
  transfers,
  loadingId,
  onMarkPaid,
}: {
  transfers: ManualTransfer[];
  loadingId: string | null;
  onMarkPaid: (id: string) => void;
}) {
  return (
    <Stack gap="md" miw={0}>
      {transfers.map((transfer) => (
        <Stack component="article" key={transfer.id} className={styles.transfer} gap="sm">
          <div>
            <Text size="sm" fw={600}>
              {transfer.customerName}
            </Text>
            <Text size="xs" c="dimmed">
              {transfer.customerEmail}
            </Text>
          </div>
          <dl className={styles.transferFacts}>
            <div>
              <dt>Suma</dt>
              <dd>{transfer.amount}</dd>
            </div>
            <div>
              <dt>Abonemento pradžia</dt>
              <dd>{transfer.startDate}</dd>
            </div>
            <div>
              <dt>Laukia įskaitymo</dt>
              <dd>{transfer.age}</dd>
            </div>
          </dl>
          <div>
            <Text size="xs" c="dimmed">
              Užsakymo ID
            </Text>
            <Code className={styles.purchaseId}>{transfer.id}</Code>
          </div>
          <Button
            size="xs"
            fullWidth
            leftSection={<IconCheck size={14} />}
            loading={loadingId === transfer.id}
            onClick={() => onMarkPaid(transfer.id)}
          >
            Pažymėti apmokėta
          </Button>
        </Stack>
      ))}
    </Stack>
  );
}
