'use client';

import { Accordion, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function SubscriptionDetailSections({
  children,
  value,
  onChange,
}: {
  children: ReactNode;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Accordion multiple variant="separated" order={5} value={value} onChange={onChange}>
      {children}
    </Accordion>
  );
}

export function SubscriptionDetailSection({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Accordion.Item value={value}>
      <Accordion.Control>
        <Title component="span" order={5}>
          {title}
        </Title>
      </Accordion.Control>
      <Accordion.Panel>{children}</Accordion.Panel>
    </Accordion.Item>
  );
}
