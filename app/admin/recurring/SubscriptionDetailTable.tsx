'use client';

import { Stack, Table, Text } from '@mantine/core';
import type { ReactNode } from 'react';

/** Keep detail columns readable without widening the subscription modal. */
export function SubscriptionDetailTable({
  label,
  minWidth = 1000,
  children,
}: {
  label: string;
  minWidth?: number;
  children: ReactNode;
}) {
  return (
    <Stack gap="xs" miw={0}>
      <Text size="xs" c="dimmed" hiddenFrom="md">
        Lentelę galite slinkti į šonus.
      </Text>
      <Table.ScrollContainer
        minWidth={minWidth}
        type="native"
        w="100%"
        role="region"
        aria-label={`${label}: slenkama lentelė`}
        tabIndex={0}
      >
        <Table
          striped
          highlightOnHover
          aria-label={label}
          styles={{
            table: { wordBreak: 'normal', overflowWrap: 'normal' },
            th: { whiteSpace: 'nowrap' },
            td: { verticalAlign: 'top' },
          }}
        >
          {children}
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
