'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconBuildingBank, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

type Site = 'ceramics' | 'yoga';

type BankTransferSettingsData = {
  bankName: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  iban: string;
  paymentPurposePrefix: string;
};

type BankTransferSettingsResponse = {
  configured: boolean;
  data: BankTransferSettingsData;
  site: Site;
  version: number;
};

const PROJECT_OPTIONS: Array<{ value: Site; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
];

const emptySettings = (): BankTransferSettingsData => ({
  bankName: '',
  beneficiaryCode: '',
  beneficiaryName: '',
  iban: '',
  paymentPurposePrefix: 'Registracija',
});

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Nepavyko įkelti pavedimo rekvizitų');
  }
  return payload as BankTransferSettingsResponse;
};

export default function BankTransferSettingsPage() {
  const [site, setSite] = useState<Site>('ceramics');
  const [version, setVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const apiUrl = `/api/admin/bank-transfer?site=${site}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<BankTransferSettingsResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const form = useForm<BankTransferSettingsData>({
    initialValues: emptySettings(),
    validate: {
      beneficiaryName: (value) => (value.trim() ? null : 'Įveskite gavėjo pavadinimą'),
      iban: (value) => (value.trim() ? null : 'Įveskite IBAN sąskaitą'),
      paymentPurposePrefix: (value) =>
        value.trim() ? null : 'Įveskite mokėjimo paskirties prefiksą',
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: data is the intended sync trigger for this Mantine form.
  useEffect(() => {
    if (!data) return;
    form.setValues(data.data);
    form.resetDirty(data.data);
    setVersion(data.version);
  }, [data]);

  const previewPurpose = useMemo(() => {
    const prefix = form.values.paymentPurposePrefix.trim() || 'Registracija';
    return `${prefix} 2026-08-08 10:00`;
  }, [form.values.paymentPurposePrefix]);

  const save = form.onSubmit(async (values) => {
    if (version === null) return;

    setSaving(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          version,
          data: {
            bankName: values.bankName.trim(),
            beneficiaryCode: values.beneficiaryCode.trim(),
            beneficiaryName: values.beneficiaryName.trim(),
            iban: values.iban.trim(),
            paymentPurposePrefix: values.paymentPurposePrefix.trim(),
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (payload?.conflict) {
          throw new Error('Rekvizitai pasikeitė kitame lange. Atnaujinkite puslapį.');
        }
        const issue = payload?.issues?.[0];
        throw new Error(issue ? `${issue.path?.join('.')}: ${issue.message}` : payload?.error);
      }

      setVersion(payload.version);
      form.setValues(payload.data);
      form.resetDirty(payload.data);
      await mutate(payload, { revalidate: false });
      notifications.show({ color: 'green', message: 'Pavedimo rekvizitai išsaugoti' });
    } catch (cause: any) {
      notifications.show({
        color: 'red',
        message: cause?.message || 'Nepavyko išsaugoti rekvizitų',
      });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Group gap="sm" align="center">
              <IconBuildingBank size={28} />
              <Title order={1}>Pavedimo rekvizitai</Title>
            </Group>
            <Text c="dimmed">
              Šie rekvizitai rodomi klientui neapmokėtos admin registracijos lange.
            </Text>
          </div>
          <Group align="flex-end">
            <Select
              label="Projektas"
              data={PROJECT_OPTIONS}
              value={site}
              allowDeselect={false}
              onChange={(value) => {
                setSite(value === 'yoga' ? 'yoga' : 'ceramics');
                setVersion(null);
                form.setValues(emptySettings());
                form.resetDirty(emptySettings());
              }}
              w={170}
            />
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => mutate()}
              loading={isValidating}
            >
              Atnaujinti
            </Button>
          </Group>
        </Group>

        {error ? (
          <Alert color="red" title="Nepavyko įkelti rekvizitų">
            {error.message}
          </Alert>
        ) : null}

        <Card withBorder radius="md" padding="lg">
          {isLoading && !data ? (
            <Group justify="center" py="xl">
              <Loader />
              <Text c="dimmed">Kraunami rekvizitai...</Text>
            </Group>
          ) : (
            <form onSubmit={save}>
              <Stack gap="md">
                <Group justify="space-between">
                  <div>
                    <Title order={2} size="h3">
                      {site === 'ceramics' ? 'Ceramics' : 'Yoga'}
                    </Title>
                    <Text size="sm" c="dimmed">
                      Versija: {version ?? '-'}
                    </Text>
                  </div>
                  <Badge color={data?.configured ? 'green' : 'orange'} variant="light">
                    {data?.configured ? 'Sukonfigūruota' : 'Trūksta duomenų'}
                  </Badge>
                </Group>

                <TextInput
                  label="Gavėjo pavadinimas"
                  required
                  placeholder="Soul Poetry"
                  {...form.getInputProps('beneficiaryName')}
                />
                <Group grow>
                  <TextInput
                    label="Gavėjo kodas"
                    placeholder="Įmonės arba individualios veiklos kodas"
                    {...form.getInputProps('beneficiaryCode')}
                  />
                  <TextInput
                    label="Bankas"
                    placeholder="Banko pavadinimas"
                    {...form.getInputProps('bankName')}
                  />
                </Group>
                <TextInput
                  label="IBAN sąskaita"
                  required
                  placeholder="LT..."
                  {...form.getInputProps('iban')}
                />
                <TextInput
                  label="Mokėjimo paskirties prefiksas"
                  required
                  description={`Pavyzdys klientui: ${previewPurpose}`}
                  {...form.getInputProps('paymentPurposePrefix')}
                />

                <Group justify="flex-end">
                  <Button
                    type="submit"
                    leftSection={<IconDeviceFloppy size={16} />}
                    loading={saving}
                    disabled={!form.isDirty()}
                  >
                    Išsaugoti
                  </Button>
                </Group>
              </Stack>
            </form>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
