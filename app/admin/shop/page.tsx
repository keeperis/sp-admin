'use client';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Image,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowUpRight,
  IconCategory,
  IconEdit,
  IconPackage,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTypography,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { shopRequest, shopSlug } from '@/lib/shop/client';
import type { ShopCategory, ShopContent, ShopProduct, ShopSnapshot } from '@/lib/shop/contract';
import { ContentEditor } from './ContentEditor';
import { ImagesEditor } from './ImagesEditor';
import { ProductEditor } from './ProductEditor';
import { CommerceEditor } from './CommerceEditor';
import { OrdersPanel } from './OrdersPanel';

const storefront = process.env.NEXT_PUBLIC_SHOP_URL || 'http://127.0.0.1:3004';
const statusLabels = { draft: 'Juodraštis', published: 'Paskelbtas', archived: 'Archyvuotas' };
const prices = new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' });

export default function ShopAdmin() {
  const [snapshot, setSnapshot] = useState<ShopSnapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>('all');
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [category, setCategory] = useState<ShopCategory | null>(null);
  const [dirty, setDirty] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSnapshot(await shopRequest('state'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!dirty && !contentDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, contentDirty]);

  async function commit(path: string, value: unknown, method = 'PUT') {
    if (!snapshot) return false;
    setBusy(true);
    setError('');
    try {
      const updated = await shopRequest(path, method, { revision: snapshot.revision, data: value });
      setSnapshot(updated);
      setDirty(false);
      notifications.show({
        title: 'Išsaugota',
        message: 'Parduotuvės duomenys atnaujinti.',
        color: 'teal',
      });
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function closeEditor() {
    if (busy || uploading) return;
    if (dirty && !window.confirm('Atmesti neišsaugotus pakeitimus?')) return;
    setProduct(null);
    setCategory(null);
    setDirty(false);
    setError('');
  }
  async function refresh() {
    if (
      (dirty || contentDirty) &&
      !window.confirm('Atmesti neišsaugotus pakeitimus ir įkelti naujausius duomenis?')
    )
      return;
    setProduct(null);
    setCategory(null);
    setDirty(false);
    setContentDirty(false);
    setContentKey((k) => k + 1);
    await load();
  }
  function newProduct() {
    setError('');
    setDirty(false);
    setProduct({
      id: '',
      name: '',
      slug: '',
      kind: 'Akmens masės keramika',
      category: snapshot?.data.categories.find((c) => c.active)?.id || '',
      price: 0,
      stock: 1,
      images: [],
      color: '',
      colorHex: '#d6cbb7',
      size: '',
      material: '',
      description: '',
      ritual: '',
      care: '',
      delivery: '',
      badge: '',
      status: 'draft',
      featured: false,
      order: snapshot?.data.products.length || 0,
    });
  }
  if (loading && !snapshot)
    return (
      <Container size="xl" py="xl">
        <Group>
          <Loader size="sm" />
          <Text>Kraunami parduotuvės duomenys…</Text>
        </Group>
      </Container>
    );
  if (!snapshot)
    return (
      <Container size="xl">
        <Alert color="red" title="Parduotuvė nepasiekiama">
          {error}
          <Button display="block" mt="md" onClick={load}>
            Bandyti dar kartą
          </Button>
        </Alert>
      </Container>
    );
  const { data } = snapshot;
  const visible = data.products
    .filter(
      (p) =>
        (status === 'all' || p.status === status) &&
        `${p.name} ${p.slug}`.toLocaleLowerCase('lt').includes(query.toLocaleLowerCase('lt')),
    )
    .sort((a, b) => a.order - b.order);
  return (
    <Container size="xl" py="lg">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" tt="uppercase" c="dimmed" fw={700} style={{ letterSpacing: '.1em' }}>
              Soulpoetry Objects
            </Text>
            <Title order={1} mt={5}>
              Parduotuvės valdymas
            </Title>
            <Text c="dimmed" size="sm" mt={8}>
              Kolekcijos, dirbiniai ir jų istorijos — vienoje vietoje.
            </Text>
          </div>
          <Group>
            <Button
              variant="default"
              leftSection={<IconRefresh size={16} />}
              onClick={refresh}
              loading={loading}
            >
              Atnaujinti
            </Button>
            <Button
              component="a"
              href={storefront}
              target="_blank"
              rel="noreferrer"
              variant="light"
              color="teal"
              rightSection={<IconArrowUpRight size={16} />}
            >
              Atidaryti parduotuvę
            </Button>
          </Group>
        </Group>
        {error && !product && !category && (
          <Alert color="red" title="Pakeitimai neišsaugoti">
            {error}
          </Alert>
        )}
        {!snapshot.revision && (
          <Alert color="teal" title="Paruošk pirmą kolekciją">
            Gali pradėti nuo tuščios parduotuvės arba įkelti sukurtus keturis prototipo dirbinius.
            <Button
              mt="md"
              display="block"
              color="teal"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setSnapshot(await shopRequest('bootstrap', 'POST', {}));
                  setContentKey((k) => k + 1);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Įkelti prototipo kolekciją
            </Button>
          </Alert>
        )}
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          {[
            ['Produktų', data.products.length],
            ['Paskelbta', data.products.filter((p) => p.status === 'published').length],
            ['Juodraščių', data.products.filter((p) => p.status === 'draft').length],
            ['Kategorijų', data.categories.length],
          ].map(([label, value]) => (
            <Paper key={label} withBorder radius="md" p="lg">
              <Text size="sm" c="dimmed">
                {label}
              </Text>
              <Text size="30px" fw={600} mt={5}>
                {value}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
        <Tabs defaultValue="products" keepMounted>
          <Tabs.List mb="xl">
            <Tabs.Tab value="products" leftSection={<IconPackage size={17} />}>
              Produktai
            </Tabs.Tab>
            <Tabs.Tab value="categories" leftSection={<IconCategory size={17} />}>
              Kategorijos
            </Tabs.Tab>
            <Tabs.Tab value="content" leftSection={<IconTypography size={17} />}>
              Svetainės turinys {contentDirty ? '•' : ''}
            </Tabs.Tab>
            <Tabs.Tab value="commerce">Dokumentai ir mokėjimai</Tabs.Tab>
            <Tabs.Tab value="orders">Užsakymai</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="commerce"><CommerceEditor /></Tabs.Panel>
          <Tabs.Panel value="orders"><OrdersPanel /></Tabs.Panel>
          <Tabs.Panel value="products">
            <Stack gap="lg">
              <Group justify="space-between">
                <Group>
                  <TextInput
                    aria-label="Ieškoti produktų"
                    placeholder="Ieškoti produkto…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    leftSection={<IconSearch size={16} />}
                  />
                  <Select
                    aria-label="Produkto būsena"
                    w={170}
                    value={status}
                    onChange={setStatus}
                    allowDeselect={false}
                    data={[
                      { value: 'all', label: 'Visos būsenos' },
                      ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
                    ]}
                  />
                </Group>
                <Button
                  color="teal"
                  leftSection={<IconPlus size={16} />}
                  onClick={newProduct}
                  disabled={!data.categories.length}
                >
                  Naujas produktas
                </Button>
              </Group>
              {!data.categories.length && (
                <Alert color="blue">
                  Pirmiausia pridėk bent vieną kategoriją skiltyje „Kategorijos“.
                </Alert>
              )}
              <Table.ScrollContainer minWidth={750}>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Dirbinys</Table.Th>
                      <Table.Th>Kategorija</Table.Th>
                      <Table.Th>Kaina</Table.Th>
                      <Table.Th>Likutis</Table.Th>
                      <Table.Th>Būsena</Table.Th>
                      <Table.Th>Veiksmai</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {visible.map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td>
                          <Group wrap="nowrap">
                            <Image
                              src={p.images[0]?.url}
                              alt={p.images[0]?.alt || p.name}
                              w={65}
                              h={65}
                              radius="sm"
                              fallbackSrc="/favicon.png"
                            />
                            <div>
                              <Text size="sm" fw={600}>
                                {p.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                /{p.slug}
                              </Text>
                              {p.featured && (
                                <Text size="xs" c="teal">
                                  Pradinio puslapio kolekcija
                                </Text>
                              )}
                            </div>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {data.categories.find((c) => c.id === p.category)?.label}
                          </Text>
                        </Table.Td>
                        <Table.Td>{prices.format(p.price)}</Table.Td>
                        <Table.Td>
                          <Text c={p.stock ? undefined : 'red'} size="sm">
                            {p.stock} vnt.
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            color={
                              p.status === 'published'
                                ? 'teal'
                                : p.status === 'draft'
                                  ? 'yellow'
                                  : 'gray'
                            }
                          >
                            {statusLabels[p.status]}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={5}>
                            <Button
                              variant="subtle"
                              size="xs"
                              leftSection={<IconEdit size={14} />}
                              onClick={() => {
                                setProduct(structuredClone(p));
                                setDirty(false);
                                setError('');
                              }}
                            >
                              Redaguoti
                            </Button>
                            {p.status === 'published' && (
                              <ActionIcon
                                component="a"
                                href={`${storefront}/dirbiniai/${p.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                variant="subtle"
                                aria-label={`Peržiūrėti ${p.name}`}
                              >
                                <IconArrowUpRight size={16} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
              {!visible.length && (
                <Paper withBorder p="xl" ta="center">
                  <Text c="dimmed">Produktų nerasta. Pridėk naują arba pakeisk filtrus.</Text>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="categories">
            <Stack gap="lg">
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  Tvarka čia nustato kategorijų tvarką parduotuvėje.
                </Text>
                <Button
                  color="teal"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    setCategory({
                      id: '',
                      slug: '',
                      label: '',
                      description: '',
                      active: true,
                      order: data.categories.length,
                      image: null,
                    });
                    setDirty(false);
                    setError('');
                  }}
                >
                  Nauja kategorija
                </Button>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {[...data.categories]
                  .sort((a, b) => a.order - b.order)
                  .map((c) => (
                    <Paper withBorder p="lg" radius="md" key={c.id}>
                      <Stack gap="sm">
                        {c.image && (
                          <Image src={c.image.url} alt={c.image.alt} h={135} radius="sm" />
                        )}
                        <Group justify="space-between">
                          <Title order={3} size="h4">
                            {c.label}
                          </Title>
                          <Badge variant="light" color={c.active ? 'teal' : 'gray'}>
                            {c.active ? 'Rodoma' : 'Paslėpta'}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          /{c.slug} · eilė {c.order} ·{' '}
                          {data.products.filter((p) => p.category === c.id).length} produktų
                        </Text>
                        <Text size="sm" lineClamp={3}>
                          {c.description || 'Aprašymas dar neįrašytas.'}
                        </Text>
                        <Button
                          variant="default"
                          leftSection={<IconEdit size={15} />}
                          onClick={() => {
                            setCategory(structuredClone(c));
                            setDirty(false);
                            setError('');
                          }}
                        >
                          Redaguoti kategoriją
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="content">
            <ContentEditor
              key={contentKey}
              data={data}
              save={(content: ShopContent) => commit('content', content)}
              dirtyChanged={setContentDirty}
            />
          </Tabs.Panel>
        </Tabs>
        <Text size="xs" c="dimmed">
          {snapshot.updatedAt
            ? `Išsaugota ${new Date(snapshot.updatedAt).toLocaleString('lt-LT')} · versija ${snapshot.revision}`
            : 'Dar neišsaugota'}{' '}
          · Atsiskaitymas parduotuvėje tebėra demonstracinis.
        </Text>
      </Stack>
      <Modal
        opened={!!product}
        onClose={closeEditor}
        title={product?.id ? 'Redaguoti produktą' : 'Naujas produktas'}
        size="xl"
        closeOnClickOutside={false}
        closeOnEscape={!busy && !uploading}
      >
        {error && (
          <Alert color="red" mb="md" title="Nepavyko išsaugoti">
            {error}
          </Alert>
        )}
        {product && (
          <ProductEditor
            onBusy={setUploading}
            initial={product}
            categories={data.categories}
            cancel={closeEditor}
            onDirty={() => setDirty(true)}
            save={async (p) => {
              const ok = await commit(
                p.id ? `products/${p.id}` : 'products',
                p,
                p.id ? 'PUT' : 'POST',
              );
              if (ok) setProduct(null);
              return ok;
            }}
          />
        )}
      </Modal>
      <Modal
        opened={!!category}
        onClose={closeEditor}
        title={category?.id ? 'Redaguoti kategoriją' : 'Nauja kategorija'}
        size="lg"
        closeOnClickOutside={false}
      >
        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}
        {category && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await commit(
                category.id ? `categories/${category.id}` : 'categories',
                category,
                category.id ? 'PUT' : 'POST',
              );
              if (ok) setCategory(null);
            }}
          >
            <Stack>
              <TextInput
                label="Kategorijos pavadinimas"
                required
                maxLength={80}
                value={category.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setCategory((c) =>
                    c
                      ? {
                          ...c,
                          label,
                          ...(!c.id && c.slug === shopSlug(c.label)
                            ? { slug: shopSlug(label) }
                            : {}),
                        }
                      : null,
                  );
                  setDirty(true);
                }}
              />
              <TextInput
                label="Nuorodos pavadinimas"
                required
                maxLength={120}
                value={category.slug}
                onChange={(e) => {
                  setCategory({ ...category, slug: e.target.value });
                  setDirty(true);
                }}
              />
              <Textarea
                label="Kategorijos aprašymas"
                autosize
                minRows={3}
                maxLength={2000}
                value={category.description}
                onChange={(e) => {
                  setCategory({ ...category, description: e.target.value });
                  setDirty(true);
                }}
              />
              <NumberInput
                label="Eiliškumas"
                min={0}
                max={99999}
                allowDecimal={false}
                value={category.order}
                onChange={(v) => {
                  setCategory({ ...category, order: Number(v) || 0 });
                  setDirty(true);
                }}
              />
              <Switch
                label="Rodyti kategoriją parduotuvėje"
                checked={category.active}
                onChange={(e) => {
                  setCategory({ ...category, active: e.currentTarget.checked });
                  setDirty(true);
                }}
              />
              <ImagesEditor
                max={1}
                value={category.image ? [category.image] : []}
                onChange={(images) => {
                  setCategory({ ...category, image: images[0] || null });
                  setDirty(true);
                }}
                onBusy={setUploading}
              />
              <Group justify="space-between" mt="md">
                <Button variant="default" onClick={closeEditor} disabled={busy || uploading}>
                  Atšaukti
                </Button>
                <Button type="submit" color="teal" loading={busy} disabled={uploading}>
                  Išsaugoti kategoriją
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Container>
  );
}
