'use client';

import { Alert, Button, Divider, Group, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { ShopCollection, ShopProduct } from '@/lib/shop/contract';

export function CollectionDeletion({
  collection,
  products,
  busy,
  onDelete,
}: {
  collection: ShopCollection;
  products: ShopProduct[];
  busy: boolean;
  onDelete: () => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const assigned = products.filter((product) => product.collectionIds?.includes(collection.id));
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
          Ištrinti kolekciją
        </Button>
      ) : (
        <Stack gap="md">
          <Alert color="red" title={`Ištrinti kolekciją „${collection.label}“?`}>
            Kolekcija bus ištrinta visam laikui. Produktai, jų likučiai, kategorijos, kitos
            kolekcijos, nuotraukos ir užsakymai nebus keičiami ar trinami.
          </Alert>
          <Text size="sm">
            Iš šios kolekcijos bus atskirta produktų: {assigned.length}. Jie liks parduotuvėje pagal
            savo paskelbimo būseną.
          </Text>
          <Group justify="space-between">
            <Button variant="default" disabled={busy} onClick={() => setConfirming(false)}>
              Palikti kolekciją
            </Button>
            <Button color="red" loading={busy} disabled={busy} onClick={() => onDelete()}>
              Ištrinti kolekciją visam laikui
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
