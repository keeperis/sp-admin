'use client';

import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { addDates } from '@/lib/private-workshops/admin';
import type {
  PrivateWorkshopConfig,
  PrivateWorkshopSettings,
  PrivateWorkshopWindow,
} from '@/lib/private-workshops/types';
import { DescriptionEditor } from './DescriptionEditor';
import { ImagePicker } from './ImagePicker';

type Props = {
  config: PrivateWorkshopConfig;
  onChange: (config: PrivateWorkshopConfig) => void;
  persistedIds: Set<string>;
};

function EntryActions({
  active,
  saved,
  onActive,
  onRemove,
}: {
  active: boolean;
  saved: boolean;
  onActive: (active: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <Group justify="space-between">
      <Switch
        label={active ? 'Aktyvus' : 'Neaktyvus'}
        checked={active}
        onChange={(event) => onActive(event.currentTarget.checked)}
      />
      {!saved && (
        <Button size="xs" variant="subtle" color="red" onClick={onRemove}>
          Pašalinti naują įrašą
        </Button>
      )}
      {saved && (
        <Text size="xs" c="dimmed">
          Nebenaudojamą įrašą išjunkite. Ankstesnės rezervacijos išliks.
        </Text>
      )}
    </Group>
  );
}

export function GeneralSettings({
  config,
  onChange,
  disabled = false,
}: Omit<Props, 'persistedIds'> & { disabled?: boolean }) {
  const settings = config.settings;
  function update(patch: Partial<PrivateWorkshopSettings>) {
    onChange({ ...config, settings: { ...settings, ...patch } });
  }
  return (
    <Card withBorder>
      <Stack>
        <Switch
          label="Registracija į privačius keramikos užsiėmimus įjungta"
          checked={settings.enabled}
          onChange={(event) => update({ enabled: event.currentTarget.checked })}
        />
        <Alert color="blue" title="Registracijos ir mokėjimo taisyklės">
          Pradžios laikai kas 30 min.; tarp privačių užsiėmimų paliekama 60 min. Apmokėjimui
          skiriamos 72 val., bet ne ilgiau nei iki užsiėmimo pradžios. Rezervuojant pavedimu mokama
          tik už minimalų dalyvių skaičių. Papildomos paslaugos ir likutis apmokami po užsiėmimo.
        </Alert>
        <Text size="sm" c="dimmed">
          Privačioms registracijoms taikomos bendros svetainės paslaugų teikimo, registracijos ir
          atšaukimo sąlygos. Jas redaguokite skiltyje{' '}
          <Anchor href="/admin/legal" size="sm">
            Teisinė informacija
          </Anchor>
          .
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Pavadinimas (LT)"
            required
            value={settings.titleLt}
            onChange={(event) => update({ titleLt: event.currentTarget.value })}
          />
          <TextInput
            label="Pavadinimas (EN)"
            value={settings.titleEn}
            onChange={(event) => update({ titleEn: event.currentTarget.value })}
          />
        </SimpleGrid>
        <TextInput
          label="Užsiėmimo vieta"
          value={settings.placeName}
          onChange={(event) => update({ placeName: event.currentTarget.value })}
        />
        <ImagePicker
          label="Viršelio nuotrauka"
          value={settings.coverImageUrl}
          onChange={(coverImageUrl) => update({ coverImageUrl })}
        />
        <Text size="sm" c="dimmed">
          Bendras aprašymas rodomas registracijos lange. Puslapio pristatymo tekstą redaguokite
          skilčių administravime.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <DescriptionEditor
            label="Bendras aprašymas (LT)"
            value={settings.descriptionLt}
            document={settings.descriptionDocumentLt}
            disabled={disabled}
            onChange={(descriptionDocumentLt, descriptionLt) =>
              update({ descriptionDocumentLt, descriptionLt })
            }
          />
          <DescriptionEditor
            label="Bendras aprašymas (EN)"
            value={settings.descriptionEn}
            document={settings.descriptionDocumentEn}
            disabled={disabled}
            onChange={(descriptionDocumentEn, descriptionEn) =>
              update({ descriptionDocumentEn, descriptionEn })
            }
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Textarea
            label="Atmintinė patvirtinimo laiškui (LT)"
            autosize
            minRows={4}
            value={settings.memoLt}
            onChange={(event) => update({ memoLt: event.currentTarget.value })}
          />
          <Textarea
            label="Atmintinė patvirtinimo laiškui (EN)"
            autosize
            minRows={4}
            value={settings.memoEn}
            onChange={(event) => update({ memoEn: event.currentTarget.value })}
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          Tekstai laiškuose rodomi kaip paprastas tekstas. Atmintinė pridedama patvirtinus gautą
          pavedimą.
        </Text>
      </Stack>
    </Card>
  );
}

export function WorkshopTypes({ config, onChange, persistedIds }: Props) {
  function update(id: string, patch: Partial<PrivateWorkshopConfig['types'][number]>) {
    onChange({
      ...config,
      types: config.types.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Dirbtuvių tipai</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            onChange({
              ...config,
              types: [
                ...config.types,
                {
                  id: crypto.randomUUID(),
                  active: true,
                  titleLt: '',
                  titleEn: '',
                  thumbnailUrl: '',
                  durationMin: 120,
                  minParticipants: 6,
                  maxParticipants: 12,
                  pricePerPersonEur: 50,
                },
              ],
            })
          }
        >
          Naujas tipas
        </Button>
      </Group>
      {!config.types.length && (
        <Text c="dimmed">Pridėkite puodelio, dubenėlio ar kitų dirbtuvių tipą.</Text>
      )}
      {config.types.map((item, index) => (
        <Card withBorder key={item.id}>
          <Stack>
            <Title order={4}>{item.titleLt || `Naujas tipas ${index + 1}`}</Title>
            <EntryActions
              active={item.active}
              saved={persistedIds.has(item.id)}
              onActive={(active) => update(item.id, { active })}
              onRemove={() =>
                onChange({
                  ...config,
                  types: config.types.filter((type) => type.id !== item.id),
                  windows: config.windows.map((window) => ({
                    ...window,
                    typeIds: window.typeIds.filter((id) => id !== item.id),
                  })),
                })
              }
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Tipo pavadinimas (LT)"
                required
                value={item.titleLt}
                onChange={(event) => update(item.id, { titleLt: event.currentTarget.value })}
              />
              <TextInput
                label="Tipo pavadinimas (EN)"
                value={item.titleEn}
                onChange={(event) => update(item.id, { titleEn: event.currentTarget.value })}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              <NumberInput
                label="Trukmė, min."
                min={15}
                step={15}
                allowDecimal={false}
                value={item.durationMin}
                onChange={(value) => update(item.id, { durationMin: Number(value) })}
              />
              <NumberInput
                label="Mažiausiai dalyvių"
                min={1}
                allowDecimal={false}
                value={item.minParticipants}
                onChange={(value) => update(item.id, { minParticipants: Number(value) })}
              />
              <NumberInput
                label="Daugiausiai dalyvių"
                min={item.minParticipants}
                allowDecimal={false}
                value={item.maxParticipants}
                onChange={(value) => update(item.id, { maxParticipants: Number(value) })}
              />
              <NumberInput
                label="Kaina asmeniui, EUR"
                min={0.01}
                decimalScale={2}
                value={item.pricePerPersonEur}
                onChange={(value) => update(item.id, { pricePerPersonEur: Number(value) })}
              />
            </SimpleGrid>
            <ImagePicker
              label="Tipo miniatiūra"
              value={item.thumbnailUrl}
              onChange={(thumbnailUrl) => update(item.id, { thumbnailUrl })}
            />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

export function AdditionalServices({ config, onChange, persistedIds }: Props) {
  function update(id: string, patch: Partial<PrivateWorkshopConfig['addons'][number]>) {
    onChange({
      ...config,
      addons: config.addons.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Papildomos paslaugos</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            onChange({
              ...config,
              addons: [
                ...config.addons,
                {
                  id: crypto.randomUUID(),
                  active: true,
                  titleLt: '',
                  titleEn: '',
                  priceEur: 0,
                  durationMin: 0,
                },
              ],
            })
          }
        >
          Nauja paslauga
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        Paslaugos kaina taikoma visai rezervacijai, ne vienam dalyviui. Apmokama po užsiėmimo.
        Papildoma trukmė prailgina rezervuojamą laiką.
      </Text>
      {!config.addons.length && <Text c="dimmed">Papildomų paslaugų dar nėra.</Text>}
      {config.addons.map((item, index) => (
        <Card withBorder key={item.id}>
          <Stack>
            <Title order={4}>{item.titleLt || `Nauja paslauga ${index + 1}`}</Title>
            <EntryActions
              active={item.active}
              saved={persistedIds.has(item.id)}
              onActive={(active) => update(item.id, { active })}
              onRemove={() =>
                onChange({
                  ...config,
                  addons: config.addons.filter((addon) => addon.id !== item.id),
                  windows: config.windows.map((window) => ({
                    ...window,
                    addonIds: window.addonIds.filter((id) => id !== item.id),
                  })),
                })
              }
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Paslaugos pavadinimas (LT)"
                required
                value={item.titleLt}
                onChange={(event) => update(item.id, { titleLt: event.currentTarget.value })}
              />
              <TextInput
                label="Paslaugos pavadinimas (EN)"
                value={item.titleEn}
                onChange={(event) => update(item.id, { titleEn: event.currentTarget.value })}
              />
              <NumberInput
                label="Kaina rezervacijai, EUR"
                min={0}
                decimalScale={2}
                value={item.priceEur}
                onChange={(value) => update(item.id, { priceEur: Number(value) })}
              />
              <NumberInput
                label="Papildoma trukmė, min."
                description="0, jeigu paslauga nepratęsia užsiėmimo"
                min={0}
                step={15}
                allowDecimal={false}
                value={item.durationMin}
                onChange={(value) => update(item.id, { durationMin: Number(value) })}
              />
            </SimpleGrid>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function WindowEditor({
  item,
  config,
  onChange,
}: {
  item: PrivateWorkshopWindow;
  config: PrivateWorkshopConfig;
  onChange: (patch: Partial<PrivateWorkshopWindow>) => void;
}) {
  const [date, setDate] = useState('');
  return (
    <Stack>
      <Group align="flex-end">
        <TextInput
          label="Pridėti datą"
          type="date"
          value={date}
          onChange={(event) => setDate(event.currentTarget.value)}
          style={{ flex: '1 1 180px' }}
        />
        <Button
          variant="light"
          disabled={!date}
          onClick={() => {
            onChange({ dates: addDates(item.dates, [date]) });
            setDate('');
          }}
        >
          Pridėti datą
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Pridėkite visas dienas, kuriomis kartosis tas pats intervalas, dirbtuvių tipai ir paslaugos.
      </Text>
      <Group gap="xs">
        {item.dates.map((day) => (
          <Badge
            key={day}
            variant="light"
            size="lg"
            rightSection={
              <ActionIcon
                size="xs"
                variant="transparent"
                aria-label={`Pašalinti datą ${day}`}
                onClick={() => onChange({ dates: item.dates.filter((value) => value !== day) })}
              >
                <IconX size={12} />
              </ActionIcon>
            }
          >
            {day}
          </Badge>
        ))}
      </Group>
      <SimpleGrid cols={2}>
        <TextInput
          label="Nuo"
          type="time"
          required
          value={item.startTime}
          onChange={(event) => onChange({ startTime: event.currentTarget.value })}
        />
        <TextInput
          label="Iki"
          type="time"
          required
          value={item.endTime}
          onChange={(event) => onChange({ endTime: event.currentTarget.value })}
        />
      </SimpleGrid>
      <MultiSelect
        label="Galimi dirbtuvių tipai"
        required
        placeholder="Pasirinkite vieną ar daugiau"
        data={config.types.map((type) => ({
          value: type.id,
          label: `${type.titleLt || 'Be pavadinimo'}${type.active ? '' : ' (neaktyvus)'}`,
        }))}
        value={item.typeIds}
        onChange={(typeIds) => onChange({ typeIds })}
        searchable
      />
      <MultiSelect
        label="Galimos papildomos paslaugos"
        placeholder="Neprivaloma"
        data={config.addons.map((addon) => ({
          value: addon.id,
          label: `${addon.titleLt || 'Be pavadinimo'}${addon.active ? '' : ' (neaktyvi)'}`,
        }))}
        value={item.addonIds}
        onChange={(addonIds) => onChange({ addonIds })}
        searchable
      />
    </Stack>
  );
}

export function TimeWindows({ config, onChange, persistedIds }: Props) {
  function update(id: string, patch: Partial<PrivateWorkshopWindow>) {
    onChange({
      ...config,
      windows: config.windows.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Registracijos laikai</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() =>
            onChange({
              ...config,
              windows: [
                ...config.windows,
                {
                  id: crypto.randomUUID(),
                  active: true,
                  dates: [],
                  startTime: '10:00',
                  endTime: '18:00',
                  typeIds: [],
                  addonIds: [],
                },
              ],
            })
          }
        >
          Naujas laikas
        </Button>
      </Group>
      <Alert color="blue">
        Laikai yra Vilniaus laiko juostoje. Siūlomos pradžios kas 30 min., įvertinus tipo ir
        papildomų paslaugų trukmę, kitas rezervacijas bei 60 min. tarpą.
      </Alert>
      {!config.windows.length && (
        <Text c="dimmed">Pridėkite datas ir intervalus, kuriuos atversite registracijai.</Text>
      )}
      {config.windows.map((item, index) => (
        <Card withBorder key={item.id}>
          <Stack>
            <Title order={4}>
              Intervalas {index + 1} · {item.startTime}–{item.endTime}
            </Title>
            <EntryActions
              active={item.active}
              saved={persistedIds.has(item.id)}
              onActive={(active) => update(item.id, { active })}
              onRemove={() =>
                onChange({
                  ...config,
                  windows: config.windows.filter((window) => window.id !== item.id),
                })
              }
            />
            <Divider />
            <WindowEditor
              item={item}
              config={config}
              onChange={(patch) => update(item.id, patch)}
            />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
