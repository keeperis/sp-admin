'use client';
import {
  Alert,
  Button,
  ColorInput,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import { shopSlug } from '@/lib/shop/client';
import type { ShopCategory, ShopProduct } from '@/lib/shop/contract';
import { ImagesEditor } from './ImagesEditor';

export function ProductEditor({
  initial,
  categories,
  save,
  cancel,
  onDirty,
  onBusy,
}: {
  initial: ShopProduct;
  categories: ShopCategory[];
  save: (product: ShopProduct) => Promise<boolean>;
  cancel: () => void;
  onDirty: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [product, setProduct] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<string | null>('details');
  const [error, setError] = useState('');
  function field<K extends keyof ShopProduct>(key: K, value: ShopProduct[K]) {
    setProduct((current) => ({ ...current, [key]: value }));
    onDirty();
  }
  const slugAuto = !initial.id;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!product.name.trim() || !product.slug || !product.category) {
      setTab('details');
      setError('Įrašyk pavadinimą, nuorodą ir pasirink kategoriją.');
      return;
    }
    if (
      product.status === 'published' &&
      (!product.images.length || !product.description.trim() || product.price <= 0)
    ) {
      setError('Paskelbtam produktui reikia teigiamos kainos, aprašymo ir bent vienos nuotraukos.');
      return;
    }
    setSaving(true);
    try {
      await save(product);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <Stack gap="lg">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Paskelbti produktai matomi parduotuvėje. Juodraščiai ir archyvas — tik čia.
          </Text>
          <Select
            label="Būsena"
            w={180}
            allowDeselect={false}
            value={product.status}
            onChange={(value) => field('status', value as ShopProduct['status'])}
            data={[
              { value: 'draft', label: 'Juodraštis' },
              { value: 'published', label: 'Paskelbtas' },
              { value: 'archived', label: 'Archyvuotas' },
            ]}
          />
        </Group>
        {error && <Alert color="red">{error}</Alert>}
        <Tabs value={tab} onChange={setTab} keepMounted>
          <Tabs.List>
            <Tabs.Tab value="details">Produkto informacija</Tabs.Tab>
            <Tabs.Tab value="images">Nuotraukos ({product.images.length})</Tabs.Tab>
            <Tabs.Tab value="extra">Papildoma informacija</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="details" pt="lg">
            <Stack>
              <TextInput
                label="Produkto pavadinimas"
                value={product.name}
                maxLength={140}
                onChange={(e) => {
                  const name = e.target.value;
                  setProduct((p) => ({
                    ...p,
                    name,
                    ...(slugAuto && p.slug === shopSlug(p.name) ? { slug: shopSlug(name) } : {}),
                  }));
                  onDirty();
                }}
                required
              />
              <TextInput
                label="Nuorodos pavadinimas"
                description={`/dirbiniai/${product.slug || 'produkto-pavadinimas'}`}
                value={product.slug}
                maxLength={120}
                onChange={(e) => field('slug', e.target.value)}
                required
              />
              <Select
                label="Kategorija"
                placeholder="Pasirink kategoriją"
                required
                searchable
                value={product.category || null}
                onChange={(v) => field('category', v || '')}
                data={categories.map((c) => ({
                  value: c.id,
                  label: `${c.label}${c.active ? '' : ' (paslėpta)'}`,
                }))}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <NumberInput
                  label="Kaina, €"
                  value={product.price}
                  min={0}
                  max={1000000}
                  decimalScale={2}
                  fixedDecimalScale
                  decimalSeparator=","
                  onChange={(v) => field('price', Number(v) || 0)}
                />
                <NumberInput
                  label="Likutis, vnt."
                  value={product.stock}
                  min={0}
                  max={1000000}
                  allowDecimal={false}
                  onChange={(v) => field('stock', Number(v) || 0)}
                />
              </SimpleGrid>
              <TextInput
                label="Trumpas tipas"
                placeholder="Akmens masės keramika"
                value={product.kind}
                onChange={(e) => field('kind', e.target.value)}
                maxLength={160}
              />
              <Textarea
                label="Aprašymas"
                autosize
                minRows={4}
                maxRows={12}
                value={product.description}
                onChange={(e) => field('description', e.target.value)}
                maxLength={10000}
              />
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="images" pt="lg">
            <ImagesEditor
              value={product.images}
              onChange={(v) => field('images', v)}
              onBusy={(value) => {
                setUploading(value);
                onBusy(value);
              }}
            />
          </Tabs.Panel>
          <Tabs.Panel value="extra" pt="lg">
            <Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Spalvos pavadinimas"
                  value={product.color}
                  onChange={(e) => field('color', e.target.value)}
                  maxLength={100}
                />
                <ColorInput
                  label="Spalvos žymeklis"
                  format="hex"
                  value={product.colorHex}
                  onChange={(v) => field('colorHex', v)}
                />
              </SimpleGrid>
              <TextInput
                label="Matmenys / talpa"
                value={product.size}
                onChange={(e) => field('size', e.target.value)}
                maxLength={200}
              />
              <TextInput
                label="Medžiaga ir glazūra"
                value={product.material}
                onChange={(e) => field('material', e.target.value)}
                maxLength={300}
              />
              <Textarea
                label="Kasdienis ritualas"
                value={product.ritual}
                onChange={(e) => field('ritual', e.target.value)}
                autosize
                minRows={2}
                maxLength={3000}
              />
              <Textarea
                label="Priežiūra"
                description="Palikus tuščią, bus rodoma numatytoji informacija iš svetainės turinio."
                value={product.care}
                onChange={(e) => field('care', e.target.value)}
                autosize
                minRows={2}
                maxLength={5000}
              />
              <Textarea
                label="Pristatymas"
                description="Palikus tuščią, bus rodoma numatytoji pristatymo informacija."
                value={product.delivery}
                onChange={(e) => field('delivery', e.target.value)}
                autosize
                minRows={2}
                maxLength={5000}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Žyma ant nuotraukos"
                  placeholder="Vienintelis"
                  value={product.badge}
                  onChange={(e) => field('badge', e.target.value)}
                  maxLength={50}
                />
                <NumberInput
                  label="Eiliškumas"
                  description="Mažesnis skaičius rodomas pirmiau."
                  value={product.order}
                  min={0}
                  max={99999}
                  allowDecimal={false}
                  onChange={(v) => field('order', Number(v) || 0)}
                />
              </SimpleGrid>
              <Switch
                label="Rodyti pradinio puslapio kolekcijoje"
                checked={product.featured}
                onChange={(e) => field('featured', e.currentTarget.checked)}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
        <Group
          justify="space-between"
          pt="md"
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'var(--mantine-color-body)',
            borderTop: '1px solid var(--mantine-color-default-border)',
            paddingBottom: 10,
          }}
        >
          <Button variant="default" onClick={cancel} disabled={saving || uploading}>
            Atšaukti
          </Button>
          <Button type="submit" color="teal" loading={saving} disabled={uploading}>
            Išsaugoti produktą
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
