'use client';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Group,
  PasswordInput,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import { type DpdTrackingStatus, dpdTrackingLabels } from '@/lib/shop/dpd-tracking-contract';

type Settings = {
  configured: boolean;
  enabled: boolean;
  verified: boolean;
  revision: number;
  lastVerifiedAt: string | null;
  lastVerificationError: string | null;
  pollIntervalMinutes: number;
};
export function DpdTrackingSettings() {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [token, setToken] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [parcelNumber, setParcelNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const accept = useCallback((value: Settings) => {
    setSaved(value);
    setEnabled(value.enabled);
  }, []);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      accept(await shopRequest('shipping/dpd/tracking/settings'));
      setError('');
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }, [accept]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save() {
    if (!saved || busy) return;
    setBusy(true);
    setError('');
    setResult('');
    try {
      accept(
        await shopRequest('shipping/dpd/tracking/settings', 'PUT', {
          revision: saved.revision,
          enabled,
          ...(token ? { token } : {}),
        }),
      );
      setToken('');
      setResult('Sekimo nustatymai išsaugoti.');
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    if (!saved || busy) return;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const response = await shopRequest('shipping/dpd/tracking/test', 'POST', {
        revision: saved.revision,
        parcelNumber,
      });
      accept(response.settings);
      setResult(
        `Ryšys patikrintas. ${dpdTrackingLabels[response.parcel.status as DpdTrackingStatus] || response.parcel.statusCode || 'Siuntos būsena gauta'}`,
      );
    } catch (problem) {
      try {
        accept(await shopRequest('shipping/dpd/tracking/settings'));
      } catch {
        /* Keep the original test error visible. */
      }
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const dirty = !!token || (saved && enabled !== saved.enabled);
  return (
    <Accordion variant="contained" radius="md">
      <Accordion.Item value="tracking">
        <Accordion.Control>
          <Group justify="space-between" pr="sm">
            <Text fw={600}>Automatinis siuntų sekimas</Text>
            <Badge color={saved?.enabled && saved.verified ? 'teal' : 'gray'}>
              {saved?.enabled && saved.verified
                ? 'Įjungtas'
                : saved?.verified
                  ? 'Išjungtas'
                  : saved?.configured
                    ? 'Reikia patikros'
                    : 'Nesukonfigūruotas'}
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <Text size="sm">
              Išsiųstos siuntos tikrinamos kas valandą. Gavėjui gavus siuntą, užsakymas pažymimas
              „Įvykdytas“. Pristatymas į paštomatą dar nelaikomas atsiėmimu.
            </Text>
            <Text size="sm" c="dimmed">
              Sekimui reikalingas atskiras DPD „esiunta“ API raktas. Etikečių ir kurjerio iškvietimo
              prisijungimai lieka DPD paskyros nustatymuose.
            </Text>
            <PasswordInput
              label={saved?.configured ? 'Naujas sekimo API raktas' : 'Sekimo API raktas'}
              placeholder={
                saved?.configured
                  ? 'Išsaugotas · palik tuščią, jei nekeiti'
                  : 'DPD suteiktas raktas'
              }
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
              autoComplete="new-password"
              disabled={busy}
            />
            <Switch
              label="Automatiškai tikrinti išsiųstas siuntas"
              checked={enabled}
              onChange={(event) => setEnabled(event.currentTarget.checked)}
              disabled={busy}
            />
            <Group>
              <Button onClick={save} disabled={!dirty || !saved} loading={busy}>
                Išsaugoti sekimą
              </Button>
              <Button variant="default" disabled={busy || !!dirty} onClick={load}>
                Atnaujinti
              </Button>
            </Group>
            {saved?.configured && !saved.verified && (
              <Alert color="yellow">
                Prieš įjungiant automatinį sekimą, patikrink raktą su esamos DPD siuntos numeriu.
              </Alert>
            )}
            <TextInput
              label="Esamos DPD siuntos numeris"
              description="Ryšio patikra nesiunčia naujos siuntos ir nekeičia užsakymo būsenos."
              value={parcelNumber}
              onChange={(event) => setParcelNumber(event.currentTarget.value.replace(/\s/g, ''))}
              maxLength={14}
              disabled={busy}
            />
            <Button
              variant="light"
              disabled={busy || !!dirty || !saved?.configured || !/^\d{14}$/.test(parcelNumber)}
              onClick={test}
            >
              Patikrinti sekimą
            </Button>
            {saved?.lastVerifiedAt && (
              <Text size="xs" c="dimmed">
                Paskutinė patikra: {new Date(saved.lastVerifiedAt).toLocaleString('lt-LT')}
              </Text>
            )}
            {saved?.lastVerificationError && (
              <Alert color="orange">{saved.lastVerificationError}</Alert>
            )}
            {error && <Alert color="red">{error}</Alert>}
            {result && (
              <Alert color="teal" role="status">
                {result}
              </Alert>
            )}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
