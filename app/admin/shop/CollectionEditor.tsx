'use client';

import { Button, Group, NumberInput, Stack, Switch, Textarea, TextInput } from '@mantine/core';
import { useState } from 'react';
import { shopSlug } from '@/lib/shop/client';
import type { ShopCollection } from '@/lib/shop/contract';
import { ImagesEditor } from './ImagesEditor';

export function CollectionEditor({
  initial,
  busy,
  uploading,
  save,
  cancel,
  onDirty,
  onBusy,
}: {
  initial: ShopCollection;
  busy: boolean;
  uploading: boolean;
  save: (collection: ShopCollection) => Promise<boolean>;
  cancel: () => void;
  onDirty: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [collection, setCollection] = useState(initial);
  function field<K extends keyof ShopCollection>(key: K, value: ShopCollection[K]) {
    setCollection((current) => ({ ...current, [key]: value }));
    onDirty();
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!busy && !uploading) await save(collection);
      }}
    >
      <fieldset
        disabled={busy || uploading}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <Stack>
          <TextInput
            label="Kolekcijos pavadinimas"
            required
            maxLength={80}
            value={collection.label}
            onChange={(event) => {
              const label = event.target.value;
              setCollection((current) => ({
                ...current,
                label,
                ...(!current.id && current.slug === shopSlug(current.label)
                  ? { slug: shopSlug(label) }
                  : {}),
              }));
              onDirty();
            }}
          />
          <TextInput
            label="Nuorodos pavadinimas"
            required
            maxLength={120}
            value={collection.slug}
            onChange={(event) => field('slug', event.target.value)}
          />
          <Textarea
            label="Kolekcijos aprašymas"
            autosize
            minRows={3}
            maxLength={2000}
            value={collection.description}
            onChange={(event) => field('description', event.target.value)}
          />
          <NumberInput
            label="Eiliškumas"
            description="Mažesnis skaičius rodomas pirmiau."
            min={0}
            max={99999}
            allowDecimal={false}
            value={collection.order}
            onChange={(value) => field('order', Number(value) || 0)}
          />
          <Switch
            label="Rodyti kolekciją parduotuvėje"
            description="Paslėpus kolekciją, jai priskirti produktai lieka parduotuvėje."
            checked={collection.active}
            onChange={(event) => field('active', event.currentTarget.checked)}
          />
          <ImagesEditor
            max={1}
            value={collection.image ? [collection.image] : []}
            onChange={(images) => field('image', images[0] || null)}
            onBusy={onBusy}
          />
        </Stack>
      </fieldset>
      <Group justify="space-between" mt="md">
        <Button variant="default" onClick={cancel} disabled={busy || uploading}>
          Atšaukti
        </Button>
        <Button type="submit" color="teal" loading={busy} disabled={uploading}>
          Išsaugoti kolekciją
        </Button>
      </Group>
    </form>
  );
}
