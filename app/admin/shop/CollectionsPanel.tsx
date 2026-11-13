'use client';

import { Badge, Button, Group, Image, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import type { ShopCollection, ShopProduct } from '@/lib/shop/contract';

export function CollectionsPanel({
  collections,
  products,
  disabled,
  onEdit,
}: {
  collections: ShopCollection[];
  products: ShopProduct[];
  disabled: boolean;
  onEdit: (collection: ShopCollection) => void;
}) {
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Text c="dimmed" size="sm">
          Produktas gali priklausyti kelioms kolekcijoms. Tvarka čia nustato jų tvarką parduotuvėje.
        </Text>
        <Button
          color="teal"
          leftSection={<IconPlus size={16} />}
          disabled={disabled}
          onClick={() =>
            onEdit({
              id: '',
              slug: '',
              label: '',
              description: '',
              active: true,
              order: Math.min(99999, Math.max(-1, ...collections.map((c) => c.order)) + 1),
              image: null,
            })
          }
        >
          Nauja kolekcija
        </Button>
      </Group>
      {!collections.length && (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">
            Kolekcijų dar nėra. Sukurk kolekciją ir priskirk jai produktus jų redagavimo lange.
          </Text>
        </Paper>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {[...collections]
          .sort((a, b) => a.order - b.order)
          .map((collection) => (
            <Paper withBorder p="lg" radius="md" key={collection.id}>
              <Stack gap="sm">
                {collection.image && (
                  <Image
                    src={collection.image.url}
                    alt={collection.image.alt}
                    h={135}
                    radius="sm"
                  />
                )}
                <Group justify="space-between">
                  <Title order={3} size="h4">
                    {collection.label}
                  </Title>
                  <Badge variant="light" color={collection.active ? 'teal' : 'gray'}>
                    {collection.active ? 'Rodoma' : 'Paslėpta'}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  /{collection.slug} · eilė {collection.order} ·{' '}
                  {products.filter((p) => p.collectionIds?.includes(collection.id)).length} produktų
                </Text>
                <Text size="sm" lineClamp={3}>
                  {collection.description || 'Aprašymas dar neįrašytas.'}
                </Text>
                <Button
                  variant="default"
                  disabled={disabled}
                  leftSection={<IconEdit size={15} />}
                  onClick={() => onEdit(structuredClone(collection))}
                >
                  Redaguoti kolekciją
                </Button>
              </Stack>
            </Paper>
          ))}
      </SimpleGrid>
    </Stack>
  );
}
