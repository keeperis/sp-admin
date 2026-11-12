'use client';

import { Alert, Button, Divider, Group, Select, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { ShopCategory, ShopProduct } from '@/lib/shop/contract';

export function CategoryDeletion({
  category,
  categories,
  products,
  busy,
  onDelete,
}: {
  category: ShopCategory;
  categories: ShopCategory[];
  products: ShopProduct[];
  busy: boolean;
  onDelete: (replacementCategoryId?: string) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [replacement, setReplacement] = useState<string | null>(null);
  const assigned = products.filter((product) => product.category === category.id);
  const hasPublished = assigned.some((product) => product.status === 'published');
  const targets = categories
    .filter((item) => item.id !== category.id && (!hasPublished || item.active))
    .sort((a, b) => a.order - b.order);
  const needsReplacement = assigned.length > 0;
  const validReplacement = targets.some((item) => item.id === replacement);

  return (
    <Stack gap="md" mt="xl">
      <Divider />
      {!confirming ? (
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconTrash size={16} />}
          disabled={busy}
          onClick={() => setConfirming(true)}
          style={{ alignSelf: 'flex-start' }}
        >
          Ištrinti kategoriją
        </Button>
      ) : (
        <Stack gap="md">
          <Alert color="red" title={`Ištrinti kategoriją „${category.label}“?`}>
            Kategorija bus ištrinta visam laikui. Produktai, užsakymai ir nuotraukos nebus trinami.
          </Alert>
          {needsReplacement && (
            <>
              <Text size="sm">
                Kategorijai priskirta produktų: {assigned.length}. Pasirinkite, kur juos perkelti.
              </Text>
              {targets.length ? (
                <Select
                  label="Perkelti produktus į kategoriją"
                  placeholder="Pasirinkite kitą kategoriją"
                  required
                  searchable
                  value={replacement}
                  disabled={busy}
                  onChange={setReplacement}
                  data={targets.map((item) => ({
                    value: item.id,
                    label: `${item.label}${item.active ? '' : ' (paslėpta)'}`,
                  }))}
                  description={
                    hasPublished
                      ? 'Kad paskelbti produktai liktų matomi, pasirinkite rodomą kategoriją.'
                      : undefined
                  }
                />
              ) : (
                <Alert color="yellow">
                  Pirmiausia sukurkite kitą{hasPublished ? ' rodomą' : ''} kategoriją, į kurią būtų
                  galima perkelti produktus.
                </Alert>
              )}
            </>
          )}
          <Group justify="space-between">
            <Button variant="default" disabled={busy} onClick={() => setConfirming(false)}>
              Palikti kategoriją
            </Button>
            <Button
              color="red"
              loading={busy}
              disabled={needsReplacement && !validReplacement}
              onClick={() => onDelete(needsReplacement ? replacement! : undefined)}
            >
              {needsReplacement ? 'Perkelti produktus ir ištrinti' : 'Ištrinti visam laikui'}
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
