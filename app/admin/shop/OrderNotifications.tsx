'use client';
import { Alert, Badge, Button, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import type {
  ShopNotificationList,
  ShopNotificationPreview,
  ShopNotificationView,
} from '@/lib/shop/commerce-contract';

type Preview = ShopNotificationPreview & { id: string };
const labels: Record<ShopNotificationView['status'], string> = {
  pending: 'Laukia siuntimo',
  sending: 'Siunčiamas',
  sent: 'Išsiųstas',
  failed: 'Siuntimas nepavyko',
  dead: 'Reikia pakartoti rankiniu būdu',
  preview: 'Vietinė peržiūra',
};
const date = (value: string) => new Date(value).toLocaleString('lt-LT');

export function OrderNotifications({ orderId, version }: { orderId: string; version: string }) {
  const [data, setData] = useState<ShopNotificationList | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestInFlight = useRef(false);
  const load = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError('');
    try {
      setData(await shopRequest(`orders/${orderId}/notifications`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }, [orderId]);
  useEffect(() => {
    void version;
    void load();
  }, [load, version]);

  async function showPreview(id: string) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await shopRequest(`orders/${orderId}/notifications/${encodeURIComponent(id)}`);
      setPreview({ ...result, id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }
  async function retry(id: string) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError('');
    try {
      setData(
        await shopRequest(
          `orders/${orderId}/notifications/${encodeURIComponent(id)}/retry`,
          'POST',
          {},
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Stack gap="sm" mt="md">
      <Group justify="space-between">
        <Title order={4}>Laiškai pirkėjui</Title>
        <Button variant="subtle" size="xs" disabled={busy} onClick={load}>
          Atnaujinti laiškus
        </Button>
      </Group>
      {data?.transport === 'preview' && (
        <Alert color="blue">
          Vietinės laiškų peržiūros. Laiškai išsaugomi bandymui ir gavėjams nesiunčiami.
        </Alert>
      )}
      {data && (data.transport === 'disabled' || !data.configured) && (
        <Alert color="yellow">Laiškų siuntimas nesukonfigūruotas.</Alert>
      )}
      {busy && <Loader size="sm" />}
      {error && <Alert color="red">{error}</Alert>}
      {data?.notifications.length === 0 && (
        <Text size="sm" c="dimmed">
          Laiškų dar nėra.
        </Text>
      )}
      {data?.notifications.map((notification) => (
        <Stack
          key={notification.id}
          gap="xs"
          p="sm"
          style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 4 }}
        >
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {notification.label}
            </Text>
            <Badge
              color={
                notification.status === 'failed' || notification.status === 'dead'
                  ? 'red'
                  : notification.status === 'sent'
                    ? 'teal'
                    : 'gray'
              }
              variant="light"
            >
              {labels[notification.status]}
            </Badge>
          </Group>
          <Text size="sm">{notification.subject}</Text>
          <Text size="xs" c="dimmed">
            Sukurta {date(notification.createdAt)} · Bandymų: {notification.attempts}
            {notification.sentAt ? ` · Išsiųsta ${date(notification.sentAt)}` : ''}
          </Text>
          {notification.nextAttemptAt &&
            (notification.status === 'pending' || notification.status === 'failed') && (
              <Text size="xs" c="dimmed">
                Kitas bandymas: {date(notification.nextAttemptAt)}
              </Text>
            )}
          {notification.lastError && (
            <Text size="xs" c="red">
              {notification.lastError}
            </Text>
          )}
          <Group>
            <Button
              size="xs"
              variant="default"
              disabled={busy}
              onClick={() => showPreview(notification.id)}
            >
              Peržiūrėti laišką
            </Button>
            {(notification.status === 'failed' || notification.status === 'dead') && (
              <Button
                size="xs"
                variant="light"
                disabled={busy}
                onClick={() => retry(notification.id)}
              >
                Kartoti siuntimą
              </Button>
            )}
            {preview?.id === notification.id && (
              <Button size="xs" variant="subtle" onClick={() => setPreview(null)}>
                Uždaryti peržiūrą
              </Button>
            )}
          </Group>
          {preview?.id === notification.id && (
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {preview.subject}
              </Text>
              <iframe
                title={`Laiško „${preview.subject}“ peržiūra`}
                srcDoc={preview.html}
                sandbox=""
                referrerPolicy="no-referrer"
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 680,
                  height: 640,
                  maxHeight: '75vh',
                  marginInline: 'auto',
                  border: '1px solid var(--mantine-color-gray-3)',
                  borderRadius: 4,
                  background: '#f6f3ed',
                }}
              />
              <details>
                <summary>Paprasto teksto versija</summary>
                <Text
                  component="pre"
                  size="sm"
                  style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    fontFamily: 'inherit',
                  }}
                >
                  {preview.text}
                </Text>
              </details>
              {preview.returnUrl && /^https?:\/\//.test(preview.returnUrl) && (
                <Button
                  component="a"
                  href={preview.returnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  size="sm"
                  mb="sm"
                >
                  Atidaryti užsakymo nuorodą ↗
                </Button>
              )}
              {preview.contractText && (
                <details>
                  <summary>Užsakymo kopija ir patvirtinti dokumentai</summary>
                  <Text
                    component="pre"
                    size="sm"
                    style={{
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      fontFamily: 'inherit',
                    }}
                  >
                    {preview.contractText}
                  </Text>
                </details>
              )}
            </Stack>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
