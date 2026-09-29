'use client';

import { Alert, Button, Group, List, Paper, Stack, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';

type Config = { configured: boolean; publicKey: string | null };

async function request(body?: unknown) {
  const response = await fetch('/api/admin/push', {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: body
      ? { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Nepavyko atnaujinti pranešimų nustatymų.');
  return result;
}

function applicationKey(value: string) {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function NotificationSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [supported, setSupported] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const canPush =
      window.isSecureContext &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setSupported(canPush);
    setNeedsInstall(ios && !standalone);
    if (canPush) setPermission(Notification.permission);
    const settings = await request();
    setConfig(settings);
    if (canPush) {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      setEnabled(
        subscription
          ? (await request({ action: 'status', endpoint: subscription.endpoint })).enabled
          : false,
      );
    }
  }, []);

  useEffect(() => {
    void refresh()
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [refresh]);

  async function enable() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      // Permission is requested directly in the user's click handler (required on iOS).
      const consent =
        Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setPermission(consent);
      if (consent !== 'granted')
        throw new Error(
          'Pranešimų leidimas nesuteiktas. Jį galite pakeisti telefono nustatymuose.',
        );
      if (!config?.publicKey) throw new Error('Pranešimai serveryje nesukonfigūruoti.');
      await navigator.serviceWorker.register('/admin-push-sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Nepavyko aktyvuoti pranešimų. Perkraukite aplikaciją ir bandykite dar kartą.',
                ),
              ),
            20_000,
          ),
        ),
      ]);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription?.options.applicationServerKey) {
        const oldKey = new Uint8Array(subscription.options.applicationServerKey);
        const newKey = applicationKey(config.publicKey);
        if (
          oldKey.length !== newKey.length ||
          oldKey.some((byte, index) => byte !== newKey[index])
        ) {
          await request({ action: 'disable', endpoint: subscription.endpoint });
          await subscription.unsubscribe();
          subscription = null;
        }
      }
      let created = false;
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey(config.publicKey),
        });
        created = true;
      }
      try {
        await request({ action: 'enable', subscription: subscription.toJSON() });
      } catch (e) {
        if (created) await subscription.unsubscribe();
        throw e;
      }
      setEnabled(true);
      setNotice(
        'Įjungta šiame įrenginyje. Paspauskite „Bandomasis pranešimas“ ir patikrinkite telefono pranešimų centrą.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepavyko įjungti pranešimų.');
    } finally {
      setBusy(false);
    }
  }

  async function action(kind: 'disable' | 'test') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        setEnabled(false);
        throw new Error('Prenumeratos nėra. Įjunkite pranešimus iš naujo.');
      }
      await request({ action: kind, endpoint: subscription.endpoint });
      if (kind === 'disable') {
        await subscription.unsubscribe();
        setEnabled(false);
        setNotice('Pranešimai šiame įrenginyje išjungti.');
      } else
        setNotice(
          'Push paslauga priėmė testą. Patikrinkite telefono pranešimų centrą; „Focus“ gali nutildyti pranešimą.',
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pranešimo veiksmas nepavyko.');
    } finally {
      await refresh().catch(() => {});
      setBusy(false);
    }
  }

  return (
    <Stack maw={720}>
      <Title order={2}>Pranešimai į telefoną</Title>
      <Text>
        Šiame įrenginyje gaukite pranešimus apie naujas registracijas į nuolatinius užsiėmimus ir
        vieno karto dirbtuves.
      </Text>
      <Paper withBorder p="lg" radius="md">
        <Stack>
          <Text fw={600}>
            {enabled && permission === 'granted'
              ? 'Pranešimai įjungti šiame įrenginyje'
              : 'Pranešimai šiame įrenginyje neįjungti'}
          </Text>
          {needsInstall && (
            <Alert color="blue">
              iPhone: Safari → Bendrinti → Pridėti prie pagrindinio ekrano. Tada atidarykite
              aplikaciją iš jos ikonos. Reikalinga iOS 16.4 arba naujesnė.
            </Alert>
          )}
          {!supported && !busy && (
            <Alert color="yellow">
              Ši naršyklė arba įrenginio režimas nepalaiko Web Push. iPhone naudokite Home Screen
              aplikaciją su iOS 16.4 ar naujesne.
            </Alert>
          )}
          {permission === 'denied' && (
            <Alert color="yellow">
              Leidimas užblokuotas. Telefono Nustatymai → Pranešimai → SoulPoetry → Leisti
              pranešimus; tada grįžkite ir perkraukite šį puslapį.
            </Alert>
          )}
          {config && !config.configured && (
            <Alert color="yellow">Siuntimo tarnyba dar nesukonfigūruota.</Alert>
          )}
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          {notice && (
            <Alert color="green" role="status">
              {notice}
            </Alert>
          )}
          <Group>
            {(!enabled || permission !== 'granted') && (
              <Button
                loading={busy}
                disabled={
                  !supported || needsInstall || !config?.configured || permission === 'denied'
                }
                onClick={enable}
              >
                Įjungti pranešimus
              </Button>
            )}
            {enabled && (
              <>
                <Button
                  variant="light"
                  disabled={busy || permission !== 'granted'}
                  onClick={() => action('test')}
                >
                  Bandomasis pranešimas
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  disabled={busy}
                  onClick={() => action('disable')}
                >
                  Išjungti šiame įrenginyje
                </Button>
              </>
            )}
          </Group>
        </Stack>
      </Paper>
      <List size="sm" spacing="xs">
        <List.Item>
          Pavedimu: pateikus registraciją. Kortele: patvirtinus mokėjimą. Rankiniu būdu: sukūrus
          patvirtintą registraciją.
        </List.Item>
        <List.Item>
          Paprastai išsiunčiama per 1–2 minutes. Ankstesnės registracijos nesiunčiamos; kiekvieną
          įrenginį įjunkite atskirai.
        </List.Item>
        <List.Item>
          Užrakintame ekrane klientų vardai, kontaktai ir mokėjimo sumos nerodomi. Paspaudus
          atsidaro atitinkama admin skiltis.
        </List.Item>
        <List.Item>
          Pranešimai veikia ir uždarius aplikaciją. Juos gali nutildyti telefono „Focus“ ar
          pranešimų nustatymai. Administravimui ir toliau reikalingas internetas.
        </List.Item>
      </List>
    </Stack>
  );
}
