'use client';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import { shopPreviewStartUrl } from '@/lib/shop/preview-config';

type AccessState = { revision: number; isPublic: boolean; updatedAt: string | null };

export function ShopAccessPanel() {
  const [saved, setSaved] = useState<AccessState | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const previewUrl = shopPreviewStartUrl();
  const dirty = saved !== null && saved.isPublic !== isPublic;
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const next: AccessState = await shopRequest('access');
      setSaved(next);
      setIsPublic(next.isPublic);
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'Nepavyko gauti parduotuvės prieigos nustatymų.',
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!saved || !dirty || busy) return;
    setBusy(true);
    setError('');
    try {
      const next: AccessState = await shopRequest('access', 'PUT', {
        revision: saved.revision,
        isPublic,
      });
      setSaved(next);
      setIsPublic(next.isPublic);
      notifications.show({
        color: 'teal',
        title: 'Prieiga išsaugota',
        message: next.isPublic
          ? 'Parduotuvė matoma visiems lankytojams.'
          : 'Parduotuvę gali peržiūrėti prisijungę administratoriai.',
      });
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Nepavyko išsaugoti parduotuvės prieigos.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={3}>Parduotuvės prieiga</Title>
          {saved && (
            <Badge color={saved.isPublic ? 'teal' : 'orange'}>
              {saved.isPublic ? 'Vieša' : 'Uždaryta lankytojams'}
            </Badge>
          )}
        </Group>
        {!saved && busy && <Loader size="sm" aria-label="Kraunami prieigos nustatymai" />}
        <Text size="sm" c="dimmed">
          Kol parduotuvė uždaryta, lankytojai mato pranešimą apie ruošiamą parduotuvę. Prisijungę
          administratoriai gali ją peržiūrėti ir tęsti darbus.
        </Text>
        <Switch
          label="Parduotuvė vieša"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.currentTarget.checked)}
          disabled={!saved || busy}
          description={dirty ? 'Pakeitimas įsigalios paspaudus „Išsaugoti prieigą“.' : undefined}
        />
        {dirty && isPublic && (
          <Alert color="yellow">Išsaugojus parduotuvė bus pasiekiama visiems lankytojams.</Alert>
        )}
        {error && (
          <Alert color="red" title="Prieiga nepakeista">
            {error}
          </Alert>
        )}
        {!previewUrl && (
          <Alert color="yellow">Parduotuvės peržiūros adresas dar nesukonfigūruotas.</Alert>
        )}
        <Group>
          <Button color="teal" onClick={save} loading={busy && !!saved} disabled={!dirty || busy}>
            Išsaugoti prieigą
          </Button>
          <Button variant="default" onClick={load} disabled={busy}>
            Atnaujinti prieigos būseną
          </Button>
          {previewUrl && (
            <Button
              component="a"
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
            >
              Peržiūrėti parduotuvę
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
