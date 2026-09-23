'use client';

import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconRefresh } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { nextGroupDate } from '@/lib/recurring/participants';
import type { SiteKey } from '@/lib/site';
import { GroupAttendanceTable } from './GroupAttendanceTable';

type Program = { id: string; nameLt: string; status: string };
type ClassGroup = {
  id: string;
  programId: string;
  name: string;
  status: string;
  weekday: number;
  startTime: string;
  durationMin: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  singleVisitEnabled: boolean;
  singleVisitPriceEur: number | null;
};
type Plan = {
  id: string;
  nameLt: string;
  sessionCount: number;
  validityDays: number;
  priceEur: number;
};

const WEEKDAYS = [
  'pirmadieniais',
  'antradieniais',
  'trečiadieniais',
  'ketvirtadieniais',
  'penktadieniais',
  'šeštadieniais',
  'sekmadieniais',
];
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Nepavyko gauti dalyvių duomenų.');
  return result;
};
const apiUrl = (resource: string, params: Record<string, string>) =>
  `/api/admin/recurring/${resource}?${new URLSearchParams(params)}`;

export function GroupParticipants({
  site,
  programs,
  groups,
  onViewParticipant,
  loadError,
  loading,
}: {
  site: SiteKey;
  programs: Program[];
  groups: ClassGroup[];
  onViewParticipant: (subscriptionId: string) => Promise<void>;
  loadError?: string;
  loading: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [manualOpened, setManualOpened] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualGroupId, setManualGroupId] = useState<string>();
  const programById = new Map(programs.map((program) => [program.id, program]));
  const sortedGroups = [...groups].sort(
    (a, b) =>
      (programById.get(a.programId)?.nameLt || '').localeCompare(
        programById.get(b.programId)?.nameLt || '',
        'lt',
      ) ||
      a.weekday - b.weekday ||
      a.startTime.localeCompare(b.startTime) ||
      a.name.localeCompare(b.name, 'lt'),
  );
  const openManual = (groupId?: string) => {
    setManualGroupId(groupId);
    setManualOpened(true);
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ minWidth: 0 }}>
      <Stack gap="lg" style={{ minWidth: 0 }}>
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Title order={4} style={{ minWidth: 0 }}>
              Grupių dalyviai ir lankymas
            </Title>
            <Button
              variant="subtle"
              style={{ flexShrink: 0 }}
              leftSection={<IconRefresh size={16} />}
              onClick={() =>
                void mutate((key) => typeof key === 'string' && key.includes('/attendance?'))
              }
            >
              Atnaujinti
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Visos grupės ir jų užsiėmimų datos. Paspauskite langelį lankymui pažymėti, o dalyvio
            vardą — jo informacijai peržiūrėti.
          </Text>
        </Stack>
        {loadError ? (
          <Alert color="red" title="Nepavyko įkelti grupių">
            {loadError}
          </Alert>
        ) : loading ? (
          <Loader size="sm" />
        ) : sortedGroups.length === 0 ? (
          <Text c="dimmed">Šiame projekte grupių dar nėra. Sukurkite užsiėmimų ciklą.</Text>
        ) : (
          sortedGroups.map((group) => (
            <GroupAttendanceTable
              key={group.id}
              site={site}
              group={group}
              programName={programById.get(group.programId)?.nameLt || 'Užsiėmimų ciklas'}
              canAdd={
                group.status === 'active' && programById.get(group.programId)?.status === 'active'
              }
              onAddParticipant={() => openManual(group.id)}
              onViewParticipant={onViewParticipant}
            />
          ))
        )}
      </Stack>
      <Modal
        opened={manualOpened}
        onClose={() => {
          if (!manualSaving) setManualOpened(false);
        }}
        closeOnClickOutside={!manualSaving}
        closeOnEscape={!manualSaving}
        withCloseButton={!manualSaving}
        title="Pridėti dalyvį rankiniu būdu"
        size="lg"
      >
        {manualOpened && (
          <ManualParticipantForm
            site={site}
            programs={programs}
            groups={groups}
            initialGroupId={manualGroupId}
            onSavingChange={setManualSaving}
            onSaved={(id) => {
              setManualOpened(false);
              void onViewParticipant(id);
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

function ManualParticipantForm({
  site,
  programs,
  groups,
  initialGroupId,
  initialProgramId,
  initialDate,
  onSavingChange,
  onSaved,
}: {
  site: SiteKey;
  programs: Program[];
  groups: ClassGroup[];
  initialGroupId?: string;
  initialProgramId?: string;
  initialDate?: string;
  onSavingChange: (saving: boolean) => void;
  onSaved: (id: string, groupId: string) => void;
}) {
  const { mutate } = useSWRConfig();
  const firstGroup = groups.find(
    (group) => group.id === initialGroupId && group.status === 'active',
  );
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const form = useForm({
    initialValues: {
      programId: firstGroup?.programId || initialProgramId || '',
      defaultGroupId: firstGroup?.id || '',
      planId: '',
      startDate:
        initialDate ||
        (firstGroup
          ? nextGroupDate(
              firstGroup.weekday,
              firstGroup.effectiveFrom,
              undefined,
              firstGroup.startTime,
            )
          : ''),
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      priceEur: '' as number | '',
    },
    validate: {
      programId: (value) => (!value ? 'Pasirinkite ciklą.' : null),
      defaultGroupId: (value) => (!value ? 'Pasirinkite grupę.' : null),
      planId: (value) => (!value ? 'Pasirinkite planą.' : null),
      startDate: (value) => (!value ? 'Pasirinkite lankymo pradžią.' : null),
      customerName: (value) => (!value.trim() ? 'Įrašykite dalyvio vardą ir pavardę.' : null),
      customerEmail: (value) =>
        value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? 'Įrašykite teisingą el. paštą arba palikite lauką tuščią.'
          : null,
      priceEur: (value) =>
        typeof value !== 'number' || value < 0 ? 'Įrašykite kainą (gali būti 0).' : null,
    },
  });
  const group = groups.find((item) => item.id === form.values.defaultGroupId);
  const plans = useSWR<{ plans: Plan[] }>(
    form.values.programId
      ? apiUrl('plans', { site, programId: form.values.programId, status: 'active' })
      : null,
    fetcher,
  );
  const availablePlans = (plans.data?.plans || []).filter(
    (plan) => plan.sessionCount !== 1 || group?.singleVisitEnabled,
  );
  const plan = availablePlans.find((item) => item.id === form.values.planId);

  const submit = form.onSubmit(async (values) => {
    if (submitting.current || !plan || !group) return;
    submitting.current = true;
    setSaving(true);
    onSavingChange(true);
    setError('');
    try {
      const response = await fetch('/api/admin/recurring/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          ...values,
          customerName: values.customerName.trim(),
          customerEmail: values.customerEmail.trim().toLowerCase(),
          customerPhone: values.customerPhone.trim(),
          site,
          status: 'active',
          purchaseChannel: 'admin',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nepavyko pridėti dalyvio.');
      notifications.show({
        message: 'Dalyvis pridėtas. Abonementas ir užsiėmimų rezervacijos sukurtos.',
        color: 'green',
      });
      // Refresh every visible recurring view, including the parent summary and roster.
      void mutate((key) => typeof key === 'string' && key.startsWith('/api/admin/recurring/'));
      onSaved(result.subscription.id, values.defaultGroupId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Nepavyko pridėti dalyvio.');
    } finally {
      submitting.current = false;
      setSaving(false);
      onSavingChange(false);
    }
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Alert color="blue">
          Bus sukurtas aktyvus abonementas ir rezervuotos vietos pagal planą. Mokėjimas nebus
          vykdomas, el. laiškas automatiškai nesiunčiamas. El. paštas neprivalomas; jį nurodžius,
          prisijungimo nuorodą galėsite išsiųsti iš dalyvio kortelės.
        </Alert>
        {error && (
          <Alert color="red" title="Dalyvis nepridėtas">
            {error}
          </Alert>
        )}
        <Select
          label="Dalyvio užsiėmimų ciklas"
          required
          disabled={saving}
          data={programs
            .filter((item) => item.status === 'active')
            .map((item) => ({ value: item.id, label: item.nameLt }))}
          {...form.getInputProps('programId')}
          onChange={(value) =>
            form.setValues({
              programId: value || '',
              defaultGroupId: '',
              planId: '',
              startDate: '',
              priceEur: '',
            })
          }
        />
        <Select
          label="Dalyvio grupė"
          required
          disabled={saving || !form.values.programId}
          data={groups
            .filter((item) => item.programId === form.values.programId && item.status === 'active')
            .map((item) => ({ value: item.id, label: `${item.name} · ${item.startTime}` }))}
          {...form.getInputProps('defaultGroupId')}
          onChange={(value) => {
            const nextGroup = groups.find((item) => item.id === value);
            form.setValues({
              defaultGroupId: value || '',
              planId: '',
              priceEur: '',
              startDate: nextGroup
                ? nextGroupDate(
                    nextGroup.weekday,
                    nextGroup.effectiveFrom,
                    undefined,
                    nextGroup.startTime,
                  )
                : '',
            });
          }}
        />
        {plans.error && <Alert color="red">Nepavyko įkelti planų. Pabandykite dar kartą.</Alert>}
        <Select
          label="Abonemento planas"
          required
          disabled={saving || !group || plans.isLoading}
          placeholder={plans.isLoading ? 'Kraunama…' : 'Pasirinkite planą'}
          data={availablePlans.map((item) => ({
            value: item.id,
            label: `${item.nameLt} · ${item.sessionCount} užs. / ${item.validityDays} d.`,
          }))}
          {...form.getInputProps('planId')}
          onChange={(value) => {
            const selected = availablePlans.find((item) => item.id === value);
            form.setValues({
              planId: value || '',
              priceEur: selected
                ? selected.sessionCount === 1
                  ? (group?.singleVisitPriceEur ?? selected.priceEur)
                  : selected.priceEur
                : '',
            });
          }}
        />
        {group && !plans.isLoading && !plans.error && availablePlans.length === 0 && (
          <Text c="dimmed">Šiai grupei aktyvių planų nėra.</Text>
        )}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            type="date"
            label="Lankymo pradžia"
            required
            disabled={saving}
            min={group?.effectiveFrom}
            max={group?.effectiveUntil || undefined}
            description={
              group ? `Užsiėmimai ${WEEKDAYS[group.weekday - 1]}, ${group.startTime}.` : undefined
            }
            {...form.getInputProps('startDate')}
          />
          <NumberInput
            label="Sutarta kaina, EUR"
            required
            disabled={saving}
            min={0}
            max={100000}
            decimalScale={2}
            {...form.getInputProps('priceEur')}
          />
        </SimpleGrid>
        <TextInput
          label="Vardas ir pavardė"
          required
          maxLength={200}
          disabled={saving}
          autoComplete="name"
          {...form.getInputProps('customerName')}
        />
        <TextInput
          label="El. paštas"
          type="email"
          description="Neprivalomas. Reikalingas prisijungimui prie savitarnos."
          disabled={saving}
          autoComplete="email"
          {...form.getInputProps('customerEmail')}
        />
        <TextInput
          label="Telefonas"
          maxLength={50}
          disabled={saving}
          autoComplete="tel"
          {...form.getInputProps('customerPhone')}
        />
        <Button type="submit" loading={saving} disabled={!plan || !group || Boolean(plans.error)}>
          Pridėti dalyvį ir rezervuoti vietas
        </Button>
      </Stack>
    </form>
  );
}
