'use client';

import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { PRIVATE_API, privateRequest, validateConfig } from '@/lib/private-workshops/admin';
import type { PrivateWorkshopBooking, PrivateWorkshopConfig } from '@/lib/private-workshops/types';
import { Bookings } from './Bookings';
import { AdditionalServices, GeneralSettings, TimeWindows, WorkshopTypes } from './ConfigEditor';

export default function PrivateWorkshopsPage() {
  const configQuery = useSWR<{ config: PrivateWorkshopConfig }>(PRIVATE_API, privateRequest);
  const bookingsQuery = useSWR<{ bookings: PrivateWorkshopBooking[] }>(
    `${PRIVATE_API}/bookings`,
    privateRequest,
  );
  const [draft, setDraft] = useState<PrivateWorkshopConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [tab, setTab] = useState<string | null>('general');
  const config = draft || configQuery.data?.config;
  const saved = configQuery.data?.config;
  const persistedIds = new Set(
    [...(saved?.types || []), ...(saved?.addons || []), ...(saved?.windows || [])].map(
      (item) => item.id,
    ),
  );

  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);

  function change(next: PrivateWorkshopConfig) {
    setDraft(next);
    setSaveError('');
  }
  async function save() {
    if (!config) return;
    const error = validateConfig(config);
    if (error) {
      setSaveError(error);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const response = await privateRequest<{ config: PrivateWorkshopConfig }>(PRIVATE_API, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      await configQuery.mutate(response, { revalidate: false });
      setDraft(null);
      notifications.show({ color: 'green', message: 'Privačių užsiėmimų nustatymai išsaugoti.' });
    } catch (failure) {
      setSaveError(failure instanceof Error ? failure.message : 'Nepavyko išsaugoti.');
    } finally {
      setSaving(false);
    }
  }
  async function reload() {
    setDraft(null);
    setSaveError('');
    setDiscardOpen(false);
    await configQuery.mutate();
  }
  async function bookingUpdated(booking: PrivateWorkshopBooking) {
    await bookingsQuery.mutate(
      (current) => ({
        bookings: (current?.bookings || []).map((item) =>
          item.id === booking.id ? booking : item,
        ),
      }),
      { revalidate: false },
    );
    notifications.show({ color: 'green', message: 'Rezervacija atnaujinta.' });
  }
  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={2}>Privatūs užsiėmimai</Title>
            <Badge variant="light" w="fit-content">
              Tik keramika
            </Badge>
          </Stack>
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<IconRefresh size={16} />}
              disabled={saving}
              onClick={() => {
                if (draft) setDiscardOpen(true);
                else void reload();
              }}
            >
              Atnaujinti nustatymus
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saving}
              disabled={!draft}
              onClick={() => void save()}
            >
              Išsaugoti pakeitimus
            </Button>
          </Group>
        </Group>
        {draft && (
          <Alert color="yellow">
            Yra neišsaugotų pakeitimų. Visi nustatymai, tipai, paslaugos ir laikai išsaugomi vienu
            kartu.
          </Alert>
        )}
        {saveError && (
          <Alert color="red" title="Nepavyko išsaugoti">
            {saveError}
          </Alert>
        )}
        {configQuery.error && <Alert color="red">{configQuery.error.message}</Alert>}
        {configQuery.isLoading && <Loader aria-label="Įkeliami nustatymai" />}
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List style={{ flexWrap: 'wrap' }}>
            <Tabs.Tab value="general">Bendra informacija</Tabs.Tab>
            <Tabs.Tab value="types">Dirbtuvių tipai</Tabs.Tab>
            <Tabs.Tab value="addons">Papildomos paslaugos</Tabs.Tab>
            <Tabs.Tab value="windows">Laikai</Tabs.Tab>
            <Tabs.Tab value="bookings">Rezervacijos</Tabs.Tab>
          </Tabs.List>
          {config && (
            <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <Tabs.Panel value="general" pt="md">
                <GeneralSettings config={config} onChange={change} />
              </Tabs.Panel>
              <Tabs.Panel value="types" pt="md">
                <WorkshopTypes config={config} onChange={change} persistedIds={persistedIds} />
              </Tabs.Panel>
              <Tabs.Panel value="addons" pt="md">
                <AdditionalServices config={config} onChange={change} persistedIds={persistedIds} />
              </Tabs.Panel>
              <Tabs.Panel value="windows" pt="md">
                <TimeWindows config={config} onChange={change} persistedIds={persistedIds} />
              </Tabs.Panel>
            </fieldset>
          )}
          <Tabs.Panel value="bookings" pt="md">
            {bookingsQuery.error && (
              <Alert color="red" mb="md">
                {bookingsQuery.error.message}
              </Alert>
            )}
            {bookingsQuery.isLoading ? (
              <Loader aria-label="Įkeliamos rezervacijos" />
            ) : (
              <Bookings
                bookings={bookingsQuery.data?.bookings || []}
                refreshing={bookingsQuery.isValidating}
                onRefresh={() => void bookingsQuery.mutate()}
                onUpdated={(booking) => void bookingUpdated(booking)}
              />
            )}
          </Tabs.Panel>
        </Tabs>
        {config && tab !== 'bookings' && (
          <Group justify="flex-end">
            <Text size="xs" c="dimmed">
              Nustatymų versija: {config.version}
            </Text>
            <Button loading={saving} disabled={!draft} onClick={() => void save()}>
              Išsaugoti pakeitimus
            </Button>
          </Group>
        )}
        <Modal
          opened={discardOpen}
          onClose={() => setDiscardOpen(false)}
          title="Atnaujinti neišsaugant?"
          centered
        >
          <Stack>
            <Text>
              Jūsų neišsaugoti pakeitimai bus atmesti ir įkelta naujausia nustatymų versija.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setDiscardOpen(false)}>
                Tęsti redagavimą
              </Button>
              <Button color="red" onClick={() => void reload()}>
                Atmesti ir atnaujinti
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
