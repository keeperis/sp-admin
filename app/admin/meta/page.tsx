'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconBrandFacebook, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import useSWR from 'swr';

type CredentialStatus = {
  configured: boolean;
  pageId: string;
  pageName?: string;
  tokenType?: string;
  status: 'not_configured' | 'active' | 'expiring' | 'expired' | 'invalid';
  expiresAt?: string | null;
  dataAccessExpiresAt?: string | null;
  daysRemaining?: number | null;
  lastValidationOk?: boolean;
  lastEventsCount?: number | null;
  scopes?: string[];
  tasks?: string[];
  lastValidatedAt?: string;
  rotatedAt?: string;
  updatedByEmail?: string;
  lastError?: {
    category: string;
    code?: number;
    message: string;
    fbtraceId?: string;
  } | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Nepavyko gauti Meta būsenos');
  return payload;
};

function formattedDate(value?: string | null): string {
  if (!value) return 'Nenurodyta';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('lt-LT', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusColor(status?: CredentialStatus['status']) {
  if (status === 'active') return 'green';
  if (status === 'expiring') return 'yellow';
  if (status === 'expired' || status === 'invalid') return 'red';
  return 'gray';
}

function statusLabel(status?: CredentialStatus['status']) {
  if (status === 'active') return 'Veikia';
  if (status === 'expiring') return 'Baigia galioti';
  if (status === 'expired') return 'Nebegalioja';
  if (status === 'invalid') return 'Neveikia';
  if (status === 'not_configured') return 'Nesukonfigūruota';
  return 'Nežinoma';
}

async function responsePayload(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    const details = [payload.category, payload.stage, payload.error].filter(Boolean).join(' · ');
    throw new Error(details || 'Operacija nepavyko');
  }
  return payload;
}

export default function MetaIntegrationPage() {
  const { data, error, isLoading, mutate } = useSWR<{ credential: CredentialStatus }>(
    '/api/admin/meta/credentials/status',
    fetcher,
    { revalidateOnFocus: false },
  );
  const [temporaryToken, setTemporaryToken] = useState('');
  const [exchanging, setExchanging] = useState(false);
  const [validating, setValidating] = useState(false);
  const credential = data?.credential;

  const exchangeToken = async () => {
    const submittedToken = temporaryToken.trim();
    if (!submittedToken) return;
    setTemporaryToken('');
    setExchanging(true);
    try {
      const response = await fetch('/api/admin/meta/credentials/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ temporaryToken: submittedToken }),
      });
      const payload = await responsePayload(response);
      notifications.show({
        color: 'green',
        title: 'Meta tokenas atnaujintas',
        message: `${payload.page.name}: Page ir events patikros sėkmingos (${payload.eventsCount} eventai).`,
      });
      await mutate();
    } catch (cause) {
      notifications.show({
        color: 'red',
        title: 'Tokeno atnaujinti nepavyko',
        message: cause instanceof Error ? cause.message : 'Nežinoma klaida',
      });
    } finally {
      setExchanging(false);
    }
  };

  const validateToken = async () => {
    setValidating(true);
    try {
      const response = await fetch('/api/admin/meta/credentials/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: '{}',
      });
      const payload = await responsePayload(response);
      notifications.show({
        color: 'green',
        title: 'Meta credentialas galioja',
        message: `Page ir events patikros sėkmingos (${payload.eventsCount} eventai).`,
      });
      await mutate();
    } catch (cause) {
      notifications.show({
        color: 'red',
        title: 'Credentialo patikra nepavyko',
        message: cause instanceof Error ? cause.message : 'Nežinoma klaida',
      });
      await mutate();
    } finally {
      setValidating(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={1}>Meta integracija</Title>
            <Text c="dimmed">Facebook Page tokeno valdymas ir patikra.</Text>
          </div>
          <IconBrandFacebook size={36} />
        </Group>

        {error ? <Alert color="red">{error.message}</Alert> : null}

        <Card withBorder padding="lg">
          <Stack>
            <Group justify="space-between">
              <Title order={3}>Credential būsena</Title>
              <Badge color={statusColor(credential?.status)} variant="light">
                {isLoading ? 'Tikrinama' : statusLabel(credential?.status)}
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <div>
                <Text size="sm" c="dimmed">
                  Page
                </Text>
                <Text fw={600}>
                  {credential?.pageName || credential?.pageId || 'Nesukonfigūruota'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Tokeno tipas
                </Text>
                <Text fw={600}>{credential?.tokenType || '—'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Galioja iki
                </Text>
                <Text fw={600}>
                  {credential?.configured && !credential.expiresAt
                    ? 'Nėra fiksuotos galiojimo pabaigos'
                    : formattedDate(credential?.expiresAt)}
                </Text>
                {credential?.configured && !credential.expiresAt ? (
                  <Text size="xs" c="dimmed">
                    Meta grąžina expires_at=0. Tokenas vis tiek gali būti atšauktas.
                  </Text>
                ) : null}
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Duomenų prieiga iki
                </Text>
                <Text fw={600}>{formattedDate(credential?.dataAccessExpiresAt)}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Paskutinė patikra
                </Text>
                <Text fw={600}>{formattedDate(credential?.lastValidatedAt)}</Text>
              </div>
            </SimpleGrid>
            {credential?.configured && credential.lastValidationOk !== false ? (
              <Alert color="green" title="Tokenas veikia">
                Page ir Events patikros sėkmingos
                {credential.lastEventsCount !== null && credential.lastEventsCount !== undefined
                  ? `. Rasta eventų: ${credential.lastEventsCount}.`
                  : '.'}
              </Alert>
            ) : null}
            {credential?.configured && credential.lastValidationOk === false ? (
              <Alert
                color="red"
                icon={<IconAlertTriangle size={18} />}
                title="Tokeno patikra nepavyko"
              >
                Peržiūrėk žemiau pateiktą Meta diagnostiką ir atnaujink tokeną.
              </Alert>
            ) : null}
            {credential?.lastError ? (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {credential.lastError.category}: {credential.lastError.message}
                {credential.lastError.fbtraceId ? ` (${credential.lastError.fbtraceId})` : ''}
              </Alert>
            ) : null}
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              loading={validating}
              disabled={!credential?.configured}
              onClick={validateToken}
            >
              Patikrinti dabar
            </Button>
          </Stack>
        </Card>

        <Card withBorder padding="lg">
          <Stack>
            <Title order={3}>Atnaujinti Page tokeną</Title>
            <Text size="sm" c="dimmed">
              Laikinas tokenas siunčiamas tik į serverį, naršyklėje neišsaugomas ir po pateikimo
              išvalomas.
            </Text>
            <PasswordInput
              label="Laikinas User arba Page Access Token"
              value={temporaryToken}
              onChange={(event) => setTemporaryToken(event.currentTarget.value)}
              autoComplete="off"
              disabled={exchanging}
            />
            <Button
              leftSection={<IconRefresh size={16} />}
              loading={exchanging}
              disabled={!temporaryToken.trim()}
              onClick={exchangeToken}
            >
              Generuoti, patikrinti ir išsaugoti
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
